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
 * @copyright   2024 Josep Mulet Pol <pmulet@iedib.net>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {getButtonImage} from 'editor_tiny/utils';
import {get_string as getString} from 'core/str';
import {UiPickCtrl} from './uiPick';
import {
    component,
    icon,
} from './common';

import {isPluginVisible} from './options';

class WidgetPlugin {
    editor;
    _pickCtrl;
    constructor(editor) {
        this.editor = editor;
    }
    get pickCtrl() {
        if (!this._pickCtrl) {
            this._pickCtrl = new UiPickCtrl(this);
        }
        return this._pickCtrl;
    }
}

export const getSetup = async() => {
    const [
        widgetNameTitle,
        buttonImage,
    ] = await Promise.all([
        getString('settings', component),
        getButtonImage('icon', component),
    ]);

    return (editor) => {

        // eslint-disable-next-line no-console
        console.log(editor, isPluginVisible(editor));

        const widgetPlugin = new WidgetPlugin(editor);

        if (isPluginVisible(editor)) {
            // Register the Icon.
            editor.ui.registry.addIcon(icon, buttonImage.html);

            // Register the Toolbar Button.
            editor.ui.registry.addButton(component, {
                icon,
                tooltip: widgetNameTitle,
                onAction: () => widgetPlugin.pickCtrl.handleAction(),
            });

            // Add the Menu Item.
            // This allows it to be added to a standard menu, or a context menu.
            editor.ui.registry.addMenuItem(component, {
                icon,
                text: widgetNameTitle,
                onAction: () => widgetPlugin.pickCtrl.handleAction(),
            });
        }
    };
};
