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
 * @module      tiny_widgethub/workercommon
 * @copyright   2026 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { blacklist, protoNullify } from "./worker_common.js";
import { disableWorkerAPIs } from "./worker_common.js";
import './ejs.min.js';

const _postMessage = self.postMessage;
disableWorkerAPIs();
const validName = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

self.onmessage = function (e) {
    const data = e.data;
    const payload = data.payload || protoNullify({});
    try {
        const ctx = payload.ctx || protoNullify({});
        const keys = Object.keys(ctx).filter(key => validName.test(key));
        const extendedTemplate = '<% ' +
            blacklist.map(key => 'var ' + key + ' = null;').join('\n') +
            keys.map(key => 'var ' + key + ' = locals["' + key + '"];').join('\n')
            + '%>' + payload.template;
        //@ts-ignore
        const result = ejs.render(extendedTemplate, ctx, {
            strict: true,
            _with: false,
            context: null
        });
        _postMessage(protoNullify({
            requestId: data.requestId,
            result: result
        }));
    } catch (e) {
        console.error('Failed to render template: ' + e);
        _postMessage(protoNullify({
            requestId: data.requestId,
            error: 'Failed to render template: ' + e
        }));
    }
};
_postMessage(protoNullify({
    type: 'worker_ready',
}));
