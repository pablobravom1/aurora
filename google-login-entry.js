// Enlace de login independiente. No reescribe app.js ni cambia los formularios existentes.
(function(){
 function mount(){
   const submit=document.querySelector('#auth-submit');if(!submit||document.querySelector('#stc-google-entry'))return;
   const link=document.createElement('a');link.id='stc-google-entry';link.href='./acceso-google.html';link.textContent='Continuar con Google';
   link.style='display:flex;align-items:center;justify-content:center;min-height:48px;margin-top:12px;padding:12px;border:1px solid #555;border-radius:12px;background:#fff;color:#151515;font:600 14px system-ui;text-decoration:none';
   submit.after(link);
 }
 new MutationObserver(mount).observe(document.body,{childList:true,subtree:true});mount();
})();
