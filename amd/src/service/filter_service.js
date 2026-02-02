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

import Config from '../common';
import { get_strings } from 'core/str';
import { RemoteDom } from './sandbox';
const { component } = Config;

/**
 * @typedef {{get_strings: (keys: {key: string, component: string}[]) => Promise<string[]>}} CoreStr
 */

export class FilterSrv {
    /**
     * @param {import('../plugin').TinyMCE} editor
     * @param {CoreStr} coreStr
     */
    constructor(editor, coreStr) {
        this.editor = editor;
        this.coreStr = coreStr;
    }
    /**
     * @param {{name: string, code: string, opts: Object}[]} filters
     * @param {boolean} silent
     * @returns {Promise<boolean>} - True if the filter can be compiled
     */
    async applyWidgetFilter(filters, silent) {
        const translations = await this.coreStr.get_strings([
            { key: 'filterres', component },
            { key: 'nochanges', component }
        ]);
        const remoteDom = await RemoteDom.getInstance();
        const html = this.editor.getContent();
        const response = await remoteDom.applyWidgetFilters(html, filters);

        if (response.error) {
            this.editor.notificationManager.open({
                text: translations[0] + ": " + response.error,
                type: 'danger',
                timeout: 4000
            });
            return false;
        }
        if (response.hasChanges) {
            this.editor.setContent(response.html);
            this.editor.undoManager.add();
            if (!silent) {
                this.editor.notificationManager.open({
                    text: translations[0] + ". " + response.msg,
                    type: 'success',
                    timeout: 5000
                });
            }
        } else if (!silent) {
            this.editor.notificationManager.open({
                text: translations[1],
                type: 'info',
                timeout: 5000
            });
        }
        return true;
    }
}

const _instances = new Map();
/**
 * @param {import('../plugin').TinyMCE} editor
 */
export function getFilterSrv(editor) {
    if (!_instances.has(editor)) {
        _instances.set(editor, new FilterSrv(editor, { get_strings }));
    }
    return _instances.get(editor);
}
