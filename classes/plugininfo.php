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
 * Tiny WidgetHub plugin.
 *
 * @package     tiny_widgethub
 * @copyright   2024 Josep Mulet <pep.mulet@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_widgethub;

use context;
use editor_tiny\plugin;
use editor_tiny\plugin_with_buttons;
use editor_tiny\plugin_with_configuration;
use editor_tiny\plugin_with_menuitems;
use tiny_widgethub\local\storage\storagefactory;

/**
 * Function to parse the configuration.
 * @param string $configstr
 * @return string[]
 */
function tiny_widgethub_parseconfig($configstr) {
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
 * Tiny WidgetHub plugin version details.
 */
class plugininfo extends plugin implements
    plugin_with_buttons,
    plugin_with_configuration,
    plugin_with_menuitems {
    /**
     * Get the editor buttons for this plugins
     *
     * @return array
     */
    public static function get_available_buttons(): array {
        return [
            'tiny_widgethub/widgethub',
        ];
    }
    /**
     * Get the dropdown menu items for this plugin
     *
     * @return array
     */
    public static function get_available_menuitems(): array {
        return [
            'tiny_widgethub/widgethub',
        ];
    }

    /**
     * Get the configuration for the plugin, capabilities and
     * config (from settings.php)
     *
     * @param context $context
     * @param array $options
     * @param array $fpoptions
     * @param \editor_tiny\editor|null $editor
     * @return void
     *
     * @return array
     */
    public static function get_plugin_configuration_for_context(
        context $context,
        array $options,
        array $fpoptions,
        ?\editor_tiny\editor $editor = null
    ): array {
        global $USER, $COURSE, $CFG;

        // Decide if to enable the plugin.
        $showplugin = has_capability('tiny/widgethub:viewplugin', $context);

        $params = [
            'showplugin' => $showplugin,
        ];

        if ($showplugin) {
            // Obtain the configuration options for the plugin from the config table.
            $roles = get_user_roles($context, $USER->id);
            // Extract role shortnames.
            $userroles = array_map(function ($role) {
                return $role->shortname;
            }, $roles);
            $params['user'] = [
                'id' => $USER->id,
                'username' => $USER->username,
                'roles' => array_values($userroles),
            ];
            $params['userprefs'] = get_user_preferences('tiny_widgethub_userprefs', '');
            $params['courseid'] = $COURSE->id;
            $params['moodleversion'] = $CFG->release;

            $data = storagefactory::get_editor_data();
            $params['widgetlist'] = $data['widgetlist'] ?? [];
            $params['partials'] = $data['partials'] ?? (object)[];

            // Configuration.
            $params['sharecss'] = get_config('tiny_widgethub', 'sharecss') === '1';
            $params['additionalcss'] = get_config('tiny_widgethub', 'additionalcss') ?? '';
            // Syntax key=value per line.
            $params['cfg'] = tiny_widgethub_parseconfig(get_config('tiny_widgethub', 'cfg') ?? '');
        }
        return $params;
    }
}
