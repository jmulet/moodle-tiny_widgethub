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
import { protoNullify } from "./common_worker.js";
import { evalInContext } from "./common_worker.js";
import { disableWorkerAPIs } from "./common_worker.js";

disableWorkerAPIs();

const _postMessage = self.postMessage;

self.onmessage = function (e) {
    const data = e.data;
    const payload = data.payload || protoNullify({});
    const codes = Array.isArray(payload.code) ? payload.code : [payload.code];
    const results = codes.map((/** @type {string} */ code) => {
        const ctx = protoNullify(payload.ctx);
        try {
            return { returns: evalInContext(ctx, code, false), ctx };
        } catch (e) {
            console.error('Failed to evaluate code: ' + e);
            return { returns: undefined, ctx };
        }
    });
    _postMessage(protoNullify({
        requestId: data.requestId,
        result: results
    }));
};
_postMessage(protoNullify({
    type: typeof evalInContext === 'function' ? 'worker_ready' : 'worker_error',
}));
