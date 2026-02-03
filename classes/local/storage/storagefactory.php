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
 * Class storagefactory
 *
 * Factory to retrieve the appropriate storage implementation.
 */
abstract class storagefactory {
    /**
     * The blank widget id.
     */
    public const BLANK_ID = null;
    /**
     * The partials widget id.
     */
    public const PARTIALS_ID = 0;
    /**
     * The invalid widget id.
     */
    public const INVALID_ID = -1;
    /**
     * The failure widget id.
     */
    public const FAILURE_ID = -2;
    /**
     * The standard fields including id and key.
     */
    public const IDKEYFIELDS = 'id, key';
    /**
     * The standard fields including id, key, author, version and rev.
     */
    public const AUTHORVERSIONFIELDS = self::IDKEYFIELDS . ', author, version, rev, timemodified';
    /**
     * The standard fields including basic fields.
     */
    public const BASICFIELDS = self::AUTHORVERSIONFIELDS . ', name, category, hidden';
    /**
     * The standard fields including usual fields.
     */
    public const USUALFIELDS = self::BASICFIELDS .
        ', order, icon, isfilter, isselectcapable, hasbindings, misc, scope';
    /**
     * All fields.
     */
    public const ALLFIELDS = '*';

    /** @var widgetstorage|null The singleton instance. */
    private static $instance = null;

    /**
     * Internal helper to get a property from the widget array with a default value.
     *
     * @param array $array The array to get the property from.
     * @param string $key The key to get the property from.
     * @param mixed $default The default value to return if the key is not found.
     * @return mixed The value of the property or the default value.
     */
    public static function get_prop($array, $key, $default = null) {
        return (is_array($array) && array_key_exists($key, $array)) ? $array[$key] : $default;
    }

    /**
     * Get the storage singleton instance.
     *
     * @return widgetstorage
     */
    public static function get_instance(): widgetstorage {
        if (self::$instance !== null) {
            return self::$instance;
        }
        self::$instance = new widgetstorageimpl();
        return self::$instance;
    }

    public static function get_editor_data(): array {
        $storage = self::get_instance();
        // Try to get the widget index from cache.
        $widgetindexcache = \cache::make('tiny_widgethub', 'index');
        $cached = $widgetindexcache->get('geteditordata');
        if (!$cached) {
            // Cache miss, get from storage.
            $cached = [
                'widgetlist' => $storage->get_all_widgets(),
                'partials' => $storage->get_partials(),
            ];
            $widgetindexcache->set('geteditordata', $cached);
        }
        return $cached;
    }
}
