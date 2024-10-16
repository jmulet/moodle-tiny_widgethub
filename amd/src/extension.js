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

/** @typedef {'onInit' | 'contentSet' | 'widgetInserted' | 'widgetRemoved' | 'ctxAction'} EventName */
/** @type {Map<string, ((editor: import('./plugin').TinyMCE, ...args: any[]) => void)[]>}> */
const _listeners = new Map();

/** @type {((ctx: import('./contextInit').ItemMenuContext) => import('./extension/contextactions').UserDefinedItem)[]} */
const _menuItems = [];
/**
 * @param {EventName} eventName
 * @param {(editor: import('./plugin').TinyMCE, ...args: any[]) => void} listener
 */
export function subscribe(eventName, listener) {
    let lst = _listeners.get(eventName);
    if (!lst) {
        lst = [];
        _listeners.set(eventName, lst);
    }
    lst.push(listener);
}

/**
 * @param {EventName} eventName
 * @returns {((editor: import('./plugin').TinyMCE, ...args: any[]) => void)[]}
 */
export function getListeners(eventName) {
    return _listeners.get(eventName) ?? [];
}

/**
 * @param {(ctx: import('./contextInit').ItemMenuContext) =>import('./extension/contextactions').UserDefinedItem} menuItem
 */
export function registerMenuItem(menuItem) {
    _menuItems.push(menuItem);
}
/**
 * @returns {((ctx: import('./contextInit').ItemMenuContext) => import('./extension/contextactions').UserDefinedItem)[]}
 */
export function getExtendedMenuItems() {
    return _menuItems;
}
