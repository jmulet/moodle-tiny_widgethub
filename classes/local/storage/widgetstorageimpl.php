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
 * Tiny WidgetHub Legacy storage (based on get_config) implementation.
 *
 * @package     tiny_widgethub
 * @copyright   2026 Josep Mulet <pep.mulet@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_widgethub\local\storage;

use tiny_widgethub\local\storage\storagefactory;

/**
 * Function to search for the index by the 'key' property.
 * @param array $array
 * @param string $searchkey
 * @return mixed
 */
function tiny_widgethub_searchbykey($array, $searchkey) {
    foreach ($array as $index => $value) {
        if ($value['key'] === $searchkey) {
            return $index;
        }
    }
    // Return null if not found.
    return null;
}

/**
 * Class widgetstorageimpl
 *
 * Legacy implementation of the widgetstorage interface using Moodle config.
 */
class widgetstorageimpl implements widgetstorage {
    /**
     * Component name.
     */
    private const COMPONENTNAME = 'tiny_widgethub';

    /** @var \stdClass Configuration object. */
    public $conf;

    /** @var array Widget index. */
    public $index;

    /**
     * The document storage instance.
     *
     * @var documentstorage
     */
    private $documentstorage;

    /**
     * Constructor.
     */
    public function __construct() {
        $this->conf = get_config(self::COMPONENTNAME);
        $this->documentstorage = new documentstorageimpl();
        $this->index = $this->load_index();
    }

    /**
     * Get the partials for widget expansion.
     *
     * @return array Associative array of partials.
     */
    public function get_partials(): array {
        $raw = $this->documentstorage->get(storagefactory::PARTIALS_ID, 'json');
        if ($raw) {
            $decoded = json_decode($raw);
            if ($decoded && is_object($decoded)) {
                return get_object_vars($decoded);
            }
        }
        // Return minimal document if not found.
        return ["key" => "partials"];
    }

    /**
     * Get the partials for widget expansion.
     *
     * @return string|null YAML string of partials.
     */
    public function get_partials_yml(): ?string {
        return $this->documentstorage->get(storagefactory::PARTIALS_ID, 'yml');
    }

    /**
     * Get the index of the widgets
     * Load the property in which the index of the widgets is stored
     * {1: {key: 'WD1', name: 'Name1', h: 0, c: 'category'}, 5: {key: 'WD2', name: 'Name2', h: 0, c: 'category'}, ...]
     *
     * @return array
     */
    private function load_index(): array {
        global $DB;
        $sql = "SELECT itemid, source FROM {files} WHERE component = 'tiny_widgethub' AND filename = 'data.json' AND source IS NOT NULL";
        $records = $DB->get_records_sql($sql);
        $index = [];
        foreach ($records as $itemid => $record) {
            $data = json_decode($record->source, true);
            if (is_array($data)) {
                $id = (int) $itemid;
                $index[$id] = $data;
            }
        }
        return $index;
    }

    /**
     * Update the sequence number.
     * @return int
     */
    private function update_seq() {
        $seq = $this->conf->seq ?? 0;
        $seq++;
        $this->conf->seq = $seq;
        set_config('seq', $seq, self::COMPONENTNAME);
        return $seq;
    }

    /**
     * The entry id has changed, update the index.
     * @param int $id
     * @param array $raw
     * @return int - The id if a new widget is created and 0 otherwise.
     */
    private function update_index($id, $raw) {
        $newid = 0;
        if ($raw === null || (empty($raw['key']) && empty($raw['name']))) {
            // Remove the widget from the index.
            unset($this->index[$id]);
            $this->documentstorage->delete_all($id);
        } else {
            // Update its key, name and category.
            $key = $raw['key'] ?? '';
            if (!empty($key)) {
                $name = $raw['name'] ?? $key;
                $category = $raw['category'] ?? get_string('misc', self::COMPONENTNAME);
                $hidden = ($raw['hidden'] ?? false) ? 1 : 0;
                $this->index[$id] = [
                    'id' => $id,
                    'key' => $key,
                    'name' => $name,
                    'c' => $category,
                    'h' => $hidden,
                ];
            }
        }
        return $newid;
    }


    /**
     * Helper to load widget definition by ID from config.
     *
     * @param int $id
     * @param bool $slim Whether to load the slim version of the widget.
     * @return array|null Associative array or null.
     */
    private function load_raw_widget(int $id, bool $slim = false): ?array {
        $ext = $slim ? 'slim.json' : 'json';
        if ($id === storagefactory::PARTIALS_ID) {
            $ext = 'json';
        }
        $def = $this->documentstorage->get($id, $ext);
        if (!$def) {
            return null;
        }
        $raw = json_decode($def, true);
        if (!$raw) {
            return null;
        }
        // Manually add the id.
        $raw['id'] = $id;
        return $raw;
    }

    /**
     * Get all widgets. It does not include partials.
     *
     * @param bool $includehidden Whether to include hidden widgets.
     * @param string $fields The fields to retrieve.
     * @return \StdClass[] An array of widgets objects.
     */
    public function get_all_widgets(bool $includehidden = false, string $fields = '*'): array {
        $widgets = [];
        foreach ($this->index as $id => $info) {
            if ($info['h'] === 1 && !$includehidden) {
                continue;
            }
            $raw = $this->load_raw_widget($id, true); // true for slim version.
            if ($raw) {
                $widgets[] = $raw;
            }
        }
        return $widgets;
    }

    /**
     * Get a widget by its unique key.
     *
     * @param string $key The widget key.
     * @param string $fields The fields to retrieve.
     * @return \StdClass|bool The widget object, or false if not found.
     */
    public function get_widget_by_key(string $key, string $fields = '*') {
        foreach ($this->index as $id => $info) {
            if (isset($info['key']) && $info['key'] === $key) {
                return $this->load_raw_widget($id) ?? false;
            }
        }
        return false;
    }

    /**
     * Get a widget by its Pseudo ID in legacy.
     *
     * @param int $id The widget ID.
     * @param string $fields The fields to retrieve.
     * @return \StdClass|bool The widget object, or false if not found.
     */
    public function get_widget_by_id(int $id, string $fields = '*') {
        return $this->load_raw_widget($id) ?? false;
    }


    /**
     * Get the associated documents of widgets by their database IDs.
     *
     * @param ?array $ids The widget IDs. All widgets if null.
     * @param bool $includejson Whether to include the JSON document.
     * @param bool $includeother Whether to include the YAML document (also js and css are included here).
     * @return array Array of associative documents in the form of [{id: int, key: string, json: string, yml: string}]
     */
    public function get_documents_by_id(?array $ids = null, bool $includejson = true, bool $includeother = false): array {
        $widgetdocs = [];
        if ($ids === null) {
            $ids = array_keys($this->index);
        }
        foreach ($ids as $id) {
            $info = $this->index[$id] ?? null;
            if (!$info || !isset($info['key'])) {
                continue;
            }
            $json = null;
            if ($includejson) {
                $json = $this->documentstorage->get($id, 'json');
            }
            $yml = null;
            if ($includeother) {
                $yml = $this->documentstorage->get($id, 'yml');
            }
            $widgetdocs[] = [
                'id' => $id,
                'key' => $this->index[$id]['key'],
                'json' => $json,
                'yml' => $yml,
            ];
        }
        return $widgetdocs;
    }

    /**
     * Basic server-side validate the widget data before saving.
     * @param ?int $id The widget ID.
     * @param array $widget The widget data to validate.
     * @param array $usedkeys Associative array of used keys [key => id].
     * @return bool True if the widget data is valid, false otherwise.
     */
    private static function validate_widget(?int $id, array $widget, array $usedkeys): bool {
        $key = $widget['key'] ?? null;
        if ($key === null) {
            return false;
        }
        $ispartials = $key === 'partials';
        if ($ispartials) {
            return $id === storagefactory::PARTIALS_ID;
        }
        if (isset($usedkeys[$key]) && $usedkeys[$key] !== $id) {
            return false;
        }
        $requiredkeys = ['name', 'author', 'version'];
        foreach ($requiredkeys as $field) {
            if (!isset($widget[$field])) {
                return false;
            }
        }
        if ((!isset($widget['template']) && !isset($widget['filter'])) ||
            (isset($widget['template']) && isset($widget['filter']))
        ) {
            return false;
        }
        $template = $widget['template'] ?? $widget['filter'] ?? '';
        if (str_contains($template, '<script') || str_contains($template, '<style')) {
            return false;
        }
        return true;
    }

    /**
     * Save an existing widget.
     * If the widget already exists, it will be updated.
     * The property $widget['id'] is required on update.
     *
     * @param int|null $id The widget ID. If null, a new widget will be created. 0 for partials.
     * @param array $widget The widget data to save.
     * @param string|null $yml The widget yml string.
     * @param string|null $html The widget html string.
     * @param string|null $css The widget css string.
     * @param int $rev The widget revision.
     * @return int The widget ID > 0 on success, 0 for partials, -1 on invalid widget, -2 on failure.
     */
    public function save_widget(
        ?int $id,
        array $widget,
        ?string $yml = null,
        ?string $html = null,
        ?string $css = null,
        int $rev = 1
    ): int {
        // Used widgets keys.
        $usedkeys = array_combine(
            array_column($this->index, 'key'),
            array_keys($this->index)
        );
        if (!self::validate_widget($id, $widget, $usedkeys)) {
            return storagefactory::INVALID_ID;
        }
        if ($id === storagefactory::BLANK_ID) {
            $id = $this->update_seq();
        }
        try {
            // Do not store meta in widget
            unset($widget['id']);
            unset($widget['timecreated']);
            unset($widget['timemodified']);
            unset($widget['rev']);
            $success = $this->documentstorage->save($id, $widget, 'json');
            if (!$success) {
                return storagefactory::FAILURE_ID;
            }
            $success = $this->documentstorage->save($id, $yml, 'yml');
            if (!$success) {
                return storagefactory::FAILURE_ID;
            }
            $this->update_index($id, $widget);
            if ($id !== storagefactory::PARTIALS_ID) {
                // Store a slim version of the widget for quick loading.
                $slimdoc = $widget;
                // Computed records must be manually set.
                $hasfilter   = !empty(storagefactory::get_prop($widget, 'filter'));
                $hastemplate = !empty(storagefactory::get_prop($widget, 'template'));
                $slimdoc['isfilter'] = ($hasfilter && !$hastemplate);
                $hasselectors   = !empty(storagefactory::get_prop($widget, 'selectors'));
                $hasinsertquery = !empty(storagefactory::get_prop($widget, 'insertquery'));
                $slimdoc['isselectcapable'] = ($hasselectors && $hasinsertquery);
                $parameters = storagefactory::get_prop($widget, 'parameters');
                $slimdoc['hasbindings'] = $parameters !== null && preg_match('/"bind":/', json_encode($parameters));
                unset($slimdoc['template']);
                unset($slimdoc['filter']);
                unset($slimdoc['instructions']);
                unset($slimdoc['parameters']);
                unset($slimdoc['author']);
                unset($slimdoc['version']);
                $success = $this->documentstorage->save($id, json_encode($slimdoc), 'slim.json');
                if (!$success) {
                    return storagefactory::FAILURE_ID;
                }
            }
        } catch (\Exception $e) {
            return storagefactory::FAILURE_ID;
        }
        return $id;
    }

    /**
     * Delete a widget by its id.
     *
     * @param int $id The id of the widget to delete.
     * @return bool True if the widget was deleted, false otherwise.
     */
    public function delete_widget(int $id): bool {
        $widget = $this->load_raw_widget($id);
        $key = $widget['key'] ?? '';
        if (!$widget || $key == 'partials') {
            // Partials cannot be deleted.
            return false;
        }
        unset($this->index[$id]);
        $this->documentstorage->delete_all($id);
        return true;
    }

    /**
     * Delete widgets from the database.
     *
     * @param array $ids Array of widget IDs to delete.
     * @return int[] Array of deleted widget IDs.
     */
    public function delete_widgets(array $ids): array {
        $deletedids = [];
        foreach ($ids as $id) {
            $wiget = $this->load_raw_widget($id);
            if (!$wiget || $wiget['key'] == 'partials') {
                // Partials cannot be deleted.
                continue;
            }
            unset($this->index[$id]);
            $this->documentstorage->delete_all($id);
            $deletedids[] = $id;
        }
        return $deletedids;
    }

    /**
     * Set the visibility of a widget.
     *
     * @param int $id The id of the widget to set visibility.
     * @param bool $visible Whether the widget is visible.
     * @return bool True if the visibility was set, false otherwise.
     */
    public function set_visible(int $id, bool $visible): bool {
        if ($id <= 0) {
            return false;
        }
        $info = $this->index[$id] ?? null;
        if (!$info || !isset($info['key'])) {
            return false;
        }
        $widget = $this->load_raw_widget($id);
        if (!$widget) {
            return false;
        }
        $ishidden = $widget['hidden'] ?? false;
        if ($ishidden === !$visible) {
            // No change.
            return true;
        }
        if ($visible) {
            unset($widget['hidden']);
        } else {
            $widget['hidden'] = true;
        }
        $this->documentstorage->save($id, $widget, 'json');
        // Must delete yml document to mantain consistency.
        $this->documentstorage->delete($id, 'yml');
        $this->update_index($id, $widget);
        return true;
    }

    /**
     * Get used keys.
     *
     * @return array<string> Array of used keys.
     */
    public function get_used_keys(): array {
        $distinctkeys = [];
        foreach ($this->index as $info) {
            if (!empty($info['key'])) {
                $distinctkeys[] = $info['key'];
            }
        }
        return $distinctkeys;
    }

    /**
     * Get widgets without yml created.
     *
     * @return array<int> Ids of widgets without yml created.
     */
    public function get_widgetsnoyml(): array {
        $ret = [];
        foreach (array_keys($this->index) as $id) {
            $defjson = $this->documentstorage->get($id, 'json');
            $defyml = $this->documentstorage->get($id, 'yml');
            if (!empty($defjson) && empty($defyml)) {
                $ret[] = $id;
            }
        }
        return $ret;
    }

    /**
     * Save the widgets yml.
     *
     * @param array $widgets The widgets data to save in the form of {id: int, key: string, yml: string}[].
     * @return array True if success for each widget.
     */
    public function save_widgetsyml(array $widgets): array {
        $success = [];
        foreach ($widgets as $widget) {
            $this->documentstorage->save($widget['id'], $widget['yml'], 'yml');
            $success[] = true;
        }
        return $success;
    }
}
