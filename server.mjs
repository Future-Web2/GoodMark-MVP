import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {consult,analyze} from './ai-service.mjs';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const port=Number(process.env.PORT||4173);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.csv':'text/csv; charset=utf-8'};
const buckets=new Map();
function json(res,code,data){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
async function body(req){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>25000)throw Error('TOO_LARGE');}return JSON.parse(raw);}
const server=http.createServer(async(req,res)=>{
 try{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  const u=new URL(req.url,'http://127.0.0.1');
  if(u.pathname==='/api/config'&&req.method==='GET')return json(res,200,{aiEnabled:!!process.env.OPENAI_API_KEY,demo:true});
  if(['/api/assistant','/api/insights'].includes(u.pathname)&&req.method==='POST'){
   // Development server is loopback-only. Add authenticated sessions before deploying this API publicly.
   const origin=req.headers.origin;
   if(origin&&!['http://localhost:'+port,'http://127.0.0.1:'+port].includes(origin))return json(res,403,{error:'Origin not allowed'});
   const now=Date.now();for(const[k,b]of buckets)if(now-b.time>3600000)buckets.delete(k);
   const key=req.socket.remoteAddress,b=buckets.get(key)||{time:now,count:0};b.count++;buckets.set(key,b);if(b.count>60)return json(res,429,{error:'Лимит демо: 60 запросов в час.'});
   if(!process.env.OPENAI_API_KEY)return json(res,503,{error:'AI не подключён: задайте OPENAI_API_KEY на сервере.'});
   const data=await body(req);
   if(u.pathname==='/api/assistant'){
    if(typeof data.message!=='string'||!data.message.trim()||data.message.length>1500||data.history&&!Array.isArray(data.history))return json(res,400,{error:'Некорректное сообщение.'});
    return json(res,200,await consult(data));
   }
   if(!data.summary||typeof data.summary!=='object')return json(res,400,{error:'Нет данных для анализа.'});
   return json(res,200,{text:await analyze(data.summary)});
  }
  if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'Method not allowed'});
  const decoded=decodeURIComponent(u.pathname),target=path.resolve(root,'.'+(decoded==='/'?'/index.html':decoded));
  if(!target.startsWith(root+path.sep))return json(res,403,{error:'Forbidden'});
  if(!(await stat(target)).isFile())return json(res,404,{error:'Not found'});
  const data=await readFile(target);res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:data);
 }catch(e){if(e.code==='ENOENT')return json(res,404,{error:'Not found'});if(e instanceof SyntaxError||e.message==='TOO_LARGE')return json(res,400,{error:'Некорректный запрос.'});json(res,502,{error:'Сервис недоступен. Попробуйте сценарный деморежим.'});}
});
server.listen(port,'127.0.0.1',()=>console.log(`Goodmark MVP: http://127.0.0.1:${port}`));
