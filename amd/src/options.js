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
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {getPluginOptionName} from 'editor_tiny/options';
import Common from './common';
import {WidgetWrapper} from './util';
const pluginName = Common.pluginName;

const showPlugin = getPluginOptionName(pluginName, 'showplugin');
const userId = getPluginOptionName(pluginName, 'userid');
const courseId = getPluginOptionName(pluginName, 'courseid');
const widgetList = getPluginOptionName(pluginName, 'widgetlist');

const shareStyles = getPluginOptionName(pluginName, 'sharestyles');
const additionalCss = getPluginOptionName(pluginName, 'additionalcss');

/**
 * @param {import('./plugin').TinyMCE} editor
 */
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
};

/**
 * @param {import('./plugin').TinyMCE} editor
 * @returns {boolean} - are the plugin buttons visible?
 */
export const isPluginVisible = (editor) => editor.options.get(showPlugin);

export class EditorOptions {
    /** @type {Record<string, WidgetWrapper> | undefined} */
    _widgetDict;

    /**
     * @param {import('./container').DIContainer} container
     */
    constructor({editor}) {
        this.editor = editor;
    }

    /**
     * @returns {boolean}
     */
    get pluginVisible() {
        return this.editor.options.get(showPlugin);
    }

    /**
     * @returns {number} - an integer with the id of the current user
     */
    get userId() {
        return parseInt(this.editor.options.get(userId));
    }

    /**
     * @returns {number} - an integer with the id of the current course
     */
    get courseId() {
        return parseInt(this.editor.options.get(courseId));
    }

    /**
     * @returns {string} - additional css that must be included in a <style> tag in editor's iframe
     */
    get additionalCss() {
        return this.editor.options.get(additionalCss);
    }

    /**
     * @returns {Object.<string,WidgetWrapper>} - a dictionary of "usable" widgets for the current userId
     */
    get widgetDict() {
        if (!this._widgetDict) {
            this._widgetDict = {};
            // The widgetList is of type object[]
            // partials is a special widget that is used to define common parameters shared by other widgets
            /** @type {import('./util').Widget[]} */
            let widgets = this.editor.options.get(widgetList);
            let partials = widgets.filter(e => e.key === 'partials')[0];
            if (partials) {
                widgets = widgets.filter(e => e.key !== 'partials');
            }
            // Create a wrapper for the widget to handle operations
            const wrappedWidgets = widgets
                .map(w => new WidgetWrapper(w, partials || {}));
            // Remove those buttons that aren't usable for the current user
            wrappedWidgets.filter(w => w.isFor(this.userId)).forEach(w => {
                if (this._widgetDict) {
                    this._widgetDict[w.key] = w;
                }
            });
        }
        return this._widgetDict;
    }
}
