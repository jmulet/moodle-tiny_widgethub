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
 * Local WidgetHub plugin version details.
 *
 * @package     tiny_widgethub
 * @copyright   2026 Josep Mulet <pep.mulet@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../../../../config.php');
require_once($CFG->libdir . '/adminlib.php');
require_once($CFG->libdir . '/editorlib.php');

use tiny_widgethub\local\storage\backuputil;
use tiny_widgethub\form\settingsrestoreform;

$pageid = 'tinywidgethubrestore';
// Displays the page.
admin_externalpage_setup($pageid, '', [], '', ['pagelayout' => 'standard']);

$currenturl = '/lib/editor/tiny/plugins/widgethub/settingsrestorepage.php';
$PAGE->set_url($currenturl);
$restorestr = get_string('restorewidgets', 'tiny_widgethub');
$PAGE->set_title($restorestr);
$PAGE->set_heading($restorestr);

/** @var \context $context */
$context = \context_system::instance();
$PAGE->set_context($context);
require_capability('tiny/widgethub:manage', $context);

$mform = new settingsrestoreform();

$res = null;
$widgettableurl = new moodle_url('/admin/settings.php', ['section' => 'tiny_widgethub_settings'], 'widgettable');
// Handling submission.
if ($mform->is_cancelled()) {
    redirect($widgettableurl);
} else if ($data = $mform->get_data()) {
    if (isset($data->action) && $data->action === 'cancel') {
        redirect($widgettableurl);
    }
    $res = backuputil::restore_backup($data);
}

// Display the page.
echo $OUTPUT->header();

if ($res) {
    if ($res['success']) {
        echo $OUTPUT->notification(get_string('backuprestoredsuccess', 'tiny_widgethub'), 'success');
        echo '<ul class="list-group">';
        foreach ($res['logs'] as $log) {
            $severity = $log['severity'] ?? '';
            if ($severity) {
                $severity = ' list-group-item-' . $severity;
            }
            echo '<li class="list-group-item' . $severity . '">' . $log['message'] . '</li>';
        }
        echo '</ul>';
        echo '<a href="' . $widgettableurl . '" class="btn btn-primary m-4">' . get_string('accept', 'core') . '</a>';
    } else {
        echo $OUTPUT->notification(get_string('backuprestoredfailed', 'tiny_widgethub'), 'error');
        echo '<ul class="list-group mb-4">';
        foreach ($res['logs'] as $log) {
            $severity = $log['severity'] ?? '';
            if ($severity) {
                $severity = ' list-group-item-' . $severity;
            }
            echo '<li class="list-group-item' . $severity . '">' . $log['message'] . '</li>';
        }
        echo '</ul>';
    }
}

if (!$res || !$res['success']) {
    $mform->display();
}

echo $OUTPUT->footer();
