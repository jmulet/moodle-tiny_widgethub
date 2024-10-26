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
class ymlsetting extends \admin_setting {
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
     * Returns current value of this setting.
     * @return mixed array or string depending on instance; NULL means no default, user must supply
     */
    public function get_setting() {
        return "";
    }

    /**
     * Returns default setting if exists.
     * @return mixed array or string depending on instance; NULL means no default, user must supply
     */
    public function get_defaultsetting() {
        return "";
    }

    /**
     * How the setting is stored
     * @param mixed $data
     * @return string Returns an empty string or error message
     */
    public function write_setting($data) {
        // Determine how the setting is written according to form $data.
        // Return empty or error message.
        if ($this->windex > 0 && (!isset($data) || $data == '')) {
            // Get rid of the widget at the current index
            unset_config('def_' . $this->windex, 'tiny_widgethub');
            // Update index.
            plugininfo::update_widget_index(0);
            redirect(new \moodle_url('/admin/category.php', ['category' => 'tiny_widgethub']));
            return '';
        }
        $json = json_decode($data);
        if (!isset($json)) {
            return 'Invalid widget definition';
        }
        set_config('def_' . $this->windex, $data, 'tiny_widgethub');
        // Update index.
        plugininfo::update_widget_index($this->windex);
        // Redirect to the category page.
        redirect(new \moodle_url('/admin/category.php', ['category' => 'tiny_widgethub']));
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

        // Add javascript handler for setting pages.
        // Avoid passing too much data through amd call by using hidden input elements.
        $PAGE->requires->js_call_amd(
            'tiny_widgethub/widget_settings',
            'init',
            [['id' => $this->windex, 'keys' => $this->usedkeys]]
        );

        $json = get_config('tiny_widgethub', 'def_' . $this->windex);
        
        $divyml = \html_writer::start_tag('div', [
            'id' => 'id_s_tiny_widgethub_defyml_' . $this->windex,
            'name' => 's_tiny_widgethub_defyml_' . $this->windex
            ])
            . \html_writer::end_tag('div');

        $textareajson = \html_writer::start_tag('textarea', [
                'id' => 'id_s_tiny_widgethub_def_' . $this->windex,
                'name' => 's_tiny_widgethub_def_' . $this->windex,
                'class'=>'form-control', 'rows' => '8', 'spellcheck' => 'false', 'style' => 'display:none'])
                . $json
                . \html_writer::end_tag('textarea');

        $partialsinput = \html_writer::empty_tag('input', [
            'id' => 'id_s_tiny_widgethub_partials_' . $this->windex,
            'type' => 'hidden',
            'value' => json_encode($this->partials)
        ]);
          
        return format_admin_setting(
            $this,
            $this->visiblename,
            '<div class="form-textarea">' . $divyml . $textareajson . $partialsinput . '</div>',
            $this->information,
            true,
            '',
            '',
            $query
        );
    }
}
