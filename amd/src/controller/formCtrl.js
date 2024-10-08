/* eslint-disable max-len */
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
import { capitalize, cleanParameterName, evalInContext, genID, stream, toHexColor } from '../util';


const questionPopover = '{{#tooltip}}<a href="javascript:void(0)" data-toggle="popover" data-trigger="hover" data-content="{{tooltip}}"><i class="fa fas fa-question-circle text-info"></i></a>{{/tooltip}}';

const Templates = {
   FIELDTEMPLATE: `<div id="{{elementid}}" class="form-group row{{#hidden}} tiny_widgethub-hidden{{/hidden}}"><label class="col-sm-5 col-form-label" for="{{elementid}}_ftmpl" title="{{varname}}">{{vartitle}} ${questionPopover}</label>
   <div class="col-sm-7"><input type="text" id="{{elementid}}_ftmpl" class="form-control" data-bar="{{varname}}" {{#disabled}}disabled{{/disabled}} value="{{defaultvalue}}"/></div>
   </div>`,

   IMAGETEMPLATE: `<div id="{{elementid}}" class="form-group row{{#hidden}} tiny_widgethub-hidden{{/hidden}}"><label class="col-sm-5 col-form-label" for="{{elementid}}_ftmpl" title="{{varname}}">{{vartitle}} ${questionPopover}</label>
   <div class="col-sm-7">
   <input type="text" id="{{elementid}}_ftmpl" class="form-control d-inline-block w-75" data-bar="{{varname}}" {{#disabled}}disabled{{/disabled}} value="{{defaultvalue}}"/>
   <button class="whb-image-picker btn btn-sm btn-secondary d-inline-block" title="Search"><i class="fas fa fa-search"></i></button>
   </div>
   </div>`,

   NUMERICTEMPLATE: `<div id="{{elementid}}" class="form-group row{{#hidden}} tiny_widgethub-hidden{{/hidden}}"><label class="col-sm-5 col-form-label"  for="{{elementid}}_fntmpl" title="{{varname}}">{{vartitle}} ${questionPopover}</label>
   <div class="col-sm-7"><input type="number" id="{{elementid}}_fntmpl" class="form-control" data-bar="{{varname}}" {{{minMax}}} {{#disabled}}disabled{{/disabled}} value="{{defaultvalue}}"/></div>
   </div>`,

   COLORTEMPLATE: `<div id="{{elementid}}" class="form-group row{{#hidden}} tiny_widgethub-hidden{{/hidden}}"><label class="col-sm-5 col-form-label"  for="{{elementid}}_fntmpl" title="{{varname}}">{{vartitle}} ${questionPopover}</label>
   <div class="col-sm-7"><input type="color" id="{{elementid}}_fntmpl" class="form-control" data-bar="{{varname}}" {{#disabled}}disabled{{/disabled}} value="{{defaultvalue}}"/></div>
   </div>`,

   TEXTAREATEMPLATE: `<div id="{{elementid}}" class="form-group{{#hidden}} tiny_widgethub-hidden{{/hidden}}"><label for="{{elementid}}_tatmpl" title="{{varname}}">{{vartitle}} ${questionPopover}</label>
   <textarea id="{{elementid}}_tatmpl" rows="3" class="form-control" data-bar="{{varname}}" {{#disabled}}disabled{{/disabled}} {{#tooltip}}title="{{tooltip}}"{{/tooltip}}>{{defaultvalue}}</textarea>
   </div>`,

   CHECKBOXTEMPLATE: `<div id="{{elementid}}" class="d-table w-75 m-2{{#hidden}} tiny_widgethub-hidden{{/hidden}}">
   <label>
   <input title="{{varname}}" id="{{elementid}}_cbtmpl" {{#disabled}}disabled{{/disabled}} type="checkbox" data-bar="{{varname}}" value="{{defaultvalue}}" {{#defaultvalue}}checked{{/defaultvalue}}/></span>
   {{vartitle}}</label> <span>&nbsp;&nbsp;  ${questionPopover}</span>
   </div>`,

   SELECTTEMPLATE: `<div id="{{elementid}}" class="form-group row{{#hidden}} tiny_widgethub-hidden{{/hidden}}">
   <label class="col-sm-5 col-form-label" for="{{elementid}}_stmpl" title="{{varname}}">{{vartitle}} ${questionPopover}</label>
   <div class="col-sm-7">
   <select id="{{elementid}}_stmpl" class="form-control" data-bar="{{varname}}" {{#if disabled}}disabled{{/if}} {{#if tooltip}}title="{{tooltip}}"{{/if}}>
   {{#options}}
   <option value="{{optionValue}}"{{#selected}} selected{{/selected}}>{{optionLabel}}</option>
   {{/options}}
   </select>
   </div>
   </div>`
};


export class FormCtrl {
  /**
   * @param {import('../plugin').TinyMCE} editor
   * @param {import('../service/userStorageSrv').UserStorageSrv} userStorage
   * @param {import('../service/templateSrv').TemplateSrv} templateSrv
   * @param {import('../container').FileSrv} fileSrv
   * @param {JQueryStatic} jQuery
   */
   constructor(editor, userStorage, templateSrv, fileSrv, jQuery) {
      /** @type {import('../plugin').TinyMCE} */
      this.editor = editor;
      /** @type {import('../service/userStorageSrv').UserStorageSrv} */
      this.storage = userStorage;
      /** @type {import('../service/templateSrv').TemplateSrv} */
      this.templateSrv = templateSrv;
      /** @type {import('../container').FileSrv} */
      this.fileSrv = fileSrv;
      /** @type {JQueryStatic} */
      this.jQuery = jQuery;
   }

   /**
    * @param {import('../options').WidgetWrapper} widget
    * @returns {*} - The generated context
    */
   createContext(widget) {
      /** @type {boolean} */
      const mustSaveAll = this.storage.getFromLocal('saveall', false);
      /** @type {Object.<string, any>} */
      const saveAllData = this.storage.getFromLocal('saveall_data', {});
      /** @type {Object.<string, any>} */
      const valors = this.storage.getFromLocal("valors", {});
      const defaults = widget.defaults;

      /**
       * @param {import('../options').Param} param
       * @returns {any}
       */
      const obtainCurrentValue = (param) => {
         const sname = widget.name;
         const pname = param.name;
         let currentval = defaults[pname];
         if (mustSaveAll) {
            // Search the last used value of this parameter
            if ((saveAllData[sname]?.[pname] ?? null) !== null) {
               currentval = saveAllData[sname][pname];
            }
         }
         if (pname.startsWith("$") && valors[pname]) {
            currentval = valors[pname];
         }
         return currentval;
      };

      const controls = widget.parameters.map(param => this.createControlHTML(this.editor.id, param, obtainCurrentValue(param)));

      const ctx = {
         idTabpane: genID(),
         selectMode: this.editor.selection.getContent().trim().length > 0,
         name: widget.name,
         instructions: widget.instructions,
         filter: widget.isFilter(),
         controls: controls
      };
      return ctx;
   }

   /**
    * @param {string} hostId - The id of the editor
    * @param {import('../options').Param} param - The parameter object defining the control
    * @param {any} defaultValue - Default values for all parameters
    * @returns {string} - The generated HTML for this control
    */
   createControlHTML(hostId, param, defaultValue) {
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
         template = this.templateSrv.renderMustache(Templates.TEXTAREATEMPLATE, generalCtx);
      } else if (param.type === 'numeric') {
         let minMax = "";
         if (param.min) {
            minMax += `min="${param.min}"`;
         }
         if (param.max) {
            minMax += ` max="${param.max}"`;
         }
         template = this.templateSrv.renderMustache(Templates.NUMERICTEMPLATE, { minMax: minMax, ...generalCtx });
      } else if (param.type === 'checkbox') {
         template = this.templateSrv.renderMustache(Templates.CHECKBOXTEMPLATE, generalCtx);
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
            return { optionLabel: label, optionValue: value, selected: value === defaultValue };
         });
         template = this.templateSrv.renderMustache(Templates.SELECTTEMPLATE, { options, ...generalCtx });
      } else if (param.type === 'color') {
         // Value must be in hex form
         generalCtx.defaultvalue = toHexColor(generalCtx.defaultvalue);
         template = this.templateSrv.renderMustache(Templates.COLORTEMPLATE, generalCtx);
      } else if (param.type === 'image') {
         template = this.templateSrv.renderMustache(Templates.IMAGETEMPLATE, generalCtx);
      } else {
         // Assume textfield
         template = this.templateSrv.renderMustache(Templates.FIELDTEMPLATE, generalCtx);
      }
      return template;
   }



   /**
    * Obtains the updated parameter values from the modal
    * This is used in insertWidget
    * @param {import('../options').WidgetWrapper} widget
    * @param {JQuery<HTMLElement>} form
    * @returns {Record<string, any>} - The updated parameters dict
    */
   extractFormParameters(widget, form) {
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
      if (this.storage) {
         if (Object.keys(toPersist).length) {
            // Only those starting with $
            this.storage.setToLocal('valors', toPersist, true);
         }
         // Should all values be persisted?
         const mustSaveAll = this.storage.getFromLocal('saveall', false);
         if (mustSaveAll) {
            /** @type {Object.<string, any>}  */
            const previousAllData = this.storage.getFromLocal('saveall_data', {});
            previousAllData[widget.name] = { ...ctx };
            this.storage.setToLocal('saveall_data', previousAllData, true);
         }
      }
      return ctx;
   }

   /**
    * @param {JQuery<HTMLElement>} body - The modal body
    */
   attachImagePickers(body) {
      const canShowFilePicker = typeof this.fileSrv.getImagePicker() !== 'undefined';
      const picker = body.find('button.whb-image-picker').prop('disabled', !canShowFilePicker);
      if (canShowFilePicker) {
         // Attach a click handler to any image-picker buttons
         picker.on("click", /** @param {any} evt */ async (evt) => {
            evt.preventDefault();
            try {
               /** @type {any} */
               const params = await this.fileSrv.displayImagePicker();
               if (params?.url) {
                  this.jQuery(evt.currentTarget).parent().find('input').val(params.url);
               }
            } catch (ex) {
               console.error(ex);
            }
         });
      }
   }

   /**
    * @param {JQuery<HTMLElement>} $formElem
    * @param {Object.<string, any>} defaultsData
    * @param {import('../options').WidgetWrapper} widget
    * @param {boolean} selectMode
    */
   applyFieldWatchers($formElem, defaultsData, widget, selectMode) {
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
               if (watchedvars.indexOf(evar) < 0 && (defaultsData[evar] ?? null) !== null) {
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
            const novesVariables = this.extractFormParameters(widget, $formElem);
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
   }
}