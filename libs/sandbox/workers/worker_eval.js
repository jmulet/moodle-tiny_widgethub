/* global self, postMessage */
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
import { protoNullify } from "./worker_common.js";
import { evalInContext } from "./worker_common.js";
import { disableWorkerAPIs } from "./worker_common.js";

disableWorkerAPIs();

const _postMessage = self.postMessage;

self.onmessage = function (e) {
    const data = e.data;
    const payload = data.payload || protoNullify({});
    try {
        const result = evalInContext(payload.ctx, payload.code, false);
        _postMessage(protoNullify({
            requestId: data.requestId,
            result: {
                returns: result,
                ctx: payload.ctx
            }
        }));
    } catch (e) {
        console.error('Failed to evaluate code: ' + e);
        _postMessage(protoNullify({
            requestId: data.requestId,
            error: 'Failed to evaluate code: ' + e
        }));
    }
};
_postMessage(protoNullify({
    type: typeof evalInContext === 'function' ? 'worker_ready' : 'worker_error',
}));
