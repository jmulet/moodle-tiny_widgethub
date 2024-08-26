/* eslint-disable no-console */
/* eslint-disable max-len */
import {getAdditionalCss} from './options';
import * as cfg from 'core/config';
import jQuery from 'jquery';
import {initContextActions} from './context_init';

/**
 * @param {import('./plugin').TinyMCE} editor
 */
export function initializer(editor) {
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
        const jQueryVersion = jQuery.fn.jquery ?? '3.6.1';
        const scriptJQ = editor.dom.create("script", { src: `https://code.jquery.com/jquery-${jQueryVersion}.min.js` });
        const head = editor.getDoc().querySelector("head");
        scriptJQ.onload = () => {
            // Cannot load BS until JQ is fully loaded
            // @ts-ignore
            const bsVersion = jQuery.fn.tooltip?.Constructor?.VERSION ?? '4.6.2';
            const scriptBS = editor.dom.create("script",
                { src: `https://cdn.jsdelivr.net/npm/bootstrap@${bsVersion}/dist/js/bootstrap.bundle.min.js` });
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
            // Initialize context toolbars and menus
            initContextActions(editor);
        };

        head.appendChild(scriptJQ);
        // Inject css from site Admin
        const adminCss = getAdditionalCss(editor) || '';
        if (adminCss.trim()) {
            editor.dom.addStyle(adminCss);
        }
    });
}