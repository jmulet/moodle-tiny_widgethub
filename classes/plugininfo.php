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
 * Tiny WidgetHub plugin.
 *
 * @package     tiny_widgethub
 * @copyright   2024 Josep Mulet <pep.mulet@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_widgethub;

use context;
use editor_tiny\plugin;
use editor_tiny\plugin_with_buttons;
use editor_tiny\plugin_with_configuration;
use editor_tiny\plugin_with_menuitems;


/**
 * Function to search for the index by the 'key' property.
 * @param array $array
 * @param string $searchKey
 * @return mixed
 */
function search_by_key($array, $searchkey) {
    foreach ($array as $index => $value) {
        if ($value['key'] === $searchkey) {
            return $index;
        }
    }
    // Return null if not found.
    return null;
}

/**
 * Function to parse the configuration.
 * @param string $configstr
 * @return string[]
 */
function parse_config($configstr) {
    $config = [];
    $lines = explode("\n", trim($configstr)); // Split into lines.
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2); // Split key-value pair.
            $config[trim($key)] = trim($value); // Trim spaces around key and value.
        }
    }
    return $config;
}

/**
 * Tiny WidgetHub plugin version details.
 */
class plugininfo extends plugin implements
    plugin_with_buttons,
    plugin_with_menuitems,
    plugin_with_configuration {

    /**
     * Get the editor buttons for this plugins
     *
     * @return array
     */
    public static function get_available_buttons(): array {
        return [
            'tiny_widgethub/widgethub',
        ];
    }
    /**
     * Get the dropdown menu items for this plugin
     *
     * @return array
     */
    public static function get_available_menuitems(): array {
        return [
            'tiny_widgethub/widgethub',
        ];
    }

    /**
     * Get the configuration for the plugin, capabilities and
     * config (from settings.php)
     *
     * @param context $context
     * @param array $options
     * @param array $fpoptions
     * @param \editor_tiny\editor|null $editor
     * @return void
     *
     * @return array
     */
    public static function get_plugin_configuration_for_context(
        context $context,
        array $options,
        array $fpoptions,
        ?\editor_tiny\editor $editor = null
    ): array {

        global $USER, $COURSE;

        // Obtain the configuration options for the plugin from the config table.
        $conf = get_config('tiny_widgethub');

        // Decide if to enable the plugin.
        $showplugin = true;
        if (!has_capability('tiny/widgethub:viewplugin', $context)) {
            $showplugin = false;
        }

        $params = [
            'showplugin' => $showplugin,
        ];

        if ($showplugin) {
            $widgetindex = self::get_widget_index($conf);
            $widgetlist = self::get_widget_list($conf, $widgetindex);

            $params['userid'] = $USER->id;
            $params['courseid'] = $COURSE->id;
            $params['widgetlist'] = $widgetlist;
            // Configuration.
            $params['sharecss'] = $conf->sharecss;
            $params['additionalcss'] = $conf->additionalcss;
            // Syntax key=value per line.
            $params['cfg'] = parse_config($conf->cfg ?? '');
        }
        return $params;
    }

    /**
     * Get the index of the widgets
     * Load the property in which the index of the widgets is stored
     * {1: {key: 'WD1', name: 'Name1'}, 5: {key: 'WD2', name: 'Name2'}, ...]
     *
     * @param object $conf
     * @return array
     */
    public static function get_widget_index($conf): array {
        $widgetindex = []; // Associative array.
        if (isset($conf->index)) {
            $widgetindex = json_decode($conf->index, true);
            if ($widgetindex == null) {
                $widgetindex = [];
            }
        }
        // Detect errors in the index.
        $nerrs = 0;
        foreach (array_keys($widgetindex) as $id) {
            if (!isset($conf->{'def_' . $id})) {
               unset($widgetindex[strval($id)]);
               $nerrs++;
            }
        }
        unset($widgetindex[0]); // Remove the temporal entry.
        if ($nerrs > 0) {
            // Store the ammended index.
            set_config('index', json_encode($widgetindex), 'tiny_widgethub');
        }
        return $widgetindex;
    }

    /**
     * The entry id has changed, update the index
     * @param int $id
     */
    public static function update_widget_index($id) {
        $conf = get_config('tiny_widgethub');
        $widgetindex = self::get_widget_index($conf);
        $widget = null;
        if (isset($conf->{'def_' . $id})) {
            $widget = json_decode($conf->{'def_' . $id}, false);
        }
        if ($widget == null || !is_object($widget)) {
            // Remove the widget from the index.
            unset($widgetindex[strval($id)]);
        } else if (empty($widget->key) && empty($widget->name)) {
            // Remove the widget from the index and also the definition.
            unset($widgetindex[strval($id)]);
            unset_config('def_' . $id, 'tiny_widgethub');            
        } else if ($id == 0) {
            // Add the temporal entry to a definitive widget index.
            $tmpwidget = json_decode($conf->def_0);
            if (!empty($tmpwidget)) {
                $id = self::update_seq($conf);
                // Add the widget to the index.
                $widgetindex[strval($id)] = [
                    'key' => $tmpwidget->key,
                    'name' => $tmpwidget->name,
                ];
                set_config('def_' . $id, $conf->def_0, 'tiny_widgethub');
                // Remove the temporal widget.
                unset_config('def_0', 'tiny_widgethub');
            }
        } else {
            // Update its key and name.
            $widgetindex[$id] = [
                'key' => $widget->key,
                'name' => isset($widget->name) ? $widget->name : $widget->key,
            ];
        }
        set_config('index', json_encode($widgetindex), 'tiny_widgethub');
    }

    /**
     * Get the list of widgets
     *
     * @param object $conf
     * @param array $widgetindex (optional)
     * @return array
     */
    public static function get_widget_list($conf, $widgetindex): array {
        if (!isset($widgetindex)) {
            $widgetindex = self::get_widget_index($conf);
        }
        $widgetlist = [];
        foreach (array_keys($widgetindex) as $id) {
            // Check if the key is set
            if (!isset($conf->{'def_' . $id})) {
                continue;
            }
            $definition = $conf->{'def_' . $id};
            if (empty($definition)) {
                continue;
            }
            $json = json_decode($definition, false);
            if (!isset($json)) {
                continue;
            }
            // Also include the internal widget id.
            $json->id = $id;
            $widgetlist[] = $json;
        }
        return $widgetlist;
    }

    /**
     * Searches the index for a widget with key named partials
     * @param object $conf
     * @param array $widgetindex (optional)
     * @return object if not found or empty object otherwise
     */
    public static function get_partials($conf, $widgetindex): ?object {
        if (!isset($widgetindex)) {
            $widgetindex = self::get_widget_index($conf);
        }
        $indexid = array_search('partials',
        array_combine(array_keys($widgetindex), array_column($widgetindex, 'key')));
        $partials = (object)[];
        if ($indexid) {
            $definition = $conf->{'def_' . $indexid};
            if (!empty($definition)) {
                $partials = json_decode($definition, false);
            }
        }
        return $partials;
    }

    /**
     * Increments the sequence number and returns it
     * @param object $conf
     * @return int
     */
    private static function update_seq($conf) {
        $seq = 0;
        if (isset($conf->seq)) {
            $seq = $conf->seq;
        }
        $seq++;
        $conf->seq = $seq;
        set_config('seq', $seq, 'tiny_widgethub');
        return $seq;
    }

    /**
     * It removes all the configuration of this plugin. Call this method when uninstalling it.
     * @return void
     */
    public static function remove_configuration_settings() {
        $settings = get_config('tiny_widgethub');
        foreach ($settings as $fieldkey => $fieldname) {
            unset_config($fieldkey, 'tiny_widgethub');
        }
    }

    /**
     * 
     * @param \SplFileInfo $fileinfo
     * @return array|bool
     */
    protected static function parse_widget_preset(\SplFileInfo $fileinfo){
        $file = $fileinfo -> openFile("r");
        $content = "";
        while(!$file -> eof()) {
            $content .= $file->fgets();
        }
        $presetobject = json_decode($content);
        // Check it is a valid json.
        if ($presetobject && is_object($presetobject)) {
            return get_object_vars($presetobject);
        } else {
            return false;
        }
    }

    /**
     * Returns an array of all widgets defined in presets as json file
     * @return array
     */
    public static function fetch_presets(){
        global $CFG,$PAGE;
        $ret = [];
        $dirs = [];

        // Search in the presets folder.
        $snippetpresetsdir = $CFG->dirroot . '/lib/editor/tiny/plugins/widgethub/presets';
        if (file_exists($snippetpresetsdir)) {
            $dirs[] = new \DirectoryIterator($snippetpresetsdir);
        }
        foreach ($dirs as $dir) {
            foreach ($dir as $fileinfo) {
                if (!$fileinfo->isDot()) {
                    // Process only .json files.
                    $ext = pathinfo($fileinfo->getFilename())['extension'];
                    if ($ext == 'json') {
                        $preset = self::parse_widget_preset($fileinfo);
                        if ($preset) {
                            $ret[] = $preset;
                        }
                    }
                }
            }
        }
       return $ret;
    }

    /**
     * Saves the current $preset to the database and updates the index key
     * @param array $presets
     * @return void
     */
    public static function save_update_presets($presets) {
        // Obtain the configuration options for the plugin from the config table.
        $conf = get_config('tiny_widgethub');
        // Obtain the index.
        $widgetindex = self::get_widget_index($conf);
        
        foreach ($presets as $preset) {
            // Check if the $preset key is in the $index.
            $id = search_by_key($widgetindex, $preset['key']);
            $mustupdate = true;

            if ($id == null) {
                // Create a new entry.
                $id = self::update_seq($conf);
            } else {
                // Load the old definition.
                $old = json_decode($conf->{'def_' . $id});
                if (isset($old)) {
                    // Condition to override existing definition.
                    // Author has changed or (TODO) version is less than previous.
                    if (isset($preset['author']) && $old->author != $preset['author']) {
                        $mustupdate = false;
                    }
                }
            }
            if ($mustupdate) {
                // Save the definition.
                set_config('def_' . $id, json_encode($preset) , 'tiny_widgethub');
                // Update the index object.
                $widgetindex[$id] = [
                    'key' => $preset['key'],
                    'name' => isset($preset['name']) ? $preset['name'] : $preset['key'],
                ];
            }
        }

        // Save the index.
        set_config('index', json_encode($widgetindex), 'tiny_widgethub');
    }
}
