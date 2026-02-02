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
export class Sandbox {
    /** @type {Map<string, { resolve: (value: any) => void, reject: (reason?: any) => void, timeout: number }>} */
    _tasks = new Map();
    /** @type {HTMLIFrameElement | null} */
    _iframe = null;
    /** @type {MessagePort | null} */
    _port2 = null;

    /** @type {Sandbox | null} */
    static _instance = null;

    /** @type {number} */
    static EXECUTE_TIMEOUT = 6000;

    /**
     * Gets the singleton instance of the sandbox service
     * @returns {Promise<Sandbox>} Sandbox instance
     */
    static async getInstance() {
        if (!Sandbox._instance) {
            Sandbox._instance = new Sandbox('sandbox');
            await Sandbox._instance._createSandboxedIframe();
        }
        return Sandbox._instance;
    }

    /**
     * Creates a new sandbox instance
     * @param {string} initEventName - The name of the event to use for initialization
     */
    constructor(initEventName) {
        this.initEventName = initEventName;
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
        window.clearTimeout(task.timeout);
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
        const html = await Templates.render(`tiny_widgethub/${this.initEventName}`, {
            wwwroot: Config.wwwroot,
            origin: moodleOrigin,
            jsrev: Config.jsrev || 1
        });
        const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
        iframe.src = url;

        this._readyPromise = new Promise((resolve, reject) => {
            const onPostMessage = (/** @type {MessageEvent} */ event) => {
                URL.revokeObjectURL(url);
                if (event.data?.type === `tiny_widgethub_${this.initEventName}_init` &&
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
            const timeout = window.setTimeout(() => {
                this._tasks.delete(requestId);
                reject(new Error('Sandbox timeout'));
            }, Sandbox.EXECUTE_TIMEOUT);
            this._tasks.set(requestId, { resolve, reject, timeout });
            this._port2.postMessage({
                type,
                payload,
                requestId
            });
        });
    }
}

/**
 * @typedef {Object} Patch
 * @property {string} vid
 * @property {string} type
 * @property {boolean} isDeleted
 * @property {string} name
 * @property {string} value
 * @property {Array<VNode>} [nodes]
 */

export class RemoteDom extends Sandbox {
    /** @type {RemoteDom | null} */
    static _instance = null;

    /** @type {number} */
    static vdomNodeCounter = 0;

    /**
     * Gets the singleton instance of the sandbox service
     * @returns {Promise<RemoteDom>} Sandbox instance
     */
    static async getInstance() {
        if (!RemoteDom._instance) {
            RemoteDom._instance = new RemoteDom('remotedom');
            await RemoteDom._instance._createSandboxedIframe();
        }
        return RemoteDom._instance;
    }

    /**
     * Creates a new instance of the sandbox service
     * @param {string} initEventName - The name of the event to listen for
     */
    constructor(initEventName) {
        super(initEventName);
        /** @type {Map<string, Element>} */
        this.vdomInstances = new Map();
    }

    /**
     * @typedef {[string, Record<string,string>, Array<VNode | string>]} VNode
     */

    /**
     * Adds data-rvn-id to each node in the DOM
     *
     * @param {Node} elem The node to add data-rvn-id to
     */
    _addVIds(elem) {
        if (!elem) {
            return;
        }
        // Handle Element Nodes (nodeType 1)
        if (elem.nodeType === 1) {
            const element = /** @type {Element} */ (elem);
            if (!element.hasAttribute('data-rvn-id')) {
                element.setAttribute('data-rvn-id', 'l' + RemoteDom.vdomNodeCounter++);
            }
            /** @type {Array<VNode|string>} */
            for (var i = 0; i < element.childNodes.length; i++) {
                this._addVIds(element.childNodes[i]);
            }
        }
    }
    /**
     * Creates a remote DOM in the sandboxed iframe
     * @param {Element} rootElement - The root element to create the remote DOM from
     * @returns {Promise<string>} The ID of the remote DOM
     */
    async createRemoteDom(rootElement) {
        // Adds data-rvn-id to each node in the DOM
        this._addVIds(rootElement);
        const response = await this.execute('vdom:create', { html: rootElement.outerHTML });
        this.vdomInstances.set(response.vid, rootElement);
        return response.vid;
    }

    /**
     * Applies a set of filter functions to the passed html content
     * @param {string} html - The html content to filter
     * @param {Array<{name: string, code: string, opts: Object}>} filters - The filter functions to apply
     * @returns {Promise<{html: string, hasChanges: boolean, msg: string, error: string}>} The filtered html content
     */
    async applyWidgetFilters(html, filters) {
        return this.execute('vdom:filter', { html, filters });
    }

    /**
     * Executes code on a remote DOM in the sandboxed iframe
     * @param {{
     *     vid: string,
     *     name: string,
     *     type: string,
     *     instructions: string | {name: string, args: Array<any>},
     *     useJQuery: boolean
     * }} payload
     * @returns {Promise<{
     *     name: string,
     *     value: any
     * }>} The result of the code execution
     */
    async queryOnRemoteDom(payload) {
        const response = await this.execute('vdom:query', payload);
        if (response.error) {
            throw new Error(response.error);
        }
        return {
            name: payload.name,
            value: response.result
        };
    }

    /**
     * Updates a value on a remote DOM in the sandboxed iframe
     * @param {{
     *     vid: string,
     *     name: string,
     *     value: any,
     *     instructions: string | {name: string, args: Array<any>},
     *     useJQuery: boolean
     * }} payload
     * @returns {Promise<any>} The result of the code execution
     */
    async updateRemoteDomValue(payload) {
        return this.execute('vdom:update', payload);
    }

    /**
     * Gets the patches to update a local DOM
     * @param {string} vid - The ID of the remote DOM
     * @returns {Promise<void>} The result of the code execution
     */
    async applyPatches(vid) {
        const response = await this.execute('vdom:getpatches', { vid });
        if (response.error) {
            throw new Error(response.error);
        }
        /** @type {Array<Patch>} */
        const patches = response.patches;
        // Apply patches to local DOM
        const rootElement = this.vdomInstances.get(vid);
        if (!rootElement) {
            throw new Error('Remote DOM not found');
        }
        console.log('patches', patches, ' to ', rootElement);
        patches.forEach(patch => {
            this._applyMutation(rootElement, patch);
        });
    }

    /**
     * Deserializes a VNode into a DOM Node
     * @param {VNode | string | null} vNode
     * @returns {Node | null}
     */
    _deserializeVNode(vNode) {
        if (vNode === null) {
            return null;
        }
        if (typeof vNode === 'string') {
            return document.createTextNode(vNode);
        }
        if (Array.isArray(vNode)) {
            const [tag, attrs, children] = vNode;
            const element = document.createElement(tag);
            for (const [key, value] of Object.entries(attrs)) {
                element.setAttribute(key, value);
            }
            children.forEach(childVNode => {
                const childNode = this._deserializeVNode(childVNode);
                if (childNode) {
                    element.appendChild(childNode);
                }
            });
            return element;
        }
        return null;
    }

    /**
     * Applies a mutation to a local DOM
     * @param {Element} rootElement - The root element of the local DOM
     * @param {Patch} patch - The patch to apply
     */
    _applyMutation(rootElement, patch) {
        let node;
        if (rootElement.getAttribute('data-rvn-id') === patch.vid) {
            node = rootElement;
        } else {
            node = rootElement.querySelector(`[data-rvn-id="${patch.vid}"]`);
        }
        if (!node) {
            console.log('Apply mutation: Node not found', patch.vid);
            return;
        }

        if (patch.type === 'attributes') {
            if (patch.isDeleted || patch.value === undefined) {
                node.removeAttribute(patch.name);
            } else if (patch.name === 'class') {
                node.className = patch.value;
            } else if (patch.name === 'style') {
                // @ts-ignore
                node.style.cssText = patch.value;
            } else {
                node.setAttribute(patch.name, patch.value);
            }
        } else if (patch.type === 'text') {
            node.textContent = patch.value;
        } else if (patch.type === 'nodes') {
            // Smart reconciliation of children
            const existingChildren = new Map();
            const currentChildren = Array.from(node.childNodes);
            currentChildren.forEach(child => {
                if (child.nodeType === 1 && /** @type {Element} */ (child).hasAttribute('data-rvn-id')) {
                    existingChildren.set(/** @type {Element} */(child).getAttribute('data-rvn-id'), child);
                }
            });
            /** @type {Node[]} */
            const newChildren = [];
            patch.nodes?.forEach(vNode => {
                let childNode;
                // Check if it is a reference to an existing node { vId: '...' }
                // @ts-ignore
                if (vNode && typeof vNode === 'object' && vNode.vId) {
                    // @ts-ignore
                    childNode = existingChildren.get(vNode.vId);
                    if (!childNode) {
                        // Should not happen if protocol is correct, but fallback or error
                        console.warn('Node reconciliation: Referenced node not found', vNode);
                    }
                } else {
                    // It's a new node definition (string or VNode array)
                    childNode = this._deserializeVNode(vNode);
                }

                if (childNode) {
                    newChildren.push(childNode);
                    node.appendChild(childNode); // Moves it to the end, effectively sorting them
                }
            });

            // Remove children that are not in the new list
            currentChildren.forEach(child => {
                if (!newChildren.includes(child)) {
                    child.remove();
                }
            });
        }
    }

    /**
     * Destroys a remote DOM in the sandboxed iframe
     * @param {string} vid - The ID of the remote DOM
     * @returns {Promise<void>} The result of the code execution
     */
    destroyRemoteDom(vid) {
        // Remove all attributes with data-rvn-id
        const rootElement = this.vdomInstances.get(vid);
        if (rootElement) {
            const nodes = rootElement.querySelectorAll(`[data-rvn-id]`);
            nodes.forEach(node => node.removeAttribute('data-rvn-id'));
        }
        this.vdomInstances.delete(vid);
        return this.execute('vdom:destroy', { vid });
    }
}
