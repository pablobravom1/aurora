/* Extiende la pantalla existente, sin reemplazar la recuperación WhatsApp. */
(function(){
 const original=renderCrearClaveNueva;
 renderCrearClaveNueva=function(){
  original();
  const button=document.querySelector('#btn-guardar-clave-nueva'),error=document.querySelector('#clave-nueva-error');
  if(!button||!error)return;button.disabled=true;
  const check=async()=>{
   try{
    const r=await sb.rpc('stc_onboarding_state');if(!button.isConnected)return;
    if(r.error)throw Error('No se pudo verificar el acceso. Revisa tu conexión y vuelve a entrar.');
    if(r.data?.expired){
     const support=document.createElement('a');support.id='stc-onboarding-support';support.className='btn btn-outline';support.textContent='Pedir nueva clave por WhatsApp';support.target='_blank';support.rel='noopener noreferrer';
     const session=await sb.auth.getSession();if(!button.isConnected)return;
     const message=`Hola, necesito renovar mi acceso temporal de STC App.\nNombre: ${profile?.nombre||'Sin nombre'}\nCorreo: ${session.data?.session?.user?.email||'Por completar'}`;
     support.href=`https://wa.me/${WHATSAPP_SOPORTE}?text=${encodeURIComponent(message)}`;
     error.after(support);
     throw Error('El acceso temporal venció. Solicita una nueva clave por el WhatsApp de soporte de STC.');
    }
    button.disabled=false;
   }catch(e){if(error.isConnected){error.textContent=e.message;error.classList.remove('hidden');}}
  };
  check();
 };
})();
