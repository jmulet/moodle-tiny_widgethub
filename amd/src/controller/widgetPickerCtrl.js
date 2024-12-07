/* eslint-disable max-len */
/* eslint-disable no-eq-null */
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
import {get_string} from 'core/str';
import {getWidgetParamsFactory} from '../controller/widgetParamsCtrl';
import {getEditorOptions} from '../options';
import {getModalSrv} from '../service/modalSrv';
import {getTemplateSrv} from '../service/templateSrv';
import {getUserStorage} from '../service/userStorageSrv';
import {debounce, genID, hashCode, searchComp, toggleClass} from '../util';

/**
 * @param {HTMLElement} el
 * @param {boolean} visible
 */
export const setVisibility = function(el, visible) {
    if(!el) {
        return;
    }
    if (visible) {
        el.classList.remove("d-none");
    } else {
        el.classList.add("d-none");
    }
};

export class WidgetPickerCtrl {
    /** @type {import('../service/modalSrv').ModalDialogue} */
    // @ts-ignore
    modal;

    /**
     * @param {import('../plugin').TinyMCE} editor
     * @param {import('../options').EditorOptions} editorOptions
     * @param {(widget: import('../options').Widget) => import('../controller/widgetParamsCtrl').WidgetParamsCtrl} widgetParamsFactory
     * @param {import('../service/modalSrv').ModalSrv} modalSrv
     * @param {import('../service/templateSrv').TemplateSrv} templateSrv
     * @param {import('../service/userStorageSrv').UserStorageSrv} userStorage
     */
    constructor(editor, editorOptions, widgetParamsFactory, modalSrv, templateSrv, userStorage) {
        /** @type {import('../plugin').TinyMCE} */
        this.editor = editor;
        /** @type {import('../options').EditorOptions} */
        this.editorOptions = editorOptions;
        /** @type {(widget: import('../options').Widget) => import('../controller/widgetParamsCtrl').WidgetParamsCtrl} */
        this.widgetParamsFactory = widgetParamsFactory;
        /** @type {import('../service/modalSrv').ModalSrv} */
        this.modalSrv = modalSrv;
        /** @type {import('../service/templateSrv').TemplateSrv} */
        this.templateSrv = templateSrv;
        /** @type {import('../service/userStorageSrv').UserStorageSrv} */
        this.storage = userStorage;
        /** @type {number} */
        this.scrollPos = 0;
    }

    isSelectMode() {
        return this.editor.selection.getContent().trim().length > 0;
    }

    /**
     * Shows or hides buttons according to the search text condition
     * When text == '', all non-hidden buttons should be displayed
     * @param {JQuery<HTMLElement>} bodyForm
     * @param {string} searchText
     * @returns {number}
     */
    setWidgetButtonsVisibility(bodyForm, searchText) {
        let numshown = 0;
        const selectMode = this.isSelectMode();
        /** @type {JQuery<HTMLDivElement>} */
        const allbtns = bodyForm.find(".btn-group");
        allbtns.each((i, el) => {
            // Is supported in select mode?
            let visible = !selectMode || (selectMode && el.dataset.selectable === "true");
            const el2 = el.querySelector('button');
            // Does fullfill the search criteria?
            visible &&= el2 !== null && (searchText.trim() === '' || searchComp(el2.textContent ?? '', searchText) ||
                searchComp(el2.title ?? '', searchText));
            setVisibility(el, visible);
            if (visible) {
                numshown++;
            }
        });
        return numshown;
    }

    /**
     * Callback on keyup event
     */
    onSearchKeyup() {
        const searchText = this.modal.body.find("input").val() ?? '';
        this.storage.setToSession('searchtext', searchText, true);

        // Are we in selectMode, does the widget support it? insertquery
        const numshown = this.setWidgetButtonsVisibility(this.modal.body, searchText);
        // If no button visible, show emptyList message
        setVisibility(this.modal.body.find(".tiny_widgethub-emptylist")[0], numshown == 0);

        // Hide categories without any button visible
        /** @type {JQuery<HTMLElement>} */
        const allcatgs = this.modal.body.find(".tiny_widgethub-category");
        allcatgs.each((_, el) => {
            const count = el.querySelectorAll(".btn-group:not(.d-none)").length;
            setVisibility(el, count > 0);
        });
    }

    /**
     * @param {*} evt
     */
    async onMouseEnterButton(evt) {
        const widgetTable = this.editorOptions.widgetDict;
        const key = evt.target?.closest('.btn-group')?.dataset?.key ?? '';
        const widget = widgetTable[key];
        if (!widget || widget.isFilter()) {
            // Filters do not offer preview
            return;
        }
        /** @type {string | undefined} */
        let html = widget._preview;
        if (!html) {
            // Generate preview with default parameters
            html = await this.generatePreview(widget);
            widget._preview = html;
        }
        this.modal.body.find("div.tiny_widgethub-preview")
            .html(html)
            .css("display", "block");
    }

    async createModal() {
        /** @type {string} */
        const searchText = this.storage.getFromSession("searchtext", "");
        const data = {
            ...this.getPickTemplateContext(),
            searchText
        };

        this.modal = await this.modalSrv.create('picker', data);

        // Add select mode identifier to the header
        const blinkElem = document.createElement("SPAN");
        blinkElem.classList.add("tiny_widgethub-blink", "d-none");
        const selectModeStr = await get_string('selectmode', 'tiny_widgethub');
        blinkElem.innerHTML = `<i class="twh-icon twh-object-group"></i> ${selectModeStr}</span>`;
        this.modal.header[0]?.append(blinkElem);

        try {
            this.modal.body.find(".tiny_widgethub-categorycontainer")
                // @ts-ignore
                .scrollspy('refresh');
        } catch (ex) {
            console.error("Problem setting scrollspy", ex);
        }

        // Confiure preview panel events
        const mouseEnterDebounced = debounce(this.onMouseEnterButton.bind(this), 1000);

        const onMouseOut = () => {
            mouseEnterDebounced.clear();
            this.modal.body.find("div.tiny_widgethub-preview")
                .html('')
                .css("display", "none");
        };

        // Event listeners.
        // Click on clear text
        const widgetSearchElem = this.modal.body.find("input");
        widgetSearchElem.val(searchText);
        const debouncedKeyup = debounce(this.onSearchKeyup.bind(this), 800);
        widgetSearchElem.on('keyup', debouncedKeyup);

        this.modal.body.find(`#widget-clearfilter-btn${data.rid}`).on('click', () => {
            debouncedKeyup.clear();
            widgetSearchElem.val("");
            widgetSearchElem.trigger("focus");
            this.onSearchKeyup();
        });
        // Click on any widget button (bubbles)
        this.modal.body.find('div.tiny_widgethub-categorycontainer, div.tiny_widgethub-recent').on('click',
            /** @param {Event} event */
            (event) => {
                mouseEnterDebounced.clear();
                this.modal.body.find("div.tiny_widgethub-preview")
                    .css("display", "none");
                this.handlePickModalClick(event);
            });

        // Preview panel
        this.modal.body.find(".btn-group")
            .on("mouseenter", mouseEnterDebounced)
            .on("mouseout", onMouseOut.bind(this));

        // Store current scroll
        const scrollPane = this.modal.body.find('.tiny_widgethub-categorycontainer');
        scrollPane.on('scroll', debounce(() => {
            this.scrollPos = Math.round(scrollPane.scrollTop() ?? 0);
        }, 100));
    }


    async handleAction() {
        this.storage.loadStore();

        if (!this.modal) {
            // Create the modal if not exists.
            await this.createModal();
        } else {
            // Update list of recent
            const widgetDict = this.editorOptions.widgetDict;
            const html = this.storage.getRecentUsed()
                .filter(r => widgetDict[r.key] !== undefined)
                .map(r =>
                    `<a href="javascript:void(0)" data-key="${r.key}" data-insert="recent"><span class="badge badge-secondary">${widgetDict[r.key].name}</span></a>`)
                .join('\n');
            this.modal.body.find('.tiny_widgethub-recent').html(html);
        }
        // Call filter function to make sure the list is updated.
        this.onSearchKeyup();

        const selectMode = this.isSelectMode();
        if (selectMode) {
            this.modal.header.find("span.tiny_widgethub-blink").removeClass("d-none");
        } else {
            this.modal.header.find("span.tiny_widgethub-blink").addClass("d-none");
        }

        this.modal.show();

        setTimeout(() => {
            if (!this.modal?.body) {
                return;
            }
            if (this.scrollPos > 0) {
                this.modal.body.find('.tiny_widgethub-categorycontainer').scrollTop(this.scrollPos);
            }
            this.modal.body.find("input").trigger('focus');
        }, 200);
    }


    show() {
        this.modal?.show();
    }

    /**
     * @param {import('../options').Widget} widget
     * @returns {Promise<string>}
     */
    generatePreview(widget) {
        const toInterpolate = {...widget.defaults};
        // Decide which template engine to use
        const engine = widget.prop('engine');
        return this.templateSrv.render(widget.template ?? "", toInterpolate, widget.I18n, engine);
    }

    /**
     * @typedef {Object} Button
     * @property {boolean} hidden
     * @property {string} category
     * @property {number} widgetindex
     * @property {string} widgetkey
     * @property {string} widgetname
     * @property {string} widgettitle
     * @property {string} iconname
     * @property {boolean} disabled
     * @property {boolean} selectable
     * @property {boolean} isfilter
     * @property {boolean} filterset
     */
    /**
     * @typedef {Object} Category
     * @property {string} name
     * @property {boolean} hidden
     * @property {string} color
     * @property {Button[]} buttons
     */
    /**
     *  @typedef {{rid: string, selectMode: boolean, elementid: string, categories: Category[], recent: *[]}} TemplateContext
     */
    /**
     * Get the template context for the dialogue.
     *
     * @returns {TemplateContext} data
     */
    getPickTemplateContext() {
        const snptDict = this.editorOptions.widgetDict;
        const allButtons = Object.values(snptDict);
        // Parse filters that are autoset by the user.
        const autoFilters = this.storage.getFromLocal("startup.filters", "")
            .split(",").map(f => f.trim());
        /**
         * @type {Object.<string, Category>}
         **/
        const categories = {};
        allButtons.forEach(btn => {
            const isFilter = btn.isFilter();
            const catName = (btn.category ?? 'MISC').toUpperCase();
            let found = categories[catName];
            if (!found) {
                const color = hashCode(catName) % 360;
                let sat = '30%';
                if (catName.toLowerCase().startsWith('obsolet')) {
                    sat = '0%'; // Gray
                }
                found = {
                    name: catName,
                    hidden: false,
                    color: color + ', ' + sat,
                    buttons: []
                };
                categories[catName] = found;
            }
            found.buttons.push({
                hidden: false,
                category: catName,
                widgetindex: btn.id,
                widgetkey: btn.key,
                widgetname: btn.name,
                widgettitle: btn.name + " " + catName,
                iconname: "fa fas fa-eye",
                disabled: !btn.isUsableInScope(),
                selectable: btn.insertquery != null,
                isfilter: isFilter,
                filterset: isFilter && autoFilters.includes(btn.key)
            });
        });
        const categoriesList = Object.values(categories);
        categoriesList.sort((a, b) => {
            if (a.name < b.name) {
                return -1;
            }
            if (a.name > b.name) {
                return 1;
            }
            return 0;
        });
        categoriesList.forEach(cat => {
            cat.buttons.sort();
            cat.hidden = cat.buttons.filter(btn => !btn.hidden).length == 0;
        });

        // Update the list of recently used widgets
        const recentList = this.storage.getRecentUsed().filter((/** @type {any} **/ recent) => {
            const key = recent.key;
            const widget = snptDict[key];
            if (!widget?.isUsableInScope()) {
                return false;
            }
            // In select mode must filter widgets that do support it
            const selectable = widget.insertquery !== undefined;
            const isSelection = this.isSelectMode();
            return key.length > 0 && (!isSelection || (isSelection && selectable));
        })
            .map((/** @type {any} **/ recent) => {
                const key = recent.key;
                const snpt = snptDict[key];
                if (snpt) {
                    return {
                        key: key,
                        name: snpt.name
                    };
                } else {
                    return {
                        key: key,
                        name: ""
                    };
                }
            });

        return {
            rid: genID(),
            selectMode: this.isSelectMode(),
            elementid: this.editor.id,
            categories: categoriesList,
            recent: recentList
        };
    }

    /**
     * Handle a click within the Modal.
     *
     * @param {Event} event The click event
     */
    async handlePickModalClick(event) {
        /** @type {any} */
        const target = event.target;
        if (!target) {
            return;
        }
        /** @type {HTMLElement | undefined} */
        const buttonWrapper = target.closest('[data-key]');
        /** @type {import('../options').Widget | null} */
        let widget = null;
        if (buttonWrapper) {
            const selectedButton = buttonWrapper?.dataset?.key;
            if (selectedButton) {
                widget = this.editorOptions.widgetDict[selectedButton];
            }
        }
        if (!widget) {
            return;
        }
        /** @type {HTMLElement | undefined} */
        const button = target.closest('button.btn');
        // Check if it is a toggle button to autoset a filter
        if (button?.dataset?.auto) {
            const isSet = button.dataset.auto !== "true";
            button.dataset.auto = isSet + '';
            toggleClass(button, 'btn-primary', 'btn-outline-primary');
            const key = widget.key;
            // Persist option
            const autoFilters = new Set(this.storage.getFromLocal('startup.filters', '').split(''));
            if (isSet) {
                autoFilters.add(key);
            } else {
                autoFilters.delete(key);
            }
            this.storage.setToLocal('startup.filters', [...autoFilters].join(","), true);
            return;
        }
        /** @type {HTMLElement | undefined} */
        const aRecent = target.closest('a[data-key]');
        // If it is a recently used widget, recover the used parameters
        /** @type {Record<string, any> | undefined} */
        let ctx;
        if (aRecent) {
            ctx = this.storage.getRecentUsed().filter(e => e.key === widget.key)[0]?.p;
        }
        // Must open a configuration dialogue for the current widget
        let confirmMsg = null;

        if (!widget.isUsableInScope()) {
            confirmMsg = await get_string('confirmusage', 'tiny_widgethub');
        }
        const forceInsert = aRecent !== null || button?.dataset?.insert === 'true';
        if (confirmMsg) {
            this.editor.windowManager.confirm(confirmMsg,
                /** @param {*} state */
                (state) => {
                    if (state) {
                        this.handlePickModalAction(widget, forceInsert, ctx);
                    }
                });
        } else {
            this.handlePickModalAction(widget, forceInsert, ctx);
        }
    }

    /**
     * @param {import('../options').Widget} widget
     * @param {boolean} [forceInsert]
     * @param {Record<string, *>} [ctx]
     */
    handlePickModalAction(widget, forceInsert, ctx) {
        this.modal?.hide();
        const paramsController = this.widgetParamsFactory(widget);
        // Keep reference to the calling parentCtrl
        paramsController.parentCtrl = this;
        // Decide whether to show the form or directly doInsert
        if (forceInsert || ((widget.parameters ?? []).length === 0 && !widget.instructions)) {
            // Do insert directly
            paramsController.insertWidget(ctx ?? {});
        } else {
            paramsController.handleAction();
        }
    }
}

const widgetPickerCtrlInstances = new Map();
/**
 * @param {import('../plugin').TinyMCE} editor
 * @returns {WidgetPickerCtrl}
 */
export function getWidgetPickCtrl(editor) {
    let instance = widgetPickerCtrlInstances.get(editor);
    if (!instance) {
        instance = new WidgetPickerCtrl(editor,
            getEditorOptions(editor), getWidgetParamsFactory(editor),
            getModalSrv(), getTemplateSrv(), getUserStorage(editor));
        widgetPickerCtrlInstances.set(editor, instance);
    }
    return instance;
}
