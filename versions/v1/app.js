import * as catalogData from './catalog.js';
import {icon,art} from './art.js';
import {
 CURRENCY_LABEL,MAX_QTY,MANAGER_URL,KIND_LABELS,CONNECTION_LABELS,
 formatAmount,formatUE,formatDate,isSourceUrl,findProduct,isOrderable,maxQty,validateItems,cartTotal,
 filterProducts,sortProducts,emptyFilters,readFilters,writeFilters,setSearchParam,activeFilterCount,
 readAttribution,utmSlug,buildUtmUrl,makeDraftId,buildDraft,aggregate,parseCSV,toCSV,csvTemplate,assistantReply
} from './core.js';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ---------- catalogue & storage ----------

const baseProducts=(Array.isArray(catalogData.products)?catalogData.products:[]).filter(p=>p&&typeof p.id==='string'&&typeof p.name==='string'&&Number.isFinite(p.price));
const categories=Array.isArray(catalogData.categories)?catalogData.categories:[['all','Все товары','Barcha tovarlar','grid']];
const aliases=catalogData.categoryAliases||{};
const categoryIds=categories.map(c=>c[0]);
// Schema 2 = real Telegram price list. Schema 1 data (demo fixtures, demo orders, events) must not leak into it.
const SCHEMA='2';
const LEGACY_KEYS=['gm-catalog','gm-cart','gm-favorites','gm-events','gm-orders','gm-first-attribution'];
const KEY={catalog:'gm2-catalog',cart:'gm2-cart',favorites:'gm2-favorites',events:'gm2-events',drafts:'gm2-drafts',first:'gm2-first-attribution',lang:'gm-lang'};
const store={
 read(k,f){try{return JSON.parse(localStorage.getItem(k))??f;}catch{return f;}},
 write(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{toast('Память браузера недоступна.');}}
};
function migrateStorage(){
 try{
  if(localStorage.getItem('gm-schema')===SCHEMA)return;
  LEGACY_KEYS.forEach(k=>localStorage.removeItem(k));
  sessionStorage.removeItem('gm-attribution');
  localStorage.setItem('gm-schema',SCHEMA);
 }catch{}
}
migrateStorage();

function loadCatalog(){
 const saved=store.read(KEY.catalog,null);
 const valid=Array.isArray(saved)&&saved.length&&saved.every(p=>p&&typeof p.id==='string'&&typeof p.name==='string'&&Number.isFinite(p.price)&&p.imported);
 return valid?saved:baseProducts;
}
function sanitizeCart(list){
 if(!Array.isArray(list))return [];
 return list.flatMap(i=>{
  const p=findProduct(catalog,i?.id);
  if(!p||!isOrderable(p)||!Number.isInteger(i.qty)||i.qty<1)return [];
  return [{id:p.id,qty:Math.min(i.qty,maxQty(p))}];
 });
}
let catalog=loadCatalog();
const isImported=()=>catalog!==baseProducts;
let cart=sanitizeCart(store.read(KEY.cart,[]));
let favorites=(Array.isArray(store.read(KEY.favorites,[]))?store.read(KEY.favorites,[]):[]).filter(id=>findProduct(catalog,id));
let events=Array.isArray(store.read(KEY.events,[]))?store.read(KEY.events,[]):[];
let lang=store.read(KEY.lang,'ru')==='uz'?'uz':'ru';
let filters={...readFilters(location.search,{categoryIds}),favoritesOnly:false};
let sort='featured',pending=null,busy=false,backend=false,cartMode='items',currentDraft=null,openProductId=null;
const filterSets=new Map();let filterSetSerial=0;
const ctx=()=>({categories,aliases,favorites,categoryIds});

// ---------- session & attribution ----------

let session;
try{session=sessionStorage.getItem('gm-session')||crypto.randomUUID();sessionStorage.setItem('gm-session',session);}catch{session=crypto.randomUUID();}
function initAttribution(){
 const fromUrl=readAttribution(location.search);
 let current=fromUrl;
 try{
  if(!fromUrl.utm_source){const saved=JSON.parse(sessionStorage.getItem('gm-attribution')||'null');if(saved?.source)current=saved;}
  sessionStorage.setItem('gm-attribution',JSON.stringify(current));
 }catch{}
 return current;
}
const attribution=initAttribution();
const firstAttribution=store.read(KEY.first,null)||attribution;
store.write(KEY.first,firstAttribution);
function track(type,data={}){
 events.push({id:crypto.randomUUID(),time:new Date().toISOString(),session,type,attribution:{...attribution},...data});
 events=events.slice(-2000);store.write(KEY.events,events);
}

// ---------- i18n & labels ----------

const L=(ru,uz)=>lang==='uz'?uz:ru;
const tr={
 topNote:['Цены из Telegram · наличие уточняется','Narxlar Telegramdan · mavjudligi aniqlanadi'],
 catalog:['Каталог','Katalog'],favorites:['Избранное','Saralangan'],cart:['Корзина','Savat'],manager:['Менеджер','Menejer'],
 navMouse:['Мыши','Sichqonchalar'],navKeyboard:['Клавиатуры','Klaviaturalar'],navHeadset:['Наушники','Quloqchinlar'],navMic:['Микрофоны','Mikrofonlar'],
 insights:['Бизнес-демо','Biznes demo'],
 heroTitle:['Собери свой<br><em>сетап.</em>','O‘z setapingizni<br><em>yig‘ing.</em>'],
 heroText:['Мыши, клавиатуры, звук и аксессуары из прайса Goodmark.<br>Цены — из Telegram, наличие подтвердит менеджер.','Goodmark narxnomasidagi sichqoncha, klaviatura, audio va aksessuarlar.<br>Narxlar Telegramdan, mavjudligini menejer tasdiqlaydi.'],
 explore:['Смотреть каталог','Katalogni ko‘rish'],
 heroLabel:['СОБЕРИ СВОЙ СЕТАП<small>Иллюстрация, не фото товара</small>','SETAPINGIZNI YIG‘ING<small>Illyustratsiya, tovar fotosurati emas</small>'],
 aiTitle:['Скажи, что нужно.<br><span>Я найду.</span>','Nima kerakligini ayting.<br><span>Men topaman.</span>'],
 aiText:['Подберу модели из прайса по задаче,<br>бренду и бюджету в у.е.','Narxnomadan vazifa, brend va<br>y.e.dagi byudjet bo‘yicha tanlayman.'],
 tryAi:['Попробовать AI-подбор','AI yordamida tanlash'],aiDisclosure:['Сценарный помощник · без внешнего AI','Ssenariyli yordamchi · tashqi AI’siz'],
 service1:['Онлайн → Малика B8','Onlayn → Malika B8'],service1sub:['Выбери здесь, обсуди в магазине','Bu yerda tanlang, do‘konda maslahatlashing'],
 service2:['Умный подбор','Aqlli tanlov'],service2sub:['По задаче, бренду и бюджету','Vazifa, brend va byudjet bo‘yicha'],
 service3:['Цены из Telegram','Narxlar Telegramdan'],service3sub:['Дата прайса в каждой карточке','Har bir kartochkada narx sanasi'],
 categoryTitle:['Что в твоём следующем сетапе?','Keyingi setapingizda nima bo‘ladi?'],
 filters:['Фильтры','Filtrlar'],sortLabel:['Сортировка','Saralash'],fCategory:['Категория','Toifa'],fBrand:['Бренд','Brend'],fKind:['Тип','Tur'],
 fConnection:['Подключение','Ulanish'],fPrice:['Цена, у.е.','Narx, y.e.'],reset:['Сбросить','Tozalash'],
 emptyTitle:['Пока ничего не нашли','Hech narsa topilmadi'],emptyText:['Попробуй другую модель, бренд или сними часть фильтров.','Boshqa model yoki brendni sinab ko‘ring yoki filtrlarni kamaytiring.'],
 resetFilters:['Сбросить фильтры','Filtrlarni tozalash'],
 catalogDisclosure:['Цены — из публикаций Telegram-канала Goodmark, в у.е.; дата и ссылка на публикацию — в карточке товара. Наличие на сайте не отслеживается и подтверждается менеджером. Изображения — иллюстрации, а не фотографии товаров.','Narxlar Goodmark Telegram kanalidagi e’lonlardan olingan, y.e.da; sana va e’lon havolasi tovar kartochkasida. Mavjudlik saytda kuzatilmaydi va menejer tomonidan tasdiqlanadi. Rasmlar — illyustratsiya, tovar fotosurati emas.'],
 usecaseTitle:['Не знаешь модель?<br>Начни с задачи.','Modelni bilmaysizmi?<br>Vazifadan boshlang.'],
 usecaseText:['«Нужен микрофон для видео», «беспроводная мышь до 50 у.е.» —<br>помощник отфильтрует прайс за тебя.','«Video uchun mikrofon», «50 y.e. gacha simsiz sichqoncha» —<br>yordamchi narxnomani siz uchun saralaydi.'],
 askAi:['Спросить Goodmark AI','Goodmark AI’dan so‘rash'],
 tgTitle:['Goodmark теперь ещё ближе.','Goodmark endi yanada yaqin.'],tgText:['Каталог, подбор и связь с магазином — в знакомом Telegram.','Katalog, tanlov va do‘kon bilan aloqa — Telegramda.'],
 tgButton:['Посмотреть бот-демо','Bot demosini ko‘rish'],yourCart:['Твоя корзина','Savatingiz'],
 cartNote:['Цены из Telegram-прайса в у.е. · наличие уточняется','Narxlar Telegram narxnomasidan, y.e. · mavjudligi aniqlanadi']
};
const kindLabel=k=>KIND_LABELS[k]?.[lang==='uz'?1:0]||k||'';
const connectionLabel=c=>CONNECTION_LABELS[c]?.[lang==='uz'?1:0]||'';
const categoryLabel=id=>{const c=categories.find(c=>c[0]===id);return c?c[lang==='uz'?2:1]:id;};
const money=n=>`${formatAmount(n)} <small>${CURRENCY_LABEL}</small>`;
const cartCount=()=>cart.reduce((s,i)=>s+i.qty,0);
function availabilityLabel(p){
 if(p.stock===0)return L('Нет в наличии','Mavjud emas');
 if(Number.isInteger(p.stock))return L(`Остаток по CSV: ${p.stock}`,`CSV qoldiq: ${p.stock}`);
 return L('Наличие уточняется','Mavjudligi aniqlanadi');
}
function translate(){
 $$('[data-i18n]').forEach(el=>{const t=tr[el.dataset.i18n];if(t)el.innerHTML=t[lang==='uz'?1:0];});
 document.documentElement.lang=lang;
 $('#lang-toggle').innerHTML=lang==='uz'?'UZ <span> / RU</span>':'RU <span> / UZ</span>';
 $('#search-input').placeholder=L('Модель, бренд или «наушники»','Model, brend yoki «quloqchin»');
 renderStorefront();
}

// ---------- illustrations ----------

const ART_TYPES=new Set(['ram','ssd','mouse','keyboard','audio','headphones','mic','arm','webcam','monitor','pc']);
const KIND_ART={headset:'headphones',microphone:'mic',arm:'arm',webcam:'webcam',mouse:'mouse',keyboard:'keyboard'};
function artFor(p){
 const type=[p.art,KIND_ART[p.kind],p.category].find(t=>ART_TYPES.has(t));
 if(type)return art(type,p.color||'#c3cfee');
 const c=categories.find(c=>c[0]===p.category);
 return `<div class="art-fallback">${icon(c?.[3]||'grid',56)}</div>`;
}

// ---------- UI helpers ----------

let toastTimer;
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500);}
function show(id){
 if($('#'+id).open)return;
 document.querySelectorAll('dialog[open]').forEach(d=>d.close());
 $('#'+id).showModal();document.body.style.overflow='hidden';
}
function close(id){$('#'+id).close();}
$$('dialog').forEach(d=>{
 d.addEventListener('close',()=>{
  if(d.id==='product-dialog'){openProductId=null;setUrlParam('product','');}
  if(!document.querySelector('dialog[open]'))document.body.style.overflow='';
 });
 d.addEventListener('click',e=>{
  if(e.target!==d)return;
  const r=d.getBoundingClientRect();
  if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close(d.id);
 });
});
function replaceSearch(search){history.replaceState(null,'',location.pathname+search+location.hash);}
function setUrlParam(key,value){replaceSearch(setSearchParam(location.search,key,value));}
function syncFiltersToUrl(){replaceSearch(writeFilters(location.search,filters));}
function downloadFile(content,name,type){
 const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');
 a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
// Copies via the async clipboard API; falls back to selecting a visible field (dialogs make outside nodes inert).
async function copyText(text,field){
 try{await navigator.clipboard.writeText(text);return true;}catch{}
 try{
  let el=field,temp=false;
  if(!el){el=document.createElement('textarea');el.value=text;el.style.cssText='position:fixed;left:-9999px';(document.querySelector('dialog[open]')||document.body).append(el);temp=true;}
  el.focus();el.select();const ok=document.execCommand('copy');if(temp)el.remove();return ok;
 }catch{return false;}
}
function managerLink(from,label=L('Написать менеджеру ↗','Menejerga yozish ↗')){
 return `<a class="button button-outline" href="${MANAGER_URL}" target="_blank" rel="noopener noreferrer" data-manager-link="${esc(from)}">${esc(label)}</a>`;
}

// ---------- storefront ----------

function categoryCounts(){const counts={};for(const p of catalog)counts[p.category]=(counts[p.category]||0)+1;return counts;}
function renderHero(){
 $('#hero-count').textContent=catalog.length?L(`${catalog.length} позиций из Telegram-прайса Goodmark`,`Goodmark Telegram narxnomasidan ${catalog.length} ta pozitsiya`):L('Каталог пуст','Katalog bo‘sh');
}
function renderCategories(){
 const counts=categoryCounts(),list=categories.filter(c=>c[0]!=='all');
 const visible=list.filter(c=>counts[c[0]]),hidden=list.filter(c=>!counts[c[0]]);
 $('#categories').innerHTML=visible.map(([id,,,iconName])=>`<button class="category-card ${filters.category===id?'active':''}" data-category="${esc(id)}" aria-pressed="${filters.category===id}">${ART_TYPES.has(iconName)?art(iconName):icon(iconName||'grid',46)}<span>${esc(categoryLabel(id))}</span><small>${counts[id]} ${L('поз.','ta')} ↗</small></button>`).join('');
 const note=$('#category-note');
 note.hidden=!hidden.length;
 note.textContent=hidden.length?L(`Нет в перенесённом прайсе: ${hidden.map(c=>c[1]).join(', ')}. О таких товарах спросите менеджера.`,`Narxnomada yo‘q: ${hidden.map(c=>c[2]).join(', ')}. Bu tovarlar haqida menejerdan so‘rang.`):'';
}
function renderNavLinks(){
 $$('.header-links [data-category]').forEach(a=>{a.hidden=!filterProducts(catalog,{category:a.dataset.category,kind:a.dataset.kind||''}).length;});
}
function selectOptions(values,selected,allLabel,label=v=>v){
 return `<option value="">${esc(allLabel)}</option>`+values.map(v=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(label(v))}</option>`).join('');
}
function renderFilterControls(){
 const counts=categoryCounts();
 $('#f-category').innerHTML=`<option value="all">${esc(L('Все категории','Barcha toifalar'))}</option>`+categories.filter(c=>c[0]!=='all'&&counts[c[0]]).map(c=>`<option value="${esc(c[0])}" ${filters.category===c[0]?'selected':''}>${esc(categoryLabel(c[0]))} (${counts[c[0]]})</option>`).join('');
 const brands=[...new Set(catalog.map(p=>p.brand))].sort((a,b)=>a.localeCompare(b));
 $('#f-brand').innerHTML=selectOptions(brands,brands.find(b=>b.toLowerCase()===filters.brand.toLowerCase())||'',L('Все бренды','Barcha brendlar'));
 const kinds=[...new Set(catalog.map(p=>p.kind).filter(Boolean))].sort();
 $('#f-kind').innerHTML=selectOptions(kinds,filters.kind,L('Любой тип','Har qanday tur'),kindLabel);
 $('#f-connection').innerHTML=selectOptions(['wireless','wired'],filters.connection,L('Любое','Har qanday'),connectionLabel);
 if(document.activeElement!==$('#f-price-min'))$('#f-price-min').value=filters.priceMin??'';
 if(document.activeElement!==$('#f-price-max'))$('#f-price-max').value=filters.priceMax??'';
 if(document.activeElement!==$('#search-input'))$('#search-input').value=filters.q;
 const n=activeFilterCount(filters)+(filters.favoritesOnly?1:0);
 $('#filter-count').hidden=!n;$('#filter-count').textContent=n;
}
function catalogTitle(){
 if(filters.favoritesOnly)return L('Твоё избранное','Saralanganlar');
 if(filters.kind)return kindLabel(filters.kind);
 if(filters.category!=='all')return categoryLabel(filters.category);
 return L('Каталог по прайсу','Narxnoma bo‘yicha katalog');
}
function renderActiveFilters(){
 const parts=[
  filters.category!=='all'&&categoryLabel(filters.category),filters.brand,filters.kind&&kindLabel(filters.kind),
  filters.connection&&connectionLabel(filters.connection),
  filters.priceMin!=null&&`${L('от','dan')} ${formatUE(filters.priceMin)}`,filters.priceMax!=null&&`${L('до','gacha')} ${formatUE(filters.priceMax)}`,
  filters.q&&`«${filters.q}»`,filters.favoritesOnly&&L('Избранное','Saralangan')
 ].filter(Boolean);
 $('#active-filters').innerHTML=parts.length?`<div class="active-filters"><span>${esc(parts.join(' · '))}</span><button data-reset>${esc(L('Сбросить','Tozalash'))}</button></div>`:'';
}
function qtyControl(p,qty,cls='quantity'){
 return `<div class="${cls}"><button data-qty="${esc(p.id)}" data-delta="-1" aria-label="${esc(L('Уменьшить количество','Kamaytirish'))}">${icon('minus')}</button><span>${qty}</span><button data-qty="${esc(p.id)}" data-delta="1" ${qty>=maxQty(p)?'disabled':''} aria-label="${esc(L('Увеличить количество','Ko‘paytirish'))}">${icon('plus')}</button></div>`;
}
function addButton(p,cls='add-button'){
 return `<button class="${cls}" data-add="${esc(p.id)}" ${isOrderable(p)?'':'disabled'}>${icon('cart',16)}<span>${esc(L('В корзину','Savatga'))}</span></button>`;
}
function card(p){
 const inCart=cart.find(i=>i.id===p.id),fav=favorites.includes(p.id);
 const chips=[p.variant,p.connection&&p.connection!=='unknown'&&connectionLabel(p.connection)].filter(Boolean);
 return `<article class="product-card">
  <div class="product-image" role="button" tabindex="0" data-product="${esc(p.id)}" aria-label="${esc(L('Открыть','Ochish')+': '+p.name)}">
   ${p.kind?`<span class="product-tag">${esc(kindLabel(p.kind))}</span>`:''}
   <button class="favorite ${fav?'selected':''}" data-favorite="${esc(p.id)}" aria-label="${esc(L('В избранное','Saralanganlarga')+': '+p.name)}" aria-pressed="${fav}">${icon('heart')}</button>
   ${artFor(p)}<span class="illustration-note">${esc(L('Иллюстрация','Illyustratsiya'))}</span>
  </div>
  <div class="product-brand">${esc(p.brand)}</div>
  <button class="product-name" data-product="${esc(p.id)}">${esc(p.name)}</button>
  ${p.spec?`<p class="product-spec">${esc(p.spec)}</p>`:''}
  ${chips.length?`<div class="product-chips">${chips.map(c=>`<span>${esc(c)}</span>`).join('')}</div>`:''}
  <div class="product-bottom"><div class="price">${money(p.price)}</div><span class="availability ${isOrderable(p)?'':'out'}"><i></i>${esc(availabilityLabel(p))}</span></div>
  <div class="card-action">${inCart?qtyControl(p,inCart.qty,'card-qty'):addButton(p)}</div>
 </article>`;
}
function renderProducts(){
 const list=sortProducts(filterProducts(catalog,filters,ctx()),sort);
 $('#products').innerHTML=list.map(card).join('');
 $('#result-count').textContent=`${list.length} ${L('товаров','tovar')}`;
 $('#empty-state').hidden=!!list.length;
 $('#catalog-title').textContent=catalogTitle();
 renderActiveFilters();
}
function renderStorefront(){renderHero();renderCategories();renderNavLinks();renderFilterControls();renderProducts();}
function applyFilters(next){
 filters={...filters,...next};
 syncFiltersToUrl();renderCategories();renderFilterControls();renderProducts();
}
function resetFilters(){
 filters={...emptyFilters(),favoritesOnly:false};
 syncFiltersToUrl();renderCategories();renderFilterControls();renderProducts();
}
function goCatalog(){
 if(location.hash!=='#catalog'){location.hash='catalog';route();}
 requestAnimationFrame(()=>$('#catalog').scrollIntoView({behavior:'smooth',block:'start'}));
}

// ---------- product modal ----------

function renderProductDetail(id){
 const p=findProduct(catalog,id);if(!p)return;
 const inCart=cart.find(i=>i.id===p.id),fav=favorites.includes(p.id),src=isSourceUrl(p.sourceUrl)?p.sourceUrl:'';
 const rows=[[L('Бренд','Brend'),p.brand],[L('Вариант','Variant'),p.variant],[L('Тип','Tur'),p.kind&&kindLabel(p.kind)],
  [L('Подключение','Ulanish'),p.connection&&p.connection!=='unknown'&&connectionLabel(p.connection)],[L('Категория','Toifa'),categoryLabel(p.category)],
  [L('Наличие','Mavjudlik'),availabilityLabel(p)]].filter(r=>r[1]);
 const date=formatDate(p.priceDate);
 const source=src
  ?`${date?L(`Цена из публикации от ${date}`,`${date} sanadagi e’londagi narx`):L('Цена из публикации','E’londagi narx')} · <a href="${esc(src)}" target="_blank" rel="noopener noreferrer">${esc(L('Открыть публикацию ↗','E’lonni ochish ↗'))}</a>`
  :esc(date?L(`Цена из прайса от ${date}. Ссылка на публикацию не указана.`,`${date} sanadagi narx. E’lon havolasi ko‘rsatilmagan.`):L('Источник цены не указан.','Narx manbasi ko‘rsatilmagan.'));
 $('#product-detail').innerHTML=`<div class="detail-grid">
  <div class="detail-art">${artFor(p)}<span class="illustration-note">${esc(L('Иллюстрация, не фото товара','Illyustratsiya, tovar fotosurati emas'))}</span></div>
  <div class="detail-info">
   <span class="eyebrow">${esc(p.brand)} / GOODMARK</span><h2>${esc(p.name)}</h2>${p.spec?`<p>${esc(p.spec)}</p>`:''}
   <dl class="detail-table">${rows.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
   <div class="price">${money(p.price)}</div><p class="price-source">${source}</p>
   <div class="detail-actions">${inCart?qtyControl(p,inCart.qty,'card-qty detail-qty'):addButton(p,'button button-dark')}</div>
   <button class="button button-outline" data-detail-ai="${esc(p.id)}">${esc(L('Спросить помощника','Yordamchidan so‘rash'))} ${icon('spark',16)}</button>
   <div class="detail-links"><button data-favorite="${esc(p.id)}" aria-pressed="${fav}">${icon('heart',15)} ${esc(fav?L('В избранном','Saralanganda'):L('В избранное','Saralanganlarga'))}</button><button data-copy-product="${esc(p.id)}">${icon('arrow',15)} ${esc(L('Ссылка на товар','Tovar havolasi'))}</button></div>
   <p class="demo-note">${esc(L('Цена — в у.е. по опубликованному прайсу, без пересчёта в другие валюты. Наличие, комплектацию, гарантию и актуальную цену подтвердит менеджер магазина.','Narx — e’lon qilingan narxnoma bo‘yicha y.e.da, boshqa valyutaga o‘tkazilmagan. Mavjudlik, komplekt, kafolat va joriy narxni do‘kon menejeri tasdiqlaydi.'))}</p>
  </div></div>`;
}
function openProduct(id){
 if(!findProduct(catalog,id)){toast(L('Товар не найден в текущем каталоге.','Tovar joriy katalogda topilmadi.'));setUrlParam('product','');return;}
 track('product_view',{product:id});
 openProductId=id;renderProductDetail(id);show('product-dialog');setUrlParam('product',id);
}

// ---------- cart ----------

function updateCart(){
 store.write(KEY.cart,cart);
 $$('.cart-count').forEach(el=>{el.textContent=cartCount();});
 cartMode='items';renderCart();renderProducts();
 if(openProductId&&$('#product-dialog').open)renderProductDetail(openProductId);
}
function add(items,from='catalog'){
 try{
  const additions=validateItems(items,catalog);
  cart=validateItems([...cart,...additions],catalog);updateCart();
  for(const i of additions)track('add_to_cart',{product:i.id,qty:i.qty,from});
  toast(L('Добавлено в корзину','Savatga qo‘shildi'));return true;
 }catch(e){toast(e.message);return false;}
}
function changeQty(id,delta){
 const p=findProduct(catalog,id),item=cart.find(i=>i.id===id);if(!p||!item)return;
 const next=item.qty+delta;
 if(next>maxQty(p)){toast(Number.isInteger(p.stock)?L(`В импортированном остатке ${p.stock} шт.`,`Import qoldig‘i: ${p.stock} dona.`):L(`Не больше ${MAX_QTY} шт. в одной позиции — это ограничение формы, а не остаток.`,`Bir pozitsiyada ${MAX_QTY} donadan ko‘p emas — bu forma cheklovi, qoldiq emas.`));return;}
 cart=next<1?cart.filter(i=>i.id!==id):cart.map(i=>i.id===id?{...i,qty:next}:i);updateCart();
}
function cartItem(i){
 const p=findProduct(catalog,i.id);
 return `<div class="cart-item"><div class="cart-item-art">${artFor(p)}</div><div class="cart-item-info">
  <h3>${esc(p.name)}</h3><small>${esc([p.variant,availabilityLabel(p)].filter(Boolean).join(' · '))}</small>
  <div class="price">${money(Math.round(p.price*i.qty*100)/100)}</div><small>${esc(`${i.qty} × ${formatUE(p.price)}${p.priceDate?` · ${L('прайс','narx')} ${formatDate(p.priceDate)}`:''}`)}</small>
  <div class="quantity-row">${qtyControl(p,i.qty)}<button class="remove-item" data-remove="${esc(p.id)}">${esc(L('Удалить','O‘chirish'))}</button></div>
  ${i.qty>=MAX_QTY?`<small class="qty-note">${esc(L(`Максимум ${MAX_QTY} шт. — ограничение формы, не остаток.`,`Ko‘pi bilan ${MAX_QTY} dona — forma cheklovi.`))}</small>`:''}
 </div></div>`;
}
function renderCart(){
 if(cartMode==='draft'&&currentDraft)return renderDraft();
 $('#cart-body').innerHTML=cart.length?cart.map(cartItem).join(''):`<div class="empty-state">${icon('cart',42)}<h3>${esc(L('Здесь будет твой сетап','Bu yerda setapingiz bo‘ladi'))}</h3><p>${esc(L('Добавь товары или попроси помощника подобрать.','Tovar qo‘shing yoki yordamchidan so‘rang.'))}</p><button class="button button-dark" data-cart-ai>${esc(L('Подобрать с Goodmark AI','Goodmark AI bilan tanlash'))}</button></div>`;
 $('#cart-summary').innerHTML=cart.length?`<div class="summary-line"><span>${cartCount()} ${esc(L('шт. · ориентировочно','dona · taxminan'))}</span><strong>${money(cartTotal(cart,catalog))}</strong></div>
  <button class="button button-dark" id="prepare-draft">${esc(L('Подготовить сообщение менеджеру','Menejerga xabar tayyorlash'))} ${icon('arrow',17)}</button>
  <p>${esc(L('Сумма — по опубликованному прайсу в у.е. Наличие и актуальную цену подтвердит менеджер. Сайт ничего не отправляет сам.','Summa — e’lon qilingan narxnoma bo‘yicha y.e.da. Mavjudlik va narxni menejer tasdiqlaydi. Sayt o‘zi hech narsa yubormaydi.'))}</p>`:'';
}
function openCart(){cartMode='items';renderCart();show('cart-dialog');track('cart_view');}

// ---------- manager message draft ----------

function saveDraft(draft){
 const drafts=store.read(KEY.drafts,[]);
 store.write(KEY.drafts,[...(Array.isArray(drafts)?drafts:[]),draft].slice(-50));
}
function prepareDraft(){
 try{
  const draft=buildDraft({id:makeDraftId(crypto.getRandomValues(new Uint8Array(6))),items:cart,catalog,attribution,firstAttribution});
  saveDraft(draft);
  track('draft_created',{draft:draft.id,lines:draft.items.length,qty:draft.items.reduce((s,l)=>s+l.qty,0)});
  currentDraft=draft;cartMode='draft';renderCart();
 }catch(e){toast(e.message);}
}
function renderDraft(){
 const d=currentDraft;
 $('#cart-body').innerHTML=`<div class="draft">
  <div class="draft-head"><strong>${esc(d.id)}</strong><span>${esc(L('Черновик · не отправлен','Qoralama · yuborilmagan'))}</span></div>
  <label for="draft-text" class="draft-label">${esc(L('Текст сообщения менеджеру','Menejerga xabar matni'))}</label>
  <textarea id="draft-text" class="draft-text" readonly rows="12">${esc(d.text)}</textarea>
  <p class="draft-warning">${esc(L('Сайт не отправляет сообщение. Кнопка ниже копирует текст и открывает чат менеджера в Telegram — вставьте текст и отправьте сами. Цены — по опубликованному прайсу и могут измениться.','Sayt xabar yubormaydi. Quyidagi tugma matnni nusxalaydi va Telegramda menejer chatini ochadi — matnni qo‘yib, o‘zingiz yuboring. Narxlar o‘zgarishi mumkin.'))}</p>
  <div id="copy-status" class="copy-status" role="status" hidden></div>
 </div>`;
 $('#cart-summary').innerHTML=`<a class="button button-dark" href="${MANAGER_URL}" target="_blank" rel="noopener noreferrer" data-open-manager="${esc(d.id)}">${icon('telegram',17)} ${esc(L('Скопировать и открыть Telegram','Nusxalash va Telegramni ochish'))}</a>
  <div class="draft-actions"><button class="button button-outline" data-copy-draft>${esc(L('Только скопировать','Faqat nusxalash'))}</button><button class="button button-outline" data-download-draft="${esc(d.id)}">${icon('download',15)} .txt</button></div>
  <button class="button button-outline" data-back-to-cart>${esc(L('← Вернуться к корзине','← Savatga qaytish'))}</button>`;
}
async function copyDraft(){
 const ok=await copyText(currentDraft.text,$('#draft-text'));
 const status=$('#copy-status');if(!status)return ok;
 status.hidden=false;status.classList.toggle('failed',!ok);
 status.textContent=ok
  ?L('Текст скопирован. Вставьте его в чат менеджера и отправьте сами. Если Telegram не открылся, откройте t.me/goodmarkuzmalika вручную.','Matn nusxalandi. Uni menejer chatiga qo‘yib, o‘zingiz yuboring. Telegram ochilmasa, t.me/goodmarkuzmalika manzilini qo‘lda oching.')
  :L('Браузер не разрешил автоматическое копирование. Выделите текст в поле выше и скопируйте вручную (Ctrl+C или долгое нажатие).','Brauzer avtomatik nusxalashga ruxsat bermadi. Yuqoridagi matnni belgilab, qo‘lda nusxalang.');
 return ok;
}
function findDraft(id){const drafts=store.read(KEY.drafts,[]);return (Array.isArray(drafts)?drafts:[]).find(d=>d.id===id)||(currentDraft?.id===id?currentDraft:null);}

// ---------- assistant ----------

function message(t,role='bot',html=''){
 const el=document.createElement('div');el.className='message '+role;
 el.innerHTML=(role==='bot'?'<span class="message-label">GOODMARK AI</span>':'')+`<span>${esc(t)}</span>`+html;
 $('#chat-messages').append(el);$('#chat-messages').scrollTop=$('#chat-messages').scrollHeight;
 if(t)transcript.push({role:role==='bot'?'assistant':'user',content:t});
 return el;
}
const transcript=[];
const HERO_PROMPT='Нужны беспроводные наушники Logitech до 120 у.е.';
function openAI(prompt){
 show('assistant-dialog');track('assistant_open');
 if(!$('#chat-messages').children.length)message('Привет! Я сценарный помощник Goodmark: ищу по прайсу модели, бренды, тип и бюджет в у.е. Например: «беспроводные наушники Logitech до 120 у.е.» или «Fifine TAM8 и BM88». В корзину добавляю только после твоего подтверждения.');
 if(prompt)sendChat(prompt);else $('#chat-input').focus();
}
function filterButton(f,label=L('Показать в каталоге','Katalogda ko‘rsatish')){
 const key=String(++filterSetSerial);filterSets.set(key,f);
 return `<button class="button button-outline" data-ai-filters="${key}">${esc(label)}</button>`;
}
function optionList(products,qty){
 return products.map(p=>`<div class="plan-item">${artFor(p)}<div><strong>${esc(p.name)}</strong><small>${esc([p.variant,p.connection!=='unknown'&&connectionLabel(p.connection)].filter(Boolean).join(' · '))}<br>${esc(formatUE(p.price))}${p.priceDate?` · прайс ${esc(formatDate(p.priceDate))}`:''}</small><div class="option-row"><button class="option-button" data-product="${esc(p.id)}">Открыть</button><button class="option-button" data-plan-id="${esc(p.id)}" data-plan-qty="${qty}">Предложить ${qty} шт.</button></div></div></div>`).join('');
}
function showPlan(items,text){
 try{
  items=validateItems(items,catalog);
  $$('[data-confirm-plan]').forEach(b=>{b.disabled=true;});
  pending={items};
  message(text||'Проверь подбор перед добавлением.','bot',items.map(i=>{const p=findProduct(catalog,i.id);return `<div class="plan-item">${artFor(p)}<div><strong>${esc(p.name)} · ${i.qty} шт.</strong><small>${esc(formatUE(p.price))} × ${i.qty} = ${esc(formatUE(Math.round(p.price*i.qty*100)/100))}</small></div></div>`;}).join('')
   +`<div class="plan-total"><span>Итого ориентировочно</span><span>${esc(formatUE(cartTotal(items,catalog)))}</span></div><button class="button button-dark" data-confirm-plan>Добавить в корзину ${icon('cart',15)}</button><div class="option-row"><button class="option-button" data-cancel-plan>Не добавлять</button></div>`);
 }catch(e){pending=null;message(e.message);}
}
function scriptChat(text){
 const r=assistantReply(text,catalog,ctx());
 if(r.type==='clear_cart')return message(cart.length?'Очистить всю корзину?':'Корзина и так пуста.','bot',cart.length?'<button class="button button-outline" data-clear-cart>Да, очистить</button>':'');
 if(r.type==='cart')return message(cart.length?`В корзине ${cartCount()} шт. — ориентировочно ${formatUE(cartTotal(cart,catalog))} по прайсу.`:'Корзина пока пуста. Напиши, что подобрать.','bot','<button class="button button-outline" data-open-cart>Открыть корзину</button>');
 if(r.type==='manager')return message('Наличие, гарантию и доставку на сайте не обещаю — их подтверждает менеджер Goodmark.','bot',managerLink('assistant'));
 if(r.type==='missing')return message(r.text,'bot',managerLink('assistant')+'<button class="button button-outline" data-ai-catalog>Открыть каталог</button>');
 if(r.type==='plan')return showPlan(r.items,r.text);
 if(r.type==='options')return message(r.text,'bot',optionList(r.products,r.qty)+(r.filters?filterButton(r.filters,r.total>3?`Все ${r.total} в каталоге`:undefined):''));
 if(r.type==='none')return message(r.text,'bot',(r.products.length?optionList(r.products,1)+filterButton(r.relaxed,'Без ограничения бюджета'):'')+managerLink('assistant'));
 if(r.type==='currency')return message('Цены в прайсе указаны в у.е. Пересчёт из долларов или сумов без подтверждённого курса не делаю. Напиши бюджет в у.е., например «до 50 у.е.».');
 message('Я сценарный помощник: понимаю модели из прайса, бренды, тип («наушники», «микрофон», «мышь», «клавиатура»), подключение, количество («2x», «две») и бюджет в у.е. Попробуй один из примеров ниже.');
}
async function liveChat(t){
 busy=true;$('#chat-form button').disabled=true;const waiting=message('Подбираю товары…');
 try{
  const r=await fetch('/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:t,history:transcript.slice(-9,-1)})});
  const d=await r.json();if(!r.ok)throw Error(d.error||'AI недоступен');
  waiting.remove();
  if(d.items?.length)showPlan(d.items,d.text);else message(d.text||'Уточни задачу.');
  if(d.page==='cart')openCart();
  if(d.page==='product'&&d.product)openProduct(d.product);
  if(d.page==='catalog'){close('assistant-dialog');applyFilters({...emptyFilters(),...d.filters,category:d.category||'all'});goCatalog();}
 }catch{waiting.remove();message('Живой AI недоступен. Отвечаю по сценарию.');scriptChat(t);}
 finally{busy=false;$('#chat-form button').disabled=false;}
}
function sendChat(input){
 if(busy)return;const t=String(input).trim().slice(0,1500);if(!t)return;
 $('#chat-input').value='';message(t,'user');track('assistant_message');
 if(backend&&!isImported())liveChat(t);else scriptChat(t);
}

// ---------- Telegram bot prototype ----------

function botMessage(t,html=''){const e=document.createElement('div');e.className='bot-message';e.innerHTML=esc(t)+html;$('#bot-body').append(e);$('#bot-body').scrollTop=$('#bot-body').scrollHeight;}
function openBot(){
 show('bot-dialog');
 if(!$('#bot-body').children.length)botMessage('Привет! Это прототип Goodmark Bot. Каталог, подбор и связь с менеджером. Цены — из Telegram-прайса в у.е., наличие уточняется.');
 track('bot_demo_open');
}
function botAction(a){
 const counts=categoryCounts();
 if(a==='catalog')botMessage('Выбери категорию. Каталог откроется на сайте.','<div class="option-row">'+categories.filter(c=>c[0]!=='all'&&counts[c[0]]).map(c=>`<button class="option-button" data-bot-category="${esc(c[0])}">${esc(c[1])} · ${counts[c[0]]}</button>`).join('')+'</div>');
 if(a==='ai'){close('bot-dialog');openAI(HERO_PROMPT);}
 if(a==='cart')botMessage(cart.length?`Корзина: ${cartCount()} шт., ориентировочно ${formatUE(cartTotal(cart,catalog))}.`:'Корзина пока пуста.','<button class="button button-outline" data-bot-cart>Открыть корзину</button>');
 if(a==='manager')botMessage('Магазин Малика B8 · +998 99 888 77 87. Наличие и цену подтверждает менеджер.',`<a href="${MANAGER_URL}" target="_blank" rel="noopener noreferrer" data-manager-link="bot_demo">Написать менеджеру ↗</a>`);
}

// ---------- business demo ----------

const labels={page_view:'Загрузка страницы',product_view:'Карточка товара',add_to_cart:'Добавление в корзину',cart_view:'Просмотр корзины',assistant_open:'Открытие помощника',assistant_message:'Сообщение помощнику',assistant_plan_confirmed:'Подбор подтверждён',draft_created:'Черновик сообщения',manager_link_opened:'Нажатие ссылки менеджера',catalog_search:'Поиск',bot_demo_open:'Бот-демо',catalog_import:'Импорт CSV'};
function utmPresets(){
 const groups=new Map();
 for(const p of catalog)if(p.kind){const k=p.brand+'|'+p.kind;groups.set(k,(groups.get(k)||0)+1);}
 return [...groups].sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k,n])=>{const [brand,kind]=k.split('|');return {brand,kind,n,campaign:utmSlug(`${brand}_${kind}`)};});
}
function insightText(a){
 return (a.drafts?`Черновиков сообщений: ${a.drafts}, нажатий ссылки менеджера: ${a.linkOpens}. Это действия в одном браузере, а не покупки и не подтверждённые контакты. `:'Черновиков пока нет. Проверь путь: карточка → корзина → сообщение менеджеру. ')
  +'Для оценки рекламы нужны серверные данные по всем посетителям, подтверждённые менеджером заказы и рекламные расходы.';
}
function metric(title,value,note){return `<div class="metric"><small>${esc(title)}</small><strong>${value}</strong><p>${esc(note)}</p></div>`;}
function renderInsights(){
 const saved=store.read(KEY.drafts,[]),drafts=(Array.isArray(saved)?saved:[]).slice(-8).reverse();
 const a=aggregate(events),presets=utmPresets();
 const funnel=[['Загрузки страниц',a.pageViews],['Карточки',a.views],['Добавления',a.adds],['Черновики',a.drafts],['Ссылка менеджера',a.linkOpens]];
 const top=Math.max(1,...funnel.map(f=>f[1]));
 const brands=[...new Set(catalog.map(p=>p.brand))].sort((x,y)=>x.localeCompare(y)),kinds=[...new Set(catalog.map(p=>p.kind).filter(Boolean))].sort(),counts=categoryCounts();
 $('#insights-view').innerHTML=`<div class="insights-top"><div><span class="eyebrow">GOODMARK / BUSINESS DEMO</span><h1>Путь от рекламы до сообщения менеджеру.</h1><p>Источник и кампания сохраняются с каждым действием в этом браузере.</p></div><a href="#home" class="button button-outline">Вернуться в магазин ${icon('arrow',16)}</a></div>
 <div class="local-notice">Презентационная панель: только действия в этом браузере (${events.length} событий). Черновики и нажатия ссылки менеджера — не покупки, не контакты и не выручка. Общая статистика по всем посетителям требует серверного учёта и авторизации.</div>
 <div class="metrics">
  ${metric('Сессии браузера',a.sessions,'Уникальные session_id этой вкладки/браузера')}
  ${metric('Загрузки страниц',a.pageViews,'Каждое открытие или перезагрузка')}
  ${metric('Просмотры карточек',a.views,'События, не уникальные люди')}
  ${metric('Добавления в корзину',a.adds,'События добавления позиций')}
  ${metric('Подборы помощника',a.plans,'Подтверждённые покупателем предложения')}
  ${metric('Черновики сообщений',a.drafts,'Подготовлены, но сайтом не отправлены')}
  ${metric('Нажатия ссылки менеджера',a.linkOpens,'Открытие Telegram, не факт контакта')}
 </div>
 <div class="analytics-grid">
  <div class="panel"><h3>Источники и кампании</h3><p>utm_source и utm_campaign текущей сессии сопровождают каждое событие. Первый источник хранится отдельно.</p>
   <div class="table-scroll"><table class="source-table"><thead><tr><th>Источник</th><th>Кампания</th><th>Сессии</th><th>Загрузки</th><th>Карточки</th><th>Корзина</th><th>Черновики</th><th>Менеджер</th></tr></thead><tbody>${a.sources.map(s=>`<tr><td><span class="source-pill">${esc(s.source)}</span></td><td>${esc(s.campaign||'—')}</td><td>${s.sessions}</td><td>${s.pageViews}</td><td>${s.views}</td><td>${s.adds}</td><td>${s.drafts}</td><td>${s.linkOpens}</td></tr>`).join('')}</tbody></table></div>
   <div class="insight-card"><strong>✧ ОБЗОР · СЦЕНАРНЫЙ ТЕКСТ</strong><p>${esc(insightText(a))}</p></div>
  </div>
  <div class="panel"><h3>Шаги к сообщению менеджеру</h3><p>Количество событий на каждом шаге. Это не когортная конверсия.</p>
   <div class="funnel">${funnel.map(([name,n])=>`<div class="funnel-row"><span>${name}</span><div class="funnel-bar"><span style="width:${Math.round(n/top*100)}%"></span></div><strong>${n}</strong></div>`).join('')}</div>
   <div class="admin-status">Текущая сессия: <strong>${esc(attribution.source)}${attribution.utm_campaign?' / '+esc(attribution.utm_campaign):''}</strong><br>Первый источник: <strong>${esc(firstAttribution.source)}${firstAttribution.utm_campaign?' / '+esc(firstAttribution.utm_campaign):''}</strong></div>
   <div class="admin-tools"><button class="button button-outline" id="export-events">${icon('download',15)} Экспорт JSON</button><button class="button button-outline" id="refresh-insights">Обновить</button><button class="button button-outline" id="clear-events">Очистить события</button></div>
  </div>
 </div>
 <div class="analytics-bottom">
  <div class="panel"><h3>Ссылка для рекламы</h3><p>utm_source обязателен. Ссылка открывает нужную выдачу каталога; метки сохраняются при фильтрах и открытии товаров.</p>
   ${presets.length?`<div class="preset-row">${presets.map((p,i)=>`<button type="button" class="chip" data-utm-preset="${i}">${esc(p.brand)} · ${esc(kindLabel(p.kind))} (${p.n})</button>`).join('')}</div>`:''}
   <form id="utm-form" novalidate><div class="utm-form">
    <div class="field"><label for="utm-source">utm_source *</label><input id="utm-source" required maxlength="80" placeholder="например, instagram" autocomplete="off"></div>
    <div class="field"><label for="utm-medium">utm_medium</label><input id="utm-medium" maxlength="80" placeholder="reels, stories, bio"></div>
    <div class="field"><label for="utm-campaign">utm_campaign</label><input id="utm-campaign" maxlength="80"></div>
    <div class="field"><label for="utm-content">utm_content</label><input id="utm-content" maxlength="80" placeholder="video_01"></div>
    <div class="field"><label for="utm-term">utm_term</label><input id="utm-term" maxlength="80"></div>
    <div class="field"><label for="land-category">Категория выдачи</label><select id="land-category"><option value="all">Весь каталог</option>${categories.filter(c=>c[0]!=='all'&&counts[c[0]]).map(c=>`<option value="${esc(c[0])}">${esc(c[1])}</option>`).join('')}</select></div>
    <div class="field"><label for="land-brand">Бренд</label><select id="land-brand">${selectOptions(brands,'','Любой')}</select></div>
    <div class="field"><label for="land-kind">Тип</label><select id="land-kind">${selectOptions(kinds,'','Любой',kindLabel)}</select></div>
   </div><div class="admin-tools"><button class="button button-dark" type="submit">Создать ссылку ${icon('arrow',15)}</button></div></form>
   <div id="utm-result" class="utm-result" hidden></div>
  </div>
  <div class="panel"><h3>Каталог: CSV в этом браузере</h3><p>Excel → «CSV UTF-8». Цена — число в у.е. (1290, 1 290 или 12,5); пустой остаток = «уточняется». Импорт меняет каталог только в этом браузере и не синхронизируется с магазином.</p>
   <div class="admin-tools"><button class="button button-dark" id="import-button">${icon('upload',15)} Импорт CSV</button><button class="button button-outline" id="download-template">${icon('download',15)} Шаблон</button><button class="button button-outline" id="export-catalog">${icon('download',15)} Экспорт каталога</button>${isImported()?'<button class="button button-outline" id="restore-catalog">Вернуть каталог Goodmark</button>':''}</div>
   <input id="csv-file" type="file" accept=".csv,text/csv" hidden>
   <div id="import-status" class="admin-status import-status">Сейчас ${catalog.length} товаров. ${isImported()?'Источник: импорт CSV в этом браузере.':'Источник: прайс из публикаций Telegram (catalog.js).'}</div>
   <h3 class="panel-subtitle">Подготовленные сообщения</h3>
   <div class="activity-list">${drafts.length?drafts.map(d=>`<div class="activity-row"><span>${esc(d.id)} · ${esc(formatUE(d.total))}</span><span>${esc(d.source)}${d.campaign?' / '+esc(d.campaign):''}</span><button class="link-button" data-download-draft="${esc(d.id)}">.txt</button></div>`).join(''):'<div class="activity-row"><span>Пока нет черновиков.</span></div>'}</div>
   <h3 class="panel-subtitle">Последние события</h3>
   <div class="activity-list">${events.slice(-6).reverse().map(e=>`<div class="activity-row"><span>${esc(labels[e.type]||e.type)}</span><span>${esc(e.attribution?.source||'direct')}</span><small>${new Date(e.time).toLocaleTimeString('ru-RU',{timeZone:'Asia/Tashkent',hour:'2-digit',minute:'2-digit'})}</small></div>`).join('')}</div>
  </div>
 </div>`;
 attachAnalysis();
}
function attachAnalysis(){
 const panel=$('.insight-card');if(!panel||!backend||panel.querySelector('[data-live-analysis]'))return;
 const button=document.createElement('button');button.className='button button-lime';button.dataset.liveAnalysis='true';button.textContent='Спросить AI об этих данных';panel.append(button);
 button.addEventListener('click',async()=>{
  button.disabled=true;button.textContent='Анализирую…';
  try{
   const r=await fetch('/api/insights',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({summary:aggregate(events)})});
   const data=await r.json();if(!r.ok)throw Error('AI unavailable');
   panel.querySelector('strong').textContent='AI INSIGHTS · ЖИВОЙ API';panel.querySelector('p').textContent=data.text;
  }catch{toast('AI-анализ сейчас недоступен. Сценарный обзор сохранён.');}
  finally{button.disabled=false;button.textContent='Спросить AI об этих данных';}
 });
}
function createUtmLink(){
 try{
  const utm=Object.fromEntries(['source','medium','campaign','content','term'].map(k=>['utm_'+k,$('#utm-'+k).value]));
  const landing={category:$('#land-category').value,brand:$('#land-brand').value,kind:$('#land-kind').value};
  const url=buildUtmUrl(location.origin+location.pathname,utm,landing);
  const n=filterProducts(catalog,landing,ctx()).length;
  $('#utm-result').hidden=false;
  $('#utm-result').innerHTML=`<span id="utm-link">${esc(url)}</span><p class="${n?'':'warn'}">Выдача по ссылке: ${n} товаров${n?'':' — ссылка откроет пустой каталог, измените выдачу.'}</p><div class="admin-tools"><button class="button button-outline" id="copy-utm" type="button">Скопировать</button><a class="button button-outline" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Проверить переход ↗</a></div>`;
 }catch(e){$('#utm-result').hidden=false;$('#utm-result').innerHTML=`<p class="warn">${esc(e.message)}</p>`;$('#utm-source').focus();}
}
async function importCSV(file){
 if(file.size>1024*1024){toast('CSV должен быть меньше 1 МБ.');return;}
 try{
  const next=parseCSV(await file.text(),{categoryIds});
  catalog=next;store.write(KEY.catalog,catalog);
  cart=[];favorites=[];store.write(KEY.favorites,favorites);updateCart();
  track('catalog_import',{count:next.length});resetFilters();renderStorefront();renderInsights();
  toast(`Импортировано ${next.length} товаров в этом браузере. Корзина очищена.`);
 }catch(err){$('#import-status').textContent=err.message;toast('Импорт отклонён — подробности в панели.');}
}
function restoreCatalog(){
 catalog=baseProducts;store.write(KEY.catalog,null);
 cart=sanitizeCart(cart);favorites=favorites.filter(id=>findProduct(catalog,id));store.write(KEY.favorites,favorites);
 updateCart();resetFilters();renderStorefront();renderInsights();toast('Каталог Goodmark восстановлен.');
}

// ---------- routing ----------

function route(){
 const dashboard=location.hash.startsWith('#insights');
 $('#shop-view').hidden=dashboard;$('#insights-view').hidden=!dashboard;
 if(dashboard){renderInsights();window.scrollTo({top:0,behavior:'instant'});return;}
 if(location.hash.startsWith('#product/'))openProduct(decodeURIComponent(location.hash.slice(9)));
 else if(location.hash==='#home')window.scrollTo({top:0,behavior:'smooth'});
}

// ---------- events ----------

function toggleFavorite(id){
 favorites=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];
 store.write(KEY.favorites,favorites);renderProducts();
 if(openProductId===id&&$('#product-dialog').open)renderProductDetail(id);
}
const clickActions=[
 ['data-close',b=>close(b.dataset.close)],
 ['data-favorite',(b,e)=>{e.stopPropagation();toggleFavorite(b.dataset.favorite);}],
 ['data-add',b=>add([{id:b.dataset.add,qty:1}])],
 ['data-qty',b=>changeQty(b.dataset.qty,Number(b.dataset.delta))],
 ['data-remove',b=>{cart=cart.filter(i=>i.id!==b.dataset.remove);updateCart();}],
 ['data-category',(b,e)=>{e.preventDefault();applyFilters({category:b.dataset.category,kind:b.dataset.kind||'',favoritesOnly:false});goCatalog();}],
 ['data-reset',()=>resetFilters()],
 ['data-product',b=>openProduct(b.dataset.product)],
 ['data-prompt',b=>openAI(b.dataset.prompt)],
 ['data-detail-ai',b=>{const p=findProduct(catalog,b.dataset.detailAi);close('product-dialog');openAI(`Помоги выбрать ${p?.name||''}`);}],
 ['data-copy-product',async b=>{const u=new URL(location.href);u.search=setSearchParam(u.search,'product',b.dataset.copyProduct);u.hash='';toast(await copyText(u.toString())?'Ссылка скопирована':'Копирование недоступно');}],
 ['data-plan-id',b=>showPlan([{id:b.dataset.planId,qty:Number(b.dataset.planQty)||1}],'Проверь позицию и количество.')],
 ['data-confirm-plan',b=>{
  if(!pending?.items){toast('Подбор уже завершён. Запроси новый.');return;}
  if(add(pending.items,'assistant')){pending=null;b.disabled=true;b.textContent='Добавлено ✓';track('assistant_plan_confirmed');message('Добавил. Проверь количество в корзине.','bot','<button class="button button-dark" data-open-cart>Показать корзину</button>');}
 }],
 ['data-cancel-plan',()=>{pending=null;$$('[data-confirm-plan]').forEach(x=>{x.disabled=true;});message('Хорошо, ничего не добавляю. Уточни модель, тип или бюджет.');}],
 ['data-ai-filters',b=>{const f=filterSets.get(b.dataset.aiFilters);if(!f)return;close('assistant-dialog');applyFilters({...emptyFilters(),favoritesOnly:false,...f});goCatalog();}],
 ['data-open-cart',()=>openCart()],
 ['data-ai-catalog',()=>{close('assistant-dialog');goCatalog();}],
 ['data-clear-cart',b=>{cart=[];updateCart();message('Корзина очищена.');b.disabled=true;}],
 ['data-cart-ai',()=>{close('cart-dialog');openAI();}],
 ['data-back-to-cart',()=>{cartMode='items';renderCart();}],
 ['data-copy-draft',()=>copyDraft()],
 ['data-download-draft',b=>{const d=findDraft(b.dataset.downloadDraft);if(d)downloadFile(d.text,`${d.id}.txt`,'text/plain;charset=utf-8');}],
 // Real anchor: the browser opens Telegram from the user's click; we only copy text and record the click.
 ['data-open-manager',b=>{copyDraft();track('manager_link_opened',{from:'draft',draft:b.dataset.openManager});}],
 ['data-manager-link',b=>track('manager_link_opened',{from:b.dataset.managerLink})],
 ['data-bot',b=>botAction(b.dataset.bot)],
 ['data-bot-category',b=>{close('bot-dialog');applyFilters({...emptyFilters(),category:b.dataset.botCategory,favoritesOnly:false});goCatalog();}],
 ['data-bot-cart',()=>{close('bot-dialog');openCart();}],
 ['data-utm-preset',b=>{const p=utmPresets()[Number(b.dataset.utmPreset)];if(!p)return;$('#land-category').value='all';$('#land-brand').value=p.brand;$('#land-kind').value=p.kind;$('#utm-campaign').value=p.campaign;$('#utm-source').focus();}]
];
const idActions={
 'catalog-nav':()=>{resetFilters();goCatalog();},
 'm-catalog':()=>goCatalog(),
 'cart-nav':openCart,'m-cart':openCart,
 'favorite-nav':()=>{filters.favoritesOnly=true;renderFilterControls();renderProducts();goCatalog();},
 'hero-ai-button':()=>openAI(HERO_PROMPT),
 'usecase-ai':()=>openAI(),'floating-ai':()=>openAI(),'footer-ai':()=>openAI(),'m-ai':()=>openAI(),
 'bot-nav':openBot,'bot-preview':openBot,'footer-bot':openBot,
 'lang-toggle':()=>{lang=lang==='ru'?'uz':'ru';store.write(KEY.lang,lang);translate();},
 'filters-toggle':b=>{const open=!$('#filter-panel').classList.contains('open');$('#filter-panel').classList.toggle('open',open);b.setAttribute('aria-expanded',open);},
 'prepare-draft':prepareDraft,
 'copy-utm':async()=>toast(await copyText($('#utm-link').textContent)?'Скопировано':'Копирование недоступно — выделите ссылку вручную'),
 'export-events':()=>downloadFile(JSON.stringify({scope:'this browser only',events,drafts:store.read(KEY.drafts,[]),firstAttribution},null,2),'goodmark-local-analytics.json','application/json'),
 'refresh-insights':renderInsights,
 'clear-events':()=>{if(!confirm('Удалить локальные события и черновики этого браузера?'))return;events=[];store.write(KEY.events,events);store.write(KEY.drafts,[]);renderInsights();},
 'import-button':()=>$('#csv-file').click(),
 'download-template':()=>downloadFile(csvTemplate(),'goodmark-catalog-template.csv','text/csv;charset=utf-8'),
 'export-catalog':()=>downloadFile(toCSV(catalog),'goodmark-catalog.csv','text/csv;charset=utf-8'),
 'restore-catalog':restoreCatalog
};
document.addEventListener('click',e=>{
 const b=e.target.closest('button,a,[data-product]');if(!b)return;
 for(const [attr,fn] of clickActions)if(b.hasAttribute(attr)){fn(b,e);return;}
 if(idActions[b.id])idActions[b.id](b);
});
document.addEventListener('keydown',e=>{
 if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)&&!document.querySelector('dialog[open]')){e.preventDefault();$('#search-input').focus();}
 if((e.key==='Enter'||e.key===' ')&&e.target.matches('.product-image')){e.preventDefault();openProduct(e.target.dataset.product);}
});
let searchTimer,priceTimer;
$('#search-form').addEventListener('submit',e=>{e.preventDefault();clearTimeout(searchTimer);applyFilters({q:$('#search-input').value.trim().slice(0,80)});track('catalog_search',{q:filters.q});goCatalog();});
$('#search-input').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{applyFilters({q:$('#search-input').value.trim().slice(0,80)});if(!$('#insights-view').hidden)goCatalog();},200);});
$('#sort').addEventListener('change',()=>{sort=$('#sort').value;renderProducts();});
$('#f-category').addEventListener('change',e=>applyFilters({category:e.target.value||'all'}));
$('#f-brand').addEventListener('change',e=>applyFilters({brand:e.target.value}));
$('#f-kind').addEventListener('change',e=>applyFilters({kind:e.target.value}));
$('#f-connection').addEventListener('change',e=>applyFilters({connection:e.target.value}));
function readPrice(input){const v=input.value.trim();if(!v)return null;const n=Number(v);return Number.isFinite(n)&&n>=0?n:null;}
for(const id of ['f-price-min','f-price-max'])$('#'+id).addEventListener('input',()=>{clearTimeout(priceTimer);priceTimer=setTimeout(()=>applyFilters({priceMin:readPrice($('#f-price-min')),priceMax:readPrice($('#f-price-max'))}),300);});
$('#filter-panel').addEventListener('submit',e=>e.preventDefault());
$('#chat-form').addEventListener('submit',e=>{e.preventDefault();sendChat($('#chat-input').value);});
document.addEventListener('submit',e=>{if(e.target.id==='utm-form'){e.preventDefault();createUtmLink();}});
document.addEventListener('change',e=>{if(e.target.id==='csv-file'&&e.target.files[0]){importCSV(e.target.files[0]);e.target.value='';}});
window.addEventListener('hashchange',route);

// ---------- start ----------

$$('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon);});
$('#hero-device').innerHTML=art('headphones','#9eafff',true);
$('#mini-one').innerHTML=art('headphones','#c2c9f7');$('#mini-two').innerHTML=art('headphones','#b9c4ef');
track('page_view',{page:location.hash||'#home'});
translate();updateCart();route();
const productParam=new URLSearchParams(location.search).get('product');
if(productParam&&!location.hash.startsWith('#insights'))openProduct(productParam);
fetch('/api/config').then(r=>r.ok?r.json():null).then(d=>{if(d?.aiEnabled){backend=true;$('#assistant-mode').textContent='AI-консультант · живой API';}}).catch(()=>{});
