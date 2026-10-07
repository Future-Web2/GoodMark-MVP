import test from 'node:test';
import assert from 'node:assert/strict';
import {PAGE_FILES,pageFromPath,createPageUrl,catalogUrl} from '../dist/navigation.js';
import {readAttribution,readFilters} from '../dist/core.js';

const absolute=path=>new URL(path,'https://example.test');

test('Every page is recognized beneath a deployment directory; unknown paths open home',()=>{
 for(const [page,file] of Object.entries(PAGE_FILES))assert.equal(pageFromPath(`/demo/goodmark/${file}`),page);
 for(const path of ['/', '/demo/goodmark/', '/demo/unknown.html',undefined])assert.equal(pageFromPath(path),'home');
 assert.ok(Object.isFrozen(PAGE_FILES));
});

test('Page navigation stays in the current directory and discards stale query and hash',()=>{
 const path=createPageUrl('cart',{currentUrl:'https://shop.test/demo/goodmark/product.html?product=old&q=old#catalog'});
 assert.equal(path,'/demo/goodmark/cart.html');
 assert.equal(createPageUrl('assistant',{currentUrl:'https://shop.test/demo/goodmark/'}),'/demo/goodmark/assistant.html');
 assert.equal(createPageUrl('cart',{currentUrl:'https://shop.test//shop.test/demo/index.html'}),'/shop.test/demo/cart.html');
});

test('Unknown or external page names cannot navigate',()=>{
 for(const page of ['missing','https://evil.test','../cart.html','__proto__','constructor']){
  assert.throws(()=>createPageUrl(page),{code:'unknownpage'});
 }
});

test('All five campaign keys survive navigation; current campaign values take precedence',()=>{
 const url=absolute(createPageUrl('product',{
  currentUrl:'https://shop.test/demo/catalog.html?utm_source=telegram&utm_medium=post&utm_campaign=audio&utm_content=video&utm_term=mic&q=stale',
  attribution:{source:'instagram',medium:'story',campaign:'old',content:'old',term:'old'},params:{product:'fifine-tam8'}
 }));
 assert.equal(url.pathname,'/demo/product.html');
 assert.deepEqual(Object.fromEntries(url.searchParams),{
  utm_source:'telegram',utm_medium:'post',utm_campaign:'audio',utm_content:'video',utm_term:'mic',product:'fifine-tam8'
 });
});

test('Missing UTM values fall back to both friendly and core attribution fields',()=>{
 const friendly=absolute(createPageUrl('contacts',{attribution:{source:'instagram',medium:'story',campaign:'launch',content:'hero',term:'keyboard'}}));
 assert.deepEqual(Object.fromEntries(friendly.searchParams),{
  utm_source:'instagram',utm_medium:'story',utm_campaign:'launch',utm_content:'hero',utm_term:'keyboard'
 });
 const core=readAttribution('?utm_source=telegram&utm_medium=channel&utm_campaign=launch&utm_content=post&utm_term=audio');
 assert.deepEqual(Object.fromEntries(absolute(createPageUrl('catalog',{attribution:core})).searchParams),{
  utm_source:'telegram',utm_medium:'channel',utm_campaign:'launch',utm_content:'post',utm_term:'audio'
 });
 assert.equal(createPageUrl('catalog',{attribution:readAttribution('')}),'/catalog.html');
 assert.equal(absolute(createPageUrl('catalog',{currentUrl:'https://example.test/?utm_source=direct'})).searchParams.get('utm_source'),'direct');
});

test('Explicit parameters encode Unicode deeplinks, override campaigns and remove blank values',()=>{
 const id='товар / + ? # & 01';
 const path=createPageUrl('product',{
  currentUrl:'https://shop.test/store/catalog.html?utm_source=telegram&utm_term=old',
  params:{product:id,q:'беспроводная мышь',utm_source:'instagram',utm_term:'',unused:'   ',qty:0,available:false}
 });
 const url=absolute(path);
 assert.equal(url.pathname,'/store/product.html');
 assert.equal(url.hash,'');
 assert.equal(url.searchParams.get('product'),id);
 assert.equal(url.searchParams.get('q'),'беспроводная мышь');
 assert.equal(url.searchParams.get('utm_source'),'instagram');
 assert.equal(url.searchParams.has('utm_term'),false);
 assert.equal(url.searchParams.has('unused'),false);
 assert.equal(url.searchParams.get('qty'),'0');
 assert.equal(url.searchParams.get('available'),'false');
 assert.match(path,/%D1/);
 const cleared=absolute(createPageUrl('home',{currentUrl:'https://shop.test/?utm_source=telegram&utm_medium=channel',params:{utm_source:null,utm_medium:undefined}}));
 assert.equal(cleared.search,'');
});

test('Nonprimitive parameters cannot become accidental object or executable strings',()=>{
 const url=absolute(createPageUrl('home',{params:{object:{id:'x'},array:['x'],fn:()=>'/evil',nil:null,missing:undefined,nan:NaN,infinity:Infinity}}));
 assert.equal(url.search,'');
});

test('Catalog links share core validation, normalize reversed prices, and ignore unrelated fields',()=>{
 const path=catalogUrl({q:'наушники',category:'audio',brand:'Logitech',kind:'headset',connection:'wireless',min:150,max:50,product:'other',utm_source:'evil'},
  {currentUrl:'https://shop.test/demo/cart.html?utm_source=telegram',params:{product:'other'}});
 const url=absolute(path),filters=readFilters(url.search);
 assert.equal(url.pathname,'/demo/catalog.html');
 assert.equal(filters.q,'наушники');
 assert.equal(filters.category,'audio');
 assert.equal(filters.brand,'Logitech');
 assert.equal(filters.kind,'headset');
 assert.equal(filters.connection,'wireless');
 assert.equal(filters.priceMin,50);
 assert.equal(filters.priceMax,150);
 assert.equal(url.searchParams.get('utm_source'),'telegram');
 assert.equal(url.searchParams.has('product'),false);
 assert.equal(url.searchParams.has('min'),false);
 assert.equal(url.searchParams.has('max'),false);
});

test('Core price names work, UI names take precedence, and empty or invalid filters disappear',()=>{
 assert.equal(catalogUrl({priceMin:0,priceMax:120}),'/catalog.html?price_min=0&price_max=120');
 assert.equal(catalogUrl({min:25,max:90,priceMin:10,priceMax:100}),'/catalog.html?price_min=25&price_max=90');
 assert.equal(catalogUrl({q:'',category:'all',brand:' ',connection:'invalid',kind:'bad<script>',min:-5,max:Infinity}),'/catalog.html');
});
