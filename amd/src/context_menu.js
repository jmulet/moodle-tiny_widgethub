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
 * @copyright   2024 Josep Mulet Pol <pmulet@iedib.net>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import { getGlobalConfig, getWidgetDict, getUserId } from './options';
import jQuery from 'jquery';
import contextMenuActions from './context_menu_actions';
import { WidgetWrapper, convertInt, findVariableByName, isUserAllowed } from './util';

/**
 * @typedef PathResult
 * @property {HTMLElement} clickedElem
 * @property {WidgetWrapper} snpt
 * @property {HTMLElement} elem
 */

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
            match = match && elem.querySelector(e) != null;
        });
    }
    return match;
};

/**
 * @param {WidgetWrapper[]} widgetList
 * @param {HTMLElement} clickedElem
 * @returns {PathResult}
 */
const findWidgetOnEventPath = function(widgetList, clickedElem) {
    const result = {
        clickedElem: clickedElem
    };
    let elem = clickedElem;
    const componentsLength = widgetList.length;
    while (elem != null && elem.getAttribute("name") !== "BODY" && result.snpt == null) {
        let i = 0;
        while (i < componentsLength && result.snpt == null) {
            if (matchesSelectors(elem, widgetList[i].selectors)) {
                result.snpt = widgetList[i];
                result.elem = elem;
            }
            i++;
        }
        elem = elem.parentElement;
    }
    return result;
};


const contextMenuItems = {
    "@edit": function() {
        this.uiContextMenu.addMenuItem("Edita", contextMenuActions["@edit"].bind(this), "fas fa fa-cog");
    },
    "@unpack": function() {
        this.uiContextMenu.addSeparator();
        this.uiContextMenu.addMenuItem("Desempaquetar", contextMenuActions["@unpack"].bind(this), "fas fa fa-external-link");
    },
    "@cut": function() {
        this.uiContextMenu.addMenuItem("Retallar", contextMenuActions["@clipboard/cut"].bind(this), "fas fa fa-scissors");
    },
    "@paste": function() {
        const subMenu = this.uiContextMenu.addSubMenu("Enganxar");
        this.clipBoard.forEach((content, indx) => {
            const desc = content.split("@@")[0];
            subMenu.addMenuItem((indx + 1) + ". " + desc, contextMenuActions["@clipboard/paste"].bind(this), "", {pos: indx + ""});
        });
        // Also includes a clear clipboard item
        subMenu
            .endSubMenu()
            .addSeparator()
            .addMenuItem("Buidar portaretalls", contextMenuActions["@clipboard/clear"].bind(this));
    },
    "menu-pestanyes2": function() {
        // If in the middle of the path there is a A tab, then apply actions per tab
        const theTab = this.currentContext.clickedElem.closest('a[data-toggle="tab"]');
        this.currentContext.theTab = theTab;
        if (theTab) {
            this.uiContextMenu
                .addSubMenu("Afegir pestanya", "fas fa fa-plus")
                .addMenuItem("Abans", contextMenuActions["tabs/add"].bind(this), "", {before: "true"})
                .addMenuItem("Després", contextMenuActions["tabs/add"].bind(this), "")
                .endSubMenu()
                .addSubMenu("Moure", "fas fa fa-arrows-h")
                .addMenuItem("Abans", contextMenuActions["tabs/move"].bind(this), "fas fa fa-arrow-left", { before: "true" })
                .addMenuItem("Després", contextMenuActions["tabs/move"].bind(this), "fas fa fa-arrow-right")
                .endSubMenu()
                .addMenuItem("Eliminar pestanya", contextMenuActions["tabs/del"].bind(this), "fa fas fa-trash");
        } else {
            // Només ha d'afegir pestanya al final
            this.uiContextMenu.addMenuItem("Afegir pestanya", contextMenuActions["tabs/add"].bind(this), "fas fa fa-plus");
        }
    },
    "imatge": function() {
        const effect = this.currentContext.elem.dataset.snptd;
        if (effect === "zoom" || effect === "lightbox") {
            this.uiContextMenu.addMenuItem("Eliminar efecte " + effect, contextMenuActions["imatge"].bind(this), "fa fas fa-trash");
        } else {
            this.uiContextMenu.addSubMenu("Efectes d'imatge")
                .addMenuItem("Afegir zoom", contextMenuActions["imatge"].bind(this), "", {effect: "zoom"})
                .addMenuItem("A pantalla completa", contextMenuActions["imatge"].bind(this), "", {effect: "lightbox"})
                .endSubMenu();
        }
    },
    "imatge-fons": function() {
        this.uiContextMenu.addMenuItem("Canviar fons", contextMenuActions["imatge-fons"].bind(this));
    },
    "two-cols": function() {
        const subMenu = this.uiContextMenu.addSubMenu("Mida columnes");
        for (let i = 2; i < 12; i = i + 2) {
            const tpc = parseInt((100 * i / 12.0).toFixed(0));
            const label = tpc + "% | " + (100 - tpc) + "%";
            subMenu.addMenuItem(label, contextMenuActions["two-cols"].bind(this), "", {cols: "" + i});
        }
        subMenu.endSubMenu()
            .addMenuItem("Passar a una columna", contextMenuActions["two-cols"].bind(this), "fa fas fa-trash", {cols: "rm"});
    },
    "desplegable2": function() {
           // Must see which tab or group was clicked
           console.log("Creating desplegable2 menus on ", this.currentContext.clickedElem);
           this.currentContext.theTab = this.currentContext.clickedElem.closest("div.accordion-group");
           // Is Accordion behavior?
           const isAcc = jQuery(this.currentContext.elem).find("div.accordion-body").attr("data-parent") != null;

           const howManyAccordions = this.currentContext.elem.querySelectorAll(".accordion-group").length;
           const desplegableAction = contextMenuActions["desplegable2"].bind(this);
           this.uiContextMenu
               .addSubMenu("Comportament")
               .addMenuItem("Individual", desplegableAction, isAcc ? "" : "fa fas fa-check", {accordion: "bind"})
               .addMenuItem("Accordió", desplegableAction, isAcc ? "fa fas fa-check" : "", {accordion: "bacc"})
               .endSubMenu();
           if (howManyAccordions > 1) {
               this.uiContextMenu
                   .addSubMenu("Mou desplegable", "fas fa fa-arrows-v")
                   .addMenuItem("A dalt", desplegableAction, "fas fa fa-arrow-up", {accordion: "mup"})
                   .addMenuItem("A baix", desplegableAction, "fas fa fa-arrow-down", {accordion: "mdwn"})
                   .endSubMenu();
           }
           this.uiContextMenu
               .addSubMenu("Afegir desplegable", "fas fa fa-plus")
               .addMenuItem("A dalt", desplegableAction, "", {accordion: "iup"})
               .addMenuItem("A baix", desplegableAction, "", {accordion: "idwn"})
               .endSubMenu()
               .addMenuItem("Eliminar desplegable", desplegableAction, "fas fa fa-trash", {accordion: "rm"})
               .addSeparator()
               .addMenuItem("Convertir a llista", desplegableAction, "", {accordion: "2list"});
    },
    "taula-predefinida": function() {
        let theadToggle = "Crear una";
        let tfootToggle = "Crear un";
        if (this.currentContext.elem.querySelector("thead")) {
            theadToggle = "Eliminar la";
        }
        if (this.currentContext.elem.querySelector("tfoot")) {
            tfootToggle = "Eliminar el";
        }
        const ampMax = convertInt((this.currentContext.elem.style.getPropertyValue("max-width") || '0').replace('px', ''), 0);

        const tableAction = contextMenuActions["taula-predefinida"].bind(this);

        this.uiContextMenu.addMenuItem(theadToggle + " capçalera", tableAction, "", {pos: "thead"})
            .addMenuItem(tfootToggle + " peu", tableAction, "", {pos: "tfoot"})
            .addNumericField("Amplada màxima (px)", contextMenuActions["taula-predefinida/maxwidth"].bind(this),
            "", {value: ampMax + ''});

        if (this.currentContext.elem.classList.contains("iedib-table")) {
            this.uiContextMenu.addSeparator()
                .addMenuItem("Convertir a taula Bootstrap", tableAction, "", {pos: "2bs"});
        } else {
            this.uiContextMenu.addSeparator()
                .addMenuItem("Convertir a taula predefinida", tableAction, "", {pos: "2pf"});
        }

        // Comportament responsiu en taules bs
        if (this.currentContext.snpt.key === "taula-bs") {
            const parent = this.currentContext.elem.parentElement;
            const isResponsive = parent != null && parent.nodeName === "DIV" && parent.classList.contains("table-responsive");
            if (isResponsive) {
                this.uiContextMenu.addSeparator()
                    .addMenuItem("Eliminar responsivitat", tableAction, "", {pos: "delres"});
            } else {
                this.uiContextMenu.addSeparator()
                    .addMenuItem("Afegir responsivitat", tableAction, "", {pos: "addres"});
            }
        }
    },
    "capsa-generica": function() {
        const clst = this.currentContext.elem.classList;
        let mida2 = "gran";
        if (clst.contains("iedib-capsa-petita")) {
            mida2 = "petita";
        }
        const midaCapsaAction = contextMenuActions["capsa/mida"].bind(this);
        this.uiContextMenu.addSubMenu("Mida")
            .addMenuItem("Petita", midaCapsaAction, mida2 === "petita" ? "fa fas fa-check" : "", {mida: "petita"})
            // .addMenuItem("Mitjana", that.midaCapsaAction, mida2 === "mitjana" ? "fa fas fa-check" : "",{ mida: "mitjana" })
            .addMenuItem("Gran", midaCapsaAction, mida2 === "gran" ? "fa fas fa-check" : "", {mida: "gran"})
            .endSubMenu();

         // Determine current language
         const currentLang = this.currentContext.elem.dataset.lang || "ca";
         // Retrieve language list
         console.log(this.currentContext);
         const widget = this.currentContext.snpt;
         if (widget != null) {
             const parameters = widget.parameters;
             const theLangParam = findVariableByName("LANG", parameters);
             if (theLangParam?.options) {
                const capsaAction = contextMenuActions["capsa"].bind(this);
                let oldtype = "alerta";
                const subMenuTipus =
                ["alerta", "ampliacio", "consell", "important", "introduccio"].map((ty) => {
                    let icon = "";
                    if (clst.contains("iedib-" + ty + "-border")) {
                         oldtype = ty;
                         icon = "fa fas fa-check";
                    }
                    return {name: ty, icon: icon, ds: {type: ty}, action: capsaAction};
                });
                const subMenu = this.uiContextMenu.addSubMenu("Idioma");
                theLangParam.options.forEach(opt => {
                     const icon = (opt.v === currentLang) ? "fa fas fa-check" : "";
                     subMenu.addMenuItem(opt.l, capsaAction, icon, {lang: opt.v, oldtype: oldtype, proposat: 'false'});
                });
                subMenu.endSubMenu();


                // Permet canviar de severitat de capsa (si no és tipus exemple ni de tasca/exercici)
                const subMenu2 = this.uiContextMenu.addSubMenu("Tipus");
                subMenuTipus.forEach((e) => {
                    subMenu2.addMenuItem(e.name, e.action, e.icon, e.ds);
                });
                subMenu2.endSubMenu();
             }
        }
    },
    "capsa-exemple-cols": function() {
        this.uiContextMenu.addMenuItem(
            "Convertir a exemple 2 files", contextMenuActions["capsa-exemple-cols"].bind(this));
    },
    "capsa-exemple-rows": function() {
        this.uiContextMenu.addMenuItem(
            "Convertir a exemple simple", contextMenuActions["capsa-exemple-rows"].bind(this));
    },
    "tasca-exercici": function() {
        // Determina l'idioma actual
        const currentLang = this.currentContext.elem.dataset.lang || "ca";
        // La llista d'idiomes
        const widget = this.currentContext.snpt;
        if (widget == null) {
            return;
        }
        const parameters = widget.parameters;
        const theLangParam = findVariableByName("LANG", parameters);
        if (theLangParam?.options) {
                let oldtype = "alerta";
                const subMenu = this.uiContextMenu.addSubMenu("Idioma");
                const capsaAction = contextMenuActions["capsa"];
                theLangParam.options.forEach(opt => {
                    const icon = (opt.v === currentLang) ? "fa fas fa-check" : "";
                    subMenu.addMenuItem(opt.l, capsaAction, icon, {lang: opt.v, oldtype: oldtype, proposat: 'true'});
                });
                subMenu.endSubMenu();


            const isQuizzEnabled = isUserAllowed(getGlobalConfig(this.editor)['enable.ibquizz.userlist'],
                getUserId(this.editor) + "");
            // Determina si és exercici proposat
            const proposatDiv = this.currentContext.elem.querySelector("div.iedib-tasca.iedib-proposat");
            if (proposatDiv && isQuizzEnabled) {
                // Té l'àrea quizz habilitada (crear un div addicional per tal de permetre més d'un grup)?
                const allQuizzGroups = proposatDiv.querySelectorAll('div[data-quizz-group]');

                if (allQuizzGroups.length === 0) {
                    // Dona la possibilitat de posar-ho tot d'un un grup
                    const actionToggleDS = () => {
                        const inspoint = proposatDiv.querySelector('.iedib-inspoint');
                        if (inspoint) {
                            inspoint.setAttribute('data-quizz-group', '');
                            this.handleRequires(['/sd/quizz.min.js']);
                            this.uiContextMenu.hide();
                            inspoint.after(document.createElement('p'));
                        }
                    };
                    this.uiContextMenu.addMenuItem("Converteix a àrea de qüestionari", actionToggleDS);
                }
            }
        }
    },
    "!ol": function() {
        // ! is an special key which is not an widget but detects ordered lists
        // To set falist style and allow to start from a certain number.
        const decorat = this.currentContext.elem.classList.contains("iedib-falist");
        const startFrom = convertInt(this.currentContext.elem.getAttribute('start'), 1);
        const olAction = contextMenuActions["!ol"].bind(this);
        this.uiContextMenu.addSubMenu("Estil")
            .addMenuItem("Normal", olAction, decorat ? "" : "fa fas fa-check", {ol: "snorm"})
            .addMenuItem("Embellit", olAction, decorat ? "fa fas fa-check" : "", {ol: "sfa"})
            .endSubMenu()
            .addNumericField("Comença en ...", olAction, "", {ol: "startAt", value: startFrom + ''});
    }
};

contextMenuItems["dinamic-presentacio"] = contextMenuItems["menu-pestanyes2"];
contextMenuItems["image-grid"] = contextMenuItems["imatge"];
contextMenuItems['taula-bs'] = contextMenuItems["taula-predefinida"];

export class ContextMenu {
    static _contextMenuInstances = {};
    /**
    * @member {tinyMCE} editor
    * @member {UiContextMenu} uiContextMenu
    * @member {PathResult} currentContext
    */
    editor;
    uiContextMenu;
    currentContext;
    clipBoard;
    /**
     * @param {TinyMCE} editor The tiny editor instance
     * @returns {ContextMenu} Creates and returns the contextMenu instance
    */
    static getInstance(editor) {
        if (this._contextMenuInstances[editor.id] == null) {
            this._contextMenuInstances[editor.id] = new ContextMenu(editor);
        }
        return this._contextMenuInstances[editor.id];
    }

    /**
     * @param {TinyMCE} editor
     */
    constructor(editor) {
        this.editor = editor;
        const userId = getUserId(editor);
        this.clipBoard = JSON.parse(localStorage.getItem("widgethub-clipboard_" + userId) || "[]");
        console.log("Initializing context menu ", editor.id, editor.dom);
        // Only keep those widgets that can be selected from DOM elements
        const widgetList = Object.values(getWidgetDict(editor)).filter((snpt) => snpt.selectors != null);

        // Manually add those which are not widgets but need a context menu
        // Identified by ! in key
        widgetList.push(new WidgetWrapper({
            key: "!ol",
            name: "Llista enumerada",
            selectors: "ol"
        }));

        const textArea = document.getElementById(editor.id);
        const iFrame = textArea.parentElement.querySelector("iframe");
        editor.on("contextmenu longpress", (evt) => {
            // Bind actions here
            console.log(evt);
            const result = findWidgetOnEventPath(widgetList, evt.target);
            this.currentContext = result;
            if (!this.uiContextMenu) {
                this.uiContextMenu = new UiContextMenu(this);
            } else {
                this.uiContextMenu.hide();
            }
            this.clipBoard = JSON.parse(localStorage.getItem("widgethub-clipboard_" + userId) || "[]");
            if (result.snpt) {
                // Disable other menus
                evt.preventDefault();
                // Build the context menu for this widget and display it
                console.log("Generating contextmenu for result ", result);
                this.uiContextMenu.clear();
                this.uiContextMenu.setTitle(result.snpt.name);

                // Should we include an Edit button?
                if (result.snpt.hasBindings()) {
                    contextMenuItems["@edit"].call(this);
                    this.uiContextMenu.addSeparator();
                }

                // Add any other menu item designed for this widget
                if (contextMenuItems[result.snpt.key]) {
                    console.log("Adding specific items for ", result.snpt.key);
                    contextMenuItems[result.snpt.key].call(this);
                }

                // Is this widget unpackable?
                if (result.snpt.unpack != null) {
                    contextMenuItems["@unpack"].call(this);
                }

                // Add cut action
                contextMenuItems["@cut"].call(this);

                // Is there any item in the clipboard?
                if (this.clipBoard.length) {
                    contextMenuItems["@paste"].call(this);
                }

                const rect = iFrame.getBoundingClientRect();
                this.uiContextMenu.show(evt.clientX + rect.left, evt.clientY + rect.top, evt);
            } else {
                // ALTERNATIVES
                let toBeShown = false;
                this.uiContextMenu.clear();
                // No widget found, but might have clipboard items
                if (evt.target.nodeName === 'IMG') {
                    this.currentContext.elem = evt.target;
                    this.uiContextMenu.setTitle("Imatge");
                    this.uiContextMenu.addMenuItem("Convertir a widget imatge", contextMenuActions["!img"].bind("this"));
                    evt.preventDefault();
                    toBeShown = true;
                }
                // Is there content in the clipboard?
                if (this.clipBoard.length) {
                    toBeShown = true;
                    // Disable other menus
                    evt.preventDefault();
                    this.uiContextMenu.setTitle("Portaretalls");
                    contextMenuItems["@paste"].call(this);
                }
                // Show the context menu
                if (toBeShown) {
                    const rect = iFrame.getBoundingClientRect();
                    this.uiContextMenu.show(evt.clientX + rect.left, evt.clientY + rect.top, evt);
                }
            }
        });
        // Hide de context menu when clicking on the main window (outside the editor)
        jQuery("body").on("click", (evt) => {
            if (!evt.target.closest(".dropdown-menu.ib-bsdialog")) {
                this.hide();
            }
        });
    }
    hide() {
        this.uiContextMenu?.hide();
    }
}


const SPACER = '<i style="display: inline-block;margin-left: 14px;"></i> ';
/**
 * This class defines a submenu item in the context menu UI
 */
class UiContextSubMenu {
    /**
     * @member {UiContextMenu | UiContextSubMenu} theParent
     */
    theParent;
    /**
     * @member {JQuery<HTMLElement>} theParent
     */
    $submenu;

    /**
     * @param {UiContextMenu | UiContextSubMenu} theParent
     * @param {string} name
     * @param {string?} icon
     */
    constructor(theParent, name, icon) {
        this.theParent = theParent;
        const icona = icon ? `<i class="${icon}" style="color:gray;width:14px;"></i>` : SPACER;
        const $elem =
        jQuery(`<li class="dropdown-submenu"><a class="moodle-dialogue dropdown-item" href="#">${icona} ${name}</a></li>`);
        this.$submenu = jQuery('<ul class="dropdown-menu"></ul>');
        $elem.append(this.$submenu);
        this.theParent.addLevel($elem);
    }

    /**
     * @returns {UiContextSubMenu}
     */
    addSeparator() {
        // Avoid 2 separators in a row
        if (!this.$submenu.find(":last-child").hasClass("dropdown-divider")) {
            this.$submenu.append(jQuery('<li class="dropdown-divider"></li>'));
        }
        return this;
    }

    /**
     * @param {string} name
     * @param {function(JQuery.TriggeredEvent): void} action
     * @param {string?} icon
     * @param {Object} ds
     * @returns {UiContextSubMenu}
     */
    addMenuItem(name, action, icon, ds) {
        const $elem = _createDropdownItem(name, icon, ds);
        this.$submenu.append($elem);
        $elem.on("click", action.bind(this.getRoot()));
        return this;
    }
    /**
     * @param {string} name
     * @param {function(JQuery.TriggeredEvent): void} action
     * @param {string?} icon
     * @param {Object} ds
     * @returns {UiContextSubMenu}
     */
    addNumericField(name, action, icon, ds) {
        const $elem = _createNumericFieldItem(this.getRoot(), name, action, icon, ds);
        this.$submenu.append($elem);
        return this;
    }

    /**
     * @returns {UiContextMenu}
     */
    endSubMenu() {
        return this.theParent;
    }

    /**
     * @returns {UiContextSubMenu}
    */
    endSubSubMenu() {
        return this.theParent;
    }

    /**
     * @returns {ContextMenu}
     */
    getRoot() {
        return this.theParent.getRoot();
    }

    /**
     * @param {JQuery<HTMLElement>} elem
     */
    addLevel(elem) {
        this.$submenu.append(elem);
    }

    /**
     * In case we need to add another level in the UiContextMenu
     * @param {string} name
     * @param {string?} icon
     * @returns {UiContextSubMenu}
     */
    addSubMenu(name, icon) {
        return new UiContextSubMenu(this, name, icon);
    }
}

/**
 *
 * @param {ContextMenu} root
 * @param {string} name
 * @param {function(JQuery.TriggeredEvent): void} action
 * @param {string?} icon
 * @param {Object?} ds
 * @returns {JQuery<HTMLElement>}
 */
function _createNumericFieldItem(root, name, action, icon, ds) {
    ds = ds || {};
    icon = icon ? ('<i class="' + icon + '" style="color:gray;width:14px;"></i> ') : SPACER;
    const $elem = jQuery(`<li class="dropdown-item">${icon} <span>${name}</span><br>
    ${SPACER}&nbsp;&nbsp;<input class="moodle-dialogue" type="number" value="${ds.value}" style="width:100px"/></li>`);
    const $input = $elem.find('input');
    $elem.append($input);
    if (ds != null) {
        const keys = Object.keys(ds);
        for (let i = 0, len = keys.length; i < len; i++) {
            const k = keys[i];
            const v = ds[k];
            $input.attr("data-" + k, v);
        }
    }
    $input.on('change', (evt) => {
        // Modify the value of the event
        const newVal = $input.val();
        if (newVal) {
            $input.attr('data-value', $input.val() + '' || '1');
            action.call(root, evt);
        }
    });
    return $elem;
}

/**
 * @param {string} name
 * @param {string?} icon
 * @param {Object?} ds
 * @returns {JQuery<HTMLElement>}
 */
function _createDropdownItem(name, icon, ds) {
    const $elem = jQuery('<li class="dropdown-item"></li>');
    const isTrash = icon && icon.indexOf("trash") > 0;
    const styleColor = isTrash ? 'darkred' : 'gray';
    icon = icon ? (`<i class="${icon}" style="color:${styleColor};width:14px;"></i> `) : SPACER;
    const $elemA = jQuery(`<a href="#" class="moodle-dialogue"${isTrash ? ' style="color:darkred;"' : ''}>${icon} ${name}</a>`);
    $elem.append($elemA);
    if (ds != null) {
        const keys = Object.keys(ds);
        for (let i = 0, len = keys.length; i < len; i++) {
            const k = keys[i];
            const v = ds[k];
            $elem.attr("data-" + k, v);
        }
    }
    return $elem;
}

/**
 * Class for the root of the UIContextMenu
 */
export class UiContextMenu {
    /**
     * @member {ContextMenu} popup
     */
    popup;
    /**
     * @member {JQuery<HTMLElement>} $popupMenu
     */
    $popupMenu;
    /**
     * @member {Event?} originalEvent
     */
    originalEvent;

    /**
     *
     * @param {ContextMenu} popup
     */
    constructor(popup) {
        this.popup = popup;
        this.$popupMenu = jQuery('#snpteditor_popup');
        if (this.$popupMenu.length === 0) {
            // eslint-disable-next-line max-len
            this.$popupMenu = jQuery('<ul id="snpteditor_popup" class="dropdown-menu ib-bsdialog" role="menu" style="-webkit-box-shadow: 4px 4px 7px 2px rgba(112,112,112,1);-moz-box-shadow: 4px 4px 7px 2px rgba(112,112,112,1);box-shadow: 4px 4px 7px 2px rgba(112,112,112,1);"></ul>');
            this.$popupMenu.css({"position": "fixed"});
            jQuery('body').append(this.$popupMenu);
        }
    }

    /**
     * @returns {UiContextMenu}
     */
    addSeparator() {
        // Avoid 2 separators in a row
        if (!this.$popupMenu.find(":last-child").hasClass("dropdown-divider")) {
            this.$popupMenu.append(jQuery('<li class="dropdown-divider"></li>'));
        }
        return this;
    }
    /**
     * @param {string} name
     * @returns {UiContextMenu}
     */
    addHeader(name) {
        this.$popupMenu.append(jQuery('<li class="dropdown-header">' + name + '</li>'));
        return this;
    }
    /**
     * @param {string} name
     * @param {function(JQuery.TriggeredEvent): void} action
     * @param {string?} icon
     * @param {Object?} ds
     * @returns {UiContextMenu}
     */
    addMenuItem(name, action, icon, ds) {
        const $elem = _createDropdownItem(name, icon, ds);
        this.$popupMenu.append($elem);
        $elem.on("click", action.bind(this.popup));
        return this;
    }
    /**
     * @param {string} name
     * @param {function(JQuery.TriggeredEvent): void} action
     * @param {string?} icon
     * @param {Object?} ds
     * @returns {UiContextMenu}
     */
    addNumericField(name, action, icon, ds) {
        const $elem = _createNumericFieldItem(this.getRoot(), name, action, icon, ds);
        this.$popupMenu.append($elem);
        return this;
    }
    /**
     * @param {string} name
     * @param {string?} icon
     * @returns {UiContextSubMenu}
     */
    addSubMenu(name, icon) {
        return new UiContextSubMenu(this, name, icon);
    }
    /**
     * @param {number} clientX
     * @param {number} clientY
     * @param {Event} originalEvent
     */
    show(clientX, clientY, originalEvent) {
        // Must check if context menu will be cut?
        const $d = jQuery(window);
        let mw = this.$popupMenu.width() || 100;
        let mh = this.$popupMenu.height() || 100;
        console.log("Popup show:: popup w and h ", mw, mh);
        // Check if the submenus are larger than this
        let maxwSubmenu = 0;
        let maxhSubmenu = 0;
        this.$popupMenu.find('li.dropdown-submenu').each((i, ele) => {
            const $ele = jQuery(ele);
            const smw = ($ele.width() || 100);
            const smh = ($ele.height() || 0);
            if (smw > maxwSubmenu) {
                maxwSubmenu = smw;
            }
            if (smh > maxhSubmenu) {
                maxhSubmenu = smh;
            }
        });
        mw = mw + maxwSubmenu;
        mh = mh + maxhSubmenu;
        const ww = $d.width() || 400;
        const wh = $d.height() || 200;
        console.log("Popup show:: window w and  h ", ww, wh);
        if (clientY + mh > wh) {
            clientY = wh - mh - 100;
        }
        if (clientX + mw > ww) {
            clientX = ww - mw - 100;
        }

        this.$popupMenu.show().css({
            left: clientX,
            top: clientY
        });
        this.originalEvent = originalEvent;
    }
    /**
     * @param {string} title
     */
    setTitle(title) {
        this.$popupMenu.find("h6 > span").text(title);
    }
    /**
     * Clears all the contents of the context menu
     */
    clear() {
        this.$popupMenu.find("a").off();
        this.$popupMenu.find("button").off();
        this.$popupMenu.html("");
        // Prepare the heading
        // eslint-disable-next-line max-len
        const $label = jQuery('<h6 class="dropdown-header" style="border-bottom: 1px solid lightgray;transform: translateY(-8px);padding: 0.5rem 0.8rem;"><span>Menú</span></h6>');
        // eslint-disable-next-line max-len
        const $closeSB = jQuery('<a class="moodle-dialogue" href="" title="Tancar" style="margin-left:10px;float:right;color:gray;"><i class="fad fa fa-times"></i></a>');
        $closeSB.on("click touchstart", (e2) => {
            e2.preventDefault();
            this.hide();
        });
        $label.append($closeSB);
        this.$popupMenu.append($label);
    }
    /**
     * Hides de context menu
     */
    hide() {
        this.$popupMenu.hide();
    }
    /**
     * @returns {ContextMenu}
     */
    getRoot() {
        return this.popup;
    }
    /**
     * @param {JQuery<HTMLElement>} elem
     */
    addLevel(elem) {
        this.$popupMenu.append(elem);
    }
}