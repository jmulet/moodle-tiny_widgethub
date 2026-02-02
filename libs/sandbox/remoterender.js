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
 * @copyright   2026 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
// Disable potential dangerous APIs in IFRAME window
const dangerous = ['fetch', 'XMLHttpRequest', 'eval', 'location', 'navigator',
    'alert', 'confirm', 'prompt', 'indexedDB'];
dangerous.forEach(api => {
    // @ts-ignore
    if (window[api]) {
        Object.defineProperty(window, api, {
            value: undefined,
            writable: false
        });
    }
});


/** @typedef {Object} QueuedTask
 * @property {string} type
 * @property {string} requestId
 * @property {any} payload
 * @property {(value: any) => void} resolve
 * @property {(reason?: any) => void} reject
 * @property {number} timeout
 */

/**
 * Worker wrapper object.
 * @typedef {Object} WorkerWrap
 * @property {Worker} worker - The worker instance.
 * @property {number} runs - The number of times the worker has been run.
 * @property {boolean} loaded - Whether the worker has been loaded.
 * @property {string | null} id - The ID of the current task.
 * @property {number | null} timeout - The timeout ID for the worker.
 */

// Worker pool implementation
/** @type {number} */
const MAX_WORKER_TIMEOUT = 5000;
/** @type {number} */
const MAX_WORKER_RUNS = 10; // Maximum number of runs for a worker

/** @type {Record<string, Array<QueuedTask>>} */
const queues = {};
/** @type {Record<string, WorkerWrap | null>} */
const workers = {};
/** @type {MessagePort | null} */
let port1 = null;

const baseWorker = `function disableWorkerAPIs() {
            var dangerous = ['close', 'fetch', 'XMLHttpRequest', 'importScripts'];
            dangerous.forEach(api => {
                if (self[api]) {
                    Object.defineProperty(self, api, {
                        value: () => { throw new Error('Security Error: worker api is disabled.'); },
                        configurable: false,
                        writable: false
                    });
                }
            });
        }

        var blacklist = ['self', 'globalThis', 'Worker', 'SharedWorker', 'postMessage', 'onmessage', 
            'indexedDB', 'location', 'navigator', 'origin', 'console', 'setTimeout', 'setInterval'];

        function evalInContext(ctx, expr, keepFns) {
            if (expr.indexOf('Function(') !== -1 || expr.indexOf('eval(') !== -1 ||
                expr.indexOf('.constructor') !== -1) {
                throw new Error('Function or eval or constructor is not allowed');
            }
            var listArgs = [];
            var listVals = [];
            ctx = ctx || {};
            Object.keys(ctx).forEach((key) => {
                if (keepFns || typeof ctx[key] !== "function") {
                    listArgs.push(key);
                    listVals.push(ctx[key]);
                }
            });
            blacklist.forEach((key) => {
                if (ctx[key] !== undefined) {
                    return;
                }
                listArgs.push(key);
                listVals.push(null);
            });
            listArgs.push('expr');
            listArgs.push('return eval(expr)');
            listVals.push(expr);
            var evaluator = new Function(...listArgs);
            return evaluator(...listVals);
        }
    `;

/**
 * Sanitizes the rendered HTML by removing potentially dangerous tags and attributes.
 * @param {string} renderedHTML - The rendered HTML to sanitize.
 * @returns {string} The sanitized HTML.
 */
function sanitize(renderedHTML) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(renderedHTML, 'text/html');
    const FORBIDDEN_TAGS = new Set(['SCRIPT', 'STYLE', 'FORM', 'TEXTAREA',
        'OBJECT', 'EMBED', 'LINK', 'META', 'BASE', 'SVG', 'MATH']);
    const SAFE_PROTOCOLS = /^(https?:|mailto:|tel:|#)/i;

    doc.querySelectorAll('*').forEach(el => {
        if (FORBIDDEN_TAGS.has(el.tagName)) {
            el.remove();
            return;
        } else if (el.tagName === 'IFRAME') {
            const src = el.getAttribute('src');
            if (!src) {
                el.remove();
                return;
            }
            el.removeAttribute('srcdoc');
            el.removeAttribute('allow-same-origin');
        }
        [...el.attributes].forEach(attr => {
            const name = attr.name.toLowerCase();
            const value = attr.value.toLowerCase();
            if (((name === 'href' || name === 'src') && !SAFE_PROTOCOLS.test(value)) ||
                name.startsWith('on')) {
                el.removeAttribute(attr.name);
            }
        });
    });
    return doc.body.innerHTML;
}


/**
 * Creates a new worker for the given type.
 * @param {string} type - The type of worker to create.
 * @returns {WorkerWrap | null} The created worker, or null if the template is not found.
 */
function createWorker(type) {
    const template = document.getElementById('worker_' + type);
    if (!template) {
        console.error('Worker template not found for type: ' + type);
        return null;
    }
    const jsCode = baseWorker + template.textContent.trim();
    const url = URL.createObjectURL(new Blob([jsCode], {
        type: 'text/javascript'
    }));
    const worker = new Worker(url);
    const workerWrap = {
        worker,
        id: null,
        runs: 0,
        loaded: false,
        timeout: null,
    };
    worker.onmessage = function (e) {
        if (e.data.type === 'worker_ready') {
            URL.revokeObjectURL(url);
            workerWrap.loaded = true;
            processNextTask(type);
            return;
        } else if (e.data.type === 'worker_error') {
            URL.revokeObjectURL(url);
            // Cannot process any task on this queue
            (queues[type] || []).forEach((task) => {
                port1?.postMessage({
                    type: type,
                    requestId: task.requestId,
                    error: 'Worker error for type: ' + type + ' ' + e.data.error
                });
            });
            queues[type] = [];
            worker.terminate();
            workers[type] = null;
            return;
        }
        // Normal task execution response
        workerWrap.id = null;
        const data = e.data;
        data.type = type;
        // sanitize data.response
        if (data.response) {
            data.response = sanitize(data.response);
        }
        port1?.postMessage(data);
        if (workerWrap.timeout) {
            clearTimeout(workerWrap.timeout);
        }
        processNextTask(type);
    };
    worker.onerror = function (e) {
        console.error('Worker onerror for type: ' + type, e, workerWrap.id);
        port1?.postMessage({
            type: type,
            requestId: workerWrap.id,
            error: 'Worker error for type: ' + type + ' ' + e
        });
        if (workerWrap.timeout) {
            clearTimeout(workerWrap.timeout);
        }
        worker.terminate();
        workers[type] = null;
        queues[type] = [];
        URL.revokeObjectURL(url);
    };
    return workerWrap;
}

/**
 * Processes the next task in the queue for the given type.
 * @param {string} type - The type of the queue to process.
 */
function processNextTask(type) {
    if (!queues[type] || queues[type].length === 0) {
        return;
    }
    const task = queues[type][0];
    if (!task) {
        return;
    }
    let workerWrap = workers[type];
    if (workerWrap) {
        if (!workerWrap.loaded || workerWrap.id) {
            return;
        }
        if (workerWrap.runs >= MAX_WORKER_RUNS) {
            if (workerWrap.timeout) {
                clearTimeout(workerWrap.timeout);
            }
            workerWrap.worker.terminate();
            workerWrap = null;
            workers[type] = null;
        }
    }
    if (!workerWrap) {
        workerWrap = createWorker(type);
        workers[type] = workerWrap;
        return;
    }
    queues[type].shift();
    workerWrap.timeout = window.setTimeout(function () {
        if (workerWrap?.timeout) {
            window.clearTimeout(workerWrap.timeout);
        }
        workerWrap?.worker?.terminate();
        workerWrap = null;
        port1?.postMessage({
            requestId: task.requestId,
            type: type,
            error: 'Worker timeout for type: ' + type
        });
        workers[type] = null;
        processNextTask(type);
    }, MAX_WORKER_TIMEOUT);
    workerWrap.id = task.requestId;
    workerWrap.runs++;
    workerWrap.worker.postMessage(task);
}

/** 
 * Handles a message received on the channel.
 * @param {MessageEvent} e - The message event.
 * {type: string, payload: Object} Task received on channel */
function onChannelMessage(e) {
    const data = e.data;
    if (data.type) {
        if (!queues[data.type]) {
            queues[data.type] = [];
        }
        queues[data.type].push(data);
        processNextTask(data.type);
    }
}

const channel = new MessageChannel();
window.parent.postMessage({
    type: 'tiny_widgethub_sandbox_init',
    status: 'ready'
}, '*', [channel.port2]);
port1 = channel.port1;
port1.onmessage = onChannelMessage;
