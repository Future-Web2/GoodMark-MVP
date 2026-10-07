import * as catalogData from './dist/catalog.js';
import {consult} from './ai-service.mjs';
import {cartTotal,findProduct,formatUE,formatDate,assistantReply,writeFilters,emptyFilters,MANAGER_URL} from './dist/core.js';
const products=catalogData.products,categories=catalogData.categories,aliases=catalogData.categoryAliases||{};
const token=process.env.TELEGRAM_BOT_TOKEN;
if(!token){console.error('Задайте TELEGRAM_BOT_TOKEN в окружении. Бот не запущен.');process.exit(1);}
const site=process.env.SITE_URL;
if(!site||!site.startsWith('https://')){console.error('Задайте доступный покупателям HTTPS SITE_URL.');process.exit(1);}
const api=async(method,args)=>{const r=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(40000)});const d=await r.json();if(!d.ok)throw Error('TELEGRAM_REQUEST_FAILED');return d.result;};
const sessions=new Map();let offset=0,stopping=false;
process.on('SIGINT',()=>{stopping=true;});
// Every link keeps utm_source=telegram so the site attributes the visit; filters open the matching catalogue view.
function url({filters={},product='',content='menu'}={}){
 const u=new URL(site);
 u.search=writeFilters('',{...emptyFilters(),...filters});
 if(product)u.searchParams.set('product',product);
 u.searchParams.set('utm_source','telegram');u.searchParams.set('utm_medium','bot');u.searchParams.set('utm_campaign','bot_menu');u.searchParams.set('utm_content',content);
 u.hash='catalog';return u.toString();
}
const PRICE_NOTE='Цены — из Telegram-прайса в у.е., наличие уточняет менеджер.';
const menu={keyboard:[[{text:'🛍 Каталог'},{text:'✧ AI-подбор'}],[{text:'🛒 Открыть сайт'},{text:'💬 Менеджер'}]],resize_keyboard:true};
const send=(id,text,reply_markup=menu)=>api('sendMessage',{chat_id:id,text:text.slice(0,3800),reply_markup});
const inline=buttons=>({inline_keyboard:buttons});
const line=p=>`${p.name}${p.variant&&!p.name.includes(p.variant)?` (${p.variant})`:''} — ${formatUE(p.price)}${p.priceDate?`, прайс ${formatDate(p.priceDate)}`:''}`;
function getSession(id){const old=sessions.get(id);if(old)return old;const value={history:[],last:Date.now()};sessions.set(id,value);if(sessions.size>500)sessions.delete(sessions.keys().next().value);return value;}
function scripted(id,t){
 const r=assistantReply(t,products,{categories,aliases});
 if(r.type==='plan'){
  const text=r.items.map(i=>`${line(findProduct(products,i.id))} × ${i.qty}`).join('\n');
  return send(id,`${r.text}\n\n${text}\nИтого ориентировочно: ${formatUE(cartTotal(r.items,products))}.\nЭто предложение: корзина на сайте не изменена.`,inline(r.items.map(i=>[{text:findProduct(products,i.id).name.slice(0,60),url:url({product:i.id,content:'ai_pick'})}])));
 }
 if(r.type==='options'||(r.type==='none'&&r.products.length)){
  return send(id,`${r.text}\n\n${r.products.map(line).join('\n')}`,inline([...r.products.map(p=>[{text:p.name.slice(0,60),url:url({product:p.id,content:'ai_pick'})}]),[{text:'Показать в каталоге',url:url({filters:r.type==='none'?r.relaxed:r.filters,content:'ai_filter'})}]]));
 }
 if(r.type==='missing'||r.type==='none'||r.type==='manager')return send(id,`${r.text||'Наличие, гарантию и доставку подтверждает менеджер.'}`,inline([[{text:'Написать менеджеру',url:MANAGER_URL}]]));
 if(r.type==='currency')return send(id,'Цены в прайсе указаны в у.е. Пересчёт из долларов или сумов не делаю. Напишите бюджет в у.е., например «до 50 у.е.».');
 return send(id,'Напишите модель, тип или бюджет. Например: «беспроводные наушники Logitech до 120 у.е.» или «Fifine TAM8 и BM88». '+PRICE_NOTE);
}
async function handle(m){
 if(m.chat?.type!=='private'||typeof m.text!=='string')return;
 const id=m.chat.id,t=m.text.slice(0,1500),s=getSession(id);s.last=Date.now();
 if(t.startsWith('/start'))return send(id,`Привет! Это Goodmark Bot: каталог, подбор и связь с менеджером. ${PRICE_NOTE}`);
 if(t.includes('Каталог')){
  const counts={};for(const p of products)counts[p.category]=(counts[p.category]||0)+1;
  return send(id,'Выберите категорию:',inline(categories.filter(c=>c[0]!=='all'&&counts[c[0]]).map(c=>[{text:`${c[1]} · ${counts[c[0]]}`,url:url({filters:{category:c[0]},content:c[0]})}])));
 }
 if(t.includes('Открыть сайт'))return send(id,'Каталог и корзина — на сайте. Корзина браузера не связана с перепиской бота.',inline([[{text:'Открыть Goodmark',url:url({content:'open_site'})}]]));
 if(t.includes('Менеджер'))return send(id,'Goodmark · Малика B8 · +998 99 888 77 87',inline([[{text:'Написать менеджеру',url:MANAGER_URL}]]));
 if(t.includes('AI-подбор'))return send(id,'Напишите запрос. Например: «беспроводные наушники Logitech до 120 у.е.». Бюджет — в у.е., как в прайсе.');
 if(process.env.OPENAI_API_KEY){
  try{
   const result=await consult({message:t,history:s.history});
   s.history.push({role:'user',content:t},{role:'assistant',content:result.text});s.history=s.history.slice(-8);
   let text=result.text;
   if(result.items?.length)text+='\n\n'+result.items.map(i=>`${line(findProduct(products,i.id))} × ${i.qty}`).join('\n')+`\nИтого ориентировочно: ${formatUE(cartTotal(result.items,products))}.\nЭто предложение: корзина на сайте не изменена.`;
   return send(id,text,inline([[{text:'Проверить на сайте',url:url({product:result.product||'',filters:{category:result.category||'all',...result.filters},content:'ai_pick'})}]]));
  }catch{return send(id,'AI-сервис временно недоступен. Попробуйте позже или напишите менеджеру.');}
 }
 return scripted(id,t);
}
console.log(`Goodmark Bot: polling enabled (${products.length} products, prices in UE).`);
while(!stopping){try{const updates=await api('getUpdates',{offset,timeout:25,allowed_updates:['message']});for(const u of updates){offset=u.update_id+1;if(u.message)await handle(u.message);}for(const[id,s]of sessions)if(Date.now()-s.last>3600000)sessions.delete(id);}catch{console.error('Telegram unavailable; retrying.');await new Promise(r=>setTimeout(r,5000));}}
