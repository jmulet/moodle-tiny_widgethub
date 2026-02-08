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

namespace tiny_widgethub\external;

use tiny_widgethub\local\storage\storagefactory;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_value;

/**
 * External API for Local WidgetHub plugin.
 */
class get_widgetsnoyml extends external_api {
    /**
     * Define the input parameters.
     * @return \external_function_parameters
     */
    public static function execute_parameters() {
        return new external_function_parameters([]);
    }

    /**
     * Define the return value structure.
     * @return external_multiple_structure
     */
    public static function execute_returns() {
        return new external_multiple_structure(
            new external_value(PARAM_INT, 'The id of the widget')
        );
    }

    /**
     * The function that executes the real logic.
     * @return array The ids of the widgets without yml.
     */
    public static function execute() {
        self::validate_parameters(self::execute_parameters(), []);
        /** @var \context $context */
        $context = \context_system::instance();
        self::validate_context($context);
        require_capability('tiny/widgethub:manage', $context);

        $storage = storagefactory::get_instance();
        return $storage->get_widgetsnoyml();
    }
}
