/* eslint-disable no-restricted-globals */
/* global self, importScripts, postMessage */
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
import { disableWorkerAPIs } from "./worker_common.js";
import 'liquidjs/dist/liquid.browser.min.js';

// @ts-ignore
const engine = new self.liquidjs.Liquid(protoNullify({ cache: false }));
const _postMessage = self.postMessage;
disableWorkerAPIs();

self.onmessage = async function (e) {
    const data = e.data;
    const payload = data.payload || protoNullify({});
    try {
        const ctx = payload.ctx || protoNullify({});
        const result = await engine.parseAndRender(payload.template, ctx);
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
    type: !!engine ? 'worker_ready' : 'worker_error',
}));
