(function () {
    "use strict";/**
 * Tiny WidgetHub plugin.
 *
 * @copyright   2026 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */["fetch", "XMLHttpRequest", "eval", "location", "navigator", "alert", "confirm", "prompt", "indexedDB"].forEach(e => { window[e] && Object.defineProperty(window, e, { value: void 0, writable: !1 }) }); const f = 5e3, m = 10, i = {}, c = {}; let a = null; const k = `function disableWorkerAPIs() {
            var dangerous = ['close', 'fetch', 'XMLHttpRequest', 'importScripts'];
            dangerous.forEach(api => {
                if (self[api]) {
                    Object.defineProperty(self, api, {
                        value: () => { throw new Error('Security Error: worker api is disabled.'); },
                        configurable: false,
                        writable: false
                    });
                }
            });
        }

        var blacklist = ['self', 'globalThis', 'Worker', 'SharedWorker', 'postMessage', 'onmessage', 
            'indexedDB', 'location', 'navigator', 'origin', 'console', 'setTimeout', 'setInterval'];

        function evalInContext(ctx, expr, keepFns) {
            if (expr.indexOf('Function(') !== -1 || expr.indexOf('eval(') !== -1 ||
                expr.indexOf('.constructor') !== -1) {
                throw new Error('Function or eval or constructor is not allowed');
            }
            var listArgs = [];
            var listVals = [];
            ctx = ctx || {};
            Object.keys(ctx).forEach((key) => {
                if (keepFns || typeof ctx[key] !== "function") {
                    listArgs.push(key);
                    listVals.push(ctx[key]);
                }
            });
            blacklist.forEach((key) => {
                if (ctx[key] !== undefined) {
                    return;
                }
                listArgs.push(key);
                listVals.push(null);
            });
            listArgs.push('expr');
            listArgs.push('return eval(expr)');
            listVals.push(expr);
            var evaluator = new Function(...listArgs);
            return evaluator(...listVals);
        }
    `; function w(e) { const t = new DOMParser().parseFromString(e, "text/html"), r = new Set(["SCRIPT", "STYLE", "FORM", "TEXTAREA", "OBJECT", "EMBED", "LINK", "META", "BASE", "SVG", "MATH"]), l = /^(https?:|mailto:|tel:|#)/i; return t.querySelectorAll("*").forEach(o => { if (r.has(o.tagName)) { o.remove(); return } else if (o.tagName === "IFRAME") { if (!o.getAttribute("src")) { o.remove(); return } o.removeAttribute("srcdoc"), o.removeAttribute("allow-same-origin") } [...o.attributes].forEach(n => { const s = n.name.toLowerCase(), u = n.value.toLowerCase(); ((s === "href" || s === "src") && !l.test(u) || s.startsWith("on")) && o.removeAttribute(n.name) }) }), t.body.innerHTML } function y(e) { const t = document.getElementById("worker_" + e); if (!t) return console.error("Worker template not found for type: " + e), null; const r = k + t.textContent.trim(), l = URL.createObjectURL(new Blob([r], { type: "text/javascript" })), o = new Worker(l), n = { worker: o, id: null, runs: 0, loaded: !1, timeout: null }; return o.onmessage = function (s) { if (s.data.type === "worker_ready") { URL.revokeObjectURL(l), n.loaded = !0, p(e); return } else if (s.data.type === "worker_error") { URL.revokeObjectURL(l), (i[e] || []).forEach(h => { a == null || a.postMessage({ type: e, requestId: h.requestId, error: "Worker error for type: " + e + " " + s.data.error }) }), i[e] = [], o.terminate(), c[e] = null; return } n.id = null; const u = s.data; u.type = e, u.response && (u.response = w(u.response)), a == null || a.postMessage(u), n.timeout && clearTimeout(n.timeout), p(e) }, o.onerror = function (s) { console.error("Worker onerror for type: " + e, s, n.id), a == null || a.postMessage({ type: e, requestId: n.id, error: "Worker error for type: " + e + " " + s }), n.timeout && clearTimeout(n.timeout), o.terminate(), c[e] = null, i[e] = [], URL.revokeObjectURL(l) }, n } function p(e) { if (!i[e] || i[e].length === 0) return; const t = i[e][0]; if (!t) return; let r = c[e]; if (r) { if (!r.loaded || r.id) return; r.runs >= m && (r.timeout && clearTimeout(r.timeout), r.worker.terminate(), r = null, c[e] = null) } if (!r) { r = y(e), c[e] = r; return } i[e].shift(), r.timeout = window.setTimeout(function () { var l; r != null && r.timeout && window.clearTimeout(r.timeout), (l = r == null ? void 0 : r.worker) == null || l.terminate(), r = null, a == null || a.postMessage({ requestId: t.requestId, type: e, error: "Worker timeout for type: " + e }), c[e] = null, p(e) }, f), r.id = t.requestId, r.runs++, r.worker.postMessage(t) } function g(e) { const t = e.data; t.type && (i[t.type] || (i[t.type] = []), i[t.type].push(t), p(t.type)) } const d = new MessageChannel; window.parent.postMessage({ type: "tiny_widgethub_sandbox_init", status: "ready" }, "*", [d.port2]), a = d.port1, a.onmessage = g
})();
