(function(){"use strict";/**
 * Tiny WidgetHub plugin.
 *
 * @module      tiny_widgethub/workercommon
 * @copyright   2026 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */function c(){["close","fetch","XMLHttpRequest","importScripts"].forEach(r=>{self[r]&&Object.defineProperty(self,r,{value:()=>{throw new Error("Security Error: worker api is disabled.")},configurable:!1,writable:!1})})}function e(r){return Object.assign(Object.create(null),r)}const o=new self.liquidjs.Liquid(e({cache:!1})),s=self.postMessage;c(),self.onmessage=async function(r){const a=r.data,l=a.payload||e({});try{const t=l.ctx||e({}),n=await o.parseAndRender(l.template,t);s(e({requestId:a.requestId,result:n}))}catch(t){console.error("Failed to render template: "+t),s(e({requestId:a.requestId,error:"Failed to render template: "+t}))}},s(e({type:o?"worker_ready":"worker_error"}))})();
