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
 * Local WidgetHub plugin version details.
 *
 * @package     tiny_widgethub
 * @copyright   2026 Josep Mulet <pep.mulet@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
defined('MOODLE_INTERNAL') || die();

$functions = [
    'tiny_widgethub_delete_widgets' => [
        'classname'   => 'tiny_widgethub\external\delete_widgets',
        'description' => 'Deletes widgets by ID',
        'type'        => 'write',
        'ajax'        => true,
    ],
    'tiny_widgethub_get_widgetsdocuments' => [
        'classname'   => 'tiny_widgethub\external\get_widgetsdocuments',
        'description' => 'Get widgets documents',
        'type'        => 'read',
        'ajax'        => true,
    ],
    'tiny_widgethub_get_backup' => [
        'classname'   => 'tiny_widgethub\external\get_backup',
        'description' => 'Gets url of a generated backup file of widgets',
        'type'        => 'read',
        'ajax'        => true,
    ],
    'tiny_widgethub_get_editordata' => [
        'classname'   => 'tiny_widgethub\external\get_editordata',
        'description' => 'Gets the widgets and partials for the editor',
        'type'        => 'read',
        'ajax'        => true,
    ],
    'tiny_widgethub_get_widgetsnoyml' => [
        'classname'   => 'tiny_widgethub\external\get_widgetsnoyml',
        'description' => 'Gets list of widgets that are missing yml',
        'type'        => 'read',
        'ajax'        => true,
    ],
    'tiny_widgethub_save_widgetsyml' => [
        'classname'   => 'tiny_widgethub\external\save_widgetsyml',
        'description' => 'Saves the yml files of widgets',
        'type'        => 'write',
        'ajax'        => true,
    ],
    'tiny_widgethub_update_visible' => [
        'classname'   => 'tiny_widgethub\external\update_visible',
        'description' => 'Sets visibility of a widget',
        'type'        => 'write',
        'ajax'        => true,
    ],
];
