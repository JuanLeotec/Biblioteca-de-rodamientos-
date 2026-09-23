/* ======================================================
   BIBLIOTECA TÉCNICA DE RODAMIENTOS v2.0
   LeoTécnicas — app.js
   Todas las funcionalidades preservadas y mejoradas.
   ====================================================== */

/* ─── STATE ─── */
const ST = {
  bearings: [], verified: [], typeDesc: {},
  compareList: [], favorites: [], history: [],
  pendingSuffixes: [], page: 0, pageSize: 72,
  lastResults: [], tolMode: 'shaft', techMode: false,
  wizardState: { step: 0, component: null, bearingType: null, innerRotates: null, loadType: null, speed: null, tempCat: null, diameter: null },
};

/* ─── SEAL CODES per brand ─── */
const SEAL = {
  SKF:{'2Z':'2Z','2RS':'2RS1'}, FAG:{'2Z':'2Z','2RS':'2RSR'},
  NSK:{'2Z':'ZZ','2RS':'DDU'}, NTN:{'2Z':'ZZ','2RS':'LLU'},
  KOYO:{'2Z':'ZZ','2RS':'RS'}, NACHI:{'2Z':'ZZE','2RS':'2NSE'},
  TIMKEN:{'2Z':'ZZ','2RS':'2RS'},
};
const SEAL_NORM = {'2Z':'2Z','ZZ':'2Z','Z':'2Z','2RS1':'2RS','2RSR':'2RS','2RS':'2RS','DDU':'2RS','LLU':'2RS','RSH':'2RS','RS':'2RS'};
const SUFFIX_TOKENS = ['C2','C3','C4','C5','CN','2RS1','2RSR','2RS','DDU','LLU','RSH','RS','2Z','ZZ','Z','INSOCOAT','EXPLORER','HIBRIDO','CERAMICO','EK','VL0241','MC3VL','ECM','ECP','ECJ','EC','M','P6','P5','P4'];

/* ─── BEARING TYPES LIBRARY ─── */
const BEAR_TYPES = [
  { key:'bolas', name:'Rígido de bolas', series:'6000·6200·6300', icon:'🔵',
    radial:'Alta', axial:'Moderada', both:true, speed:'Muy alta', self:false,
    desc:'El tipo más versátil y usado en motores eléctricos. Soporta cargas radiales y axiales moderadas en ambos sentidos a alta velocidad.',
    apps:['Motores eléctricos','Bombas centrífugas','Ventiladores','Reductores'],
    pros:['Alta velocidad','Bajo torque de arranque','Gran disponibilidad','Bajo mantenimiento'],
    cons:['No apto para cargas muy pesadas','No compensa desalineación'],
    motor:true },
  { key:'rodillos_cil', name:'Rodillos cilíndricos', series:'NU·NJ·NUP·N·NF',icon:'🟦',
    radial:'Muy alta', axial:'Limitada', both:false, speed:'Alta', self:false,
    desc:'Alta capacidad radial. El tipo NU permite desplazamiento axial libre (rodamiento libre en el polo opuesto al fijo).',
    apps:['Motores grandes','Reductores','Laminadores','Compresores'],
    pros:['Máxima carga radial','Soporta impacto','Bajo perfil axial'],
    cons:['Carga axial muy limitada','No compensa desalineación'],
    motor:true },
  { key:'esfericos', name:'Rodillos esféricos', series:'22200·22300·23000·231·232',icon:'🟣',
    radial:'Muy alta', axial:'Alta', both:true, speed:'Media', self:true,
    desc:'Autoalineante de doble hilera. Compensa desalineaciones del eje hasta 2.5°. Máxima capacidad de carga combinada.',
    apps:['Ventiladores industriales','Bombas grandes','Mezcladores','Vibradores'],
    pros:['Autoalineante','Máxima capacidad','Alta confiabilidad'],
    cons:['Menor velocidad que bolas','Mayor tamaño y peso'],
    motor:false },
  { key:'contacto_angular', name:'Contacto angular', series:'7200·7300·3200·3300',icon:'🟡',
    radial:'Alta', axial:'Alta', both:'pares', speed:'Muy alta', self:false,
    desc:'Diseñado para cargas combinadas radiales y axiales. Normalmente montado en pares para soportar carga en ambos sentidos.',
    apps:['Husillos CNC','Bombas centrífugas','Compresores','Ventiladores'],
    pros:['Alta velocidad','Carga combinada elevada','Alta rigidez'],
    cons:['Requiere montaje en pares','Precarga crítica'],
    motor:false },
  { key:'axial_bolas', name:'Axial de bolas', series:'51000',icon:'⬛',
    radial:'Nula', axial:'Alta', both:false, speed:'Baja-Media', self:false,
    desc:'Soporta exclusivamente carga axial en un sentido. NO admite carga radial. Montaje de simple efecto.',
    apps:['Gusanos reductores','Columnas de dirección','Grúas y cabrestantes'],
    pros:['Alta capacidad axial','Montaje sencillo','Bajo perfil'],
    cons:['NO soporta carga radial','Velocidad limitada'],
    motor:false },
  { key:'agujas', name:'Agujas', series:'NA·RNA',icon:'🔶',
    radial:'Muy alta', axial:'Nula', both:false, speed:'Media', self:false,
    desc:'Rodillos de gran relación longitud/diámetro. Sección radial muy compacta para la capacidad de carga ofrecida.',
    apps:['Transmisiones','Bielas','Platos oscilantes','Cabezales de pistón'],
    pros:['Sección radial mínima','Muy alta capacidad radial'],
    cons:['Sin carga axial','Pistas deben ser de alta dureza'],
    motor:false },
];

/* ─── CLEARANCE DATA ─── */
const CLEARANCE_INFO = [
  { id:'C2', cls:'c2', name:'Grupo C2', sub:'Juego reducido',
    what:'Juego interno radial menor que el normal (CN). Tolerancias más estrechas.',
    use:'Rotación suave a alta velocidad. Ejes verticales. Rodamientos de alta precisión.',
    nouse:'Cargas de choque. Montajes con interferencia fuerte en ambos aros. Temperaturas elevadas.',
    apps:'Motores de precisión, giroscopios, turbinas de baja carga',
    ranges:'10–35 µm (d≈40 mm)' },
  { id:'CN', cls:'cn', name:'Normal (CN)', sub:'Juego estándar de fabricación',
    what:'Juego interno estándar de fabricación. No se indica letra de grupo cuando no se especifica.',
    use:'Condiciones normales de operación sin interferencia significativa ni temperatura elevada.',
    nouse:'No reemplaza C3 cuando hay interferencia de montaje fuerte o temperatura elevada.',
    apps:'Aplicaciones generales, bombas, ventiladores sin variador',
    ranges:'15–40 µm (d≈40 mm)' },
  { id:'C3', cls:'c3', name:'Grupo C3', sub:'Juego mayor que CN',
    what:'Juego interno radial mayor que el normal. El más usado en mantenimiento de motores eléctricos.',
    use:'Ajustes con interferencia que reducen el juego. Temperaturas elevadas. Motores con variador VFD. Altas velocidades.',
    nouse:'No seleccionar C3 por defecto. No usar si el montaje es con holgura o juego en ambos aros.',
    apps:'Motores eléctricos industriales, compresores, bombas con VFD',
    ranges:'20–50 µm (d≈40 mm)' },
  { id:'C4', cls:'c4', name:'Grupo C4', sub:'Juego mayor que C3',
    what:'Juego interno radial mayor que C3. Para condiciones más severas.',
    use:'Interferencia muy fuerte en ambos aros. Grandes diferencias de temperatura entre aro interior y exterior.',
    nouse:'Condiciones normales. Genera ruido y vibración si el juego es excesivo para la aplicación.',
    apps:'Hornos industriales, secadores, equipos siderúrgicos',
    ranges:'28–65 µm (d≈40 mm)' },
  { id:'C5', cls:'c5', name:'Grupo C5', sub:'Juego máximo estándar',
    what:'Juego interno radial máximo de la gama estándar.',
    use:'Condiciones extremas: temperatura muy alta, interferencia máxima en ambos aros, grandes ejes de acero inoxidable.',
    nouse:'Prácticamente todas las aplicaciones normales.',
    apps:'Equipos siderúrgicos, hornos industriales de alta temperatura',
    ranges:'40–80 µm (d≈40 mm)' },
];

/* ─── WIZARD STEPS ─── */
const WIZ_STEPS = [
  { id:'component', label:'Componente', q:'¿Qué elemento estás ajustando?',
    opts:[{v:'shaft',l:'Eje',s:'Asiento del aro interior'},{v:'housing',l:'Alojamiento',s:'Asiento del aro exterior'}] },
  { id:'bearingType', label:'Tipo', q:'¿Qué tipo de rodamiento?',
    opts:[{v:'ball',l:'Rígido de bolas',s:'Serie 6000/6200/6300'},{v:'cyl',l:'Rodillos cilíndricos',s:'NU/NJ/NUP'},{v:'sph',l:'Rodillos esféricos',s:'22xxx/23xxx'},{v:'ang',l:'Contacto angular',s:'7xxx/3xxx'}] },
  { id:'innerRotates', label:'Rotación', q:'¿El aro interior gira junto con el eje?',
    opts:[{v:'yes',l:'Sí — el eje gira',s:'Caso más común en motores eléctricos'},{v:'no',l:'No — el eje está fijo',s:'Carga sobre el aro exterior'}] },
  { id:'loadType', label:'Carga', q:'¿Qué tipo de carga existe?',
    opts:[{v:'light',l:'Ligera / normal',s:'Carga estática o fluctuante moderada'},{v:'heavy',l:'Pesada',s:'Carga permanente elevada'},{v:'shock',l:'Choque / impacto',s:'Vibraciones o golpes frecuentes'},{v:'stat',l:'Carga fija',s:'Eje y alojamiento estacionarios'}] },
  { id:'diameter', label:'Diámetro', q:'Diámetro del eje o alojamiento (mm)', input:true, placeholder:'ej. 40' },
  { id:'tempCat', label:'Temperatura', q:'¿Temperatura habitual de operación?',
    opts:[{v:'normal',l:'Normal (< 70 °C)',s:'Operación estándar'},{v:'elevated',l:'Elevada (70–120 °C)',s:'Motores en alta carga'},{v:'high',l:'Alta (> 120 °C)',s:'Hornos o secadores industriales'}] },
];

/* ─── UTILITIES ─── */
const n = s => (s||'').toString().toUpperCase().replace(/[\s\-_/]+/g,'');
const fmtD = r => `⌀${r.d} × ⌀${r.D} × ${r.B} mm`;
const round3 = v => Math.round(v*1000)/1000;
function debounce(fn,ms){let t;return function(){clearTimeout(t);t=setTimeout(()=>fn.apply(this,arguments),ms);}}
function uniqBy(arr,fn){const s=new Set();return arr.filter(a=>{const k=fn(a);return !s.has(k)&&s.add(k);});}

/* ─── LOCALSTORAGE ─── */
const LS = {
  get:(k,def=[])=>{try{return JSON.parse(localStorage.getItem('lt_'+k))||def;}catch{return def;}},
  set:(k,v)=>{try{localStorage.setItem('lt_'+k,JSON.stringify(v));}catch{}},
};
function loadPrefs(){
  ST.favorites = LS.get('favorites',[]);
  ST.history = LS.get('history',[]);
  if(LS.get('dark_mode',null)==='true') document.body.classList.add('light');
  if(LS.get('tech_mode',null)==='true'){ ST.techMode=true; document.body.classList.replace('simple-mode','tech-mode'); }
}
function saveFav(ref){
  const i = ST.favorites.indexOf(ref);
  if(i>-1) ST.favorites.splice(i,1); else ST.favorites.unshift(ref);
  LS.set('favorites',ST.favorites);
}
function addHistory(q){
  if(!q) return;
  ST.history = [q,...ST.history.filter(h=>h!==q)].slice(0,12);
  LS.set('history',ST.history);
}

/* ─── DATA LOADING ─── */
async function loadData(){
  setStatus('Cargando rodamientos…');
  const [b,v,t] = await Promise.all([
    fetch('data/bearings.json').then(r=>r.json()),
    fetch('data/verified.json').then(r=>r.json()),
    fetch('data/type_desc.json').then(r=>r.json()),
  ]);
  ST.bearings = b; ST.verified = v; ST.typeDesc = t;
  document.getElementById('statRefs').textContent = b.length.toLocaleString();
  setStatus('Listo');
  buildFilters();
  renderRecent();
  renderGlossary();
  buildCalcs();
  renderClearance();
  renderRecommendedTable();
  renderBearingTypes();
  renderTolTable();
  renderFavs();
}

/* ─── SPLASH ─── */
function setStatus(s){ const el=document.getElementById('splashStatus'); if(el) el.textContent=s; }
function hideSplash(){
  const sp = document.getElementById('splash');
  if(!sp) return;
  setTimeout(()=>{
    sp.classList.add('out');
    setTimeout(()=>sp.style.display='none', 650);
  }, 2800);
}

/* ─── NAVIGATION ─── */
function switchView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  const el = document.getElementById('view-'+name);
  if(el) el.classList.add('active');
  document.querySelectorAll('.nav-item,.bn-item,.drawer__item').forEach(b=>{
    b.classList.toggle('active', b.dataset.view===name);
  });
  document.getElementById('drawerOvl').classList.remove('show');
  document.getElementById('drawer').classList.remove('show');
  window.scrollTo(0,0);
  if(name==='favorites') renderFavs();
  if(name==='search' && !document.getElementById('bearingGrid').children.length)
    renderGrid(ST.bearings.slice(0,360),{reset:true});
}

document.querySelectorAll('[data-view]').forEach(btn=>{
  btn.addEventListener('click',()=>{ switchView(btn.dataset.view); });
});

/* ─── DRAWER ─── */
document.getElementById('moreBtn').addEventListener('click',()=>{
  document.getElementById('drawerOvl').classList.add('show');
  document.getElementById('drawer').classList.add('show');
});
document.getElementById('drawerOvl').addEventListener('click',()=>{
  document.getElementById('drawerOvl').classList.remove('show');
  document.getElementById('drawer').classList.remove('show');
});

/* ─── DARK / LIGHT MODE ─── */
document.getElementById('darkToggle').addEventListener('click',()=>{
  document.body.classList.toggle('light');
  const on = document.body.classList.contains('light');
  LS.set('dark_mode', on);
  document.getElementById('darkToggle').textContent = on ? '🌙' : '☀️';
});

/* ─── TECH/SIMPLE MODE ─── */
document.getElementById('modeToggle').addEventListener('click',()=>{
  ST.techMode = !ST.techMode;
  document.body.classList.toggle('simple-mode',!ST.techMode);
  document.body.classList.toggle('tech-mode',ST.techMode);
  LS.set('tech_mode',ST.techMode);
  document.getElementById('modeToggle').classList.toggle('active',ST.techMode);
  showToast(ST.techMode ? 'Modo técnico activado' : 'Modo simple activado','ok');
});

/* ─── GREETING ─── */
function setGreeting(){
  const h = new Date().getHours();
  const g = h<12?'Buenos días':h<18?'Buenas tardes':'Buenas noches';
  const el = document.getElementById('dashGreeting');
  if(el) el.textContent = g + ' — Biblioteca Técnica';
}

/* ─── QUICK ACTIONS ─── */
const QA = [
  {view:'search',i:'🔎',l:'Buscar rodamiento',s:'Por referencia o dimensiones'},
  {view:'checker',i:'📐',l:'Verificar medida',s:'¿Dentro de tolerancia?'},
  {view:'wizard',i:'🧭',l:'Asistente de ajustes',s:'¿Qué ajuste usar?'},
  {view:'clearance',i:'🔩',l:'Holguras internas',s:'C2 · CN · C3 · C4 · C5'},
  {view:'types',i:'📖',l:'Tipos de rodamientos',s:'Biblioteca visual'},
  {view:'motor',i:'⚡',l:'Datos del motor',s:'Identificar por medidas'},
  {view:'compare',i:'⚖️',l:'Comparador',s:'Hasta 4 rodamientos'},
  {view:'equivalences',i:'🔄',l:'Equivalencias',s:'Entre fabricantes'},
];
function buildQA(){
  const g = document.getElementById('qaGrid');
  if(!g) return;
  g.innerHTML = QA.map(q=>`
    <div class="qa-card" data-view="${q.view}">
      <div class="qa-i">${q.i}</div>
      <div class="qa-l">${q.l}</div>
      <div class="qa-s">${q.s}</div>
    </div>`).join('');
  g.querySelectorAll('.qa-card').forEach(c=>c.addEventListener('click',()=>switchView(c.dataset.view)));
}

/* ─── RECENT HISTORY CHIPS ─── */
function renderRecent(){
  const wrap = document.getElementById('recentWrap');
  const chips = document.getElementById('recentChips');
  if(!wrap||!chips) return;
  if(!ST.history.length){ wrap.style.display='none'; return; }
  wrap.style.display='';
  chips.innerHTML = ST.history.map(h=>`<div class="chip" data-q="${h}">${h}</div>`).join('');
  chips.querySelectorAll('.chip').forEach(c=>c.addEventListener('click',()=>doSearch(c.dataset.q)));
}

/* ─── PARSE QUERY ─── */
function parseQ(q){
  let base = n(q);
  let suffixes = [];
  for(const s of [...SUFFIX_TOKENS].sort((a,b)=>b.length-a.length)){
    if(base.endsWith(s)){ base=base.slice(0,base.length-s.length); suffixes.push(s); }
  }
  return {base, suffixes};
}
function findByBase(b){ return ST.bearings.filter(r=>n(r.designation)===b); }
function findVerified(q){ return ST.verified.find(v=>n(v.ref).replace(/C[2-5]$/,'')===n(q).replace(/C[2-5]$/,'')); }

/* ─── AUTOCOMPLETE ─── */
let desIdx = null;
function getIdx(){
  if(desIdx) return desIdx;
  desIdx = uniqBy(ST.bearings,r=>r.designation);
  return desIdx;
}
function renderAC(q, box){
  if(!q||q.length<2){ box.classList.remove('show'); return; }
  const qn = n(q);
  const idx = getIdx();
  const ma = idx.filter(r=>n(r.designation).startsWith(qn)||n(r.designation).includes(qn)).slice(0,10);
  const mv = ST.verified.filter(v=>n(v.ref).includes(qn)).slice(0,4);
  if(!ma.length&&!mv.length){ box.classList.remove('show'); return; }
  box.innerHTML = [
    ...ma.map(r=>`<div class="ac-item" data-ref="${r.designation}"><span><b>${r.designation}</b> <small>${r.type}</small></span><span class="ac-dim">${fmtD(r)}</span></div>`),
    ...mv.map(v=>`<div class="ac-item ac-vtd" data-ref="${v.ref}"><span><b>${v.ref}</b> <small style="color:var(--green)">✓ taller</small></span><span class="ac-dim">${v.brand}</span></div>`)
  ].join('');
  box.classList.add('show');
  box.querySelectorAll('.ac-item').forEach(item=>{
    item.addEventListener('click',()=>{ box.classList.remove('show'); doSearch(item.dataset.ref); });
  });
}

function setupSearch(inputId, boxId){
  const inp = document.getElementById(inputId);
  const box = document.getElementById(boxId);
  if(!inp) return;
  inp.addEventListener('input', debounce(()=>{ if(box) renderAC(inp.value.trim(),box); },140));
  inp.addEventListener('keydown',e=>{ if(e.key==='Enter'){ if(box) box.classList.remove('show'); doSearch(inp.value.trim()); }});
  document.addEventListener('click',e=>{ if(box&&!box.contains(e.target)&&e.target!==inp) box.classList.remove('show'); });
}

/* ─── MAIN SEARCH ─── */
function doSearch(q){
  if(!q||!q.trim()) return;
  addHistory(q); renderRecent();
  const {base,suffixes} = parseQ(q);
  ST.pendingSuffixes = suffixes;
  const hits = findByBase(base);
  if(hits.length===1){ showFicha(hits[0],suffixes); return; }
  if(hits.length>1){ switchView('search'); renderGrid(hits,{reset:true}); return; }
  const loose = ST.bearings.filter(r=>n(r.designation).includes(base));
  switchView('search');
  renderGrid(loose.length?loose:ST.bearings.slice(0,360),{reset:true});
  if(!loose.length) showToast('Sin resultados exactos, mostrando catálogo','warn');
}

/* ─── SEARCH WIRING ─── */
function wireSearch(){
  setupSearch('globalSearch','acBox');
  const ds = document.getElementById('dashSearch');
  if(ds){
    ds.addEventListener('input', debounce(()=>{ if(ds.value.trim().length>1) doSearch(ds.value.trim()); },500));
    ds.addEventListener('keydown',e=>{ if(e.key==='Enter') doSearch(ds.value.trim()); });
  }
  document.getElementById('btnDim')?.addEventListener('click',()=>{
    const s=parseFloat(document.getElementById('sdShaft').value);
    const h=parseFloat(document.getElementById('sdHousing').value);
    if(isNaN(s)&&isNaN(h)){ showToast('Introduce al menos una medida','warn'); return; }
    const tol=0.05;
    let res=ST.bearings;
    if(!isNaN(s)) res=res.filter(r=>Math.abs(r.d-s)<=tol);
    if(!isNaN(h)) res=res.filter(r=>Math.abs(r.D-h)<=tol);
    renderGrid(res,{reset:true});
  });
  document.getElementById('btnClr')?.addEventListener('click',()=>{
    document.getElementById('sdShaft').value='';
    document.getElementById('sdHousing').value='';
    renderGrid(ST.bearings.slice(0,360),{reset:true});
  });
}

/* ─── FILTERS ─── */
let activeFilters = {brand:new Set(), type:''};
function buildFilters(){
  const brands = uniqBy(ST.bearings,r=>r.brand).map(r=>r.brand).sort();
  const types = uniqBy(ST.bearings,r=>r.type).map(r=>r.type).sort();
  const bf = document.getElementById('brandFilter');
  if(bf){
    bf.innerHTML = brands.map(b=>`<div class="chip" data-brand="${b}">${b}</div>`).join('');
    bf.querySelectorAll('.chip').forEach(c=>{
      c.addEventListener('click',()=>{
        const br=c.dataset.brand;
        c.classList.toggle('on');
        activeFilters.brand.has(br)?activeFilters.brand.delete(br):activeFilters.brand.add(br);
        applyFilters();
      });
    });
  }
  const tf = document.getElementById('typeFilter');
  if(tf){
    tf.innerHTML = '<div class="chip on" data-type="">Todos</div>'+types.slice(0,8).map(t=>`<div class="chip" data-type="${t}">${t.replace('Rigido','Ríg.').replace('cilindricos','cil.').replace('esfericos','esfér.').split(' ').slice(0,3).join(' ')}</div>`).join('');
    tf.querySelectorAll('.chip').forEach(c=>{
      c.addEventListener('click',()=>{
        tf.querySelectorAll('.chip').forEach(x=>x.classList.remove('on'));
        c.classList.add('on'); activeFilters.type=c.dataset.type; applyFilters();
      });
    });
  }
}
function applyFilters(){
  let res=ST.bearings;
  if(activeFilters.brand.size) res=res.filter(r=>activeFilters.brand.has(r.brand));
  if(activeFilters.type) res=res.filter(r=>r.type===activeFilters.type);
  renderGrid(res,{reset:true});
}

/* ─── BEARING GRID ─── */
function renderGrid(list,opts={}){
  if(opts.reset) ST.page=0;
  ST.lastResults=list;
  const rc=document.getElementById('resCount');
  if(rc) rc.textContent=list.length+' resultado(s)';
  const grid=document.getElementById('bearingGrid');
  if(!grid) return;
  if(opts.reset) grid.innerHTML='';
  const slice=list.slice(0,(ST.page+1)*ST.pageSize);
  slice.forEach(r=>{
    if(grid.querySelector(`[data-id="${r.id}"]`)) return;
    grid.appendChild(makeBCard(r));
  });
  // Load more
  const existing=grid.querySelector('.load-more-btn');
  if(existing) existing.remove();
  if(slice.length<list.length){
    const btn=document.createElement('button');
    btn.className='btn btn-ghost btn-full load-more-btn';
    btn.style.gridColumn='1/-1';
    btn.textContent=`Mostrar más (${list.length-slice.length} restantes)`;
    btn.onclick=()=>{ ST.page++; renderGrid(list); };
    grid.appendChild(btn);
  }
}

function makeBCard(r){
  const vtd=findVerified(r.designation+r.brand);
  const isFav=ST.favorites.includes(r.designation);
  const div=document.createElement('div');
  div.className='bcard';
  div.dataset.id=r.id;
  div.innerHTML=`
    <div class="bcard__head">
      <div><div class="bcard__ref">${r.designation}</div><div class="bcard__type">${r.type}</div></div>
      <div style="display:flex;align-items:center;gap:6px">
        <button class="fav-btn ${isFav?'on':''}" data-ref="${r.designation}" title="Favorito">★</button>
        <span class="bcard__brand">${r.brand}</span>
      </div>
    </div>
    <div class="bcard__dims"><span>${fmtD(r)}</span></div>
    <div class="bcard__meta">
      <span class="bcard__spec">Cr≈${r.Cr_kN} kN</span>
      <span class="bcard__spec">C0r≈${r.C0r_kN} kN</span>
      <span class="bcard__spec">n≈${r.nmax_rpm} rpm</span>
    </div>
    ${vtd?'<div class="bcard__vtd">✓ Verificado en taller</div>':''}
    <div class="bcard__actions">
      <button class="btn btn-p btn-ficha">Ver ficha</button>
      <button class="btn btn-cmp">+ Comparar</button>
    </div>`;
  div.querySelector('.fav-btn').addEventListener('click',e=>{
    e.stopPropagation();
    const ref=e.currentTarget.dataset.ref;
    saveFav(ref);
    e.currentTarget.classList.toggle('on',ST.favorites.includes(ref));
    showToast(ST.favorites.includes(ref)?'Guardado en favoritos':'Eliminado de favoritos','ok');
  });
  div.querySelector('.btn-ficha').addEventListener('click',()=>showFicha(r,ST.pendingSuffixes));
  div.querySelector('.btn-cmp').addEventListener('click',()=>addCompare(r));
  return div;
}

/* ─── SVG BEARING VISUALIZATION ─── */
function makeBearingSVG(family,d,D,B,seal){
  const S=220,cx=S/2,cy=S/2,m=14;
  const ppm=(S-m*2)/(D);
  const rO=(D/2)*ppm, rI=(d/2)*ppm;
  const tw=Math.max(5,rO*0.13);
  const rOi=rO-tw, rIo=rI+tw;
  const rMid=(rOi+rIo)/2;
  const rEl=(rOi-rIo)/2*0.72;
  const nEl=Math.max(5,Math.round(Math.PI*rMid/(rEl*2.6)));
  const C1='#1a3a72',C2='#2559b5',C3='#4d83f5',CS='#7aabde',CH='#0d1f3c',CB='#060e1c';
  let els='';
  if(family==='rodillos_cil'||family==='contacto_angular_2h'){
    for(let i=0;i<nEl;i++){
      const a=(i/nEl)*Math.PI*2-Math.PI/2;
      const bx=cx+Math.cos(a)*rMid,by=cy+Math.sin(a)*rMid;
      const deg=(a*180/Math.PI)+90;
      const rl=rEl*0.45,rh=rEl*1.6;
      els+=`<rect x="${(bx-rl).toFixed(1)}" y="${(by-rh).toFixed(1)}" width="${(rl*2).toFixed(1)}" height="${(rh*2).toFixed(1)}" rx="2" fill="${CS}" stroke="${C3}" stroke-width=".7" transform="rotate(${deg.toFixed(1)},${bx.toFixed(1)},${by.toFixed(1)})"/>`;
    }
  } else if(family==='esfericos'){
    const nRow=Math.floor(nEl/2);
    for(let row=0;row<2;row++){
      for(let i=0;i<nRow;i++){
        const a=(i/nRow)*Math.PI*2-Math.PI/2+(row*Math.PI/nRow);
        const bx=cx+Math.cos(a)*rMid,by=cy+Math.sin(a)*rMid;
        els+=`<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="${(rEl*.85).toFixed(1)}" fill="${CS}" stroke="${C3}" stroke-width=".7"/>`;
      }
    }
  } else if(family==='agujas'){
    const nN=Math.min(nEl*2,22);
    for(let i=0;i<nN;i++){
      const a=(i/nN)*Math.PI*2-Math.PI/2;
      const bx=cx+Math.cos(a)*rMid,by=cy+Math.sin(a)*rMid;
      const deg=(a*180/Math.PI)+90;
      const nl=1.2,nh=rEl*2.2;
      els+=`<rect x="${(bx-nl).toFixed(1)}" y="${(by-nh).toFixed(1)}" width="${(nl*2).toFixed(1)}" height="${(nh*2).toFixed(1)}" rx="1" fill="${CS}" transform="rotate(${deg.toFixed(1)},${bx.toFixed(1)},${by.toFixed(1)})"/>`;
    }
  } else {
    // bolas (default)
    for(let i=0;i<nEl;i++){
      const a=(i/nEl)*Math.PI*2-Math.PI/2;
      const bx=cx+Math.cos(a)*rMid,by=cy+Math.sin(a)*rMid;
      const gr=`bg${i}`;
      els+=`<defs><radialGradient id="${gr}" cx="35%" cy="35%" r="60%"><stop offset="0%" stop-color="#c5d8f0"/><stop offset="100%" stop-color="${CS}"/></radialGradient></defs><circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="${rEl.toFixed(1)}" fill="url(#${gr})" stroke="${C3}" stroke-width=".8"/>`;
    }
  }
  const cR1=rMid-rEl-1.5,cR2=rMid+rEl+1.5;
  let sealSvg='';
  if(seal==='2Z'||seal==='ZZ'||seal==='Z')
    sealSvg=`<circle cx="${cx}" cy="${cy}" r="${(rOi+2).toFixed(1)}" fill="none" stroke="#6a8fc4" stroke-width="1.5" stroke-dasharray="5 2.5"/><circle cx="${cx}" cy="${cy}" r="${(rIo-2).toFixed(1)}" fill="none" stroke="#6a8fc4" stroke-width="1.5" stroke-dasharray="5 2.5"/>`;
  else if(seal==='2RS'||seal==='DDU'||seal==='LLU'||seal==='RS')
    sealSvg=`<circle cx="${cx}" cy="${cy}" r="${(rOi+2).toFixed(1)}" fill="none" stroke="#e05a60" stroke-width="2" stroke-dasharray="7 2"/><circle cx="${cx}" cy="${cy}" r="${(rIo-2).toFixed(1)}" fill="none" stroke="#e05a60" stroke-width="2" stroke-dasharray="7 2"/>`;
  const AC='#3b7af0';
  return `<svg viewBox="0 0 ${S} ${S}" xmlns="http://www.w3.org/2000/svg">
  <defs><radialGradient id="gO" cx="50%" cy="50%" r="50%"><stop offset="60%" stop-color="${C2}"/><stop offset="100%" stop-color="${C1}"/></radialGradient>
  <radialGradient id="gI" cx="50%" cy="50%" r="50%"><stop offset="60%" stop-color="${C2}"/><stop offset="100%" stop-color="${C1}"/></radialGradient></defs>
  <circle cx="${cx}" cy="${cy}" r="${rO.toFixed(1)}" fill="url(#gO)" stroke="${C3}" stroke-width="1.2"/>
  <circle cx="${cx}" cy="${cy}" r="${rOi.toFixed(1)}" fill="${CH}"/>
  ${els}
  ${sealSvg}
  <circle cx="${cx}" cy="${cy}" r="${(cR1).toFixed(1)}" fill="none" stroke="#3a5a8a" stroke-width=".5" stroke-dasharray="3 3" opacity=".6"/>
  <circle cx="${cx}" cy="${cy}" r="${(cR2).toFixed(1)}" fill="none" stroke="#3a5a8a" stroke-width=".5" stroke-dasharray="3 3" opacity=".6"/>
  <circle cx="${cx}" cy="${cy}" r="${rIo.toFixed(1)}" fill="url(#gI)" stroke="${C3}" stroke-width="1.2"/>
  <circle cx="${cx}" cy="${cy}" r="${rI.toFixed(1)}" fill="${CB}"/>
  <line x1="${cx}" y1="${cy}" x2="${(cx+rI*.85).toFixed(1)}" y2="${cy}" stroke="${AC}" stroke-width=".8"/>
  <text x="${(cx+rI*.42).toFixed(1)}" y="${(cy-4)}" text-anchor="middle" fill="${AC}" font-size="8.5" font-family="monospace">d=${d}</text>
  <line x1="${cx}" y1="${(cy+rO*.55).toFixed(1)}" x2="${(cx+rO).toFixed(1)}" y2="${(cy+rO*.55).toFixed(1)}" stroke="${AC}" stroke-width=".8"/>
  <text x="${(cx+rO*.5).toFixed(1)}" y="${(cy+rO*.55+11)}" text-anchor="middle" fill="${AC}" font-size="8.5" font-family="monospace">D=${D}</text>
</svg>`;
}

/* ─── FICHA TÉCNICA ─── */
function showFicha(r,suffixes=[]){
  switchView('ficha');
  const sealG=suffixes.map(s=>SEAL_NORM[s]).find(Boolean);
  const sealCode=sealG&&SEAL[r.brand]?.[sealG];
  const displaySfx=suffixes.map(s=>SEAL_NORM[s]?(sealCode||s):s).filter((s,i,a)=>a.indexOf(s)===i);
  const fullRef=r.designation+(displaySfx.length?' '+displaySfx.join(' '):'');
  const clearance=suffixes.find(s=>['C2','C3','C4','C5','CN'].includes(s));
  const special=suffixes.filter(s=>['INSOCOAT','EXPLORER','HIBRIDO','CERAMICO'].includes(s));
  const vtd=findVerified(r.designation);
  const isFav=ST.favorites.includes(r.designation);

  document.getElementById('fichaWrap').innerHTML=`
  <div class="ficha-hero">
    <div class="ficha-hero__top">
      <div>
        <h1>${r.brand} ${fullRef}</h1>
        <div class="ficha-hero__sub">${r.type} · Serie ${r.series}</div>
      </div>
      <div class="ficha-hero__actions">
        <button class="fav-btn ${isFav?'on':''}" id="fichaFav" data-ref="${r.designation}" title="Favorito">★</button>
        <button class="btn btn-sm btn-cmp2">+ Comparar</button>
      </div>
    </div>
    <div class="ficha-hero__tags">
      <span class="tag blue">${r.type}</span>
      <span class="tag">Serie ${r.series}</span>
      ${clearance?`<span class="tag amber">Juego ${clearance}</span>`:''}
      ${sealCode?`<span class="tag">Sellado ${sealCode}</span>`:''}
      ${special.map(s=>`<span class="tag blue">${s}</span>`).join('')}
      ${vtd?`<span class="tag green">✓ Verificado en taller</span>`:''}
    </div>
    <div class="ficha-dims"><div class="readout lg">${fmtD(r)}</div></div>
  </div>

  <div class="tab-bar">
    <button class="tab-btn active" data-tab="resumen">Resumen</button>
    <button class="tab-btn" data-tab="dimensiones">Dimensiones</button>
    <button class="tab-btn" data-tab="tolerancias">Tolerancias</button>
    <button class="tab-btn" data-tab="lubricacion">Lubricación</button>
    <button class="tab-btn" data-tab="equivalencias">Equivalencias</button>
    <button class="tab-btn tech-only" data-tab="metrologia">Metrología</button>
  </div>

  <div class="tab-content active" id="tc-resumen">
    <div class="ficha-grid">
      <div>
        <table class="spec-table">
          <tr><td>Rodamiento</td><td>${r.brand} ${fullRef}</td></tr>
          <tr><td>Tipo</td><td>${r.type}</td></tr>
          <tr><td>Serie</td><td>${r.series}</td></tr>
          <tr><td>Fabricante</td><td>${r.brand}</td></tr>
          <tr><td>Diámetro interior d</td><td>${r.d} mm</td></tr>
          <tr><td>Diámetro exterior D</td><td>${r.D} mm</td></tr>
          <tr><td>Ancho / altura B</td><td>${r.B} mm</td></tr>
          <tr><td>Capacidad dinámica Cr</td><td>≈ ${r.Cr_kN} kN *</td></tr>
          <tr><td>Capacidad estática C0r</td><td>≈ ${r.C0r_kN} kN *</td></tr>
          <tr><td>Velocidad máxima (grasa)</td><td>≈ ${r.nmax_rpm} rpm *</td></tr>
          <tr><td>Peso aproximado</td><td>≈ ${r.weight_kg} kg *</td></tr>
          <tr><td>Juego interno</td><td>${clearance||'Consultar (CN/C3)'}</td></tr>
          <tr><td>Sellado</td><td>${sealCode||'Abierto (sin sello)'}</td></tr>
          <tr><td>Material</td><td>${r.material}</td></tr>
          <tr><td>Norma</td><td>${r.norm}</td></tr>
        </table>
        <p class="note info" style="margin-top:12px;font-size:12px;">* Valores orientativos de referencia por escalado dimensional. Verificar con catálogo oficial del fabricante.</p>
        ${vtd?`<div class="card" style="margin-top:14px;background:var(--green-pale);border-color:var(--green-bdr);">
          <h3 style="color:var(--green)">✓ Datos verificados en taller</h3>
          <table class="spec-table"><tr><td>Referencia medida</td><td>${vtd.ref}</td></tr><tr><td>Marca registrada</td><td>${vtd.brand}</td></tr><tr><td>Alojamiento D medido</td><td>${vtd.OD_min} – ${vtd.OD_max} mm</td></tr><tr><td>Eje d medido</td><td>${vtd.ID_min} – ${vtd.ID_max} mm</td></tr></table>
        </div>`:''}
      </div>
      <div>
        <div class="viz-wrap">
          ${makeBearingSVG(r.family,r.d,r.D,r.B,sealG)}
          <div class="viz-label">${r.type}</div>
          <div class="viz-dims"><span>d=${r.d}</span><span>D=${r.D}</span><span>B=${r.B}</span></div>
        </div>
        <div class="card" style="margin-top:14px;">
          <h3>ℹ️ ¿Qué significa este tipo?</h3>
          <p style="font-size:13.5px;color:var(--text2);line-height:1.6;">${ST.typeDesc[r.type]||'Consultar catálogo del fabricante.'}</p>
        </div>
      </div>
    </div>
  </div>

  <div class="tab-content" id="tc-dimensiones">
    <div class="ficha-grid">
      <div>
        <h3>Dimensiones principales (ISO 15)</h3>
        <table class="spec-table">
          <tr><td>Diámetro interior d</td><td>${r.d} mm</td></tr>
          <tr><td>Diámetro exterior D</td><td>${r.D} mm</td></tr>
          <tr><td>Ancho B</td><td>${r.B} mm</td></tr>
          <tr><td>Relación d/D</td><td>${(r.d/r.D).toFixed(3)}</td></tr>
          <tr><td>Ancho/D</td><td>${(r.B/r.D).toFixed(3)}</td></tr>
        </table>
        <p class="note info" style="margin-top:12px;font-size:12px;">Las dimensiones de acoplamiento (d, D, B) son intercambiables entre todos los fabricantes conforme a ISO 15.</p>
      </div>
      <div>
        <div class="viz-wrap">${makeBearingSVG(r.family,r.d,r.D,r.B,sealG)}</div>
      </div>
    </div>
  </div>

  <div class="tab-content" id="tc-tolerancias">
    <h3>Tolerancias de eje — ⌀${r.d} mm</h3>
    ${renderShaftTolHTML(r.d)}
    <hr class="divider">
    <h3>Tolerancias de alojamiento — ⌀${r.D} mm</h3>
    ${renderHousingTolHTML(r.D)}
    <p class="note warn" style="margin-top:14px;"><span class="ni">⚠️</span><span>Valores normalizados de referencia técnica (ISO 286). Verificar siempre con catálogo oficial para aplicaciones críticas.</span></p>
  </div>

  <div class="tab-content" id="tc-lubricacion">
    ${renderLubrication(r)}
  </div>

  <div class="tab-content" id="tc-equivalencias">
    <h3>Equivalencias dimensionales</h3>
    <p style="color:var(--text2);font-size:13px;margin-bottom:14px;">Mismas dimensiones ISO ${r.d}×${r.D}×${r.B} mm y tipo. Los sufijos de sellado y claridad corresponden a la convención de cada fabricante.</p>
    ${renderEquivHTML(r,sealG,clearance)}
  </div>

  <div class="tab-content tech-only" id="tc-metrologia">
    ${renderMetrologyHTML(r)}
  </div>`;

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
      btn.classList.add('active');
      const tc=document.getElementById('tc-'+btn.dataset.tab);
      if(tc) tc.classList.add('active');
    });
  });
  document.getElementById('fichaFav')?.addEventListener('click',e=>{
    const ref=e.currentTarget.dataset.ref;
    saveFav(ref);
    e.currentTarget.classList.toggle('on',ST.favorites.includes(ref));
    showToast(ST.favorites.includes(ref)?'Guardado en favoritos':'Eliminado de favoritos','ok');
  });
  document.querySelector('.btn-cmp2')?.addEventListener('click',()=>addCompare(r));
}

/* ─── TOLERANCE TABLES IN FICHA ─── */
function renderShaftTolHTML(d){
  const cls=['j6','k5','k6','m5','m6','n6','p6','r6'];
  let rows=cls.map(c=>{
    const rv=ISO286.shaftLimits(c,d); if(!rv) return '';
    const min=(d+rv.ei/1000).toFixed(3),max=(d+rv.es/1000).toFixed(3);
    const rec=['k5','k6'].includes(c)?'<span style="color:var(--green);font-size:11px;">★ Motor</span>':'';
    return `<tr><td>${c} ${rec}</td><td>${rv.ei>=0?'+':''}${rv.ei} µm</td><td>${rv.es>=0?'+':''}${rv.es} µm</td><td>${min}</td><td>${max}</td></tr>`;
  }).join('');
  return `<table class="tol-table"><tr><th>Ajuste</th><th>ei</th><th>es</th><th>d mín (mm)</th><th>d máx (mm)</th></tr>${rows}</table>`;
}
function renderHousingTolHTML(D){
  const cls=['H6','H7','J6','J7','K6','K7','M6','M7','N7'];
  let rows=cls.map(c=>{
    const rv=ISO286.housingLimits(c,D); if(!rv) return '';
    const min=(D+rv.EI/1000).toFixed(3),max=(D+rv.ES/1000).toFixed(3);
    const rec=['H7','J7'].includes(c)?'<span style="color:var(--green);font-size:11px;">★ Motor</span>':'';
    return `<tr><td>${c} ${rec}</td><td>${rv.EI>=0?'+':''}${rv.EI} µm</td><td>${rv.ES>=0?'+':''}${rv.ES} µm</td><td>${min}</td><td>${max}</td></tr>`;
  }).join('');
  return `<table class="tol-table"><tr><th>Ajuste</th><th>EI</th><th>ES</th><th>D mín (mm)</th><th>D máx (mm)</th></tr>${rows}</table>`;
}

/* ─── LUBRICATION TAB ─── */
function renderLubrication(r){
  const speed = r.nmax_rpm>=6000?'Alta':r.nmax_rpm>=3000?'Media':'Baja';
  return `
    <div class="note warn" style="margin-bottom:16px;"><span class="ni">⚠️</span><span><b>Valores orientativos generales.</b> Para especificaciones precisas de grasa, cantidad y reengrase, consultar siempre el catálogo oficial del fabricante (${r.brand}).</span></div>
    <div class="ficha-grid">
      <div>
        <table class="spec-table">
          <tr><td>Tipo de lubricante</td><td>Grasa de litio EP NLGI 2 *</td></tr>
          <tr><td>Temperatura máx. grasa</td><td>120 °C (grasa estándar) *</td></tr>
          <tr><td>Relleno típico</td><td>30 – 50 % del espacio libre *</td></tr>
          <tr><td>Velocidad de referencia</td><td>${speed} (≈ ${r.nmax_rpm} rpm máx.) *</td></tr>
          <tr><td>Intervalo de reengrase</td><td>Según condiciones de operación *</td></tr>
          <tr><td>Sellado actual</td><td>${r.family==='bolas'?'Variable según sufijo solicitado':'Consultar fabricante'}</td></tr>
        </table>
        <p class="note info" style="margin-top:12px;font-size:12px;">* Recomendación general de ingeniería (FUENTE: práctica estándar de mantenimiento industrial). No sustituye al catálogo oficial del fabricante.</p>
      </div>
      <div>
        <div class="card" style="background:var(--amber-pale);border-color:var(--amber-bdr);">
          <h3 style="color:var(--amber)">⚠️ No mezclar tipos de grasa</h3>
          <p style="font-size:13px;color:var(--text2);">Si el rodamiento ya contiene grasa de otro tipo, limpiar completamente antes de re-lubricar. La mezcla de grasas incompatibles puede causar degradación acelerada.</p>
        </div>
        <div class="card">
          <h3>🌡️ Temperatura y lubricación</h3>
          <p style="font-size:13px;color:var(--text2);">A temperatura elevada (> 70 °C) reducir el intervalo de reengrase. Para altas velocidades, usar grasa de baja viscosidad. Para bajas velocidades y cargas pesadas, grasa de alta viscosidad.</p>
        </div>
      </div>
    </div>`;
}

/* ─── METROLOGÍA TAB ─── */
function renderMetrologyHTML(r){
  return `
    <div class="sh" style="margin-bottom:16px;"><h1 style="font-size:18px;">Módulo de metrología</h1><p>Registra las medidas reales tomadas para calcular desviaciones, ovalidad y conicidad.</p></div>
    <div class="ficha-grid">
      <div>
        <h3>Medidas del eje (d nominal = ${r.d} mm)</h3>
        <div class="field-row"><div class="field"><label>Eje LA (mm)</label><input type="number" step="0.001" id="metShaftLA" class="measure-input" placeholder="${r.d}.000"></div><div class="field"><label>Eje LV (mm)</label><input type="number" step="0.001" id="metShaftLV" class="measure-input" placeholder="${r.d}.000"></div></div>
        <h3 style="margin-top:12px;">Medidas del alojamiento (D nominal = ${r.D} mm)</h3>
        <div class="field-row"><div class="field"><label>Alojamiento LA (mm)</label><input type="number" step="0.001" id="metHousLA" class="measure-input" placeholder="${r.D}.000"></div><div class="field"><label>Alojamiento LV (mm)</label><input type="number" step="0.001" id="metHousLV" class="measure-input" placeholder="${r.D}.000"></div></div>
        <button class="btn btn-p btn-full" id="btnMetCalc" data-d="${r.d}" data-D="${r.D}" style="margin-top:8px;">Calcular desviaciones</button>
        <div id="metResult" style="margin-top:16px;"></div>
      </div>
      <div>
        <div class="card" style="background:var(--sky-pale);border-color:rgba(56,189,248,.25);">
          <h3 style="color:var(--sky)">📏 Indicadores</h3>
          <p style="font-size:13px;color:var(--text2);">🟢 Dentro de parámetros<br>🟡 Revisar — cerca del límite<br>🔴 Fuera de parámetros — requiere corrección</p>
        </div>
        <div class="card"><h3>ℹ️ ¿Qué medir?</h3><p style="font-size:13px;color:var(--text2);">Medir el eje en dos posiciones axiales y dos posiciones angulares (0° y 90°) para detectar ovalidad y conicidad. Mismo procedimiento para el alojamiento.</p></div>
      </div>
    </div>`;
}
document.addEventListener('click',e=>{
  if(e.target.id==='btnMetCalc'){
    const dn=parseFloat(e.target.dataset.d),Dn=parseFloat(e.target.dataset.D);
    const sLA=parseFloat(document.getElementById('metShaftLA').value);
    const sLV=parseFloat(document.getElementById('metShaftLV').value);
    const hLA=parseFloat(document.getElementById('metHousLA').value);
    const hLV=parseFloat(document.getElementById('metHousLV').value);
    const res=document.getElementById('metResult');
    let html='';
    if(!isNaN(sLA)&&!isNaN(sLV)){
      const avg=((sLA+sLV)/2).toFixed(3),dev=(avg-dn).toFixed(3),oval=Math.abs(sLA-sLV).toFixed(3);
      const st=Math.abs(dev)<0.02?'ok':Math.abs(dev)<0.05?'warn':'bad';
      html+=`<div class="result-badge ${st}"><span class="rb-icon">${st==='ok'?'🟢':st==='warn'?'🟡':'🔴'}</span><div><b>Eje — promedio ${avg} mm</b><br><small>Desv. nominal: ${dev>=0?'+':''}${dev} mm · Ovalidad: ${oval} mm</small></div></div>`;
    }
    if(!isNaN(hLA)&&!isNaN(hLV)){
      const avg=((hLA+hLV)/2).toFixed(3),dev=(avg-Dn).toFixed(3),oval=Math.abs(hLA-hLV).toFixed(3);
      const st=Math.abs(dev)<0.025?'ok':Math.abs(dev)<0.06?'warn':'bad';
      html+=`<div class="result-badge ${st}" style="margin-top:8px;"><span class="rb-icon">${st==='ok'?'🟢':st==='warn'?'🟡':'🔴'}</span><div><b>Alojamiento — promedio ${avg} mm</b><br><small>Desv. nominal: ${dev>=0?'+':''}${dev} mm · Ovalidad: ${oval} mm</small></div></div>`;
    }
    res.innerHTML=html||'<p class="note warn"><span class="ni">⚠️</span><span>Introduce al menos una pareja de medidas.</span></p>';
  }
});

/* ─── EQUIV HTML (ficha tab) ─── */
function renderEquivHTML(r,sealG,clearance){
  const same=ST.bearings.filter(rx=>rx.d===r.d&&rx.D===r.D&&rx.B===r.B&&rx.type===r.type);
  const by=uniqBy(same,rx=>rx.brand);
  return '<div class="equiv-chain">'+by.map((rx,i)=>{
    const sc=sealG&&SEAL[rx.brand]?SEAL[rx.brand][sealG]||'':'';
    const sfx=(sc?' '+sc:'')+(clearance?' '+clearance:'');
    return `<div class="equiv-row"><b>${rx.brand}</b><span>${rx.designation}${sfx}</span></div>${i<by.length-1?'<div class="equiv-arrow">↓</div>':''}`;
  }).join('')+'</div>';
}

/* ─── BEARING TYPES LIBRARY ─── */
function renderBearingTypes(){
  const g=document.getElementById('typesGrid');
  if(!g) return;
  g.innerHTML=BEAR_TYPES.map(t=>`
    <div class="type-card" data-key="${t.key}">
      <div class="type-card__viz">${makeBearingSVG(t.key,40,80,18,'')}</div>
      <div class="type-card__body">
        <div class="type-card__name">${t.icon} ${t.name}</div>
        <div class="type-card__desc">${t.desc}</div>
        <div class="type-card__loads">
          <span class="load-badge radial">Radial: ${t.radial}</span>
          <span class="load-badge axial">Axial: ${t.axial}</span>
          <span class="load-badge speed">Vel: ${t.speed}</span>
          ${t.self?'<span class="load-badge both">Autoalineante</span>':''}
          ${t.motor?'<span class="load-badge both">✓ Motores</span>':''}
        </div>
      </div>
    </div>`).join('');
  g.querySelectorAll('.type-card').forEach(c=>{
    c.addEventListener('click',()=>{
      const t=BEAR_TYPES.find(x=>x.key===c.dataset.key);
      if(!t) return;
      switchView('search');
      const res=ST.bearings.filter(r=>r.family===t.key);
      renderGrid(res,{reset:true});
      showToast(`Mostrando ${res.length} rodamientos de tipo ${t.name}`,'ok');
    });
  });
}

/* ─── MOTOR ANALYSIS ─── */
document.getElementById('btnMotor')?.addEventListener('click',()=>{
  const hLA=parseFloat(document.getElementById('mHLA').value);
  const sLA=parseFloat(document.getElementById('mSLA').value);
  const hLV=parseFloat(document.getElementById('mHLV').value);
  const sLV=parseFloat(document.getElementById('mSLV').value);
  const out=document.getElementById('motorRes');
  if([hLA,sLA,hLV,sLV].every(isNaN)){ out.innerHTML='<p class="note warn"><span class="ni">⚠️</span><span>Introduce al menos una medida.</span></p>'; return; }
  const tol=0.08;
  function suggest(label,d,D){
    let res=ST.bearings.filter(r=>(!isNaN(d)&&Math.abs(r.d-d)<=tol||isNaN(d))&&(!isNaN(D)&&Math.abs(r.D-D)<=tol||isNaN(D)));
    res=uniqBy(res,r=>r.designation+r.brand);
    res.sort((a,b)=>(a.type.includes('Rigido')?-1:1)-(b.type.includes('Rigido')?-1:1));
    const div=document.createElement('div');
    div.className='card';
    div.style.marginBottom='16px';
    div.innerHTML=`<h3>${label} — eje ${isNaN(d)?'—':d} mm / alojamiento ${isNaN(D)?'—':D} mm</h3>`;
    if(!res.length){ div.innerHTML+=`<p class="note warn"><span class="ni">⚠️</span><span>Sin coincidencias ±${tol} mm. Revisa las medidas.</span></p>`; }
    else{ const g=document.createElement('div'); g.className='b-grid'; res.slice(0,8).forEach(r=>g.appendChild(makeBCard(r))); div.appendChild(g); }
    return div;
  }
  out.innerHTML='';
  out.appendChild(suggest('🔵 Lado acople (LA)',sLA,hLA));
  out.appendChild(suggest('🟢 Lado libre (LV)',sLV,hLV));
});

/* ─── FIT WIZARD ─── */
function buildWizard(){
  const lastStep=WIZ_STEPS.length;
  const ws=ST.wizardState;
  const cur=ws.step;
  const prog=document.getElementById('wizProg');
  if(prog){
    prog.innerHTML=WIZ_STEPS.map((s,i)=>{
      const done=i<cur,active=i===cur;
      return `<div class="wiz-step ${active?'ws-cur':''}">
        <div class="ws-dot ${done?'done':active?'cur':''}">${done?'✓':(i+1)}</div>
        <span class="ws-lbl">${s.label}</span>
      </div>${i<WIZ_STEPS.length-1?`<div class="ws-line ${i<cur?'done':''}"></div>`:''}`; }).join('');
  }
  const sc=document.getElementById('wizStep');
  if(!sc) return;
  if(cur===lastStep){ renderWizResult(); return; }
  const step=WIZ_STEPS[cur];
  if(step.input){
    sc.innerHTML=`<div class="wiz-q">${step.q}</div>
      <input type="number" inputmode="decimal" id="wizInput" placeholder="${step.placeholder}" class="measure-input" value="${ws.diameter||''}">`;
  } else {
    sc.innerHTML=`<div class="wiz-q">${step.q}</div>
      <div class="wiz-opts">${step.opts.map(o=>`
        <div class="wopt ${ws[step.id]===o.v?'sel':''}" data-v="${o.v}">
          <div class="wopt__l">${o.l}</div>
          ${o.s?`<div class="wopt__s">${o.s}</div>`:''}
        </div>`).join('')}</div>`;
    sc.querySelectorAll('.wopt').forEach(opt=>{
      opt.addEventListener('click',()=>{
        sc.querySelectorAll('.wopt').forEach(x=>x.classList.remove('sel'));
        opt.classList.add('sel');
        ws[step.id]=opt.dataset.v;
        setTimeout(()=>{ ws.step++; buildWizard(); },200);
      });
    });
  }
  const nav=document.getElementById('wizNav');
  nav.innerHTML=`
    ${cur>0?'<button class="btn btn-ghost" id="wizBack">← Anterior</button>':''}
    <button class="btn btn-ghost" id="wizReset">Reiniciar</button>
    ${step.input?'<button class="btn btn-p" id="wizNext">Siguiente →</button>':''}`;
  nav.querySelector('#wizBack')?.addEventListener('click',()=>{ ws.step--; buildWizard(); });
  nav.querySelector('#wizReset')?.addEventListener('click',resetWizard);
  nav.querySelector('#wizNext')?.addEventListener('click',()=>{
    const v=parseFloat(document.getElementById('wizInput')?.value);
    if(isNaN(v)){ showToast('Introduce un valor numérico','warn'); return; }
    ws[step.id]=v; ws.step++; buildWizard();
  });
}
function resetWizard(){
  ST.wizardState={step:0,component:null,bearingType:null,innerRotates:null,loadType:null,speed:null,tempCat:null,diameter:null};
  buildWizard();
}
function renderWizResult(){
  const ws=ST.wizardState;
  const d=ws.diameter||50;
  const rotates=ws.innerRotates==='yes';
  const shock=ws.loadType==='shock';
  const heavy=shock||ws.loadType==='heavy';
  const highTemp=ws.tempCat==='high'||ws.tempCat==='elevated';
  let fit,reason,source;
  const notes=[];
  if(ws.component==='shaft'){
    if(rotates){
      if(shock){fit='n6';reason='La carga de choque requiere interferencia fuerte para evitar el deslizamiento del aro interior bajo impacto. n6 garantiza una sujeción segura.';}
      else if(heavy){fit=d<80?'m6':'n6';reason='Carga pesada con aro interior giratorio. La interferencia moderada a fuerte es necesaria para mantener el aro interior fijo durante la operación.';}
      else{fit=d<40?'k5':'k6';reason='Carga normal con aro interior giratorio. k6 proporciona interferencia leve que garantiza la fijación del aro sin dificultar excesivamente el desmontaje.';}
      if(highTemp) notes.push('⚠️ A temperatura elevada el eje se dilata más que el aro. El ajuste resultante puede ser mayor de lo calculado. Considerar reducir un grado de interferencia si la diferencia de temperatura es grande.');
    } else {
      fit='j6'; reason='El aro interior permanece estacionario. Un ajuste de transición o ligero juego permite el montaje y desmontaje sin daño al eje.';
    }
    source='ISO 492 Tabla 7 · SKF Bearing Maintenance Handbook';
  } else {
    if(heavy){ fit='M7'; reason='Carga pesada o de choque. M7 proporciona ligera interferencia en el alojamiento para mantener el aro exterior fijo bajo cargas elevadas.'; }
    else { fit='H7'; reason='El aro exterior permanece estacionario (caso más común en motores eléctricos). H7 permite el montaje y desmontaje sin daño al alojamiento.'; }
    source='ISO 492 Tabla 7 · FAG Rolling Bearings Technical Principles';
  }
  const sc=document.getElementById('wizStep');
  sc.innerHTML=`
    <div class="rec-card">
      <div style="text-align:center;font-size:12px;color:var(--text2);text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px;">Ajuste recomendado</div>
      <div class="rec-fit">${fit}</div>
      <div class="rec-reason"><b>¿Por qué?</b><br>${reason}</div>
      ${notes.map(note=>`<div class="rec-warn"><span>⚠️</span><span>${note}</span></div>`).join('')}
      <div class="rec-src">Fuente: ${source}</div>
    </div>
    <div class="rec-warn" style="margin-top:14px;"><span>⚠️</span><span>Esta recomendación debe verificarse siempre con la especificación del fabricante del rodamiento y las condiciones reales de operación del equipo. No sustituye al cálculo de ingeniería formal.</span></div>`;
  const nav=document.getElementById('wizNav');
  nav.innerHTML=`
    <button class="btn btn-ghost" id="wizReset">Nuevo cálculo</button>
    <button class="btn btn-p" id="wizVerify">Verificar medida con ${fit}</button>`;
  nav.querySelector('#wizReset').addEventListener('click',resetWizard);
  nav.querySelector('#wizVerify').addEventListener('click',()=>{
    document.getElementById('chkFit').value=fit;
    switchView('checker');
  });
  document.getElementById('wizProg').innerHTML=WIZ_STEPS.map((s,i)=>`<div class="wiz-step"><div class="ws-dot done">✓</div><span class="ws-lbl">${s.label}</span></div>${i<WIZ_STEPS.length-1?'<div class="ws-line done"></div>':''}`).join('');
}

/* ─── MEASUREMENT CHECKER ─── */
document.getElementById('btnCheck')?.addEventListener('click',()=>{
  const nom=parseFloat(document.getElementById('chkN').value);
  const meas=parseFloat(document.getElementById('chkM').value);
  const fit=document.getElementById('chkFit').value;
  const out=document.getElementById('chkResult');
  if(isNaN(nom)||isNaN(meas)||!fit){ out.innerHTML='<p class="note warn"><span class="ni">⚠️</span><span>Completa los tres campos.</span></p>'; return; }
  const isShaft=/^[a-z]/.test(fit);
  const rv=isShaft?ISO286.shaftLimits(fit,nom):ISO286.housingLimits(fit,nom);
  if(!rv){ out.innerHTML='<p class="note warn"><span class="ni">⚠️</span><span>Ajuste no reconocido. Usa minúsculas para eje (k6) y MAYÚSCULAS para alojamiento (H7).</span></p>'; return; }
  const limMin=round3(isShaft?nom+rv.ei/1000:nom+rv.EI/1000);
  const limMax=round3(isShaft?nom+rv.es/1000:nom+rv.ES/1000);
  const span=limMax-limMin;
  const pos=Math.max(0,Math.min(1,(meas-limMin)/span));
  const inTol=meas>=limMin&&meas<=limMax;
  const nearLimit=inTol&&(pos<0.1||pos>0.9);
  const status=!inTol?'bad':nearLimit?'warn':'ok';
  const icon=status==='ok'?'🟢':status==='warn'?'🟡':'🔴';
  const msg=status==='ok'?'Dentro de tolerancia':status==='warn'?'Dentro de tolerancia — cerca del límite':'FUERA DE TOLERANCIA';
  const dev=round3(meas-nom);
  const pctBar=Math.round(pos*100);
  const zoneL=Math.round((limMin-nom-Math.max(Math.abs(limMin-nom),Math.abs(limMax-nom))*0.5-(-span*.5))/span*100)*2;

  out.innerHTML=`
    <div class="result-badge ${status}"><span class="rb-icon">${icon}</span><div><b>${msg}</b><br><small>Nominal: ${nom} mm → Medida: ${meas} mm · Rango: ${limMin} – ${limMax} mm</small></div></div>
    <div class="tol-bar-wrap">
      <div class="tol-bar-labels"><span>${limMin} mm</span><span>Zona de tolerancia (${rv.it} µm)</span><span>${limMax} mm</span></div>
      <div class="tol-bar">
        <div class="tol-zone" style="left:0%;width:100%"></div>
        <div class="tol-needle" style="left:${pctBar}%"></div>
      </div>
    </div>
    <table class="tol-table" style="margin-top:12px;">
      <tr><th>Parámetro</th><th>Valor</th></tr>
      <tr><td>Diámetro nominal</td><td>${nom} mm</td></tr>
      <tr><td>Medida real</td><td>${meas} mm</td></tr>
      <tr><td>Ajuste</td><td>${fit} (${isShaft?'eje':'alojamiento'})</td></tr>
      <tr><td>Límite inferior</td><td>${limMin} mm</td></tr>
      <tr><td>Límite superior</td><td>${limMax} mm</td></tr>
      <tr><td>Desviación del nominal</td><td>${dev>=0?'+':''}${dev} mm (${dev*1000>=0?'+':''}${Math.round(dev*1000)} µm)</td></tr>
      <tr><td>Banda de tolerancia IT</td><td>${rv.it} µm</td></tr>
      <tr><td>Estado</td><td style="color:var(--${status==='ok'?'green':status==='warn'?'amber':'red'})">${msg}</td></tr>
      ${!inTol?`<tr><td>Exceso</td><td style="color:var(--red)">${meas>limMax?'+'+(round3(meas-limMax)*1000).toFixed(0):'-'+(round3(limMin-meas)*1000).toFixed(0)} µm fuera del límite</td></tr>`:''}
    </table>`;
});

/* ─── TOLERANCE LIBRARY ─── */
let tolMode='shaft';
function renderTolTable(){
  const d=parseFloat(document.getElementById('tolDia')?.value)||50;
  const out=document.getElementById('tolResult');
  if(!out) return;
  if(tolMode==='shaft'){
    out.innerHTML=`<h3 style="margin-bottom:10px;">Eje — ⌀${d} mm</h3>${renderShaftTolHTML(d)}`;
  } else {
    out.innerHTML=`<h3 style="margin-bottom:10px;">Alojamiento — ⌀${d} mm</h3>${renderHousingTolHTML(d)}`;
  }
}
document.getElementById('tolDia')?.addEventListener('input',debounce(renderTolTable,300));
document.getElementById('tabShaft')?.addEventListener('click',()=>{ tolMode='shaft'; document.getElementById('tabShaft').classList.add('active'); document.getElementById('tabHousing').classList.remove('active'); renderTolTable(); });
document.getElementById('tabHousing')?.addEventListener('click',()=>{ tolMode='housing'; document.getElementById('tabHousing').classList.add('active'); document.getElementById('tabShaft').classList.remove('active'); renderTolTable(); });
function renderRecommendedTable(){
  const out=document.getElementById('tolRec');
  if(!out) return;
  out.innerHTML=`
    <table class="tol-table">
      <tr><th>Componente</th><th>Condición</th><th>Ajustes recomendados</th></tr>
      <tr><td>Eje</td><td>Aro interior giratorio, carga normal</td><td>k5, k6 ★</td></tr>
      <tr><td>Eje</td><td>Aro interior giratorio, carga pesada</td><td>m5, m6, n6</td></tr>
      <tr><td>Eje</td><td>Aro interior giratorio, choque</td><td>n6, p6</td></tr>
      <tr><td>Eje</td><td>Aro interior estacionario</td><td>j6, h6</td></tr>
      <tr><td>Alojamiento</td><td>Aro exterior estacionario (motores) ★</td><td>H7, J7</td></tr>
      <tr><td>Alojamiento</td><td>Carga pesada o carcasa partida</td><td>K7, M7</td></tr>
      <tr><td>Alojamiento</td><td>Carcasa partida o pared delgada</td><td>J6, JS6</td></tr>
    </table>
    <p style="font-size:12px;color:var(--text3);margin-top:8px;">★ Los más frecuentes en motores eléctricos industriales. Fuente: ISO 492 Tablas 7-8.</p>`;
}

/* ─── CLEARANCE GUIDE ─── */
function renderClearance(){
  const g=document.getElementById('clGrid');
  if(!g) return;
  g.innerHTML=CLEARANCE_INFO.map(c=>`
    <div class="cl-card">
      <div class="cl-head"><div class="cl-badge ${c.cls}">${c.id}</div><div><div class="cl-title">${c.name}</div><div class="cl-sub">${c.sub}</div></div></div>
      <div class="cl-section"><div class="cl-section__lbl">¿Qué es?</div><p>${c.what}</p></div>
      <div class="cl-section"><div class="cl-section__lbl">✅ Usar cuando</div><p class="cl-use"><span>✓</span><span>${c.use}</span></p></div>
      <div class="cl-section"><div class="cl-section__lbl">❌ NO usar cuando</div><p class="cl-nouse"><span>✗</span><span>${c.nouse}</span></p></div>
      <div class="cl-section"><div class="cl-section__lbl">Aplicaciones típicas</div><p>${c.apps}</p></div>
      <div class="cl-section"><div class="cl-section__lbl">Rango orientativo</div><code style="font-family:var(--mono);font-size:12px;color:var(--text2);background:var(--bg3);padding:2px 8px;border-radius:4px;">${c.ranges}</code></div>
    </div>`).join('');
}

/* ─── COMPARATOR ─── */
function addCompare(r){
  if(ST.compareList.find(x=>x.id===r.id)){ showToast('Ya está en el comparador','warn'); return; }
  if(ST.compareList.length>=4){ showToast('Máximo 4 rodamientos. Elimina uno primero.','warn'); return; }
  ST.compareList.push(r);
  renderCompare();
  switchView('compare');
  showToast(`${r.brand} ${r.designation} añadido al comparador`,'ok');
}
function renderCompare(){
  const slots=document.getElementById('cmpSlots');
  if(slots){
    slots.innerHTML='';
    for(let i=0;i<4;i++){
      const r=ST.compareList[i];
      const d=document.createElement('div');
      d.className='cslot'+(r?' filled':'');
      if(r){
        d.innerHTML=`<div class="cslot__ref">${r.brand} ${r.designation}</div><div class="cslot__dim">${fmtD(r)}</div><button class="btn btn-sm btn-ghost" style="margin-top:4px;">Quitar</button>`;
        d.querySelector('button').addEventListener('click',()=>{ ST.compareList.splice(ST.compareList.indexOf(r),1); renderCompare(); });
      } else d.innerHTML=`<span class="cslot__empty">Espacio ${i+1} — añade desde el buscador</span>`;
      slots.appendChild(d);
    }
  }
  const t=document.getElementById('cmpTable');
  if(!t) return;
  if(ST.compareList.length<2){ t.innerHTML='<p class="note info" style="margin-top:4px;"><span class="ni">ℹ️</span><span>Añade al menos 2 rodamientos para comparar.</span></p>'; return; }
  const rows=[['Marca',r=>r.brand],['Tipo',r=>r.type],['Serie',r=>r.series],['d (mm)',r=>r.d],['D (mm)',r=>r.D],['B (mm)',r=>r.B],['Peso aprox.',r=>r.weight_kg+' kg'],['Cr (kN)',r=>'≈'+r.Cr_kN],['C0r (kN)',r=>'≈'+r.C0r_kN],['n máx (rpm)',r=>'≈'+r.nmax_rpm],['Material',r=>r.material],['Norma',r=>r.norm]];
  t.innerHTML=`<table class="cmp-table"><tr><th class="row-lbl">Característica</th>${ST.compareList.map(r=>`<th>${r.brand}<br>${r.designation}</th>`).join('')}</tr>${rows.map(([lbl,fn])=>`<tr><td class="row-lbl">${lbl}</td>${ST.compareList.map(r=>`<td>${fn(r)}</td>`).join('')}</tr>`).join('')}</table>`;
}

/* ─── EQUIVALENCES ─── */
document.getElementById('equivInput')?.addEventListener('input',debounce(()=>{
  const q=document.getElementById('equivInput').value.trim();
  const out=document.getElementById('equivResults');
  if(!q||q.length<2){ out.innerHTML=''; return; }
  const {base,suffixes}=parseQ(q);
  const hits=findByBase(base);
  if(!hits.length){ out.innerHTML='<p class="note warn"><span class="ni">⚠️</span><span>No se encontró esa referencia.</span></p>'; return; }
  const r=hits[0];
  const sealG=suffixes.map(s=>SEAL_NORM[s]).find(Boolean);
  const clearance=suffixes.find(s=>['C2','C3','C4','C5','CN'].includes(s));
  const extra=suffixes.filter(s=>!SEAL_NORM[s]&&s!==clearance);
  const same=ST.bearings.filter(rx=>rx.d===r.d&&rx.D===r.D&&rx.B===r.B&&rx.type===r.type);
  const by=uniqBy(same,rx=>rx.brand);
  out.innerHTML=`<p style="color:var(--text2);font-size:13px;margin-bottom:14px;">${r.type} — ⌀${r.d}×⌀${r.D}×${r.B} mm (ISO ${r.norm})</p>
    <div class="equiv-chain">${by.map((rx,i)=>{
      const sc=sealG&&SEAL[rx.brand]?SEAL[rx.brand][sealG]||'':'';
      const sfx=(sc?' '+sc:'')+(clearance?' '+clearance:'')+(extra.length?' '+extra.join(' '):'');
      return `<div class="equiv-row"><b>${rx.brand}</b><span>${rx.designation}${sfx}</span></div>${i<by.length-1?'<div class="equiv-arrow">↓</div>':''}`;
    }).join('')}</div>`;
},200));

/* ─── CALCULATORS ─── */
function buildCalcs(){
  const g=document.getElementById('calcGrid');
  if(!g) return;
  const defs=[
    {title:'⚡ Velocidad periférica',fields:[{id:'vp_d',l:'Diámetro d (mm)',v:80,t:'number'},{id:'vp_n',l:'Velocidad n (rpm)',v:1500,t:'number'}],
     fn:v=>{ const sp=CALC.perifSpeed(v.vp_d,v.vp_n); return `v = ${sp.toFixed(2)} m/s<br><small style="color:var(--text2)">${sp>3?'⚠️ Velocidad elevada':'✓ Normal'}</small>`; }},
    {title:'🔧 Ajuste por interferencia',fields:[{id:'if_d',l:'Diámetro d (mm)',v:50,t:'number'},{id:'if_i',l:'Interferencia (µm)',v:20,t:'number'},{id:'if_l',l:'Longitud de ajuste (mm)',v:30,t:'number'}],
     fn:v=>{ const r=CALC.interferenceFit(v.if_d,v.if_i,v.if_l); return `P = ${r.pressure_MPa.toFixed(1)} MPa<br>F montaje ≈ ${r.force_kN.toFixed(2)} kN`; }},
    {title:'📏 Conversión pulgadas ↔ mm',fields:[{id:'in_v',l:'Pulgadas (in)',v:1,t:'number'},{id:'mm_v',l:'Milímetros (mm)',v:25.4,t:'number'}],
     fn:v=>{ return `${v.in_v} in = ${CALC.inToMm(v.in_v).toFixed(3)} mm<br>${v.mm_v} mm = ${CALC.mmToIn(v.mm_v).toFixed(5)} in`; }},
    {title:'🌡️ Expansión térmica del eje',fields:[{id:'te_d',l:'Diámetro eje (mm)',v:50,t:'number'},{id:'te_dt',l:'ΔT (°C)',v:40,t:'number'}],
     fn:v=>{ return `ΔD = ${(CALC.thermalExpansion(v.te_d,v.te_dt,'acero')*1000).toFixed(1)} µm (acero)`; }},
    {title:'🏗️ Expansión térmica del alojamiento',fields:[{id:'th_d',l:'Diámetro aloj. (mm)',v:80,t:'number'},{id:'th_dt',l:'ΔT (°C)',v:40,t:'number'},{id:'th_m',l:'Material',v:'fundicion',t:'select',opts:['fundicion','acero','aluminio','bronce']}],
     fn:v=>{ return `ΔD = ${(CALC.thermalExpansion(v.th_d,v.th_dt,v.th_m)*1000).toFixed(1)} µm (${v.th_m})`; }},
    {title:'🔩 Juego interno radial',fields:[{id:'ci_d',l:'Diámetro interior d (mm)',v:50,t:'number'},{id:'ci_g',l:'Grupo',v:'C3',t:'select',opts:['CN','C2','C3','C4','C5']}],
     fn:v=>{ const r=CALC.internalClearance(v.ci_d,v.ci_g); return r?`${v.ci_g}: ${r.min_um} – ${r.max_um} µm`:'Fuera de rango'; }},
    {title:'📐 Unidad de tolerancia IT',fields:[{id:'it_d',l:'Diámetro d (mm)',v:50,t:'number'},{id:'it_g',l:'Grado IT',v:'6',t:'select',opts:['5','6','7','8','9']}],
     fn:v=>{ return `IT${v.it_g} = ${ISO286.itGradeMicrons(parseInt(v.it_g),v.it_d)} µm`; }},
  ];
  g.innerHTML='';
  defs.forEach(def=>{
    const card=document.createElement('div');
    card.className='calc-card';
    card.innerHTML=`<h3>${def.title}</h3>${def.fields.map(f=>`<label>${f.l}</label>${f.t==='select'?`<select id="${f.id}">${f.opts.map(o=>`<option ${o===f.v?'selected':''}>${o}</option>`).join('')}</select>`:`<input type="number" id="${f.id}" value="${f.v}">`}`).join('')}<div class="calc-out" id="out_${def.fields[0].id}"></div>`;
    g.appendChild(card);
    const outEl=card.querySelector('.calc-out');
    function calc(){
      const v={}; def.fields.forEach(f=>{ const el=document.getElementById(f.id); v[f.id]=f.t==='select'?el.value:parseFloat(el.value); });
      try{ outEl.innerHTML=def.fn(v); }catch{ outEl.textContent='—'; }
    }
    def.fields.forEach(f=>{ setTimeout(()=>{ document.getElementById(f.id)?.addEventListener('input',calc); document.getElementById(f.id)?.addEventListener('change',calc); },0); });
    setTimeout(calc,10);
  });
}

/* ─── GLOSSARY ─── */
function renderGlossary(){
  const g=document.getElementById('glossGrid');
  if(!g) return;
  const entries=Object.entries(GLOSARIO);
  function render(filter=''){
    const f=filter.toUpperCase();
    g.innerHTML=entries.filter(([k,v])=>!f||k.includes(f)||v.toUpperCase().includes(f))
      .map(([k,v])=>`<div class="gloss-item"><div class="gloss-item__k">${k}</div><p>${v}</p></div>`).join('');
  }
  render();
  document.getElementById('glossQ')?.addEventListener('input',e=>render(e.target.value.trim()));
}

/* ─── FAVORITES ─── */
function renderFavs(){
  const g=document.getElementById('favsGrid');
  if(!g) return;
  if(!ST.favorites.length){ g.innerHTML='<p class="note info"><span class="ni">ℹ️</span><span>No tienes favoritos guardados. Pulsa ★ en cualquier rodamiento para añadirlo.</span></p>'; return; }
  g.innerHTML='';
  const favBearings=ST.favorites.map(ref=>ST.bearings.find(r=>r.designation===ref&&r.brand==='SKF')||ST.bearings.find(r=>r.designation===ref)).filter(Boolean);
  favBearings.forEach(r=>g.appendChild(makeBCard(r)));
}
document.getElementById('favNavBtn')?.addEventListener('click',()=>switchView('favorites'));

/* ─── VOICE INPUT ─── */
document.getElementById('voiceBtn')?.addEventListener('click',()=>{
  const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SpeechRecognition){ showToast('Reconocimiento de voz no disponible en este dispositivo','warn'); return; }
  const rec=new SpeechRecognition(); rec.lang='es-CO'; rec.continuous=false;
  const btn=document.getElementById('voiceBtn');
  btn.classList.add('on'); btn.textContent='🔴';
  rec.onresult=e=>{ const t=e.results[0][0].transcript; document.getElementById('dashSearch').value=t; doSearch(t); };
  rec.onend=()=>{ btn.classList.remove('on'); btn.textContent='🎤'; };
  rec.onerror=()=>{ btn.classList.remove('on'); btn.textContent='🎤'; showToast('Error de reconocimiento de voz','warn'); };
  rec.start();
});

/* ─── TOAST ─── */
function showToast(msg,type='ok'){
  const box=document.getElementById('toastBox');
  if(!box) return;
  const div=document.createElement('div');
  div.className=`toast ${type}`;
  div.textContent=msg;
  box.appendChild(div);
  setTimeout(()=>div.remove(),3500);
}

/* ─── BACK BUTTON ─── */
document.getElementById('btnBack')?.addEventListener('click',()=>{
  const prevView=ST.lastResults?.length?'search':'dashboard';
  switchView(prevView);
});

/* ─── INIT ─── */
async function init(){
  loadPrefs();
  setGreeting();
  buildQA();
  wireSearch();
  buildWizard();
  try{ await loadData(); }catch(e){ console.error('Data load error:',e); showToast('Error al cargar los datos','err'); }
  hideSplash();
  renderRecent();
}

document.addEventListener('DOMContentLoaded',init);
