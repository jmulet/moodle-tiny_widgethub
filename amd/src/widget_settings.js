/* eslint-disable no-console */
/* eslint-disable no-alert */
import jQuery from 'jquery';
import YmlEditor from './libs/ymleditor-lazy';
import {load, dump} from './libs/js_yaml-lazy';
import {get_strings as getStrings} from 'core/str';
import {getTemplateSrv} from './service/templateSrv';
import {applyPartials} from './options';

const templateSrv = getTemplateSrv();

/**
 * @class
 * @member {any[]} presetdata
 * */
export default {
    /**
     * @param {number} id
     * @returns {{
     *     $ymlArea: JQuery<HTMLTextAreaElement>,
     *     $jsonArea: JQuery<HTMLTextAreaElement>,
     *     $partialInput: JQuery<HTMLInputElement>,
     * }}
     */
    getAreas: function(id) {
        /** @type {*} */
        const $ymlArea = jQuery(`#id_s_tiny_widgethub_defyml_${id}`);
        /** @type {*} */
        const $jsonArea = jQuery(`#id_s_tiny_widgethub_def_${id}`);
        /** @type {*} */
        const $partialInput = jQuery(`#id_s_tiny_widgethub_partials_${id}`);
        return {
            $ymlArea, $jsonArea, $partialInput
        };
    },
    /**
     * @param {number} id
     * @param {*} codeProEditor
     * @returns
     */
    updateYaml: function(id, codeProEditor) {
        const {$jsonArea} = this.getAreas(id);
        const json = (($jsonArea.val() ?? '') + '').trim();
        if (!json) {
            codeProEditor.setValue('');
            return;
        }
        try {
            const obj = JSON.parse(json);
            const yml = dump(obj, {});
            codeProEditor.setValue(yml);
        } catch (ex) {
            console.error(ex);
            $jsonArea.val('');
            codeProEditor.setValue('');
        }
    },
    /**
     * @param {string} yml
     * @param {{id: number, keys: string[]}} opts
     * @param {Record<string, *>} partials
     * @returns {Promise<{msg: string, json?: string, html?: string}>}
     */
    validate: async function(yml, opts, partials) {
        /**
         * @type {{
         *     msg: string,
         *  html: string,
         *  json: string | undefined
         * }}
         * */
        const validation = {msg: '', html: '', json: undefined};
        try {
            // Check if the code is a valid Yaml
            /** @type {import('./options').RawWidget} */
            let jsonObj;
            try {
                jsonObj = load(yml, null) ?? {};
            } catch (ex) {
                validation.msg = "Yaml syntax error:: " + ex;
                return validation;
            }
            validation.json = JSON.stringify(jsonObj, null, 0);

            // Check if the structure is correct
            if (!jsonObj?.key) {
                validation.msg = "Yaml file must contain a 'key' property. ";
            } else if (jsonObj.key === "partials") {
                return validation;
            } else if (jsonObj.key !== 'partials' && (!jsonObj.name || !(jsonObj.template || jsonObj.filter))) {
                validation.msg += "Widgets must have 'name' and 'template or filter' properties. ";
            }
            // Check for duplicated keys
            if (opts.id === 0 && jsonObj?.key) {
                const keys = opts.keys || [];
                if (keys.includes(jsonObj.key)) {
                    validation.msg += `Key ${jsonObj.key} is already in use. Please rename it. `;
                }
            }
            // Handle partials in parameters
            applyPartials(jsonObj, partials);
            // Try to parse the template with the correct renderer
            const translations = jsonObj?.I18n ?? {};
            /** @type {Object.<string, any>} */
            const ctx = {};
            (jsonObj.parameters ?? []).forEach(param => {
                ctx[param.name] = param.value;
            });
            const engine = jsonObj?.engine;
            const html = await templateSrv.render(jsonObj?.template || '', ctx, translations, engine);
            validation.html = html;
        } catch (ex) {
            validation.msg = "Renderer error:: " + ex;
        }
        return validation;
    },

    /**
     * Load all widgets
     * @param {{id: number, keys: string[], partials: any}} opts
     * @returns
     */
    init: async function(opts) {
        const i18n = await getStrings([
            {key: 'preview', component: 'tiny_widgethub'},
            {key: 'delete', component: 'tiny_widgethub'},
            {key: 'savechanges', component: 'tiny_widgethub'}
        ]);

        const {$ymlArea, $jsonArea, $partialInput} = this.getAreas(opts.id);
        // Partials are passed through a hidden input element
        const partials = JSON.parse($partialInput.val() || '{}');

        // Hide the control that handles JSON and it is actually saved
        $jsonArea.css("display", "none");
        const $target = $jsonArea.parent();
        const $form = $jsonArea.closest("form");
        // Hide any submit button if found
        $form.find('button[type="submit"], input[type="submit"]').hide();
        // Add submit buttons and manually trigger form submit.
        const $formButtons = jQuery(`<div class="row"><div class="form-buttons offset-sm-3 col-sm-3">
            <button type="button" class="btn btn-primary form-submit">${i18n[2]}</button></div></div>`);
        $form.append($formButtons);
        const $saveBtn = $formButtons.find("button");

        // Create a preview panel
        const $previewPanel = jQuery(`<div id="tiny_widgethub_pp_${opts.id}" class="tiny_widgethub-previewpanel d-none"></div>`);
        $target.append($previewPanel);

        const $previewBtn = jQuery(`<button type="button" class="btn btn-secondary m-1">
            <i class="fas fa fa-magnifying-glass"></i> ${i18n[0]}</button>`);
        $previewBtn.on('click', async() => {
            const yml = ymleditor.getValue();
            const validation = await this.validate(yml, opts, partials);
            if (validation.msg) {
                alert(validation.msg);
            } else if (validation.html) {
                $previewPanel.removeClass('d-none');
                $jsonArea.trigger('focusin');
                $jsonArea.val(validation.json ?? '');
                $jsonArea.trigger('change');
                $previewPanel.html(validation.html);
            }
        });
        $target.append($previewBtn);

        if (opts.id > 0) {
            // Only show delete button on saved widgets (id=0 is reserved for new ones)
            const $deleteBtn = jQuery(`<button type="button" class="btn btn-danger m-1">
                <i class="fas fa fa-trash"></i> ${i18n[1]}</button>`);
            $deleteBtn.on('click', async() => {
                // Ask confirmation
                const answer = confirm('Do you want to delete this widget?');
                if (!answer) {
                    return;
                }
                // Clear all the controls
                $jsonArea.trigger('focusin');
                $jsonArea.val('');
                $jsonArea.trigger('change');
                $ymlArea.html('');
                $previewPanel.html('');
                // Send form by skipping validation
                $form.trigger('submit');
            });
            $target.append($deleteBtn);
        }

        const ymleditor = new YmlEditor($ymlArea[0]);

        $saveBtn.on("click",
            async() => {
            // Must update the content from the Yaml control
            const yml = ymleditor.getValue();
            // First validate the definition of the widget
            const validation = await this.validate(yml, opts, partials);
            if (validation.msg) {
                alert(validation.msg);
            } else {
                // Ensure that there is a change in the form value to force
                // the set_updatedcallback to be called
                $jsonArea.trigger('focusin');
                $jsonArea.val((validation.json ?? '') + ' ');
                $jsonArea.trigger('change');
                // Submit form
                $form.trigger('submit');
            }
        });

        this.updateYaml(opts.id, ymleditor);
    }
};
