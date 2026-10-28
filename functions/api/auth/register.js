import {json,hashPassword,makeSession,sessionCookie} from '../../_lib.js';
export async function onRequestPost({request,env}) {
  if(!env.DB||!env.SESSION_SECRET)return json({error:'Account storage is not configured yet. Follow the deployment guide.'},503);
  let body;try{body=await request.json()}catch{return json({error:'Invalid request body.'},400)}
  const username=String(body.username||'').trim();const password=String(body.password||'');
  if(!/^[A-Za-z0-9_.-]{3,32}$/.test(username))return json({error:'Username must be 3–32 characters: letters, numbers, dot, underscore or hyphen.'},400);
  if(password.length<10||password.length>128)return json({error:'Password must be at least 10 characters.'},400);
  const id=crypto.randomUUID();const hp=await hashPassword(password);
  try{await env.DB.prepare('INSERT INTO users (id, username, username_norm, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(id,username,username.toLowerCase(),hp.salt,hp.hash,new Date().toISOString()).run();
    await env.DB.prepare('INSERT INTO user_config (user_id, config_json, updated_at) VALUES (?, ?, ?)').bind(id,JSON.stringify({addons:[],cloudstream:[],direct:[],watchlist:[],recent:[]}),new Date().toISOString()).run();
  }catch(e){if(String(e).includes('UNIQUE'))return json({error:'That username is already taken.'},409);return json({error:'Could not create account.'},500)}
  const token=await makeSession(id,env.SESSION_SECRET);return json({user:{id,username}},201,{'Set-Cookie':sessionCookie(token)});
}
