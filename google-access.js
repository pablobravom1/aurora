/* LOCAL: no publicado. Activación deliberada tras configurar y probar Google. */
(function(){
 const ORIGIN='https://stcapp-zeta.vercel.app';
 const KEY='stc:google:invitation:v1';
 const validToken=t=>typeof t==='string'&&/^[0-9a-f]{64}$/.test(t);
 function captureInvitation(){
   const url=new URL(location.href),params=new URLSearchParams(url.hash.slice(1));
   if(!params.has('stc_invite'))return false;
   const token=params.get('stc_invite');
   // Retirar token de la barra y no reenviarlo a Google ni a servicios de terceros.
   history.replaceState(null,'',url.pathname+url.search);
   if(!validToken(token)){sessionStorage.removeItem(KEY);throw Error('El enlace de invitación no es válido');}
   sessionStorage.setItem(KEY,token);return true;
 }
 async function start(client){
   if(window.STC_GOOGLE_LOGIN_ENABLED!==true)throw Error('El acceso Google de STC todavía no está activado');
   if(location.origin!==ORIGIN)throw Error('Abre Google desde la dirección oficial de STC');
   captureInvitation();
   const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:ORIGIN+'/acceso-google.html?stc_google=1',scopes:'openid email profile',queryParams:{prompt:'select_account'}}});
   if(error)throw Error('No se pudo abrir Google. Intenta otra vez; el acceso por contraseña sigue disponible.');
 }
 async function claimInvitation(client){
   const token=sessionStorage.getItem(KEY);if(!token)return null;
   if(!validToken(token)){sessionStorage.removeItem(KEY);throw Error('Invitación no válida');}
   const {data,error}=await client.rpc('stc_google_invite_claim',{invitation_token:token});
   if(error)throw Error('No se pudo activar tu invitación. Comprueba que usaste el correo invitado o contacta con STC.');
   if(data?.status!=='activated'||!data.student_id)throw Error('STC no confirmó la activación');
   sessionStorage.removeItem(KEY);return data;
 }
 window.STCGoogleAccess={start,captureInvitation,claimInvitation,validToken};
})();
