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

require_once(__DIR__ . '/../../../../../config.php');
require_once($CFG->libdir . '/adminlib.php');
require_once($CFG->libdir . '/editorlib.php');

use tiny_widgethub\local\storage\storagefactory;
use tiny_widgethub\form\settingseditorform;

// Get the required parameters. Assume new widget if no id is provided.
// Use id = 0 as an alias for new widget.
// Use id = -1 as an alias for partials.
$widgetid = optional_param('id', -1, PARAM_INT);
if ($widgetid < 0) {
    $widgetid = null;
}

$pageid = 'tinywidgethubeditor';
// Displays the page.
$params = [];
if ($widgetid !== null) {
    $params['id'] = $widgetid;
}
admin_externalpage_setup($pageid, '', $params, '', ['pagelayout' => 'embedded']);

$currenturl = '/lib/editor/tiny/plugins/widgethub/settingseditorpage.php';
$PAGE->set_url($currenturl, $params);
$PAGE->set_title(get_string('pluginname', 'tiny_widgethub'));
$PAGE->add_body_class('tiny_widgethub-playground');

/** @var \context $context */
$context = \context_system::instance();
$PAGE->set_context($context);
require_capability('tiny/widgethub:manage', $context);

$storage = storagefactory::get_instance();
$usedkeys = $storage->get_used_keys();
$partialsjson = $storage->get_partials();

$mform = new settingseditorform(null, ['id' => $widgetid]);

// Handling submission.
if ($mform->is_cancelled()) {
    redirect(new moodle_url('/admin/settings.php', ['section' => 'tiny_widgethub_settings'], 'widgettable'));
} else if ($data = $mform->get_data()) {
    if (isset($data->action) && $data->action === 'cancel') {
        redirect(new moodle_url('/admin/settings.php', ['section' => 'tiny_widgethub_settings'], 'widgettable'));
    }
    // PHP Save logic.
    $id = $data->id;
    $widget = json_decode($data->widget_json, true) ?: [];
    $newid = $storage->save_widget($id, $widget, $data->widget_yml, $data->widget_html, $data->widget_css);

    if ($newid <= storagefactory::FAILURE_ID) {
        \core\notification::error(get_string('errunexpected', 'tiny_widgethub'));
    } else {
        \core\notification::success(get_string('changessaved', 'tiny_widgethub'));
        if (isset($data->action) && $data->action === 'saveandclose') {
            redirect(new moodle_url('/admin/settings.php', ['section' => 'tiny_widgethub_settings'], 'widgettable'));
        }
        // If saving a new widget, it will redirect to the correct page.
        if ($widgetid === storagefactory::BLANK_ID) {
            redirect(new moodle_url($currenturl, ['id' => $newid]));
        }
    }
}

$doc = '';
$ymldoc = '';
$htmldoc = '';
$cssdoc = '';
// Prepare initial data if not POSTed.
if (!$mform->is_submitted()) {
    if ($widgetid !== null && $widgetid >= 0) {
        $entry = $storage->get_documents_by_id([$widgetid], true, true);
        if ($entry) {
            $entry = (array) $entry[0];
            $doc = $entry['json'] ?? '{}';
            $ymldoc = $entry['yml'] ?? '';
            $htmldoc = $entry['html'] ?? '';
            $cssdoc = $entry['css'] ?? '';
        } else {
            \core\notification::error('Widget ' . $widgetid . ' not found');
            redirect(new moodle_url('/admin/settings.php', ['section' => 'tiny_widgethub_settings'], 'widgettable'));
        }
    }
    $mform->set_data([
        'id' => $widgetid,
        'widget_json' => $doc,
        'widget_yml' => $ymldoc,
        'widget_html' => $htmldoc,
        'widget_css' => $cssdoc,
        'widget_partials' => json_encode($partialsjson),
    ]);
} else if ($data = $mform->get_data()) {
    // Set the data from the form to the form. (in case of errors).
    $mform->set_data([
        'id' => $widgetid,
        'widget_json' => $data->widget_json,
        'widget_yml' => $data->widget_yml,
        'widget_html' => $data->widget_html,
        'widget_css' => $data->widget_css,
        'widget_partials' => $data->widget_partials,
    ]);
}

// Display the page.
echo $OUTPUT->header();

$url = '/admin/settings.php?section=tiny_widgethub_settings';
$title = 'Settings';
echo '<div class="widget-config-container m-5">';
echo "
<nav aria-label=\"breadcrumb\">
  <ol class=\"breadcrumb\">
    <li class=\"breadcrumb-item\" aria-current=\"page\"><a href=\"{$url}\">WidgetHub</a></li>
    <li class=\"breadcrumb-item\" aria-current=\"page\"><a href=\"{$url}#widgettable\">Widgets</a></li>
    <li class=\"breadcrumb-item active\" aria-current=\"page\">Editor</li>
  </ol>
</nav>";

$title = '';
if ($widgetid !== null && $widgetid >= 0) {
    if (!isset($entry)) {
        // Simply get the key of widgetid if not set.
        $entry = $storage->get_documents_by_id([$widgetid], false, false);
        $entry = $entry ? (array) $entry[0] : null;
        if ($entry === null) {
            \core\notification::error('Widget ' . $widgetid . ' not found');
            redirect(new moodle_url('/admin/settings.php', ['section' => 'tiny_widgethub_settings'], 'widgettable'));
        }
    }
    $title = get_string('edit', 'tiny_widgethub') . ' widget ' . $widgetid . ' / ' . ($entry['key'] ?? '');
} else {
    $title = get_string('createwidget', 'tiny_widgethub');
}
echo $OUTPUT->heading($title);

$mform->display();

$ispartials = $widgetid === storagefactory::PARTIALS_ID;
$renderctx = [
    'showpreview' => !$ispartials,
    'showassets' => false,
    'disablehtml' => true,
    'disablecss' => true,
];
echo $OUTPUT->render_from_template('tiny_widgethub/widget_editor', $renderctx);

echo '</div>';

$texteditor = get_texteditor('tiny');
if ($texteditor !== false) {
    $texteditor->use_editor('id_widget_previewtiny', [
        'maxfiles'  => 0,
        'context'   => $PAGE->context,
        'trusttext' => true,
    ]);
}

// JavaScript initialization.
$PAGE->requires->js_call_amd(
    'tiny_widgethub/widgetsettings',
    'init',
    [
        [
            'id' => $widgetid,
            'keys' => $usedkeys,
            'selectors' => [
                'json' => '#id_widget_json',
                'yml' => '#id_widget_yml',
                'css' => '#id_widget_css',
                'html' => '#id_widget_html',
                'partials' => '#id_widget_partials',
                'save' => 'input[name="save"]',
                'saveandclose' => 'input[name="saveandclose"]',
                'refreshbtn' => '#id_widget_refreshbutton',
            ],
            'assetsinjection' => false,
        ],
    ]
);

echo $OUTPUT->footer();
