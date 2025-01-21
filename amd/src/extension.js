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
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * @typedef {{type: string, text: string, icon?: string, onAction: (api?: *) => void}} MenuItem
 * @typedef {{name: string, title: string, condition?: string | RegExp | (() => boolean), icon?: string, onAction?: ()=> void, subMenuItems?: () => (string | MenuItem[])}} UserDefinedItem
 * @typedef {(ctx: import('./contextinit').ItemMenuContext) => UserDefinedItem[]} Provider
 * @typedef {'onInit' | 'contentSet' | 'widgetInserted' | 'widgetRemoved' | 'ctxAction'} EventName
 **/

/** @type {Map<string, ((editor: import('./plugin').TinyMCE, ...args: any[]) => void)[]>}> */
const _listeners = new Map();

/** @type {Provider[]} */
const _menuItemProviders = [];

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
 * @param {Provider} provider
 */
export function registerMenuItemProvider(provider) {
    _menuItemProviders.push(provider);
}

/**
 * @returns {Provider[]}
 */
export function getMenuItemProviders() {
    return _menuItemProviders;
}
