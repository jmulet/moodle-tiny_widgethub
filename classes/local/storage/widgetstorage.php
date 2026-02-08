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
 * Interface widgetstorage
 *
 * Defines the contract for widget storage operations.
 */
interface widgetstorage {
    /**
     * Get the index of widgets.
     *
     * @return array Associative array of widgets in the form of
     * id:int => {k: string, n: string, c: string, h: int}.
     */
    public function get_index(): array;

    /**
     * Get all widgets. It does not include partials.
     *
     * @param bool $includehidden Whether to include hidden widgets.
     * @param string $fields The fields to retrieve.
     * @return \StdClass[] List of widgets.
     */
    public function get_all_widgets(bool $includehidden = false, string $fields = storagefactory::USUALFIELDS): array;

    /**
     * Get a widget by its unique key.
     *
     * @param string $key The widget key.
     * @param string $fields The fields to retrieve.
     * @return \StdClass|bool The widget object or array, or false if not found.
     */
    public function get_widget_by_key(string $key, string $fields = storagefactory::USUALFIELDS);

    /**
     * Get a widget by its database ID.
     *
     * @param int $id The widget ID.
     * @param string $fields The fields to retrieve.
     * @return \StdClass|bool The widget object or array, or false if not found.
     */
    public function get_widget_by_id(int $id, string $fields = storagefactory::USUALFIELDS);

    /**
     * Get the associated documents of widgets by their database IDs.
     *
     * @param ?array $ids The widget IDs. All widgets if null.
     * @param bool $includejson Whether to include the JSON document.
     * @param bool $includeother Whether to include the YAML document (also js and css are included here).
     * @return array Array of associative documents in the form of [{id: int, key: string, json: string, yml: string}]
     */
    public function get_documents_by_id(?array $ids, bool $includejson = true, bool $includeother = false): array;

    /**
     * Save an existing widget.
     * If the widget already exists, it will be updated.
     * The property $widget['id'] is required on update.
     *
     * @param int|null $id The widget ID. If null, a new widget will be created. -1 for partials.
     * @param array $widget The widget data to save.
     * @param string|null $yml The widget yml string.
     * @param string|null $js The widget js string.
     * @param string|null $css The widget css string.
     * @param int $rev The widget revision.
     * @return int The widget ID > 0 on success, -1 for partials, -2 on failure.
     */
    public function save_widget(
        ?int $id,
        array $widget,
        ?string $yml = null,
        ?string $js = null,
        ?string $css = null,
        int $rev = 1
    ): int;

    /**
     * Set the visibility of a widget.
     *
     * @param int $id The id of the widget.
     * @param bool $visible Whether the widget is visible.
     * @return bool True if the visibility was set, false otherwise.
     */
    public function set_visible(int $id, bool $visible): bool;

    /**
     * Delete a widget by its id.
     *
     * @param int $id The id of the widget to delete.
     * @return bool True if the widget was deleted, false otherwise.
     */
    public function delete_widget(int $id): bool;

    /**
     * Delete widgets by their ids.
     *
     * @param array $ids The ids of the widgets to delete.
     * @return array The ids of the deleted widgets.
     */
    public function delete_widgets(array $ids): array;


    /**
     * Get the partials for widget expansion.
     *
     * @return array Associative array of partials.
     */
    public function get_partials(): array;

    /**
     * Get the partials for widget expansion as YAML.
     *
     * @return string|null YAML string of partials.
     */
    public function get_partials_yml(): ?string;

    /**
     * Get used keys.
     *
     * @return array<string> Array of used keys.
     */
    public function get_used_keys(): array;

    /**
     * Get the widgets without yml.
     *
     * @return array Widgets without yml in the form {id: int, len: int}[].
     */
    public function get_widgetsnoyml(): array;

    /**
     * Save the widgets yml.
     *
     * @param array $widgets The widgets data to save.
     * @return array True if success for each widget.
     */
    public function save_widgetsyml(array $widgets): array;
}
