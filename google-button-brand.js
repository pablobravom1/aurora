/* Visual only: keep existing OAuth handlers, URLs, text and disabled state. */
(function () {
  'use strict';
  var selector = '.kilo-google, #stc-google-entry, #google-start';
  var style = document.createElement('style');
  style.textContent = selector.split(',').map(function(s){return s.trim();}).join(',') + '{display:flex!important;align-items:center!important;justify-content:center!important;gap:12px!important;background:#fff!important;color:#1f1f1f!important;border:1px solid #747775!important;min-height:44px;box-sizing:border-box;text-transform:none!important;letter-spacing:normal!important;font-family:Arial,system-ui,sans-serif!important;font-weight:500!important;line-height:1.4!important}' +
    '.ak-google-g{display:block!important;flex:0 0 20px!important;width:20px!important;height:20px!important;min-width:20px!important;max-width:20px!important;overflow:visible!important;opacity:1!important;visibility:visible!important;margin:0!important;stroke:none!important;filter:none!important;transform:none!important}' +
    '.ak-google-g path{stroke:none!important;opacity:1!important;visibility:visible!important}' +
    '.ak-google-g .g-blue{fill:#4285f4!important}.ak-google-g .g-green{fill:#34a853!important}.ak-google-g .g-yellow{fill:#fbbc05!important}.ak-google-g .g-red{fill:#ea4335!important}';
  document.head.appendChild(style);
  var svg = '<svg class="ak-google-g" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20" height="20" aria-hidden="true" focusable="false"><path class="g-blue" fill="#4285F4" d="M43.61 24.46c0-1.36-.12-2.66-.35-3.92H24.8v7.41h10.55c-.45 2.4-1.84 4.43-3.91 5.79v4.81h6.33c3.7-3.34 5.84-8.26 5.84-14.09z"/><path class="g-green" fill="#34A853" d="M24.8 43.2c5.29 0 9.73-1.72 12.97-4.65l-6.33-4.81c-1.76 1.17-4.01 1.87-6.64 1.87-5.11 0-9.44-3.4-10.99-7.99H7.28v4.96C10.51 38.98 17.14 43.2 24.8 43.2z"/><path class="g-yellow" fill="#FBBC05" d="M13.81 27.62a11.5 11.5 0 0 1 0-7.24v-4.96H7.28a19.1 19.1 0 0 0 0 17.16l6.53-4.96z"/><path class="g-red" fill="#EA4335" d="M24.8 12.39c2.88 0 5.46.97 7.49 2.87l5.62-5.52C34.52 6.64 30.08 4.8 24.8 4.8c-7.66 0-14.29 4.22-17.52 10.62l6.53 4.96c1.55-4.59 5.88-7.99 10.99-7.99z"/></svg>';
  function paint() {
    document.querySelectorAll(selector).forEach(function(button) {
      if(button.querySelector('.ak-google-g')) return;
      // Do not replace the button itself or wrap its last text node: existing
      // code updates lastChild.nodeValue while opening Google.
      button.querySelectorAll('svg').forEach(function(old){old.remove();});
      button.insertAdjacentHTML('afterbegin', svg);
    });
  }
  function start(){
    paint();
    new MutationObserver(paint).observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
