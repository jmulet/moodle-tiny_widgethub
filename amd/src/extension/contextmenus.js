/* eslint-disable max-len */
import {registerMenuItemProvider} from "../extension";
import {findVariableByName} from "../util";
import * as Action from './contextactions';

const SUPPORTED_LANGS = [
    {iso: 'ca', title: 'Català'},
    {iso: 'es', title: 'Castellà'},
    {iso: 'en', title: 'English'},
    {iso: 'fr', title: 'Francès'},
    {iso: 'de', title: 'Alemany'},
];

const AVAILABLE_EFFECTS = [
    {name: 'zoom', title: 'Zoom'},
    {name: 'lightbox', title: 'Pantalla completa'},
];

const SUPPORTED_SIZES = [
    {v: 'gran', l: 'Gran'},
    {v: 'mitjana', l: 'Mitjana'},
    {v: 'petita', l: 'Petita'},
];

/**
 * @typedef {{type: string, text: string, icon?: string, onAction: (api?: *) => void}} MenuItem
 * @typedef {{name: string, title: string, condition?: string | RegExp | (() => boolean), icon?:string, action?: ()=> void, subMenuItems?: () => string | MenuItem[]}} UserDefinedItem
 */

/**
 * @param {import("../contextInit").ItemMenuContext} ctx
 * @returns {UserDefinedItem[]}
 **/
function provider(ctx) {
    /**
     * @param {import("../contextInit").ItemMenuContext} ctx
     * @returns {UserDefinedItem}
     */
    const imageEffectsNestedMenu = {
        name: 'imageEffects',
        condition: 'imatge',
        title: 'Efectes d\'imatge',
        subMenuItems: () => {
            const elem = ctx.path?.elem;
            if (!elem) {
                return '';
            }
            if (!elem.attr('data-snptd')) {
                return AVAILABLE_EFFECTS.map(e => ({
                    type: 'menuitem',
                    text: e.title,
                    onAction: Action.addImageEffectAction(ctx, e.name)
                }));
            } else {
                return [{
                    type: 'menuitem',
                    icon: 'remove',
                    text: 'Treure',
                    onAction: Action.removeImageEffectsAction(ctx)
                }];
            }
        }
    };

    /**
     * Converts a raw image into a snippet
     * @param {import("../contextInit").ItemMenuContext} ctx
     * @returns {UserDefinedItem}
     */
    const imageSwitchToSnippet = {
        name: 'imageSwitchToSnippet',
        condition: () => {
           // We are not inside a widget image and the
           // selectedElement right clicked must be a tag img
           const key = ctx.path?.widget?.key;
           const selectedElement = ctx.path?.selectedElement;
           return (key !== undefined && key !== 'imatge' && key !== 'grid-imatge' &&
                selectedElement?.prop('tagName') === 'IMG');
        },
        title: 'Convertir a snippet imatge',
        onAction: Action.imageSwitchToSnippetAction(ctx)
    };

    /**
     * @param {import("../contextInit").ItemMenuContext} ctx
     * @returns {UserDefinedItem}
     */
     const changeBoxLanguageNestedMenu = {
        name: 'changeBoxLanguage',
        condition: /capsa-.*|tasca-exercici/,
        title: 'Idioma',
        subMenuItems: () => {
            const elem = ctx.path?.elem;
            if (!elem) {
                return '';
            }
            const currentLang = elem.attr('data-lang') ?? '';
            return SUPPORTED_LANGS.map(({iso, title}) => ({
                type: 'menuitem',
                text: title,
                icon: iso === currentLang ? 'checkmark' : undefined,
                onAction: Action.changeBoxLangAction(ctx, iso)
            }));
        }
    };

     /**
      * @param {import("../contextInit").ItemMenuContext} ctx
      * @returns {UserDefinedItem}
      */
     const changeBoxSizeNestedMenu = {
        name: 'changeBoxSize',
        condition: /^capsa-.*|^tasca-exercici$/,
        title: 'Mida',
        subMenuItems: () => {
            const elem = ctx.path?.elem;
            const widget = ctx.path?.widget;
            if (!elem || !widget) {
                return '';
            }
            const sizes = findVariableByName('mida', widget.parameters)?.options;
            return (sizes || SUPPORTED_SIZES).map((/** @type {*}*/ e) => ({
                type: 'menuitem',
                text: e.l ?? e,
                icon: elem.hasClass('iedib-capsa-' + (e.v ?? e)) ? 'checkmark' : undefined,
                onAction: Action.changeBoxSizeAction(ctx, e.v ?? e)
            }));
        }
    };

      /**
       * @param {import("../contextInit").ItemMenuContext} ctx
       * @returns {UserDefinedItem}
       */
      const changeBoxSeverityNestedMenu = {
        name: 'changeBoxSeverity',
        condition: 'capsa-generica',
        title: 'Tipus',
        subMenuItems: () => {
            const elem = ctx.path?.elem;
            const widget = ctx.path?.widget;
            if (!elem || !widget) {
                return '';
            }
            const severities = findVariableByName('tipus', widget.parameters)?.options;
            return (severities || []).map((/** @type {*}*/ e) => ({
                type: 'menuitem',
                text: e.l ?? e,
                icon: elem.hasClass('iedib-' + (e.v ?? e) + '-border') ? 'checkmark' : undefined,
                onAction: Action.changeBoxSeverityAction(ctx, e.v ?? e)
            }));
        }
    };

      /**
      * @param {import("../contextInit").ItemMenuContext} ctx
      * @returns {UserDefinedItem}
      */
      const switchBoxRowsExample = {
        name: 'switchBoxRowsExample',
        condition: 'capsa-exemple-cols',
        title: 'Convertir a exemple 2 files',
        onAction: Action.switchBoxRowsExampleAction(ctx)
    };

     /**
      * @param {import("../contextInit").ItemMenuContext} ctx
      * @returns {UserDefinedItem}
      */
     const switchBoxSimpleExample = {
        name: 'switchBoxSimpleExample',
        condition: 'capsa-exemple-rows',
        title: 'Convertir a exemple simple',
        onAction: Action.switchBoxSimpleExampleAction(ctx)
    };

    /**
       * @param {import("../contextInit").ItemMenuContext} ctx
       * @returns {UserDefinedItem}
       */
    const numberedListNestedMenu = {
        name: 'numberedListNestedMenu',
        condition: () => {
            const selectedElement = ctx.path?.selectedElement;
            // TODO:: It must search an OL in the path, probably selectedElement is LI or so!!!!!
            return selectedElement?.closest("ol")?.[0] !== undefined;
        },
        icon: 'list-num-default',
        title: 'Llista',
        subMenuItems: () => {
            return [
                {
                    type: 'tooglemenuitem',
                    text: 'Embellit',
                    onAction: () => {
                        // Toggle class
                    },
                    onSetup: () => {
                        // Determine if the class is there
                    }
                },
                {
                    type: 'menuitem',
                    text: 'Comença a',
                    onAction: () => {
                        // Open input dialog, set the value and retrieve new value
                    },
                }
            ];
        }
    };

    return [
        // Image actions
        imageEffectsNestedMenu,
        imageSwitchToSnippet,

        // Box actions
        changeBoxLanguageNestedMenu,
        changeBoxSizeNestedMenu,
        changeBoxSeverityNestedMenu,
        switchBoxRowsExample,
        switchBoxSimpleExample,

        // Others
        numberedListNestedMenu,
    ];
}

registerMenuItemProvider(provider);