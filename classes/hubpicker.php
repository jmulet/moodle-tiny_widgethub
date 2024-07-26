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

namespace tiny_widgethub;

defined('MOODLE_INTERNAL') || die();
require_once($CFG->libdir . '/adminlib.php');

function startsWith(string $string, string $substring): bool
{
    // get the length of the substring
    $len = strlen($substring);

    // just return true when substring is an empty string
    if ($len == 0) {
        return true;
    }

    // return true or false based on the substring result
    return substr($string, 0, $len) === $substring;
}


class hubpicker extends \admin_setting
{
    public $windex;
    public $presetdata;
    public $visiblename;
    public $information;

    /**
     * not a setting, just text
     * @param string $name unique ascii name, either 'mysetting' for settings that in config, or 'myplugin/mysetting' for ones in config_plugins.
     * @param string $heading heading
     * @param string $information text in box
     */
    public function __construct($name, $visiblename, $information, $windex, $used_keys)
    {
        $this->nosave = true;
        $this->visiblename = $visiblename;
        $this->information = $information;
        $this->windex = $windex;
        $this->used_keys = $used_keys;
        parent::__construct($name, $visiblename, $information, '', $windex);
    }

    /**
     * Always returns true
     * @return bool Always returns true
     */
    public function get_setting()
    {
        return true;
    }

    /**
     * Always returns true
     * @return bool Always returns true
     */
    public function get_defaultsetting()
    {
        return true;
    }

    /**
     * Never write settings
     * @return string Always returns an empty string
     */
    public function write_setting($data)
    {
        // do not write any setting
        return '';
    }

    /**
     * Returns an HTML string
     * @return string Returns an HTML string
     */
    public function output_html($data, $query = '')
    {
        global $PAGE;

        
        // Pass all hub snippets to javascript
        $hubjson = "[]";
        $hubcontrol = \html_writer::tag('input', '', array('id' => 'id_tiny_widgethub_hubdata_'
            . $this->windex, 'type' => 'hidden', 'value' => $hubjson));

        //Add javascript handler for setting pages
        $PAGE->requires->js_call_amd(
            'tiny_widgethub/widget_settings',
            'init',
            array(array('id' => $this->windex, 'keys' => $this->used_keys))
        );

        $select = \html_writer::select([], 'tiny_widgethub/presets', '', '** Pick from Hub **');

        return format_admin_setting(
            $this, $this->visiblename,
            '<div class="form-text defaultsnext">' . $hubcontrol . $select . '</div>',
            $this->information,
            true,
            '',
            '',
            $query
        );
    }
}