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
 * @module      tiny_widgethub/sandbox
 * @copyright   2026 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Config from 'core/config';
import Templates from 'core/templates';
import { genID } from '../util';

/**
 * Sandbox service to run untrusted JavaScript code in a sandboxed iframe.
 * One iframe is created and multiple workers are created in it.
 * - Avoid accessing cookies, localStorage, fetch, etc.
 * - Avoid DOM access
 * - Avoid hanging the main thread
 * - Avoid conflicts and polluting Moodle page scope
 */
export default class Sandbox {
    /** @type {Map<string, { resolve: (value: any) => void, reject: (reason?: any) => void }>} */
    _tasks = new Map();
    /** @type {HTMLIFrameElement | null} */
    _iframe = null;
    /** @type {MessagePort | null} */
    _port2 = null;

    /** @type {Sandbox | null} */
    static _instance = null;

    /**
     * Gets the singleton instance of the sandbox service
     * @returns {Promise<Sandbox>} Sandbox instance
     */
    static async getInstance() {
        if (!Sandbox._instance) {
            Sandbox._instance = new Sandbox();
            await Sandbox._instance._createSandboxedIframe();
        }
        return Sandbox._instance;
    }

    /**
     * Handles messages from the iframe through a dedicated message channel
     * @param {MessageEvent} event
     */
    _onChannelMessage(event) {
        const { result, error, requestId } = event.data || {};
        const task = this._tasks.get(requestId);
        if (!requestId || !task) {
            console.error('Invalid sandbox request ID', requestId);
            return;
        }
        if (error) {
            task.reject(new Error(error));
        } else {
            task.resolve(result);
        }
        this._tasks.delete(requestId);
    }

    /**
     * Creates a sandboxed iframe ready to render templates
     * @returns {Promise<HTMLIFrameElement>} Iframe
     */
    async _createSandboxedIframe() {
        if (this._iframe) {
            return this._readyPromise ?? Promise.resolve(this._iframe);
        }
        const iframe = document.createElement('iframe');
        this._iframe = iframe;
        Object.assign(iframe, {
            referrerPolicy: 'no-referrer',
            sandbox: 'allow-scripts',
        });
        iframe.style.cssText = 'position:absolute; top:-9999em; left:-9999em; z-index:-1; width:0; height:0; border:none;';

        const moodleOrigin = window.location.origin;
        const html = await Templates.render('tiny_widgethub/sandbox', {
            wwwroot: Config.wwwroot,
            origin: moodleOrigin,
            jsrev: Config.jsrev || 1
        });
        const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
        iframe.src = url;

        this._readyPromise = new Promise((resolve, reject) => {
            const onPostMessage = (/** @type {MessageEvent} */ event) => {
                URL.revokeObjectURL(url);
                if (event.data?.type === `tiny_widgethub_sandbox_init` &&
                    event.source === iframe.contentWindow && event.origin === 'null') {

                    window.removeEventListener('message', onPostMessage);
                    this._onPostMessage = null;
                    if (event.data.status === 'ready') {
                        this._port2 = event.ports[0];
                        this._port2.onmessage = this._onChannelMessage.bind(this);
                        resolve(iframe);
                    } else {
                        iframe.src = 'about:blank';
                        iframe.remove();
                        reject(new Error(event.data.status));
                    }
                    this._readyPromise = null;
                }
            };
            this._onPostMessage = onPostMessage;
            window.addEventListener('message', onPostMessage);
        });
        document.body.appendChild(iframe);
        return this._readyPromise;
    }

    destroy() {
        this._tasks.clear();
        if (this._onPostMessage) {
            // Tear down the message listener
            window.removeEventListener('message', this._onPostMessage);
            this._onPostMessage = null;
        }
        if (this._port2) {
            // Tear down the communication channel
            this._port2.onmessage = null;
            this._port2.close();
            this._port2 = null;
        }
        if (this._iframe) {
            // Remove the iframe
            this._iframe.remove();
            this._iframe = null;
            this._readyPromise = null;
        }
    }

    /**
     * Executes a task in the sandboxed iframe
     * @param {string} type - ejs, mustache, eval
     * @param {Object} payload
     * @returns {Promise<any>} The result of the task execution
     */
    execute(type, payload = {}) {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            if (!this._port2) {
                reject(new Error('Sandbox not ready'));
                return;
            }
            const requestId = genID();
            this._tasks.set(requestId, { resolve, reject });
            this._port2.postMessage({
                type,
                payload,
                requestId
            });
        });
    }
}
