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
 * Summary of widgettable
 */
class widgettable extends \admin_setting {
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
        $tinycategory = 'tiny_widgethub';
        $conf = get_config($tinycategory);
        $listwidgetconfig = self::get_list_widgets_config($conf);

        $table = new \html_table();
        $table->id = 'tiny_widgethub_widgetlist';
        $table->head = [
            get_string('key', $tinycategory),
            get_string('name', $tinycategory),
            get_string('edit', $tinycategory),
        ];
        $table->headspan = [1, 1, 1];

        foreach ($listwidgetconfig as $item) {
            $row = new \html_table_row();
            $keytd = new \html_table_cell($item->key);
            $nametd = new \html_table_cell($item->name);
            $newlinktext = \html_writer::tag('i', '', ['class' => 'fa fa-pencil'])
                . ' ' . get_string('edit', $tinycategory);
            $editlink = \html_writer::link($item->url, $newlinktext);
            $edittd = new \html_table_cell($editlink);
            $edittd->attributes = ['title' => 'Internal id=' . $item->id, 'class' => ''];
            $row->cells = [
                $keytd,
                $nametd,
                $edittd,
            ];
            $table->data[] = $row;
        }

        // Add an additional row for adding a new widget.
        $row = new \html_table_row();
        $newurl = new \moodle_url(
            '/admin/settings.php',
            ['section' => 'tiny_widgethub_spage_0']
        );
        $newlinktext = \html_writer::tag('i', '', ['class' => 'fa fa-plus-circle'])
            . ' ' . get_string('createwidget', $tinycategory);
        $newlink = \html_writer::link($newurl, $newlinktext);
        $newtd = new \html_table_cell($newlink);
        $newtd->colspan = 3;
        $row->cells = [$newtd];
        $table->data[] = $row;

        $snippettable = \html_writer::table($table);

        return format_admin_setting(
            $this,
            $this->visiblename,
            $snippettable,
            $this->information,
            true,
            '',
            '',
            $query
        );
    }


    /**
     * Summary of get_list_widgets_config
     * @param object $conf
     * @return \stdClass[]
     */
    public static function get_list_widgets_config($conf) {
        $ret = [];
        $widgetindex = plugininfo::get_widget_index($conf);

        foreach (array_keys($widgetindex) as $id) {
            $tindex = $widgetindex[$id];
            $cfg = new \stdClass();
            $cfg->id = $id;
            $cfg->key = $tindex['key'];
            $cfg->name = $tindex['name'];
            $cfg->url = new \moodle_url(
                '/admin/settings.php',
                ['section' => 'tiny_widgethub_spage_' . $id]
            );
            $ret[] = $cfg;
        }
        // Sort the array by the 'name' property.
        usort($ret, function ($a, $b) {
            return strcmp($a->name, $b->name);
        });
        return $ret;
    }
}
