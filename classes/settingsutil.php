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

/**
 * Summary of settingsutil
 */
class settingsutil {
    /**
     * Summary of create_spage_items
     * @return array
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
            '/** https://iedib.net/assets/sd/all.css */',
            PARAM_RAW
        );
        // Define additional settings in key=value syntax per line.
        $items[] = new \admin_setting_configtextarea(
            'tiny_widgethub/cfg',
            'tiny_widgethub_cfg',
            get_string('cfg', 'tiny_widgethub'),
            "imgBaseUrl=https://ibsuite.es/iedib/snippets\ndisable.plugin.pages=\n".
            "enable.contextmenu.level=1\nenable.ibquizz.userlist=",
            PARAM_RAW
        );
        return $items;
    }

    /**
     * Creates setting pages for every widget.
     * @param array $widgetlist
     * @param array $usedkeys
     * @param object $partials
     * @return \admin_settingpage[]
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
     * Returns a setting page for a given widget
     * @param object $widget
     * @param array $usedkeys
     * @param object $partials
     * @return \admin_settingpage
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
