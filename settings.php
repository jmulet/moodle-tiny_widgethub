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
 * @copyright   2026 Josep Mulet <pep.mulet@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

if ($hassiteconfig) {
    $plugincategory = 'tiny_widgethub';

    // Create the category node inside editor tiny section.
    // This MUST be done outside the fulltree check so Moodle knows the hierarchy.
    $ADMIN->add('editortiny', new admin_category($plugincategory, get_string('pluginname', 'tiny_widgethub')));

    // Register the external pages (hidden from navigation).
    $externalpage = new admin_externalpage(
        'tinywidgethubeditor',
        get_string('pluginname', 'tiny_widgethub'),
        new moodle_url('/lib/editor/tiny/plugins/widgethub/settingseditorpage.php'),
        'tiny/widgethub:manage',
        true // Hidden from the admin menu tree.
    );
    $ADMIN->add($plugincategory, $externalpage);

    $externalpage = new admin_externalpage(
        'tinywidgethubrestore',
        get_string('pluginname', 'tiny_widgethub'),
        new moodle_url('/lib/editor/tiny/plugins/widgethub/settingsrestorepage.php'),
        'tiny/widgethub:manage',
        true
    );
    $ADMIN->add($plugincategory, $externalpage);

    $externalpage = new admin_externalpage(
        'tinywidgethubsync',
        get_string('syncrepository', 'tiny_widgethub'),
        new moodle_url('/lib/editor/tiny/plugins/widgethub/settingssyncpage.php'),
        'tiny/widgethub:manage',
        true
    );
    $ADMIN->add($plugincategory, $externalpage);

    // Load actual settings only when the user is viewing a settings page.
    if ($ADMIN->fulltree) {
        // Main settings page definition.
        $mainsettings = new admin_settingpage(
            'tiny_widgethub_settings',
            get_string('pluginname', 'tiny_widgethub'),
            'tiny/widgethub:manage'
        );

        // Add basic items to page from the utility class.
        $mainitems = \tiny_widgethub\settingsutil::create_spage_items();
        foreach ($mainitems as $mainitem) {
            $mainsettings->add($mainitem);
        }

        // Add table of widgets to page.
        $widgettableitem = new \tiny_widgethub\widgettable(
            'tiny_widgethub/widgettable',
            get_string('widgets', 'tiny_widgethub'),
            ''
        );
        $mainsettings->add($widgettableitem);

        // Add the main settings page to our category.
        $ADMIN->add($plugincategory, $mainsettings);

        // Set the default return variable to null as we used $ADMIN->add.
        $settings = null;
    }
}
