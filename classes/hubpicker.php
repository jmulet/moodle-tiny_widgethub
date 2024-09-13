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

defined('MOODLE_INTERNAL') || die();
require_once($CFG->libdir . '/adminlib.php');

/**
 * Summary of tiny_widgethub\starts_with
 * @param string $string
 * @param string $substring
 * @return bool
 */
function starts_with(string $string, string $substring): bool {
    // Get the length of the substring.
    $len = strlen($substring);

    // Just return true when substring is an empty string.
    if ($len == 0) {
        return true;
    }

    // Return true or false based on the substring result.
    return substr($string, 0, $len) === $substring;
}

/**
 * Summary of hubpicker
 */
class hubpicker extends \admin_setting {
    /**
     * Summary of windex
     * @var int
     */
    public $windex;
    /**
     * Summary of presetdata
     * @var object
     */
    public $presetdata;
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
     * Not a setting, just text.
     * @param string $name unique ascii name.
     * @param string $visiblename heading
     * @param string $information text in box
     * @param int $windex
     * @param array $usedkeys
     * @param object $partials
     */
    public function __construct($name, $visiblename, $information, $windex, $usedkeys, $partials) {
        $this->nosave = true;
        $this->visiblename = $visiblename;
        $this->information = $information;
        $this->windex = $windex;
        $this->usedkeys = $usedkeys;
        $this->partials = $partials;
        parent::__construct($name, $visiblename, $information, '', $windex);
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
     * @param mixed $data
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
        global $PAGE;

        // Pass all hub snippets to javascript.
        $hubjson = "[]";
        $hubcontrol = \html_writer::tag('input', '', [
            'id' => 'id_tiny_widgethub_hubdata_'
                . $this->windex,
            'type' => 'hidden',
            'value' => $hubjson,
        ]);

        // Add javascript handler for setting pages.
        $PAGE->requires->js_call_amd(
            'tiny_widgethub/widget_settings',
            'init',
            [['id' => $this->windex, 'keys' => $this->usedkeys, 'partials' => $this->partials]]
        );

        $select = \html_writer::select([], 'tiny_widgethub/presets', '', '** Pick from Hub **');

        return format_admin_setting(
            $this,
            $this->visiblename,
            '<div class="form-text defaultsnext">' . $hubcontrol . $select . '</div>',
            $this->information,
            true,
            '',
            '',
            $query
        );
    }
}
