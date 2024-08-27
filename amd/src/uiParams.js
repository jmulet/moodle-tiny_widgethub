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

import ModalFactory from 'core/modal_factory';
import {IBParamsModal} from './modal';
import ModalEvents from 'core/modal_events';
// eslint-disable-next-line no-unused-vars
import {stream, genID, templateRendererMustache, UserStorage, cleanParameterName, evalInContext, applyWidgetFilter, WidgetWrapper, capitalize} from './util';
import {getCourseId, getUserId} from './options';
// eslint-disable-next-line no-unused-vars
import {UiPickCtrl} from './uiPick';

const questionPopover = '{{#tooltip}}<a href="javascript:void(0)" data-toggle="popover" data-trigger="hover" data-content="{{tooltip}}"><i class="fa fas fa-question-circle text-info"></i></a>{{/tooltip}}';

const Templates = {
   FIELDTEMPLATE: `<div id="{{elementid}}" class="form-group{{#hidden}} tiny_widgethub-hidden{{/hidden}}"><label style="display:inline-block;width:49%;" for="{{elementid}}_ftmpl" title="{{varname}}">{{vartitle}} ${questionPopover}</label>
   <input type="text" style="display:inline-block;width:49%;" id="{{elementid}}_ftmpl" class="form-control" data-bar="{{varname}}" {{#disabled}}disabled{{/disabled}} value="{{defaultvalue}}"/>
   </div>`,

   IMAGETEMPLATE: `<div id="{{elementid}}" class="form-group{{#hidden}} tiny_widgethub-hidden{{/hidden}}"><label style="display:inline-block;width:39%;" for="{{elementid}}_ftmpl" title="{{varname}}">{{vartitle}} ${questionPopover}</label>
   <input type="text" style="display:inline-block;width:49%;" id="{{elementid}}_ftmpl" class="form-control" data-bar="{{varname}}" {{#disabled}}disabled{{/disabled}} value="{{defaultvalue}}"/>
   <button class="ib-image-picker btn btn-sm btn-secondary" title="Cercar" style="inline-block"><i class="fas fa fa-search"></i></button>
   </div>`,

   NUMERICTEMPLATE: `<div id="{{elementid}}" class="form-group{{#hidden}} tiny_widgethub-hidden{{/hidden}}"><label style="display:inline-block;width:49%;" for="{{elementid}}_fntmpl" title="{{varname}}">{{vartitle}} ${questionPopover}</label>
   <input type="number" style="display:inline-block;width:49%;" id="{{elementid}}_fntmpl" class="form-control" data-bar="{{varname}}" {{{minMax}}} {{#disabled}}disabled{{/disabled}} value="{{defaultvalue}}"/>
   </div>`,

   TEXTAREATEMPLATE: `<div id="{{elementid}}" class="form-group{{#hidden}} tiny_widgethub-hidden{{/hidden}}"><label for="{{elementid}}_tatmpl" title="{{varname}}">{{vartitle}} ${questionPopover}</label>
   <textarea id="{{elementid}}_tatmpl" rows="3" class="form-control" data-bar="{{varname}}" {{#disabled}}disabled{{/disabled}} {{#tooltip}}title="{{tooltip}}"{{/tooltip}}>{{defaultvalue}}</textarea>
   </div>`,

   CHECKBOXTEMPLATE: `<div id="{{elementid}}" style="display:table;width:96%;margin:5px;"{{#hidden}} class="tiny_widgethub-hidden"{{/hidden}}">
   <span style="margin-right:10px"><input title="{{varname}}" id="{{elementid}}_cbtmpl" {{#disabled}}disabled{{/disabled}}  type="checkbox" data-bar="{{varname}}" value="{{defaultvalue}}" {{#if}}[defaultvalue==1]checked{{/if}}/></span>
   <span>{{vartitle}}&nbsp;&nbsp;  ${questionPopover}</span>
   </div>`,

   SELECTTEMPLATE: `<div id="{{elementid}}" class="form-group{{#hidden}} tiny_widgethub-hidden{{/hidden}}">
   <label style="display:inline-block;width:49%;" for="{{elementid}}_stmpl" title="{{varname}}">{{vartitle}} ${questionPopover}</label>
   <select id="{{elementid}}_stmpl" style="display:inline-block;width:49%;" class="form-control" data-bar="{{varname}}" {{#if disabled}}disabled{{/if}}  {{#if tooltip}}title="{{tooltip}}"{{/if}}>
   {{#options}}
   <option value="{{optionValue}}"{{#selected}} selected{{/selected}}>{{optionLabel}}</option>
   {{/options}}
   </select>
   </div>`
};

export class UiParamsCtrl {
   uiPickCtrl;
   widget;
   editor;
   /**
    * @param {UiPickCtrl} uiPickCtrl
    * @param {import('./util').WidgetWrapper} widget
    */
   constructor(uiPickCtrl, widget) {
      this.uiPickCtrl = uiPickCtrl;
      this.widget = widget;
      this.editor = uiPickCtrl.editor;
      this.userStorage = UserStorage.getInstance(getUserId(this.editor), getCourseId(this.editor));
   }
   /**
    * Displays a dialogue for configuring the parameters of the selected snpt
    */
   async handleAction() {
      // Show modal with buttons.
      const data = await createParametersContext(this.editor, this.widget, this.userStorage);
      // @ts-ignore
      const modal = await ModalFactory.create({
         type: IBParamsModal.TYPE,
         templateContext: data,
         large: true,
      });
      this.modal = modal;
      // @ts-ignore
      modal.getRoot().on(ModalEvents.hidden, () => {
         // Simply close
         modal.destroy();
      });
      modal.body.find(`a[href="#${data.idTabpane}_1"`).on("click", async() => {
         // Handle preview;
         const ctxFromDialogue = getParametersFromForm(this.widget, modal.body.find("form"), null);
         await this.updatePreview(data.idTabpane, ctxFromDialogue);
      });
      modal.footer.show();
      modal.footer.find("button.btn-secondary").on("click", async() => {
         // Go back to main menú
         modal.destroy();
         await this.uiPickCtrl.handleAction();
      });
      modal.footer.find("button.btn-primary").on("click", async() => {
         // Go back to main menú
         const ctxFromDialogue = getParametersFromForm(this.widget, modal.body.find("form"), this.userStorage);
         modal.hide();
         await this.insertWidget(ctxFromDialogue);
         modal.destroy();
      });

      // Change input fields visibilities upon conditions
      const selectMode = this.editor.selection.getContent().trim() != '';
      applyFieldWatchers(modal.body, this.widget.defaults, this.widget, selectMode);

      modal.show();
   }

   destroy() {
      if (this.modal) {
         this.modal.destroy();
      }
   }

   /**
    * @param {Object.<string, any>} ctxFromDialogue
    * @returns {Promise<string>}
    */
   async generateInterpolatedCode(ctxFromDialogue) {
      const sel = this.editor.selection.getContent();
      // Decideix quin mode de selecció estam
      console.log("Selection", this.editor.selection, sel);
      let interpoledComponentCode = await this.widget.render(ctxFromDialogue);
      if (sel.trim() && this.widget.insertquery) {
         // We are in selection mode
         const tmpDiv = document.createElement("div");
         tmpDiv.innerHTML = interpoledComponentCode;
         const insertPoint = tmpDiv.querySelector(this.widget.insertquery);
         if (insertPoint) {
            insertPoint.innerHTML = sel;
            interpoledComponentCode = tmpDiv.innerHTML;
         }
      }
      return interpoledComponentCode;
   }

   /**
    * @param {number} idTabpane
    * @param {Object.<string, any>} ctxFromDialogue
    * @returns
    */
   async updatePreview(idTabpane, ctxFromDialogue) {
      const interpoledCode = await this.generateInterpolatedCode(ctxFromDialogue);
      const $previewPanel = this.modal.body.find(`#${idTabpane}_1`);
      $previewPanel.html(interpoledCode);
   }

   /**
    * @param {Object.<string, any>} ctxFromDialogue
    * @returns
    */
   async insertWidget(ctxFromDialogue) {
      const recentWidgets = this.userStorage.getFromSession("recentsnpt", "").split(",").filter(e=>e.trim());
      const pos = recentWidgets.indexOf(this.widget.key);
      if (pos >= 0) {
         recentWidgets.splice(pos, 1);
      }
      recentWidgets.unshift(this.widget.key);
      if (recentWidgets.length > 4) {
         recentWidgets.splice(5, recentWidgets.length - 4);
      }

      this.userStorage.setToSession("recentsnpt", recentWidgets.join(","), true);

      if (this.widget.isFilter()) {
         applyWidgetFilter(this.editor, this.widget.template || '', false, ctxFromDialogue);
         return;
      }
      const interpoledCode = await this.generateInterpolatedCode(ctxFromDialogue);
      // Normal insert mode
      this.editor.selection.setContent(interpoledCode);
      this.editor.focus();
   }
}

/**
 * Generates the context to render the modal dialogue with mustache template
 * @param {import('./plugin').TinyMCE} editor
 * @param {WidgetWrapper} widget - the widget for which to show de dialogue
 * @param {UserStorage} userStorage
 * @returns {Promise<Object.<string, any>>} - The generated context
 */
const createParametersContext = async(editor, widget, userStorage) => {
   /** @type {boolean} */
   const mustSaveAll = userStorage.getFromLocal('saveall', false);
   /** @type {Object.<string, any>} */
   const saveAllData = userStorage.getFromLocal('saveall_data', {});
   /** @type {Object.<string, any>} */
   const valors = userStorage.getFromLocal("valors", {});
   const defaults = widget.defaults;

   /**
    * @param {import('./util').Param} param
    * @returns {*}
    */
   const obtainCurrentValue = function(param) {
      const sname = widget.name;
      const pname = param.name;
      let currentval = defaults[pname];
      if (mustSaveAll) {
         // Search the last used value of this parameter
         if (saveAllData[sname]?.[pname] != null) {
            currentval = saveAllData[sname][pname];
         }
      }
      if (pname.startsWith("$") && valors[pname]) {
         currentval = valors[pname];
      }
      return currentval;
   };

   const controls = widget.parameters.map(param =>
      createControlHTML(editor.id, param, obtainCurrentValue(param)));

   const ctx = {
      idTabpane: genID(),
      selectMode: editor.selection.getContent().trim().length > 0,
      name: widget.name,
      instructions: widget.instructions,
      filter: widget.isFilter(),
      controls: controls
   };
   return ctx;
};

/**
 * Generates the HTML to render the control associated with the parameter
 * @param {string} hostId - The id of the editor
 * @param {import('./util').Param} param - The parameter object defining the control
 * @param {any} defaultValue - Default values for all parameters
 * @returns {string} - The generated HTML for this control
 */
export const createControlHTML = function(hostId, param, defaultValue) {
   let template = '';
   const pname = cleanParameterName(param.name);
   const generalCtx = {
      elementid: hostId + "_" + pname,
      varname: pname,
      vartitle: param.title,
      defaultvalue: defaultValue,
      tooltip: param.tip || param.tooltip,
      disabled: param.editable === false,
      hidden: param.hidden === true
   };
   if (param.type === 'textarea') {
      template = templateRendererMustache(Templates.TEXTAREATEMPLATE, generalCtx);
   } else if (param.type === 'numeric') {
      let minMax = "";
      if (param.min) {
         minMax += `min="${param.min}"`;
      }
      if (param.max) {
         minMax += ` max="${param.max}"`;
      }
      template = templateRendererMustache(Templates.NUMERICTEMPLATE, {minMax: minMax, ...generalCtx});
   } else if (param.type === 'checkbox') {
      template = templateRendererMustache(Templates.CHECKBOXTEMPLATE, generalCtx);
   } else if (param.type === 'select') {
      const options = (param.options ?? []).map(opt => {
         let label;
         let value;
         if (typeof opt === 'string') {
            label = capitalize(opt);
            value = opt;
         } else {
            label = opt.l;
            value = opt.v;
         }
         return {optionLabel: label, optionValue: value, selected: value === defaultValue};
      });
      template = templateRendererMustache(Templates.SELECTTEMPLATE, {options, ...generalCtx});
   } else if (param.type === 'image') {
      template = templateRendererMustache(Templates.IMAGETEMPLATE, generalCtx);
   } else {
      // Assume textfield
      template = templateRendererMustache(Templates.FIELDTEMPLATE, generalCtx);
   }
   return template;
};


/**
 * Obtains the updated parameter values from the modal
 * This is used in insertWidget
 * @param {WidgetWrapper} widget
 * @param {JQuery<HTMLElement>} form
 * @param {UserStorage?} userStorage
 * @returns {Object.<string, any>} - The updated parameters dict
 */
export const getParametersFromForm = (widget, form, userStorage) => {
   /** @type {Object.<string, any>}  */
   const ctx = {};
   /** @type {Object.<string, any>}  */
   const toPersist = {};
   const defaults = widget.defaults;
   widget.parameters.forEach(param => {
      const pname = param.name;
      const cleanPname = cleanParameterName(pname);
      const $elem = form.find(`[data-bar="${cleanPname}"]`);
      if (!$elem.length) {
         ctx[pname] = defaults[pname];
         return;
      }
      /** @type {*} */
      let value = $elem.val() || "";
      if ($elem.prop("tagName") === "INPUT" && $elem.attr("type") === "checkbox") {
         value = $elem.is(':checked');
      } else if (param.transform) {
         value = stream(param.transform).reduce(value);
      }
      ctx[pname] = value;
      if (pname.trim().startsWith("$")) {
         toPersist[pname] = value;
      }
   });
   if (userStorage) {
      if (Object.keys(toPersist).length) {
         // Only those starting with $
         userStorage.setToLocal('valors', toPersist, true);
      }
      // Ha de persistir tots els valors?
      const mustSaveAll = userStorage.getFromLocal('saveall', false);
      if (mustSaveAll) {
         /** @type {Object.<string, any>}  */
         const previousAllData = userStorage.getFromLocal('saveall_data', {});
         previousAllData[widget.name] = {...ctx};
         userStorage.setToLocal('saveall_data', previousAllData, true);
      }
   }
   return ctx;
};


/**
 * @param {JQuery<HTMLElement>} $formElem
 * @param {Object.<string, any>} defaultsData
 * @param {WidgetWrapper} widget
 * @param {boolean} selectMode
 */
export const applyFieldWatchers = function($formElem, defaultsData, widget, selectMode) {
   /** @type {string[]} */
   const watchedvars = []; // All these variable names must be watched
   /**
    * all these components must be updated when one watcher changes
    *  @type {{
    *    condition: string,
    *    component: JQuery<HTMLElement>,
    *    type: string,
    *    indx: number
    *  }[]}
    */
   const updatableComponents = [];

   const regex = /\{{2}([^}]*)\}{2}/gm;
   for (let indx = 0, len = widget.parameters.length; indx < len; indx++) {

      const varobj = widget.parameters[indx];

      if (varobj.when) {
         const condition = varobj.when;
         const t = varobj.type;
         const control = $formElem.find(`[data-bar="${cleanParameterName(varobj.name)}"]`);
         if (!control.length || !t) {
            continue;
         }
         updatableComponents.push({
            condition: condition.replace(/[{}]{2}/g, ''),
            component: control,
            indx: indx,
            type: t
         });
         const varsInvolved = condition.match(regex);
         varsInvolved?.forEach(evar => {
            evar = evar.replace(/[{}]*/g, '').trim();
            // Can only watch real variables SELECT_MODE is not a variable
            console.log("evar", evar, defaultsData);
            if (watchedvars.indexOf(evar) < 0 && defaultsData[evar] != null) {
               console.log("ADDED AS WATCH");
               watchedvars.push(evar);
            }
         });
      }
      watchedvars.push(varobj.name);
   }

   console.log(watchedvars);
   console.log(updatableComponents);


   const doUpdateVisibilities = () => {
      updatableComponents.forEach(cc => {
         // Evaluate condition
         console.log("Amagant ", cc);
         const condicio = cc.condition;
         const novesVariables = getParametersFromForm(widget, $formElem, null);
         console.log("Obtained the new variables from the form ", novesVariables);
         // Add to the new variables the internal variables
         novesVariables.SELECT_MODE = selectMode;
         // Eval JS condition for new variables
         const showme = evalInContext(novesVariables, condicio);
         let theComponent = cc.component;
         if (theComponent) {
            theComponent = theComponent.parent();
            if (cc.type === 'checkbox') {
               theComponent = theComponent.parent();
            }
            // Only change visibilities of nodes not hidden from user
            console.log("Changing visibilities of ", theComponent, " condition ", condicio, " evals to ", showme);
            if (!theComponent.attr('data-amagat')) {
               if (showme) {
                  theComponent.show();
               } else {
                  theComponent.hide();
               }
            }
         }
      });
   };

   // Apply the watchers
   widget.parameters.forEach((varobj) => {
      const control = $formElem.find(`[data-bar="${cleanParameterName(varobj.name)}"]`);
      if (watchedvars.indexOf(varobj.name) < 0 || !control) {
         return;
      }
      console.log("that must be watched", varobj);
      let evtName = "change";
      if (varobj.type === 'textfield' || varobj.type === 'textarea') {
         evtName = "keyup";
      }
      control.on(evtName, (e) => {
         console.log(e);
         doUpdateVisibilities();
      });
   });

   // Decide which form elements are visible accoding to the current values of the parameters.
   doUpdateVisibilities();
};
