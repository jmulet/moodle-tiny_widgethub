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
 * Generates a random request ID
 * @returns {string} Request ID
 */
function genRequestId() {
    if (typeof window.crypto?.randomUUID === "function") {
        return window.crypto.randomUUID();
    }
    return genID();
}

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
            const inst = new Sandbox('render_sandbox');
            Sandbox._instance = inst;
            try {
                await inst._createSandboxedIframe();
            } catch (e) {
                Sandbox._instance = null;
                throw e;
            }
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
        const data = event.data || {};
        const task = this._tasks.get(data.requestId);
        if (!data.requestId || !task) {
            console.error('Invalid sandbox request ID', data.requestId);
            return;
        }
        window.clearTimeout(task.timeout);
        if (data.error) {
            task.reject(new Error(data.error));
        } else {
            task.resolve(data);
        }
        this._tasks.delete(data.requestId);
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
        iframe.setAttribute('referrerpolicy', 'no-referrer');
        iframe.setAttribute('sandbox', 'allow-scripts');
        iframe.style.cssText = 'position:absolute; top:-9999em; left:-9999em; z-index:-1; width:0; height:0; border:none;';

        let url = '';
        this._readyPromise = new Promise((/** @type {*} */ resolve, /** @type {*} */ reject) => {
            const onPostMessage = (/** @type {MessageEvent} */ event) => {
                if (event.data?.type !== `tiny_widgethub_${this.initEventName}_init` ||
                    event.source !== iframe.contentWindow || event.origin !== 'null') {
                    return;
                }
                URL.revokeObjectURL(url);
                window.removeEventListener('message', onPostMessage);
                this._onPostMessage = null;
                if (event.data.status === 'ready') {
                    this._port2 = event.ports[0];
                    this._port2.onmessage = this._onChannelMessage.bind(this);
                    this._readyPromise = null;
                    resolve(iframe);
                } else {
                    iframe.src = 'about:blank';
                    iframe.remove();
                    this._readyPromise = null;
                    reject(new Error(event.data.status));
                }
            };
            this._onPostMessage = onPostMessage;
            window.addEventListener('message', onPostMessage);
        });

        const moodleOrigin = window.location.origin;
        const html = await Templates.render(`tiny_widgethub/${this.initEventName}`, {
            wwwroot: Config.wwwroot,
            origin: moodleOrigin,
            jsrev: Config.jsrev || 1,
            lang: document.documentElement.lang || 'en'
        });
        url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
        iframe.src = url;
        document.body.appendChild(iframe);
        return this._readyPromise;
    }

    destroy() {
        // Reject and clear all pending tasks before tearing down.
        this._tasks.forEach(task => {
            window.clearTimeout(task.timeout);
            task.reject(new Error('Sandbox destroyed'));
        });
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
        // Reset the singleton so getInstance() can create a fresh sandbox.
        if (this instanceof RemoteDom) {
            RemoteDom._instance = null;
        } else {
            Sandbox._instance = null;
        }
    }

    /**
     * Executes a task in the sandboxed iframe
     * @param {string} type - ejs, mustache, eval
     * @param {Object} payload
     * @returns {Promise<any>} The result of the task execution
     */
    async execute(type, payload = {}) {
        // If we are currently initializing, wait for that process to finish.
        if (this._readyPromise) {
            await this._readyPromise;
        }
        if (!this._port2) {
            throw new Error('!!Sandbox not ready');
        }
        return new Promise((resolve, reject) => {
            const requestId = genRequestId();
            const timeout = window.setTimeout(() => {
                this._tasks.delete(requestId);
                reject(new Error('Sandbox timeout'));
            }, Sandbox.EXECUTE_TIMEOUT);
            this._tasks.set(requestId, { resolve, reject, timeout });
            this._port2?.postMessage({
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
 * @property {Array<string>} [clsRemoved]
 * @property {Array<string>} [clsAdded]
 * @property {Array<string>} [styleRemoved]
 * @property {Array<[string, string]>} [styleAdded]
 * @property {Array<VNode>} [nodes]
 * @property {number} [textNodeIndex] - Child index of the text node for 'text' patches.
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
            const inst = new RemoteDom('dom_sandbox');
            RemoteDom._instance = inst;
            try {
                await inst._createSandboxedIframe();
            } catch (e) {
                RemoteDom._instance = null;
                throw e;
            }
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
     * @typedef {[string, Record<string,string>, VNode[]]} VNodeElement
     * @typedef {{vId: string} | string | VNodeElement} VNode
     */

    /**
     * Adds data-rvn-id to each node in the DOM
     *
     * @param {Node} elem The node to add data-rvn-id to
     * @param {number} depth Recursion depth limit
     */
    _addVIds(elem, depth = 0) {
        if (!elem || depth > 512) {
            return;
        }
        // Handle Element Nodes (nodeType 1)
        if (elem.nodeType === 1) {
            const element = /** @type {Element} */ (elem);
            if (!element.hasAttribute('data-rvn-id')) {
                element.setAttribute('data-rvn-id', 'l' + RemoteDom.vdomNodeCounter++);
            }
            /** @type {Array<VNode|string>} */
            for (let i = 0; i < element.childNodes.length; i++) {
                this._addVIds(element.childNodes[i], depth + 1);
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
     *     rvnid: string,
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
     * vid --> Remote document id
     * rvnid --> Remote node id
     * @param {{
     *     vid: string,
     *     rvnid: string,
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
        patches.forEach(patch => {
            this._applyMutation(rootElement, patch);
        });
    }

    /**
     * Checks if a tag is safe to be created in the host DOM.
     * @param {string} tag
     * @returns {boolean}
     */
    _isSafeTag(tag) {
        const forbiddenTags = [
            'script', 'style', 'object', 'embed', 'link', 'meta', 'base',
            'form', 'textarea', 'svg', 'math', 'iframe', 'frame', 'applet'
        ];
        return !forbiddenTags.includes(tag.toLowerCase());
    }

    /**
     * Checks if an attribute is safe to be applied to the host DOM.
     * @param {string} name
     * @param {string} value
     * @returns {boolean}
     */
    /**
     * Checks if a string contains dangerous protocols like javascript:
     * @param {string} value
     * @returns {boolean}
     */
    _hasDangerousProtocol(value) {
        if (typeof value !== 'string') {
            return false;
        }
        // eslint-disable-next-line no-control-regex
        const sanitizedValue = value.replace(/[\x00-\x20\s]/g, '').toLowerCase();
        // Block javascript:, vbscript:, and any data: that isn't a safe image type.
        if (sanitizedValue.includes('javas' + 'cript:') ||
            sanitizedValue.includes('vbsc' + 'ript:') ||
            sanitizedValue.includes('data:text/html') ||
            sanitizedValue.includes('data:text/javascript')) {
            return true;
        }
        // General check for data: protocols if they don't look like safe images.
        if (sanitizedValue.includes('data:') && !sanitizedValue.match(/data:image\/(png|jpeg|gif|webp);/)) {
            return true;
        }
        return false;
    }

    /**
     * Checks if an attribute is safe to be applied to the host DOM.
     * @param {string} name
     * @param {string} value
     * @returns {boolean}
     */
    _isSafeAttribute(name, value) {
        if (!name || typeof name !== 'string') {
            return false;
        }
        const lowerName = name.toLowerCase().trim();
        // Forbid event handlers, form-related hijacking attributes, and srcdoc.
        // Also forbid id and our internal data-rvn-id to avoid hijacking.
        if (lowerName.startsWith('on') ||
            lowerName.startsWith('form') ||
            lowerName === 'srcdoc' ||
            lowerName === 'id' ||
            lowerName === 'data-rvn-id') {
            return false;
        }
        return !this._hasDangerousProtocol(value);
    }

    /**
     * Checks if a style property is safe to be applied.
     * @param {string} name
     * @param {string} value
     * @returns {boolean}
     */
    _isSafeStyle(name, value) {
        if (!name || typeof name !== 'string') {
            return false;
        }
        // CSS specific dangerous patterns (e.g. IE expressions or Firefox bindings)
        const lowerValue = (value || '').toLowerCase();
        if (lowerValue.includes('expression(') ||
            lowerValue.includes('-moz-binding') ||
            lowerValue.includes('@import')) {
            return false;
        }
        return !this._hasDangerousProtocol(value);
    }

    /**
     * Deserializes a VNode into a DOM Node
     * @param {VNode | string | null} vNode
     * @param {number} depth Recursion depth limit
     * @returns {Node | null}
     */
    _deserializeVNode(vNode, depth = 0) {
        if (vNode === null || depth > 512) {
            return null;
        }
        if (typeof vNode === 'string') {
            return document.createTextNode(vNode);
        }
        if (Array.isArray(vNode)) {
            const [tag, attrs, children] = vNode;
            if (!this._isSafeTag(tag)) {
                console.warn('Insecure tag ignored', tag);
                return null;
            }
            const element = document.createElement(tag);
            for (const [key, value] of Object.entries(attrs)) {
                if (this._isSafeAttribute(key, value)) {
                    element.setAttribute(key, value);
                }
            }
            children.forEach(childVNode => {
                const childNode = this._deserializeVNode(childVNode, depth + 1);
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
            node = rootElement.querySelector(`[data-rvn-id="${CSS.escape(patch.vid || '')}"]`);
        }
        if (!node) {
            console.warn('Apply mutation: Node not found', patch.vid);
            return;
        }

        if (patch.type === 'attributes') {
            if (!this._isSafeAttribute(patch.name, patch.value)) {
                console.warn('Insecure attribute ignored', patch.name);
                return;
            }
            if (patch.isDeleted || patch.value === undefined) {
                node.removeAttribute(patch.name);
            } else if (patch.name === 'class') {
                if (patch.clsRemoved && patch.clsAdded) {
                    if (patch.clsRemoved.length > 0) {
                        node.classList.remove(...patch.clsRemoved);
                    }
                    if (patch.clsAdded.length > 0) {
                        node.classList.add(...patch.clsAdded);
                    }
                } else {
                    node.className = patch.value;
                }
            } else if (patch.name === 'style') {
                const elem = /** @type {HTMLElement} */ (node);
                if (patch.styleRemoved && patch.styleAdded) {
                    for (const prop of patch.styleRemoved) {
                        elem.style.removeProperty(prop);
                    }
                    for (const [prop, value] of patch.styleAdded) {
                        if (this._isSafeStyle(prop, value)) {
                            elem.style.setProperty(prop, value);
                        } else {
                            console.warn('Insecure style property ignored', prop);
                        }
                    }
                } else {
                    if (this._isSafeStyle('style', patch.value)) {
                        elem.style.cssText = patch.value;
                    } else {
                        console.warn('Insecure style ignored', patch.value);
                    }
                }
            } else {
                node.setAttribute(patch.name, patch.value);
            }
        } else if (patch.type === 'text') {
            // Update only the specific text node by its recorded child index,
            // leaving sibling elements (icons, spans, etc.) untouched.
            const idx = patch.textNodeIndex ?? -1;
            const target = idx >= 0 ? node.childNodes[idx] : null;
            if (target && target.nodeType === 3) {
                target.textContent = patch.value;
            } else {
                // Fallback for patches without an index (single text-child elements).
                node.textContent = patch.value;
            }
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
            rootElement.removeAttribute('data-rvn-id');
        }
        this.vdomInstances.delete(vid);
        return this.execute('vdom:destroy', { vid });
    }
}
