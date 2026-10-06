// Aurora · RS App — lectura segura de las planillas de Google (solo lectura).
// La clave RS_APP_KEY vive únicamente en las variables de entorno de Vercel; nunca llega al navegador.
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mgghrslijmnlchsijwgt.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_hc44iXDAY2VEq095qdFNPA_4lmvYQKp';
const SCRIPT_URL = process.env.RS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxSGsy5l6IsCW8oSGO8iPE2_liWvNOAIRpDa3lXsiAGVUtIpIyE3xu9xEObpm3_PL55oA/exec';
const ALLOWED = ['protocols', 'october'];

function send(res, code, body) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = '';
  for await (const chunk of req) raw += chunk;
  try { return JSON.parse(raw || '{}'); } catch (e) { return {}; }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { status: 'error', message: 'Método no permitido' });

  // 1) Solo usuarios con sesión válida de Supabase pueden pedir datos.
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return send(res, 401, { status: 'error', message: 'Falta iniciar sesión' });
  try {
    const u = await fetch(SUPABASE_URL + '/auth/v1/user', { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + token } });
    if (!u.ok) return send(res, 401, { status: 'error', message: 'Sesión inválida o vencida' });
    const user = await u.json();
    const allowed = (process.env.RS_ALLOWED_EMAILS || 'pablobravo14610@gmail.com').toLowerCase().split(',').map((x) => x.trim());
    if (!user.email || !user.email_confirmed_at || !allowed.includes(user.email.toLowerCase())) {
      return send(res, 403, { status: 'error', message: 'Esta cuenta no tiene permiso para ver los dashboards' });
    }
  } catch (e) {
    return send(res, 502, { status: 'error', message: 'No se pudo verificar la sesión' });
  }

  const body = await readBody(req);
  const dashboard = body.dashboard;
  if (!ALLOWED.includes(dashboard)) return send(res, 400, { status: 'error', message: 'Dashboard desconocido' });

  const key = process.env.RS_APP_KEY;
  if (!key) return send(res, 500, { status: 'error', message: 'Falta configurar RS_APP_KEY en Vercel (variables de entorno)' });

  // 2) Lectura de Google Apps Script (la respuesta llega tras una redirección 302 que fetch sigue).
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 25000);
    const g = await fetch(SCRIPT_URL, {
      method: 'POST', redirect: 'follow', signal: ctl.signal,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ connectionKey: key, dashboard })
    });
    clearTimeout(t);
    const text = await g.text();
    let j;
    try { j = JSON.parse(text); } catch (e) { return send(res, 502, { status: 'error', message: 'Google respondió algo que no es datos (HTTP ' + g.status + ')' }); }
    if (j.status === 'unauthorized') return send(res, 502, { status: 'error', message: 'Google rechazó la clave de conexión (RS_APP_KEY incorrecta)' });
    if (j.status !== 'success' || !Array.isArray(j.values)) return send(res, 502, { status: 'error', message: 'Google no entregó datos: ' + (j.message || j.status || 'respuesta inesperada') });
    return send(res, 200, { status: 'success', dashboard, spreadsheetId: j.spreadsheetId, range: j.range, values: j.values, readAt: j.readAt || new Date().toISOString() });
  } catch (e) {
    return send(res, 502, { status: 'error', message: e && e.name === 'AbortError' ? 'Google tardó demasiado en responder' : 'No se pudo contactar a Google' });
  }
};
