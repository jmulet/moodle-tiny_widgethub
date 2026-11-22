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
 * Event triggered when the widget repository is synchronised.
 */
class repository_synced extends \core\event\base {
    /**
     * Initialise the event data.
     */
    protected function init() {
        $this->data['crud'] = 'u';
        $this->data['edulevel'] = self::LEVEL_OTHER;
    }

    /**
     * Get the event name.
     *
     * @return string The localised event name.
     */
    public static function get_name() {
        return get_string('eventrepositorysynced', 'tiny_widgethub');
    }

    /**
     * Get the event description.
     *
     * @return string The event description.
     */
    public function get_description() {
        return "The user with id '{$this->userid}' synchronised the widget repository: "
            . "{$this->other['created']} created, {$this->other['updated']} updated, "
            . "{$this->other['failed']} failed.";
    }

    /**
     * Validate the event data.
     *
     * @throws \coding_exception If a synchronization count is missing.
     */
    protected function validate_data() {
        parent::validate_data();
        foreach (['created', 'updated', 'failed'] as $field) {
            if (!isset($this->other[$field])) {
                throw new \coding_exception("The '$field' value must be set in other.");
            }
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
