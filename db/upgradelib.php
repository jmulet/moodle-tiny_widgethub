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
 * Tiny WidgetHub plugin version details.
 *
 * @package     tiny_widgethub
 * @copyright   2026 Josep Mulet <pep.mulet@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

use tiny_widgethub\local\storage\storagefactory;

/**
 * Internal helper to get a property from the widget array with a default value.
 *
 * @param array $array The array to get the property from.
 * @param string $key The key to get the property from.
 * @param mixed $default The default value to return if the key is not found.
 * @return mixed The value of the property or the default value.
 */
function tiny_widgethub_getprop($array, $key, $default = null) {
    return (is_array($array) && array_key_exists($key, $array)) ? $array[$key] : $default;
}

/**
 * Internal helper to get the icon for a widget.
 *
 * @param string $key The widget key.
 * @return string|null The icon for the widget.
 */
function tiny_widgethub_getwidgeticon(string $key): ?string {
    $icons = [
        "bs-alert" => "fa fa-exclamation-triangle",
        "bs-badge" => "fa fa-tag",
        "bs-card-group" => "fa fa-th-large",
        "bs-carousel" => "fa fa-images",
        "bs-collapsible" => "fa fa-caret-square-o-down",
        "bs-columns" => "fa fa-columns",
        "bs-figure" => "fa fa-image",
        "bs-image-overlay" => "fa fa-picture-o",
        "bs-jumbotron" => "fa fa-bullhorn",
        "bs-listgroup" => "fa fa-list",
        "bs-popover" => "fa fa-comment",
        "bs-table" => "fa fa-table",
        "bs-tabs" => "fa fa-folder",
        "ib-colors" => "fa fa-paint-brush",
        "ib-dedication-time" => "fa fa-clock-o",
        "ib-filter-cleanfont" => "fa fa-eraser",
        "ib-textfragment" => "fa fa-puzzle-piece",
        "ib-iframe" => "fa fa-window-maximize",
        "ib-image-background" => "fa fa-image",
        "ib-quote" => "fa fa-quote-left",
        "ib-section" => "fa fa-columns",
        "ib-video-gdrive" => "fa fa-google",
        "ib-vimeo" => "fa fa-vimeo",
        "ib-wordcounter" => "fa fa-calculator",
        "ib-youtube" => "fa fa-youtube",
    ];
    return $icons[$key] ?? null;
}

/**
 * Internal helper to store a widget document in the file system.
 *
 * @param int $widgetid The widget id.
 * @param string|array $raw The widget document as an asociative array.
 * @param string $ext The type of the document (json or yml).
 * @return bool True if the document was stored successfully, false otherwise.
 */
function tiny_widgethub_storedocument($widgetid, $raw, $ext = 'json') {
    // System context id.
    $systemcontextid = context_system::instance()->id;
    $fs = get_file_storage();
    $fileinfo = [
        'contextid' => $systemcontextid,
        'component' => 'tiny_widgethub',
        'filearea' => 'widgetdefs',
        'itemid' => $widgetid,
        'filepath' => '/',
        'filename' => 'data.' . $ext,
    ];
    if (is_array($raw)) {
        $key = $raw['key'] ?? $widgetid . '';
        $source = [
            "k" => $key,
            "n" => $raw['name'] ?? $raw['key'] ?? '',
            "c" => $raw['category'] ?? 'other',
            "h" => ($raw['hidden'] ?? false) ? 1 : 0,
        ];
        $fileinfo['source'] = json_encode($source);
        $icon = tiny_widgethub_getwidgeticon($key);
        if ($icon) {
            $raw['icon'] = $icon;
        }
        $doc = json_encode($raw);
    } else {
        $doc = $raw;
    }
    $file = $fs->get_file(
        $fileinfo['contextid'],
        $fileinfo['component'],
        $fileinfo['filearea'],
        $fileinfo['itemid'],
        $fileinfo['filepath'],
        $fileinfo['filename']
    );
    if ($file) {
        if ($doc !== null && $file->compare_to_string($doc)) {
            return true;
        }
        $file->delete();
    }
    if ($doc === null) {
        return true;
    }
    $storedfile = $fs->create_file_from_string($fileinfo, $doc);
    if (!$storedfile) {
        return false;
    }
    // Check if contents have been stored.
    $storedfile = $fs->get_file(
        $fileinfo['contextid'],
        $fileinfo['component'],
        $fileinfo['filearea'],
        $fileinfo['itemid'],
        $fileinfo['filepath'],
        $fileinfo['filename']
    );
    if (!$storedfile) {
        return false;
    }
    if ($storedfile->compare_to_string($doc)) {
        return true;
    }
    return false;
}

/**
 * Intend of this upgrade function is to migrate the widget definitions from the config table
 * to filearea storage.
 *
 * Previous state:
 *  - Widgets are stored in the config table as JSON strings.
 * Next state:
 *  - Widgets are stored in the filearea.
 *  - The config data is deleted for performance reasons.
 *
 * @return bool True if the upgrade was successful, false otherwise.
 * @throws Exception if the table cannot be created or data cannot be migrated.
 */
function tiny_widgethub_migrate_to_filearea_storage() {
    global $DB;
    $componentname = 'tiny_widgethub';

    // Get all widgets from legacy storage.
    $index = get_config($componentname, 'index');
    if (!$index) {
        // Nothing to migrate.
        return true;
    }
    $index = json_decode($index, true);

    // DATA MIGRATION.
    // Start a transaction.
    $transaction = $DB->start_delegated_transaction();

    try {
        $numwidgets = 0;
        $mergedpartials = [];

        foreach ($index as $id => $indexentry) {
            $json = get_config($componentname, 'def_' . $id);
            if (!$json) {
                debugging('Widget ' . $id . ' (' . json_encode($indexentry) . ') not found in legacy storage', DEBUG_DEVELOPER);
                continue;
            }
            $raw = json_decode($json, true);
            if ($raw['key'] === 'partials') {
                // We merge all partials because only one entry with key "partials" is allowed.
                $mergedpartials = array_merge($mergedpartials, $raw);
                // Partials no longer need to be stored in the index.
                unset($index[$id]);
                continue;
            }

            // Store the widget in the filearea.
            if (!tiny_widgethub_storedocument($id, $raw, 'json')) {
                throw new \moodle_exception(
                    'datamigrationfailed',
                    $componentname,
                    '',
                    'Failed to store widget ' . $raw['key']
                );
            }
            // Store a slim version of the widget for quick loading.
            $slimdoc = $raw;
            // Computed records must be manually set.
            $hasfilter   = !empty(tiny_widgethub_getprop($raw, 'filter'));
            $hastemplate = !empty(tiny_widgethub_getprop($raw, 'template'));
            $slimdoc['isfilter'] = ($hasfilter && !$hastemplate);
            $hasselectors   = !empty(tiny_widgethub_getprop($raw, 'selectors'));
            $hasinsertquery = !empty(tiny_widgethub_getprop($raw, 'insertquery'));
            $slimdoc['isselectcapable'] = ($hasselectors && $hasinsertquery);
            $parameters = tiny_widgethub_getprop($raw, 'parameters');
            $slimdoc['hasbindings'] = $parameters !== null && preg_match('/"bind":/', json_encode($parameters));
            unset($slimdoc['template']);
            unset($slimdoc['filter']);
            unset($slimdoc['instructions']);
            unset($slimdoc['parameters']);
            unset($slimdoc['author']);
            unset($slimdoc['version']);
            if (!tiny_widgethub_storedocument($id, $slimdoc, 'slim.json')) {
                throw new \moodle_exception(
                    'datamigrationfailed',
                    $componentname,
                    '',
                    'Failed to store widget ' . $raw['key']
                );
            }
            $numwidgets++;
        }
        // Store partials.
        $res = tiny_widgethub_storedocument(storagefactory::PARTIALS_ID, $mergedpartials, 'json');
        if (!$res) {
            throw new \moodle_exception(
                'datamigrationfailed',
                $componentname,
                '',
                'Failed to store partials'
            );
        }
        $numwidgets++;

        // Check that the file table contains the expected number of files (excluding dot directories).
        $filecount = $DB->count_records_select(
            'files',
            "component = :component AND filearea = :filearea AND filename = 'data.json'",
            [
                'component' => $componentname,
                'filearea' => 'widgetdefs',
            ]
        );
        if ($filecount !== $numwidgets) {
            throw new \moodle_exception(
                'datamigrationfailed',
                $componentname,
                '',
                'Failed to store documents'
            );
        }

        // Now it is safe to get rid of the config data.
        foreach (array_keys($index) as $id) {
            unset_config('def_' . $id, $componentname);
        }
        unset_config('index', $componentname);

        // Commit the transaction.
        $transaction->allow_commit();
    } catch (Exception $e) {
        $transaction->rollback($e);
        throw $e;
    }
    return true;
}
