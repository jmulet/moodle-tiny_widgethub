/* eslint-disable no-console */
/* eslint-disable no-tabs */
/* eslint-disable no-alert */
import jQuery from 'jquery';
import {templateRenderer} from './util';
import CodeProEditor from './cm6pro-lazy';
import {load, dump} from './js-yaml-lazy';
import {get_strings as getStrings} from 'core/str';

export default {
	fetchcontrols: function(id) {
		const controls = {};
		controls.json = document.getElementById('id_s_tiny_widgethub_def_' + id);
		return controls;
	},
	populateform: function(id, presetindex, presetdata) {
		// Get all our html controls
		const controls = this.fetchcontrols(id);

		// What a rip off there was no selection!!!
		if (!presetindex && !presetdata) {
			return;
		}
		if (presetindex == 0 && presetdata) {
			// This is good, we have something from dopopulate
		} else {
			// This is a normal selection
			presetdata = this.presetdata;
		}
		const snpt = presetdata[presetindex];

		controls.key.value = snpt.key;
		// Try to see JSON is valid
		try {
			JSON.parse(snpt.json);
			controls.json.value = snpt.json;
		} catch (ex) {
			console.error(ex);
			controls.json.value = '';
		}
	},
	updateYaml: function(id, codeProEditor) {
		const controls = this.fetchcontrols(id);
		if (!controls.json.value.trim()) {
			codeProEditor.setValue('');
			return;
		}
		try {
			const obj = JSON.parse(controls.json.value);
			const yml = dump(obj);
			codeProEditor.setValue(yml);
		} catch (ex) {
			console.error(ex);
			controls.json.value = '';
			codeProEditor.setValue('');
		}
	},
	dopopulate: function(id, templatedata) {
		console.info("dopopulate", id, templatedata);
		this.populateform(id, 0, new Array(templatedata));
	},

	validate: async function(yml, opts) {
		const validation = {msg: '', html: ''};
		try {
			// The code is a valid Yaml
			let jsonObj = {};
			try {
				jsonObj = load(yml) ?? {};
			} catch (ex) {
				validation.msg = "Yaml syntax error:: " + ex;
			}
			validation.json = JSON.stringify(jsonObj, null, 0);
			// The structure is correct
			if (!jsonObj.key) {
				validation.msg = "Yaml file must contain a 'key' property. ";
			} else if (jsonObj.key === "partials") {
				return validation;
			} else {
				if (jsonObj.key !== 'partials' && (!jsonObj.name || !jsonObj.template)) {
					validation.msg += "Widgets must have 'name' and 'template' properties. ";
				}
				if (jsonObj.requires && typeof jsonObj.requires !== "string") {
					validation.msg += "The property 'requires' must be a string. ";
				}
			}
			// Check for duplicated keys
			if (opts.id === 0) {
				const keys = opts.keys || [];
				if (keys.includes(jsonObj.key)) {
					validation.msg += `Key ${jsonObj.key} is already in use. Please rename it. `;
				}
			}
			// Handle partials in parameters
			const partials = this.getPartials();
			const paramsCopy = (jsonObj?.parameters || []).map(param => {
				let pc = {...param};
				if (pc.partial && partials[pc.partial]) {
					pc = Object.assign(pc, partials[pc.partial]);
				}
				return pc;
			});
			// Try to parse the template with mustache renderer
			const translations = jsonObj?.I18n?.en || {};
			const ctx = {};
			paramsCopy.forEach(param => {
				ctx[param.name] = param.value;
			});
			const engine = jsonObj.engine;
			const htmlRendered = await templateRenderer(jsonObj.template, ctx, translations, engine);
			validation.html = htmlRendered;
		} catch (ex) {
			validation.msg = "Renderer error:: " + ex;
		}
		return validation;
	},

	getPartials: function() {
		let partials = null;
		let i = 0;
		const len = (this.presetdata || []).length;
		while (partials === null && i < len) {
			if (this.presetdata[i].key === "partials") {
				partials = this.presetdata[i];
			}
			i++;
		}
		return partials || {};
	},

	// Load all widget stuff and stash all our constiables
	init: async function(opts) {
		console.info("Init AMD called with opts ", JSON.stringify(opts));
		const i18n = await getStrings([
			{key: 'preview', component: 'tiny_widgethub'},
			{key: 'delete', component: 'tiny_widgethub'}
		]);

		this.presetdata = [];
		// Hide the control that handles JSON and it is actually saved
		const $controlMain = jQuery('#id_s_tiny_widgethub_def_' + opts.id);
		$controlMain.css("display", "none");
		const $target = $controlMain.parent();

		// Display the secondary editor for Yaml syntax
		const $controlSecondary = jQuery(`<div id="tiny_widgethub_yc_${opts.id}" class="tiny_widgethub-ymlcontrol"></div>`);
		$target.append($controlSecondary);

		const $previewPanel = jQuery(`<div id="tiny_widgethub_pp_${opts.id}" class="tiny_widgethub-previewpanel d-none"></div>`);
		$target.append($previewPanel);

		const $previewBtn = jQuery(`<button type="button" class="btn btn-secondary m-1">${i18n[0]}</button>`);
		$previewBtn.on('click', async() => {
			const yml = codeProEditor.getValue();
			const validation = await this.validate(yml, opts);
			if (validation.msg) {
				alert(validation.msg);
			} else {
				$previewPanel.removeClass('d-none');
				$controlMain.val(validation.json);
				$previewPanel.html(validation.html);
			}
		});
		$target.append($previewBtn);

		if (opts.id > 0) {
			const $deleteBtn = jQuery(`<button type="button" class="btn btn-danger m-1">${i18n[1]}</button>`);
			$deleteBtn.on('click', async() => {
				// Clear all the controls
				$controlMain.val('');
				$controlSecondary.html('');
				$previewPanel.html('');
				// Send form by skipping validation
				$controlMain.closest("form").trigger('submit', {skipValidation: true});
			});
			$target.append($deleteBtn);
		}

		const codeProEditor = new CodeProEditor($controlSecondary[0]);

		const self = this;

		// Handle the select box change event
		jQuery("select[name='tiny_widgethub/hub']").on('change', function() {
			console.info(jQuery(this).val());
			self.populateform(opts.id, jQuery(this).val());
			self.updateYaml(opts.id, codeProEditor);
		});

		$controlMain.closest("form").on("submit", async(ev) => {
			// Must update the content from the Yaml control
			const yml = codeProEditor.getValue();
			// First validate the definition of the widget
			if (!ev.skipValidation) {
				const validation = await this.validate(yml, opts);
				if (validation.msg) {
					alert(validation.msg);
					ev.preventDefault();
				} else {
					$controlMain.val(validation.json);
				}
				return validation.msg === '';
			}
			return true;
		});

		this.updateYaml(opts.id, codeProEditor);
	}
};
