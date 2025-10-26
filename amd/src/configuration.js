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
import Common from './common';
import {addMenubarItem} from 'editor_tiny/utils';

const {component} = Common;

/**
 * @typedef {Object} Menu
 * @property {{items: string}} insert
 */
/**
 * @param {Menu} menu
 * @returns {Menu}
 */
const configureMenu = (menu) => {
    const items = menu.insert.items.split(' ');
    const inserted = items.some((item, index) => {
        // Append after the link button.
        if (RegExp(/(link)\b/).exec(item)) {
            items.splice(index + 1, 0, component);
            return true;
        }
        return false;
    });

    if (inserted) {
        menu.insert.items = items.join(' ');
    } else {
        addMenubarItem(menu, 'insert', component);
    }

    return menu;
};

/**
 * @typedef {Object} Section
 * @property {string} name
 * @property {string[]} items
 */
/**
 * @param {Section[]} toolbar
 * @returns {Section[]}
 */
const configureToolbar = (toolbar) => {
    // The toolbar contains an array of named sections.
    // The Moodle integration ensures that there is a section called 'content'.

    return toolbar.map((section) => {
        if (section.name === 'content') {
            // Insert the button at the start of it.
            section.items.unshift(component);
        }
        return section;
    });
};

/**
 *
 * @param {string} contextmenu
 * @returns {string}
 */
const configureContextMenu = (contextmenu) => {
    return contextmenu + ' ' + component;
};

/**
 *
 * @param {any} instanceConfig
 * @returns {any}
 */
export const configure = (instanceConfig) => {
    return {
        menu: configureMenu(instanceConfig.menu),
        toolbar: configureToolbar(instanceConfig.toolbar),
        contextmenu: configureContextMenu(instanceConfig.contextmenu)
    };
};
