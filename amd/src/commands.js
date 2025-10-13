
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

import {getButtonImage} from 'editor_tiny/utils';
import * as coreStr from 'core/str';
import Common from './common';
import * as cfg from 'core/config';
import {initContextActions} from './contextinit';
import {getAdditionalCss, getGlobalConfig, getWidgetDict, isPluginVisible, Shared, getEditorOptions, isShareCss} from './options';
import jQuery from "jquery";
import {getWidgetPickCtrl} from './controller/widgetpicker_ctrl';
import {getListeners} from './extension';
import {getUserStorage} from './service/userstorage_service';
import {applyWidgetFilterFactory, findVariableByName, removeRndFromCtx, searchComp} from './util';

export const getSetup = async() => {
    // Get some translations
    const [widgetNameTitle, buttonImage] = await Promise.all([
        coreStr.get_string('settings', Common.component),
        getButtonImage('icon', Common.component),
    ]);

    /** @param {import('./plugin').TinyMCE} editor */
    return (editor) => {
        // Check if the option visible is set.
        if (!isPluginVisible(editor)) {
            // No capabilities required.
            return;
        }

        // Check if there is a config option to disable the plugin for the current page.
        const page = Shared.currentScope;
        const disableList = getGlobalConfig(editor, "disable.plugin.pages", "")
            .split(",")
            .map(p => p.trim())
            .filter(Boolean);

        if (disableList.includes(page)) {
            console.warn("WidgetHub plugin is disabled on this page.");
            return;
        }

        const regexPattern = getGlobalConfig(editor, "disable.plugin.pages.regex", "");
        if (regexPattern) {
            try {
                const regex = new RegExp(regexPattern);
                if (regex.test(page)) {
                    console.warn("WidgetHub plugin is disabled on this page.");
                    return;
                }
            } catch (/** @type {any} */ ex) {
                console.error("Please check disable.plugin.pages.regex: Invalid regular expression:", ex.message);
            }
        }

        // Register the Icon.
        editor.ui.registry.addIcon(Common.icon, buttonImage.html);

        const storage = getUserStorage(editor);
        const widgetsDict = getWidgetDict(editor);

        /**
         * This helper function makes adjustments to the context required for the widget.
         * @param {import('./options').Widget} widget
         * @param {string} behavior - none / default / lastused
         * @param {boolean} includeRepeatable - should repeatable fields be populated?
         * @returns {Record<string, *>}
         */
        const contextMerger = (widget, behavior, includeRepeatable) => {
            /** @type {Record<string, *>} */
            let ctx = widget.defaultsWithRepeatable(includeRepeatable) || {};
            // Should it load recently used values?
            if (behavior === 'lastused') {
                const ctxStored = storage.getRecentUsed().find(e => e.key === widget.key)?.p || {};
                ctx = {...ctx, ...removeRndFromCtx(ctxStored, widget.parameters)};
            }
            return ctx;
        };

        // Register the Toolbar Button or SplitButton - including recently used widgets
        const defaultAction = () => {
            const widgetPickCtrl = getWidgetPickCtrl(editor);
            widgetPickCtrl.handleAction();
        };
        const toolbarButtonSpec = {
            icon: Common.icon,
            tooltip: widgetNameTitle,
            onAction: defaultAction
        };
        const splitButtonBehavior = getGlobalConfig(editor, 'insert.splitbutton.behavior', 'lastused');
        if (splitButtonBehavior === 'none') {
            editor.ui.registry.addButton(Common.component, toolbarButtonSpec);
        } else {
            /**
             *
             * @param {((items: *[]) => void) } callback
             */
            const splitbuttonFetch = (callback) => {
                const isSelectMode = editor.selection.getContent().trim().length > 0;
                const items = storage.getRecentUsed()
                    .filter(e => {
                        const widget = widgetsDict[e.key];
                        return widget?.name && (!isSelectMode || widget.isSelectCapable());
                    })
                    .map(e => ({
                        type: 'choiceitem',
                        text: widgetsDict[e.key]?.name,
                        value: e.key
                    }));
                callback(items);
            };
            /**
             * @param {*} api
             * @param {string} key
             */
            const splitbuttonAction = (api, key) => {
                const widgetPickCtrl = getWidgetPickCtrl(editor);
                const widget = widgetsDict[key];
                if (!widget) {
                    return;
                }
                const ctx = contextMerger(widget, splitButtonBehavior, true);
                widgetPickCtrl.handlePickModalAction(widget, true, ctx);
            };
            editor.ui.registry.addSplitButton(Common.component, {
                ...toolbarButtonSpec,
                columns: 1,
                fetch: splitbuttonFetch,
                onItemAction: splitbuttonAction
            });
        }

        // Add the Menu Item.
        // This allows it to be added to a standard menu, or a context menu.
        editor.ui.registry.addMenuItem(Common.component, {
            icon: Common.icon,
            text: widgetNameTitle,
            onAction: defaultAction,
        });

        const getMatchedWidgets = (/** @type {string} */ pattern) => {
            return Object.values(widgetsDict).filter((w) => searchComp(w.name, pattern));
        };

        // Add an Autocompleter @<search widget name>.
        const autoCompleteBehavior = getGlobalConfig(editor, 'insert.autocomplete.behavior', 'lastused');
        const autoCompleteTrigger = getGlobalConfig(editor, 'insert.autocomplete.symbol', '@');
        if (autoCompleteBehavior !== 'none' && autoCompleteTrigger) {
            /**
             * @param {string} pattern
             * @returns {Promise<{type: string, value: string, text: string}[]>}
             */
            const autocompleterFetch = (pattern) => {
                /** @type {{type: string, value: string, text: string}[]} */
                const results = [];
                getMatchedWidgets(pattern).forEach((/** @type {import('./options').Widget} */ w) => {
                    const varname = w.prop('autocomplete')?.trim();
                    const param = findVariableByName(varname, w.parameters);
                    if (!param?.options) {
                        results.push({
                            type: 'autocompleteitem',
                            value: w.key,
                            text: w.name
                        });
                    } else {
                        param.options.forEach(opt => {
                            let value = opt;
                            let label = opt;
                            if (typeof opt === 'object') {
                                value = opt.v;
                                label = opt.l;
                            }
                            results.push({
                                type: 'autocompleteitem',
                                value: `${w.key}|${varname}:${value}`,
                                text: w.name + " " + label
                            });
                        });
                    }
                });
                return Promise.resolve(results);
            };
            /**
             * @param {*} api
             * @param {Range} rng
             * @param {string} value
             */
            const autocompleterAction = (api, rng, value) => {
                api.hide();
                rng = rng || api.getRange();
                const pair = value.split('|');
                const key = pair[0].trim();
                const widget = widgetsDict[key];
                if (!widget) {
                    return;
                }
                const ctx = contextMerger(widget, autoCompleteBehavior, true);
                if (pair.length === 2) {
                    const [varname, varvalue] = pair[1].split(":");
                    ctx[varname] = varvalue;
                }
                editor.selection.setRng(rng);
                editor.insertContent('');
                const widgetPickCtrl = getWidgetPickCtrl(editor);
                widgetPickCtrl.handlePickModalAction(widget, true, ctx);
            };

            editor.ui.registry.addAutocompleter(Common.component + '_autocompleter', {
                trigger: autoCompleteTrigger,
                columns: 1,
                minChars: 3,
                fetch: autocompleterFetch,
                onAction: autocompleterAction
            });
        }

        // Initialize context menus, styles and scripts into editor's iframe
        initializeEditor(editor);
    };
};

/**
 * If the user has selected automatic apply of filters on startup, apply them!
 * @param {import('./plugin').TinyMCE} editor
 */
const applyAutoFilters = (editor) => {
    const storage = getUserStorage(editor);
    const requiresFilter = storage.getFromLocal("startup.filters", "").split(",");

    if (requiresFilter.length > 0) {
        const editorOptions = getEditorOptions(editor);
        const widgetsFound = requiresFilter.map(key => editorOptions.widgetDict[key]).filter(w => w !== undefined);
        const applyWidgetFilter = applyWidgetFilterFactory(editor, coreStr);

        // Apply the filters and show the result
        widgetsFound.forEach(w => applyWidgetFilter(w.template ?? '', true));

        // Apply it also on save
        const pageForm = document.querySelector('form.mform');
        if (pageForm && pageForm.querySelector('div[data-fieldtype="editor"]')) {
            pageForm.addEventListener('submit', () => {
                widgetsFound.forEach(w => applyWidgetFilter(w.template ?? '', true));
                return true;
            });
        }
    }
};

/**
 * Inject styles and scripts into editor's iframe
 * @param {import('./plugin').TinyMCE} editor
 */
function initializeEditor(editor) {
    editor.once('SetContent', () => {
        // Run all subscribers
        applyAutoFilters(editor);
        getListeners('contentSet').forEach(listener => listener(editor));
    });
    // Add the bootstrap, CSS, etc... into the editor's iframe
    editor.on('init', () => {
        // On init editor.dom is ready
        // Inject css all generated by Moodle into the editor's iframe
        // http://localhost:4141/theme/styles.php/boost/1721728984_1/all

        if (isShareCss(editor)) {
            // TODO: Missing themesubrevision
            const subversion = 1;
            // @ts-ignore
            const allCss = `${cfg.wwwroot}/theme/styles.php/${cfg.theme}/${cfg.themerev}_${subversion}/all`;
            editor.dom.loadCSS(allCss);
        }
        // Inject css from site Admin
        let adminCss = (getAdditionalCss(editor) ?? '').trim();
        if (adminCss) {
            // Commented URLs are interpreted as loadCss
            const regex = /\/\*{2}\s+(http(s?):\/\/.*)\s+\*{2}\//gm;
            adminCss = adminCss.replace(regex, (_, $1) => {
                editor.dom.loadCSS($1);
                return '';
            });
            if (adminCss.trim()) {
                editor.dom.addStyle(adminCss);
            }
        }

        // Inject styles and Javascript into the editor's iframe
        // editor.dom.loadCSS(`${baseUrl}/libs/fontawesome/css/font-awesome.min.css`);
        // Discover the jQuery version
        // @ts-ignore
        const jQueryVersion = jQuery.fn.jquery ?? '3.6.1';
        const scriptJQ = editor.dom.create("script", {src: `https://code.jquery.com/jquery-${jQueryVersion}.min.js`});
        const head = editor.getDoc().querySelector("head");
        scriptJQ.onload = () => {
            // Cannot load BS until JQ is fully loaded on editor's iframe
            // @ts-ignore
            const bsVersion = jQuery.fn.tooltip?.Constructor?.VERSION ?? '4.6.2';
            const scriptBS = editor.dom.create("script",
                {src: `https://cdn.jsdelivr.net/npm/bootstrap@${bsVersion}/dist/js/bootstrap.bundle.min.js`});
            head.appendChild(scriptBS);

            // Activate popover and tooltips
            scriptBS.onload = () => {
                if (!editor.dom.get('init_bs_comp')) {
                    const scriptInitBS = editor.dom.create("script");
                    scriptInitBS.id = 'init_bs_comp';
                    scriptInitBS.innerHTML = `
                    $(document).ready(function() {
                        $('body').popover({
                            selector: '[data-toggle="popover"]',
                            trigger: 'hover'
                        });
                    });`;
                    head.appendChild(scriptInitBS);
                }
            };
            // Run all subscribers
            getListeners('onInit').forEach(listener => listener(editor));

            if (parseInt(getGlobalConfig(editor, 'enable.contextmenu.level', '1')) > 0) {
                // Initialize context toolbars and menus
                initContextActions(editor);
            }
        };

        head.appendChild(scriptJQ);
    });
}

