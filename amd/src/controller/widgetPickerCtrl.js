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
import { getWidgetParamsFactory } from '../controller/widgetParamsCtrl';
import { getEditorOptions } from '../options';
import { getModalSrv } from '../service/modalSrv';
import { getTemplateSrv } from '../service/templateSrv';
import { getUserStorage } from '../service/userStorageSrv';
import {debounce, genID, hashCode, searchComp} from '../util';

/**
 * @param {HTMLElement} el
 * @param {boolean} visible
 */
const toggleVisible = function(el, visible) {
    if (visible) {
        el.classList.remove("tiny_widgethub-hidden");
    } else {
        el.classList.add("tiny_widgethub-hidden");
    }
};

export class WidgetPickerCtrl {
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

        // Trigger preloading templates
        this.modalSrv.create('picker', {});
    }

    show() {
        this.modal?.show();
    }

    isSelectMode() {
        return this.editor.selection.getContent().trim().length > 0;
    }

    async handleAction() {
        // Type on search input
        const selectMode = this.isSelectMode();

        const onSearchKeyup = () => {
            let numshown = 0;
            const widgetSearchElem = this.modal.body.find("input")[0];
            const searchText = (widgetSearchElem.value || '');
            this.storage.setToSession('searchtext', searchText, true);
            /** @type {NodeListOf<HTMLElement>} */
            const allbtns = document.querySelectorAll(".tiny_widgethub-buttons");
            /** @type {NodeListOf<HTMLElement>} */
            const allcatgs = document.querySelectorAll(".tiny_widgethub-category");

            // Are we in selectMode, does the widget support it? insertquery
            if (!searchText) {
                allbtns.forEach(
                    (el) => {
                    const visible = !selectMode || (selectMode && el.dataset.selectable === "true");
                    toggleVisible(el, visible);
                    if (visible) {
                        numshown++;
                    }
                });
            } else {
                allbtns.forEach((el) => {
                    let visible = !selectMode || (selectMode && el.dataset.selectable === "true");
                    const el2 = el.querySelector('button');
                    visible = visible && searchComp(el2?.title + "", searchText);
                    toggleVisible(el, visible);
                    if (visible) {
                        numshown++;
                    }
                });
            }
            allcatgs.forEach((el) => {
                const count = el.querySelectorAll(".tiny_widgethub-buttons:not(.tiny_widgethub-hidden)").length;
                toggleVisible(el, count > 0);
            });
            console.log("Num shown buttons is ", numshown);
            // If no result show emptyList message
            toggleVisible(this.modal.body.find(".tiny_widgethub-emptylist")[0], numshown == 0);
        };


        // Show modal with buttons.
        if (this.modal) {
            console.log("Estic en mode selecció? " + selectMode);
            if (selectMode) {
                this.modal.header.find("span.ib-blink").removeClass("tiny_widgethub-hidden");
            } else {
                this.modal.header.find("span.ib-blink").addClass("tiny_widgethub-hidden");
            }
        } else {
            const searchText = this.storage.getFromSession("searchtext", "");
            const data = this.getPickTemplateContext({
                searchText: searchText
            });
            console.log(" data  is  ", data);
            // @ts-ignore
            this.modal = await this.modalSrv.create('picker', data, () => {
                this.modal.destroy();
                this.modal = null;
            });

            try {
                this.modal.body.find(".tiny_widgethub-categorycontainer")
                    .scrollspy('refresh');
            } catch (ex) {
                console.error("Problem setting scrollspy", ex);
            }

            // Confiure preview panel
            const previewPanel = this.modal.body.find("div.tiny_widgethub-preview");
            const widgetTable = this.editorOptions.widgetDict;

            const mouseEnterDebounced = debounce(async(evt) => {
                const key = evt.target?.dataset?.key ?? '';
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
                previewPanel.html(html);
                previewPanel.css("display", "block");
            }, 1000);

            const oMouseOut = () => {
                mouseEnterDebounced.clear();
                previewPanel.html('');
                previewPanel.css("display", "none");
            };


            // Event listeners.
            // Click on clear text
            const widgetSearchElem = this.modal.body.find("input");
            widgetSearchElem.val(searchText);
            const debouncedKeyup = debounce(onSearchKeyup, 800);
            widgetSearchElem.on('keyup', debouncedKeyup);

            this.modal.body.find(`#widget-clearfilter-btn${data.rid}`).on('click', () => {
                debouncedKeyup.clear();
                widgetSearchElem.val("");
                widgetSearchElem.trigger("focus");
                onSearchKeyup();
            });
            // Click on any widget button (bubbles)
            this.modal.body.find('div.tiny_widgethub-categorycontainer, div.tiny_widgethub-recent').on('click',
                /** @param {Event} event */
                (event) => {
                    mouseEnterDebounced.clear();
                    previewPanel.css("display", "none");
                    console.log(event.target);
                    this.handlePickModalClick(event);
                });
            // Preview panel
            this.modal.body.find(".btn-group")
                .on("mouseenter", mouseEnterDebounced)
                .on("mouseout", oMouseOut);
        }

        this.modal.show();
        onSearchKeyup();
        setTimeout(() => {
            if (!this.modal?.body) {
                return;
            }
            const widgetSearchElem = this.modal.body.find("input")[0];
            widgetSearchElem.focus();
        }, 400);
    }

    /**
     * Get the template context for the dialogue.
     *
     * @param {Object.<string, any>=} data
     * @returns {Object.<string, any>} data
     */
    getPickTemplateContext(data) {
        const snptDict = this.editorOptions.widgetDict;
        const allButtons = Object.values(snptDict);
        /**
         * @typedef {Object} Button
         * @property {boolean} hidden
         * @property {string} category
         * @property {string} widgetkey
         * @property {string} widgetname
         * @property {string} widgettitle
         * @property {string} iconname
         * @property {boolean} disabled
         * @property {boolean} selectable
         * @property {string} widgetfawesome
         */
        /**
         * @typedef {Object} Category
         * @property {string} name
         * @property {boolean} hidden
         * @property {string} color
         * @property {Button[]} buttons
         */
        /**
         * @type {Object.<string, Category>}
         **/
        const categories = {};
        allButtons.forEach(btn => {
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
                disabled: btn.isUsableInScope(),
                selectable: btn.insertquery != null,
                widgetfawesome: "" // TODO
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
         const recent = this.storage.getFromSession("recentsnpt", "").split(",")
             .filter((/** @type {string} **/ key) => {
                // In select mode must filter widgets that do support it
                key = key?.trim();
                const widget = snptDict[key];
                if (!widget) {
                    return false;
                }
                const selectable = widget.insertquery !== undefined;
                const isSelection = this.isSelectMode();
                return key.length > 0 && (!isSelection || (isSelection && selectable));
             })
             .map((/** @type {string} **/ key) => {
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
            categories: categoriesList, ...(data ?? {}),
            recent
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
        const button = target.closest('button.tiny_widgethub-btn');
        const aRecent = target.closest('a[data-key]');
        let widget = null;
        if (button ?? aRecent) {
            const selectedButton = (button ?? aRecent).dataset.key;
            widget = this.editorOptions.widgetDict[selectedButton];
        }
        if (!widget) {
            return;
        }
        // Must open a configuration dialogue for the current widget
        let confirmMsg = null;
        if (!widget.isUsableInScope()) {
            confirmMsg = "Aquest widget no és adequat per a la pàgina actual. Segur que voleu continuar?";
        }

        if (confirmMsg) {
            this.editor.windowManager.confirm(confirmMsg,
            /** @param {*} state */
            (state) => {
                if (state) {
                    this.handlePickModalAction(widget);
                }
            });
        } else {
            this.handlePickModalAction(widget);
        }
    }

    /**
     * @param {import('../options').Widget} widget
     */
    handlePickModalAction(widget) {
        this.modal.hide();
        const paramsController = this.widgetParamsFactory(widget);
        // Keep reference to the calling parentCtrl
        paramsController.parentCtrl = this;
        // Decide whether to show the form or directly doInsert
        if (widget.parameters.length === 0 && !widget.instructions) {
            // Do insert directly
            paramsController.insertWidget({});
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
