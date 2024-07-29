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
// along with Moodle. If not, see <http://www.gnu.org/licenses/>.

namespace tiny_widgethub;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->libdir . '/adminlib.php');

class widgettable extends \admin_setting {

    public $visiblename;
    public $information;

    /**
     * not a setting, just text
     * @param string $name unique ascii name, either 'mysetting' for settings that in config, or 'myplugin/mysetting' for ones in config_plugins.
     * @param string $heading heading
     * @param string $information text in box
     */
    public function __construct($name, $visiblename, $information) {
        $this->nosave = true;
        $this->visiblename=$visiblename;
        $this->information=$information;
        parent::__construct($name, $visiblename, $information,'');
    }

    /**
     * Always returns true
     * @return bool Always returns true
     */
    public function get_setting() {
        return true;
    }//end of get_setting

    /**
     * Always returns true
     * @return bool Always returns true
     */
    public function get_defaultsetting() {
        return true;
    }//get_defaultsetting

    /**
     * Never write settings
     * @return string Always returns an empty string
     */
    public function write_setting($data) {
    // do not write any setting
        return '';
    }//write_setting

    /**
     * Returns an HTML string
     * @return string Returns an HTML string
     */
    public function output_html($data, $query='') {
        global $PAGE;
        $tiny_category = 'tiny_widgethub';
        $conf = get_config($tiny_category);
        $list_widget_config = self::get_list_widgets_config($conf);

        $table = new \html_table();
        $table->id = 'tiny_widgethub_widgetlist';
        $table->head = array(
            get_string('key', $tiny_category),
            get_string('name', $tiny_category),
            get_string('edit', $tiny_category)
        );
        $table->headspan = array(1,1,1);
        
        foreach ($list_widget_config as $item) {
            $row = new \html_table_row();
            $key_td = new \html_table_cell($item->key);
            $key_td->attributes = array('title' => 'Internal id=' . $item->id);
            $name_td = new \html_table_cell($item->name);
            $newlink_text = \html_writer::tag('i', '', array('class' => 'fa fa-pencil'))
                . ' ' . get_string('edit', $tiny_category);
            $editlink = \html_writer::link($item->url, $newlink_text);
            $edit_td = new \html_table_cell($editlink);
            $row->cells = array(
                $key_td, $name_td, $edit_td
            );
            $table->data[] = $row;
        }
        // Add an additional row for adding a new widget
        $row = new \html_table_row();
        $new_url = new \moodle_url( '/admin/settings.php',
                    array('section'=> 'tiny_widgethub_spage_0'));
        $newlink_text = \html_writer::tag('i', '', array('class' => 'fa fa-plus-circle'))
            . ' ' . get_string('createwidget', $tiny_category);
        $newlink = \html_writer::link($new_url, $newlink_text);
        $new_td = new \html_table_cell($newlink);
        $new_td->colspan = 3;
        $row->cells = array($new_td);
        $table->data[] = $row;

        $snippet_table= \html_writer::table($table);

		return format_admin_setting($this, $this->visiblename,
			$snippet_table,
			$this->information, true, '','', $query);
	}
     
    
     /**
      * Summary of get_list_widgets_config
      * @param object $conf
      * @return \stdClass[]
      */
     public static function get_list_widgets_config($conf){
            global $CFG;
			$ret = array();
            $widget_index = plugininfo::get_widget_index($conf);
            
            foreach(array_keys($widget_index) as $id) {
                $tindex = $widget_index[$id];
                $cfg = new \stdClass();
                $cfg->id = $id;
                $cfg->key = $tindex['key'];
                $cfg->name = $tindex['name'];
                $cfg->url = new \moodle_url( '/admin/settings.php',
                    array('section'=> 'tiny_widgethub_spage_' . $id));
                $ret[] = $cfg;
            }
            return $ret;
		}
}