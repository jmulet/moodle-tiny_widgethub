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
 * @copyright   2026 Josep Mulet <pep.mulet@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_widgethub;

use tiny_widgethub\local\storage\storagefactory;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->libdir . '/adminlib.php');

/**
 * Summary of widgettable
 */
class widgettable extends \admin_setting {
    /**
     * Summary of TINY_CATEGORY
     * @var string
     */
    const TINY_CATEGORY = 'tiny_widgethub';

    /**
     * Summary of visiblename
     * @var string
     */
    public $visiblename;
    /**
     * Summary of information
     * @var string
     */
    public $information;
    /**
     * Summary of nosave
     * @var bool
     */
    public $nosave;

    /**
     * Not a setting, just text
     * @param string $name unique ascii name.
     * @param string $visiblename heading
     * @param string $information text in box
     */
    public function __construct($name, $visiblename, $information) {
        $this->nosave = true;
        $this->visiblename = $visiblename;
        $this->information = $information;
        parent::__construct($name, $visiblename, $information, '');
    }

    /**
     * Always returns true
     * @return bool Always returns true
     */
    public function get_setting() {
        return true;
    }

    /**
     * Always returns true
     * @return bool Always returns true
     */
    public function get_defaultsetting() {
        return true;
    }

    /**
     * Never write settings
     * @param mixed $data data
     * @return string Always returns an empty string
     */
    public function write_setting($data) {
        // Do not write any setting.
        return '';
    }

    /**
     * Returns an HTML string
     * @param mixed $data
     * @param string $query
     * @return string Returns an HTML string
     */
    public function output_html($data, $query = '') {
        global $PAGE, $OUTPUT;
        $widgets = self::get_list_widgets_config();

        $tableid = 'tiny_widgethub_widgetlist';
        $selectallid = 'tiny_selectall';
        $deletebtnid = 'tiny_deletebtn';
        $exportid = 'tiny_widgethub_export';

        // Prepare data for the template.
        $templatedata = [
            'tableid' => $tableid,
            'selectallid' => $selectallid,
            'deletebtnid' => $deletebtnid,
            'exportid' => $exportid,
            'widgets' => $widgets,
            'urls' => [
                'partials' => (
                    new \moodle_url(
                        '/lib/editor/tiny/plugins/widgethub/settingseditorpage.php',
                        ['id' => 0]
                    )
                )->out(false),
                'newwidget' => (
                    new \moodle_url('/lib/editor/tiny/plugins/widgethub/settingseditorpage.php')
                )->out(false),
                'restore' => (
                    new \moodle_url('/lib/editor/tiny/plugins/widgethub/settingsrestorepage.php')
                )->out(false),
                'sync' => (
                    new \moodle_url('/lib/editor/tiny/plugins/widgethub/settingssyncpage.php')
                )->out(false),
            ],
        ];

        // Render the Mustache template.
        $finalhtml = $OUTPUT->render_from_template('tiny_widgethub/widgettable', $templatedata);

        $deletestr = get_string('delete', self::TINY_CATEGORY);
        $jsparams = [
            'tableId' => $tableid,
            'selectAllId' => $selectallid,
            'deleteBtnId' => $deletebtnid,
            'exportBtnId' => $exportid,
            'baseUrl' => $PAGE->url->out(false),
            'sesskey' => sesskey(),
            'confirmTitle' => $deletestr,
            'confirmMessage' => get_string('confirmdelete', self::TINY_CATEGORY),
            'confirmBtn' => $deletestr,
        ];

        $PAGE->requires->js_call_amd('tiny_widgethub/widgettable', 'init', [$jsparams]);

        return format_admin_setting(
            $this,
            $this->visiblename,
            $finalhtml,
            $this->information,
            true,
            '',
            '',
            $query
        );
    }

    /**
     * Summary of get_list_widgets_config
     * @return \stdClass[] Array of widget objects.
     */
    public static function get_list_widgets_config(): array {
        $storage = storagefactory::get_instance();
        $index = $storage->get_index();
        $widgets = [];
        foreach ($index as $itemid => $info) {
            if (!is_array($info)) {
                continue;
            }
            $widgets[] = (object) [
                'id' => $itemid,
                'key' => $info['k'] ?? 'key' . $itemid,
                'name' => $info['n'] ?? 'Unknown ' . $itemid,
                'category' => $info['c'] ?? '',
                'hidden' => ($info['h'] ?? 0) === 1,
                'url' => new \moodle_url(
                    '/lib/editor/tiny/plugins/widgethub/settingseditorpage.php',
                    ['id' => $itemid]
                ),
            ];
        }
        // Sort the array first by 'category' and then by 'name' property.
        usort($widgets, function ($a, $b) {
            $cmp = strcmp($a->category ?? '', $b->category ?? '');
            if ($cmp == 0) {
                return strcmp($a->name ?? '', $b->name ?? '');
            }
            return $cmp;
        });
        return $widgets;
    }
}
