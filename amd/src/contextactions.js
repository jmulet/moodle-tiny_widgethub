/* eslint-disable camelcase */
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
import {get_strings} from 'core/str';
import Common from './common';

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
 * @property {string} [text] - Descriptive text for nested contextmenus
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
function registerIcons(editor) {
    editor.ui.registry.addIcon(ICONS.gear, '<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 512 512"><path d="M495.9 166.6c3.2 8.7 .5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6 .3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z"/></svg>');
    editor.ui.registry.addIcon(ICONS.arrowUpFromBracket, '<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 448 512"><path d="M246.6 9.4c-12.5-12.5-32.8-12.5-45.3 0l-128 128c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 109.3 192 320c0 17.7 14.3 32 32 32s32-14.3 32-32l0-210.7 73.4 73.4c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-128-128zM64 352c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 64c0 53 43 96 96 96l256 0c53 0 96-43 96-96l0-64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 64c0 17.7-14.3 32-32 32L96 448c-17.7 0-32-14.3-32-32l0-64z"/></svg>');
    editor.ui.registry.addIcon(ICONS.arrowUp, '<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 384 512"><path d="M214.6 41.4c-12.5-12.5-32.8-12.5-45.3 0l-160 160c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 141.2 160 448c0 17.7 14.3 32 32 32s32-14.3 32-32l0-306.7L329.4 246.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-160-160z"/></svg>');
    editor.ui.registry.addIcon(ICONS.arrowDown, '<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 384 512"><path d="M169.4 470.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 370.8 224 64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 306.7L54.6 265.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z"/></svg>');
    editor.ui.registry.addIcon(ICONS.arrowLeft, '<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 448 512"><path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/></svg>');
    editor.ui.registry.addIcon(ICONS.arrowRight, '<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 448 512"><path d="M438.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L338.8 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l306.7 0L233.4 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160z"/></svg>');
    editor.ui.registry.addIcon(ICONS.clone, '<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 512 512"><path d="M64 464l224 0c8.8 0 16-7.2 16-16l0-64 48 0 0 64c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 224c0-35.3 28.7-64 64-64l64 0 0 48-64 0c-8.8 0-16 7.2-16 16l0 224c0 8.8 7.2 16 16 16zM224 304l224 0c8.8 0 16-7.2 16-16l0-224c0-8.8-7.2-16-16-16L224 48c-8.8 0-16 7.2-16 16l0 224c0 8.8 7.2 16 16 16zm-64-16l0-224c0-35.3 28.7-64 64-64L448 0c35.3 0 64 28.7 64 64l0 224c0 35.3-28.7 64-64 64l-224 0c-35.3 0-64-28.7-64-64z"/></svg>');
    editor.ui.registry.addIcon(ICONS.cut, '<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 640 640"><path d="M256 320L216.5 359.5C203.9 354.6 190.3 352 176 352C114.1 352 64 402.1 64 464C64 525.9 114.1 576 176 576C237.9 576 288 525.9 288 464C288 449.7 285.3 436.1 280.5 423.5L563.2 140.8C570.3 133.7 570.3 122.3 563.2 115.2C534.9 86.9 489.1 86.9 460.8 115.2L320 256L280.5 216.5C285.4 203.9 288 190.3 288 176C288 114.1 237.9 64 176 64C114.1 64 64 114.1 64 176C64 237.9 114.1 288 176 288C190.3 288 203.9 285.3 216.5 280.5L256 320zM353.9 417.9L460.8 524.8C489.1 553.1 534.9 553.1 563.2 524.8C570.3 517.7 570.3 506.3 563.2 499.2L417.9 353.9L353.9 417.9zM128 176C128 149.5 149.5 128 176 128C202.5 128 224 149.5 224 176C224 202.5 202.5 224 176 224C149.5 224 128 202.5 128 176zM176 416C202.5 416 224 437.5 224 464C224 490.5 202.5 512 176 512C149.5 512 128 490.5 128 464C128 437.5 149.5 416 176 416z"/></svg>');
    editor.ui.registry.addIcon(ICONS.paste, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M128 64C92.7 64 64 92.7 64 128L64 448C64 483.3 92.7 512 128 512L240 512L240 288C240 226.1 290.1 176 352 176L416 176L416 128C416 92.7 387.3 64 352 64L128 64zM312 176L168 176C154.7 176 144 165.3 144 152C144 138.7 154.7 128 168 128L312 128C325.3 128 336 138.7 336 152C336 165.3 325.3 176 312 176zM352 224C316.7 224 288 252.7 288 288L288 512C288 547.3 316.7 576 352 576L512 576C547.3 576 576 547.3 576 512L576 346.5C576 329.5 569.3 313.2 557.3 301.2L498.8 242.7C486.8 230.7 470.5 224 453.5 224L352 224z"/></svg>');
}

/**
 * Determine if a widget contains bindings
 * @param {import('./options').Widget} widget
 * @returns {boolean}
 */
function hasBindings(widget) {
    return widget.parameters?.some(param => {
        if (param.type === 'repeatable') {
            const hasFieldBindings = param.fields?.some(f => f.bind !== undefined);
            return (typeof param.bind === 'object') ||
                (hasFieldBindings && typeof param.item_selector === 'string');
        } else {
            return param.bind !== undefined;
        }
    });
}

/**
 * Any menu item, different from |, is prefixed by componentName_ and ended with _item.
 * @param {string[]} menuItems
 * @returns {string[]}
 */
const prefixMenuItems = (menuItems) => menuItems.map(e => e === '|' ? '|' : `${componentName}_${e}`);

/**
 * Each MenuAction includes a condition property that is evaluated against
 * the current widget key to decide if the action should be executed.
 * @param {string | RegExp | (() => boolean) | undefined} condition
 * @param {string} value
 * @returns {boolean}
 */
const matchesCondition = function(condition, value) {
    if (typeof condition === 'string') {
        return condition.split(',').map(e => e.trim()).includes(value);
    } else if (condition instanceof RegExp) {
        return condition.test(value);
    } else if (typeof condition === 'function') {
        return condition();
    }
    return false;
};


/**
 * Common actions used in context menus
 * @param {import('./plugin').TinyMCE} editor
 * @param {import('./service/dom_service').DomSrv} domSrv
 * @param {{widget: import('./options').Widget | undefined, html: string | undefined}} widgetCutClipboard
 * @const widgetCutClipboard
 */
const predefinedActionsFactory = function(editor, domSrv, widgetCutClipboard) {
    /** @type {Record<string, Function>} */
    const factory = {
        /**
         * Unwraps or destroys the contents of a widget
         * @param {PathResult} path
         */
        unwrap: (path) => {
            if (!path?.elem || !path?.widget?.unwrap) {
                return;
            }
            /** @type {NodeListOf<Node>} */
            const nodes = path.elem.querySelectorAll(path.widget.unwrap);

            const parent = path.elem.parentNode;
            if (!parent) {
                return;
            }

            if (nodes.length === 0) {
                // Fallback: single text node
                const textNode = document.createTextNode(path.elem.textContent);
                path.elem.replaceWith(textNode);
            } else if (nodes.length === 1) {
                // Only one node: normal unwrap
                path.elem.replaceWith(nodes[0]);
            } else {
                // More than one node: wrap in DocumentFragment to replace
                const fragment = document.createDocumentFragment();
                nodes.forEach(node => fragment.appendChild(node));
                path.elem.replaceWith(fragment);
            }

            // Call any subscribers
            getListeners('widgetRemoved').forEach(listener => listener(editor, path.widget));
        },
        /**
         * Moves the selected element above in the parent container
         * unless it is the first one
         * Only on tabbed widgets!
         * If elem or any of its descendants references another element in
         * the widget, then it also must be moved before its sibling
         * @param {PathResult} path
         */
        movebefore: (path) => {
            const el = path?.targetElement;
            const root = path?.elem;
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
         * @param {PathResult} path
         */
        moveafter: (path) => {
            const el = path?.targetElement;
            const root = path?.elem;
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
         * @param {PathResult} path
         */
        insertafter: (path) => {
            const el = path?.targetElement;
            const root = path?.elem;
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
         * @param {PathResult} path
         */
        remove: (path) => {
            const el = path?.targetElement;
            const root = path?.elem;
            const widget = path?.widget;
            if (!el || !root || !widget) {
                return;
            }
            // Is it removing the entire widget?
            if (el === root) {
                root.remove();
                getListeners('widgetRemoved').forEach(listener => listener(editor, widget));
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
                getListeners('widgetRemoved').forEach(listener => listener(editor, widget));
            }
        },
        /**
         * Toggles a snippet as printable or not
         * @param {PathResult} path
         */
        printable: (path) => {
            const el = path?.elem;
            if (!el) {
                return;
            }
            el.classList.toggle('d-print-none');
        },
        /**
         * Removes the widget from DOM and stores HTML in the clipboard
         * @param {PathResult} path
         */
        cut: (path) => {
            const el = path?.elem;
            if (!el || !path?.widget) {
                return;
            }
            widgetCutClipboard.widget = path.widget;
            widgetCutClipboard.html = el.outerHTML;
            el.remove();

            // Update TinyMCE content and selection
            editor.nodeChanged();
            editor.undoManager.add();

            // Call any subscribers
            getListeners('widgetRemoved').forEach(listener => listener(editor, path.widget));
        }
    };
    // Alias.
    factory.moveup = factory.movebefore;
    factory.movedown = factory.moveafter;
    factory.moveleft = factory.movebefore;
    factory.moveright = factory.moveafter;
    factory.insert = factory.insertafter;
    return factory;
};

/**
 * ActionPaths allows to define more than one path per action.
 * @typedef {{editor: import('./plugin').TinyMCE, path?: PathResult, actionPaths: Record<string, PathResult[]>}} ItemMenuContext
 */

/**
 * Object containing localized UI strings.
 * @typedef {{
 *   properties: string, unwrap: string, moveup: string, movedown: string,
 *   moveafter: string, movebefore: string, insert: string, remove: string,
 *   printable: string, cut: string, paste: string
 * }} I18n
 */

export class ContextActionsManager {
    /**
     * @type {I18n}
     */
    i18n;
    /**
     * @type {ItemMenuContext}
     * @readonly
     */
    ctx;
    /**
     * @type {{widget: import('./options').Widget | undefined, html: string | undefined}}
     * @const
     */
    widgetCutClipboard;
    /**
     * @type {import('./options').Widget[]}
     * @const
     */
    widgetList;

    /**
     * @param {import('./plugin').TinyMCE} editor
     * @param {import('./service/dom_service').DomSrv} domSrv
     * @param {{get_strings: (arg: {key: string, component: string}[]) => Promise<string[]> }} translateSrv
     */
    constructor(editor, domSrv, translateSrv) {
        this.editor = editor;
        this.domSrv = domSrv;
        this.translateSrv = translateSrv;
        /**
         * Keep track of the last context found
         * @type {ItemMenuContext}
         */
        this.ctx = {
            actionPaths: {},
            editor: editor
        };
        /**
         * @type {{widget: import('./options').Widget | undefined, html: string | undefined}}
         */
        this.widgetCutClipboard = {
            widget: undefined,
            html: undefined
        };
        this.widgetList = Object.values(getWidgetDict(editor));
        this.i18n = Object.create(null);
    }

    async init() {
        this.i18n = await this.loadStrings();
        this.predefinedActions = predefinedActionsFactory(this.editor, this.domSrv, this.widgetCutClipboard);
        registerIcons(this.editor);
        this.registerUI();
        await this.registerExtensionMenus();
        this.registerContextMenus();
        this.registerContextToolbars();
    }

    /**
     * @returns {Promise<I18n>} - Translations
     */
    async loadStrings() {
        const keys = [
            'properties', 'unwrap', 'moveup', 'movedown', 'moveafter',
            'movebefore', 'insert', 'remove', 'printable', 'cut', 'paste'
        ];
        const values = await this.translateSrv.get_strings(keys.map(key => ({key, component})));
        // @ts-ignore
        return Object.fromEntries(keys.map((k, i) => [k, values[i]]));
    }

    showPropertiesAction = async() => {
        const path = this.domSrv.findWidgetOnEventPath(this.widgetList, this.editor.selection.getNode());
        this.ctx.path = path;
        if (!path.widget) {
            return;
        }
        // Display modal dialog on this context
        const widgetPropertiesCtrl = getWidgetPropertiesCtrl(this.editor);
        await widgetPropertiesCtrl.show(path);
    };

    pasteAction() {
        const html = this.widgetCutClipboard?.html;
        const widget = this.widgetCutClipboard?.widget;
        if (!html || !widget) {
            return;
        }
        // Insert HTML at current position
        this.editor.insertContent(html);
        this.editor.undoManager.add();
        this.editor.nodeChanged();
        // Call any subscribers
        getListeners('widgetInserted').forEach(listener => listener(this.editor, widget));
        this.widgetCutClipboard.widget = undefined;
        this.widgetCutClipboard.html = undefined;
    }

    /**
     * It creates menuItem, nestedMenuItem, Button and SplitButton to handle
     * all possible scenarios regarding this action.
     * @param {{name: string, icon: string, tooltip: string, text?: string, onAction: (localPath?: PathResult) => void }} spec
     */
    registerUIElement(spec) {
        this.editor.ui.registry.addButton(`${componentName}_${spec.name}_btn`, {
            icon: spec.icon,
            tooltip: spec.tooltip,
            onAction: spec.onAction
        });
        this.editor.ui.registry.addMenuItem(`${componentName}_${spec.name}_item`, {
            icon: spec.icon,
            tooltip: spec.tooltip,
            onAction: spec.onAction
        });
        this.editor.ui.registry.addNestedMenuItem(`${componentName}_${spec.name}_nesteditem`, {
            icon: spec.icon,
            tooltip: spec.tooltip,
            getSubmenuItems: () => {
                /** @type {any[]} */
                const items = [];
                this.ctx.actionPaths[spec.name]?.forEach(path => {
                    items.push({
                        type: 'menuitem',
                        text: path.text,
                        tooltip: spec.name + '/' + (path.widget?.name ?? ''),
                        onAction: () => spec.onAction(path)
                    });
                });
                return items;
            }
        });
    }

    /**
     * Defines a generic action
     * @param {string} name
     * @returns {(path?: PathResult) => void}
     */
    genericAction(name) {
        /**
         * @param {PathResult} [path]
         */
        return (path) => {
            path = path ?? this.ctx.path;
            if (!path?.widget) {
                path = this.domSrv.findWidgetOnEventPath(this.widgetList, this.editor.selection.getNode());
                if (!path?.widget) {
                    return;
                }
            }
            const action = this.predefinedActions?.[name];
            if (action) {
                action(path);
                // Call any subscriber
                getListeners('ctxAction').forEach(listener => listener(this.editor, path?.widget));
            }
        };
    }

    registerUI() {
        // Generic button action for opening the properties modal.
        this.registerUIElement({
            name: 'modal',
            icon: ICONS.gear,
            tooltip: this.i18n.properties,
            onAction: this.showPropertiesAction
        });
        // Only one instance allowed for paste.
        this.editor.ui.registry.addMenuItem(`${componentName}_paste_item`, {
            icon: ICONS.paste,
            text: this.i18n.paste,
            onAction: this.pasteAction
        });
        // Generic button action for unwrapping those widgets that support this feature
        this.registerUIElement({
            name: 'unwrap',
            icon: ICONS.arrowUpFromBracket,
            tooltip: this.i18n.unwrap,
            onAction: this.genericAction('unwrap')
        });
        this.registerUIElement({
            name: 'moveup',
            icon: ICONS.arrowUp,
            tooltip: this.i18n.moveup,
            onAction: this.genericAction('movebefore')
        });
        this.registerUIElement({
            name: 'movedown',
            icon: ICONS.arrowDown,
            tooltip: this.i18n.movedown,
            onAction: this.genericAction('moveafter')
        });
        this.registerUIElement({
            name: 'movebefore',
            icon: ICONS.arrowLeft,
            tooltip: this.i18n.movebefore,
            onAction: this.genericAction('movebefore')
        });
        this.registerUIElement({
            name: 'moveafter',
            icon: ICONS.arrowRight,
            tooltip: this.i18n.moveafter,
            onAction: this.genericAction('moveafter')
        });
        this.registerUIElement({
            name: 'insertafter',
            icon: ICONS.clone,
            tooltip: this.i18n.insert,
            onAction: this.genericAction('insertafter')
        });
        this.registerUIElement({
            name: 'remove',
            icon: ICONS.remove,
            tooltip: this.i18n.remove,
            onAction: this.genericAction('remove')
        });
        // Only one instance allowed. At root level.
        this.registerUIElement({
            name: 'cut',
            icon: ICONS.cut,
            tooltip: this.i18n.cut,
            onAction: this.genericAction('cut')
        });
        // Only one instance allowed. At root level.
        this.editor.ui.registry.addToggleMenuItem(`${componentName}_printable_item`, {
            icon: 'print',
            text: this.i18n.printable,
            onAction: this.genericAction('printable'),
            onSetup: (/** @type {*} */ api) => {
                let toggleState = true;
                if (this.ctx.path?.elem?.classList?.contains('d-print-none')) {
                    toggleState = false;
                }
                api.setActive(toggleState);
                return () => ({});
            }
        });
    }


    async registerExtensionMenus() {
        // Let extensions register additional menuItem and nestedMenuItem.
        /** @type {import('./extension').UserDefinedItem[]} */
        this.widgetsWithExtensions = (
            await Promise.all(getMenuItemProviders().map(provider => provider(this.ctx)))
        ).flat();
        this.widgetsWithExtensions.forEach(menuItem => {
            if (menuItem.subMenuItems) {
                // It is a nested menu.
                this.editor.ui.registry.addNestedMenuItem(`${componentName}_${menuItem.name}`, {
                    icon: menuItem.icon,
                    text: menuItem.title,
                    getSubmenuItems: menuItem.subMenuItems
                });
            } else if (menuItem.onAction) {
                // It is a simple menu item.
                this.editor.ui.registry.addMenuItem(`${componentName}_${menuItem.name}`, {
                    icon: menuItem.icon,
                    text: menuItem.title,
                    onAction: menuItem.onAction
                });
            }
        });
    }

    /**
     * @param {HTMLElement} element - Element that triggers the context menu
     * @param {PathResult} path
     * @returns {string[]}
     */
    populateMenuItems(element, path) {
        /** @type {string[]} */
        const menuItems = [];
        if (!path.widget) {
            return menuItems;
        }
        if (hasBindings(path.widget)) {
            this.ctx.actionPaths.modal.push({...path});
        }
        // Unwrap action always to the end
        if (path.widget.unwrap) {
            menuItems.push('unwrap');
            this.ctx.actionPaths.unwrap = this.ctx.actionPaths.unwrap || [];
            this.ctx.actionPaths.unwrap.push({...path});
        }
        // Now look for contextmenu property in widget definition
        /** @type {import('./options').Action[] | undefined} */
        let contextmenu = path.widget.prop('contextmenu');
        if (!contextmenu) {
            return menuItems;
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
            const newActionsToAdd = cm.actions.split(/\s+/).filter(Boolean)
                // Moveleft/right should be mapped into movebefore/moveafter
                // insert should be mapped into insertafter
                .map(action => {
                    action = action.trim().toLowerCase();
                    if (action === 'moveleft') {
                        return 'movebefore';
                    } else if (action === 'moveright') {
                        return 'moveafter';
                    } else if (action === 'insert') {
                        return 'insertafter';
                    }
                    return action;
                })
                // Do not insert multiple times the same action
                .filter(action => action === '|' || !menuItems.includes(action));

            menuItems.push(...newActionsToAdd);

            // Register the new paths of every action
            newActionsToAdd.filter(e => e !== '|').forEach((/** @type {string} */ e) => {
                path.targetElement = targetElem;
                this.ctx.actionPaths[e] = this.ctx.actionPaths[e] || [];
                this.ctx.actionPaths[e].push({...path, text: cm.description});
            });
        });
        return menuItems;
    }


    /**
     * @param {HTMLElement} element
     * @returns {string[]}
     */
    contextMenuUpdate(element) {
        /** @type {string[]} */
        let menuItems = [];

        // Is there anything in widget Node clipboard?
        if (this.widgetCutClipboard.widget) {
            menuItems.push('paste_item');
        }
        // Look for a context
        this.ctx.path = this.domSrv.findWidgetOnEventPath(this.widgetList, element);
        this.ctx.actionPaths = {
            modal: []
        };
        const widget = this.ctx.path.widget;
        if (!widget) {
            // Widget not found in the searchPath.
            return prefixMenuItems(menuItems);
        }

        // Does this widget bubble? Look for a parent widget named widget.bubbles
        /** @type {PathResult | null} */
        let parentPath = null;
        if (widget.prop('bubbles')) {
            const parentElem = this.ctx.path?.elem?.parentElement;
            if (parentElem) {
                const p = this.domSrv.findWidgetOnEventPath(this.widgetList, parentElem);
                if (p && p.widget?.key === widget.prop('bubbles')) {
                    parentPath = {...p};
                }
            }
        }

        if (parentPath) {
            // Give precedence to the parent menus.
            menuItems.push(...this.populateMenuItems(element, parentPath));
        }
        // Populate with selected widget.
        menuItems.push(...this.populateMenuItems(element, this.ctx.path));

        // Deal with repeated menu items. Add suffix _item or _nesteditem.
        menuItems = menuItems.map(e => {
            if (e === '|') {
                return e;
            } else if (['cut', 'paste'].includes(e)) {
                // Only one instance is allowed for these actions.
                return `${e}_item`;
            } else if (this.ctx.actionPaths[e]?.length > 1) {
                return `${e}_nesteditem`;
            }
            return `${e}_item`;
        });


        // Check if the current widget has any action registered by extensions
        const actionNames = this.widgetsWithExtensions
            ?.filter(e => matchesCondition(e.condition, widget.key))
            .map(e => e.name) ?? [];
        menuItems.push(...actionNames);

        return prefixMenuItems(menuItems);
    }


    registerContextMenus() {
        // Creates the actual context menu items.
        this.editor.ui.registry.addContextMenu(`${componentName}_cm`, {
            /** @param {HTMLElement} element */
            update: (element) => this.contextMenuUpdate(element).join(' ')
        });
    }

    registerContextToolbars() {
        // Look for widgets that need a context toolbar
        this.widgetList.filter(widget => widget.prop('contexttoolbar') && !widget.isFilter()).forEach(widget => {
            const items = [];
            if (hasBindings(widget)) {
                items.push('modal');
            }
            /** @type {import('./options').Action[]} */
            const contextToolbar = widget.prop('contexttoolbar');
            contextToolbar.filter(ctbSpec => !ctbSpec.predicate).forEach(ctbSpec => {
                const actionsToAdd = ctbSpec.actions.toLowerCase().split(/\s+/).filter(Boolean)
                    .map(e => e.trim())
                    .filter(e => ['|', 'cut', 'printable'].includes(e));
                items.push(actionsToAdd);
            });
            if (widget.unwrap) {
                items.push('unwrap');
            }
            this.editor.ui.registry.addContextToolbar(`${componentName}_ctb_${widget.key}`, {
                /** @param {HTMLElement} node */
                predicate: function(node) {
                    const path = this.domSrv.findWidgetOnEventPath(this.widgetList, node);
                    // Only activate if the first widget found in path is the current one
                    return path.widget?.key === widget.key;
                },
                items: items.map(e => e === '|' ? '|' : `${componentName}_${e}_btn`).join(' '),
                position: 'node',
                scope: 'node',
            });
        });
    }
}


const contextMenuManagerInstances = new Map();
/**
 * @param {import('./plugin').TinyMCE} editor
 * @returns {ContextActionsManager}
 */
export function getContextMenuManager(editor) {
   let instance = contextMenuManagerInstances.get(editor);
   if (!instance) {
      // @ts-ignore
      instance = new ContextActionsManager(editor, getDomSrv(), {get_strings});
      contextMenuManagerInstances.set(editor, instance);
   }
   return instance;
}