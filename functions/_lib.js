const encoder = new TextEncoder();
const b64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64 = (value) => Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/') + '='.repeat((4-value.length%4)%4)), c=>c.charCodeAt(0));
export function json(data, status=200, extra={}) { return new Response(JSON.stringify(data), {status, headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}}); }
export async function hashPassword(password, saltText) {
  const salt = saltText ? unb64(saltText) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:210000,hash:'SHA-256'},key,256);
  return {salt:b64(salt),hash:b64(bits)};
}
async function hmac(secret, value) {
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return b64(await crypto.subtle.sign('HMAC',key,encoder.encode(value)));
}
export async function makeSession(userId, secret) {
  const payload=b64(encoder.encode(JSON.stringify({sub:userId,exp:Math.floor(Date.now()/1000)+60*60*24*14})));
  return `${payload}.${await hmac(secret,payload)}`;
}
export async function readSession(request, secret) {
  if(!secret) return null;
  const cookies=request.headers.get('Cookie')||'';
  const token=cookies.split(';').map(x=>x.trim()).find(x=>x.startsWith('rf_session='))?.slice('rf_session='.length);
  if(!token) return null;
  const [payload,signature,...rest]=token.split('.'); if(!payload||!signature||rest.length) return null;
  const expected=await hmac(secret,payload);
  if(signature.length!==expected.length) return null;
  const a=encoder.encode(signature),b=encoder.encode(expected);let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];if(diff) return null;
  try { const value=JSON.parse(new TextDecoder().decode(unb64(payload))); if(!value.sub||value.exp<Math.floor(Date.now()/1000))return null; return value.sub; } catch { return null; }
}
export function sessionCookie(token) { return `rf_session=${token}; Path=/; Max-Age=1209600; HttpOnly; Secure; SameSite=Lax`; }
export function clearSessionCookie() { return 'rf_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax'; }
export async function currentUser(context) {
  const id=await readSession(context.request,context.env.SESSION_SECRET);
  if(!id||!context.env.DB)return null;
  return await context.env.DB.prepare('SELECT id, username FROM users WHERE id = ?').bind(id).first();
}
export function validPublicHttpsUrl(raw) {
  try {
    const u=new URL(raw);
    if(u.protocol!=='https:'||u.username||u.password||!u.hostname||u.port&&u.port!=='443')return null;
    const h=u.hostname.toLowerCase();
    if(h==='localhost'||h.endsWith('.localhost')||h.endsWith('.local')||h.endsWith('.internal')||h==='0.0.0.0'||h==='127.0.0.1'||h==='::1'||/^10\./.test(h)||/^192\.168\./.test(h)||/^169\.254\./.test(h)||/^172\.(1[6-9]|2\d|3[01])\./.test(h)||/^\d+\.\d+\.\d+\.\d+$/.test(h)||h.startsWith('['))return null;
    return u;
  } catch { return null; }
}
