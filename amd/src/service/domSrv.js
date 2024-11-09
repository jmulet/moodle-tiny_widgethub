import jquery from "jquery";

export class DomSrv {
    /**
     * @param {JQueryStatic} jQuery
     */
    constructor(jQuery) {
        /** @type {JQueryStatic} */
        this.jQuery = jQuery;
    }

    /**
     * When creating a clone of an element must update all its id's
     * @param {JQuery<HTMLElement>} $e - The element to be treated
     * @param {JQuery<HTMLElement>} $target - The root element being cloned
     * @param {JQuery<HTMLElement>} $root - The root element providing the context
     * @param {Record<string, string>} idMap - A dictionary to store assigned id's
     */
    treatElementIds($e, $target, $root, idMap) {
        const oldId = $e.prop('id');
        if (oldId) {
            let newId = idMap[oldId];
            if (!newId) {
                const ext = Math.random().toString(32).substring(2, 5);
                newId = oldId + ext;
                idMap[oldId] = newId;
            }
            $e.prop('id', newId);
        }
        // Does $e contain references to another elements in the $root which are not in $target?
        ['data-target', 'data-bs-target', 'href'].forEach((dataX) => {
            const attr = $e.attr(dataX);
            if (attr?.startsWith("#")) {
                $e.removeClass('active show');
                const rootRef = $root.find(attr);
                const targetRef = $target.find(attr);
                if (rootRef.length) {
                    if (targetRef.length) {
                        // Simply rename property
                        const oldId = attr.substring(1);
                        let newId = idMap[oldId];
                        if (!newId) {
                            const ext = Math.random().toString(32).substring(2, 5);
                            newId = oldId + ext;
                            idMap[oldId] = newId;
                        }
                        $e.attr(dataX, "#" + newId);
                    } else {
                        // (TODO: Deep cloning here?) Must clone the reference as well
                        const newId = 'd' + Math.random().toString(32).substring(2);
                        const clonedRef = rootRef.clone().prop("id", newId);
                        $e.prop(dataX, "#" + newId);
                        clonedRef.insertAfter(rootRef).removeClass("active show");
                    }
                }
            }
        });
    }

    /**
     * @param {JQuery<HTMLElement>} $e - the element that must be cloned
     * @param {JQuery<HTMLElement>} $root - the root element (widget root)
     * @param {Record<string,string>} idMap - old vs new id map
     * @returns {JQuery<HTMLElement>} The cloned element with new id's
     */
    smartClone($e, $root, idMap) {
        const clone = $e.clone();
        this.treatElementIds(clone, $e, $root, idMap);
        clone.find('*').each((_, e) => {
            this.treatElementIds(this.jQuery(e), $e, $root, idMap);
        });
        return clone;
    }

    /**
     * @param {JQuery<HTMLElement>} $e - Look in $e and all its descendants if references any other element in $root
     * @param {JQuery<HTMLElement>} $root
     * @returns {JQuery<HTMLElement>[]} - A list of referenced elements in $e
     */
    findReferences($e, $root) {
        const searchFor = '[data-target^="#"], [data-bs-target^="#"], [href^="#"]';
        /** @type {HTMLElement[]} */
        const found = [];
        if ($e.is(searchFor)) {
            let attr = $e.attr('data-target') ?? $e.attr('data-bs-target') ?? $e.attr('href');
            if (attr) {
                found.push(...$root.find(attr).toArray());
            }
        }
        if (!found.length) {
            // Look in descendants
            const $descendants = $e.find(searchFor);
            if ($descendants.length) {
                let attr = $descendants.attr('data-target') ?? $descendants.attr('data-bs-target') ?? $descendants.attr('href');
                if (attr) {
                    found.push(...$root.find(attr).toArray());
                }
            }
        }
        return found.map(e => this.jQuery(e));
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
     * @property {JQuery<HTMLElement>} selectedElement - The DOM element from which the search starts.
     * @property {JQuery<HTMLElement>} [elem] - Indicates the element corresponding to the selector of the widget found
     * @property {JQuery<HTMLElement>} [targetElement] - Indicates the element corresponding the intermediate selector
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
            selectedElement: this.jQuery(selectedElement)
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
                    res.elem = this.jQuery(elem);
                }
                i++;
            }
            elem = elem.parentElement;
        }
        // If no widget is found and selectedElement has a parent OL or IMG,
        // force detection with a fake widget.
        if (!res.widget) {
            const parent = res.selectedElement.closest('ol,img');
            let tag = res.selectedElement.prop('tagName');
            const isTag = tag === 'OL' || tag === 'IMG';
            if (isTag || parent[0]) {
                if (!isTag) {
                    tag = parent.prop('tagName');
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
        // @ts-ignore
        instanceSrv = new DomSrv(jquery);
    }
    return instanceSrv;
}