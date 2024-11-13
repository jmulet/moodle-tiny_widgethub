

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

import {getFormCtrl} from '../controller/formCtrl';
import { getListeners } from '../extension';
import {getModalSrv} from '../service/modalSrv';
import {getTemplateSrv} from '../service/templateSrv';
import {getUserStorage} from '../service/userStorageSrv';
import {applyWidgetFilterFactory} from '../util';
import * as coreStr from "core/str";

/**
 * Tiny WidgetHub plugin.
 *
 * @module      tiny_widgethub/plugin
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

export class WidgetParamsCtrl {
   /** @type {import('../service/modalSrv').ModalDialogue | null} */
   modal = null;

   /**
    * @type {import('./widgetPickerCtrl').WidgetPickerCtrl | undefined }
    */
   parentCtrl;
  /**
   * @param {import('../plugin').TinyMCE} editor
   * @param {import('../service/userStorageSrv').UserStorageSrv} userStorage
   * @param {import('../service/templateSrv').TemplateSrv} templateSrv
   * @param {import('../service/modalSrv').ModalSrv} modalSrv
   * @param {import('../controller/formCtrl').FormCtrl} formCtrl
   * @param {*} applyWidgetFilter
   * @param {import('../options').Widget} widget
   */
   constructor(editor, userStorage, templateSrv, modalSrv, formCtrl, applyWidgetFilter, widget) {
      /** @type {import('../plugin').TinyMCE} */
      this.editor = editor;
      /** @type {import('../service/userStorageSrv').UserStorageSrv} */
      this.storage = userStorage;
      /** @type {import('../service/templateSrv').TemplateSrv} */
      this.templateSrv = templateSrv;
      /** @type {import('../service/modalSrv').ModalSrv} */
      this.modalSrv = modalSrv;
      /** @type {import('../controller/formCtrl').FormCtrl} */
      this.formCtrl = formCtrl;
      this.applyWidgetFilter = applyWidgetFilter;
      /** @type {import('../options').Widget} */
      this.widget = widget;
   }
   /**
    * Displays a dialogue for configuring the parameters of the selected snpt
    */
   async handleAction() {
      // Show modal with buttons.
      const data = this.formCtrl.createContext(this.widget);
      const modal = await this.modalSrv.create('params', data, () => {
         this.modal?.destroy();
         this.modal = null;
      });
      this.modal = modal;
      modal.body.find(`a[href="#${data.idTabpane}_1"`).on("click", async() => {
         // Handle preview;
         const ctxFromDialogue = this.formCtrl.extractFormParameters(this.widget, modal.body.find("form"), true);
         await this.updatePreview(data.idTabpane, ctxFromDialogue);
      });
      this.formCtrl.attachPickers(modal.body);
      modal.footer.show();
      modal.footer.find("button.btn-secondary").on("click", async() => {
         // Go back to main menú
         modal.destroy();
         if (this.parentCtrl) {
            await this.parentCtrl.handleAction();
         }
      });
      modal.footer.find("button.btn-primary").on("click", async() => {
         // Go back to main menú
         const ctxFromDialogue = this.formCtrl.extractFormParameters(this.widget, modal.body.find("form"), true);
         modal.hide();
         await this.insertWidget(ctxFromDialogue);
         modal.destroy();
      });

      // Change input fields visibilities upon conditions
      const selectMode = this.editor.selection.getContent().trim() != '';
      this.formCtrl.applyFieldWatchers(modal.body, this.widget.defaults, this.widget, selectMode);

      modal.show();
   }

   destroy() { 
      this.modal?.destroy();
   }

   /**
    * @param {object} ctx
    * @returns {Promise<string>} The rendered template
    */
    render(ctx) {
        const defaultsCopy = {...this.widget.defaults};
        const toInterpolate = Object.assign(defaultsCopy, ctx ?? {});
        // Decide which template engine to use
        let engine = this.widget.prop('engine');
        return this.templateSrv.render(this.widget.template ?? "", toInterpolate,
            this.widget.I18n, engine);
   }

   /**
    * @param {Object.<string, any>} ctxFromDialogue
    * @returns {Promise<string>}
    */
   async generateInterpolatedCode(ctxFromDialogue) {
      const sel = this.editor.selection.getContent();
      // Decideix quin mode de selecció estam
      let interpoledComponentCode = await this.render(ctxFromDialogue);
      if (sel.trim() && this.widget.insertquery) {
         let query = this.widget.insertquery.trim();
         let replaceMode = query.startsWith('r!');
         if (replaceMode) {
            query = query.substring(2).trim();
         }
         // We are in selection mode
         const tmpDiv = document.createElement("div");
         tmpDiv.innerHTML = interpoledComponentCode;
         console.log(interpoledComponentCode);
         const insertPoint = tmpDiv.querySelector(query);
         if (insertPoint) {
            if (replaceMode) {
               // Replace the insertPoint by the interpolated HTML
               insertPoint.outerHTML = sel;
            } else {
               // Inserts the interpolated HTML into the insertPoint
               insertPoint.innerHTML = sel;
            }
            interpoledComponentCode = tmpDiv.innerHTML;
         } else {
            console.error("Cannot find insert point", query);
         }
      }
      return interpoledComponentCode;
   }

   /**
    * @param {string} idTabpane
    * @param {Object.<string, any>} ctxFromDialogue
    * @returns
    */
   async updatePreview(idTabpane, ctxFromDialogue) {
      const interpoledCode = await this.generateInterpolatedCode(ctxFromDialogue);
      const $previewPanel = this.modal?.body?.find(`#${idTabpane}_1`);
      if ($previewPanel) {
         $previewPanel.html(interpoledCode);
      }
   }

   /**
    * @param {Object.<string, any>} ctxFromDialogue
    * @returns
    */
   async insertWidget(ctxFromDialogue) {
      /** @type {{key: string, p: Record<string, any>}[]} */
      const recentList = this.storage.getRecentUsed();
      const pos = recentList.map(e => e.key).indexOf(this.widget.key);
      if (pos >= 0) {
         recentList.splice(pos, 1);
      }
      recentList.unshift({key: this.widget.key, p: ctxFromDialogue});
      if (recentList.length > 4) {
         recentList.splice(5, recentList.length - 4);
      }

      this.storage.setToSession("recent", JSON.stringify(recentList), true);

      if (this.widget.isFilter()) {
         this.applyWidgetFilter(this.widget.template ?? '', false, ctxFromDialogue);
         this.editor.focus();
         return;
      }
      const interpoledCode = await this.generateInterpolatedCode(ctxFromDialogue);
      // Normal insert mode
      this.editor.selection.setContent(interpoledCode);
      this.editor.focus();

      // Call any subscriber
      getListeners('widgetInserted').forEach(listener => listener(this.editor, this.widget, ctxFromDialogue));
   }
}


/**
 * @param {import('../plugin').TinyMCE} editor
 * @returns {(widget: import('../options').Widget) => WidgetParamsCtrl}
 */
export function getWidgetParamsFactory(editor) {
   // @ts-ignore
   const applyWidgetFilter = applyWidgetFilterFactory(editor, coreStr);
   return (widget) => new WidgetParamsCtrl(editor, getUserStorage(editor), getTemplateSrv(),
      getModalSrv(), getFormCtrl(editor), applyWidgetFilter, widget);

}