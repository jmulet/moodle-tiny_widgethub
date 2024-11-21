/* eslint-disable no-console */
import { addRequires, cleanUnusedRequires } from './dependencies';
import jQuery from 'jquery';


/**
 * @this {{ctx: import("../contextInit").ItemMenuContext, type: string}}}
 */
export function addImageEffectAction() {
    const ctx = this.ctx;
    const type = this.type;
    return () => {
        const elem = ctx.path?.elem;
        if (!elem) {
            return;
        }
        elem.attr("data-snptd", type);
        addRequires(ctx.editor, ["/sd/images.min.js"]);
    };
}

/**
 * @this {{ctx: import("../contextInit").ItemMenuContext}}}
 */
export function removeImageEffectsAction() {
    const ctx = this.ctx;
    const elem = ctx.path?.elem;
    if (!elem) {
        return;
    }
    elem.removeAttr("data-snptd");
    cleanUnusedRequires(ctx.editor);
}

/**
 * @this {{ctx: import("../contextInit").ItemMenuContext, iso: string}}
 */
export function changeBoxLangAction() {
    const iso = this.iso;
    const elem = this.ctx.path?.elem;
    const widget = this.ctx.path?.widget;
    if (!elem || !widget) {
        return;
    }
    const $lateral = elem.find('.iedib-titolLateral');
    const isTascaExercici = elem.attr('data-proposat') !== undefined ||
        elem.find('.iedib-tasca.iedib-central').length > 0;

    let theType;
    let langKey = "msg";
    if (isTascaExercici) {
        if (elem.find('.iedib-tasca.iedib-proposat').length) {
            langKey = "msg_epr";
        } else {
            // Must see if it is tava or tapr
            langKey = "msg_" + (elem.attr('data-proposat') ?? "tapr");
        }
    } else if (widget.key === 'capsa-generica') {
        ["alerta", "ampliacio", "consell", "important", "introduccio"].forEach((ty) => {
            if (elem.hasClass("iedib-" + ty + "-border")) {
                theType = ty;
            }
        });
        langKey = "msg_" + theType;
    }
    const I18n = widget.I18n;
    if (I18n?.[langKey]?.[iso]) {
        if (isTascaExercici) {
            const h4 = elem.find('.iedib-central h4').first();
            h4.html(I18n[langKey][iso] + ":");
        } else {
            $lateral.html(I18n[langKey][iso]);
            $lateral.append('<span class="iedib-' + theType + '-logo"></span>');
        }
    }
    // Replace data-lang
    elem.attr('data-lang', iso);
}

/**
 * @this {{ctx: import("../contextInit").ItemMenuContext, size: string}}
 */
export function changeBoxSizeAction() {
    const elem = this.ctx.path?.elem;
    const widget = this.ctx.path?.widget;
    if (!elem || !widget) {
        return;
    }
    elem.removeClass("iedib-capsa-petita iedib-capsa-mitjana iedib-capsa-gran");
    elem.addClass("iedib-capsa-" + this.size);
}

/**
 * @this {{ctx: import("../contextInit").ItemMenuContext, severity: string}}
 */
export function changeBoxSeverityAction() {
    const severity = this.severity;
    const elem = this.ctx.path?.elem;
    const widget = this.ctx.path?.widget;
    if (!elem || !widget) {
        return;
    }
    elem.removeClass(
        "iedib-alerta-border iedib-important-border iedib-consell-border iedib-introduccio-border iedib-ampliacio-border");
    elem.addClass("iedib-" + severity + "-border");
    const $lateral = elem.find(".iedib-lateral");
    $lateral.removeClass("iedib-alerta iedib-important iedib-consell iedib-introduccio iedib-ampliacio");
    $lateral.addClass("iedib-" + severity);
    const lang = elem.attr("data-lang") || "ca";
    let langKey = "msg_" + severity;
    // Change the lateral title
    if (widget.I18n?.[langKey]?.[lang]) {
        $lateral.find('.iedib-titolLateral')
            .html(widget.I18n[langKey][lang]);
    }

}

/**
 * @this {{ctx: import("../contextInit").ItemMenuContext}}
 */
export function switchBoxSimpleExampleAction() {
    const $target = this.ctx.path?.elem;
    const widget = this.ctx.path?.widget;
    if (!$target || !widget) {
        return;
    }
    const lang = $target.attr("data-lang") || "ca";
    const solLabel = widget.I18n?.sol?.[lang] ?? 'Solució';
    const formulacio = $target.find("div.iedib-formulacio-rows > *").clone();
    const resolucio = $target.find("div.iedib-resolucio-rows >  *").clone();
    const lateral = $target.find("p.iedib-titolLateral").html();
    const newSnpt = jQuery('<div class="iedib-capsa iedib-capsa-gran iedib-exemple-border" data-lang="' + lang + '">' +
        '<div class="iedib-lateral iedib-exemple">' +
        '<p class="iedib-titolLateral">' + lateral + '</span></p>' +
        '</div>' +
        '<div class="iedib-central">' +
        // Formulacio
        // Resolució
        '<br></div></div>');
    const central = newSnpt.find('div.iedib-central');
    central.append(formulacio);
    if (resolucio.find('div.accordion').length === 0) {
        central.append("<p><b>" + solLabel + "</b>:</p>");
    }
    central.append(resolucio);
    $target.replaceWith(newSnpt);

}

/**
 * @this {{ctx: import("../contextInit").ItemMenuContext}}
 */
export function switchBoxRowsExampleAction() {
    const $target = this.ctx.path?.elem;
    if (!$target) {
        return;
    }
    const lang = $target.attr("data-lang") || "ca";
    const lateral = $target.find("p.iedib-titolLateral").html();
    const formulacio = $target.find("div.span4.iedib-formulacio > *");
    const resolucio = $target.find("div.span8.iedib-resolucio > div.iedib-central > *");
    const newSnpt = jQuery('<div class="iedib-capsa iedib-capsa-gran iedib-exemple-border" data-lang="' + lang + '">' +
        '<div class="iedib-lateral iedib-exemple">' +
        '<p class="iedib-titolLateral">' + lateral + '</p>' +
        '</div>' +
        '<div class="iedib-formulacio-rows">' +
        // Add formulació
        '</div>' +
        '<div class="iedib-resolucio-rows">' +
        // Add resolució
        '</div></div>');

    newSnpt.find('div.iedib-formulacio-rows').append(formulacio);
    newSnpt.find('div.iedib-resolucio-rows').append(resolucio);
    $target.replaceWith(newSnpt);

}

/**
 * @this {{ctx: import("../contextInit").ItemMenuContext}}
 */
export function imageSwitchToSnippetAction() {
    const $target = this.ctx.path?.targetElement;
    if (!$target) {
        return;
    }
    const $snpt = jQuery('<div class="iedib-figura iedib-grid-responsive"></div');
    $snpt.append($target.clone());
    // eslint-disable-next-line max-len
    $snpt.append(jQuery('<p class="iedib-img-footer"><span class="iedib-caption-counter">Imatge:</span> <span class="iedib-caption-title">Descripció</span></p>'));
    $target.replaceWith($snpt);
}

/**
 * @this {{ctx: import("../contextInit").ItemMenuContext, colSpan: number}}
 */
export function changeColumnWidth() {
    const colSpan = this.colSpan;
    const $target = this.ctx.path?.elem;
    if (!$target) {
        return;
    }
    if (colSpan <= 0 || colSpan > 12) {
        // Set to one column flow
        const columns = $target.find("div");
        columns.removeClass();
        $target.replaceWith(columns);
    } else {
        // Define the spans
        const first = $target.find("div:first-child");
        const last = $target.find("div:last-child");
        first.removeClass();
        last.removeClass();
        first.addClass("span" + colSpan);
        last.addClass("span" + (12 - colSpan));
    }
}

/**
 * @this {{ctx: import("../contextInit").ItemMenuContext, isDependentBehavior: boolean}}
 */
export function setAccordionBehavior() {
    const isDependentBehavior = this.isDependentBehavior;
    const $target = this.ctx.path?.elem;
    if (!$target) {
        return;
    }
    if (isDependentBehavior) {
        // Behavior individual
        $target.find("div.accordion-body").removeAttr("data-parent");
    } else {
        // Behavior accordion
        const acid = $target.attr("id");
        $target.find("div.accordion-body").attr("data-parent", "#" + acid);
    }
}