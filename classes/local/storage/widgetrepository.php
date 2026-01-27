<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Local WidgetHub storage interface and factory.
 *
 * @package     tiny_widgethub
 * @copyright   2026 Josep Mulet <pep.mulet@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_widgethub\local\storage;

/**
 * Class widgetrepository
 *
 * Widget repository.
 */
class widgetrepository {
    /**
     * Component name.
     */
    const COMPONENT = 'tiny_widgethub';

    /**
     * Loads the contents of all the files with a matching extension in the given directory.
     *
     * @param string $directory The directory to search in.
     * @param array $extensions The extensions to look for.
     * @return array The contents of the files. [filename => content]
     */
    private static function load_files_contents($directory = 'repository', $extensions = ['yml', 'yaml']) {
        global $CFG;
        $ret = [];
        $dirs = [];

        $extensions = array_map('strtolower', $extensions);
        // Search in the given directory.
        $workingdir = $CFG->dirroot . '/lib/editor/tiny/plugins/widgethub/' . $directory;
        if (file_exists($workingdir)) {
            $dirs[] = new \DirectoryIterator($workingdir);
        }
        foreach ($dirs as $dir) {
            foreach ($dir as $fileinfo) {
                if (!$fileinfo->isDot()) {
                    // Process files with the given extensions.
                    $ext = strtolower(pathinfo($fileinfo->getFilename(), PATHINFO_EXTENSION));
                    if (in_array($ext, $extensions, true)) {
                        $filecontent = file_get_contents($fileinfo->getPathname());
                        // Without extension.
                        $filename = pathinfo($fileinfo->getFilename(), PATHINFO_FILENAME);
                        $ret[$filename] = $filecontent;
                    }
                }
            }
        }
        return $ret;
    }

    /**
     * Load all language strings for this plugin in the suitable language.
     *
     * @return array The language strings.
     */
    public static function load_all_strings(): array {
        global $CFG;

        // Site's default language with fallback to user language.
        $currentlang = !empty($CFG->lang) ? $CFG->lang : (current_language() ?: 'en');
        // In case translations packs are not available for $currentlang.
        $fallbacklangs = [];

        // Split current language (xx_yy) to xx.
        if (strpos($currentlang, '_') !== false) {
            $fallbacklangs[] = explode('_', $currentlang)[0];
        }

        // Always fallback to English as last resort.
        $fallbacklangs[] = 'en';

        // Load strings for current language first.
        $allstrings = get_string_manager()->load_component_strings(self::COMPONENT, $currentlang) ?: [];

        // Load fallback languages and merge missing keys.
        foreach ($fallbacklangs as $lang) {
            $fallbackstrings = get_string_manager()->load_component_strings(self::COMPONENT, $lang) ?: [];
            // Merge only missing keys.
            foreach ($fallbackstrings as $key => $val) {
                if (!isset($allstrings[$key])) {
                    $allstrings[$key] = $val;
                }
            }
        }
        return $allstrings;
    }

    /**
     * Apply language strings to the content.
     *
     * @param string $content The content to apply language strings to.
     * @param array $allstrings The language strings to apply.
     * @return string The content with language strings applied.
     */
    private static function apply_language_strings(string $content, array $allstrings): string {
        if (empty($content)) {
            return $content;
        }
        $pattern = '/\$string\.([a-z_]+)/';
        $contenttranslated = preg_replace_callback(
            $pattern,
            function (array $matches) use ($allstrings) {
                $key = $matches[1];
                return $allstrings[$key] ?? $matches[0];
            },
            $content
        );
        return $contenttranslated;
    }

    /**
     * Load json files from the widget repository/json local folder.
     *
     * @param array $allstrings The language strings to apply.
     * @return array Associative array of widget objects. [filename => obj widget]
     */
    public static function load_json_tiny_files($allstrings): array {
        $jsoncontents = self::load_files_contents('repository/json', ['json']);
        $ret = [];
        foreach ($jsoncontents as $filename => $json) {
            // Apply language strings to the content.
            $json = self::apply_language_strings($json, $allstrings);
            $presetobj = json_decode($json);
            if ($presetobj && is_object($presetobj)) {
                $ret[$filename] = get_object_vars($presetobj);
            }
        }
        return $ret;
    }

    /**
     * Load yml files from the widget repository/ local folder.
     *
     * @param array $allstrings The language strings to apply.
     * @return array Associative array of widget objects. [key => widget]
     */
    public static function load_yml_tiny_files($allstrings): array {
        $ymlcontents = self::load_files_contents('repository', ['yml', 'yaml']);
        $ret = [];
        foreach ($ymlcontents as $filename => $yml) {
            // Apply language strings to the content.
            $ret[$filename] = self::apply_language_strings($yml, $allstrings);
        }
        return $ret;
    }

    /**
     * Saves the local repository into the storage.
     * @return void
     */
    public static function save_to_storage(): void {
        $storage = storagefactory::get_instance();
        $allstrings = self::load_all_strings();
        $jsonentries = self::load_json_tiny_files($allstrings);
        $ymlentries = self::load_yml_tiny_files($allstrings);
        $combinedpartials = null;

        foreach ($jsonentries as $filename => $preset) {
            // Check if the $preset has a valid key.
            $key = trim($preset['key'] ?? '');
            if ($key === '') {
                continue;
            }
            // Check if the $preset key is in the storage. This shouldn't happen.
            $widget = $storage->get_widget_by_key($key);
            if ($widget !== false) {
                continue;
            }
            // Make sure the widget designer has not set this property.
            $preset['id'] = null;

            // Deal with partials special preset.
            if ($key === 'partials') {
                // Partials should be combined if defined in many files.
                if ($combinedpartials === null) {
                    $combinedpartials = $preset;
                } else {
                    $combinedpartials = array_merge($combinedpartials, $preset);
                }
                continue;
            } else {
                $preset['timecreated'] = time();
                $preset['timemodified'] = time();
            }

            $yml = $ymlentries[$filename] ?? null;
            $storage->save_widget(storagefactory::BLANK_ID, $preset, $yml, null, null);
        }

        if ($combinedpartials !== null) {
            // Should combine the existing partials with the new one.
            $oldpartials = $storage->get_partials() ?? [];
            $combinedpartials = array_merge($oldpartials, $combinedpartials);
            $combinedpartials['key'] = 'partials';
            $storage->save_widget(storagefactory::PARTIALS_ID, $combinedpartials, null, null, null);
        }
    }
}
