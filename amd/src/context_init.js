/* eslint-disable no-console */
/* eslint-disable max-len */
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

import ContextPropsModal from "./context_props_modal";
import {getWidgetDict} from "./options";
import jQuery from 'jquery';
// eslint-disable-next-line no-unused-vars
import {findReferences, smartClone, WidgetWrapper} from "./util";

/**
 * @param {HTMLElement} elem
 * @param {string | string[]} [selectors]
 * @returns {boolean}
 */
const matchesSelectors = function(elem, selectors) {
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
};

/**
 * Defines the type PathResult
 * @typedef {Object} PathResult
 * @property {JQuery<HTMLElement>} selectedElement - The DOM element from which the search starts.
 * @property {JQuery<HTMLElement>} [elem] - Indicates the element corresponding to the selector of the widget found
 * @property {JQuery<HTMLElement>} [targetElement] - Indicates the element corresponding the intermediate selector
 * @property {WidgetWrapper=} widget - The current widget definition associated with the elem
 */
/**
 * Walks the DOM tree up from the selectedElement and tries
 * to find the first element that matches the selector of
 * some widget.
 * @param {WidgetWrapper[]} widgetList - The list of widgets
 * @param {HTMLElement} selectedElement - The starting element in the search
 * @returns {PathResult} The element and widget found in the search.
 */
const findWidgetOnEventPath = function(widgetList, selectedElement) {
    /** @type {PathResult} */
    const res = {
        selectedElement: jQuery(selectedElement)
    };
    /** @type {HTMLElement | null} */
    let elem = selectedElement;
    const n = widgetList.length;
    while (elem !== null && elem !== undefined && elem !== null &&
           elem.getAttribute("name") !== "BODY" && res.widget === undefined) {
        let i = 0;
        while (i < n && res.widget === undefined) {
            if (matchesSelectors(elem, widgetList[i].selectors)) {
                res.widget = widgetList[i];
                res.elem = jQuery(elem);
            }
            i++;
        }
        elem = elem.parentElement;
    }
    return res;
};

/**
 * @typedef {Object} ICONS
 * @property {string} gear
 * @property {string} arrowUpFromBracket
 */
const ICONS = {
    gear: 'gear',
    arrowUpFromBracket: 'arrow-up-from-bracket',
    arrowUp: 'arrow-up',
    arrowDown: 'arrow-down',
    remove: 'trash',
    clone: 'clone'
};

/**
 * Define icons used by the context menus. Source: FontAwesome 6
 * @param {import("./plugin").TinyMCE} editor - The tinyMCE editor instance
 */
const defineIcons = function(editor) {
    editor.ui.registry.addIcon(ICONS.gear, '<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 512 512"><path d="M495.9 166.6c3.2 8.7 .5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6 .3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z"/></svg>');
    editor.ui.registry.addIcon(ICONS.arrowUpFromBracket, '<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 448 512"><path d="M246.6 9.4c-12.5-12.5-32.8-12.5-45.3 0l-128 128c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 109.3 192 320c0 17.7 14.3 32 32 32s32-14.3 32-32l0-210.7 73.4 73.4c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-128-128zM64 352c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 64c0 53 43 96 96 96l256 0c53 0 96-43 96-96l0-64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 64c0 17.7-14.3 32-32 32L96 448c-17.7 0-32-14.3-32-32l0-64z"/></svg>');
    editor.ui.registry.addIcon(ICONS.arrowUp, '<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 384 512"><path d="M214.6 41.4c-12.5-12.5-32.8-12.5-45.3 0l-160 160c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 141.2 160 448c0 17.7 14.3 32 32 32s32-14.3 32-32l0-306.7L329.4 246.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-160-160z"/></svg>');
    editor.ui.registry.addIcon(ICONS.arrowDown, '<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 384 512"><path d="M169.4 470.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 370.8 224 64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 306.7L54.6 265.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z"/></svg>');
    editor.ui.registry.addIcon(ICONS.remove, '<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 448 512"><path d="M135.2 17.7C140.6 6.8 151.7 0 163.8 0L284.2 0c12.1 0 23.2 6.8 28.6 17.7L320 32l96 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 96C14.3 96 0 81.7 0 64S14.3 32 32 32l96 0 7.2-14.3zM32 128l384 0 0 320c0 35.3-28.7 64-64 64L96 512c-35.3 0-64-28.7-64-64l0-320zm96 64c-8.8 0-16 7.2-16 16l0 224c0 8.8 7.2 16 16 16s16-7.2 16-16l0-224c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16l0 224c0 8.8 7.2 16 16 16s16-7.2 16-16l0-224c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16l0 224c0 8.8 7.2 16 16 16s16-7.2 16-16l0-224c0-8.8-7.2-16-16-16z"/></svg>');
    editor.ui.registry.addIcon(ICONS.clone, '<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 512 512"><path d="M64 464l224 0c8.8 0 16-7.2 16-16l0-64 48 0 0 64c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 224c0-35.3 28.7-64 64-64l64 0 0 48-64 0c-8.8 0-16 7.2-16 16l0 224c0 8.8 7.2 16 16 16zM224 304l224 0c8.8 0 16-7.2 16-16l0-224c0-8.8-7.2-16-16-16L224 48c-8.8 0-16 7.2-16 16l0 224c0 8.8 7.2 16 16 16zm-64-16l0-224c0-35.3 28.7-64 64-64L448 0c35.3 0 64 28.7 64 64l0 224c0 35.3-28.7 64-64 64l-224 0c-35.3 0-64-28.7-64-64z"/></svg>');
};


/**
 * Decides if a widget needs some kind of context menu or toolbar
 * @param {WidgetWrapper} widget - The widget
 * @returns {boolean}
 */
const needsContextMenu = function(widget) {
    return widget.hasBindings() || (widget.unwrap ?? '').trim().length > 0;
};

/** @type {Record<string, Function>} */
const PredefinedActions = {
    /**
     * Unwraps the contents of a widget
     * @param {PathResult} context
     */
    unwrap: (context) => {
        if (!context?.elem || !context?.widget?.unwrap) {
            return;
        }
        const toUnpack = context.elem.find(context.widget.unwrap);
        context.elem.replaceWith(toUnpack);
    },
    /**
     * Moves the selected element above in the parent container
     * unless it is the first one
     * If $e or any of its descendants references another element in
     * the widget, then it also must be moved before its sibling
     * @param {PathResult} context
     */
    movebefore: (context) => {
        console.log('moveup', context);
        const $e = context?.targetElement;
        const $root = context?.elem;
        if (!$e || !$root) {
            return;
        }
        const prev = $e.prev();
        if (prev) {
            prev.insertAfter($e);
            findReferences($e, $root).forEach($ref => {
                const prev2 = $ref.prev();
                if (prev2) {
                    prev2.insertAfter($ref);
                }
            });
        }
    },
    /**
     * Moves the selected element above in the parent container
     * unless it is the first one
     * If $e or any of its descendants references another element in
     * the widget, then it also must be moved after its sibling
     * @param {PathResult} context
     */
    moveafter: (context) => {
        console.log('movedown', context);
        const $e = context?.targetElement;
        const $root = context?.elem;
        if (!$e || !$root) {
            return;
        }
        const next = $e.next();
        if (next) {
            next.insertBefore($e);
            findReferences($e, $root).forEach($ref => {
                const next2 = $ref.next();
                if (next2) {
                    next2.insertBefore($ref);
                }
            });
        }
    },
    /**
     * Inserts a clone of the selected element after it
     * @param {PathResult} context
     */
    insertafter: (context) => {
        console.log('insert a clone', context);
        const $e = context?.targetElement;
        const $root = context?.elem;
        if (!$e || !$root) {
            return;
        }
        /** @type {Record<string, string>} */
        const idMap = {};
        const clone = smartClone($e, $root, idMap);
        clone.insertAfter($e).removeClass("active show");
    },
    /**
     * Removes the selected element
     * @param {PathResult} context
     */
    remove: (context) => {
        console.log('remove', context);
        const $e = context?.targetElement;
        const $root = context?.elem;
        if (!$e || !$root) {
            return;
        }
        // Does the $e or its descendants reference another element in the widget?
        // If so, it must be removed too
        findReferences($e, $root).forEach($ref => $ref.remove());
        const $parent = $e.parent();
        $e.remove();
        if ($parent.children().length === 0) {
            // Good candidate to remove the entire widget
            $root.remove();
        }
    }
};

/**
 * Looks for widgets that need to display context toolbars or menus
 * and binds the corresponding actions.
 * @param {import("./plugin").TinyMCE} editor
 */
export const initContextActions = function(editor) {
    /** @type {WidgetWrapper[]} */
    const widgetList = Object.values(getWidgetDict(editor));

    // Define icons
    defineIcons(editor);

    // Keep track of the last found context
    /** @type {PathResult | undefined} */
    let currentContext;

    const contextPropsModal = new ContextPropsModal(editor);
    // Generic button action for opening the properties modal
    editor.ui.registry.addButton('widgethub_modal_btn', {
        icon: ICONS.gear,
        tooltip: 'Properties',
        onAction: async function() {
            const ctx = findWidgetOnEventPath(widgetList, editor.selection.getNode());
            if (!ctx.widget) {
                return;
            }
            // Display modal dialog on this context
            await contextPropsModal.show(ctx);
        }
    });
    editor.ui.registry.addMenuItem('widgethub_modal_item', {
        icon: ICONS.gear,
        text: 'Properties',
        onAction: async function() {
            if (!currentContext?.widget) {
                currentContext = findWidgetOnEventPath(widgetList, editor.selection.getNode());
                if (!currentContext.widget) {
                    return;
                }
            }
            // Display modal dialog on this context
            await contextPropsModal.show(currentContext);
    }
    });

    /**
     * @param {string} name
     */
    function genericAction(name) {
        return function() {
            if (!currentContext?.widget) {
                currentContext = findWidgetOnEventPath(widgetList, editor.selection.getNode());
                if (!currentContext.widget) {
                    return;
                }
            }
            const action = PredefinedActions[name];
            if (action) {
                action(currentContext);
            }
        };
    }

    // Generic button action for unwrapping those widgets that support this feature
    editor.ui.registry.addButton('widgethub_unwrap_btn', {
        icon: ICONS.arrowUpFromBracket,
        tooltip: 'Unwrap',
        onAction: genericAction('unwrap')
    });

    editor.ui.registry.addMenuItem('widgethub_unwrap_item', {
        icon: ICONS.arrowUpFromBracket,
        text: 'Unwrap',
        onAction: genericAction('unwrap')
    });
    editor.ui.registry.addMenuItem('widgethub_moveup_item', {
        icon: ICONS.arrowUp,
        text: 'Move up',
        onAction: genericAction('movebefore')
    });
    editor.ui.registry.addMenuItem('widgethub_movedown_item', {
        icon: ICONS.arrowDown,
        text: 'Move down',
        onAction: genericAction('moveafter')
    });
    editor.ui.registry.addMenuItem('widgethub_insertafter_item', {
        icon: ICONS.clone,
        text: 'Insert',
        onAction: genericAction('insertafter')
    });
    editor.ui.registry.addMenuItem('widgethub_remove_item', {
        icon: ICONS.remove,
        text: 'Remove',
        onAction: genericAction('remove')
    });

    console.log("Registry addContextMenu");
    editor.ui.registry.addContextMenu('tiny_widgethub', {
        /** @param {HTMLElement} element */
        update: (element) => {
            console.log("update contextmenu ", element);
            // Look for a context
            currentContext = findWidgetOnEventPath(widgetList, element);
            if (!currentContext.widget || currentContext.widget.prop('contexttoolbar')) {
                return '';
            }
            const widget = currentContext.widget;
            const menuItems = [];
            if (widget.hasBindings()) {
                menuItems.push('modal');
            }
            // Now look for contextmenu property in widget definition
            /** @type {{predicate: string, actions: string}[] | undefined} */
            const contextmenu = widget.prop('contextmenu');
            if (contextmenu) {
                contextmenu.forEach(cm => {
                    // Does the element matches the predicate?
                    /** @type {HTMLElement | null} */
                    let targetElem = null;
                    if (element.matches(cm.predicate)) {
                        targetElem = element;
                    } else {
                        targetElem = element.closest(cm.predicate);
                    }
                    if (!targetElem) {
                        return;
                    }
                    if (currentContext) {
                        currentContext.targetElement = jQuery(targetElem);
                    }
                    menuItems.push(...cm.actions.split(" ").map(e => e.trim()));
                });
            }
            if (widget.unwrap) {
                menuItems.push('unwrap');
            }
            return menuItems.map(e => e === '|' ? '|' : `widgethub_${e}_item`).join(' ');
        }
    });

    // Look for widgets that need context toolbar or menu
    widgetList.filter(widget => needsContextMenu(widget)).forEach(widget => {
        const items = [];
        if (widget.hasBindings()) {
            items.push('modal');
        }
        if (widget.unwrap) {
            items.push('unwrap');
        }
        if (widget.prop('contexttoolbar')) {
            editor.ui.registry.addContextToolbar(`widgethub_ctb_${widget.key}`, {
                /** @param {HTMLElement} node */
                predicate: function(node) {
                    return matchesSelectors(node, widget.selectors);
                },
                items: items.map(e => `widgethub_${e}_btn`).join(' '),
                position: 'node'
            });
        }
    });


    // Dump all information
    console.log("All ui registries-->", editor.ui.registry.getAll());
};