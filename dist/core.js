// Pure logic shared by the storefront, the Telegram bot, the AI service and tests.
// No DOM, no network: everything here is deterministic and testable.

export const CURRENCY='UE';
export const CURRENCY_LABEL='у.е.';
export const MAX_QTY=20;
export const MAX_LINES=20;
export const MANAGER_URL='https://t.me/goodmarkuzmalika';
export const CONNECTIONS=['wireless','wired','unknown'];
export const CATEGORY_IDS=['all','pc','ram','ssd','mouse','keyboard','audio','monitor','accessory'];
export const UTM_KEYS=['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
export const KIND_LABELS={
 headset:['Наушники','Quloqchinlar'],microphone:['Микрофоны','Mikrofonlar'],arm:['Пантографы и держатели','Pantograf va ushlagichlar'],
 webcam:['Веб-камеры','Veb-kameralar'],mouse:['Мыши','Sichqonchalar'],keyboard:['Клавиатуры','Klaviaturalar']
};
export const CONNECTION_LABELS={wireless:['Беспроводное','Simsiz'],wired:['Проводное','Simli'],unknown:['Не указано','Ko‘rsatilmagan']};

// ---------- formatting ----------

export function formatAmount(n){return new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(n);}
export function formatUE(n){return `${formatAmount(n)} ${CURRENCY_LABEL}`;}
export function isIsoDate(s){
 const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||''));if(!m)return false;
 const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));
 return d.getUTCFullYear()===+m[1]&&d.getUTCMonth()===+m[2]-1&&d.getUTCDate()===+m[3];
}
export function formatDate(iso){return isIsoDate(iso)?iso.split('-').reverse().join('.'):'';}
export function isSourceUrl(url){
 try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='t.me'&&!u.username&&!u.port&&/^\/[A-Za-z0-9_]{3,64}\/\d{1,9}$/.test(u.pathname);}
 catch{return false;}
}

// ---------- cart ----------

export function findProduct(catalog,id){return typeof id==='string'?catalog.find(p=>p.id===id):undefined;}
// stock:null means "unknown, confirm with manager" and is orderable as a request; stock:0 is not.
export function isOrderable(p){
 if(!p||!Number.isFinite(p.price)||p.price<=0)return false;
 return p.stock===null||p.stock===undefined||(Number.isInteger(p.stock)&&p.stock>0);
}
export function maxQty(p){return Number.isInteger(p?.stock)?Math.min(MAX_QTY,p.stock):MAX_QTY;}
export function validateItems(items,catalog){
 if(!Array.isArray(items)||!items.length||items.length>MAX_LINES)throw new Error(`Выберите от 1 до ${MAX_LINES} позиций.`);
 const merged=new Map();
 for(const item of items){
  const p=findProduct(catalog,item?.id);
  if(!p||!Number.isInteger(item.qty)||item.qty<1||item.qty>MAX_QTY)throw new Error('Некорректная позиция или количество.');
  merged.set(p.id,(merged.get(p.id)||0)+item.qty);
 }
 return [...merged].map(([id,qty])=>{
  const p=findProduct(catalog,id);
  if(!isOrderable(p))throw new Error(`${p.name}: позиция сейчас недоступна для заявки.`);
  if(qty>MAX_QTY)throw new Error(`${p.name}: не больше ${MAX_QTY} шт. в одной позиции.`);
  if(Number.isInteger(p.stock)&&qty>p.stock)throw new Error(`${p.name}: в импортированном остатке ${p.stock} шт.`);
  return {id,qty};
 });
}
export function cartTotal(cart,catalog){
 const sum=cart.reduce((s,i)=>s+(findProduct(catalog,i.id)?.price||0)*i.qty,0);
 return Math.round(sum*100)/100;
}

// ---------- search & filters ----------

export function normalizeText(s){
 return String(s??'').toLowerCase().replace(/ё/g,'е').replace(/['‘’ʻʼ`´]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
}
const compact=s=>normalizeText(s).replace(/ /g,'');
// Stems shorter than 3 characters must match a whole word; longer stems match word prefixes.
export const SEARCH_SYNONYMS=[
 [['наушник','гарнитур','headset','headphone','naushnik','quloqchin'],{kind:'headset'}],
 [['микрофон','mic','microphon','mikrofon'],{kind:'microphone'}],
 [['пантограф','кронштейн','держател','стойк','штатив','arm','pantograf','shtativ'],{kind:'arm'}],
 [['вебкамер','веб','webcam','kamera','камер'],{kind:'webcam'}],
 [['мыш','mouse','mice','sichqon'],{category:'mouse'}],
 [['клавиатур','keyboard','klaviatur'],{category:'keyboard'}],
 [['памят','озу','оперативк','ram','xotira','operativ'],{category:'ram'}],
 [['ssd','ссд','накопител','nakopitel','disk','диск'],{category:'ssd'}],
 [['монитор','monitor'],{category:'monitor'}],
 [['компьютер','пк','pc','kompyuter'],{category:'pc'}],
 [['звук','аудио','audio','ovoz'],{category:'audio'}],
 [['аксессуар','aksessuar','accessor'],{category:'accessory'}],
 [['беспровод','wireless','simsiz','bluetooth','блютуз'],{connection:'wireless'}],
 [['проводн','wired','simli'],{connection:'wired'}]
];
function stemMatches(token,stem){return stem.length<3?token===stem:token.startsWith(stem);}
export function synonymTarget(token,aliases={}){
 for(const [stems,target] of SEARCH_SYNONYMS)if(stems.some(s=>stemMatches(token,s)))return target;
 for(const [category,words] of Object.entries(aliases||{}))
  if(Array.isArray(words)&&words.some(w=>stemMatches(token,normalizeText(w))))return {category};
 return null;
}
function categoryNames(categories,id){return (categories||[]).filter(c=>c[0]===id).flatMap(c=>[c[1],c[2]]);}
function searchText(p,ctx){
 return normalizeText([p.name,p.brand,p.spec,p.variant,p.kind,p.category,...categoryNames(ctx.categories,p.category),...(KIND_LABELS[p.kind]||[])].join(' '));
}
export function matchesQuery(p,query,ctx={}){
 const q=normalizeText(query);if(!q)return true;
 const hay=searchText(p,ctx);
 if(q.length>=3&&hay.replace(/ /g,'').includes(q.replace(/ /g,'')))return true;
 return q.split(' ').every(token=>{
  if(hay.includes(token))return true;
  const target=synonymTarget(token,ctx.aliases);
  return !!target&&Object.entries(target).every(([k,v])=>p[k]===v);
 });
}
const sameText=(a,b)=>String(a||'').toLowerCase()===String(b||'').toLowerCase();
export function filterProducts(catalog,f={},ctx={}){
 const favorites=new Set(ctx.favorites||[]);
 return catalog.filter(p=>
  (!f.category||f.category==='all'||p.category===f.category)&&
  (!f.brand||sameText(p.brand,f.brand))&&
  (!f.kind||p.kind===f.kind)&&
  (!f.connection||p.connection===f.connection)&&
  (f.priceMin==null||p.price>=f.priceMin)&&
  (f.priceMax==null||p.price<=f.priceMax)&&
  (!f.favoritesOnly||favorites.has(p.id))&&
  (!f.orderableOnly||isOrderable(p))&&
  matchesQuery(p,f.q,ctx));
}
export function sortProducts(list,sort){
 const out=[...list];
 if(sort==='low')out.sort((a,b)=>a.price-b.price);
 if(sort==='high')out.sort((a,b)=>b.price-a.price);
 if(sort==='name')out.sort((a,b)=>a.name.localeCompare(b.name));
 if(sort==='new')out.sort((a,b)=>String(b.priceDate||'').localeCompare(String(a.priceDate||'')));
 return out;
}
export function emptyFilters(){return {category:'all',brand:'',q:'',priceMin:null,priceMax:null,connection:'',kind:''};}
export function readFilters(search,ctx={}){
 const s=new URLSearchParams(search),ids=ctx.categoryIds||CATEGORY_IDS;
 const text=(k,max)=>(s.get(k)||'').trim().slice(0,max);
 const price=k=>{const v=(s.get(k)||'').trim();if(!v)return null;const n=Number(v);return Number.isFinite(n)&&n>=0?n:null;};
 const f={...emptyFilters(),brand:text('brand',50),q:text('q',80),priceMin:price('price_min'),priceMax:price('price_max')};
 const category=text('category',30),connection=text('connection',20),kind=text('kind',30).toLowerCase();
 if(ids.includes(category))f.category=category;
 if(['wireless','wired'].includes(connection))f.connection=connection;
 if(/^[a-z-]{2,30}$/.test(kind))f.kind=kind;
 if(f.priceMin!=null&&f.priceMax!=null&&f.priceMin>f.priceMax)[f.priceMin,f.priceMax]=[f.priceMax,f.priceMin];
 return f;
}
// Updates only the filter params; UTM, product and any other params survive untouched.
export function writeFilters(search,f){
 const s=new URLSearchParams(search);
 const set=(k,v)=>(v===''||v==null||v==='all')?s.delete(k):s.set(k,String(v));
 set('category',f.category);set('brand',f.brand);set('q',f.q);set('price_min',f.priceMin);set('price_max',f.priceMax);set('connection',f.connection);set('kind',f.kind);
 const out=s.toString();return out?'?'+out:'';
}
export function setSearchParam(search,key,value){
 const s=new URLSearchParams(search);value?s.set(key,value):s.delete(key);
 const out=s.toString();return out?'?'+out:'';
}
export function activeFilterCount(f){
 return [f.category&&f.category!=='all',f.brand,f.q,f.priceMin!=null,f.priceMax!=null,f.connection,f.kind].filter(Boolean).length;
}

// ---------- attribution & UTM ----------

export function readAttribution(search){
 const params=new URLSearchParams(search),data={};
 for(const k of UTM_KEYS){const v=(params.get(k)||'').trim().slice(0,120);if(v)data[k]=v;}
 return {source:data.utm_source||'direct',campaign:data.utm_campaign||'',...data};
}
export function utmSlug(v){
 return String(v??'').trim().toLowerCase().replace(/[^\p{L}\p{N}_.-]+/gu,'_').replace(/^_+|_+$/g,'').slice(0,80);
}
export function buildUtmUrl(base,utm={},filters={}){
 const source=utmSlug(utm.utm_source);
 if(!source)throw new Error('Укажите utm_source — без источника ссылка не создаётся.');
 const u=new URL(base);
 u.search=writeFilters('',{...emptyFilters(),...filters});
 u.searchParams.set('utm_source',source);
 for(const k of UTM_KEYS.slice(1)){const v=utmSlug(utm[k]);if(v)u.searchParams.set(k,v);}
 u.hash='catalog';
 return u.toString();
}

// ---------- manager message draft ----------

const ID_ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function makeDraftId(bytes){return 'GM-'+Array.from(bytes).slice(0,6).map(b=>ID_ALPHABET[b%ID_ALPHABET.length]).join('');}
export function buildDraft({id,items,catalog,attribution={},firstAttribution=null,created=new Date().toISOString()}){
 const lines=validateItems(items,catalog).map(i=>{
  const p=findProduct(catalog,i.id);
  return {id:p.id,name:p.name,variant:p.variant||'',qty:i.qty,price:p.price,currency:CURRENCY,priceDate:isIsoDate(p.priceDate)?p.priceDate:'',sourceUrl:isSourceUrl(p.sourceUrl)?p.sourceUrl:''};
 });
 const total=Math.round(lines.reduce((s,l)=>s+l.price*l.qty,0)*100)/100;
 const utm=Object.fromEntries(UTM_KEYS.filter(k=>attribution[k]).map(k=>[k,attribution[k]]));
 const source=attribution.source||'direct',campaign=attribution.utm_campaign||'';
 const text=[
  'Здравствуйте! Хочу уточнить наличие и актуальную цену.',
  `Подбор: ${id}`,
  ...lines.map((l,n)=>`${n+1}. ${l.name}${l.variant&&!l.name.includes(l.variant)?` (${l.variant})`:''} — ${l.qty} шт. × ${formatUE(l.price)} = ${formatUE(Math.round(l.price*l.qty*100)/100)}${l.priceDate?` · прайс от ${formatDate(l.priceDate)}`:''}`),
  `Итого ориентировочно: ${formatUE(total)} по опубликованному прайсу.`,
  'Цены взяты из публикаций Telegram-канала Goodmark и могут быть неактуальны. Прошу подтвердить наличие и цену.',
  `Метка перехода: ${source}${campaign?' / '+campaign:''}`
 ].join('\n');
 return {id,created,items:lines,total,currency:CURRENCY,utm,source,campaign,firstSource:firstAttribution?.source||'',text};
}

// ---------- browser-local analytics ----------

export function aggregate(events){
 const count=type=>events.filter(e=>e.type===type).length;
 const rows=new Map();
 for(const e of events){
  const source=e.attribution?.source||'direct',campaign=e.attribution?.utm_campaign||'';
  const key=source+'\u0000'+campaign;
  if(!rows.has(key))rows.set(key,{source,campaign,sessions:new Set(),pageViews:0,views:0,adds:0,drafts:0,linkOpens:0});
  const r=rows.get(key);
  if(e.session)r.sessions.add(e.session);
  if(e.type==='page_view')r.pageViews++;
  if(e.type==='product_view')r.views++;
  if(e.type==='add_to_cart')r.adds++;
  if(e.type==='draft_created')r.drafts++;
  if(e.type==='manager_link_opened')r.linkOpens++;
 }
 return {
  sessions:new Set(events.map(e=>e.session).filter(Boolean)).size,
  pageViews:count('page_view'),views:count('product_view'),adds:count('add_to_cart'),
  plans:count('assistant_plan_confirmed'),drafts:count('draft_created'),linkOpens:count('manager_link_opened'),
  sources:[...rows.values()].map(r=>({...r,sessions:r.sessions.size}))
 };
}

// ---------- CSV import / export ----------

export function parsePrice(raw){
 const s=String(raw??'').trim().toLowerCase().replace(/\s*(у\.?\s*е\.?|ue|ye)$/,'').trim();
 // Spaces may only separate groups of three digits; one decimal separator with 1–2 digits.
 if(!/^(\d{1,3}([   ]\d{3})+|\d+)([.,]\d{1,2})?$/.test(s))return null;
 const n=Number(s.replace(/[   ]/g,'').replace(',','.'));
 return Number.isFinite(n)&&n>0&&n<1e9?Math.round(n*100)/100:null;
}
export function parseStock(raw){
 const s=String(raw??'').trim().toLowerCase();
 if(['','null','unknown','?','confirm','уточняется'].includes(s))return null;
 if(/^\d{1,6}$/.test(s))return Number(s);
 throw new Error('остаток');
}
export function splitCSV(text){
 const rows=[];let row=[],field='',quoted=false;
 const firstLine=text.split(/\r?\n/)[0]||'';
 const delimiter=(firstLine.match(/;/g)||[]).length>(firstLine.match(/,/g)||[]).length?';':',';
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
  else if(c===delimiter&&!quoted){row.push(field);field='';}
  else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(x=>x.trim()))rows.push(row);row=[];field='';}
  else field+=c;
 }
 if(quoted)throw new Error('Незакрытая кавычка в CSV.');
 row.push(field);if(row.some(x=>x.trim()))rows.push(row);
 return rows;
}
const HEADER_MAP={id:'id',name:'name',category:'category',brand:'brand',price:'price',currency:'currency',stock:'stock',spec:'spec',pricedate:'priceDate',price_date:'priceDate',sourceurl:'sourceUrl',source_url:'sourceUrl',kind:'kind',connection:'connection',variant:'variant',color:'color',art:'art'};
export const CSV_COLUMNS=['id','name','category','brand','price','currency','stock','priceDate','sourceUrl','kind','connection','variant','spec'];
const UE_ALIASES=['ue','у.е.','у.е','уе','ye','y.e.'];
function parseRow(r,n,ctx){
 const problems=[],at=`Строка ${n}`;
 const id=r.id.trim(),name=r.name.trim(),brand=r.brand.trim(),category=r.category.trim().toLowerCase();
 if(!/^[a-zA-Z0-9_-]{1,64}$/.test(id))problems.push(`${at}: id — латиница, цифры, - и _.`);
 if(!name||name.length>160)problems.push(`${at}: название пустое или длиннее 160 символов.`);
 if(!brand||brand.length>50)problems.push(`${at}: бренд пустой или длиннее 50 символов.`);
 if(!ctx.categoryIds.includes(category)||category==='all')problems.push(`${at}: неизвестная категория «${category}».`);
 const price=parsePrice(r.price);
 if(price===null)problems.push(`${at}: цена «${r.price.trim()}» неоднозначна. Пример: 1290, 1 290 или 12,5.`);
 const currency=r.currency.trim().toLowerCase();
 if(currency&&!UE_ALIASES.includes(currency))problems.push(`${at}: валюта «${r.currency.trim()}» не поддерживается. Пересчёт курсов не выполняется — только у.е.`);
 let stock=null;
 try{stock=parseStock(r.stock);}catch{problems.push(`${at}: остаток — целое число или пусто, если неизвестен.`);}
 const priceDate=r.priceDate.trim();
 if(priceDate&&!isIsoDate(priceDate))problems.push(`${at}: дата прайса в формате ГГГГ-ММ-ДД.`);
 const sourceUrl=r.sourceUrl.trim();
 if(sourceUrl&&!isSourceUrl(sourceUrl))problems.push(`${at}: sourceUrl — только ссылка вида https://t.me/канал/номер.`);
 const connection=r.connection.trim().toLowerCase()||'unknown';
 if(!CONNECTIONS.includes(connection))problems.push(`${at}: connection — wireless, wired или unknown.`);
 const kind=r.kind.trim().toLowerCase();
 if(kind&&!/^[a-z-]{2,30}$/.test(kind))problems.push(`${at}: kind — латиница, например headset.`);
 if(problems.length)return {problems};
 return {product:{
  id,name,category,brand,price,currency:CURRENCY,stock,availability:stock===0?'out':'confirm',
  priceDate,sourceUrl,spec:r.spec.trim().slice(0,200),kind,connection,variant:r.variant.trim().slice(0,40),
  color:/^#[0-9a-f]{6}$/i.test(r.color.trim())?r.color.trim():'#c3cfee',art:/^[a-z]{2,20}$/.test(r.art.trim())?r.art.trim():undefined,
  image:null,demo:false,imported:true
 }};
}
export function parseCSV(text,ctx={}){
 const rows=splitCSV(String(text));
 if(rows.length<2)throw new Error('В CSV нет товаров.');
 const headers=rows.shift().map(x=>HEADER_MAP[x.replace(/^﻿/,'').trim().toLowerCase()]||'');
 const required=['id','name','category','brand','price'];
 if(required.some(x=>!headers.includes(x)))throw new Error('Нужны колонки: '+required.join(', '));
 if(rows.length>1000)throw new Error('Лимит импорта: 1000 товаров.');
 const c={categoryIds:ctx.categoryIds||CATEGORY_IDS},products=[],errors=[],ids=new Set();
 rows.forEach((cells,i)=>{
  const r=Object.fromEntries(Object.values(HEADER_MAP).map(k=>[k,'']));
  headers.forEach((h,j)=>{if(h)r[h]=cells[j]||'';});
  const {product,problems}=parseRow(r,i+2,c);
  if(problems){errors.push(...problems);return;}
  if(ids.has(product.id)){errors.push(`Строка ${i+2}: повтор id «${product.id}».`);return;}
  ids.add(product.id);products.push(product);
 });
 if(errors.length){
  const e=new Error(`Импорт отклонён, ошибок: ${errors.length}.\n`+errors.slice(0,8).join('\n')+(errors.length>8?`\n…и ещё ${errors.length-8}.`:''));
  e.errors=errors;throw e;
 }
 return products;
}
function csvCell(v){const s=String(v??'');return /[;"\n\r,]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}
export function toCSV(products){
 const row=p=>CSV_COLUMNS.map(k=>{
  if(k==='price')return String(p.price).replace('.',',');
  if(k==='stock')return Number.isInteger(p.stock)?p.stock:'';
  if(k==='currency')return CURRENCY;
  return p[k]??'';
 }).map(csvCell).join(';');
 return '﻿'+[CSV_COLUMNS.join(';'),...products.map(row)].join('\r\n');
}
export function csvTemplate(){
 return toCSV([
  {id:'example-1',name:'Пример: точное название модели',category:'audio',brand:'Бренд',price:79,stock:null,priceDate:'2026-09-20',sourceUrl:'https://t.me/channel_name/123',kind:'headset',connection:'wireless',variant:'Black',spec:'Только подтверждённые характеристики'},
  {id:'example-2',name:'Пример: дробная цена',category:'mouse',brand:'Бренд',price:12.5,stock:null,priceDate:'',sourceUrl:'',kind:'mouse',connection:'unknown',variant:'',spec:''}
 ]);
}

// ---------- scripted assistant ----------

const WORD_NUMBERS={один:1,одна:1,одну:1,bitta:1,два:2,две:2,ikkita:2,три:3,uchta:3,четыре:4,tortta:4,пять:5,beshta:5};
export function parseQuantity(text){
 const t=String(text).toLowerCase();
 const m=t.match(/(?:^|[^\d.,])(\d{1,2})\s*(?:x|х|×|шт|ta\b|dona)/)||t.match(/(?:^|\s)(?:x|х|×)\s*(\d{1,2})(?!\d)/);
 let n=m?Number(m[1]):0;
 if(!n)for(const w of normalizeText(t).split(' '))if(WORD_NUMBERS[w]){n=WORD_NUMBERS[w];break;}
 return Math.min(MAX_QTY,Math.max(1,n||1));
}
export function parseBudget(text){
 const t=String(text).toLowerCase().replace(/[  ]/g,' ');
 const unit=t.match(/(\d[\d ]*(?:[.,]\d{1,2})?)\s*(у\.?\s*е\.?|ue\b|ye\b|\$|usd|доллар\w*|dollar\w*|сум\w*|so['‘’ʻ]?m\b)/);
 if(unit){
  if(/^(у|ue|ye)/.test(unit[2]))return {max:parsePrice(unit[1].trim()),unsupportedCurrency:false};
  return {max:null,unsupportedCurrency:true};
 }
 const bare=t.match(/(?:до|не дороже|бюджет|максимум|gacha)\s*(\d[\d ]*(?:[.,]\d{1,2})?)(?!\s*(?:gb|гб|tb|тб|шт|x|х|%|мм|mm|hz|гц|dpi))/);
 return {max:bare?parsePrice(bare[1].trim()):null,unsupportedCurrency:/(\$|usd|доллар|dollar)/.test(t)};
}
const COLOR_WORDS={white:['white','бел','oq'],black:['black','черн','qora'],grey:['grey','gray','сер','kulrang'],pink:['pink','розов','pushti']};
function colorsIn(tokens){return Object.keys(COLOR_WORDS).filter(c=>tokens.some(t=>COLOR_WORDS[c].some(w=>t.startsWith(w))));}
function variantMatches(p,colors){const v=normalizeText(p.variant);return colors.some(c=>v.includes(c)||(c==='grey'&&v.includes('gray')));}
function modelTokens(p){
 const brand=normalizeText(p.brand);
 return normalizeText(p.name).split(' ').filter(w=>w.length>=3&&/\d/.test(w)&&/\p{L}/u.test(w)&&!brand.includes(w)&&!/^\d+(gb|tb|гб|тб|hz|гц|mm|мм|dpi|k)$/.test(w));
}
export function detectModels(text,catalog){
 const tokens=normalizeText(text).split(' '),flat=compact(text);
 const hits=catalog.filter(p=>{
  const model=compact(String(p.name).replace(new RegExp(String(p.brand).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'),''));
  return modelTokens(p).some(w=>tokens.includes(w))||(model.length>=6&&flat.includes(model));
 });
 const colors=colorsIn(tokens);
 return colors.length&&hits.some(p=>variantMatches(p,colors))?hits.filter(p=>variantMatches(p,colors)):hits;
}
export function intentFilters(text,catalog,ctx={}){
 const tokens=normalizeText(text).split(' '),f={};
 for(const token of tokens){const t=synonymTarget(token,ctx.aliases);if(t)for(const [k,v] of Object.entries(t))f[k]??=v;}
 const padded=' '+normalizeText(text)+' ';
 const brand=[...new Set(catalog.map(p=>p.brand))].find(b=>padded.includes(' '+normalizeText(b)+' '));
 if(brand)f.brand=brand;
 if(f.kind&&f.category)delete f.category;
 return f;
}
export function describeFilters(f,categories=[]){
 const category=f.category&&f.category!=='all'&&(categories.find(c=>c[0]===f.category)?.[1]||f.category);
 return [f.connection&&CONNECTION_LABELS[f.connection]?.[0].toLowerCase(),f.brand,f.kind&&(KIND_LABELS[f.kind]?.[0]||f.kind).toLowerCase(),category&&category.toLowerCase(),f.priceMax!=null&&`до ${formatUE(f.priceMax)}`].filter(Boolean).join(' · ');
}
const PRICE_NOTE='Цены — из публикаций Telegram, наличие подтвердит менеджер.';
export function assistantReply(text,catalog,ctx={}){
 const raw=String(text||'').toLowerCase();
 if(!normalizeText(raw))return {type:'help'};
 if(/(очист|удали.*корзин|savatni tozala)/.test(raw))return {type:'clear_cart'};
 const qty=parseQuantity(raw),budget=parseBudget(raw);
 if(/(lexar|лексар|озу|оперативк|памят|\bram\b|\brom\b|\bssd\b|ссд|накопител|xotira|nvme|ddr\d)/.test(raw)){
  const found=catalog.filter(p=>['ram','ssd'].includes(p.category)||/lexar/i.test(p.brand));
  if(!found.length)return {type:'missing',text:'В перенесённом прайсе нет позиций Lexar, оперативной памяти и SSD. Ничего не подставляю — наличие и цену уточните у менеджера.'};
  return {type:'options',qty,products:found.filter(isOrderable).slice(0,3),filters:{category:found[0].category},text:`Нашёл в прайсе позиции памяти/накопителей. Совместимость с вашей платой не проверяю — её подтвердит менеджер. ${PRICE_NOTE}`};
 }
 const models=detectModels(raw,catalog).filter(isOrderable);
 if(models.length){
  const groups=new Map();
  for(const p of models){const k=normalizeText(p.name);groups.set(k,[...(groups.get(k)||[]),p]);}
  if([...groups.values()].every(g=>g.length===1)&&groups.size<=4){
   const items=models.map(p=>({id:p.id,qty:groups.size===1?qty:1}));
   const note=groups.size>1?' Совместимость позиций между собой не проверена — уточните у менеджера.':'';
   return {type:'plan',items:validateItems(items,catalog),text:`Нашёл в прайсе: ${models.map(p=>p.name).join(', ')}.${note} ${PRICE_NOTE}`};
  }
  return {type:'options',qty,products:models.slice(0,6),filters:{q:models[0].name},text:`Есть несколько вариантов этой модели. Выберите нужный цвет или исполнение. ${PRICE_NOTE}`};
 }
 if(/(корзин|savat|\bcart\b)/.test(raw))return {type:'cart'};
 if(/(менедж|manager|menejer|достав|гарант|kafolat|yetkaz|наличи)/.test(raw))return {type:'manager'};
 const filters=intentFilters(raw,catalog,ctx);
 if(budget.max!=null)filters.priceMax=budget.max;
 if(!Object.keys(filters).length)return budget.unsupportedCurrency?{type:'currency'}:{type:'help'};
 const currencyNote=budget.unsupportedCurrency?' Цены в прайсе указаны в у.е.; пересчёт из долларов или сумов не делаю.':'';
 const matches=sortProducts(filterProducts(catalog,{...filters,orderableOnly:true},ctx),'low');
 if(!matches.length){
  const relaxed={...filters};delete relaxed.priceMax;
  const nearest=filters.priceMax!=null?sortProducts(filterProducts(catalog,{...relaxed,orderableOnly:true},ctx),'low').slice(0,3):[];
  return {type:'none',filters,relaxed,products:nearest,text:`По запросу «${describeFilters(filters,ctx.categories)}» в перенесённом прайсе ничего нет.${nearest.length?' Ближайшие варианты без ограничения бюджета:':' Уточните у менеджера.'}${currencyNote}`};
 }
 return {type:'options',qty,products:matches.slice(0,3),filters,total:matches.length,text:`Подходит позиций: ${matches.length} (${describeFilters(filters,ctx.categories)}). Показываю ${Math.min(3,matches.length)} самых доступных. ${PRICE_NOTE}${currencyNote}`};
}
