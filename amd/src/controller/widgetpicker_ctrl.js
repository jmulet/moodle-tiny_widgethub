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
// eslint-disable-next-line camelcase
import { get_string } from 'core/str';
import Common from '../common';
import { getWidgetParamsFactory } from '../controller/widgetparams_ctrl';
import { getEditorOptions, getGlobalConfig } from '../options';
import { getModalSrv } from '../service/modal_service';
import { getTemplateSrv } from '../service/template_service';
import { getUserStorage } from '../service/userstorage_service';
import { debounce, genID, hashCode, removeRndFromCtx, searchComp, toggleClass } from '../util';

const { component } = Common;

/**
 * @param {HTMLElement} el
 * @param {boolean} visible
 */
export const setVisibility = function (el, visible) {
    if (!el) {
        return;
    }
    if (visible) {
        el.classList.remove("d-none");
    } else {
        el.classList.add("d-none");
    }
};

export class WidgetPickerCtrl {
    /** @type {import('../service/modal_service').ModalDialogue} */
    // @ts-ignore
    modal;

    /**
     * @param {import('../plugin').TinyMCE} editor
     * @param {import('../options').EditorOptions} editorOptions
     * @param {(widget: import('../options').Widget) => import('../controller/widgetparams_ctrl').WidgetParamsCtrl} widgetParamsFactory
     * @param {import('../service/modal_service').ModalSrv} modalSrv
     * @param {import('../service/template_service').TemplateSrv} templateSrv
     * @param {import('../service/userstorage_service').UserStorageSrv} userStorage
     */
    constructor(editor, editorOptions, widgetParamsFactory, modalSrv, templateSrv, userStorage) {
        /** @type {import('../plugin').TinyMCE} */
        this.editor = editor;
        /** @type {import('../options').EditorOptions} */
        this.editorOptions = editorOptions;
        /** @type {(widget: import('../options').Widget) => import('../controller/widgetparams_ctrl').WidgetParamsCtrl} */
        this.widgetParamsFactory = widgetParamsFactory;
        /** @type {import('../service/modal_service').ModalSrv} */
        this.modalSrv = modalSrv;
        /** @type {import('../service/template_service').TemplateSrv} */
        this.templateSrv = templateSrv;
        /** @type {import('../service/userstorage_service').UserStorageSrv} */
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
     * @param {HTMLElement} bodyForm
     * @param {string} searchtext
     * @returns {number}
     */
    setWidgetButtonsVisibility(bodyForm, searchtext) {
        let numshown = 0;
        const selectmode = this.isSelectMode();
        /** @type {NodeListOf<HTMLDivElement>} */
        const allbtns = bodyForm.querySelectorAll(".tiny_widgethub-btn-group");
        allbtns.forEach(el => {
            // Is supported in select mode?
            let visible = !selectmode || (selectmode && el.dataset.selectable === "true");
            const el2 = el.querySelector('button');
            // Does fullfill the search criteria?
            visible = visible && (el2 !== null) && (searchtext.trim() === '' || searchComp(el2.textContent ?? '', searchtext) ||
                searchComp(el2.dataset.title ?? '', searchtext));
            setVisibility(el, visible);
            if (visible) {
                numshown++;
            }
        });
        return numshown;
    }

    /**
     * Callback on keyup event. Updates the visibility of the widgets and the empty list message.
     * @returns {void}
     */
    onSearchKeyup() {
        if (!this.body) {
            return;
        }
        const searchtext = this.body.querySelector("input")?.value ?? '';
        this.storage.setToSession('searchtext', searchtext, true);

        // Are we in selectmode, does the widget support it? insertquery
        const numshown = this.setWidgetButtonsVisibility(this.body, searchtext);
        // If no button visible, show emptyList message
        /** @type {HTMLElement | null} */
        const emptyListElem = this.body.querySelector(".tiny_widgethub-emptylist");
        if (emptyListElem) {
            setVisibility(emptyListElem, numshown == 0);
        }

        // Hide categories without any button visible
        /** @type {NodeListOf<HTMLDivElement>} */
        const allcatgs = this.body.querySelectorAll(".tiny_widgethub-category");
        allcatgs.forEach(el => {
            const count = el.querySelectorAll(".tiny_widgethub-btn-group:not(.d-none)").length;
            setVisibility(el, count > 0);
        });
    }

    /**
     * @param {MouseEvent} evt
     */
    async onMouseEnterButton(evt) {
        const widgetTable = this.editorOptions.widgetDict;
        const target = evt.target;
        /** @type {Element | null | undefined} */
        let el = null;
        if (target instanceof Element) {
            el = target;
        } else if (target instanceof Node && target.parentElement) {
            el = target.parentElement;
        }

        /** @type {HTMLElement | null | undefined} */
        const group = el?.closest('.tiny_widgethub-btn-group');
        const key = group?.dataset?.key ?? '';

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
        /** @type {HTMLDivElement | null | undefined} */
        const previewElem = this.body?.querySelector("div.tiny_widgethub-preview");
        if (previewElem) {
            previewElem.innerHTML = html;
            previewElem.style.display = "block";
        }
    }

    async createModal() {
        /** @type {string} */
        const searchtext = this.storage.getFromSession("searchtext", "");
        const defaultViewMode = getGlobalConfig(this.editor, 'widgetpicker.viewmode', 'grid');
        const viewMode = this.storage.getFromLocal('widgethub_view_mode', defaultViewMode);
        const miscStr = await get_string('misc', component);
        const data = {
            ...this.getPickTemplateContext({ misc: miscStr }),
            searchtext
        };

        this.modal = await this.modalSrv.create('picker', data);
        this.body = this.modal.body[0];
        this.header = this.modal.header[0];

        // Add select mode identifier to the header
        const blinkElem = document.createElement("SPAN");
        blinkElem.classList.add("tiny_widgethub-blink", "d-none");
        const selectModeStr = await get_string('selectmode', component);
        blinkElem.innerHTML = `<span class="twh-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path d="M48 115.8C38.2 107 32 94.2 32 80c0-26.5 21.5-48 48-48c14.2 0 27 6.2 35.8 16l344.4 0c8.8-9.8 21.6-16 35.8-16c26.5 0 48 21.5 48 48c0 14.2-6.2 27-16 35.8l0 280.4c9.8 8.8 16 21.6 16 35.8c0 26.5-21.5 48-48 48c-14.2 0-27-6.2-35.8-16l-344.4 0c-8.8 9.8-21.6 16-35.8 16c-26.5 0-48-21.5-48-48c0-14.2 6.2-27 16-35.8l0-280.4zM125.3 96c-4.8 13.6-15.6 24.4-29.3 29.3l0 261.5c13.6 4.8 24.4 15.6 29.3 29.3l325.5 0c4.8-13.6 15.6-24.4 29.3-29.3l0-261.5c-13.6-4.8-24.4-15.6-29.3-29.3L125.3 96zm2.7 64c0-17.7 14.3-32 32-32l128 0c17.7 0 32 14.3 32 32l0 96c0 17.7-14.3 32-32 32l-128 0c-17.7 0-32-14.3-32-32l0-96zM256 320l32 0c35.3 0 64-28.7 64-64l0-32 64 0c17.7 0 32 14.3 32 32l0 96c0 17.7-14.3 32-32 32l-128 0c-17.7 0-32-14.3-32-32l0-32z"/></svg>
        </span> ${selectModeStr}`;
        this.header?.appendChild(blinkElem);

        try {
            /** @type {any} */
            // @ts-ignore
            const bs = window.bootstrap;
            // Bootstrap 5 ? (no jQuery plugins, uses JS class)
            if (bs && bs.ScrollSpy) {
                const el = this.body.querySelector(".tiny_widgethub-categorycontainer");
                if (el) {
                    const instance = bs.ScrollSpy.getInstance(el)
                        || new bs.ScrollSpy(el, {});
                    instance.refresh();
                }
            } else {
                // Bootstrap 4 ? (jQuery plugin exists)
                /** @type {any} */
                const $el = this.modal.body.find(".tiny_widgethub-categorycontainer");
                $el.scrollspy('refresh');
            }
        } catch (ex) {
            console.error("Problem setting scrollspy", ex);
        }

        // Confiure preview panel events
        /**
         * @type {any}
         */
        let timerEnter = null;
        /**
         * @type {any}
         */
        let timerOut = null;

        // Event listeners.
        // Click on clear text
        const widgetSearchElem = this.body.querySelector("input");
        if (widgetSearchElem) {
            widgetSearchElem.value = searchtext;
            const debouncedKeyup = debounce(this.onSearchKeyup.bind(this), 800);
            widgetSearchElem.addEventListener('keyup', debouncedKeyup);

            this.body.querySelector(`#widget-clearfilter-btn${data.rid}`)?.addEventListener('click', () => {
                debouncedKeyup.clear();
                widgetSearchElem.value = "";
                widgetSearchElem.focus();
                widgetSearchElem.dispatchEvent(new Event("focus"));
                this.onSearchKeyup();
            });
        }

        // Toggle view button
        this.updateView(viewMode, data.rid);
        this.body.querySelector(`#widget-view-toggle-btn${data.rid}`)?.addEventListener('click', () => {
            const currentMode = this.storage.getFromLocal('widgethub_view_mode', 'list');
            const newMode = currentMode === 'list' ? 'grid' : 'list';
            this.updateView(newMode, data.rid);
        });

        // Click on any widget button (bubbles)
        /** @type {NodeListOf<HTMLElement>} */
        const allWidgetDivs = this.body.querySelectorAll('div.tiny_widgethub-categorycontainer, div.tiny_widgethub-recent');
        allWidgetDivs.forEach((divElem) => {
            divElem.addEventListener('click',
                /** @param {MouseEvent} event */
                (event) => {
                    if (timerEnter) {
                        clearTimeout(timerEnter);
                        timerEnter = null;
                    }
                    /** @type {HTMLElement | undefined | null}   */
                    const previewEl = this.body?.querySelector("div.tiny_widgethub-preview");
                    if (previewEl) {
                        previewEl.style.display = "none";
                    }
                    this.handlePickModalClick(event);
                });
        });


        const funEnter = (/** @type {any} */ evt) => {
            clearTimeout(timerOut);
            timerOut = null;
            timerEnter = setTimeout(() => {
                this.onMouseEnterButton(evt);
            }, 500);
        };

        const funOut = (/** @type {any} */ evt) => {
            const movedFrom = evt.target;
            const movedTo = evt.relatedTarget;
            if (movedFrom.classList.contains("tiny_widgethub-btn") && movedTo.classList.contains("tiny_widgethub-btn")) {
                const key1 = movedFrom?.parentElement?.dataset?.key;
                const key2 = movedTo?.parentElement?.dataset?.key;
                if (key1 != null && key1 == key2) {
                    // Still on the same row
                    return;
                }
            }
            clearTimeout(timerEnter);
            timerEnter = null;
            timerOut = setTimeout(() => {
                /** @type {HTMLDivElement | undefined | null} */
                const previewEl = this.body?.querySelector("div.tiny_widgethub-preview");
                if (previewEl) {
                    previewEl.innerHTML = '';
                    previewEl.style.display = "none";
                }
            }, 500);
        };

        // Preview panel
        const widgetButtons = this.body.querySelectorAll(".tiny_widgethub-btn-group > button");
        widgetButtons.forEach(btn => {
            btn.addEventListener("mouseenter", funEnter);
            btn.addEventListener("mouseleave", funOut);
        });

        // Store current scroll
        // Get the element
        const scrollPane = this.body.querySelector('.tiny_widgethub-categorycontainer');

        // Add scroll listener with debounce
        scrollPane?.addEventListener('scroll', debounce(() => {
            this.scrollPos = Math.round(scrollPane.scrollTop || 0);
        }, 100));
    }


    async handleAction() {
        this.storage.loadStore();
        const selectmode = this.isSelectMode();
        const recentlyUsedBehavior = getGlobalConfig(this.editor, 'insert.recentlyused.behavior', 'lastused');
        if (!this.modal) {
            // Create the modal if not exists.
            await this.createModal();
        } else if (recentlyUsedBehavior !== 'none') {
            // Update list of recent
            const widgetDict = this.editorOptions.widgetDict;
            const html = this.storage.getRecentUsed()
                .filter(r => {
                    const widget = widgetDict[r.key];
                    if (widget === undefined) {
                        return false;
                    }
                    return !selectmode || (selectmode && widget.isSelectCapable());
                })
                .map(r =>
                    `<a href="javascript:void(0)" data-key="${r.key}" data-insert="recent">
                    <span class="badge badge-secondary text-truncate d-inline-block" style="max-width: 120px;" title="${widgetDict[r.key].name}">
                    ${widgetDict[r.key].name}</span></a>`)
                .join('\n');
            const recentDiv = this.body?.querySelector('.tiny_widgethub-recent');
            if (recentDiv) {
                recentDiv.innerHTML = html;
            }
        }
        // Call filter function to make sure the list is updated.
        this.onSearchKeyup();

        const spanBlink = this.header?.querySelector("span.tiny_widgethub-blink");
        if (spanBlink) {
            if (selectmode) {
                spanBlink.classList.remove("d-none");
            } else {
                spanBlink.classList.add("d-none");
            }
        }

        this.modal.show();

        setTimeout(() => {
            if (!this.body) {
                return;
            }
            const scrollPane = this.body.querySelector('.tiny_widgethub-categorycontainer');
            if (scrollPane && this.scrollPos > 0) {
                scrollPane.scrollTop = this.scrollPos;
            }
            // Focus the first input inside the modal body
            this.body.querySelector('input')?.focus();
        }, 200);
    }


    show() {
        this.modal?.show();
    }

    /**
     * Handles the view toggle button click event.
     * @param {string} mode 'grid' or 'list'
     * @param {string} rid The id of the widget picker.
     */
    updateView(mode, rid) {
        const categoryContainer = this.body?.querySelector('.tiny_widgethub-categorycontainer');
        const btnIcon = this.body?.querySelector(`#widget-view-toggle-btn${rid} .twh-icon`);

        if (mode === 'grid') {
            categoryContainer?.classList?.add('tiny_widgethub-view-grid');
            categoryContainer?.classList?.remove('tiny_widgethub-view-list');
            // Set icon to List (to switch back)
            if (btnIcon) {
                btnIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M40 48C26.7 48 16 58.7 16 72v48c0 13.3 10.7 24 24 24H88c13.3 0 24-10.7 24-24V72c0-13.3-10.7-24-24-24H40zM192 64c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zM16 232v48c0 13.3 10.7 24 24 24H88c13.3 0 24-10.7 24-24V232c0-13.3-10.7-24-24-24H40c-13.3 0-24 10.7-24 24zM40 368c-13.3 0-24 10.7-24 24v48c0 13.3 10.7 24 24 24H88c13.3 0 24-10.7 24-24V392c0-13.3-10.7-24-24-24H40z"/></svg>';
            }
        } else {
            categoryContainer?.classList?.remove('tiny_widgethub-view-grid');
            categoryContainer?.classList?.add('tiny_widgethub-view-list');
            // Set icon to Grid (to switch to grid)
            if (btnIcon) {
                btnIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M0 72C0 49.9 17.9 32 40 32H88c22.1 0 40 17.9 40 40V120c0 22.1-17.9 40-40 40H40c-22.1 0-40-17.9-40-40V72zM0 232c0-22.1 17.9-40 40-40H88c22.1 0 40 17.9 40 40V280c0 22.1-17.9 40-40 40H40c-22.1 0-40-17.9-40-40V232zM128 392c0-22.1-17.9-40-40-40H40c-22.1 0-40 17.9-40 40V440c0 22.1 17.9 40 40 40H88c22.1 0 40-17.9 40-40V392zM160 72c0-22.1 17.9-32 40-32H248c22.1 0 40 17.9 40 40V120c0 22.1-17.9 40-40 40H200c-22.1 0-40-17.9-40-40V72zM160 232c0-22.1 17.9-40 40-40H248c22.1 0 40 17.9 40 40V280c0 22.1-17.9 40-40 40H200c-22.1 0-40-17.9-40-40V232zM288 392c0-22.1-17.9-40-40-40H200c-22.1 0-40 17.9-40 40V440c0 22.1 17.9 40 40 40H248c22.1 0 40-17.9 40-40V392zM320 72c0-22.1 17.9-32 40-32H408c22.1 0 40 17.9 40 40V120c0 22.1-17.9 40-40 40H360c-22.1 0-40-17.9-40-40V72zM320 232c0-22.1 17.9-40 40-40H408c22.1 0 40 17.9 40 40V280c0 22.1-17.9 40-40 40H360c-22.1 0-40-17.9-40-40V232zM448 392c0-22.1-17.9-40-40-40H360c-22.1 0-40 17.9-40 40V440c0 22.1 17.9 40 40 40H408c22.1 0 40-17.9 40-40V392z"/></svg>';
            }
        }
        this.storage.setToLocal('widgethub_view_mode', mode, true);
    }

    /**
     * @param {import('../options').Widget} widget
     * @returns {Promise<string>}
     */
    generatePreview(widget) {
        const toInterpolate = { ...widget.defaultsWithRepeatable(true) };
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
     * @property {string} widgetorder
     * @property {string} widgettitle
     * @property {string} iconname
     * @property {string} iconHtml
     * @property {boolean} disabled
     * @property {boolean} selectable
     * @property {boolean} isfilter
     * @property {boolean} filterset
     * @property {string} maincolclass
     */
    /**
     * @typedef {Object} Category
     * @property {string} name
     * @property {string} order
     * @property {boolean} hidden
     * @property {string} color
     * @property {Button[]} buttons
     */
    /**
     *  @typedef {{rid: string, selectmode: boolean, elementid: string, categories: Category[], recent: *[], showquickbuttons: boolean}} TemplateContext
     */
    /**
     * Get the template context for the dialogue.
     * @param {Record<string, string>} translations
     * @returns {TemplateContext} data
     */
    getPickTemplateContext(translations) {
        /** @type {Record<string, string>} */
        const categoryOrderMap = {};
        getGlobalConfig(this.editor, 'category.order', '')
            .split(',')
            .forEach(item => {
                const itemOrder = item.split(':');
                if (itemOrder.length === 2) {
                    categoryOrderMap[itemOrder[0].trim().toLocaleUpperCase()] = itemOrder[1].trim();
                }
            });

        const snptDict = this.editorOptions.widgetDict;
        const allButtons = Object.values(snptDict);
        // Parse filters that are autoset by the user.
        const autoFilters = this.storage.getFromLocal("startup.filters", "")
            .split(",").map(f => f.trim());

        const quickbuttonBehavior = getGlobalConfig(this.editor, 'insert.quickbutton.behavior', 'ctrlclick');
        /**
         * @type {Object.<string, Category>}
         **/
        const categories = {};
        allButtons.forEach(btn => {
            const isFilter = btn.isFilter();
            let catName = (btn.category ?? 'MISC').toUpperCase();
            if (catName === 'MISC' && translations.misc) {
                catName = translations.misc.toUpperCase();
            }
            let found = categories[catName];
            if (!found) {
                const color = hashCode(catName) % 360;
                let sat = '30%';
                if (catName.toLowerCase().startsWith('obsolet') || catName.toLowerCase().startsWith('deprecated')) {
                    sat = '0%'; // Gray
                }
                found = {
                    name: catName,
                    order: categoryOrderMap[catName] ?? catName,
                    hidden: false,
                    color: color + ', ' + sat,
                    buttons: []
                };
                categories[catName] = found;
            }
            const colwidth = (quickbuttonBehavior === 'none' ? 12 : 10) - (isFilter ? 2 : 0);

            let icon = btn.prop('icon');
            const image = btn.prop('image');
            let iconHtml = '';

            if (image) {
                iconHtml = `<img src="${image}" alt="" style="width:100%;height:100%;object-fit:contain;">`;
            } else if (icon) {
                if (icon.trim().startsWith('<svg')) {
                    iconHtml = icon;
                } else if (icon.trim().startsWith('http') || icon.trim().startsWith('/')) {
                    iconHtml = `<img src="${icon}" alt="" style="width:100%;height:100%;object-fit:contain;">`;
                } else {
                    // Assume class
                    iconHtml = `<i class="${icon}"></i>`;
                }
            } else {
                // Default icon (puzzle piece)
                iconHtml = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path d="M264.5 5.2c14.9-6.9 32.1-6.9 47 0l218.6 101c8.5 3.9 13.9 12.4 13.9 21.8s-5.4 17.9-13.9 21.8l-218.6 101c-14.9 6.9-32.1 6.9-47 0L45.9 149.8C37.4 145.8 32 137.3 32 128s5.4-17.9 13.9-21.8L264.5 5.2zM476.9 209.6l53.2 24.6c8.5 3.9 13.9 12.4 13.9 21.8s-5.4 17.9-13.9 21.8l-218.6 101c-14.9 6.9-32.1 6.9-47 0L45.9 277.6c-8.5-3.9-13.9-12.4-13.9-21.8s5.4-17.9 13.9-21.8l53.2-24.6 152 70.2c23.4 10.8 50.4 10.8 73.8 0l152-70.2zm-152 198.2l152-70.2 53.2 24.6c8.5 3.9 13.9 12.4 13.9 21.8s-5.4 17.9-13.9 21.8l-218.6 101c-14.9 6.9-32.1 6.9-47 0L45.9 405.6c-8.5-3.9-13.9-12.4-13.9-21.8s5.4-17.9 13.9-21.8l53.2-24.6 152 70.2c23.4 10.8 50.4 10.8 73.8 0z"/></svg>';
            }

            found.buttons.push({
                hidden: false,
                category: catName,
                widgetindex: btn.id,
                widgetkey: btn.key,
                widgetname: btn.name,
                widgetorder: btn.prop('order') ?? btn.name ?? btn.key ?? '',
                widgettitle: btn.name + " " + catName,
                iconname: "fa fas fa-eye",
                iconHtml: iconHtml,
                disabled: !btn.isUsableInScope(),
                selectable: btn.insertquery != null,
                isfilter: isFilter,
                filterset: isFilter && autoFilters.includes(btn.key),
                maincolclass: `col-${colwidth}`
            });
        });
        const categoriesList = Object.values(categories);
        categoriesList.sort((a, b) => (a.order + '').localeCompare((b.order + '')));
        categoriesList.forEach(cat => {
            // Sort buttons by the order, not by the name
            cat.buttons.sort((a, b) => (a.widgetorder + '').localeCompare((b.widgetorder + '')));
            cat.hidden = cat.buttons.filter(btn => !btn.hidden).length == 0;
        });

        /** @type {any[]} */
        let recentList = [];

        const recentlyUsedBehavior = getGlobalConfig(this.editor, 'insert.recentlyused.behavior', 'lastused');
        if (recentlyUsedBehavior !== 'none') {
            // Update the list of recently used widgets
            recentList = this.storage.getRecentUsed().filter((/** @type {any} **/ recent) => {
                const key = recent.key;
                const widget = snptDict[key];
                if (!widget?.isUsableInScope()) {
                    return false;
                }
                // In select mode must filter widgets that do support it
                const selectable = widget.insertquery !== undefined;
                const isSelection = this.isSelectMode();
                return key.length > 0 && (!isSelection || (isSelection && selectable));
            }).map((/** @type {any} **/ recent) => {
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
        }

        return {
            rid: genID(),
            selectmode: this.isSelectMode(),
            elementid: this.editor.id,
            categories: categoriesList,
            recent: recentList,
            showquickbuttons: quickbuttonBehavior !== 'none'
        };
    }

    /**
     * Handle a click within the Modal.
     *
     * @param {MouseEvent} event The click event
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
            console.warn('Cannot find widget');
            return;
        }
        /** @type {HTMLElement | undefined} */
        const button = target.closest('button.tiny_widgethub-btn');
        // Check if it is a toggle button to autoset a filter
        if (button?.dataset?.auto) {
            const isSet = button.dataset.auto !== "true";
            button.dataset.auto = isSet + '';
            toggleClass(button, 'tiny_widgethub-btn-primary', 'tiny_widgethub-btn-outline-primary');
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

        // Recently used badges use <a> while real buttons are button[data-key]
        /** @type {HTMLElement | undefined} */
        const aRecentBadge = target.closest('a[data-key]');

        // Determine if it is a rayButton
        const isRayButton = button?.dataset?.insert === 'true';

        /** @type {Record<string, any> | undefined} */
        let ctx;
        const bypassParamsModal = aRecentBadge !== null || isRayButton;
        if (bypassParamsModal) {
            // Quick insert
            ctx = widget.defaultsWithRepeatable(true) || {};
            // Should it load recently used values?
            const metaActive = event.ctrlKey || event.metaKey;
            /**
             * @param {string} key
             * @param {string} defaultValue
             * @returns {boolean}
             */
            const isBehaviourLastUsed = (key, defaultValue) => {
                let b = getGlobalConfig(this.editor, `insert.${key}.behavior`, defaultValue);
                return (b === 'ctrlclick' && metaActive) || b === 'lastused';
            };
            const shouldLoadRecentValues = (aRecentBadge && isBehaviourLastUsed('recentlyused', 'lastused')) ||
                (isRayButton && isBehaviourLastUsed('quickbutton', 'ctrlclick'));
            if (shouldLoadRecentValues) {
                const stored = this.storage.getRecentUsed().find(e => e.key === widget.key)?.p || {};
                ctx = { ...ctx, ...removeRndFromCtx(stored, widget.parameters) };
            }
        } else {
            // Normal insert
            ctx = widget.defaults || {};
        }

        // Must open a configuration dialogue for the current widget
        let confirmMsg = null;

        if (!widget.isUsableInScope()) {
            confirmMsg = await get_string('confirmusage', component);
        }
        if (confirmMsg) {
            this.editor.windowManager.confirm(confirmMsg,
                /** @param {*} state */
                (state) => {
                    if (state) {
                        this.handlePickModalAction(widget, bypassParamsModal, ctx);
                    }
                });
        } else {
            this.handlePickModalAction(widget, bypassParamsModal, ctx);
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
            paramsController.insertWidget(ctx ?? {}, forceInsert);
        } else {
            // Show widget's parameters modal
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
