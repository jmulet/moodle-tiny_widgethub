<?php
// This file is part of Moodle - https://moodle.org/
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
// along with Moodle.  If not, see <https://www.gnu.org/licenses/>.

/**
 * Tiny WidgetHub plugin version details.
 *
 * @package     tiny_widgethub
 * @copyright   2024 Josep Mulet <pep.mulet@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

if ($hassiteconfig) {
    $tinyCategory = 'tiny_widgethub';
    $settings = new admin_settingpage('tiny_widgethub_settings', get_string('pluginname', $tinyCategory));

    if ($ADMIN->fulltree) {
        // Configure component preview.
        $conf = get_config('tiny_widgethub');

        // Create a category
        $ADMIN->add('editortiny', new admin_category($tinyCategory, get_string('pluginname', $tinyCategory)));

        // Main settings
        $mainSettings = new admin_settingpage($tinyCategory . '_settings', get_string('pluginname', $tinyCategory));

        // Add basic items to page, snippet count really
        $mainItems = \tiny_widgethub\settingsutil::create_spage_items();
        foreach ($mainItems as $main_item) {
            $mainSettings->add($main_item);
        }

        // Add table of widgets to page
        $widgettableItem = new \tiny_widgethub\widgettable(
            'tiny_widgethub/widgettable',
            get_string('widgets', $tinyCategory),
            ''
        );
        $mainSettings->add($widgettableItem);

        // Add page to category
        $ADMIN->add($tinyCategory, $mainSettings);

        // Add Snippets pages to category (hidden from nav)
        $spages = \tiny_widgethub\settingsutil::create_widget_spages($conf);
        foreach ($spages as $page) {
            $ADMIN->add($tinyCategory, $page);
        }

        // Set the default return to null
        $settings = null;
    }
}
