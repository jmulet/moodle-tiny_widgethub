/* eslint-disable no-console */
/* eslint-disable max-len */
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
 * @module      tiny_widgethub/plugin
 * @copyright   2024 Josep Mulet Pol <pmulet@iedib.net>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {getPluginOptionName} from 'editor_tiny/options';
import {pluginName} from './common';
import {WidgetWrapper} from './util';

const showPlugin = getPluginOptionName(pluginName, 'showplugin');
const userId = getPluginOptionName(pluginName, 'userid');
const courseId = getPluginOptionName(pluginName, 'courseid');
const widgetList = getPluginOptionName(pluginName, 'widgetlist');

const shareStyles = getPluginOptionName(pluginName, 'sharestyles');
const additionalCss = getPluginOptionName(pluginName, 'additionalcss');
const addValidElements = getPluginOptionName(pluginName, 'addvalidelements');
const addCustomElements = getPluginOptionName(pluginName, 'addcustomelements');

export const register = (editor) => {
    const registerOption = editor.options.register;

    registerOption(showPlugin, {
        processor: 'boolean',
        "default": true,
    });

    registerOption(userId, {
        processor: 'string',
        "default": "-1",
    });

    registerOption(courseId, {
        processor: 'string',
        "default": "-1",
    });

    registerOption(widgetList, {
        processor: 'array',
        "default": [],
    });

    registerOption(shareStyles, {
        processor: 'boolean',
        "default": true,
    });

    registerOption(additionalCss, {
        processor: 'string',
        "default": "",
    });

    registerOption(addValidElements, {
        processor: 'string',
        "default": "",
    });

    registerOption(addCustomElements, {
        processor: 'string',
        "default": "",
    });

};


/**
 * @param {TinyMCE} editor
 * @returns {boolean} - are the plugin buttons visible?
 */
export const isPluginVisible = (editor) => editor.options.get(showPlugin);
/**
 * @param {TinyMCE} editor
 * @returns {number} - an integer with the id of the current user
 */
export const getUserId = (editor) => parseInt(editor.options.get(userId));
/**
 * @param {TinyMCE} editor
 * @returns {int} - an integer with the id of the current course
 */
export const getCourseId = (editor) => parseInt(editor.options.get(courseId));
/**
 * @param {TinyMCE} editor
 * @returns {string} - additional css that must be included in a <style> tag in editor's iframe
 */
export const getAdditionalCss = (editor) => editor.options.get(additionalCss);
/**
 * @param {TinyMCE} editor
 * @returns {string}
 */
export const getAddValidElements = (editor) => editor.options.get(addValidElements);
/**
 * @param {TinyMCE} editor
 * @returns {string}
 */
export const getAddCustomElements = (editor) => editor.options.get(addCustomElements);

let widgetDict = null;
/**
 * @param {TinyMCE} editor
 * @returns {WidgetWrapper[]} - a List of "usable" widgets for the current userId
 */
export const getWidgetDict = (editor) => {
    if (!widgetDict) {
        widgetDict = {};
        // The widgetList is of type object[]
        // partials is a special widget that is used to define common parameters shared by other widgets
        let widgets = editor.options.get(widgetList);
        let partials = widgets.filter(e => e.key === 'partials')[0];
        if (partials) {
            widgets = widgets.filter(e => e.key !== 'partials');
        }
        // Create a wrapper for the widget to handle operations
        const wrappedWidgets = widgets.map((snpt)=> new WidgetWrapper(snpt, partials || {}));
        // Remove those buttons that aren't usable for the current user
        const userId = getUserId(editor);
        wrappedWidgets.filter(snpt => snpt.isFor(userId)).forEach(snpt => {
            widgetDict[snpt.key] = snpt;
        });
    }
    return widgetDict;
};