/* eslint-disable no-console */
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

import {getButtonImage} from 'editor_tiny/utils';
import {get_string as getString} from 'core/str';
import {UiPickCtrl} from './uiPick';
import Common from './common';

import {isPluginVisible} from './options';

export class WidgetPlugin {
    editor;
    /** @type {UiPickCtrl | undefined} **/
    #pickCtrl;
    /**
     * @param {import('./plugin').TinyMCE} editor
     */
    constructor(editor) {
        this.editor = editor;
    }
    get pickCtrl() {
        if (!this.#pickCtrl) {
            this.#pickCtrl = new UiPickCtrl(this);
        }
        return this.#pickCtrl;
    }
}

export const getSetup = async() => {
    const [
        widgetNameTitle,
        buttonImage,
    ] = await Promise.all([
        // @ts-ignore
        getString('settings', Common.component),
        getButtonImage('icon', Common.component),
    ]);
    /** @param {import('./plugin').TinyMCE} editor */
    return (editor) => {
        const widgetPlugin = new WidgetPlugin(editor);

        if (isPluginVisible(editor)) {
            // Register the Icon.
            editor.ui.registry.addIcon(Common.icon, buttonImage.html);

            // Register the Toolbar Button.
            editor.ui.registry.addButton(Common.component, {
                icon: Common.icon,
                tooltip: widgetNameTitle,
                onAction: () => widgetPlugin.pickCtrl.handleAction(),
            });

            // Add the Menu Item.
            // This allows it to be added to a standard menu, or a context menu.
            editor.ui.registry.addMenuItem(Common.component, {
                icon: Common.icon,
                text: widgetNameTitle,
                onAction: () => widgetPlugin.pickCtrl.handleAction(),
            });
        }
    };
};
