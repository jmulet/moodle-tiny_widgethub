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
 * Contains utility methods for managing settings pages in the Tiny WidgetHub plugin.
 *
 * This class provides methods to dynamically create configuration settings
 * and admin setting pages for the plugin. These settings include CSS options,
 * editor configurations, and individual widget-specific settings.
 *
 * @package     tiny_widgethub
 * @copyright   2024 Josep Mulet <pep.mulet@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_widgethub;

/**
 * Summary of settingsutil
 */
class settingsutil {
    /**
     * Creates the base configuration items for the Tiny WidgetHub plugin.
     *
     * This method defines the core settings, such as whether to share page CSS
     * in the editor's iframe, additional CSS definitions, and configuration
     * settings in a key=value syntax.
     *
     * @return array An array of admin setting objects for the plugin.
     */
    public static function create_spage_items() {
        $items = [];
        // Decide whether to share page css into the editor's iframe.
        $items[] = new \admin_setting_configcheckbox(
            'tiny_widgethub/sharecss',
            'tiny_widgethub_sharecss',
            get_string('sharecss', 'tiny_widgethub'),
            1
        );
        // Define additional CSS to include in the editor's iframe.
        $items[] = new \admin_setting_configtextarea(
            'tiny_widgethub/additionalcss',
            'tiny_widgethub_additionalcss',
            get_string('additionalcss', 'tiny_widgethub'),
            "html, body {\n height: initial!important;\n}",
            PARAM_RAW
        );
        // Define additional settings in key=value syntax per line.
        $items[] = new \admin_setting_configtextarea(
            'tiny_widgethub/cfg',
            'tiny_widgethub_cfg',
            get_string('cfg', 'tiny_widgethub'),
            "category.order=others:z1\noninit.refactor.bs5=0",
            PARAM_RAW
        );
        return $items;
    }
}
