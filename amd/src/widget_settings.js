/* eslint-disable no-console */
/* eslint-disable no-tabs */
/* eslint-disable no-alert */
import jQuery from 'jquery';
import CodeProEditor from './libs/cm6pro-lazy';
import {load, dump} from './libs/js_yaml-lazy';
import {get_strings as getStrings} from 'core/str';
import {getTemplateSrv} from './service/templateSrv';

const templateSrv = getTemplateSrv();

/**
 * @class
 * @member {any[]} presetdata
 * */
export default {
	/**
	 * @param {number} id
	 * @returns {{
	 * 	$ymlArea: JQuery<HTMLElement>,
	 * 	$jsonArea: JQuery<HTMLElement>,
	 * }}
	 */
	getAreas: function(id) {
		/** @type {*} */
		const $ymlArea = jQuery(`#id_s_tiny_widgethub_defyml_${id}`);
		const $jsonArea = jQuery(`#id_s_tiny_widgethub_def_${id}`);
		return {
			$ymlArea, $jsonArea
		};
	},
	/**
	 * @param {number} id
	 * @param {*} codeProEditor
	 * @returns
	 */
	updateYaml: function(id, codeProEditor) {
		const {$jsonArea} = this.getAreas(id);
		const json = ($jsonArea.val() ?? '').trim();
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
	 * @param {{id: number, keys: string[], partials: any}} opts
	 * @returns {Promise<{msg: string, json?: string, html?: string}>}
	 */
	validate: async function(yml, opts) {
		/**
		 * @type {{
		 * 	msg: string,
		 *  html: string,
		 *  json: string | undefined
		 * }}
		 * */
		const validation = {msg: '', html: '', json: undefined};
		try {
			// Check if the code is a valid Yaml
			/** @type {import('./options').RawWidget | undefined} */
			let jsonObj;
			try {
				jsonObj = load(yml, null) ?? {};
			} catch (ex) {
				validation.msg = "Yaml syntax error:: " + ex;
			}
			validation.json = JSON.stringify(jsonObj, null, 0);

			// Check if the structure is correct
			if (!jsonObj?.key) {
				validation.msg = "Yaml file must contain a 'key' property. ";
			} else if (jsonObj.key === "partials") {
				return validation;
			} else if (jsonObj.key !== 'partials' && (!jsonObj.name || !jsonObj.template)) {
				validation.msg += "Widgets must have 'name' and 'template' properties. ";
			}
			// Check for duplicated keys
			if (opts.id === 0 && jsonObj?.key) {
				const keys = opts.keys || [];
				if (keys.includes(jsonObj.key)) {
					validation.msg += `Key ${jsonObj.key} is already in use. Please rename it. `;
				}
			}
			// Handle partials in parameters
			const partials = opts.partials;
			const paramsCopy = (jsonObj?.parameters || []).map(param => {
				let pc = {...param};
				if (pc.partial && partials[pc.partial]) {
					pc = Object.assign(pc, partials[pc.partial]);
				}
				return pc;
			});
			// Try to parse the template with the correct renderer
			const translations = jsonObj?.I18n || {};
			/** @type {Object.<string, any>} */
			const ctx = {};
			paramsCopy.forEach(param => {
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
		console.info("Init AMD called with opts ", JSON.stringify(opts));
		const i18n = await getStrings([
			{key: 'preview', component: 'tiny_widgethub'},
			{key: 'delete', component: 'tiny_widgethub'}
		]);

		const {$ymlArea, $jsonArea} = this.getAreas(opts.id);

		// Hide the control that handles JSON and it is actually saved
		$jsonArea.css("display", "none");
		const $target = $jsonArea.parent();
		const $form = $jsonArea.closest("form");
		// Hide any submit button if found
		$form.find('button[type="submit"], input[type="submit"]').hide();
		// Add submit buttons and manually trigger form submit.
		const $formButtons =
		jQuery('<div class="form-buttons"><button type="button" class="btn btn-primary form-submit">Save changes</button></div>');
		$form.append($formButtons);
		const $saveBtn = $formButtons.find("button");

		// Create a preview panel
		const $previewPanel = jQuery(`<div id="tiny_widgethub_pp_${opts.id}" class="tiny_widgethub-previewpanel d-none"></div>`);
		$target.append($previewPanel);

		const $previewBtn = jQuery(`<button type="button" class="btn btn-secondary m-1">${i18n[0]}</button>`);
		$previewBtn.on('click', async() => {
			const yml = codeProEditor.getValue();
			const validation = await this.validate(yml, opts);
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
			const $deleteBtn = jQuery(`<button type="button" class="btn btn-danger m-1">${i18n[1]}</button>`);
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

		const codeProEditor = new CodeProEditor($ymlArea[0]);

		$saveBtn.on("click",
			async() => {
			// Must update the content from the Yaml control
			const yml = codeProEditor.getValue();
			// First validate the definition of the widget
			const validation = await this.validate(yml, opts);
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

		this.updateYaml(opts.id, codeProEditor);
	}
};
