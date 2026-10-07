import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {PAGE_FILES} from '../dist/navigation.js';

const distUrl=new URL('../dist/',import.meta.url);
const distPath=fileURLToPath(distUrl);
const documents=await Promise.all(Object.entries(PAGE_FILES).map(async([page,file])=>({
 page,file,url:new URL(file,distUrl),html:await readFile(new URL(file,distUrl),'utf8')
})));
const attributes=source=>Object.fromEntries([...source.matchAll(/\b([\w-]+)\s*=\s*["']([^"']*)["']/g)].map(match=>[match[1],match[2]]));
const elements=html=>[...html.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*)>/gi)].map(match=>({tag:match[1].toLowerCase(),attrs:attributes(match[2])}));

// These controls are accessed by the shared runtime on every page, including
// pages whose storefront shell is hidden. Removing one breaks page startup.
const sharedIds=[
 'shop-view','insights-view','hero-count','hero-device','mini-one','mini-two',
 'brand-list','categories','category-note','catalog','catalog-title','result-count',
 'products','empty-state','active-filters','search-form','search-input','sort',
 'f-category','f-brand','f-kind','f-connection','f-price-min','f-price-max',
 'filter-count','filter-panel','lang-toggle','cart-body','cart-summary','cart-dialog',
 'product-dialog','product-detail','assistant-dialog','assistant-mode','chat-form',
 'chat-input','chat-messages','bot-dialog','bot-body','toast'
];

test('All twelve navigation destinations have generated documents and the matching page identity',async()=>{
 assert.equal(documents.length,12);
 const files=(await readdir(distUrl)).filter(file=>file.endsWith('.html')).sort();
 assert.deepEqual(files,Object.values(PAGE_FILES).sort());
 for(const {page,file,html} of documents){
  const tags=elements(html),body=tags.find(el=>el.tag==='body');
  assert.equal(body?.attrs['data-page'],page,`${file}: wrong runtime page identity`);
  const boot=tags.filter(el=>el.tag==='script'&&el.attrs.type==='module'&&el.attrs.src==='app.js');
  assert.equal(boot.length,1,`${file}: shared application must boot exactly once`);
  if(['mouse','keyboard','audio'].includes(page))assert.equal(body.attrs['data-category'],page,`${file}: category default missing`);
 }
});

test('Every page has each required shared control once, with no duplicate element IDs',()=>{
 for(const {file,html} of documents){
  const counts=new Map();
  for(const el of elements(html))if(el.attrs.id)counts.set(el.attrs.id,(counts.get(el.attrs.id)||0)+1);
  for(const id of sharedIds)assert.equal(counts.get(id),1,`${file}: #${id} must exist exactly once`);
  for(const [id,count] of counts)assert.equal(count,1,`${file}: duplicate #${id} creates ambiguous selectors`);
 }
});

test('All normal internal href and src references resolve to files inside the generated site',async()=>{
 for(const {file,url,html} of documents){
  const references=new Set(elements(html).flatMap(el=>[el.attrs.href,el.attrs.src]).filter(Boolean));
  for(const reference of references){
   if(reference.startsWith('#')||/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(reference))continue;
   const destination=new URL(reference.replace(/&amp;/g,'&'),url);
   destination.search='';destination.hash='';
   const filename=fileURLToPath(destination),relative=path.relative(distPath,filename);
   assert.ok(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative),`${file}: ${reference} leaves the generated site`);
   let info;
   try{info=await stat(destination);}catch{assert.fail(`${file}: missing local target ${reference}`);}
   assert.ok(info.isFile(),`${file}: ${reference} must resolve to a file`);
  }
 }
});

test('Product, cart, assistant and Telegram pages expose their primary content as document sections',()=>{
 const primary={product:'product-dialog',cart:'cart-dialog',assistant:'assistant-dialog',telegram:'bot-dialog'};
 for(const {page,file,html} of documents){
  const tags=elements(html);
  for(const [owner,id] of Object.entries(primary)){
   const node=tags.find(el=>el.attrs.id===id);
   assert.equal(node?.tag,page===owner?'section':'dialog',`${file}: #${id} has the wrong document/modal semantics`);
  }
  if(page!=='home'){
   for(const id of ['page-title','breadcrumb-current','page-description'])assert.equal(tags.filter(el=>el.attrs.id===id).length,1,`${file}: missing page navigation context #${id}`);
  }
 }
});

test('Generated links use real page navigation instead of legacy home/catalog/business hashes',()=>{
 const legacyHashes=new Set(['#home','#catalog','#insights']);
 for(const {file,url,html} of documents){
  for(const el of elements(html)){
   if(!el.attrs.href)continue;
   const href=new URL(el.attrs.href.replace(/&amp;/g,'&'),url);
   assert.ok(!legacyHashes.has(href.hash),`${file}: legacy navigation ${el.attrs.href}`);
   if(el.attrs['data-page-link']){
    const destination=el.attrs['data-page-link'];
    assert.ok(Object.hasOwn(PAGE_FILES,destination),`${file}: unknown linked page ${destination}`);
    assert.equal(href.protocol,'file:',`${file}: page link ${destination} must stay inside the site`);
    assert.equal(path.basename(fileURLToPath(href)),PAGE_FILES[destination],`${file}: page link ${destination} points to the wrong document`);
   }
  }
 }
});
