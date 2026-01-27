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
 * Local WidgetHub Legacy storage (based on get_config) implementation.
 *
 * @package     tiny_widgethub
 * @copyright   2026 Josep Mulet <pep.mulet@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_widgethub\local\storage;

use local_widgethub\local\storage\storagefactory;

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
 * Class legacywidgetstorage
 *
 * Legacy implementation of the widgetstorage interface using Moodle config.
 */
class legacywidgetstorage implements widgetstorage {
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
        $this->documentstorage = new legacydocumentstorage();
        $this->index = $this->create_index();
    }

    /**
     * Convert a record to a widget which can be passed to UI.
     *
     * @param array|\stdClass $record The "get_config" record.
     * @param string $fields The fields to retrieve.
     * @return \stdClass The widget with properties selected.
     */
    private static function from_record($record, string $fields = '*') {
        $raw = (array) $record;
        // If not '*', ensure each requested field exists.
        if ($fields !== '*') {
            $arrayfields = explode(',', $fields);
            $cleanrecord = [];

            foreach ($arrayfields as $f) {
                $f = trim($f);
                $cleanrecord[$f] = $raw[$f] ?? null;
            }
            $raw = $cleanrecord;
        }
        // Computed records must be manually set.
        $hasfilter   = !empty(storagefactory::get_prop($record, 'filter'));
        $hastemplate = !empty(storagefactory::get_prop($record, 'template'));
        $raw['isfilter'] = ($hasfilter && !$hastemplate);
        $hasselectors   = !empty(storagefactory::get_prop($record, 'selectors'));
        $hasinsertquery = !empty(storagefactory::get_prop($record, 'insertquery'));
        $raw['isselectcapable'] = ($hasselectors && $hasinsertquery);
        $parameters = storagefactory::get_prop($record, 'parameters');
        $raw['hasbindings'] = $parameters !== null && preg_match('/"bind":/', json_encode($parameters));

        // NOTE: We want a light-weight widget object to pass to UI.
        // These properties are not needed until rendering. They will be loaded by AJAX.
        unset($raw['template']);
        unset($raw['filter']);
        unset($raw['parameters']);

        return (object) $raw;
    }

    /**
     * Get the partials for widget expansion.
     *
     * @return array Associative array of partials.
     */
    public function get_partials(): array {
        $raw = $this->documentstorage->get(0, 'json');
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
        return $this->documentstorage->get(0, 'yml');
    }

    /**
     * Get the index of the widgets
     * Load the property in which the index of the widgets is stored
     * {1: {key: 'WD1', name: 'Name1', h: 0, c: 'category'}, 5: {key: 'WD2', name: 'Name2', h: 0, c: 'category'}, ...]
     *
     * @return array
     */
    private function create_index(): array {
        $widgetindex = []; // Associative array.
        if (isset($this->conf->index)) {
            $widgetindex = json_decode($this->conf->index, true) ?? [];
        }
        // Detect errors in the index.
        $nerrs = 0;
        foreach (array_keys($widgetindex) as $id) {
            $def = $this->documentstorage->get($id, 'json');
            if (!$def) {
                // Remove the widget from the index.
                unset($widgetindex[strval($id)]);
                $nerrs++;
            } else if (!isset($widgetindex[$id]['c']) || !isset($widgetindex[$id]['h'])) {
                // Decode JSON only if at least one property is missing.
                $tmpwidget = json_decode($def, false);

                if (!isset($widgetindex[$id]['c'])) {
                    $widgetindex[$id]['c'] = $tmpwidget->category ?? '';
                    $nerrs++;
                }

                if (!isset($widgetindex[$id]['h'])) {
                    $widgetindex[$id]['h'] = ($tmpwidget->hidden ?? false) ? 1 : 0;
                    $nerrs++;
                }
            }
        }
        if ($nerrs > 0) {
            // Store the ammended index.
            set_config('index', json_encode($widgetindex), self::COMPONENTNAME);
        }
        return $widgetindex;
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
     * @return int - The id if a new widget is created and 0 otherwise.
     */
    private function update_index($id) {
        $newid = 0;
        $raw = $this->load_raw_widget($id);
        if ($raw === null || (empty($raw['key']) && empty($raw['name']))) {
            // Remove the widget from the index.
            unset($this->index[strval($id)]);
            $this->documentstorage->delete_all($id);
        } else {
            // Update its key, name and category.
            $key = $raw['key'] ?? '';
            if (!empty($key)) {
                $name = $raw['name'] ?? $key;
                $category = $raw['category'] ?? get_string('misc', self::COMPONENTNAME);
                $hidden = ($raw['hidden'] ?? false) ? 1 : 0;
                $this->index[$id] = [
                    'key' => $key,
                    'name' => $name,
                    'c' => $category,
                    'h' => $hidden,
                ];
            }
        }
        set_config('index', json_encode($this->index), self::COMPONENTNAME);
        return $newid;
    }


    /**
     * Helper to load widget definition by ID from config.
     *
     * @param int $id
     * @return array|null Associative array or null.
     */
    private function load_raw_widget(int $id): ?array {
        $def = $this->documentstorage->get($id, 'json');
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
            $raw = $this->load_raw_widget($id);
            $widgets[] = self::from_record($raw, $fields);
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
                $raw = $this->load_raw_widget($id);
                if ($raw) {
                    return self::from_record($raw, $fields);
                }
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
        $raw = $this->load_raw_widget($id);
        if ($raw) {
            return self::from_record($raw, $fields);
        }
        return false;
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
     * Save an existing widget.
     * If the widget already exists, it will be updated.
     * The property $widget['id'] is required on update.
     *
     * @param int|null $id The widget ID. If null, a new widget will be created. -1 for partials.
     * @param array $widget The widget data to save.
     * @param string|null $yml The widget yml string.
     * @param string|null $html The widget html string.
     * @param string|null $css The widget css string.
     * @param int $rev The widget revision.
     * @return int The widget ID > 0 on success, -1 for partials, -2 on failure.
     */
    public function save_widget(
        ?int $id,
        array $widget,
        ?string $yml = null,
        ?string $html = null,
        ?string $css = null,
        int $rev = 1
    ): int {
        if ($id === 0 || $id === null) {
            $id = $this->update_seq();
        }
        $this->documentstorage->save($id, json_encode($widget), 'json');
        $this->documentstorage->save($id, $yml, 'yml');

        $this->update_index($id);
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
        set_config('index', json_encode($this->index), self::COMPONENTNAME);

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

        // Update index if any widget was deleted.
        if (!empty($deletedids)) {
            set_config('index', json_encode($this->index), self::COMPONENTNAME);
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
        $widget = $this->load_raw_widget($id);
        if (!$widget) {
            return false;
        }
        $ishidden = $widget['hidden'] ?? false;
        if ($ishidden === !$visible) {
            // No change.
            return true;
        }
        $widget['hidden'] = !$visible;
        $this->documentstorage->save($id, json_encode($widget), 'json');
        // Must delete yml document to mantain consistency.
        $this->documentstorage->delete($id, 'yml');
        $this->update_index($id);
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
