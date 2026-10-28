import {json,hashPassword,makeSession,sessionCookie} from '../../_lib.js';
export async function onRequestPost({request,env}) {
  if(!env.DB||!env.SESSION_SECRET)return json({error:'Account storage is not configured yet. Follow the deployment guide.'},503);
  let body;try{body=await request.json()}catch{return json({error:'Invalid request body.'},400)}
  const username=String(body.username||'').trim().toLowerCase();const password=String(body.password||'');
  const user=await env.DB.prepare('SELECT id, username, password_salt, password_hash FROM users WHERE username_norm = ?').bind(username).first();
  if(!user||password.length>128)return json({error:'Incorrect username or password.'},401);
  const result=await hashPassword(password,user.password_salt);if(result.hash!==user.password_hash)return json({error:'Incorrect username or password.'},401);
  const token=await makeSession(user.id,env.SESSION_SECRET);return json({user:{id:user.id,username:user.username}},200,{'Set-Cookie':sessionCookie(token)});
}
