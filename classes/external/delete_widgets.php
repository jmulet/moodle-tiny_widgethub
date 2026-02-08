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

// Polyfill for Moodle < 4.2.
if (!class_exists('\core_external\external_api')) {
    class_alias(
        '\external_api',
        '\core_external\external_api'
    );
    class_alias(
        '\external_function_parameters',
        '\core_external\external_function_parameters'
    );
    class_alias(
        '\external_multiple_structure',
        '\core_external\external_multiple_structure'
    );
    class_alias(
        '\external_single_structure',
        '\core_external\external_single_structure'
    );
    class_alias(
        '\external_value',
        '\core_external\external_value'
    );
}

use tiny_widgethub\local\storage\storagefactory;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * External API for Local WidgetHub plugin.
 */
class delete_widgets extends external_api {
    /**
     * Define the input parameters.
     * @return \external_function_parameters
     */
    public static function execute_parameters() {
        return new external_function_parameters([
            'ids' => new external_multiple_structure(
                new external_value(PARAM_INT, 'Widget ID to delete')
            ),
        ]);
    }

    /**
     * Define the return value structure.
     * @return external_single_structure
     */
    public static function execute_returns() {
        return new external_single_structure([
            'ids' => new external_multiple_structure(
                new external_value(PARAM_INT, 'Deleted widget ID')
            ),
        ]);
    }

    /**
     * The function that executes the real logic.
     * @param array $ids List of widget IDs to delete.
     * @return array List of deleted widget IDs.
     */
    public static function execute($ids) {
        // Validate parameters.
        $params = self::validate_parameters(self::execute_parameters(), ['ids' => $ids]);

        // Security checks.
        /** @var \context $context */
        $context = \context_system::instance();
        self::validate_context($context);
        // Only admins can delete widgets.
        require_capability('tiny/widgethub:manage', $context);

        // Execute deletion.
        $storage = storagefactory::get_instance();
        $deletedids = $storage->delete_widgets($params['ids']);

        return ['ids' => $deletedids];
    }
}
