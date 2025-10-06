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
            "html, body {\n height: initial;\n}",
            PARAM_RAW
        );
        // Define additional settings in key=value syntax per line.
        $items[] = new \admin_setting_configtextarea(
            'tiny_widgethub/cfg',
            'tiny_widgethub_cfg',
            get_string('cfg', 'tiny_widgethub'),
            "enable.contextmenu.level=1\ncategory.order=misc:z1\noninit.refractor.bs5=0",
            PARAM_RAW
        );
        return $items;
    }

    /**
     * Creates admin setting pages for each widget in the provided list.
     *
     * Generates a new settings page for every widget in the `widgetlist` array.
     * Additionally, creates a special page for a new widget template (ID = 0).
     *
     * @param array $widgetlist A list of widget objects to create settings pages for.
     * @param array $usedkeys A list of keys already in use to avoid conflicts.
     * @param object $partials Partials data used for additional settings.
     * @return \admin_settingpage[] An array of admin setting pages.
     */
    public static function create_widget_setting_pages($widgetlist, $usedkeys, $partials) {
        $pages = [];
        // Start creating a page for a new widget identified by id = 0.
        $emptywidget = new \stdClass();
        $emptywidget->id = 0;
        $pages[] = self::create_page_for_widget($emptywidget, $usedkeys, $partials);
        foreach ($widgetlist as $widget) {
            $pages[] = self::create_page_for_widget($widget, $usedkeys, $partials);
        }
        return $pages;
    }

    /**
     * Generates a single admin setting page for a specific widget.
     *
     * Creates a detailed settings page for the given widget, including configuration
     * options and metadata. If the widget is a partial, the page title reflects this.
     *
     * @param object $widget The widget object for which to create the settings page.
     * @param array $usedkeys A list of keys already in use to avoid duplication.
     * @param object $partials Partials data used for specific widget configurations.
     * @return \admin_settingpage The created admin setting page object.
     */
    private static function create_page_for_widget($widget, $usedkeys, $partials) {
        $windx = $widget->id;
        $title = get_string('createwidget', 'tiny_widgethub');
        if (!empty($widget->key) && $widget->key == 'partials') {
            $title = get_string('edit', 'tiny_widgethub') . ' partials';
        } else if (!empty($widget->key) && !empty($widget->name)) {
            $title = get_string('edit', 'tiny_widgethub') . ' ' . $widget->name;
        }
        // Page Settings for every widget.
        $settingspage = new \admin_settingpage('tiny_widgethub_spage_' . $windx,
            $title, 'moodle/site:config', true);

        if ($windx > 0) {
            $settingspage->add(
                new \admin_setting_heading(
                    'tiny_widgethub/heading_' . $windx,
                    get_string('widget', 'tiny_widgethub') . ' ' . $windx,
                    ''
                )
            );
        }
        $settingspage->add(
            new ymlsetting(
                'tiny_widgethub/def_' . $windx,
                get_string('def', 'tiny_widgethub'),
                get_string('def_desc', 'tiny_widgethub'),
                $windx,
                $usedkeys,
                $partials
            )
        );
        return $settingspage;
    }
}
