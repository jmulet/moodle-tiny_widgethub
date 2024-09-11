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

use context;
use editor_tiny\plugin;
use editor_tiny\plugin_with_buttons;
use editor_tiny\plugin_with_configuration;
use editor_tiny\plugin_with_menuitems;

/**
 * Tiny WidgetHub plugin version details.
 */
class plugininfo extends plugin implements
    plugin_with_buttons,
    plugin_with_menuitems,
    plugin_with_configuration
{

    /**
     * Get the editor buttons for this plugins
     *
     * @return array
     */
    public static function get_available_buttons(): array
    {
        return [
            'tiny_widgethub/widgethub',
        ];
    }
    /**
     * Get the dropdown menu items for this plugin
     *
     * @return array
     */
    public static function get_available_menuitems(): array
    {
        return [
            'tiny_widgethub/widgethub',
        ];
    }

    /**
     * Get the configuration for the plugin, capabilities and
     * config (from settings.php)
     *
     * @param context $context
     * @param array $options
     * @param array $fpoptions
     * @param \editor_tiny\editor|null $editor
     * @return void
     *
     * @return array
     */
    public static function get_plugin_configuration_for_context(
        context $context,
        array $options,
        array $fpoptions,
        ?\editor_tiny\editor $editor = null
    ): array {

        global $USER, $COURSE;

        // Obtain the configuration options for the plugin from the config table
        $conf = get_config('tiny_widgethub');

        //Decide if to enable the plugin
        $showplugin = true;
        if (!has_capability('tiny/widgethub:viewplugin', $context)) {
            $showplugin = false;
        }

        $params = [
            'showplugin' => $showplugin
        ];

        if ($showplugin) {
            $widgetIndex = self::get_widget_index($conf);
            $widgetList = self::get_widget_list($conf, $widgetIndex);

            $params['userid'] = $USER->id;
            $params['courseid'] = $COURSE->id;
            $params['widgetlist'] = $widgetList;
            // configuration
            $params['sharecss'] = $conf->sharecss;
            $params['additionalcss'] = $conf->additionalcss;
        }
        return $params;
    }

    /**
     * Get the index of the widgets
     * Load the property in which the index of the widgets is stored
     * {1: {key: 'WD1', name: 'Name1'}, 5: {key: 'WD2', name: 'Name2'}, ...]
     *
     * @param object $conf
     * @return array
     */
    public static function get_widget_index($conf): array
    {
        $widgetIndex = []; // associative array
        if (isset($conf->index)) {
            $widgetIndex = json_decode($conf->index, true);
            if ($widgetIndex == null) {
                $widgetIndex = [];
            }
        }
        unset($widgetIndex[0]); // remove the temporal entry
        return $widgetIndex;
    }

    /**
     * The entry id has changed, update the index
     * @param int $id
     */
    public static function update_widget_index($id)
    {
        $conf = get_config('tiny_widgethub');
        $widgetIndex = self::get_widget_index($conf);
        $widget = null;
        if (isset($conf->{'def_' . $id})) {
            $widget = json_decode($conf->{'def_' . $id}, false);
        }
        if ($widget == null || !is_object($widget)) {
            // Remove the widget from the index
            unset($widgetIndex[$id]);
        } elseif (empty($widget->key) && empty($widget->name)) {
            // Remove the widget from the index and also the definition
            unset($widgetIndex[$id]);
            unset_config('def_' . $id, 'tiny_widgethub');
        } elseif ($id == 0) {
            // Add the temporal entry to a definitive widget index
            $tmpWidget = json_decode($conf->def_0);
            if (!empty($tmpWidget)) {
                $id = self::update_seq($conf);
                // Add the widget to the index
                $widgetIndex[$id] = [
                    'key' => $tmpWidget->key,
                    'name' => $tmpWidget->name
                ];
                set_config('def_' . $id, $conf->def_0, 'tiny_widgethub');
                // Remove the temporal widget
                unset_config('def_0', 'tiny_widgethub');
            }
        } else {
            // Update its key and name
            $widgetIndex[$id] = [
                'key' => $widget->key,
                'name' => $widget->name
            ];
        }
        set_config('index', json_encode($widgetIndex), 'tiny_widgethub');
    }

    /**
     * Get the list of widgets
     *
     * @param object $conf
     * @param array $widgetIndex (optional)
     * @return array
     */
    public static function get_widget_list($conf, $widgetIndex): array
    {
        if (!isset($widgetIndex)) {
            $widgetIndex = self::get_widget_index($conf);
        }
        $widgetList = [];
        foreach (array_keys($widgetIndex) as $id) {
            $definition = $conf->{'def_' . $id};
            if (empty($definition)) {
                continue;
            }
            $json = json_decode($definition, false);
            if (!isset($json)) {
                continue;
            }
            // Also include the internal widget id
            $json->id = $id;
            $widgetList[] = $json;
        }
        return $widgetList;
    }

    /**
     * Searches the index for a widget with key named partials
     * @param object $conf
     * @param array $widgetIndex (optional)
     * @return object | null if not found
     */
    public static function get_partials($conf, $widgetIndex): ?object
    {
        if (!isset($widgetIndex)) {
            $widgetIndex = self::get_widget_index($conf);
        }
        $indexId = array_column($widgetIndex, null, 'key')['partials'] ?? false;
        $partials = null;
        if ($indexId) {
            $definition = $conf->{'def_' . $indexId};
            if (!empty($definition)) {
                $partials = json_decode($definition, false);
                if (isset($partials)) {
                    // Also include the internal widget id
                    $partials->id = $indexId;
                }
            }
        }
        return $partials;
    }

    /**
     * Increments the sequence number and returns it
     * @param object $conf
     * @return int
     */
    private static function update_seq($conf)
    {
        $seq = 0;
        if (isset($conf->seq)) {
            $seq = $conf->seq;
        }
        $seq++;
        set_config('seq', $seq, 'tiny_widgethub');
        return $seq;
    }
}
