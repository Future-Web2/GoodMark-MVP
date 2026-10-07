export const icon=(name,size=22)=>{
 const paths={
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
 cart:'<path d="M3 3h2l3 13h10l3-9H6"/><circle cx="9" cy="21" r="1"/><circle cx="18" cy="21" r="1"/>',
 arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',
 spark:'<path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4Z"/><path d="m20 2 .7 2.3L23 5l-2.3.7L20 8l-.7-2.3L17 5l2.3-.7Z"/>',
 heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 location:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
 phone:'<path d="m5 3 4 5-2 3c2 3 3 4 6 6l3-2 5 4c-1 3-4 4-7 2C8 18 5 15 3 9 2 6 2 4 5 3Z"/>',
 telegram:'<path d="m3 11 18-8-4 18-6-6-4 3 1-6 10-6-7 9"/>',
 check:'<path d="m5 12 4 4L19 6"/>',plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',
 chart:'<path d="M4 3v18h18M8 16v-5m5 5V7m5 9V4"/>',
 shield:'<path d="m12 2 8 3v6c0 7-8 11-8 11S4 18 4 11V5Z"/><path d="m8 11 3 3 5-5"/>',
 pc:'<rect x="6" y="2" width="12" height="20" rx="2"/><circle cx="12" cy="8" r="3"/><circle cx="12" cy="16" r="3"/>',
 ram:'<rect x="2" y="7" width="20" height="10" rx="1"/><path d="M5 10h3v4H5zm6 0h3v4h-3zm6 0h2v4h-2M5 17v3m4-3v3m4-3v3m4-3v3"/>',
 ssd:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h10M7 14h6"/>',
 mouse:'<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 3v6M6 10h12"/>',
 keyboard:'<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M5 10h2m2 0h2m2 0h2m2 0h2M5 14h2m2 0h7m2 0h1"/>',
 headphones:'<path d="M4 14v-3a8 8 0 0 1 16 0v3"/><rect x="2" y="12" width="5" height="9" rx="2"/><rect x="17" y="12" width="5" height="9" rx="2"/>',
 mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/>',
 monitor:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M12 17v4m-5 0h10"/>',
 chevron:'<path d="m9 5 7 7-7 7"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
 upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 17v4h16v-4"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>'
 };
 return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.spark}</svg>`;
};
let serial = 0;

// These are category illustrations, so they deliberately carry no model branding.
export function art(type, color = '#bbc8ef', hero = false) {
 const accent = typeof color === 'string' && /^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(color) ? color : '#bbc8ef';
 const id = `gm-art-${++serial}`;
 const paint = name => `url(#${id}-${name})`;
 const body = paint('body'), metal = paint('metal'), dark = paint('dark'), trim = paint('trim');
 const shadow = paint('shadow');
 const defs = `<defs>
  <linearGradient id="${id}-body" x1="12%" y1="4%" x2="90%" y2="100%"><stop stop-color="#fbfcff"/><stop offset=".34" stop-color="${accent}"/><stop offset=".72" stop-color="${accent}"/><stop offset="1" stop-color="#8594af"/></linearGradient>
  <linearGradient id="${id}-metal" x1="0%" y1="0%" x2="100%" y2="100%"><stop stop-color="#c1cbdb"/><stop offset=".24" stop-color="#f7f9ff"/><stop offset=".49" stop-color="#8a99b3"/><stop offset=".75" stop-color="#d9e1ed"/><stop offset="1" stop-color="#7f8da4"/></linearGradient>
  <linearGradient id="${id}-dark" x1="10%" y1="0%" x2="85%" y2="100%"><stop stop-color="#49566c"/><stop offset=".43" stop-color="#253045"/><stop offset="1" stop-color="#121a2b"/></linearGradient>
  <linearGradient id="${id}-trim" x1="0%" y1="0%" x2="90%" y2="100%"><stop stop-color="#fafcff"/><stop offset=".5" stop-color="#a7b6cd"/><stop offset="1" stop-color="#64778f"/></linearGradient>
  <linearGradient id="${id}-screen" x1="0%" y1="100%" x2="100%" y2="0%"><stop stop-color="#183a86"/><stop offset=".42" stop-color="#496bdd"/><stop offset=".74" stop-color="#99aaf5"/><stop offset="1" stop-color="#e4dcf9"/></linearGradient>
  <radialGradient id="${id}-lens" cx="38%" cy="34%" r="69%"><stop stop-color="#718fbd"/><stop offset=".21" stop-color="#263e60"/><stop offset=".52" stop-color="#0e1c32"/><stop offset=".8" stop-color="#2c4567"/><stop offset="1" stop-color="#091121"/></radialGradient>
  <radialGradient id="${id}-fan"><stop stop-color="#26374e"/><stop offset=".62" stop-color="#26374e"/><stop offset=".73" stop-color="#627ecc"/><stop offset=".85" stop-color="${accent}"/><stop offset=".93" stop-color="#e5ebff"/><stop offset="1" stop-color="#5877ba"/></radialGradient>
  <linearGradient id="${id}-glass" x1="0%" y1="0%" x2="100%" y2="100%"><stop stop-color="#182a45"/><stop offset=".65" stop-color="#293954"/><stop offset="1" stop-color="#101c30"/></linearGradient>
  <filter id="${id}-shadow" x="-35%" y="-30%" width="175%" height="180%" color-interpolation-filters="sRGB"><feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#1b3153" flood-opacity=".19"/></filter>
  <filter id="${id}-floor" x="-35%" y="-180%" width="170%" height="460%"><feGaussianBlur stdDeviation="5"/></filter>
  <pattern id="${id}-mesh" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r=".8" fill="#8797b0" opacity=".55"/></pattern>
 </defs>`;
 let shape = '';

 if (type === 'headphones' || type === 'audio') {
  shape = `<g transform="rotate(-13 184 126)" filter="${shadow}">
   <path d="M92 146 83 116C73 59 117 19 181 18c68-1 110 44 99 104l-7 27-20-8 7-29c7-43-24-73-77-72-48 0-80 30-76 72l6 29Z" fill="${body}" stroke="#8c9bb7" stroke-width="1"/>
   <path d="M94 111c-2-48 35-80 88-81 59-1 92 34 86 83" fill="none" stroke="#f5f7ff" stroke-width="3" opacity=".7"/>
   <path d="M108 113c-4-42 27-70 75-70 51-1 79 29 73 69" fill="none" stroke="${dark}" stroke-width="14" stroke-linecap="round"/>
   <path d="M116 83c12-20 35-31 66-32 32 0 57 13 68 34" fill="none" stroke="#6d7992" stroke-width="1.2" stroke-dasharray="1 4" opacity=".75"/>
   <path d="m95 111 9 38m161-39-8 41" stroke="${metal}" stroke-width="14" stroke-linecap="round"/>
   <path d="m99 116 8 31m154-32-6 32" stroke="#f6f8ff" stroke-width="2" opacity=".65"/>
   <g transform="rotate(-7 99 163)">
    <rect x="75" y="115" width="59" height="104" rx="29" fill="${dark}"/>
    <rect x="70" y="117" width="53" height="102" rx="26" fill="${metal}"/>
    <rect x="67" y="119" width="49" height="97" rx="24" fill="${body}" stroke="#c7d0e2"/>
    <rect x="73" y="126" width="34" height="79" rx="17" fill="none" stroke="#f8faff" stroke-width="1.3" opacity=".65"/>
    <path d="M93 135v55" stroke="#8b9bbb" stroke-width="1" opacity=".3"/>
    <path d="M122 134c7 14 8 46 1 63" fill="none" stroke="#69748a" stroke-width="1.5"/>
    <circle cx="87" cy="199" r="1.5" fill="#53698a"/>
   </g>
   <g transform="rotate(9 259 163)">
    <rect x="224" y="114" width="61" height="105" rx="30" fill="${dark}"/>
    <rect x="235" y="113" width="61" height="108" rx="30" fill="${metal}"/>
    <rect x="241" y="115" width="55" height="103" rx="27" fill="${body}" stroke="#bdc8de"/>
    <rect x="247" y="121" width="42" height="88" rx="21" fill="none" stroke="#f8faff" stroke-width="1.5" opacity=".7"/>
    <ellipse cx="268" cy="165" rx="14" ry="28" fill="${accent}" opacity=".21"/>
    <path d="M231 137c-6 13-6 43 0 59" fill="none" stroke="#748299" stroke-width="1.5"/>
    <rect x="255" y="200" width="11" height="3" rx="1.5" fill="#486ab4" opacity=".75"/>
    <circle cx="277" cy="201" r="2" fill="#798aa7"/>
   </g>
  </g>`;
 }

 if (type === 'mouse') {
  shape = `<g transform="rotate(-25 181 123)" filter="${shadow}">
   <path d="M124 82c0-35 22-58 57-58s59 24 59 58l4 73c1 46-25 69-62 69s-64-21-63-68Z" fill="${dark}"/>
   <path d="M121 82c0-36 24-59 60-59s60 24 60 60l2 67c2 44-24 66-61 66-38 0-65-23-64-65Z" fill="${body}" stroke="#a2b0c7" stroke-width="1"/>
   <path d="M129 71c4-26 23-40 51-41" fill="none" stroke="#fff" stroke-width="2.5" opacity=".78"/>
   <path d="M180 27v69M123 98c33 9 76 10 116 0" fill="none" stroke="#7184a3" stroke-width="1.3" opacity=".7"/>
   <rect x="173" y="42" width="15" height="36" rx="7.5" fill="#a0afc8"/>
   <rect x="175" y="44" width="11" height="31" rx="5.5" fill="${dark}"/>
   ${Array.from({length:6},(_,i)=>`<path d="M177 ${49+i*4}h7" stroke="#7e8ea8" stroke-width="1"/>`).join('')}
   <path d="M129 113c-2 21 0 39 6 51" fill="none" stroke="#fff" stroke-width="2" opacity=".45"/>
   <path d="M121 112v21m0 7v13" stroke="#697d9f" stroke-width="3.5" stroke-linecap="round"/>
   <path d="M138 199c26 13 58 13 87-4" fill="none" stroke="#6e84aa" stroke-width="1.4" opacity=".4"/>
  </g>`;
 }

 if (type === 'keyboard') {
  const key = (x,y,w=17,fill='#e9eef7') => `<rect x="${x}" y="${y+3}" width="${w}" height="17" rx="3" fill="#7b8ba5"/><rect x="${x}" y="${y}" width="${w}" height="17" rx="3" fill="${fill}" stroke="#f5f7fc" stroke-width=".7"/><path d="M${x+4} ${y+5}h${Math.min(w-8,4)}" stroke="#7485a3" stroke-width="1" opacity=".65"/>`;
  let keys = '';
  for (let row=0;row<4;row++) for(let column=0;column<13;column++) keys+=key(12+column*21,10+row*23,17,column===0||column===12?accent:'#e9eef7');
  keys += key(12,102,26,accent)+key(42,102,21)+key(67,102,118,accent)+key(189,102,21)+key(214,102,21)+key(239,102,21)+key(264,102,17,accent);
  shape = `<g transform="translate(31 68) rotate(-12 147 63) skewX(-11)" filter="${shadow}">
   <rect x="0" y="1" width="294" height="134" rx="13" fill="#7385a2"/>
   <path d="M7 121h280v8H7Z" fill="${metal}"/><path d="M35 128h224" stroke="#6d8edf" stroke-width="2" opacity=".75"/>
   <rect x="0" y="-6" width="294" height="134" rx="12" fill="${body}" stroke="#a0afc7"/>
   <rect x="7" y="1" width="280" height="121" rx="8" fill="#384b6b"/>
   ${keys}
   <path d="M10-3h271" stroke="#fff" stroke-width="1.5" opacity=".8"/>
  </g>`;
 }

 if (type === 'mic') {
  shape = `<g transform="rotate(9 180 130)" filter="${shadow}">
   <ellipse cx="180" cy="225" rx="55" ry="11" fill="#28364c"/>
   <ellipse cx="180" cy="221" rx="55" ry="10" fill="${dark}" stroke="#667792"/>
   <path d="M180 215v-35" stroke="${metal}" stroke-width="12"/>
   <path d="M130 112v25c0 35 22 48 50 48s50-13 50-48v-25" fill="none" stroke="${metal}" stroke-width="8" stroke-linecap="round"/>
   <rect x="144" y="28" width="72" height="140" rx="33" fill="${dark}" stroke="#4f627e"/>
   <rect x="150" y="34" width="60" height="89" rx="27" fill="${paint('mesh')}"/>
   <path d="M154 50v44" stroke="#b9c8df" stroke-width="2" opacity=".28" stroke-linecap="round"/>
   <path d="M148 121h64" stroke="${accent}" stroke-width="4"/>
   <circle cx="180" cy="143" r="9" fill="#132037" stroke="#6d81a1" stroke-width="1.5"/>
   <path d="M180 137v5" stroke="#d6e2f9" stroke-width="1.6" stroke-linecap="round"/>
   <circle cx="132" cy="120" r="6" fill="${dark}" stroke="#7f91ad"/>
   <circle cx="228" cy="120" r="6" fill="${dark}" stroke="#7f91ad"/>
  </g>`;
 }

 if (type === 'arm') {
  shape = `<g filter="${shadow}" stroke-linejoin="round" stroke-linecap="round">
   <path d="M69 214h39v23H78v-12" fill="none" stroke="${dark}" stroke-width="10"/>
   <path d="M81 230v12m-8 0h18" stroke="#778aa7" stroke-width="5"/>
   <path d="M91 214v-24" stroke="${metal}" stroke-width="12"/>
   <path d="m95 191 84-98 115 47m-190 61 82-93 107 43" fill="none" stroke="${dark}" stroke-width="11"/>
   <path d="m95 190 82-96 116 47" fill="none" stroke="${metal}" stroke-width="4"/>
   <path d="m104 200 81-92 106 43" fill="none" stroke="${accent}" stroke-width="3"/>
   <path d="m106 183 63-75m24-9 86 36" fill="none" stroke="#617592" stroke-width="2"/>
   <circle cx="100" cy="194" r="13" fill="${dark}" stroke="#6e819e" stroke-width="2"/>
   <circle cx="181" cy="102" r="15" fill="${dark}" stroke="#7689a6" stroke-width="2"/>
   <circle cx="293" cy="146" r="12" fill="${dark}" stroke="#7b8ca8" stroke-width="2"/>
   <circle cx="100" cy="194" r="4" fill="${metal}"/><circle cx="181" cy="102" r="5" fill="${metal}"/><circle cx="293" cy="146" r="4" fill="${metal}"/>
   <path d="M300 155v19m-7 0h15" fill="none" stroke="${metal}" stroke-width="6"/>
   <path d="M96 185c17-17 50-58 81-86 32 2 78 31 106 37" fill="none" stroke="#121e31" stroke-width="2"/>
  </g>`;
 }

 if (type === 'webcam') {
  shape = `<g transform="rotate(-10 180 139)" filter="${shadow}">
   <path d="m144 162-26 39c-3 6 0 10 7 10h113c7 0 10-4 6-10l-29-39" fill="${dark}"/>
   <path d="m150 177-15 23h92l-16-23" fill="#6a7d9b"/>
   <rect x="65" y="78" width="233" height="96" rx="37" fill="#243349"/>
   <rect x="61" y="72" width="233" height="95" rx="36" fill="${dark}" stroke="#7586a0"/>
   <path d="M83 80h185" stroke="#a8bbd7" stroke-width="1.5" opacity=".45"/>
   <rect x="77" y="97" width="54" height="42" rx="12" fill="${paint('mesh')}"/>
   <rect x="227" y="97" width="51" height="42" rx="12" fill="${paint('mesh')}"/>
   <circle cx="181" cy="119" r="38" fill="${metal}"/>
   <circle cx="181" cy="119" r="33" fill="#111d31" stroke="#657b9b"/>
   <circle cx="181" cy="119" r="27" fill="${paint('lens')}" stroke="#354f76"/>
   <circle cx="181" cy="119" r="17" fill="#101c31" stroke="#5e80a9" stroke-width=".7"/>
   <path d="M166 110a18 18 0 0 1 21-8" fill="none" stroke="#afc9ee" stroke-width="3" stroke-linecap="round" opacity=".58"/>
   <circle cx="191" cy="130" r="4" fill="#5e8dc2" opacity=".5"/>
   <circle cx="248" cy="86" r="2" fill="#9db4ec"/>
  </g>`;
 }

 if (type === 'ram') {
  shape = `<g transform="rotate(-17 180 130)" filter="${shadow}">
   <path d="M48 96 66 74h240v84H48Z" fill="#203e3a" stroke="#4a6e66"/>
   <path d="M51 96 69 78h234v65H51Z" fill="${dark}" stroke="#5b6c84"/>
   <path d="M60 91 75 81h220v12H60Z" fill="${body}"/>
   <path d="M67 98h226v39H67Z" fill="#31415b"/>
   ${Array.from({length:8},(_,i)=>`<path d="m${77+i*26} 99-8 35" stroke="#647a9b" stroke-width="2"/><path d="m${81+i*26} 99-8 35" stroke="#101e33" stroke-width="3"/>`).join('')}
   ${Array.from({length:25},(_,i)=>`<path d="M${58+i*9.5} 149v13" stroke="#c4a472" stroke-width="5.5"/>`).join('')}
   <path d="M166 149v15" stroke="#edf0f5" stroke-width="6"/>
   <path d="M74 83h219" stroke="#f8fbff" stroke-width="1.2" opacity=".7"/>
  </g>`;
 }

 if (type === 'ssd') {
  shape = `<g transform="rotate(-17 180 129)" filter="${shadow}">
   <rect x="45" y="85" width="265" height="78" rx="9" fill="#24473f" stroke="#607e6e"/>
   <circle cx="60" cy="124" r="9" fill="#d0d5c8"/><circle cx="60" cy="124" r="5" fill="#eef1f4"/>
   <path d="M291 91v66" stroke="#c8a471" stroke-width="23"/>
   ${Array.from({length:10},(_,i)=>`<path d="M280 ${94+i*6}h22" stroke="#8f754f" stroke-width="1"/>`).join('')}
   <path d="M296 109h15" stroke="#f0f2f4" stroke-width="5"/>
   <rect x="78" y="90" width="190" height="68" rx="5" fill="${dark}" stroke="#5e7593"/>
   <path d="M86 99h174" stroke="${accent}" stroke-width="4"/>
   ${Array.from({length:4},(_,i)=>`<rect x="${89+i*42}" y="110" width="31" height="32" rx="2" fill="#1d2b40" stroke="#41566f"/><path d="M${94+i*42} 115h20" stroke="#6c819e" opacity=".35"/>`).join('')}
   <path d="M72 97v53m201-49v48" stroke="#94a586" stroke-width="2" opacity=".45"/>
  </g>`;
 }

 if (type === 'monitor') {
  shape = `<g filter="${shadow}">
   <path d="M169 180h22v33l37 15H132l37-15Z" fill="${metal}"/>
   <path d="M122 227h116" stroke="#6c809f" stroke-width="5" stroke-linecap="round"/>
   <rect x="30" y="29" width="300" height="169" rx="8" fill="${dark}" stroke="#657a98"/>
   <rect x="38" y="37" width="284" height="149" rx="3" fill="${paint('screen')}"/>
   <path d="M38 171c49-78 84-26 130-86 36-47 95-26 154-35v136H38Z" fill="#d9e4ff" opacity=".27"/>
   <path d="M38 165c61-10 83-89 140-69 51 18 49 49 144 26" fill="none" stroke="#e8eafe" stroke-width="2" opacity=".65"/>
   <path d="M38 179c69 0 105-54 146-41s89 17 138-17" fill="none" stroke="#b8c8ff" stroke-width="22" opacity=".3"/>
   <path d="M47 31h267" stroke="#f1f5ff" stroke-width="1.2" opacity=".3"/>
   <circle cx="180" cy="191" r="1.5" fill="#97b2df"/>
  </g>`;
 }

 if (type === 'pc') {
  const fan = (x,y,r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${paint('fan')}"/>${Array.from({length:6},(_,i)=>`<path d="M${x} ${y-5}c-9-14-23-10-20 1 3 8 15 6 20 4Z" fill="#7084a3" opacity=".4" transform="rotate(${i*60} ${x} ${y})"/>`).join('')}<circle cx="${x}" cy="${y}" r="6" fill="#7b8da8"/>`;
  shape = `<g filter="${shadow}">
   <path d="M99 31 238 17l45 25v185l-139 14-45-26Z" fill="${metal}" stroke="#9bacc5"/>
   <path d="m99 31 45 26v184l-45-26Z" fill="#778cae"/>
   <path d="m144 57 139-15v185l-139 14Z" fill="${body}" stroke="#9cacbf"/>
   <path d="m156 68 114-12v158l-114 12Z" fill="${paint('glass')}" stroke="#677f9c"/>
   <path d="m108 49 27 15v139l-27-15Z" fill="#172840"/>
   <ellipse cx="122" cy="98" rx="9" ry="25" fill="${paint('fan')}"/><ellipse cx="122" cy="160" rx="9" ry="25" fill="${paint('fan')}"/>
   ${fan(221,99,28)}${fan(221,165,28)}
   <path d="m169 143 32-4" stroke="#7b91bd" stroke-width="16"/>
   <path d="m167 144 44-5" stroke="#c4d1e8" stroke-width="2"/>
   <path d="m163 72 54-6-53 118Z" fill="#d9e5fc" opacity=".08"/>
   <path d="M159 75v142" stroke="#d5e2f7" stroke-width="1.5" opacity=".45"/>
   <path d="m151 58 120-13" stroke="#fff" stroke-width="2" opacity=".8"/>
   <path d="M151 238v7m115-19v7" stroke="#27364e" stroke-width="8"/>
   <path d="m237 27 9 5" stroke="#496b9a" stroke-width="3" stroke-linecap="round"/>
  </g>`;
 }

 if (type === 'grid' || !shape) return icon('grid', 46);
 return `<svg viewBox="0 0 360 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Иллюстрация товара" class="product-art${hero ? ' hero-art' : ''}">${defs}<ellipse cx="183" cy="237" rx="${type === 'keyboard' ? 125 : 89}" ry="7" fill="#20395b" opacity=".11" filter="${paint('floor')}"/>${shape}</svg>`;
}
