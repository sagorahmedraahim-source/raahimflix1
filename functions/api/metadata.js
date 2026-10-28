const ORIGIN='https://v3-cinemeta.strem.io';
const TYPES=new Set(['movie','series']);
export async function onRequestGet({request}){
 const url=new URL(request.url);const resource=url.searchParams.get('resource')||'catalog';const type=url.searchParams.get('type')||'movie';const id=url.searchParams.get('id')||'top';const query=(url.searchParams.get('query')||'').trim().slice(0,120);
 if(!TYPES.has(type)||!['catalog','meta','search'].includes(resource))return Response.json({error:'Unsupported metadata request.'},{status:400});
 let path;
 if(resource==='search'){if(query.length<1)return Response.json({metas:[]});path=`/catalog/${type}/top/search=${encodeURIComponent(query)}.json`;}
 else {if(!/^[a-zA-Z0-9._-]{1,100}$/.test(id))return Response.json({error:'Invalid metadata id.'},{status:400});path=`/${resource}/${type}/${encodeURIComponent(id)}.json`;}
 try{const upstream=await fetch(`${ORIGIN}${path}`,{headers:{Accept:'application/json'}});if(!upstream.ok)return Response.json({error:`Cinemeta returned HTTP ${upstream.status}.`},{status:502,headers:{'Cache-Control':'public, max-age=60'}});const data=await upstream.json();return Response.json(data,{headers:{'Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff'}})}catch{return Response.json({error:'Cinemeta is temporarily unavailable.'},{status:502})}
}
