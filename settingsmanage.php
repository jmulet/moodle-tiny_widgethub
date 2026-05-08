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
 * Page for managing widget definitions.
 *
 * @package     tiny_widgethub
 * @copyright   2026 Josep Mulet <pep.mulet@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../../../../config.php');

use tiny_widgethub\widgettable;

require_login();
/** @var \context $context */
$context = \context_system::instance();
require_capability('tiny/widgethub:manage', $context);

$PAGE->set_context($context);

$currenturl = new moodle_url('/lib/editor/tiny/plugins/widgethub/settingsmanage.php');
$PAGE->set_url($currenturl);
$managestr = get_string('widgethub:manage', 'tiny_widgethub');
$PAGE->set_title($managestr);
$PAGE->set_heading($managestr);
$PAGE->set_pagelayout('admin');

$widgetsstr = get_string('widgets', 'tiny_widgethub');
$setting = new widgettable('tiny_widgethub/widgets', $widgetsstr, $widgetsstr);

echo $OUTPUT->header();
echo $setting->output_html($setting->get_setting());
echo $OUTPUT->footer();
