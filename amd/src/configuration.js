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

import {component as buttonName} from './common';
import {addMenubarItem} from 'editor_tiny/utils';

const configureMenu = (menu) => {
    const items = menu.insert.items.split(' ');
    const inserted = items.some((item, index) => {
        // Append after the link button.
        if (item.match(/(link)\b/)) {
            items.splice(index + 1, 0, buttonName);
            return true;
        }
        return false;
    });

    if (inserted) {
        menu.insert.items = items.join(' ');
    } else {
        addMenubarItem(menu, 'insert', buttonName);
    }

    return menu;
};

const configureToolbar = (toolbar) => {
    // The toolbar contains an array of named sections.
    // The Moodle integration ensures that there is a section called 'content'.

    return toolbar.map((section) => {
        if (section.name === 'content') {
            // Insert the button at the start of it.
            section.items.unshift(buttonName);
        }
        return section;
    });
};

export const configure = (instanceConfig) => {
    return {
        menu: configureMenu(instanceConfig.menu),
        toolbar: configureToolbar(instanceConfig.toolbar),
    };
};
