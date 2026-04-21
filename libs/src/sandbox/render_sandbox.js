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
 * @module     tiny_widgethub/render_sandbox
 * @copyright   2026 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/** @ts-ignore */
import evalWorkerCode from './tmp/eval_worker.inline.js';
/** @ts-ignore */
import ejsWorkerCode from './tmp/ejs_worker.inline.js';
/** @ts-ignore */
import liquidWorkerCode from './tmp/liquid_worker.inline.js';
/** @ts-ignore */
import mustacheWorkerCode from './tmp/mustache_worker.inline.js';

/** @type {Record<string, string>} */
const WORKER_CODES = Object.freeze({
    eval: evalWorkerCode,
    ejs: ejsWorkerCode,
    liquid: liquidWorkerCode,
    mustache: mustacheWorkerCode
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

/** @type {Map<string, Array<QueuedTask>>} */
const queues = new Map();
/** @type {Map<string, WorkerWrap | null>} */
const workers = new Map();
/** @type {MessagePort | null} */
let port1 = null;

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
        const tagName = el.tagName.toUpperCase();
        if (FORBIDDEN_TAGS.has(tagName)) {
            el.remove();
            return;
        } else if (tagName === 'IFRAME') {
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
    const code = WORKER_CODES[type];
    if (!code) {
        console.error('Worker code not found for type: ' + type);
        return null;
    }
    const blob = new Blob([code], { type: 'application/javascript' });
    /** @type {string | null} */
    let workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);
    const workerWrap = Object.seal(Object.assign(Object.create(null), {
        worker,
        id: null,
        runs: 0,
        loaded: false,
        timeout: null,
    }));
    worker.onmessage = function (e) {
        if (workerUrl) {
            URL.revokeObjectURL(workerUrl);
            workerUrl = null;
        }
        if (e.data.type === 'worker_ready') {
            workerWrap.loaded = true;
            processNextTask(type);
            return;
        } else if (e.data.type === 'worker_error') {
            // Cannot process any task on this queue
            (queues.get(type) ?? []).forEach((task) => {
                port1?.postMessage(Object.assign(Object.create(null), {
                    type: type,
                    requestId: task.requestId,
                    error: 'Worker error for type: ' + type + ' ' + e.data.error
                }));
            });
            queues.set(type, []);
            worker.terminate();
            workers.delete(type);
            return;
        }
        // Normal task execution response
        workerWrap.id = null;
        const data = Object.assign(Object.create(null), e.data);
        data.type = type;
        // sanitize data.response
        if (typeof data.result === 'string') {
            data.result = sanitize(data.result);
        }
        port1?.postMessage(data);
        if (workerWrap.timeout) {
            clearTimeout(workerWrap.timeout);
        }
        processNextTask(type);
    };
    /**
     * @param {ErrorEvent} e 
     */
    const onerrorFn = function (e) {
        console.error('Worker onerror for type: ' + type, e, workerWrap.id);
        const errorMessage = 'Worker error for type: ' + type + ' ' + (e.message || e);

        if (workerWrap.id) {
            port1?.postMessage(Object.assign(Object.create(null), {
                type: type,
                requestId: workerWrap.id,
                error: errorMessage
            }));
        }

        (queues.get(type) ?? []).forEach((task) => {
            port1?.postMessage(Object.assign(Object.create(null), {
                type: type,
                requestId: task.requestId,
                error: errorMessage
            }));
        });

        if (workerWrap.timeout) {
            clearTimeout(workerWrap.timeout);
        }
        worker.terminate();
        workers.delete(type);
        queues.set(type, []);
    };
    worker.onerror = onerrorFn;
    worker.onmessageerror = function () {
        onerrorFn(new ErrorEvent('messageerror', {
            message: 'Message error for type: ' + type
        }));
    };
    return workerWrap;
}

/**
 * Processes the next task in the queue for the given type.
 * @param {string} type - The type of the queue to process.
 */
function processNextTask(type) {
    const queue = queues.get(type);
    if (!queue || queue.length === 0) {
        return;
    }
    const task = queue[0];
    if (!task) {
        return;
    }
    let workerWrap = workers.get(type);
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
            workers.delete(type);
        }
    }
    if (!workerWrap) {
        workerWrap = createWorker(type);
        workers.set(type, workerWrap);
        return;
    }
    queue.shift();
    workerWrap.timeout = window.setTimeout(function () {
        if (workerWrap?.timeout) {
            window.clearTimeout(workerWrap.timeout);
        }
        workerWrap?.worker?.terminate();
        workerWrap = null;
        port1?.postMessage(Object.assign(Object.create(null), {
            requestId: task.requestId,
            type: type,
            error: 'Worker timeout for type: ' + type
        }));
        workers.delete(type);
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
        if (!WORKER_CODES[data.type]) {
            console.error('Unknown sandbox task type: ' + data.type);
            port1?.postMessage(Object.assign(Object.create(null), {
                requestId: data.requestId,
                type: data.type,
                error: 'Unknown task type: ' + data.type
            }));
            return;
        }
        let queue = queues.get(data.type);
        if (!queue) {
            queue = [];
            queues.set(data.type, queue);
        }
        queue.push(data);
        processNextTask(data.type);
    }
}

const channel = new MessageChannel();
window.parent.postMessage(
    Object.assign(Object.create(null), {
        type: 'tiny_widgethub_render_sandbox_init',
        status: 'ready'
    }),
    '*',
    [channel.port2]
);
port1 = channel.port1;
port1.onmessage = onChannelMessage;
