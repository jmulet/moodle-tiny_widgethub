/* eslint-disable no-console */
/* eslint-disable max-len */
import ContextPropsModal from "./context_props_modal";
import {getWidgetDict} from "./options";

/**
 * @param {HTMLElement} elem
 * @param {string | string[]} selectors
 * @returns {boolean}
 */
const matchesSelectors = function(elem, selectors) {
    let selector = selectors;
    let extraQuery = [];
    if (Array.isArray(selectors)) {
        selector = selectors[0];
        if (selectors.length > 1) {
            extraQuery = selectors.slice(1);
        }
    }
    let match = elem.matches(selector);
    if (match) {
        extraQuery.forEach(e => {
            match = match && elem.querySelector(e);
        });
    }
    return match;
};

/**
 * Defines the type PathResult
 * @typedef {Object} PathResult
 * @property {HTMLElement} selectedElement - The DOM element from which the search starts.
 * @property {HTMLElement?} elem - Indicates the element corresponding to the selector of the widget found
 * @property {WidgetWrapper?} widget - The current widget definition associated with the elem
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
    const res = {
        selectedElement: selectedElement
    };
    let elem = selectedElement;
    const n = widgetList.length;
    while (elem !== null && elem !== undefined && elem.getAttribute("name") !== "BODY" && res.widget === undefined) {
        let i = 0;
        while (i < n && res.widget === undefined) {
            if (matchesSelectors(elem, widgetList[i].selectors)) {
                res.widget = widgetList[i];
                res.elem = elem;
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
    arrowUpFromBracket: 'arrow-up-from-bracket'
};

/**
 * Define icons used in the editor
 * @param {TinyMCE} editor - The tinyMCE editor instance
 */
const defineIcons = function(editor) {
    editor.ui.registry.addIcon(ICONS.gear, '<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 512 512"><path d="M495.9 166.6c3.2 8.7 .5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6 .3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z"/></svg>');
    editor.ui.registry.addIcon(ICONS.arrowUpFromBracket, '<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 448 512"><path d="M246.6 9.4c-12.5-12.5-32.8-12.5-45.3 0l-128 128c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 109.3 192 320c0 17.7 14.3 32 32 32s32-14.3 32-32l0-210.7 73.4 73.4c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-128-128zM64 352c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 64c0 53 43 96 96 96l256 0c53 0 96-43 96-96l0-64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 64c0 17.7-14.3 32-32 32L96 448c-17.7 0-32-14.3-32-32l0-64z"/></svg>');
};


/**
 * Decides if a widget needs some kind of context menu or toolbar
 * @param {WidgetWrapper} widget - The widget
 * @returns {boolean}
 */
const needsContextMenu = function(widget) {
    return widget.hasBindings() || widget.unpack?.trim();
};

const PredefinedActions = {
    /**
     * Unwraps the contents of a widget
     * @param {PathResult} context
     */
    unwrap: (context) => {
        // TODO custom unwraps
        const toUnpack = context.elem.find(context.widget.unwrap);
        context.elem.replaceWith(toUnpack);
    }
};

/**
 * Looks for widgets that need to display context toolbars or menus
 * and binds the corresponding actions.
 * @param {TinyMCE} editor
 */
export const initContextActions = function(editor) {
    /** @type {WidgetWrapper[]} */
    const widgetList = Object.values(getWidgetDict(editor));

    // Define icons
    defineIcons(editor);

    // keep track of the last found context
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
            if (!currentContext.widget) {
                currentContext = findWidgetOnEventPath(widgetList, editor.selection.getNode());
                if (!currentContext.widget) {
                    return;
                }
            }
            // Display modal dialog on this context
            await contextPropsModal.show(currentContext);
    }
    });

    // Generic button action for unwrapping those widgets that support this feature
    editor.ui.registry.addButton('widgethub_unwrap_btn', {
        icon: ICONS.arrowUpFromBracket,
        tooltip: 'Unwrap',
        onAction: function() {
            const ctx = findWidgetOnEventPath(widgetList, editor.selection.getNode());
            if (!ctx.widget) {
                return;
            }
            PredefinedActions.unwrap(ctx);
        }
    });
    editor.ui.registry.addMenuItem('widgethub_unwrap_item', {
        icon: ICONS.arrowUpFromBracket,
        text: 'Unwrap',
        onAction: function() {
            if (!currentContext.widget) {
                currentContext = findWidgetOnEventPath(widgetList, editor.selection.getNode());
                if (!currentContext.widget) {
                    return;
                }
            }
            PredefinedActions.unwrap(currentContext);
        }
    });

    editor.ui.registry.addContextMenu('tiny_widgethub', {
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
            if (widget.unwrap) {
                menuItems.push('unwrap');
            }
            return menuItems.map(e => `widgethub_${e}_item`).join(' ');
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