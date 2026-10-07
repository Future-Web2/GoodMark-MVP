import {UTM_KEYS,readFilters,writeFilters} from './core.js';

export const PAGE_FILES=Object.freeze({
 home:'index.html',catalog:'catalog.html',mouse:'category-mouse.html',
 keyboard:'category-keyboard.html',audio:'category-audio.html',
 product:'product.html',cart:'cart.html',assistant:'assistant.html',
 business:'business.html',telegram:'telegram.html',contacts:'contacts.html',
 favorites:'favorites.html'
});

export function pageFromPath(pathname){
 const filename=String(pathname??'').split('/').pop();
 return Object.keys(PAGE_FILES).find(page=>PAGE_FILES[page]===filename)||'home';
}

function parameterValue(value){
 if(value==null)return '';
 if(typeof value==='string')return value.trim()?value:'';
 if(typeof value==='number')return Number.isFinite(value)?String(value):'';
 if(typeof value==='boolean')return String(value);
 return null;
}

// Only the fixed page map controls the path. Queries from another page cannot
// accidentally carry a stale product or filter into the new destination.
export function createPageUrl(page,{currentUrl='https://example.test/index.html',params={},attribution={}}={}){
 if(!Object.hasOwn(PAGE_FILES,page)){
  const error=new Error(`unknownpage: ${String(page)}`);
  error.code='unknownpage';
  throw error;
 }
 const current=new URL(currentUrl),target=new URL(PAGE_FILES[page],current);
 for(const key of UTM_KEYS){
  const explicit=parameterValue(current.searchParams.get(key));
  const fallback=parameterValue(attribution?.[key])||parameterValue(attribution?.[key.slice(4)]);
  const value=explicit||fallback;
  // readAttribution() uses "direct" for an unattributed visit. It is not a
  // campaign, but an explicitly supplied utm_source=direct is preserved.
  if(value&&!(key==='utm_source'&&!explicit&&value==='direct'))target.searchParams.set(key,value);
 }
 for(const [key,value] of Object.entries(params??{})){
  const text=parameterValue(value);
  if(text===null)continue;
  if(text)target.searchParams.set(key,text);
  else target.searchParams.delete(key);
 }
 return '/'+target.pathname.replace(/^\/+/, '')+target.search+target.hash;
}

// Accept UI min/max names and the core priceMin/priceMax names, then use the
// existing filter parser/writer so links and the catalog share validation.
export function catalogUrl(filters={},options={}){
 const supplied=new URLSearchParams();
 const values={
  q:filters?.q,category:filters?.category,brand:filters?.brand,
  kind:filters?.kind,connection:filters?.connection,
  price_min:filters?.min??filters?.priceMin,
  price_max:filters?.max??filters?.priceMax
 };
 for(const [key,value] of Object.entries(values)){
  const text=parameterValue(value);
  if(text)supplied.set(key,text);
 }
 const params=Object.fromEntries(new URLSearchParams(writeFilters('',readFilters(supplied.toString()))));
 return createPageUrl('catalog',{...options,params});
}
