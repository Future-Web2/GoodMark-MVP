import test from 'node:test';
import assert from 'node:assert/strict';
import {products,categories,categoryAliases} from '../dist/catalog.js';
import {validateItems,cartTotal,filterProducts,sortProducts,emptyFilters,readFilters,writeFilters,readAttribution,buildUtmUrl,buildDraft,aggregate,parseCSV,toCSV,parsePrice,assistantReply,isSourceUrl} from '../dist/core.js';
import {validateAction,aiTools} from '../ai-service.mjs';
const ctx={categories,aliases:categoryAliases};
test('49 real positions have unique IDs, dated sources and unknown stock',()=>{
 assert.equal(products.length,49);assert.equal(new Set(products.map(p=>p.id)).size,49);
 for(const p of products){assert.equal(p.demo,false);assert.equal(p.stock,null);assert.equal(p.currency,'UE');assert.ok(p.price>0&&isSourceUrl(p.sourceUrl));assert.match(p.priceDate,/^2026-09-/);}
});
test('Unknown stock allows requests, zero stock does not',()=>{
 assert.equal(validateItems([{id:products[0].id,qty:2}],products)[0].qty,2);
 assert.throws(()=>validateItems([{id:'zero',qty:1}],[{id:'zero',name:'Zero',price:5,stock:0}]));
});
test('Unknown IDs, fractions and quantities over 20 are rejected',()=>{
 for(const qty of [0,-1,1.5,21])assert.throws(()=>validateItems([{id:products[0].id,qty}],products));
 assert.throws(()=>validateItems([{id:'missing',qty:1}],products));
 assert.throws(()=>validateItems([{id:products[0].id,qty:11},{id:products[0].id,qty:10}],products));
});
test('Fifine published prices total 135 UE; duplicate lines merge',()=>{
 assert.equal(cartTotal([{id:'fifine-tam8',qty:1},{id:'fifine-bm88',qty:1}],products),135);
 assert.equal(validateItems([{id:'fifine-bm88',qty:1},{id:'fifine-bm88',qty:2}],products)[0].qty,3);
});
test('Combined filters select only three G733 variants under 120 UE',()=>{
 const found=filterProducts(products,{brand:'Logitech',kind:'headset',connection:'wireless',priceMax:120},ctx);
 assert.equal(found.length,3);assert.ok(found.every(p=>p.name.includes('G733')&&p.price===115));
});
test('RU and UZ search synonyms work without invented RAM',()=>{
 assert.equal(filterProducts(products,{q:'наушники'},ctx).length,20);
 assert.equal(filterProducts(products,{q:'quloqchin'},ctx).length,20);
 assert.equal(filterProducts(products,{q:'мышь Logitech'},ctx).length,5);
 assert.equal(filterProducts(products,{q:'ОЗУ'},ctx).length,0);
});
test('Price sorting does not mutate the catalog',()=>{
 assert.equal(sortProducts(products,'low')[0].price,25);assert.equal(sortProducts(products,'high')[0].price,190);assert.equal(products[0].price,165);
});
test('Filter URL updates preserve all UTM values',()=>{
 const s='?utm_source=instagram&utm_medium=reels&utm_campaign=audio&utm_content=video_01&utm_term=mic';
 const next=writeFilters(s,{...emptyFilters(),brand:'Fifine',priceMax:90});
 assert.equal(readAttribution(next).utm_content,'video_01');assert.equal(readAttribution(next).utm_term,'mic');
 assert.equal(readFilters(next).priceMax,90);assert.equal(readAttribution(writeFilters(next,emptyFilters())).source,'instagram');
});
test('Reversed ranges normalize; invalid filters are ignored',()=>{
 const f=readFilters('?price_min=150&price_max=50&connection=invalid&category=evil');
 assert.equal(f.priceMin,50);assert.equal(f.priceMax,150);assert.equal(f.connection,'');assert.equal(f.category,'all');
});
test('UTM source is mandatory and links retain product filters',()=>{
 assert.throws(()=>buildUtmUrl('https://example.com',{}));
 const u=new URL(buildUtmUrl('https://example.com',{utm_source:'instagram'},{brand:'Fifine',kind:'microphone'}));
 assert.equal(u.searchParams.get('kind'),'microphone');assert.equal(u.searchParams.get('utm_source'),'instagram');
});
test('Draft retains dates, published prices and all attribution',()=>{
 const d=buildDraft({id:'GM-TEST',items:[{id:'fifine-tam8',qty:2}],catalog:products,attribution:readAttribution('?utm_source=telegram&utm_term=fifine')});
 assert.equal(d.total,166);assert.equal(d.currency,'UE');assert.equal(d.utm.utm_term,'fifine');assert.match(d.text,/22.09.2026/);assert.match(d.text,/подтвердить/);
});
test('Analytics distinguishes page loads, sessions, drafts and link opens',()=>{
 const b={session:'one',attribution:{source:'instagram',utm_campaign:'audio'}};
 const a=aggregate([{...b,type:'page_view'},{...b,type:'page_view'},{...b,type:'draft_created'},{...b,type:'manager_link_opened'}]);
 assert.equal(a.sessions,1);assert.equal(a.pageViews,2);assert.equal(a.drafts,1);assert.equal(a.linkOpens,1);assert.equal(a.sources[0].campaign,'audio');assert.equal(a.orders,undefined);
});
test('CSV roundtrip preserves 49 positions and prices',()=>{
 const restored=parseCSV(toCSV(products));assert.equal(restored.length,49);assert.equal(restored[0].stock,null);assert.equal(restored.find(p=>p.id==='fifine-tam8').price,83);
});
test('Excel decimals parse and ambiguous numbers fail',()=>{
 assert.equal(parsePrice('12,50'),12.5);assert.equal(parsePrice('1 290'),1290);assert.equal(parsePrice('1,290'),null);assert.equal(parsePrice('12.3.4'),null);
});
test('CSV rejects duplicate IDs, unsupported currencies and unsafe URLs',()=>{
 const h='id;name;category;brand;price;currency;sourceUrl\n';
 for(const r of ['x;One;audio;Fifine;10;USD;','x;One;audio;Fifine;10;UE;https://evil.example/','x;One;audio;Fifine;10;UE;\nx;Two;audio;Fifine;12;UE;'])assert.throws(()=>parseCSV(h+r));
});
test('Assistant proposes actual Fifine products and does not substitute missing Lexar',()=>{
 const r=assistantReply('Fifine TAM8 и BM88',products,ctx);assert.equal(r.type,'plan');assert.equal(cartTotal(r.items,products),135);
 const missing=assistantReply('2 RAM Lexar по 16GB и SSD Lexar 1TB',products,ctx);assert.equal(missing.type,'missing');assert.equal(missing.items,undefined);
});
test('Budget assistant only recommends matching sourced products',()=>{
 const r=assistantReply('беспроводные наушники Logitech до 120 у.е.',products,ctx);assert.equal(r.type,'options');assert.equal(r.products.length,3);assert.ok(r.products.every(p=>p.price<=120&&p.connection==='wireless'));
});
test('Source links and AI actions reject unrelated origins and unknown IDs',()=>{
 assert.equal(isSourceUrl('https://t.me/goodmark_uz/3447'),true);
 for(const u of ['javascript:alert(1)','https://user:pass@t.me/goodmark_uz/3447','https://evil.example/goodmark_uz/3447'])assert.equal(isSourceUrl(u),false);
 assert.ok(aiTools.every(t=>t.strict===true&&t.parameters.additionalProperties===false));
 assert.throws(()=>validateAction({name:'propose_cart',arguments:{items:[{id:'unknown',qty:1}],explanation:'x'}}));
 assert.throws(()=>validateAction({name:'navigate',arguments:{page:'https://evil.example',category:null,product_id:null}}));
});
