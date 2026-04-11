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

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;
use tiny_widgethub\local\storage\storagefactory;

/**
 * External API for get_editordata.
 */
class get_editordata extends external_api {
    /**
     * Function to parse the configuration.
     * @param string $configstr
     * @return array<string, string>
     */
    private static function parseconfig(string $configstr): array {
        $config = [];
        $lines = explode("\n", trim($configstr)); // Split into lines.
        foreach ($lines as $line) {
            if (strpos($line, '=') !== false) {
                $parts = explode('=', $line, 2);
                $key = trim($parts[0]);
                $value = isset($parts[1]) ? trim($parts[1]) : '';
                $config[$key] = $value;
            }
        }
        return $config;
    }

    /**
     * Define the input parameters.
     * @return \external_function_parameters
     */
    public static function execute_parameters() {
        return new external_function_parameters([]);
    }

    /**
     * Define the return value structure.
     * @return external_single_structure
     */
    public static function execute_returns() {
        return new external_single_structure([
            'widgetlist' => new external_value(PARAM_RAW, 'The widget list'),
            'partials' => new external_value(PARAM_RAW, 'The partials'),
            'additionalcss' => new external_value(PARAM_RAW, 'The additional css'),
            'cfg' => new external_value(PARAM_RAW, 'The configuration map'),
        ]);
    }

    /**
     * The function that executes the the widget backup logic.
     */
    public static function execute() {
        // Validate parameters.
        self::validate_parameters(self::execute_parameters(), []);

        // Security checks. Any administrator can backup widgets.
        /** @var \context $context */
        $context = \context_system::instance();
        self::validate_context($context);
        require_capability('tiny/widgethub:viewplugin', $context);

        $data = storagefactory::get_editor_data();
        $additionalcss = get_config('tiny_widgethub', 'additionalcss') ?? '';
        // Syntax key=value per line.
        $cfg = self::parseconfig(get_config('tiny_widgethub', 'cfg') ?? '');
        return [
            'widgetlist' => json_encode($data['widgetlist'] ?? []),
            'partials' => json_encode($data['partials'] ?? (object)[]),
            'additionalcss' => $additionalcss,
            'cfg' => json_encode($cfg),
        ];
    }
}
