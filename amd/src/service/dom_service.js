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
 * @copyright   2025 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

export class DomSrv {
    /**
     * When creating a clone of an element must update all its id's
     * @param {Element} el - The element to be treated
     * @param {Element} target - The root element being cloned
     * @param {Element} root - The root element providing the context
     * @param {Record<string, string>} idMap - A dictionary to store assigned id's
     */
    treatElementIds(el, target, root, idMap) {
        const oldId = el.id;
        if (oldId) {
            let newId = idMap[oldId];
            if (!newId) {
                const ext = Math.random().toString(32).substring(2, 5);
                newId = oldId + ext;
                idMap[oldId] = newId;
            }
            el.id = newId;
        }
        // Does el contain references to another elements in the root which are not in target?
        ['data-target', 'data-bs-target', 'href'].forEach((dataX) => {
            const attr = el.getAttribute(dataX);
            if (attr?.startsWith("#") && attr.length > 1) {
                el.classList.remove('active', 'show');
                const rootRef = root.querySelector(attr);
                const targetRef = target.querySelector(attr);
                if (rootRef) {
                    if (targetRef) {
                        // Simply rename property
                        const oldId = attr.substring(1);
                        let newId = idMap[oldId];
                        if (!newId) {
                            const ext = Math.random().toString(32).substring(2, 5);
                            newId = oldId + ext;
                            idMap[oldId] = newId;
                        }
                        el.setAttribute(dataX, "#" + newId);
                    } else {
                       // Generar un ID único
                        const newId = 'd' + Math.random().toString(32).substring(2);

                        // Clonar el elemento (deep clone si quieres incluir hijos)
                        /** @type {any} */
                        const clonedRef = rootRef.cloneNode(true);

                        // Asignar el nuevo ID
                        clonedRef.id = newId;

                        // Actualizar el atributo/data en el elemento original
                        el.setAttribute(dataX, "#" + newId);

                        // Compatibilidad con Bootstrap: actualizar el otro atributo
                        if (dataX === 'data-bs-target') {
                            el.setAttribute('data-target', "#" + newId);
                        } else if (dataX === 'data-target') {
                            el.setAttribute('data-bs-target', "#" + newId);
                        }

                        // Insertar el clon después del original
                        rootRef.parentNode?.insertBefore(clonedRef, rootRef.nextSibling);

                        // Quitar clases "active" y "show"
                        clonedRef.classList.remove('active', 'show');
                    }
                }
            }
        });
    }

    /**
     * @param {Element} el - the element that must be cloned
     * @param {Element} root - the root element (widget root)
     * @param {Record<string,string>} idMap - old vs new id map
     * @returns {Element} The cloned element with new id's
     */
    smartClone(el, root, idMap) {
        /** @type {*} */
        const clone = el.cloneNode(true);
        this.treatElementIds(clone, el, root, idMap);
        clone.querySelectorAll('*').forEach((/** @type {HTMLElement} */ e) => {
            this.treatElementIds(e, el, root, idMap);
        });
        return clone;
    }

    /**
     * @param {Element} el - Look in el and all its descendants if references any other element in root
     * @param {Element} root
     * @returns {Element[]} - A list of referenced elements in el
     */
    findReferences(el, root) {
        const searchFor = '[data-target^="#"], [data-bs-target^="#"], [href^="#"]';
        /** @type {Element[]} */
        const found = [];
        if (el.matches(searchFor)) {
            const attr = el.getAttribute('data-target')
                ?? el.getAttribute('data-bs-target')
                ?? el.getAttribute('href');

            if (attr && attr !== '#') {
                // QuerySelectorAll returns a NodeList; convert to array with spread.
                found.push(...root.querySelectorAll(attr));
            }
        }

        if (!found.length) {
            // Look in descendants
            el.querySelectorAll(searchFor).forEach(desc => {
                const attr = desc.getAttribute('data-target')
                        ?? desc.getAttribute('data-bs-target')
                        ?? desc.getAttribute('href');

                if (attr && attr !== '#') {
                    found.push(...root.querySelectorAll(attr));
                }
            });
        }
        return found;
    }

    /**
     * @param {HTMLElement} elem
     * @param {string | string[]} [selectors]
     * @returns {boolean}
     */
    matchesSelectors(elem, selectors) {
        if (!selectors) {
            return false;
        }
        /** @type {string} **/
        let selector;
        /** @type {string[]} **/
        let extraQuery = [];
        if (Array.isArray(selectors)) {
            selector = selectors[0];
            if (selectors.length > 1) {
                extraQuery = selectors.slice(1);
            }
        } else {
            selector = selectors;
        }
        /* @type {boolean} */
        let match = elem.matches(selector);
        if (match) {
            extraQuery.forEach(e => {
                match = match && elem.querySelector(e) !== null;
            });
        }
        return match;
    }

    /**
     * Defines the type PathResult
     * @typedef {Object} PathResult
     * @property {Element} selectedElement - The DOM element from which the search starts.
     * @property {Element} [elem] - Indicates the element corresponding to the selector of the widget found
     * @property {Element | null} [targetElement] - Indicates the element corresponding the intermediate selector
     * @property {import('../options').Widget=} widget - The current widget definition associated with the elem
     */

    /**
     * Walks the DOM tree up from the selectedElement and tries
     * to find the first element that matches the selector of
     * some widget.
     * @param {import('../options').Widget[]} widgetList - The list of widgets
     * @param {HTMLElement} selectedElement - The starting element in the search
     * @returns {PathResult} The element and widget found in the search.
     */
    findWidgetOnEventPath(widgetList, selectedElement) {
        /** @type {PathResult} */
        const res = {
            selectedElement
        };
        /** @type {HTMLElement | null} */
        let elem = selectedElement;
        const n = widgetList.length;
        while (elem !== null && elem !== undefined && elem !== null &&
            elem.getAttribute("name") !== "BODY" && res.widget === undefined) {
            let i = 0;
            while (i < n && res.widget === undefined) {
                if (this.matchesSelectors(elem, widgetList[i].selectors)) {
                    res.widget = widgetList[i];
                    res.elem = elem;
                }
                i++;
            }
            elem = elem.parentElement;
        }
        // If no widget is found and selectedElement has a parent OL or IMG,
        // force detection with a fake widget.
        if (!res.widget) {
            const parent = res.selectedElement.closest('ol,img');
            /** @type {string | undefined} */
            let tag = res.selectedElement.tagName;
            const isTag = tag === 'OL' || tag === 'IMG';
            if (isTag || parent) {
                if (!isTag) {
                    tag = parent?.tagName;
                }
                /** @ts-ignore */
                res.widget = {key: `!${tag}`, prop: () => ''};
                res.targetElement = isTag ? res.selectedElement : parent;
            }
        }
        return res;
    }
}

/** @type {DomSrv | undefined} */
let instanceSrv;

/**
 * @returns {DomSrv}
 */
export function getDomSrv() {
    if (!instanceSrv) {
        instanceSrv = new DomSrv();
    }
    return instanceSrv;
}
