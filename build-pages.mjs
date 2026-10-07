import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

// One shared shell, independent HTML documents and normal browser navigation.
const root=path.dirname(fileURLToPath(import.meta.url));
const template=await readFile(path.join(root,'templates/storefront.html'),'utf8');
const pages=[
 ['home','index.html','Техника для твоих идей',''],
 ['catalog','catalog.html','Каталог Goodmark','Выбирай по бренду, подключению и бюджету. Дата и источник цены — в каждой карточке.'],
 ['mouse','category-mouse.html','Мыши','Для работы и игры. Сравни модели из прайса по бренду, подключению и цене.'],
 ['keyboard','category-keyboard.html','Клавиатуры','Найди клавиатуру для своего сетапа: модели, варианты и цены из Telegram-прайса.'],
 ['audio','category-audio.html','Звук и аксессуары','Наушники, микрофоны, держатели и веб-камеры. Выбирай сам или попроси помощника.'],
 ['product','product.html','Товар Goodmark','Модель, характеристики и опубликованная цена. Наличие и комплектацию подтвердит менеджер.'],
 ['cart','cart.html','Твоя корзина','Проверь товары и количество. Затем подготовь сообщение менеджеру Goodmark.'],
 ['assistant','assistant.html','Соберём твой следующий сетап','Опиши задачу, модель или бюджет в у.е. Помощник предложит товары из реального каталога.'],
 ['favorites','favorites.html','Твоё избранное','Сохраняй интересные модели здесь, сравнивай и возвращайся к выбору.'],
 ['telegram','telegram.html','Goodmark в Telegram','Попробуй сценарий бота: каталог, подбор, корзина и связь с магазином.'],
 ['business','business.html','Бизнес-панель Goodmark','Посмотри путь от рекламы до сообщения менеджеру и подготовь ссылки с UTM.'],
 ['contacts','contacts.html','На связи. Онлайн и в Малике.','Выбирай здесь, уточняй детали у менеджера и знакомься с техникой в магазине.']
];
const catalogPages=new Set(['catalog','mouse','keyboard','audio','favorites']);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const contacts=`<section class="wrap contact-grid">
 <div class="contact-main"><span class="eyebrow">GOODMARK / MALIKA B8</span><h2>Техника начинается<br>с хорошего выбора.</h2><p>Магазин Goodmark в торговом центре «Малика», B8, Ташкент. Спросите менеджера о наличии, комплектации, гарантии и актуальной цене перед покупкой.</p><a class="button button-dark" href="https://t.me/goodmarkuzmalika" target="_blank" rel="noopener noreferrer" data-manager-link="contacts">Написать менеджеру <span data-icon="arrow"></span></a><div class="contact-graphic" aria-hidden="true"><span data-icon="location"></span><strong>MALIKA<span>B8</span></strong></div></div>
 <div class="contact-cards"><article class="contact-card"><span data-icon="location"></span><h3>В магазине</h3><p>Ташкент · ТЦ «Малика» · B8</p><small>Время работы и маршрут уточните у менеджера.</small></article><article class="contact-card"><span data-icon="telegram"></span><h3>На связи</h3><a href="tel:+998998887787">+998 99 888 77 87</a><a href="https://t.me/goodmarkuzmalika" target="_blank" rel="noopener noreferrer" data-manager-link="contacts_card">Менеджер в Telegram ↗</a></article><article class="contact-card"><span data-icon="spark"></span><h3>Новинки и прайс</h3><a href="https://t.me/goodmark_uz" target="_blank" rel="noopener noreferrer">Telegram-канал Goodmark ↗</a><a href="https://www.instagram.com/goodmarkuz/" target="_blank" rel="noopener noreferrer">Instagram @goodmarkuz ↗</a></article></div>
 </section>`;
for(const [page,file,title,description] of pages){
 let html=template.replace('<body>',`<body data-page="${page}"${['mouse','keyboard','audio'].includes(page)?` data-category="${page}"`:''}>`);
 html=html.replace(/<title>[^<]*<\/title>/,`<title>${esc(title)} — Goodmark</title>`);
 html=html.replace('<link rel="stylesheet" href="design.css">','<link rel="stylesheet" href="design.css"><link rel="stylesheet" href="pages.css">');
 if(description)html=html.replace(/(<meta name="description" content=")[^"]*/,`$1${esc(description)}`);
 html=html.replaceAll('href="#home"','href="index.html" data-page-link="home"').replaceAll('href="#insights"','href="business.html" data-page-link="business"').replaceAll('href="#catalog"','href="catalog.html" data-page-link="catalog"');
 for(const cat of ['mouse','keyboard'])html=html.replaceAll(`href="catalog.html" data-page-link="catalog" data-category="${cat}"`,`href="category-${cat}.html" data-page-link="${cat}" data-category="${cat}"`);
 html=html.replace('<span class="nav-spacer"></span>','<a href="category-audio.html" data-page-link="audio" data-i18n="navSound">Звук</a><span class="nav-spacer"></span><a href="contacts.html" data-page-link="contacts" data-i18n="navContacts">Контакты</a>');
 html=html.replace('<a href="catalog.html" data-page-link="catalog">Каталог</a>','<a href="catalog.html" data-page-link="catalog">Каталог</a><a href="contacts.html" data-page-link="contacts">Магазин и контакты</a>');
 html=html.replace('<span>Собрано вокруг твоих идей.</span>','<span>Собрано вокруг твоих идей.</span><a id="version-picker-link" hidden>← Выбор V1 / V2</a>');
 const intro=page==='home'?'':`<section class="wrap page-intro"><nav class="breadcrumbs" aria-label="Хлебные крошки"><a href="index.html" data-page-link="home" data-i18n="home">Главная</a><span>/</span>${page==='product'?'<a href="catalog.html" data-back-catalog data-i18n="catalog">Каталог</a><span>/</span>':''}<span aria-current="page" id="breadcrumb-current">${esc(title)}</span></nav><span class="page-kicker">GOODMARK / ${page==='business'?'BUSINESS':'YOUR NEXT UPGRADE'}</span><h1 id="page-title">${esc(title)}</h1><p id="page-description">${esc(description)}</p></section>`;
 html=html.replace('<main>','<main>'+intro);
 if(page==='home')html=html.replace('<p class="catalog-disclosure"','<div class="page-extra"><a class="button button-dark" href="catalog.html" data-page-link="catalog"><span data-i18n="viewAll">Смотреть весь каталог</span> <span data-icon="arrow"></span></a></div><p class="catalog-disclosure"');
 const widget={product:'product-dialog',cart:'cart-dialog',assistant:'assistant-dialog',telegram:'bot-dialog'}[page];
 if(widget){
  const pattern=new RegExp(`<dialog id="${widget}"[\\s\\S]*?<\\/dialog>`);
  const match=html.match(pattern);
  if(!match)throw Error('Missing widget '+widget);
  let panel=match[0].replace(/<dialog id="([^"]+)" class="[^"]*">/,`<section id="$1" class="wrap ${page==='telegram'?'bot':page}-page embedded-panel">`).replace('</dialog>','</section>');
  html=html.replace(pattern,'');
  let extra='';
  if(page==='cart')extra='<div class="wrap continue-shopping"><a href="catalog.html" data-back-catalog>← Продолжить покупки</a><a href="assistant.html" data-page-link="assistant">Помощник с выбором ↗</a></div>';
  if(page==='product')extra='<section class="wrap related-section"><div class="section-heading"><h2>В той же категории</h2><a href="catalog.html" data-back-catalog>В каталог ↗</a></div><div class="product-grid" id="related-products"></div></section>';
  if(page==='assistant')extra='<div class="wrap assistant-page-note"><span data-icon="spark"></span><p>Помощник работает по прайсу Goodmark. В этом MVP используется сценарный подбор; внешний AI подключается через сервер. Цены и наличие проверяет менеджер.</p><button class="link-button" id="clear-chat">Начать новый подбор</button></div>';
  html=html.replace('</main>',panel+extra+'</main>');
 }
 if(page==='contacts')html=html.replace('</main>',contacts+'</main>');
 if(page==='business')html=html.replace('id="insights-view" class="wrap insights-view" hidden','id="insights-view" class="wrap insights-view"');
 // The hidden shell keeps the shared controls available without duplicating IDs.
 if(!catalogPages.has(page)&&page!=='home')html=html.replace('id="shop-view"','id="shop-view" hidden');
 html=html.replace('<script type="module" src="app.js"></script>','<noscript><p class="wrap">Для поиска, корзины и подбора включите JavaScript в браузере.</p></noscript><script type="module" src="app.js"></script>');
 await writeFile(path.join(root,'dist',file),html);
}
console.log(`Built ${pages.length} Goodmark pages.`);
