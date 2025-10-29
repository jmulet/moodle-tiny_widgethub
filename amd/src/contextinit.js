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

import {getWidgetDict} from './options';
import {getDomSrv} from './service/dom_service';
import {getWidgetPropertiesCtrl} from './controller/widgetproperties_ctrl';
import {getMenuItemProviders, getListeners} from './extension';
import Common from './common';
// eslint-disable-next-line camelcase
import {get_strings} from 'core/str';

const {component, componentName} = Common;

/**
 * Tiny WidgetHub plugin.
 *
 * @module      tiny_widgethub/plugin
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Defines the type PathResult
 * @typedef {Object} PathResult
 * @property {Element} selectedElement - The DOM element from which the search starts.
 * @property {Element} [elem] - Indicates the element corresponding to the selector of the widget found
 * @property {Element | null | undefined} [targetElement] - Indicates the element corresponding the intermediate selector
 * @property {import('./options').Widget=} widget - The current widget definition associated with the elem
 */

/**
 * @typedef {Object} ICONS
 * @property {string} gear
 * @property {string} arrowUpFromBracket
 * @property {string} arrowUp
 * @property {string} arrowDown
 * @property {string} arrowLeft
 * @property {string} arrowRight
 * @property {string} remove
 * @property {string} clone
 */
const ICONS = {
    gear: 'gear',
    arrowUpFromBracket: 'arrow-up-from-bracket',
    arrowUp: 'arrow-up',
    arrowDown: 'arrow-down',
    arrowLeft: 'arrow-left',
    arrowRight: 'arrow-right',
    remove: 'remove',
    clone: 'clone',
    cut: 'cut',
    paste: 'paste'
};

/**
 * Define icons used by the context menus. Source: FontAwesome 6
 * <!--!Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
 * @param {import("./plugin").TinyMCE} editor - The tinyMCE editor instance
 */
const defineIcons = function(editor) {
    editor.ui.registry.addIcon(ICONS.gear, '<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 512 512"><path d="M495.9 166.6c3.2 8.7 .5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6 .3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z"/></svg>');
    editor.ui.registry.addIcon(ICONS.arrowUpFromBracket, '<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 448 512"><path d="M246.6 9.4c-12.5-12.5-32.8-12.5-45.3 0l-128 128c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 109.3 192 320c0 17.7 14.3 32 32 32s32-14.3 32-32l0-210.7 73.4 73.4c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-128-128zM64 352c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 64c0 53 43 96 96 96l256 0c53 0 96-43 96-96l0-64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 64c0 17.7-14.3 32-32 32L96 448c-17.7 0-32-14.3-32-32l0-64z"/></svg>');
    editor.ui.registry.addIcon(ICONS.arrowUp, '<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 384 512"><path d="M214.6 41.4c-12.5-12.5-32.8-12.5-45.3 0l-160 160c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 141.2 160 448c0 17.7 14.3 32 32 32s32-14.3 32-32l0-306.7L329.4 246.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-160-160z"/></svg>');
    editor.ui.registry.addIcon(ICONS.arrowDown, '<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 384 512"><path d="M169.4 470.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 370.8 224 64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 306.7L54.6 265.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z"/></svg>');
    editor.ui.registry.addIcon(ICONS.arrowLeft, '<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 448 512"><path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/></svg>');
    editor.ui.registry.addIcon(ICONS.arrowRight, '<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 448 512"><path d="M438.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L338.8 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l306.7 0L233.4 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160z"/></svg>');
    editor.ui.registry.addIcon(ICONS.clone, '<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 512 512"><path d="M64 464l224 0c8.8 0 16-7.2 16-16l0-64 48 0 0 64c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 224c0-35.3 28.7-64 64-64l64 0 0 48-64 0c-8.8 0-16 7.2-16 16l0 224c0 8.8 7.2 16 16 16zM224 304l224 0c8.8 0 16-7.2 16-16l0-224c0-8.8-7.2-16-16-16L224 48c-8.8 0-16 7.2-16 16l0 224c0 8.8 7.2 16 16 16zm-64-16l0-224c0-35.3 28.7-64 64-64L448 0c35.3 0 64 28.7 64 64l0 224c0 35.3-28.7 64-64 64l-224 0c-35.3 0-64-28.7-64-64z"/></svg>');
    editor.ui.registry.addIcon(ICONS.cut, '<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 640 640"><path d="M256 320L216.5 359.5C203.9 354.6 190.3 352 176 352C114.1 352 64 402.1 64 464C64 525.9 114.1 576 176 576C237.9 576 288 525.9 288 464C288 449.7 285.3 436.1 280.5 423.5L563.2 140.8C570.3 133.7 570.3 122.3 563.2 115.2C534.9 86.9 489.1 86.9 460.8 115.2L320 256L280.5 216.5C285.4 203.9 288 190.3 288 176C288 114.1 237.9 64 176 64C114.1 64 64 114.1 64 176C64 237.9 114.1 288 176 288C190.3 288 203.9 285.3 216.5 280.5L256 320zM353.9 417.9L460.8 524.8C489.1 553.1 534.9 553.1 563.2 524.8C570.3 517.7 570.3 506.3 563.2 499.2L417.9 353.9L353.9 417.9zM128 176C128 149.5 149.5 128 176 128C202.5 128 224 149.5 224 176C224 202.5 202.5 224 176 224C149.5 224 128 202.5 128 176zM176 416C202.5 416 224 437.5 224 464C224 490.5 202.5 512 176 512C149.5 512 128 490.5 128 464C128 437.5 149.5 416 176 416z"/></svg>');
    editor.ui.registry.addIcon(ICONS.paste, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M128 64C92.7 64 64 92.7 64 128L64 448C64 483.3 92.7 512 128 512L240 512L240 288C240 226.1 290.1 176 352 176L416 176L416 128C416 92.7 387.3 64 352 64L128 64zM312 176L168 176C154.7 176 144 165.3 144 152C144 138.7 154.7 128 168 128L312 128C325.3 128 336 138.7 336 152C336 165.3 325.3 176 312 176zM352 224C316.7 224 288 252.7 288 288L288 512C288 547.3 316.7 576 352 576L512 576C547.3 576 576 547.3 576 512L576 346.5C576 329.5 569.3 313.2 557.3 301.2L498.8 242.7C486.8 230.7 470.5 224 453.5 224L352 224z"/></svg>');
};

/**
 * @param {import('./options').Widget} widget
 * @returns {boolean}
 */
function hasBindings(widget) {
    return widget.parameters?.some(param => {
        if (param.type === 'repeatable') {
            const hasFieldBindings = param.fields?.some(f => f.bind !== undefined);
            return typeof param.bind === 'object' || (hasFieldBindings && typeof param.item_selector === 'string');
        } else {
            return param.bind !== undefined;
        }
    });
}

/**
 * Decides if a widget needs some kind of context menu or toolbar
 * @param {import('./options').Widget} widget - The widget
 * @returns {boolean}
 */
const needsContextMenu = function(widget) {
    return widget.hasBindings() || (widget.unwrap ?? '').trim().length > 0;
};

/**
 * @param {string | RegExp | (() => boolean) | undefined} condition
 * @param {string} key
 * @returns {boolean}
 */
const matchesCondition = function(condition, key) {
    if (typeof condition === 'string') {
        return condition.split(',').map(e => e.trim()).includes(key);
    } else if (condition instanceof RegExp) {
        return condition.test(key);
    } else if (typeof condition === 'function') {
        return condition();
    }
    return false;
};

/**
 * @type {string[]}
 */
const widgetCutClipboard = [];

/**
 * @param {import('./plugin').TinyMCE} editor
 * @param {import('./service/dom_service').DomSrv} domSrv
 */
const predefinedActionsFactory = function(editor, domSrv) {
    /** @type {Record<string, Function>} */
    const factory = {
        /**
         * Unwraps or destroys the contents of a widget
         * @param {PathResult} context
         */
        unwrap: (context) => {
            if (!context?.elem || !context?.widget?.unwrap) {
                return;
            }
            /** @type {NodeListOf<Node>} */
            const nodes = context.elem.querySelectorAll(context.widget.unwrap);

            const parent = context.elem.parentNode;
            if (!parent) {
                return;
            }

            if (nodes.length === 0) {
                // Fallback: single text node
                const textNode = document.createTextNode(context.elem.textContent);
                context.elem.replaceWith(textNode);
            } else if (nodes.length === 1) {
                // Only one node: normal unwrap
                context.elem.replaceWith(nodes[0]);
            } else {
                // More than one node: wrap in DocumentFragment to replace
                const fragment = document.createDocumentFragment();
                nodes.forEach(node => fragment.appendChild(node));
                context.elem.replaceWith(fragment);
            }

            // Call any subscribers
            getListeners('widgetRemoved').forEach(listener => listener(editor, context.widget));
        },
        /**
         * Moves the selected element above in the parent container
         * unless it is the first one
         * Only on tabbed widgets!
         * If elem or any of its descendants references another element in
         * the widget, then it also must be moved before its sibling
         * @param {PathResult} context
         */
        movebefore: (context) => {
            const el = context?.targetElement;
            const root = context?.elem;
            if (!el || !root) {
                return;
            }
            const prev = el.previousElementSibling;
            if (prev) {
                // Swap el and prev (move el before prev)
                el.parentNode?.insertBefore(el, prev);
                if (prev.closest(".nav")) {
                    domSrv.findReferences(el, root).forEach(ref => {
                        const prev2 = ref.previousElementSibling;
                        if (prev2) {
                            ref.parentNode?.insertBefore(ref, prev2);
                        }
                    });
                }
            }
        },
        /**
         * Moves the selected element above in the parent container
         * unless it is the first one
         * Only on tabbed widgets!
         * If elem or any of its descendants references another element in
         * the widget, then it also must be moved after its sibling
         * @param {PathResult} context
         */
        moveafter: (context) => {
            const el = context?.targetElement;
            const root = context?.elem;
            if (!el || !root) {
                return;
            }

            const next = el.nextElementSibling;
            if (next) {
                // Move `el` after `next` (swap their order)
                next.parentNode?.insertBefore(next, el);

                // If inside a `.nav` ancestor, reorder references too
                if (next.closest(".nav")) {
                    domSrv.findReferences(el, root).forEach(ref => {
                        const next2 = ref.nextElementSibling;
                        if (next2) {
                            next2.parentNode?.insertBefore(next2, ref);
                        }
                    });
                }
            }
        },
        /**
         * Inserts a clone of the selected element after it
         * @param {PathResult} context
         */
        insertafter: (context) => {
            const el = context?.targetElement;
            const root = context?.elem;
            if (!el || !root) {
                return;
            }

            /** @type {Record<string, string>} */
            const idMap = {};
            const clone = domSrv.smartClone(el, root, idMap);

            // Insert the clone *after* the original element
            el.parentNode?.insertBefore(clone, el.nextSibling);

            // Remove "active" and "show" classes
            clone.classList.remove("active", "show");
        },
        /**
         * Removes the selected element
         * @param {PathResult} context
         */
        remove: (context) => {
            const el = context?.targetElement;
            const root = context?.elem;
            if (!el || !root) {
                return;
            }

            // Remove any references inside the widget
            domSrv.findReferences(el, root).forEach(ref => ref.remove());

            // Remove the element itself
            const parent = el.parentNode;
            el?.remove();

            // If parent is now empty, remove the root widget
            if (parent && parent.children.length === 0) {
                root.remove();
            }
        },
        /**
         * Toggles a snippet as printable or not
         * @param {PathResult} context
         */
        printable: (context) => {
            const el = context?.elem;
            if (!el) {
                return;
            }
            el.classList.toggle('d-print-none');
        },
        /**
         * Removes the widget from DOM and stores HTML in the clipboard
         * @param {PathResult} context
         */
        cut: (context) => {
            const el = context?.elem;
            if (!el) {
                return;
            }
            widgetCutClipboard.push(el.outerHTML);
            el.remove();

            // Update TinyMCE content and selection
            editor.nodeChanged();
            editor.undoManager.add();
        }
    };
    factory.moveup = factory.movebefore;
    factory.movedown = factory.moveafter;
    // Alias.
    factory.moveleft = factory.movebefore;
    factory.moveright = factory.moveafter;
    return factory;
};

/**
 * @typedef {{editor: import('./plugin').TinyMCE, path?: PathResult, actionPaths: Record<string, PathResult>}} ItemMenuContext
 */

/**
 * Looks for widgets that need to display context toolbars or menus
 * and binds the corresponding actions.
 * @param {import("./plugin").TinyMCE} editor
 */
export async function initContextActions(editor) {
    // Setup context shared by the entire structure of menus
    /**
     * Keep track of the last context found
     * @type {ItemMenuContext}
     */
    const ctx = {
        actionPaths: {},
        editor: editor
    };

    // Define icons
    defineIcons(editor);

    // Get translations
    const [
        strProperties, strUnwrap, strMoveUp, strMoveDown, strMoveAfter, strMoveBefore,
        strInsert, strRemove, strPrintable, strCut, strPaste
    ] = await get_strings([
        {key: 'properties', component},
        {key: 'unwrap', component},
        {key: 'moveup', component},
        {key: 'movedown', component},
        {key: 'moveafter', component},
        {key: 'movebefore', component},
        {key: 'insert', component},
        {key: 'remove', component},
        {key: 'printable', component},
        {key: 'cut', component},
        {key: 'paste', component}
    ]);

    const widgetList = Object.values(getWidgetDict(editor));
    const domSrv = getDomSrv();

    /** @type {Record<string, Function>} */
    const predefinedActions = predefinedActionsFactory(editor, domSrv);

    const showPropertiesAction = async() => {
        const path = domSrv.findWidgetOnEventPath(widgetList, editor.selection.getNode());
        ctx.path = path;
        if (!path.widget) {
            return;
        }
        // Display modal dialog on this context
        const widgetPropertiesCtrl = getWidgetPropertiesCtrl(editor);
        await widgetPropertiesCtrl.show(path);
    };

    // Generic button action for opening the properties modal
    editor.ui.registry.addButton(`${componentName}_modal_btn`, {
        icon: ICONS.gear,
        tooltip: strProperties,
        onAction: showPropertiesAction
    });
    editor.ui.registry.addMenuItem(`${componentName}_modal_item`, {
        icon: ICONS.gear,
        text: strProperties,
        onAction: showPropertiesAction
    });
    editor.ui.registry.addMenuItem(`${componentName}_paste_item`, {
        icon: ICONS.paste,
        text: strPaste,
        onAction: () => {
            const html = widgetCutClipboard[0];
            if (!html) {
                return;
            }
            // Insert HTML at current position
            editor.insertContent(html);
            editor.undoManager.add();
            editor.nodeChanged();
            widgetCutClipboard.splice(0, 1);
        }
    });

    /**
     * Defines a generic action
     * @param {string} name
     */
    function genericAction(name) {
        return function() {
            if (!ctx.path?.widget) {
                ctx.path = domSrv.findWidgetOnEventPath(widgetList, editor.selection.getNode());
                if (!ctx.path?.widget) {
                    return;
                }
            }
            const action = predefinedActions[name];
            if (action) {
                action(ctx.path);
                // Call any subscriber
                getListeners('ctxAction').forEach(listener => listener(editor, ctx.path?.widget));
            }
        };
    }

    // Generic button action for unwrapping those widgets that support this feature
    editor.ui.registry.addButton(`${componentName}_unwrap_btn`, {
        icon: ICONS.arrowUpFromBracket,
        tooltip: strUnwrap,
        onAction: genericAction('unwrap')
    });
    editor.ui.registry.addMenuItem(`${componentName}_unwrap_item`, {
        icon: ICONS.arrowUpFromBracket,
        text: strUnwrap,
        onAction: genericAction('unwrap')
    });
    editor.ui.registry.addMenuItem(`${componentName}_moveup_item`, {
        icon: ICONS.arrowUp,
        text: strMoveUp,
        onAction: genericAction('movebefore')
    });
    editor.ui.registry.addMenuItem(`${componentName}_movedown_item`, {
        icon: ICONS.arrowDown,
        text: strMoveDown,
        onAction: genericAction('moveafter')
    });
   editor.ui.registry.addMenuItem('widgethub_movebefore_item', {
        icon: ICONS.arrowLeft,
        text: strMoveBefore,
        onAction: genericAction('movebefore')
    });
    editor.ui.registry.addMenuItem('widgethub_moveafter_item', {
        icon: ICONS.arrowRight,
        text: strMoveAfter,
        onAction: genericAction('moveafter')
    });
    editor.ui.registry.addMenuItem(`${componentName}_insertafter_item`, {
        icon: ICONS.clone,
        text: strInsert,
        onAction: genericAction('insertafter')
    });
    editor.ui.registry.addMenuItem(`${componentName}_remove_item`, {
        icon: ICONS.remove,
        text: strRemove,
        onAction: genericAction('remove')
    });
    editor.ui.registry.addMenuItem(`${componentName}_cut_item`, {
        icon: ICONS.cut,
        text: strCut,
        onAction: genericAction('cut')
    });
    editor.ui.registry.addToggleMenuItem(`${componentName}_printable_item`, {
        icon: 'print',
        text: strPrintable,
        onAction: genericAction('printable'),
        onSetup: (/** @type {*} */ api) => {
            let toggleState = true;
            if (ctx.path?.elem?.classList?.contains('d-print-none')) {
                toggleState = false;
            }
            api.setActive(toggleState);
            return () => ({});
        }
    });

    // Let extensions to register additional menuItem and nestedMenuItem
    /** @type {import('./extension').UserDefinedItem[]} */
    const widgetsWithExtensions = (
        await Promise.all(getMenuItemProviders().map(provider => provider(ctx)))
    ).flat();
    widgetsWithExtensions.forEach(menuItem => {
        if (menuItem.subMenuItems) {
                // It is a nested menu.
                editor.ui.registry.addNestedMenuItem(`${componentName}_${menuItem.name}`, {
                    icon: menuItem.icon,
                    text: menuItem.title,
                    getSubmenuItems: menuItem.subMenuItems
                });
            } else if (menuItem.onAction) {
                // It is a simple menu item.
                editor.ui.registry.addMenuItem(`${componentName}_${menuItem.name}`, {
                    icon: menuItem.icon,
                    text: menuItem.title,
                    onAction: menuItem.onAction
                });
            }
    });

    editor.ui.registry.addContextMenu(component, {
        /** @param {HTMLElement} element */
        update: (element) => {
            /** @type {string[]} */
            let menuItems = [];

            // Is there anything in widget Node clipboard?
            if (widgetCutClipboard.length) {
                menuItems.push('paste');
            }
            // Look for a context
            ctx.path = domSrv.findWidgetOnEventPath(widgetList, element);
            if (!ctx.path?.widget || ctx.path.widget.prop("contexttoolbar")) {
                // Widget not found in the searchPath or it must be displayed as toolbar
                return menuItems.map(e => e === '|' ? '|' : `${componentName}_${e}_item`).join(' ');
            }
            const widget = ctx.path.widget;
            if (hasBindings(widget)) {
                menuItems.push('modal');
            }
            // Does this widget bubble?
            /** @type {PathResult | null} */
            let parentPath = null;
            if (widget.prop('bubbles')) {
                const parentElem = ctx.path?.elem?.parentElement;
                if (parentElem) {
                    const p = domSrv.findWidgetOnEventPath(widgetList, parentElem);
                    if (p && p.widget?.key === widget.prop('bubbles')) {
                        parentPath = p;
                    }
                }
            }

            const populateMenuItems = function(/** @type {PathResult} **/ path) {
                // Now look for contextmenu property in widget definition
                /** @type {import('./options').Action[] | undefined} */
                let contextmenu = path.widget?.prop('contextmenu');
                if (!contextmenu) {
                    return;
                }
                if (!Array.isArray(contextmenu)) {
                    contextmenu = [contextmenu];
                }
                contextmenu.forEach(cm => {
                    // Does the element matches the predicate?
                    /** @type {Element | null} */
                    let targetElem = null;
                    // If predicate is unset then use the widget root elem
                    if (!cm.predicate) {
                        targetElem = path?.elem ?? null;
                    } else if (element.matches(cm.predicate)) {
                        targetElem = element;
                    } else {
                        targetElem = element.closest(cm.predicate);
                    }
                    if (!targetElem) {
                        return;
                    }
                    const newActionsToAdd = cm.actions.split(' ')
                        .map(e => e.trim())
                        // Moveleft/right should be mapped into movebefore/moveafter
                        .map(action => {
                            if (action === 'moveleft') {
                                return 'movebefore';
                            }
                            if (action === 'moveright') {
                                return 'moveafter';
                            }
                            return action;
                        })
                        // Never duplicate actions from different sources.
                        .filter(e => e === '|' || !menuItems.includes(e));
                    menuItems.push(...newActionsToAdd);

                    // Register the new paths of every action
                    newActionsToAdd.filter(e => e !== '|').forEach((/** @type {string} */ e) => {
                        path.targetElement = targetElem;
                        ctx.actionPaths[e] = {...path};
                    });
                });
            };

            if (parentPath) {
                // Give precedence to the parent menus.
                populateMenuItems(parentPath);
            }
            populateMenuItems(ctx.path);

            menuItems = menuItems.map(e => e === '|' ? '|' : `${componentName}_${e}_item`);
            // Check if the current widget has any action registered by extensions
            const actionNames = widgetsWithExtensions
                .filter(e => matchesCondition(e.condition, widget.key))
                .map(e => `${componentName}_${e.name}`);
            menuItems.push(...actionNames);

            // Unwrap action always to the end
            if (widget.unwrap) {
                menuItems.push(`${componentName}_unwrap_item`);
            }
            return menuItems.join(' ');
        }
    });

    // Look for widgets that need context toolbar
    widgetList.filter(widget => needsContextMenu(widget)).forEach(widget => {
        const items = [];
        if (hasBindings(widget)) {
            items.push('modal');
        }
        if (widget.unwrap) {
            items.push('unwrap');
        }
        if (widget.prop("contexttoolbar")) {
            editor.ui.registry.addContextToolbar(`${componentName}_ctb_${widget.key}`, {
                /** @param {HTMLElement} node */
                predicate: function(node) {
                    return domSrv.matchesSelectors(node, widget.selectors);
                },
                items: items.map(e => `${componentName}_${e}_btn`).join(' '),
                position: 'node'
            });
        }
    });
}