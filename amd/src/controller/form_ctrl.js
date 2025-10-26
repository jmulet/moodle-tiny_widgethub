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
   </div>`,

   AUTOCOMPLETETEMPLATE: `<div id="{{elementid}}" class="form-group row mx-1{{#hidden}} d-none{{/hidden}}"><label class="col-sm-5 col-form-label" for="{{elementid}}_ftmpl" title="{{varname}}">{{vartitle}} ${questionPopover}</label>
   <div class="col-sm-7"><input type="text" list="{{elementid}}_aclist" id="{{elementid}}_actmpl" class="form-control" name="{{varname}}" {{#disabled}}disabled{{/disabled}} value="{{defaultvalue}}" autocomplete="off"/>
   <datalist id="{{elementid}}_aclist">
   {{#options}}
   <option value="{{optionValue}}"/>
   {{/options}}
   </datalist>
   </div>
   </div>`,

   REPEATABLE: `<div id="{{elementid}}" name="{{varname}}" type="repeatable" class="form-group row mx-1{{#hidden}} d-none{{/hidden}}">
      <span class="form-label" title="{{varname}}">{{vartitle}} ${questionPopover}</span>
      {{{itemControls}}}
   </div>`,
};


export class FormCtrl {
   /**
    * @param {import('../plugin').TinyMCE} editor
    * @param {import('../service/userstorage_service').UserStorageSrv} userStorage
    * @param {import('../service/template_service').TemplateSrv} templateSrv
    * @param {import('../service/file_service').FileSrv} fileSrv
    */
   constructor(editor, userStorage, templateSrv, fileSrv) {
      /** @type {import('../plugin').TinyMCE} */
      this.editor = editor;
      /** @type {import('../service/userstorage_service').UserStorageSrv} */
      this.storage = userStorage;
      /** @type {import('../service/template_service').TemplateSrv} */
      this.templateSrv = templateSrv;
      /** @type {import('../service/file_service').FileSrv} */
      this.fileSrv = fileSrv;
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
    * @param {string} [prefixName] - Add a suffix to the control name
    * @param {number | undefined} [index] - Index used in repeatable fields
    * @returns {string} - The generated HTML for this control
    */
   createControlHTML(hostId, param, defaultValue, prefixName, index) {
      let markup = '';
      let pname = cleanParameterName(param.name);
      if (prefixName) {
         pname = prefixName + "_" + pname;
      }
      const generalCtx = {
         elementid: hostId + "_" + pname + (index === undefined ? '' : index),
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
      } else if (param.type === 'select' || param.type === 'autocomplete') {
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
         const tmpl = param.type === 'select' ? Templates.SELECTTEMPLATE : Templates.AUTOCOMPLETETEMPLATE;
         markup = this.templateSrv.renderMustache(tmpl, {options, ...generalCtx});
      } else if (param.type === 'color') {
         // Value must be in hex form and must find alpha (0-1)
         const [hex, alpha] = toHexAlphaColor(generalCtx.defaultvalue);
         generalCtx.defaultvalue = hex;
         /** @ts-ignore */
         generalCtx.defaultvalueAlpha = alpha;
         markup = this.templateSrv.renderMustache(Templates.COLORTEMPLATE, generalCtx);
      } else if (param.type === 'image') {
         markup = this.templateSrv.renderMustache(Templates.IMAGETEMPLATE, generalCtx);
      } else if (param.type === 'repeatable') {
         let itemControls = '';
         if (Array.isArray(defaultValue) && defaultValue.length) {
            // Generate the controls statically (used in context menus)
            const ul = RepeatableCtrl.createListGroup();
            defaultValue.forEach(obj => {
               if (typeof obj !== 'object') {
                  return;
               }
               const tmpDiv = document.createElement("DIV");
               tmpDiv.className = 'w-100';
               Object.keys(obj).forEach(key => {
                  const field = param.fields?.filter(f => f.name === key)[0];
                  if (field) {
                     tmpDiv.innerHTML = this.createControlHTML(hostId, field, obj[key], pname, index);
                  }
               });
               ul.append(RepeatableCtrl.createRegularItem(tmpDiv, false));
            });
            itemControls = ul.outerHTML;
         }
         markup = this.templateSrv.renderMustache(Templates.REPEATABLE, {...generalCtx, itemControls});
      } else {
         // Assume textfield
         markup = this.templateSrv.renderMustache(Templates.TEXTFIELDTEMPLATE, generalCtx);
      }
      return markup;
   }

   /**
    * It extracts the value of a single HTML input control
    * @param {HTMLInputElement} elem
    * @param {import('../options').Param} param
    */
   extractControlValue(elem, param) {
      const type = elem.getAttribute("type");
      /** @type {string | number | boolean} */
      let value = elem.value ?? "";
      if (elem.tagName === "INPUT" && type === "checkbox") {
         value = elem.checked;
      } else if (elem.tagName === "INPUT" && type === "number") {
         if (value.indexOf(".") >= 0) {
            value = parseFloat(value);
         } else {
            value = parseInt(value);
         }
      } else if (elem.tagName === "INPUT" && type === "color") {
         // Must also find the corresponding alpha channel value
         const pname = param.name;
         const cleanPname = cleanParameterName(pname);
         /** @type {HTMLInputElement | null | undefined} */
         const rangeControl = elem.closest(".form-group")?.querySelector(`[name="${cleanPname}_alpha"]`);
         const alpha = rangeControl?.value ?? 1;
         value = toRgba(value, +alpha);
      }

      if (param.transform) {
         value = stream(param.transform).reduce(value);
      }
      return value;
   }

   /**
    * Obtains the updated parameter values from the modal
    * This is used in insertWidget
    * @param {import('../options').Widget} widget
    * @param {HTMLElement} form
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
         const cleanParamname = cleanParameterName(pname);
         /** @type {HTMLInputElement | null} */
         const elem = form.querySelector(`[name="${cleanParamname}"]`);
         if (!elem) {
            ctx[pname] = defaults[pname];
            return;
         }
         // The elem might be a div for repeatable inputs.
         if (param.type === 'repeatable') {
            /** @type {any[]}  */
            const listValue = [];
            elem.querySelectorAll(".list-group-item.tiny_widgethub-regularitem").forEach(subform => {
               /** @type {Record<string, any>} */
               const itemObj = {};
               param.fields?.forEach(field => {
                  const cleanFieldname = cleanParameterName(field.name);
                  /** @type {HTMLInputElement | null} */
                  const subelem = subform.querySelector(`[name="${cleanParamname}_${cleanFieldname}"]`);
                  if (subelem) {
                     itemObj[field.name] = this.extractControlValue(subelem, field);
                  }
               });
               listValue.push(itemObj);
            });
            ctx[pname] = listValue;
         } else {
            ctx[pname] = this.extractControlValue(elem, param);
         }

         if (pname.trim().startsWith("_")) {
            toPersist[pname] = ctx[pname];
         }
      });

      if (doStore && this.storage) {
         if (Object.keys(toPersist).length) {
            // Only those starting with _
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
    * @param {HTMLElement} modalBody - The modal body
    * @param {import('../service/modal_service').ListenerTracker} listenerTracker
    */
   attachPickers(modalBody, listenerTracker) {
      // Find all file pickers
      const canShowFilePicker = typeof this.fileSrv.getImagePicker() !== 'undefined';
      if (canShowFilePicker) {
         /** @type {NodeListOf<HTMLButtonElement>} */
         const pickers = modalBody.querySelectorAll('button.whb-image-picker');
         pickers.forEach(picker => {
            picker.disabled = !canShowFilePicker;
            // Attach a click handler to any image-picker buttons
            const pickerHandler = async(/** @type {Event} */ evt) => {
               evt.preventDefault();
               const parent = /** @type {HTMLElement} */ (evt.currentTarget).parentElement;
               const input = parent?.querySelector('input');
               try {
                  /** @type {{url?: string}} */
                  const params = await this.fileSrv.displayImagePicker();
                  if (params?.url && input) {
                     input.value = params.url;
                  }
               } catch (ex) {
                  console.error(ex);
               }
            };
            listenerTracker(picker, 'click', pickerHandler);
         });
      }

      // Find all color pickers
      /** @type {NodeListOf<HTMLInputElement>} */
      const colorPickers = modalBody.querySelectorAll('input[type="color"]');
      colorPickers.forEach(inputColor => {
         const name = inputColor.getAttribute('name');
         if (!name) {
            return;
         }
         // Find corresponding range slider
         /** @type {HTMLInputElement | null} */
         const inputRange = modalBody.querySelector(`input[name="${name}_alpha"]`);
         if (!inputRange) {
            return;
         }
         const opacity = inputRange.value ?? 1;
         inputColor.style.opacity = '' + opacity;
         // Bind envent change
         const inputRangeHandler = () => {
            const opacity = inputRange.value ?? 1;
            inputColor.style.opacity = '' + opacity;
         };
         listenerTracker(inputRange, 'change', inputRangeHandler);
      });
   }

   /**
    * @param {HTMLElement} formElem
    * @param {Object.<string, any>} defaultsData
    * @param {import('../options').Widget} widget
    * @param {boolean} selectmode
    * @param {import('../service/modal_service').ListenerTracker} listenerTracker
    */
   applyFieldWatchers(formElem, defaultsData, widget, selectmode, listenerTracker) {
      /** @type {string[]} */
      const watchedvars = []; // All these variable names must be watched
      /**
       * all these components must be updated when one watcher changes
       *  @type {{
       *    condition: string,
       *    component: Element,
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
            const control = formElem.querySelector(`[name="${cleanParameterName(varobj.name)}"]`);
            if (!control || !t) {
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
         updatableComponents.forEach(upcomp => {
            // Evaluate condition
            const newVariables = this.extractFormParameters(widget, formElem, false);
            // Add to the new variables the internal variables
            newVariables.SELECT_MODE = selectmode;
            // Eval JS condition for new variables
            const showme = evalInContext(newVariables, upcomp.condition);
            if (upcomp.component) {
               /** @type {HTMLElement | null} */
               const theComponent = upcomp.component.closest('.form-group');
               // Only change visibilities of nodes not hidden from user
               if (theComponent && !theComponent.getAttribute('data-amagat')) {
                  theComponent.style.display = showme ? '' : 'none';
               }
            }
         });
      };

      // Apply the watchers
      widget.parameters.forEach((varobj) => {
         const control = formElem.querySelector(`[name="${cleanParameterName(varobj.name)}"]`);
         if (watchedvars.indexOf(varobj.name) < 0 || !control) {
            return;
         }
         let evtName = "change";
         if (varobj.type === 'textfield' || varobj.type === 'textarea') {
            evtName = "keyup";
         }
         listenerTracker(control, evtName, () => doUpdateVisibilities());
      });

      // Decide which form elements are visible accoding to the current values of the parameters.
      doUpdateVisibilities();
   }
   /**
    * Create controllers for every repeatable element in form.
    * @param {HTMLElement} form
    * @param {import("../options").Widget} widget
    */
   attachRepeatable(form, widget) {
      const that = this;

      widget.parameters.filter(p => p.type === 'repeatable').forEach((param) => {
         // Make the parameter do not produce any default
         const cleanParamname = cleanParameterName(param.name);
         /** @type {HTMLElement | null} */
         const subform = form.querySelector(`div[type="repeatable"][name="${cleanParamname}"]`);
         if (!subform) {
            return;
         }
         if (!param.fields?.length) {
            subform.style.display = 'none';
            return;
         }
         /**
          * Inform the controller how to create a new item
          * @param {number} i
          * @returns {HTMLElement}
          */
         const itemBuilder = (i) => {
            const controls = (param.fields ?? []).map(field => {
               // Field value must be interpolated with the {{i}} placeholder
               let value = field.value;
               if (typeof (value) === 'string' && value.indexOf("{{i}}") >= 0) {
                  value = that.templateSrv.renderMustache(value, {i: i});
               }
               return that.createControlHTML(that.editor.id, field, value, cleanParamname, i);
            });
            const div = document.createElement("div");
            div.className = 'w-100';
            div.innerHTML = controls.join(" ");
            return div;
         };
         new RepeatableCtrl(subform, itemBuilder, param);
      });
   }
}

/**
 * @typedef {Object} RepeatableOptions
 * @property {number} [min=1] - The minimum number of items allowed in the list.
 * @property {number} [max] - The maximum number of items allowed in the list.
 */

/**
 * @callback ItemBuilder
 * @param {number} index - The index of the item being created.
 * @returns {HTMLElement} - The DOM Node to be inserted into the item.
 */

/**
 * Controls a UI component that allows users to add and remove items from a list.
 * This class uses the underscore convention (_) to indicate private properties and methods.
 */
class RepeatableCtrl {
   // Properties are defined in the constructor for broader compatibility.

   /**
    * @param {HTMLElement} form - The container element to append the list to.
    * @param {ItemBuilder} itemBuilder - A function that returns the content for a new item.
    * @param {RepeatableOptions} [opts={}] - Configuration options for the controller.
    */
   constructor(form, itemBuilder, opts = {}) {
      /** @private */
      this._form = form;
      /** @private */
      this._itemBuilder = itemBuilder;
      /** @private */
      this._opts = {min: 1, ...opts};
      /** @private */
      /** @type {HTMLUListElement} */
      this._ul = document.createElement('ul');
      /** @private */
      this._itemCount = 0;
      /** @private */
      this._boundOnClick = this._onClick.bind(this);
      this._init();
   }

   /**
    * Initializes the list, creates the initial items, and attaches event listeners.
    * @private
    */
   _init() {
      this._ul.classList.add('list-group', 'list-group-flush', 'w-100', 'ml-5');

      this._ul.append(RepeatableCtrl.createAddItem());

      const initialCount = this._opts.min;
      for (let i = 0; i < initialCount; i++) {
         // Generate the content
         this._itemCount += 1;
         const content = this._itemBuilder(this._itemCount);
         this._ul.append(RepeatableCtrl.createRegularItem(content, true));
         this._ul.append(RepeatableCtrl.createAddItem());
      }

      this._form.append(this._ul);
      this._updateButtonStates();
      this._ul.addEventListener('click', this._boundOnClick);
   }
   /**
    * Creates a list group container for the list items
    * @returns {HTMLUListElement}
    */
   static createListGroup() {
      const ul = document.createElement('ul');
      ul.classList.add('list-group', 'list-group-flush', 'w-100', 'ml-5');
      return ul;
   }
   /**
    * Creates the "add item" separator row with a plus button.
    * @private
    * @returns {HTMLLIElement} The list item element representing the add button.
    */
   static createAddItem() {
      const li = document.createElement('li');
      li.classList.add('list-group-item', 'position-relative', 'text-center', 'tiny_widgethub-additem');

      const button = document.createElement('button');
      button.type = 'button';

      button.className = 'tiny_widgethub-addbtn btn btn-sm btn-outline-secondary bg-white text-secondary';

      const icon = document.createElement('i');
      icon.className = 'fa fa-plus';

      button.append(icon);
      li.append(button);
      return li;
   }

   /**
    * Creates a regular list item containing user-defined content and a remove button.
    * @param {string | Node} content
    * @param {boolean} showDelBtn
    * @returns {HTMLLIElement} The list item element.
    */
   static createRegularItem(content, showDelBtn) {
      const li = document.createElement('li');
      li.classList.add('list-group-item', 'd-flex', 'w-100', 'justify-content-between', 'align-items-center', 'tiny_widgethub-regularitem');
      li.append(content);
      if (showDelBtn) {
         const button = document.createElement('button');
         button.type = 'button';
         button.className = 'tiny_widgethub-removeitem btn btn-sm btn-outline-danger';

         const icon = document.createElement('i');
         icon.className = 'fa fa-trash';

         button.append(icon);
         li.append(button);
      }
      return li;
   }

   /**
    * Updates the enabled/disabled state of all add and remove buttons.
    * @private
    */
   _updateButtonStates() {
      const count = this._ul.querySelectorAll('.list-group-item.tiny_widgethub-regularitem').length;

      const canDelete = count > (this._opts.min ?? 1);
      /** @type {NodeListOf<HTMLButtonElement>} */
      let buttons = this._ul.querySelectorAll('button.tiny_widgethub-removeitem');
      buttons.forEach(btn => (btn.disabled = !canDelete));

      const canAdd = this._opts.max === undefined || count < this._opts.max;
      buttons = this._ul.querySelectorAll('button.tiny_widgethub-addbtn');
      buttons.forEach(btn => (btn.disabled = !canAdd));
   }

   /**
    * Handles click events on the list, delegating to add or remove actions.
    * @private
    * @param {MouseEvent} evt - The click event.
    */
   _onClick(evt) {
      if (!(evt.target instanceof Element)) {
         return;
      }
      const btn = evt.target?.closest("button");
      if (!btn || btn.disabled) {
         return;
      }

      const li = btn.closest('li');
      if (!li) {
         return;
      }

      if (btn.classList.contains('tiny_widgethub-addbtn')) {
         this._itemCount += 1;
         const content = this._itemBuilder(this._itemCount);
         li.after(RepeatableCtrl.createRegularItem(content, true), RepeatableCtrl.createAddItem());
      } else if (btn.classList.contains('tiny_widgethub-removeitem')) {
         const separator = li.previousElementSibling;
         if (separator) {
            separator.remove();
         }
         li.remove();
      }

      this._updateButtonStates();
   }
   /**
    * Removes the event listener on the list
    */
   destroy() {
      this._ul.removeEventListener('click', this._boundOnClick);
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
      instance = new FormCtrl(editor, getUserStorage(editor), getTemplateSrv(), getFileSrv(editor));
      formCtrlInstances.set(editor, instance);
   }
   return instance;
}
