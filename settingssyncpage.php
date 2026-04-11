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
 * Page for synchronizing widget definitions from the repository.
 *
 * @package     tiny_widgethub
 * @copyright   2026 Josep Mulet <pep.mulet@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../../../../config.php');
require_once($CFG->libdir . '/adminlib.php');

use tiny_widgethub\local\storage\widgetrepository;
use tiny_widgethub\form\settingssyncform;

$pageid = 'tinywidgethubsync';
admin_externalpage_setup($pageid, '', [], '', ['pagelayout' => 'admin']);

$currenturl = new moodle_url('/lib/editor/tiny/plugins/widgethub/settingssyncpage.php');
$PAGE->set_url($currenturl);
$syncstr = get_string('syncrepository', 'tiny_widgethub');
$PAGE->set_title($syncstr);
$PAGE->set_heading($syncstr);

/** @var \context $context */
$context = \context_system::instance();
$PAGE->set_context($context);
require_capability('tiny/widgethub:manage', $context);

$backurl = new moodle_url('/admin/settings.php', ['section' => 'tiny_widgethub_settings'], 'widgettable');

$syncstatus = widgetrepository::getsyncstatus();
$tablehtml = $OUTPUT->render_from_template('tiny_widgethub/sync_table', ['syncstatus' => $syncstatus]);

$mform = new settingssyncform(null, ['tablehtml' => $tablehtml]);

$syncresults = null;
if ($mform->is_cancelled()) {
    redirect($backurl);
} else if ($data = $mform->get_data()) {
    // Selectedkeys is a JSON-encoded array kept in sync by the AMD module.
    $rawkeys = !empty($data->selectedkeys) ? json_decode($data->selectedkeys, true) : [];
    $keys = is_array($rawkeys)
        ? array_values(array_filter(array_map(fn($k) => clean_param($k, PARAM_ALPHANUMEXT), $rawkeys)))
        : [];
    if (!empty($keys)) {
        $syncresults = widgetrepository::syncwidgets($keys);
        // Refresh sync status after sync.
        $syncstatus = widgetrepository::getsyncstatus();
        $tablehtml = $OUTPUT->render_from_template('tiny_widgethub/sync_table', ['syncstatus' => $syncstatus]);
        $mform = new settingssyncform(null, ['tablehtml' => $tablehtml]);
    }
}

// Display the page.
echo $OUTPUT->header();

if ($syncresults !== null) {
    $successcount = count(array_filter($syncresults));
    $totalcount = count($syncresults);
    if ($successcount === $totalcount) {
        echo $OUTPUT->notification(get_string('syncsuccess', 'tiny_widgethub'), 'success');
    } else {
        $a = (object) [
            'success' => $successcount,
            'total' => $totalcount,
        ];
        echo $OUTPUT->notification(get_string('syncpartial', 'tiny_widgethub', $a), 'warning');
    }
}

$mform->display();

$PAGE->requires->js_call_amd('tiny_widgethub/settingssync', 'init');

echo $OUTPUT->footer();
