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
 * Local WidgetHub plugin.
 *
 * @package     tiny_widgethub
 * @copyright   2026 Josep Mulet <pep.mulet@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_widgethub\event;

/**
 * Base class for widget events.
 */
abstract class widget_base extends \core\event\base {
    /**
     * Validate the event data.
     *
     * @throws \coding_exception If the widget id or key is missing.
     */
    protected function validate_data() {
        parent::validate_data();
        if (!isset($this->other['id']) || !isset($this->other['key'])) {
            throw new \coding_exception('The \'id\' and \'key\' values must be set in other.');
        }
    }

    /**
     * Get the mapping of other fields.
     *
     * @return false No mapping is required.
     */
    public static function get_other_mapping() {
        return false;
    }
}
