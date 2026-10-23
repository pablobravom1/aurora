/* Pantalla separada: no cambia boot, contraseñas ni lógica de rutinas de STC. */
(function(){
 window.STC_GOOGLE_LOGIN_ENABLED=true;
 const client=supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY),access=window.STCGoogleAccess;
 const status=document.querySelector('#google-status'),button=document.querySelector('#google-start'),retry=document.querySelector('#google-retry');
 const fail=message=>{status.textContent=message;status.className='error';button.disabled=false;};
 async function finish(){
   retry.hidden=true;button.disabled=true;status.className='';status.textContent='Verificando tu acceso en STC…';
   try{
     const {data,error}=await client.auth.getSession();if(error||!data.session)throw Error('No se completó el acceso Google. Puedes intentarlo otra vez.');
     const pending=await client.rpc('stc_onboarding_state');if(pending.error)throw Error('No se pudo comprobar tu acceso. Intenta nuevamente.');
     if(pending.data?.pending)throw Error('Tu cuenta tiene un acceso temporal pendiente. Vuelve a STC y completa el cambio de clave; no lo saltaremos al entrar con Google.');
     await access.claimInvitation(client);
     const profile=await client.from('profiles').select('id,role,profesor_id').eq('id',data.session.user.id).maybeSingle();
     if(profile.error)throw Error('No se pudo verificar tu perfil en STC.');
     if(!profile.data||profile.data.role==='alumno'&&!profile.data.profesor_id){status.textContent='Tu cuenta Google está identificada. Falta que STC te asigne un profesor o que actives tu invitación. Contacta con el equipo; no crees otra cuenta.';button.disabled=false;return;}
     status.textContent='Acceso confirmado. Abriendo STC…';location.replace('/');
   }catch(e){fail(e.message||'No se pudo completar el acceso');retry.hidden=false;}
 }
 button.onclick=async()=>{button.disabled=true;status.className='';status.textContent='Abriendo Google…';try{await access.start(client);}catch(e){fail(e.message);}};
 retry.onclick=finish;
 try{access.captureInvitation();}catch(e){fail(e.message);return;}
 const params=new URLSearchParams(location.search);
 if(params.has('error')||new URLSearchParams(location.hash.slice(1)).has('error')){fail('El acceso Google se canceló o no fue autorizado. Puedes intentarlo de nuevo.');return;}
 if(params.get('stc_google')==='1')finish();
})();
