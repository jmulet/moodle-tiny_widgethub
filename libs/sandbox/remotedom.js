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
 * @module      tiny_widgethub/plugin
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Sanitizes the given document.
 * @param {Document} doc
 */
function sanitize(doc) {
    const FORBIDDEN_TAGS = new Set(['SCRIPT', 'STYLE', 'FORM', 'TEXTAREA',
        'OBJECT', 'EMBED', 'LINK', 'META', 'BASE']);
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
}

/**
 * @typedef {{vId: string} | string | VNodeElement} VNode
 */
/**
 * @typedef {[string, Record<string,string>, VNode[]]} VNodeElement
 */
/**
 * Defines a mutation patch in VDOM.
 * @typedef {Object} Patch
 * @property {string} type
 * @property {string} vid
 * @property {string} value
 * @property {boolean} isDeleted
 */

/**
 * Defines a VDOM instance.
 * @typedef {Object} VDOMInstance
 * @property {Document} document
 * @property {Array<Patch>} patches
 * @property {MutationObserver | null} observer
 */
/**
 * @type {Map<string, VDOMInstance>}
 */
const vdomInstances = new Map();
let vdomInstanceCounter = 0;
let vdomNodeCounter = 0;

/**
 * Serializes the given DOM element to JSON.
 * @param {Node} elem
 * @param {boolean} forceFull
 * @returns {VNode | null}
 */
function jsonDomSerialize(elem, forceFull) {
    if (!elem) {
        return null;
    }
    // Handle Text Nodes.
    if (elem.nodeType === 3) {
        /** @type {Text} */
        // @ts-ignore
        const textNode = elem;
        // Trim whitespace to avoid cluttering JSON with empty newline nodes
        return textNode.textContent.trim() ? textNode.textContent : null;
    }
    // Handle Element Nodes (nodeType 1)
    if (elem.nodeType === 1) {
        /** @type {Element} */
        // @ts-ignore
        const elementNode = elem;
        const tagname = elementNode.tagName.toLowerCase();
        if (tagname === 'script' || tagname === 'style') {
            return null;
        }
        if (!elementNode.hasAttribute('data-rvn-id')) {
            elementNode.setAttribute('data-rvn-id', 'r' + vdomNodeCounter++);
        }
        if (!forceFull) {
            return { vId: elementNode.getAttribute('data-rvn-id') ?? '' };
        }
        /** @type {Record<string, string>} */
        const attrs = Object.create(null);
        for (let i = 0; i < elementNode.attributes.length; i++) {
            const attr = elementNode.attributes[i];
            attrs[attr.name] = attr.value;
        }
        /** @type {VNode[]} */
        const children = [];
        for (let i = 0; i < elementNode.childNodes.length; i++) {
            const childJson = jsonDomSerialize(elementNode.childNodes[i], true);
            if (childJson !== null) {
                children.push(childJson);
            }
        }
        return [
            tagname,
            attrs,
            children
        ];
    }
    return null;
}

/**
 * Creates a new VDOM instance.
 * @param {string} html
 * @returns {{
 *     vid: string
 * }}
 */
function vdomCreate(html) {
    const vid = vdomInstanceCounter++;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    sanitize(doc);
    /** @type {VDOMInstance} */
    const instance = {
        document: doc,
        patches: [],
        observer: null,
    };
    const observeOptions = {
        attributes: true,
        characterData: true,
        subtree: true,
        childList: true,
    };
    instance.observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            const target = mutation.target;
            /** @type {any} */
            const patch = {
                type: mutation.type,
            };
            if (mutation.type === 'attributes') {
                const attrName = mutation.attributeName;
                if (!attrName || attrName === 'data-rvn-id') {
                    return;
                }
                const elem = /** @type {Element} */ (target);
                patch.vid = elem.getAttribute('data-rvn-id');
                patch.value = elem.getAttribute(attrName);
                patch.isDeleted = !elem.hasAttribute(attrName);
            } else if (mutation.type === 'characterData') {
                patch.type = 'text';
                patch.vid = target.parentElement?.getAttribute('data-rvn-id');
                patch.value = mutation.target.textContent;
            } else if (mutation.type === 'childList') {
                patch.type = 'nodes';
                if (target.nodeType === 1) {
                    const elem = /** @type {Element} */ (target);
                    patch.vid = elem.getAttribute('data-rvn-id');
                } else {
                    patch.vid = target.parentElement?.getAttribute('data-rvn-id');
                }
                const addedNodes = Array.from(mutation.addedNodes);
                patch.nodes = Array.from(target.childNodes).map(function (node) {
                    const isAdded = addedNodes.includes(node);
                    return jsonDomSerialize(node, isAdded);
                });
            }
            instance.patches.push(patch);
        });
    });
    // Watch the first child of body as that corresponds to the root element passed
    if (doc.body.firstElementChild) {
        instance.observer.observe(doc.body.firstElementChild, observeOptions);
    } else {
        instance.observer.observe(doc.body, observeOptions);
    }
    vdomInstances.set(vid + '', instance);
    return {
        vid: vid + ''
    };
}

/**
 * @param {{vid: string, instructions: string, useJQuery: boolean}} data
 */
function vdomQuery(data) {
    const instance = vdomInstances.get(data.vid);
    if (!instance) {
        return {
            error: 'vdom node not found for vid: ' + data.vid
        };
    }
    let result = '';
    let error = undefined;
    const doc = instance.document;
    /** @type {any} */
    let elem = doc.body.firstElementChild;
    try {
        if (typeof data.instructions === 'string') {
            let elemVar = 'elem';
            if (data.useJQuery) {
                elem = jQuery(elem);
                elemVar = '$e';
            }
            const executor = new Function(elemVar, 'window', 'document', '$',
                `var fn = ${data.instructions}; return fn(${elemVar});`);
            result = executor(elem, { document: doc }, doc, jQuery);
        } else {
            error = 'Invalid instructions format';
        }
    } catch (e) {
        error = e + '';
    }
    return {
        result: result,
        error: error
    };
}

/**
 * @param {{vid: string, value: any, instructions: string, useJQuery: boolean}} data
 */
function vdomUpdate(data) {
    const instance = vdomInstances.get(data.vid);
    if (!instance) {
        return {
            error: 'vdom node not found for vid: ' + data.vid
        };
    }
    let error = undefined;
    const doc = instance.document;
    /** @type {any} */
    let elem = doc.body.firstElementChild;
    try {
        if (typeof data.instructions === 'string') {
            let elemVar = 'elem';
            if (data.useJQuery) {
                elem = jQuery(elem);
                elemVar = '$e';
            }
            const executor = new Function(elemVar, 'v', 'window', 'document', '$',
                `var fn = ${data.instructions}; return fn(${elemVar}, v);`);
            executor(elem, data.value, { document: doc }, doc, jQuery);
        } else {
            error = 'Invalid instructions format';
        }
    } catch (e) {
        error = e + '';
    }
    return {
        error: error
    };
}

/**
 * @param {string} vid
 */
async function vdomGetPatches(vid) {
    // Ensure microtask queue is flushed to allow mutations to be processed.
    await new Promise(resolve => setTimeout(resolve, 0));
    const instance = vdomInstances.get(vid);
    if (instance) {
        const patches = instance.patches;
        instance.patches = [];
        return {
            patches: patches
        };
    }
    return { error: 'vdom node not found for vid: ' + vid };
}

/**
 * @param {string} vid
 */
function vdomDestroy(vid) {
    const instance = vdomInstances.get(vid);
    if (instance) {
        if (instance.observer) {
            instance.observer.disconnect();
        }
        vdomInstances.delete(vid);
        return {};
    }
    return { error: 'vdom node not found for vid: ' + vid };
}

/**
 * @param {Document} doc
 * @returns {Record<string, Set<Element>>}
 */
function getTrustedNodes(doc) {
    return Object.freeze(
        Object.assign(Object.create(null), {
            scripts: new Set(
                Array.from(doc.querySelectorAll('script'))
            ),
            styles: new Set(
                Array.from(doc.querySelectorAll('style'))
            ),
            maths: new Set(
                Array.from(doc.querySelectorAll('math'))
            ),
            svgs: new Set(
                Array.from(doc.querySelectorAll('svg'))
            )
        })
    );
}

/**
 * @param {Document} doc
 * @param {Record<string, Set<Element>>} trustedNodes
 */
function removeNonTrustedNodes(doc, trustedNodes) {
    Object.keys(trustedNodes).forEach(tagName => {
        const allElements = doc.querySelectorAll(tagName);
        for (const elem of allElements) {
            if (!trustedNodes[tagName].has(elem)) {
                elem.remove();
            }
        }
    });
}

/**
 * @param {string} html
 * @param {Array<{name: string, code: string, opts: Object}>} filters
 */
async function vdomFilter(html, filters) {
    try {
        let doc = new DOMParser().parseFromString(html, 'text/html');
        sanitize(doc);
        let trustedNodes = getTrustedNodes(doc);
        let fakeEditor = {
            getBody: function () {
                return doc.body;
            }
        };
        let lastHTML = null;
        let error = undefined;
        const msgs = [];
        let hasChanges = false;
        if (Array.isArray(filters)) {
            for (const f of filters) {
                if (lastHTML) {
                    removeNonTrustedNodes(doc, trustedNodes);
                    // If the filter returns html, must be parsed again.
                    doc = new DOMParser().parseFromString(lastHTML, 'text/html');
                    sanitize(doc);
                    trustedNodes = getTrustedNodes(doc);
                    fakeEditor.getBody = function () {
                        return doc.body;
                    };
                }
                // TODO: editor is going to be removed, use body instead.
                try {
                    const executor = new Function('text', 'editor', 'body', 'opts', 'window', 'document', '$', f.code);
                    let filterResult = executor(html, fakeEditor, doc.body, f.opts || {}, { document: doc }, doc, jQuery);
                    if (filterResult instanceof Promise) {
                        filterResult = await filterResult;
                    }
                    lastHTML = null;
                    msgs.push(f.name + ': ' + filterResult[1]);
                    if (typeof filterResult[0] === 'boolean') {
                        hasChanges = hasChanges || filterResult[0];
                    } else if (typeof filterResult[0] === 'string') {
                        lastHTML = filterResult[0];
                        hasChanges = true;
                    }
                } catch (e) {
                    error = e + '';
                    break;
                }
            }
            if (lastHTML) {
                doc = new DOMParser().parseFromString(lastHTML, 'text/html');
            }
            removeNonTrustedNodes(doc, trustedNodes);
            sanitize(doc);
            trustedNodes = /** @type {any} */ (null);
        } else {
            error = 'Invalid filters format';
        }
        return {
            error: error,
            html: doc.body.innerHTML,
            msg: msgs.join(', '),
            hasChanges: hasChanges
        };
    } catch (e) {
        return {
            error: e + ''
        };
    }
}

(function () {
    /**
     * Communication port with parent.
     * @type {MessagePort | null}
     */
    let port1 = null;
    /**
     * @param {MessageEvent} e 
     * {type: string, payload: Object} Task received on channel */
    async function onChannelMessage(e) {
        const data = e.data;
        if (!data.type || !data.type.startsWith('vdom:')) {
            return;
        }
        let response = undefined;
        if (data.type === 'vdom:create') {
            response = vdomCreate(data.html);
        } else if (data.type === 'vdom:query') {
            response = vdomQuery(data);
        } else if (data.type === 'vdom:update') {
            response = vdomUpdate(data);
        } else if (data.type === 'vdom:getpatches') {
            response = await vdomGetPatches(data.vid);
        } else if (data.type === 'vdom:destroy') {
            response = vdomDestroy(data.vid);
        } else if (data.type === 'vdom:filter') {
            response = await vdomFilter(data.html, data.filters);
        } else {
            console.error('Unknown vdom task type: ' + data.type);
        }
        port1?.postMessage(Object.assign(Object.create(null), response ?? {}, {
            type: data.type,
            requestId: data.requestId
        }));
    }

    const channel = new MessageChannel();
    window.parent.postMessage({
        type: 'tiny_widgethub_remotedom_init',
        status: 'ready'
    }, '*', [channel.port2]);
    port1 = channel.port1;
    port1.onmessage = onChannelMessage;
})();
