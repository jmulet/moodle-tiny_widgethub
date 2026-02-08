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
use core_external\external_single_structure;
use core_external\external_value;

/**
 * External API for Local WidgetHub plugin.
 */
class save_widgetsyml extends external_api {
    /**
     * Define the input parameters.
     * @return \external_function_parameters
     */
    public static function execute_parameters() {
        return new external_function_parameters([
            'widgets' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'Widget ID'),
                    'key' => new external_value(PARAM_TEXT, 'Widget key'),
                    'yml' => new external_value(PARAM_RAW, 'The yml content of the widget'),
                ])
            ),
        ]);
    }

    /**
     * Define the return value structure.
     * @return external_multiple_structure
     */
    public static function execute_returns() {
        return new external_multiple_structure(new external_value(PARAM_BOOL, 'Success'));
    }

    /**
     * The function that executes the real logic.
     * @param array $widgets The widgets data to save.
     * @return array True if success for each widget.
     */
    public static function execute($widgets) {
        $params = self::validate_parameters(self::execute_parameters(), ['widgets' => $widgets]);
        /** @var \context $context */
        $context = \context_system::instance();
        // Only admins can perform this action.
        require_capability('tiny/widgethub:manage', $context);
        self::validate_context($context);

        $storage = storagefactory::get_instance();
        return $storage->save_widgetsyml($params['widgets']);
    }
}
