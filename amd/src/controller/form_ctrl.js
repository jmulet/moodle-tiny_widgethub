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
import {getFileSrv} from '../service/file_service';
import {getTemplateSrv} from '../service/template_service';
import {getUserStorage} from '../service/userstorage_service';
import {capitalize, cleanParameterName, evalInContext, genID, stream, toHexAlphaColor, toRgba} from '../util';
import jquery from "jquery";

const questionPopover = '{{#tooltip}}<a href="javascript:void(0)" data-toggle="popover" data-trigger="hover" data-content="{{tooltip}}" data-bs-toggle="popover" data-bs-trigger="hover" data-bs-content="{{tooltip}}"><i class="fa fas fa-question-circle text-info"></i></a>{{/tooltip}}';

export const Templates = {
   TEXTFIELDTEMPLATE: `<div id="{{elementid}}" class="form-group row mx-1{{#hidden}} d-none{{/hidden}}"><label class="col-sm-5 col-form-label" for="{{elementid}}_ftmpl" title="{{varname}}">{{vartitle}} ${questionPopover}</label>
   <div class="col-sm-7"><input type="text" id="{{elementid}}_ftmpl" class="form-control" name="{{varname}}" {{#disabled}}disabled{{/disabled}} value="{{defaultvalue}}"/></div>
   </div>`,

   IMAGETEMPLATE: `<div id="{{elementid}}" class="form-group row mx-1{{#hidden}} d-none{{/hidden}}"><label class="col-sm-5 col-form-label" for="{{elementid}}_ftmpl" title="{{varname}}">{{vartitle}} ${questionPopover}</label>
   <div class="col-sm-7">
   <input type="text" id="{{elementid}}_ftmpl" class="form-control d-inline-block w-75" name="{{varname}}" {{#disabled}}disabled{{/disabled}} value="{{defaultvalue}}"/>
   <button class="whb-image-picker btn btn-sm btn-secondary d-inline-block" title="Search"><i class="fas fa fa-search"></i></button>
   </div>
   </div>`,

   NUMERICTEMPLATE: `<div id="{{elementid}}" class="form-group row mx-1{{#hidden}} d-none{{/hidden}}"><label class="col-sm-5 col-form-label"  for="{{elementid}}_fntmpl" title="{{varname}}">{{vartitle}} ${questionPopover}</label>
   <div class="col-sm-7"><input type="number" id="{{elementid}}_fntmpl" class="form-control" name="{{varname}}" {{{minMax}}} {{#disabled}}disabled{{/disabled}} value="{{defaultvalue}}"/></div>
   </div>`,

   COLORTEMPLATE: `<div id="{{elementid}}" class="form-group row mx-1{{#hidden}} d-none{{/hidden}}"><label class="col-sm-5 col-form-label"  for="{{elementid}}_fntmpl" title="{{varname}}">{{vartitle}} ${questionPopover}</label>
   <div class="col-sm-7">
   <span class="w-50 tiny_widgethub-pattern">
      <input type="color" id="{{elementid}}_fctmpl" name="{{varname}}" {{#disabled}}disabled{{/disabled}} value="{{defaultvalue}}"/>
   </span>
   <input type="range" id="{{elementid}}_fcatmpl" title="Opacity" name="{{varname}}_alpha" {{#disabled}}disabled{{/disabled}} value="{{defaultvalueAlpha}}" min="0" max="1" step="0.01"/>
   </div></div>`,

   TEXTAREATEMPLATE: `<div id="{{elementid}}" class="form-group{{#hidden}} d-none{{/hidden}}"><label for="{{elementid}}_tatmpl" title="{{varname}}">{{vartitle}} ${questionPopover}</label>
   <textarea id="{{elementid}}_tatmpl" rows="3" class="form-control" name="{{varname}}" {{#disabled}}disabled{{/disabled}} {{#tooltip}}title="{{tooltip}}"{{/tooltip}}>{{defaultvalue}}</textarea>
   </div>`,

   CHECKBOXTEMPLATE: `<div id="{{elementid}}" class="form-group w-75 m-2{{#hidden}} d-none{{/hidden}}">
   <label>
   <input title="{{varname}}" id="{{elementid}}_cbtmpl" {{#disabled}}disabled{{/disabled}} type="checkbox" name="{{varname}}" value="{{defaultvalue}}" {{#defaultvalue}}checked{{/defaultvalue}}/></span>
   {{vartitle}}</label> <span>&nbsp;&nbsp;  ${questionPopover}</span>
   </div>`,

   SELECTTEMPLATE: `<div id="{{elementid}}" class="form-group row mx-1{{#hidden}} d-none{{/hidden}}">
   <label class="col-sm-5 col-form-label" for="{{elementid}}_stmpl" title="{{varname}}">{{vartitle}} ${questionPopover}</label>
   <div class="col-sm-7">
   <select id="{{elementid}}_stmpl" class="form-control" name="{{varname}}" {{#disabled}}disabled{{/disabled}} {{#tooltip}}title="{{tooltip}}"{{/tooltip}}>
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
   * @param {import('../service/userstorage_service').UserStorageSrv} userStorage
   * @param {import('../service/template_service').TemplateSrv} templateSrv
   * @param {import('../service/file_service').FileSrv} fileSrv
   * @param {JQueryStatic} jQuery
   */
   constructor(editor, userStorage, templateSrv, fileSrv, jQuery) {
      /** @type {import('../plugin').TinyMCE} */
      this.editor = editor;
      /** @type {import('../service/userstorage_service').UserStorageSrv} */
      this.storage = userStorage;
      /** @type {import('../service/template_service').TemplateSrv} */
      this.templateSrv = templateSrv;
      /** @type {import('../service/file_service').FileSrv} */
      this.fileSrv = fileSrv;
      /** @type {JQueryStatic} */
      this.jQuery = jQuery;
   }

   /**
    * @param {import('../options').Widget} widget
    * @returns {*} - The generated context
    */
   createContext(widget) {
      /** @type {boolean} */
      const mustSaveAll = this.storage.getFromLocal('saveall', false);
      /** @type {Object.<string, any>} */
      const saveAllData = this.storage.getFromLocal('saveall_data', {});
      /** @type {Object.<string, any>} */
      const values = this.storage.getFromLocal("values", {});
      const defaults = widget.defaults;

      /**
       * @param {import('../options').Param} param
       * @returns {any}
       */
      const obtainCurrentValue = (param) => {
         const sname = widget.key;
         const pname = param.name;
         let currentval = defaults[pname];
         if (pname.startsWith("_") && values[pname]) {
            currentval = values[pname];
         }
         if (mustSaveAll) {
            // Search the last used value of this parameter
            if ((saveAllData[sname]?.[pname] ?? null) !== null) {
               currentval = saveAllData[sname][pname];
            }
         }
         return currentval;
      };

      const controls = widget.parameters.map(param => this.createControlHTML(this.editor.id, param, obtainCurrentValue(param)));

      const ctx = {
         idtabpane: genID(),
         selectmode: this.editor.selection.getContent().trim().length > 0,
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
    * @param {any} defaultValue - Default values for the parameter
    * @returns {string} - The generated HTML for this control
    */
   createControlHTML(hostId, param, defaultValue) {
      let markup = '';
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
         markup = this.templateSrv.renderMustache(Templates.TEXTAREATEMPLATE, generalCtx);
      } else if (param.type === 'numeric') {
         let minMax = "";
         if (param.min) {
            minMax += `min="${param.min}"`;
         }
         if (param.max) {
            minMax += ` max="${param.max}"`;
         }
         markup = this.templateSrv.renderMustache(Templates.NUMERICTEMPLATE, {minMax: minMax, ...generalCtx});
      } else if (param.type === 'checkbox') {
         markup = this.templateSrv.renderMustache(Templates.CHECKBOXTEMPLATE, generalCtx);
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
         markup = this.templateSrv.renderMustache(Templates.SELECTTEMPLATE, {options, ...generalCtx});
      } else if (param.type === 'color') {
         // Value must be in hex form and must find alpha (0-1)
         const [hex, alpha] = toHexAlphaColor(generalCtx.defaultvalue);
         generalCtx.defaultvalue = hex;
         /** @ts-ignore */
         generalCtx.defaultvalueAlpha = alpha;
         markup = this.templateSrv.renderMustache(Templates.COLORTEMPLATE, generalCtx);
      } else if (param.type === 'image') {
         markup = this.templateSrv.renderMustache(Templates.IMAGETEMPLATE, generalCtx);
      } else {
         // Assume textfield
         markup = this.templateSrv.renderMustache(Templates.TEXTFIELDTEMPLATE, generalCtx);
      }
      return markup;
   }


   /**
    * Obtains the updated parameter values from the modal
    * This is used in insertWidget
    * @param {import('../options').Widget} widget
    * @param {JQuery<HTMLElement>} form
    * @param {boolean} doStore
    * @returns {Record<string, any>} - The updated parameters dict
    */
   extractFormParameters(widget, form, doStore) {
      /** @type {Object.<string, any>}  */
      const ctx = {};
      /** @type {Object.<string, any>}  */
      const toPersist = {};
      const defaults = widget.defaults;
      widget.parameters.forEach(param => {
         const pname = param.name;
         const cleanPname = cleanParameterName(pname);
         const $elem = form.find(`[name="${cleanPname}"]`);
         if (!$elem.length) {
            ctx[pname] = defaults[pname];
            return;
         }
         /** @type {*} */
         let value = $elem.val() ?? "";
         if ($elem.prop("tagName") === "INPUT" && $elem.attr("type") === "checkbox") {
            value = $elem.is(':checked');
         } else if ($elem.prop("tagName") === "INPUT" && $elem.attr("type") === "number") {
            if (value.indexOf(".") >= 0) {
               value = parseFloat(value);
            } else {
               value = parseInt(value);
            }
         } else if ($elem.prop("tagName") === "INPUT" && $elem.attr("type") === "color") {
            // Must also find the corresponding alpha channel value
            const $slider = form.find(`[name="${cleanPname}_alpha"]`);
            const alpha = $slider.val() ?? 1;
            value = toRgba(value, +alpha);
         }

         if (param.transform) {
            value = stream(param.transform).reduce(value);
         }
         ctx[pname] = value;
         if (pname.trim().startsWith("_")) {
            toPersist[pname] = value;
         }
      });
      if (doStore && this.storage) {
         if (Object.keys(toPersist).length) {
            // Only those starting with $
            this.storage.setToLocal('values', toPersist, true);
         }
         // Should all values be persisted?
         const mustSaveAll = this.storage.getFromLocal('saveall', false);
         if (mustSaveAll) {
            /** @type {Object.<string, any>}  */
            const previousAllData = this.storage.getFromLocal('saveall_data', {});
            previousAllData[widget.name] = {...ctx};
            this.storage.setToLocal('saveall_data', previousAllData, true);
         }
      }
      return ctx;
   }

   /**
    * @param {JQuery<HTMLElement>} body - The modal body
    */
   attachPickers(body) {
      // Find all file pickers
      const canShowFilePicker = typeof this.fileSrv.getImagePicker() !== 'undefined';
      const picker = body.find('button.whb-image-picker').prop('disabled', !canShowFilePicker);
      if (canShowFilePicker) {
         // Attach a click handler to any image-picker buttons
         picker.on("click", /** @param {any} evt */ async(evt) => {
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

      // Find all color pickers
      body.find('input[type="color"]').each((_, e) => {
         const $inputColor = this.jQuery(e);
         const name = ($inputColor.attr('name') ?? '');
         // Find corresponding range slider
         const $inputRange = body.find(`input[name="${name}_alpha"]`);
         const opacity = $inputRange.val() ?? 1;
         $inputColor.css('opacity', '' + opacity);
         // Bind envent change
         $inputRange.on('change', () => {
            const opacity = $inputRange.val() ?? 1;
            $inputColor.css('opacity', '' + opacity);
         });
      });
   }

   /**
    * @param {JQuery<HTMLElement>} $formElem
    * @param {Object.<string, any>} defaultsData
    * @param {import('../options').Widget} widget
    * @param {boolean} selectmode
    */
   applyFieldWatchers($formElem, defaultsData, widget, selectmode) {
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
            const control = $formElem.find(`[name="${cleanParameterName(varobj.name)}"]`);
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
               if (watchedvars.indexOf(evar) < 0 && (defaultsData[evar] ?? null) !== null) {
                  watchedvars.push(evar);
               }
            });
         }
         watchedvars.push(varobj.name);
      }

      const doUpdateVisibilities = () => {
         updatableComponents.forEach(cc => {
            // Evaluate condition
            const newVariables = this.extractFormParameters(widget, $formElem, false);
            // Add to the new variables the internal variables
            newVariables.SELECT_MODE = selectmode;
            // Eval JS condition for new variables
            const showme = evalInContext(newVariables, cc.condition);
            let theComponent = cc.component;
            if (theComponent) {
               theComponent = theComponent.closest('.form-group');
               // Only change visibilities of nodes not hidden from user
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
         const control = $formElem.find(`[name="${cleanParameterName(varobj.name)}"]`);
         if (watchedvars.indexOf(varobj.name) < 0 || !control[0]) {
            return;
         }
         let evtName = "change";
         if (varobj.type === 'textfield' || varobj.type === 'textarea') {
            evtName = "keyup";
         }
         control.on(evtName, () => {
            doUpdateVisibilities();
         });
      });

      // Decide which form elements are visible accoding to the current values of the parameters.
      doUpdateVisibilities();
   }
}


const formCtrlInstances = new Map();
/**
 * @param {import('../plugin').TinyMCE} editor
 * @returns {FormCtrl}
 */
export function getFormCtrl(editor) {
    let instance = formCtrlInstances.get(editor);
    if (!instance) {
        // @ts-ignore
        instance = new FormCtrl(editor, getUserStorage(editor), getTemplateSrv(), getFileSrv(editor), jquery);
        formCtrlInstances.set(editor, instance);
    }
    return instance;
}
