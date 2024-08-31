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
import ModalFactory from 'core/modal_factory';
import {IBPickModal} from './modal';
import {getCourseId, getWidgetDict, getUserId} from './options';
// eslint-disable-next-line no-unused-vars
import {UserStorage, genID, hashCode, searchComp, templateRendererMustache, WidgetWrapper} from './util';
import {UiParamsCtrl} from './uiParams';
// eslint-disable-next-line no-unused-vars
import {WidgetPlugin} from './commands';

/**
 * Convert a simple input element in a typeahead widget
 */
class TypeAheadInput {
    _inputElem;
    _listener;
    /** @type {number | undefined} */
    _sfTimeout;
    /**
     * @param {HTMLElement} inputElem
     * @param {Function} callback
     * @param {number=} delay
     */
    constructor(inputElem, callback, delay) {
        this._inputElem = inputElem;
        this._listener = () => {
            if (this._sfTimeout) {
                window.clearTimeout(this._sfTimeout);
                this._sfTimeout = undefined;
            }
            this._sfTimeout = window.setTimeout(() => callback(), delay ?? 800);
        };
        this._inputElem.addEventListener('keyup', this._listener);
    }
    off() {
        if (this._sfTimeout) {
            window.clearTimeout(this._sfTimeout);
            this._sfTimeout = undefined;
        }
        if (this._listener) {
            this._inputElem.removeEventListener('keyup', this._listener);
        }
    }
}

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

const Templates = {
    RECENT_SNPT: `<div style="margin:10px 45px;font-size:85%;">{{#str}} recents, tiny_widgethub {{/str}}: {{#recent}} 
    {{#name}}<a href="javascript:void(0)" data-key="{{key}}"><span class="badge badge-secondary">{{name}}</span></a>{{/name}}
    {{/recent}}`
};

export class UiPickCtrl {
    widgetPlugin;
    editor;
    /** @type {UiParamsCtrl | undefined} */
    _uiParamsCtrl;
    // @ts-ignore
    modal;
    /**
     * @param {WidgetPlugin} widgetPlugin
     */
    constructor(widgetPlugin) {
        this.widgetPlugin = widgetPlugin;
        this.editor = widgetPlugin.editor;
    }

    /**
     * @param {import('./util').WidgetWrapper} widget
     * @returns {UiParamsCtrl}
     */
    getUiParamsCtrl(widget) {
        if (this._uiParamsCtrl) {
            this._uiParamsCtrl.destroy();
            this._uiParamsCtrl.widget = widget;
        } else {
            this._uiParamsCtrl = new UiParamsCtrl(this, widget);
        }
        return this._uiParamsCtrl;
    }

    show() {
        this.modal?.show();
    }

    async handleAction() {
        const userId = getUserId(this.editor);
        const courseId = getCourseId(this.editor);
        const storage = UserStorage.getInstance(userId, courseId);

        // Type on search input
        const selectMode = this.editor.selection.getContent().trim().length > 0;

        const onSearchKeyup = () => {
            let numshown = 0;
            const widgetSearchElem = this.modal.body.find("input")[0];
            const searchText = (widgetSearchElem.value || '');
            storage.setToSession('searchtext', searchText, true);
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
            const searchText = storage.getFromSession("searchtext", "");
            const data = this.getPickTemplateContext({
                searchText: searchText
            });
            console.log(" data  is  ", data);
            // @ts-ignore
            this.modal = await ModalFactory.create({
                type: IBPickModal.TYPE,
                templateContext: data,
                large: true,
            });
            // Event listeners.
            // Click on clear text
            const widgetSearchElem = this.modal.body.find("input")[0];
            widgetSearchElem.value = searchText;
            this.modal.body.find(`#widget-clearfilter-btn${data.rid}`)[0].addEventListener('click', () => {
                widgetSearchElem.value = "";
                onSearchKeyup();
            });
            // Click on any widget button
            this.modal.body[0].addEventListener('click',
                /** @param {Event} event */
                (event) => {
                    this.handlePickModalClick(event);
                });

            this._typeAheadInput = new TypeAheadInput(widgetSearchElem, onSearchKeyup);
        }

        // Update the list of recently used widgets
        const snptDict = getWidgetDict(this.editor);
        const recentWidgets = storage.getFromSession("recentsnpt", "").split(",").filter(e=>e.trim()).map(key => {
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
        let recentHTML = "";
        if (recentWidgets.length) {
            recentHTML = templateRendererMustache(Templates.RECENT_SNPT, {recent: recentWidgets});
        }
        this.modal.body.find(".tiny_widgethub-recent").html(recentHTML);

        this.modal.show();
        onSearchKeyup();
        setTimeout(() => {
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
        const allButtons = Object.values(getWidgetDict(this.editor));

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
            const catName = btn.category.toUpperCase();
            let found = categories[catName];
            if (!found) {
                const color = hashCode(catName) % 360;
                let sat = '30%';
                if (catName.toLowerCase() === 'obsolet') {
                    sat = '0%'; // Gray
                }
                found = {
                    name: catName,
                    hidden: false,
                    color: `${color},${sat}`,
                    buttons: []
                };
                categories[catName] = found;
            }
            found.buttons.push({
                    hidden: false,
                    category: catName,
                    widgetkey: btn.key,
                    widgetname: btn.name,
                    widgettitle: btn.name + " " + catName,
                    iconname: "fa fas fa-eye",
                    disabled: !btn.isUsableInScope(),
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

        return {rid: genID(),
            selectMode: this.editor.selection.getContent().trim().length > 0,
            elementid: this.editor.id,
            categories: categoriesList, ...(data ?? {})};
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
            widget = getWidgetDict(this.editor)[selectedButton];
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
     * @param {WidgetWrapper} widget
     */
    handlePickModalAction(widget) {
        this.modal.hide();
        const paramsController = this.getUiParamsCtrl(widget);
        // Decide whether to show the form or directly doInsert
        if (widget.parameters.length === 0 && !widget.instructions) {
            // Do insert directly
            paramsController.insertWidget({});
        } else {
            paramsController.handleAction();
        }
    }
}