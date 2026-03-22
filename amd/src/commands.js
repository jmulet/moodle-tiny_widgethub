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
import { getButtonImage } from 'editor_tiny/utils';
import * as coreStr from 'core/str';
import Common from './common';
import { getContextMenuManager } from './contextactions';
import {
    getAdditionalCss,
    getGlobalConfig,
    getWidgetDict,
    isPluginVisible,
    Shared,
    getEditorOptions,
    getMoodleVersion,
    isShareCss,
    isPlaygroundMode,
    fetchEditorData
} from './options';

import { getWidgetPickCtrl } from './controller/widgetpicker_ctrl';
import { getListeners } from './extension';
import { getUserStorage } from './service/userstorage_service';
import {
    findVariableByName,
    loadScriptAsync,
    removeRndFromCtx,
    searchComp
} from './util';
import { enableIframeBubble } from './extension/iframebubble';
import { getWidgetParamsFactory } from './controller/widgetparams_ctrl';
import Config from 'core/config';
import { getFilterSrv } from './service/filter_service';

export const getSetup = async () => {
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

        // Start fetch early, no await here because setup must be sync.
        fetchEditorData();


        getListeners('setup').forEach(listener => listener(editor));

        // Check if there is a config option to disable the plugin for the current page.
        const page = Shared.currentScope;
        const disableList = getGlobalConfig(editor, "disable.plugin.pages", "")
            .split(",")
            .map(p => p.trim())
            .filter(Boolean);

        if (disableList.includes(page)) {
            console.warn(`${Common.component} plugin is disabled on this page.`);
            return;
        }

        const regexPattern = getGlobalConfig(editor, "disable.plugin.pages.regex", "");
        if (regexPattern) {
            try {
                const regex = new RegExp(regexPattern);
                if (regex.test(page)) {
                    console.warn(`${Common.component} plugin is disabled on this page.`);
                    return;
                }
            } catch (/** @type {any} */ ex) {
                console.error("Please check disable.plugin.pages.regex: Invalid regular expression:", ex.message);
            }
        }

        // Register the Icon.
        editor.ui.registry.addIcon(Common.icon, buttonImage.html);

        const storage = getUserStorage(editor);

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
                ctx = { ...ctx, ...removeRndFromCtx(ctxStored, widget.parameters) };
            }
            return ctx;
        };

        const isInPlaygroundMode = isPlaygroundMode();
        let splitButtonBehavior = getGlobalConfig(editor, 'insert.splitbutton.behavior', 'lastused');
        if (isInPlaygroundMode) {
            splitButtonBehavior = 'none';
        }
        // Register the Toolbar Button or SplitButton - including recently used widgets
        // Hook for administrator widget editor page.

        // Click on button directly opens the only registered widget options.
        // Click on button directly opens the only registered widget options.
        const defaultAction = async () => {
            await fetchEditorData();
            if (isInPlaygroundMode) {
                // Click on button directly opens the only registered widget options.
                const factory = getWidgetParamsFactory(editor);
                const widget = Object.values(getWidgetDict(editor))[0];
                if (!widget) {
                    console.error('No widget found in playground mode');
                    return;
                }
                const widgetParamsCtrl = factory(widget);
                widgetParamsCtrl.handleAction();
            } else {
                const widgetPickCtrl = getWidgetPickCtrl(editor);
                widgetPickCtrl.handleAction();
            }
        };

        const toolbarButtonSpec = {
            icon: Common.icon,
            tooltip: widgetNameTitle,
            onAction: defaultAction
        };

        if (splitButtonBehavior === 'none') {
            editor.ui.registry.addButton(Common.component, toolbarButtonSpec);
        } else {
            /**
             *
             * @param {((items: *[]) => void) } callback
             */
            const splitbuttonFetch = async (callback) => {
                await fetchEditorData();
                const widgetsDict = getWidgetDict(editor);
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
            const splitbuttonAction = async (api, key) => {
                await fetchEditorData();
                const widgetsDict = getWidgetDict(editor);
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
            const widgetsDict = getWidgetDict(editor);
            return Object.values(widgetsDict).filter((w) => !w.isFilter() && searchComp(w.name, pattern));
        };

        // Add an Autocompleter @<search widget name>.
        const autoCompleteBehavior = getGlobalConfig(editor, 'insert.autocomplete.behavior', 'lastused');
        const autoCompleteTrigger = getGlobalConfig(editor, 'insert.autocomplete.symbol', '@');
        if (autoCompleteBehavior !== 'none' && autoCompleteTrigger) {
            /**
             * @param {string} pattern
             * @returns {Promise<{type: string, value: string, text: string}[]>}
             */
            const autocompleterFetch = async (pattern) => {
                await fetchEditorData();
                const resultPromises = getMatchedWidgets(pattern).map(async (/** @type {import('./options').Widget} */ w) => {

                    const varname = w.prop('autocomplete')?.trim();
                    // Widgets that have autocomplete need to be fully loaded
                    let param;
                    if (varname) {
                        await w.loadDefinition();
                        param = findVariableByName(varname, w.parameters);
                    }
                    if (!param?.options) {
                        /** @type {{type: string, value: string, text: string}} */
                        return [{
                            type: 'autocompleteitem',
                            value: w.key,
                            text: w.name
                        }];
                    } else {
                        /** @type {{type: string, value: string, text: string}[]} */
                        return param.options.map(opt => {
                            let value = opt;
                            let label = opt;
                            if (typeof opt === 'object') {
                                value = opt.v;
                                label = opt.l;
                            }
                            return {
                                type: 'autocompleteitem',
                                value: `${w.key}|${varname}:${value}`,
                                text: w.name + " " + label
                            };
                        });
                    }
                });
                return Promise.all(resultPromises).then(results => results.flat());
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
                const widgetsDict = getWidgetDict(editor);
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
const applyAutoFilters = async (editor) => {
    await fetchEditorData();
    const storage = getUserStorage(editor);

    const requiresFilter = storage.getFromLocal("startup.filters", "").split(",");

    if (requiresFilter.length > 0) {
        const editorOptions = getEditorOptions(editor);
        const widgetsFound = requiresFilter.map(key => editorOptions.widgetDict[key])
            .filter(widget => widget?.isFilter());
        // All these widgets must have been fully loaded.
        await Promise.all(widgetsFound.map(widget => widget.loadDefinition()));


        const filters = widgetsFound.map(widget => {
            return {
                name: widget.name,
                code: widget.prop('filter') ?? '',
                opts: widget.defaultsWithRepeatable(true)
            };
        });
        if (filters.length > 0) {
            await getFilterSrv(editor).applyWidgetFilters(filters);

            // Apply it also on save
            const pageForm = document.querySelector('form.mform');
            if (pageForm && pageForm.querySelector('div[data-fieldtype="editor"]')) {
                let filtersApplied = false;
                pageForm.addEventListener('submit', async (evt) => {
                    if (filtersApplied) {
                        return;
                    }
                    filtersApplied = true;
                    evt.preventDefault();
                    await getFilterSrv(editor).applyWidgetFilters(filters);
                    // @ts-ignore
                    evt.target?.submit?.();
                });
            }
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
    editor.on('init', async () => {
        // On init editor.dom is ready
        // Inject css all generated by Moodle into the editor's iframe
        // http://localhost:4141/theme/styles.php/boost/1721728984_1/all
        if (isShareCss(editor)) {
            // TODO: Missing themesubrevision
            const subversion = 1;
            const allCss = `${Config.wwwroot}/theme/styles.php/${Config.theme}/${Config.themerev}_${subversion}/all`;
            editor.dom.loadCSS(allCss);
        }

        // Inject css from site Admin textarea.
        let adminCss = (getAdditionalCss() ?? '').trim();
        if (adminCss) {
            // Commented URLs are interpreted as loadCss
            const regex = /\/\*{2}\s+(http(s?):\/\/.*)\s+\*{2}\//gm;
            adminCss = adminCss.replace(regex, (_, $1) => {
                editor.dom.loadCSS($1);
                return '';
            });
            if (adminCss.trim()) {
                // Manually create the style tag in the correct position
                // It must go after the shared css
                const style = editor.dom.create('style', { type: 'text/css', id: "twh_admin_styles" });
                style.textContent = adminCss;
                const doc = editor.getDoc();
                doc?.head?.appendChild(style);
            }
        }

        if (parseInt(getGlobalConfig(editor, 'enable.contextmenu.level', '1')) > 0) {
            // Initialize context toolbars and menus
            await getContextMenuManager(editor).init();
        }

        // Detect jQuery and Boostrap versions.
        // @ts-ignore
        const moodleVersion = getMoodleVersion(editor);
        let jqUrl = getGlobalConfig(editor, 'tiny.iframe.jquery.url', '').trim();
        let jqIntegrity = '';
        let bsUrl = getGlobalConfig(editor, 'tiny.iframe.bootstrap.url', '').trim();
        let bsIntegrity = '';

        if (!bsUrl) {
            if (moodleVersion.startsWith('4')) {
                bsUrl = `https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/js/bootstrap.bundle.min.js`;
                bsIntegrity = 'sha256-GRJrh0oydT1CwS36bBeJK/2TggpaUQC6GzTaTQdZm0k=';
            } else {
                bsUrl = `https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js`;
                bsIntegrity = 'sha256-5P1JGBOIxI7FBAvT/mb1fCnI5n/NhQKzNUuW7Hq0fMc=';
            }
        }

        if (!jqUrl && moodleVersion.startsWith('4')) {
            try {
                // @ts-ignore
                const path = window.requirejs.s.contexts._.config.paths.jquery;
                jqUrl = path.startsWith('http')
                    ? path
                    : Config.wwwroot + path;
                if (!jqUrl.endsWith('.js')) {
                    jqUrl += '.js';
                }
            } catch (e) {
                jqUrl = 'https://code.jquery.com/jquery-3.7.1.min.js';
                jqIntegrity = 'sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo=';
            }
        }

        const requiresJquery = jqUrl !== '' && jqUrl !== 'none';
        const head = editor.getDoc().querySelector("head");
        try {
            // Load jQuery if required
            if (requiresJquery) {
                await loadScriptAsync(
                    editor,
                    jqUrl,
                    jqIntegrity
                );
            }

            // Load Bootstrap if required (bundle already includes Popper)
            if (bsUrl !== '' && bsUrl !== 'none') {
                await loadScriptAsync(
                    editor,
                    bsUrl,
                    bsIntegrity
                );
            }

            // Initialize Bootstrap components depending on version
            if (bsUrl.includes('@5')) {
                // Bootstrap 5 – no jQuery, use vanilla JS API
                const initScript = editor.dom.create('script');
                initScript.id = 'init_bs_comp';
                initScript.innerHTML = `
                    document.querySelectorAll('[data-bs-toggle="popover"]').forEach(el => {
                        new bootstrap.Popover(el, { trigger: 'hover' });
                    });
                `;
                head.appendChild(initScript);
            } else if (requiresJquery && bsUrl.includes('@4')) {
                // Bootstrap 4 – jQuery-based initialization
                const initScript = editor.dom.create('script');
                initScript.id = 'init_bs_comp';
                initScript.innerHTML = `
                    $(document).ready(function() {
                        $('body').popover({
                            selector: '[data-toggle="popover"]',
                            trigger: 'hover'
                        });
                    });
                `;
                head.appendChild(initScript);
            }
        } catch (ex) {
            console.error("Error loading scripts into editor's iframe: ", ex);
        }

        //  If feature is active, treat iframes so they can be selected as widgets
        if (getGlobalConfig(editor, 'tiny.contextmenu.iframes', '1') === '1') {
            enableIframeBubble(editor);
        }

        // Run all subscribers
        getListeners('onInit').forEach(listener => listener(editor));
    });
}
