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
import {initContextActions} from './contextInit';
import {getAdditionalCss, getGlobalConfig, getWidgetDict, isPluginVisible, Shared, getEditorOptions} from './options';
import jQuery from "jquery";
import {getWidgetPickCtrl} from './controller/widgetPickerCtrl';
import {getListeners} from './extension';
import {getUserStorage} from './service/userStorageSrv';
import {applyWidgetFilterFactory} from './util';

export const getSetup = async() => {
    // Get some translations
    const [widgetNameTitle, buttonImage] = await Promise.all([
        // @ts-ignore
        coreStr.getString('settings', Common.component),
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
        /** @type {string[]} */
        const disableOnPages = getGlobalConfig(editor, "disable.plugin.pages", "").split(",");
        if (disableOnPages.includes(Shared.currentScope)) {
            console.warn('WidgetHub plugin is disabled on this page.');
            return;
        }

        // Register the Icon.
        editor.ui.registry.addIcon(Common.icon, buttonImage.html);

        const defaultAction = () => {
            const widgetPickCtrl = getWidgetPickCtrl(editor);
            widgetPickCtrl.handleAction();
        };

        const storage = getUserStorage(editor);
        const widgetsDict = getWidgetDict(editor);
        // Register the Toolbar SplitButton - including recently used widgets
        editor.ui.registry.addSplitButton(Common.component, {
            icon: Common.icon,
            tooltip: widgetNameTitle,
            columns: 1,
            fetch: (/** @type ((items: *[]) => void) */callback) => {
                const items = storage.getRecentUsed().map(e => ({
                    type: 'choiceitem',
                    text: widgetsDict[e.key],
                    value: e.key
                }));
                callback(items);
            },
            onAction: defaultAction,
            onItemAction: (/** @type {*} */ api, /** @type {string} */ key) => {
                const widgetPickCtrl = getWidgetPickCtrl(editor);
                const ctx = storage.getRecentUsed().filter(e => e.key === key)[0].p;
                widgetPickCtrl.handlePickModalAction(widgetsDict[key], true, ctx);
            }
        });

        // Add the Menu Item.
        // This allows it to be added to a standard menu, or a context menu.
        editor.ui.registry.addMenuItem(Common.component, {
            icon: Common.icon,
            text: widgetNameTitle,
            onAction: defaultAction,
        });

        const getMatchedWidgets = (/** @type {string} */ pattern) => {
            return Object.values(widgetsDict).filter((w) => w.name.toLowerCase().indexOf(pattern.toLowerCase()) !== -1);
        };

        // Add an Autocompleter @<search widget name>.
        editor.ui.registry.addAutocompleter(Common.component + '_autocompleter', {
            trigger: '@',
            columns: 1,
            minChars: 3,
            fetch: (/** @type {string}*/ pattern) => {
                    const results = getMatchedWidgets(pattern).map((/** @type {import('./options').Widget} */ w) => ({
                        type: 'autocompleteitem',
                        value: w.key,
                        text: w.name
                      }));
                    return Promise.resolve(results);
            },
            onAction: (/** @type {*}*/ api, /** @type {Range}*/ rng, /** @type {string}*/ key) => {
                api.hide();
                editor.selection.setRng(rng);
                const widgetPickCtrl = getWidgetPickCtrl(editor);
                widgetPickCtrl.handlePickModalAction(widgetsDict[key], true);
            }
        });

        // Initialize context menus, styles and scripts into editor's iframe
        initializer(editor);
    };
};

/**
 * If the user has selected automatic apply of filters on startup, apply them!
 * @param {import('./plugin').TinyMCE} editor
 */
const autoFilter = (editor) => {
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
function initializer(editor) {
    editor.once('SetContent', () => {
        // Run all subscribers
        autoFilter(editor);
        getListeners('contentSet').forEach(listener => listener(editor));
    });
    // Add the bootstrap, CSS, etc... into the editor's iframe
    editor.on('init', () => {
        // On init editor.dom is ready
        // Inject css all generated by Moodle into the editor's iframe
        // http://localhost:4141/theme/styles.php/boost/1721728984_1/all
        // TODO: Missing themesubrevision
        const subversion = 1;
        // @ts-ignore
        const allCss = `${cfg.wwwroot}/theme/styles.php/${cfg.theme}/${cfg.themerev}_${subversion}/all`;
        editor.dom.loadCSS(allCss);

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
                const scriptInitBS = editor.dom.create("script");
                scriptInitBS.innerHTML = `
                $(document).ready(function() {
                    $('body').tooltip({
                        selector: '[data-toggle="tooltip"]',
                        trigger: 'hover'
                    });
                    $('body').popover({
                        selector: '[data-toggle="popover"]',
                        trigger: 'hover'
                    });
                });`;
                head.appendChild(scriptInitBS);
            };
            // Run all subscribers
            getListeners('onInit').forEach(listener => listener(editor));

            // Inject css from site Admin
            let adminCss = (getAdditionalCss(editor) ?? '').trim();
            if (adminCss) {
                // Commented URLs are interpreted as loadCss
                const regex = /\/\*{2}\s+(http(s?):\/\/.*)\s+\*{2}\//gm;
                adminCss = adminCss.replace(regex, (_, $1) => {
                    // console.log("Loading ", $1);
                    editor.dom.loadCSS($1);
                    return '';
                });
                if (adminCss.trim()) {
                    editor.dom.addStyle(adminCss);
                }
            }

            if (parseInt(getGlobalConfig(editor, 'enable.contextmenu.level', '1')) > 0) {
                // Initialize context toolbars and menus
                initContextActions(editor);
            }
        };

        head.appendChild(scriptJQ);
    });
}

