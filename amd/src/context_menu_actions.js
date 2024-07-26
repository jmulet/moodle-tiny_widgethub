/* eslint-disable no-eq-null */
/* eslint-disable no-console */
import jQuery from 'jquery';
import {getUserId} from './options';
import {convertInt} from './util';
import ContextMenuEditor from './context_menu_editor';
import {displayFilepicker} from 'editor_tiny/utils';

/**
 * Move jquery element before its sibling (if possible)
 * @param {JQuery<Element>} $e
 */
function moveBefore($e) {
    const prev = $e.prev();
    if (!prev.length) {
        return;
    }
    $e.insertBefore(prev);
}

/**
 * Move jquery element after its sibling (if possible)
 * @param {JQuery<Element>} $e
 */
export function moveAfter($e) {
    const next = $e.next();
    if (!next.length) {
        return;
    }
    $e.insertAfter(next);
}


export default {
    "@edit": function(evt) {
        const ctxDlgEditor = new ContextMenuEditor(this);
        ctxDlgEditor.show(evt);
    },
    "@unpack": function(evt) {
        evt.preventDefault();
        const $target = jQuery(this.currentContext.elem);
        if (this.currentContext.snpt.unpack === "") {
            // Simply remove classes and done!
            $target.removeClass();
        } else {
            // Problem with .row-fluid.iedib-fluid
            const toUnpack = $target.find(this.currentContext.snpt.unpack + "");
            toUnpack.first().removeClass("iedib-inspoint iedib-iq");
            $target.replaceWith(toUnpack);
        }
        this.uiContextMenu.hide();
    },
    "@clipboard/cut": function(evt) {
        evt.preventDefault();
        const $target = jQuery(this.currentContext.elem);
        const $parent = $target.parent();
        // Some widgets have footer as sibling so it is not contained in target
        const $sibling = $target.next();
        let siblingHTML = '';
        if ($sibling.find('.iedib-caption-title').length) {
            $sibling.css('text-align', 'center');
            siblingHTML = ' ' + $sibling.prop("outerHTML");
            console.log("Adding sibling HTML ", siblingHTML);
            $sibling.detach();
        }
        $target.detach();
        // If the parent has no children, then it can be safely removed
        if ($parent.children().length === 0) {
            $parent.remove();
        }
        const content = this.currentContext.snpt.name + " @@ " + $target.prop("outerHTML") + siblingHTML;
        try {
            this.clipBoard.push(content);
            const userid = getUserId(this.editor);
            localStorage.setItem("widgethub-clipboard_" + userid, JSON.stringify(this.clipBoard));
        } catch (ex) {
            console.error(ex);
        }
        this.uiContextMenu.hide();
    },
    "@clipboard/paste": function(evt) {
        evt.preventDefault();
        this.uiContextMenu.hide();
        const indx = convertInt(evt.currentTarget.dataset.indx, 0);
        // Prevent from pasting outsite tiny editor
        const clipBoardQueue = this.clipBoard;
        if (clipBoardQueue.length > 0 && indx < clipBoardQueue.length) {
            const toPaste = this.clipBoard[indx].replace(/^.*@@/, "");
            this.editor.selection.setContent(toPaste);
            try {
                clipBoardQueue.splice(indx, 1); // Remove that item pasted
                const userid = getUserId(this.editor);
                localStorage.setItem("widgethub-clipboard_" + userid, JSON.stringify(this.clipBoard));
            } catch (ex) {
                console.error(ex);
            }
        }
    },
    "@clipboard/clear": function(evt) {
        evt.preventDefault();
        this.uiContextMenu.hide();
        try {
            const userid = getUserId(this.editor);
            this.clipBoard = [];
            localStorage.setItem("widgethub-clipboard_" + userid, "[]");
        } catch (ex) {
            console.error(ex);
        }
    },
    "tabs/add": function(evt) {
        evt.preventDefault();
        const $target = jQuery(this.currentContext.elem);
        // Clone the last item and add it
        const $allLI = $target.find("ul.nav.nav-tabs > li");
        const $lst = $allLI.last().clone();
        const href = $lst.find("a").attr("href") || "";
        const $panel = $target.find(href).clone();
        const newId = 'ed' + Math.random().toString(32).substring(2);
        $panel.html('<p>Edita el contingut ' + newId + '.</p>');
        $panel.attr('id', newId);
        $panel.removeClass("active");
        const theA = $lst.find("a");
        theA.attr("href", "#" + newId);
        theA.removeClass("active");
        theA.html('<span>&nbsp;Tab' + ($allLI.length + 1) + '</span>');

        // Decide where to place the new Tab
        if (!this.currentContext.theTab) {
            // Append to the end
            $target.find("ul.nav.nav-tabs").append($lst);
            $target.find("div.tab-content").append($panel);
        } else {
            const $theTab = jQuery(this.currentContext.theTab);
            const referencePanel = $target.find($theTab.attr("href") || "");
            if (evt.currentTarget.dataset.before) {
                $lst.insertBefore($theTab.parent());
                $panel.insertBefore(referencePanel);
            } else {
                $lst.insertAfter($theTab.parent());
                $panel.insertAfter(referencePanel);
            }
        }
        this.uiContextMenu.hide();
    },
    "tabs/move": function(evt) {
        evt.preventDefault();
        if (this.currentContext.theTab == null) {
            this.uiContextMenu.hide();
            return;
        }
        const $target = jQuery(this.currentContext.elem);
        const href = this.currentContext.theTab.getAttribute("href") || "";
        const $panel = $target.find(href);
        const $li = jQuery(this.currentContext.theTab).parent();

        // Decide where to move the new Tab
        if (evt.currentTarget.dataset.before) {
            // Move before the current
            moveBefore($li);
            moveBefore($panel);
        } else {
            // Move after the current
            moveAfter($li);
            moveAfter($panel);
        }
        this.uiContextMenu.hide();
    },
    "tabs/del": function(evt) {
        evt.preventDefault();
        if (this.currentContext.theTab == null) {
            this.uiContextMenu.hide();
            return;
        }
        const $target = jQuery(this.currentContext.elem);
        const tabs = $target.find("ul.nav.nav-tabs > li");
        if (tabs.length === 1) {
            // If only one tab --> remove the entire menu instead
            $target.remove();
        } else {
            // Remove the tab selected
            const href = this.currentContext.theTab.getAttribute("href") || "";
            $target.find(href).remove();
            const theLi = this.currentContext.theTab.parentElement;
            if (theLi) {
                jQuery(theLi).remove();
            }
            // Must make at least one tab active
            $target.find("ul.nav.nav-tabs > li > a").first().trigger("click");
        }
        this.uiContextMenu.hide();
    },
    "imatge": function(evt) {
        evt.preventDefault();
        const $target = jQuery(this.currentContext.elem);
        const which = evt.currentTarget.dataset.effect;
        if (!which) {
            $target.removeAttr("data-snptd");
        } else {
            $target.attr("data-snptd", which);
        }
        this.uiContextMenu.hide();
    },
    "imatge-fons": function(evt) {
        evt.preventDefault();
        this.uiContextMenu.hide();
        const $target = jQuery(this.currentContext.elem);
        displayFilepicker(this.editor, 'image').then((params) => {
            if (params?.url) {
                $target.css("background-image", "url('" + params.url + "')");
            }
            return;
        }).catch();
    },
    "two-cols": function(evt) {
        evt.preventDefault();
        const $target = jQuery(this.currentContext.elem);
        if (evt.currentTarget.dataset.cols === "rm") {
            // To one column
            const columns = $target.find("div");
            columns.removeClass();
            $target.replaceWith(columns);
        } else {
            // Define the spans
            const colSpan = convertInt(evt.currentTarget.dataset.cols, 0);
            const first = $target.find("div:first-child");
            const last = $target.find("div:last-child");
            first.removeClass();
            last.removeClass();
            first.addClass("span" + colSpan);
            last.addClass("span" + (12 - colSpan));
        }
        this.uiContextMenu.hide();
    },
    "desplegable2": function(evt) {
        evt.preventDefault();
        if (this.currentContext.theTab == null) {
            console.error("theTab is null");
            this.uiContextMenu.hide();
            return;
        }
        const $target = jQuery(this.currentContext.elem);
        const $group = jQuery(this.currentContext.theTab);
        const opt = evt.currentTarget.dataset.accordion;
        if (opt === "rm") {
            // Remove the current tab
            $group.remove();
            if ($target.find("div.accordion-group").length === 0) {
                // Remove everything
                $target.remove();
            }
        } else if (opt === "iup") {
            // Insert one up
            const $cloneGroup = $target.find("div.accordion-group:first-child").clone();
            const newId = "nid_" + Math.random().toString(32).substring(2);
            $cloneGroup.find("a.accordion-toggle").attr("href", "#" + newId);
            $cloneGroup.find("div.accordion-body").attr("id", newId);
            $cloneGroup.find("div.accordion-body > .accordion-inner").html("<p>Editar contingut</p>");
            $cloneGroup.insertBefore($group);
        } else if (opt === "idwn") {
            // Insert one down
            const $cloneGroup2 = $target.find("div.accordion-group:first-child").clone();
            const newId2 = "nid_" + Math.random().toString(32).substring(2);
            $cloneGroup2.find("a.accordion-toggle").attr("href", "#" + newId2);
            $cloneGroup2.find("div.accordion-body").attr("id", newId2);
            $cloneGroup2.find("div.accordion-body > .accordion-inner").html("<p>Editar contingut</p>");
            $cloneGroup2.insertAfter($group);
        } else if (opt === "2list") {
            // Convert into a list
            const listSubstitute = jQuery("<ul></ul>");
            $target.find("a.accordion-toggle").each((i, a) => {
                const $e = $target.find(a.getAttribute("href") || "");
                $e.detach();
                $e.removeClass();
                const theLi = jQuery("<li></li>");
                theLi.append(a.innerHTML);
                theLi.append($e);
                listSubstitute.append(theLi);
            });
            $target.replaceWith(listSubstitute);
        } else if (opt === "mup") {
            // Move up
            moveBefore($group);
        } else if (opt === "mdwn") {
            // Move down
            moveAfter($group);
        } else if (opt === "bind") {
            // Behavior individual
            $target.find("div.accordion-body").removeAttr("data-parent");
        } else if (opt === "bacc") {
            // Behavior accordion
            const acid = $target.attr("id");
            $target.find("div.accordion-body").attr("data-parent", "#" + acid);
        }
        this.uiContextMenu.hide();
    },
    "taula-predefinida": function(evt) {
        evt.preventDefault();
        const $target = jQuery(this.currentContext.elem);

        const act = evt.currentTarget.dataset.pos;
        if (act === "2bs") {
            $target.removeClass("iedib-table");
            $target.addClass("table table-striped iedib-bstable");
            $target.find("td,th").removeAttr("style");
            $target.find("thead > tr > th").attr("role", "col");
        } else if (act === "2pf") {
            $target.removeClass("table table-bordered table-hover table-striped table-responsive iedib-bstable");
            $target.addClass("iedib-table");
            $target.attr("style", 'table-layout:fixed; border-collapse:collapse; border-spacing:0px; width:96%;');
            $target.find("td,th").css("border", '1px solid gray');
        } else if (act === "thead") {
            let head = $target.find("thead");
            if (head.length) {
                head.remove();
            } else {
                head = jQuery("<thead></thead>");
                const tr = jQuery("<tr></tr>");
                $target.find("tr").first().find("td").each(function() {
                    const newTh = jQuery('<th role="col">Títol</th>');
                    const st = jQuery(this).attr("style");
                    newTh.attr("style", st ? st : "");
                    tr.append(newTh);
                });
                head.append(tr);
                $target.prepend(head);
            }
        } else if (act === "tfoot") {
            let foot = $target.find("tfoot");
            if (foot.length) {
                foot.remove();
            } else {
                foot = jQuery("<tfoot></tfoot>");
                const tr2 = jQuery("<tr></tr>");
                $target.find("tbody tr").first().find("td").each(function() {
                    const newTd = jQuery("<td>Resum</td>");
                    const st = jQuery(this).attr("style");
                    newTd.attr("style", st ? st : "");
                    tr2.append(newTd);
                });
                foot.append(tr2);
                $target.append(foot);
            }
        } else if (act === "delres") {
            // Delete responsiveness
            $target.parent().replaceWith($target);
        } else if (act === "addres") {
            // Add responsiveness
            const $div = jQuery('<div class="table-responsive"></div>');
            $target.replaceWith($div);
            $div.append(jQuery(this.currentContext.elem));
        }
        this.uiContextMenu.hide();
    },
    "taula-predefinida/maxwidth": function(evt) {
        const $target = jQuery(this.currentContext.elem);
        const maxwidth = convertInt(evt.currentTarget.dataset.value, 0);
        if (maxwidth > 0) {
            $target.css("max-width", maxwidth + "px");
        } else {
            $target.css("max-width", "");
        }
    },
    "capsa": function(evt) {
        evt.preventDefault();
        const $target = jQuery(this.currentContext.elem);
        let newLang = evt.currentTarget.dataset.lang || "ca";
        const newType = evt.currentTarget.dataset.type;
        const isTascaExercici = evt.currentTarget.dataset.proposat === 'true';
        console.log(isTascaExercici, this.currentContext.elem);
        let widgetKey = this.currentContext.snpt.key;
        let $lateral;
        if (newType) {
            // Accions sobre canvi de tipus de capsa
            $target.removeClass(
            "iedib-alerta-border iedib-important-border iedib-consell-border iedib-introduccio-border iedib-ampliacio-border");
            $target.addClass("iedib-" + newType + "-border");
            $lateral = $target.find(".iedib-lateral");
            $lateral.removeClass("iedib-alerta iedib-important iedib-consell iedib-introduccio iedib-ampliacio");
            $lateral.addClass("iedib-" + newType);
            newLang = $target.attr("data-lang") || "ca";
        }
        if (newLang) {
            // Canvi el contingut de l'etiqueta
            $lateral = $target.find("div.iedib-lateral > p.iedib-titolLateral");
            const theType = newType || evt.currentTarget.dataset.oldtype;
            $target.attr("data-lang", newLang);
            if (isTascaExercici) {
                widgetKey = 'tasca-exercici';
            }
            const widget = this.currentContext.snpt;
            if (widget != null) {
                const I18n = widget.I18n;
                let langKey = widgetKey === "capsa-generica" ? "msg_" + theType : "msg";
                if (isTascaExercici) {
                    langKey = 'msg_epr';
                }
                if (I18n && I18n[langKey] && I18n[langKey][newLang]) {
                    if (isTascaExercici) {
                        const h4 = $target.find('.iedib-central h4').first();
                        h4.html(I18n[langKey][newLang]);
                    } else {
                        $lateral.html(I18n[langKey][newLang]);
                        $lateral.append('<span class="iedib-' + theType + '-logo"></span>');
                    }
                }
            }
        }
        this.uiContextMenu.hide();
    },
    "capsa/mida": function(evt) {
        evt.preventDefault();
        const $target = jQuery(this.currentContext.elem);
        $target.removeClass("iedib-capsa-petita iedib-capsa-mitjana iedib-capsa-gran");
        $target.addClass("iedib-capsa-" + evt.currentTarget.dataset.mida);
        this.uiContextMenu.hide();
    },
    "capsa-exemple-cols": function(evt) {
        evt.preventDefault();
        const $target = jQuery(this.currentContext.elem);
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
        this.uiContextMenu.hide();
    },
    "capsa-exemple-rows": function(evt) {
        evt.preventDefault();
        const $target = jQuery(this.currentContext.elem);
        const lang = $target.attr("data-lang") || "ca";
        const solLabel = (this.currentContext.snpt.I18n?.sol || {})[lang] || 'Solució';
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
        console.log(resolucio);
        const central = newSnpt.find('div.iedib-central');
        central.append(formulacio);
        if (resolucio.find('div.accordion').length === 0) {
            central.append("<p><b>" + solLabel + "</b>:</p>");
        }
        central.append(resolucio);
        $target.replaceWith(newSnpt);
        this.uiContextMenu.hide();
    },
    "!ol": function(evt) {
        evt.preventDefault();
        const $target = jQuery(this.currentContext.elem);
        const opt = evt.currentTarget.dataset.ol;
        if (opt === "snorm") {
            // To norm style
            $target.removeClass("iedib-falist");
            this.uiContextMenu.hide();
        } else if (opt === "sfa") {
            // To awesome style
            $target.addClass("iedib-falist");
            // Make sure that start and style are in sync
            const startAt = $target.attr("start") || "1";
            if (startAt != null) {
                const beginAt = parseInt(startAt);
                $target.css("counter-reset", "iedibfalist-counter " + (beginAt - 1));
            } else {
                $target.css("counter-reset", "");
            }
            this.uiContextMenu.hide();
        } else if (opt === "startAt") {
            // Change the number at which start
            const startAt2 = evt.currentTarget.dataset.value || "1";
            if (startAt2) {
                const beginAt3 = parseInt(startAt2);
                $target.attr("start", beginAt3);
                $target.css("counter-reset", "iedibfalist-counter " + (beginAt3 - 1));
            }
        }
    },
    "!img": function(evt) {
        evt.preventDefault();
        const $target = jQuery(this.currentContext.elem);
        const $snpt = jQuery('<div class="iedib-figura iedib-grid-responsive"></div');
        $snpt.append($target.clone());
        // eslint-disable-next-line max-len
        $snpt.append(jQuery('<p class="iedib-img-footer"><span class="iedib-caption-counter">Imatge:</span> <span class="iedib-caption-title">Descripció</span></p>'));
        $target.replaceWith($snpt);
        this.uiContextMenu.hide();
    }
};