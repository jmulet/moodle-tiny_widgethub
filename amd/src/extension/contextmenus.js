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
 * @typedef {{name: string, title: string, widgetKeys?: string[], icon?:string, action?: ()=> void, subMenuItems?: () => string | MenuItem[]}} UserDefinedItem
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
        widgetKeys: ['imatge'],
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
     * @param {import("../contextInit").ItemMenuContext} ctx
     * @returns {UserDefinedItem}
     */
     const changeBoxLanguageNestedMenu = {
        name: 'changeBoxLanguage',
        widgetKeys: ['capsa-generica', 'capsa-exemple-cols', 'capsa-exemple-rows', 'capsa-exemple-simple', 'tasca-exercici'],
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
        widgetKeys: ['capsa-generica', 'capsa-exemple-cols', 'capsa-exemple-rows', 'capsa-exemple-simple', 'tasca-exercici'],
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
        widgetKeys: ['capsa-generica'],
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

    return [
        // Image actions
        imageEffectsNestedMenu,

        // Box actions
        changeBoxLanguageNestedMenu,
        changeBoxSizeNestedMenu,
        changeBoxSeverityNestedMenu,
    ];
}

registerMenuItemProvider(provider);