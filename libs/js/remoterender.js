(function(){"use strict";/**
 * Tiny WidgetHub plugin.
 *
 * @copyright   2026 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */const a={},c={};let l=null;const y=`function disableWorkerAPIs() {
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
    `;function g(e){const t=new DOMParser().parseFromString(e,"text/html"),r=new Set(["SCRIPT","STYLE","FORM","TEXTAREA","OBJECT","EMBED","LINK","META","BASE","SVG","MATH"]),u=/^(https?:|mailto:|tel:|#)/i;return t.querySelectorAll("*").forEach(o=>{if(r.has(o.tagName)){o.remove();return}else if(o.tagName==="IFRAME"){if(!o.getAttribute("src")){o.remove();return}o.removeAttribute("srcdoc"),o.removeAttribute("allow-same-origin")}[...o.attributes].forEach(n=>{const s=n.name.toLowerCase(),i=n.value.toLowerCase();((s==="href"||s==="src")&&!u.test(i)||s.startsWith("on"))&&o.removeAttribute(n.name)})}),t.body.innerHTML}function k(e){const t=document.getElementById("worker_"+e);if(!t)return console.error("Worker template not found for type: "+e),null;const r=y+t.content.textContent.trim(),u=URL.createObjectURL(new Blob([r],{type:"text/javascript"}));console.log("Creating worker for type: "+e,r);const o=new Worker(u),n={worker:o,id:null,runs:0,loaded:!1,timeout:null};return o.onmessage=function(s){if(console.log("Worker message for type: "+e,s.data),s.data.type==="worker_ready"){URL.revokeObjectURL(u),n.loaded=!0,console.log("Worker ready for type: "+e),p(e);return}else if(s.data.type==="worker_error"){URL.revokeObjectURL(u),(a[e]||[]).forEach(f=>{l==null||l.postMessage({type:e,requestId:f.requestId,error:"Worker error for type: "+e+" "+s.data.error})}),a[e]=[],o.terminate(),c[e]=null;return}n.id=null;const i=s.data;i.type=e,i.response&&(i.response=g(i.response)),l==null||l.postMessage(i),n.timeout&&clearTimeout(n.timeout),p(e)},o.onerror=function(s){console.error("Worker onerror for type: "+e,s,n.id);const i="Worker error for type: "+e+" "+(s.message||s);n.id&&(l==null||l.postMessage({type:e,requestId:n.id,error:i})),(a[e]||[]).forEach(f=>{l==null||l.postMessage({type:e,requestId:f.requestId,error:i})}),n.timeout&&clearTimeout(n.timeout),o.terminate(),c[e]=null,a[e]=[],URL.revokeObjectURL(u)},n}function p(e){if(!a[e]||a[e].length===0){console.log("No tasks for type: "+e);return}const t=a[e][0];if(!t){console.log("No task for type: "+e);return}let r=c[e];if(r){if(!r.loaded||r.id){console.log("Worker not ready or busy for type: "+e);return}r.runs>=10&&(console.log("Worker max runs reached for type: "+e),r.timeout&&clearTimeout(r.timeout),r.worker.terminate(),r=null,c[e]=null)}if(!r){console.log("Creating worker for type: "+e),r=k(e),c[e]=r;return}a[e].shift(),r.timeout=window.setTimeout(function(){var u;r!=null&&r.timeout&&window.clearTimeout(r.timeout),(u=r==null?void 0:r.worker)==null||u.terminate(),r=null,l==null||l.postMessage({requestId:t.requestId,type:e,error:"Worker timeout for type: "+e}),c[e]=null,p(e)},5e3),r.id=t.requestId,r.runs++,console.log("sending task to worker for type: "+e,t),r.worker.postMessage(t)}function m(e){const t=e.data;t.type&&(a[t.type]||(a[t.type]=[]),a[t.type].push(t),console.log("Task received to iframe for type: "+t.type,t),p(t.type))}const d=new MessageChannel;window.parent.postMessage({type:"tiny_widgethub_sandbox_init",status:"ready"},"*",[d.port2]),l=d.port1,l.onmessage=m})();
