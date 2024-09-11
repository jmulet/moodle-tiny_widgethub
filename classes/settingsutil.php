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

/**
 *
 * This is a class containing static functions for general snippet filter things
 * like embedding recorders and managing them
 */
class settingsutil
{
	public static function create_spage_items()
	{
		$items = [];

		// Decide whether to share page css into the editor's iframe
		$items[] = new \admin_setting_configcheckbox(
			'tiny_widgethub/sharecss',
			'tiny_widgethub_sharecss',
			get_string('sharecss', 'tiny_widgethub'),
			'',
			1
		);

		// Define additional CSS to include in the editor's iframe
		$items[] = new \admin_setting_configtextarea(
			'tiny_widgethub/additionalcss',
			'tiny_widgethub_additionalcss',
			get_string('additionalcss', 'tiny_widgethub'),
			'',
			PARAM_RAW
		);
		return $items;
	}

	/**
	 * Summary of create_widget_spages
	 * @param object $conf
	 * @return \admin_settingpage[]
	 */
	public static function create_widget_spages($conf)
	{
		$widget_index = plugininfo::get_widget_index($conf);
		$widgetList = plugininfo::get_widget_list($conf, $widget_index);
		$usedKeys = array();
		$partials = plugininfo::get_partials($conf, $widget_index);

		$pages = array();
		// Create a page for new widget
		$emptyWidget = new \stdClass();
		$emptyWidget->id = 0;
		$pages[] = self::create_page_for_widget($emptyWidget, $usedKeys, $partials);
		foreach ($widgetList as $widget) {
			$pages[] = self::create_page_for_widget($widget, $usedKeys, $partials);
		}
		return $pages;
	}

	/**
	 * Returns a setting page for a given widget
	 * @param object $widget
	 * @param array $used_keys
	 * @return \admin_settingpage
	 */
	private static function create_page_for_widget($widget, $usedKeys, $partials)
	{
		$windx = $widget->id;
		$title = get_string('createwidget', 'tiny_widgethub');
		if (!empty($widget->key) && !empty($widget->name)) {
			$title = get_string('edit', 'tiny_widgethub') . ' ' . $widget->name;
		}
		// Page Settings for every widget
		$settings_page = new \admin_settingpage('tiny_widgethub_spage_' . $windx, $title, 'moodle/site:config', true);

		if ($windx > 0) {
			$settings_page->add(
				new \admin_setting_heading(
					'tiny_widgethub/heading_' . $windx,
					get_string('widget', 'tiny_widgethub') . ' ' . $windx,
					''
				)
			);
		}
		$settings_page->add(
			new hubpicker(
				'tiny_widgethub/hub_' . $windx,
				get_string('hub', 'tiny_widgethub'),
				get_string('hub_desc', 'tiny_widgethub'),
				$windx,
				$usedKeys,
				$partials
			)
		);
		$json_setting = new \admin_setting_configtextarea(
			'tiny_widgethub/def_' . $windx,
			get_string('def', 'tiny_widgethub'),
			get_string('def_desc', 'tiny_widgethub'),
			'',
			PARAM_RAW
		);
		$json_setting->set_updatedcallback(function () use ($windx) {
			plugininfo::update_widget_index($windx);
			// Redirect to the category page
			redirect(new \moodle_url('/admin/category.php', array('category' => 'tiny_widgethub')));
		});
		$settings_page->add($json_setting);
		return $settings_page;
	}

	/**
	 * It removes all the configuration of this plugin. Call this method when uninstalling it
	 */
	public static function remove_configuration_settings()
	{
		$settings = get_config('tiny_widgethub');
		foreach ($settings as $fieldkey => $fieldname) {
			unset_config($fieldkey, 'tiny_widgethub');
		}
	}
}
