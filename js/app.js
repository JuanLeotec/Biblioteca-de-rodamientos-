/* =========================================================================
   APP.js — Biblioteca Técnica de Rodamientos Industriales
   Lógica principal: carga de datos, búsqueda, filtros, fichas técnicas,
   comparador, equivalencias, tolerancias y calculadoras.
   ========================================================================= */

const STATE = {
  bearings: [],     // catálogo generado (familias x marca)
  verified: [],     // datos reales medidos en taller (Excel origen)
  typeDesc: {},
  filters: { brand: new Set(), type: '', series: '', clearance: new Set(), seal: new Set(),
             d1:null,d2:null,D1:null,D2:null,B1:null,B2:null },
  compareList: [],   // hasta 4 registros para comparador
  page: 0,
  pageSize: 90,
  lastResultSet: [],
  pendingSuffixes: [],
};

const SUFFIX_TOKENS = ['C2','C3','C4','C5','CN','2RS1','2RSR','2RS','DDU','LLU','RSH','RS',
  '2Z','ZZ','Z','INSOCOAT','EXPLORER','HIBRIDO','CERAMICO','EK','VL0241','MC3VL','ECM','ECP',
  'ECJ','EC','ETVP','BECBM','BECBP','BEP','BCBM','BMPVA','BMPUA','M1','M','P6','P5','P4'];

/* ----------------------------- UTILIDADES ----------------------------- */
function norm(s){ return (s||'').toString().toUpperCase().replace(/[\s\-_/]+/g,''); }

function fmtDim(r){ return `⌀${r.d} × ⌀${r.D} × ${r.B} mm`; }

function isVerifiedMatch(v, r){
  const { base } = parseQuery(v.ref);
  return base === norm(r.designation) && norm(v.brand) === norm(r.brand);
}
function findVerifiedFor(r){
  return STATE.verified.find(v => isVerifiedMatch(v, r));
}

function uniqueBy(arr, keyFn){
  const seen = new Set(); const out=[];
  for(const a of arr){ const k=keyFn(a); if(!seen.has(k)){ seen.add(k); out.push(a); } }
  return out;
}

/* ----------------------------- CARGA DE DATOS ----------------------------- */
async function loadData(){
  const [b, v, t] = await Promise.all([
    fetch('data/bearings.json').then(r=>r.json()),
    fetch('data/verified.json').then(r=>r.json()),
    fetch('data/type_desc.json').then(r=>r.json()),
  ]);
  STATE.bearings = b;
  STATE.verified = v;
  STATE.typeDesc = t;
  buildFilterOptions();
  renderResults(STATE.bearings.slice(0, 400), {resetPage:true});
  renderRecommendedTable();
  renderGlossary();
  buildCalculators();
}

/* ----------------------------- PARSEO DE CONSULTA ----------------------------- */
function parseQuery(q){
  let n = norm(q);
  let foundSuffixes = [];
  for(const suf of SUFFIX_TOKENS.sort((a,b)=>b.length-a.length)){
    if(n.endsWith(suf)){
      n = n.slice(0, n.length - suf.length);
      foundSuffixes.push(suf);
    }
  }
  return { base: n, suffixes: foundSuffixes };
}

function findByBase(baseNorm){
  return STATE.bearings.filter(r => norm(r.designation) === baseNorm);
}

function findVerifiedByQuery(qNorm){
  return STATE.verified.filter(v => norm(v.ref).startsWith(qNorm) || norm(v.ref).includes(qNorm));
}

/* ----------------------------- AUTOCOMPLETADO ----------------------------- */
const acBox = document.getElementById('autocompleteBox');
const globalSearch = document.getElementById('globalSearch');

let designationIndex = null;
function getDesignationIndex(){
  if(designationIndex) return designationIndex;
  const map = new Map();
  for(const r of STATE.bearings){
    if(!map.has(r.designation)) map.set(r.designation, r);
  }
  designationIndex = Array.from(map.values());
  return designationIndex;
}

globalSearch.addEventListener('input', ()=>{
  const q = globalSearch.value.trim();
  if(q.length < 2){ acBox.classList.remove('show'); return; }
  const qn = norm(q);
  const idx = getDesignationIndex();
  const matches = idx.filter(r => norm(r.designation).startsWith(qn) || norm(r.designation).includes(qn)).slice(0, 12);
  const verMatches = STATE.verified.filter(v=>norm(v.ref).includes(qn)).slice(0,6);

  acBox.innerHTML = '';
  matches.forEach(r=>{
    const div = document.createElement('div');
    div.className = 'ac-item';
    div.innerHTML = `<span><b>${r.designation}</b> <small style="color:var(--text-faint)">${r.type}</small></span><span class="ac-dim">${fmtDim(r)}</span>`;
    div.onclick = ()=>{ globalSearch.value = r.designation; acBox.classList.remove('show'); doGlobalSearch(r.designation); };
    acBox.appendChild(div);
  });
  verMatches.forEach(v=>{
    const div = document.createElement('div');
    div.className = 'ac-item';
    div.innerHTML = `<span><b>${v.ref}</b> <small style="color:var(--green)">verificado taller</small></span><span class="ac-dim">${v.brand}</span>`;
    div.onclick = ()=>{ globalSearch.value = v.ref; acBox.classList.remove('show'); doGlobalSearch(v.ref); };
    acBox.appendChild(div);
  });
  acBox.classList.toggle('show', matches.length>0 || verMatches.length>0);
});
document.addEventListener('click', (e)=>{ if(!acBox.contains(e.target) && e.target!==globalSearch) acBox.classList.remove('show'); });
globalSearch.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ acBox.classList.remove('show'); doGlobalSearch(globalSearch.value); }});

function doGlobalSearch(q){
  if(!q || !q.trim()){ return; }
  const { base, suffixes } = parseQuery(q);
  const direct = findByBase(base);
  const verified = findVerifiedByQuery(norm(q));

  if(direct.length === 1 && (suffixes.length || verified.length<=1)){
    showFicha(direct[0], suffixes, verified[0] || verified.find(v=>norm(v.ref).includes(base)));
    return;
  }
  if(direct.length >= 1){
    switchView('buscador');
    STATE.pendingSuffixes = suffixes;
    renderResults(direct, {resetPage:true, suffixes});
    return;
  }
  // fallback: búsqueda libre por contiene
  STATE.pendingSuffixes = suffixes;
  const loose = STATE.bearings.filter(r=> norm(r.designation).includes(base));
  switchView('buscador');
  renderResults(loose, {resetPage:true});
}

/* ----------------------------- VISTAS / NAVEGACIÓN ----------------------------- */
function switchView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-'+name).classList.add('active');
  document.querySelectorAll('.navbtn').forEach(b=>b.classList.toggle('active', b.dataset.view===name));
  document.getElementById('filtersPanel').style.display = (name==='buscador') ? '' : 'none';
}
document.querySelectorAll('.navbtn').forEach(btn=>{
  btn.addEventListener('click', ()=> switchView(btn.dataset.view));
});
document.getElementById('btnBackToSearch').addEventListener('click', ()=> switchView('buscador'));

/* ----------------------------- FILTROS ----------------------------- */
function buildFilterOptions(){
  const brands = uniqueBy(STATE.bearings, r=>r.brand).map(r=>r.brand).sort();
  const types = uniqueBy(STATE.bearings, r=>r.type).map(r=>r.type).sort();
  const series = uniqueBy(STATE.bearings, r=>r.series).map(r=>r.series).sort();

  const fBrand = document.getElementById('fBrand');
  fBrand.innerHTML='';
  brands.forEach(b=>{
    const chip = document.createElement('div'); chip.className='chip'; chip.textContent=b;
    chip.onclick=()=>{ chip.classList.toggle('on'); STATE.filters.brand.has(b)?STATE.filters.brand.delete(b):STATE.filters.brand.add(b); applyFilters(); };
    fBrand.appendChild(chip);
  });

  const fType = document.getElementById('fType');
  types.forEach(t=>{ const o=document.createElement('option'); o.value=t; o.textContent=t; fType.appendChild(o); });
  fType.onchange = ()=>{ STATE.filters.type = fType.value; applyFilters(); };

  const fSeries = document.getElementById('fSeries');
  series.forEach(s=>{ const o=document.createElement('option'); o.value=s; o.textContent=s; fSeries.appendChild(o); });
  fSeries.onchange = ()=>{ STATE.filters.series = fSeries.value; applyFilters(); };

  const clearances = ['CN','C2','C3','C4','C5'];
  const fClearance = document.getElementById('fClearance');
  clearances.forEach(c=>{
    const chip=document.createElement('div'); chip.className='chip'; chip.textContent=c;
    chip.onclick=()=>{ chip.classList.toggle('on'); STATE.filters.clearance.has(c)?STATE.filters.clearance.delete(c):STATE.filters.clearance.add(c); applyFilters(); };
    fClearance.appendChild(chip);
  });

  const seals = ['open','2Z','2RS'];
  const sealLabel = {open:'Abierto', '2Z':'Blindado (Z/ZZ)', '2RS':'Obturado (RS)'};
  const fSeal = document.getElementById('fSeal');
  seals.forEach(s=>{
    const chip=document.createElement('div'); chip.className='chip'; chip.textContent=sealLabel[s];
    chip.onclick=()=>{ chip.classList.toggle('on'); STATE.filters.seal.has(s)?STATE.filters.seal.delete(s):STATE.filters.seal.add(s); applyFilters(); };
    fSeal.appendChild(chip);
  });

  ['fD1','fD2','fOD1','fOD2','fB1','fB2'].forEach(id=>{
    document.getElementById(id).addEventListener('input', applyFilters);
  });
  document.getElementById('btnClearFilters').addEventListener('click', clearFilters);
}

function clearFilters(){
  STATE.pendingSuffixes = [];
  STATE.filters = { brand:new Set(), type:'', series:'', clearance:new Set(), seal:new Set(), d1:null,d2:null,D1:null,D2:null,B1:null,B2:null };
  document.querySelectorAll('.chip').forEach(c=>c.classList.remove('on'));
  document.getElementById('fType').value='';
  document.getElementById('fSeries').value='';
  ['fD1','fD2','fOD1','fOD2','fB1','fB2'].forEach(id=>document.getElementById(id).value='');
  renderResults(STATE.bearings.slice(0,400), {resetPage:true});
}

function applyFilters(){
  STATE.pendingSuffixes = [];
  const f = STATE.filters;
  f.d1 = parseFloat(document.getElementById('fD1').value)||null;
  f.d2 = parseFloat(document.getElementById('fD2').value)||null;
  f.D1 = parseFloat(document.getElementById('fOD1').value)||null;
  f.D2 = parseFloat(document.getElementById('fOD2').value)||null;
  f.B1 = parseFloat(document.getElementById('fB1').value)||null;
  f.B2 = parseFloat(document.getElementById('fB2').value)||null;

  let res = STATE.bearings.filter(r=>{
    if(f.brand.size && !f.brand.has(r.brand)) return false;
    if(f.type && r.type!==f.type) return false;
    if(f.series && r.series!==f.series) return false;
    if(f.d1!==null && r.d < f.d1) return false;
    if(f.d2!==null && r.d > f.d2) return false;
    if(f.D1!==null && r.D < f.D1) return false;
    if(f.D2!==null && r.D > f.D2) return false;
    if(f.B1!==null && r.B < f.B1) return false;
    if(f.B2!==null && r.B > f.B2) return false;
    if(f.seal.size && !Array.from(f.seal).some(s=>r.sealOptions.includes(s))) return false;
    return true;
  });
  // filtro de juego: si se exige C3 etc, simplemente lo mostramos disponible como variante (todas las familias lo soportan)
  switchView('buscador');
  renderResults(res, {resetPage:true});
}

/* ----------------------------- RENDER RESULTADOS ----------------------------- */
function renderResults(list, opts={}){
  if(opts.resetPage) STATE.page = 0;
  STATE.lastResultSet = list;
  document.getElementById('resultCount').textContent = list.length + ' resultado(s)';
  const grid = document.getElementById('resultsGrid');
  grid.innerHTML = '';
  const slice = list.slice(0, (STATE.page+1)*STATE.pageSize);
  slice.forEach(r => grid.appendChild(bearingCard(r)));
  if(slice.length < list.length){
    const more = document.createElement('button');
    more.className='btn btn--ghost btn--full';
    more.style.gridColumn = '1 / -1';
    more.textContent = `Mostrar más (${list.length - slice.length} restantes)`;
    more.onclick = ()=>{ STATE.page++; renderResults(list); };
    grid.appendChild(more);
  }
}

function bearingCard(r){
  const div = document.createElement('div');
  div.className = 'bcard';
  const verified = findVerifiedFor(r);
  div.innerHTML = `
    <div class="bcard__top">
      <div>
        <div class="bcard__ref">${r.designation}</div>
        <div class="bcard__type">${r.type}</div>
      </div>
      <div class="bcard__brand">${r.brand}</div>
    </div>
    <div class="bcard__dims"><span>${fmtDim(r)}</span></div>
    <div class="bcard__meta">
      <span>Cr ≈ ${r.Cr_kN} kN</span>
      <span>C0r ≈ ${r.C0r_kN} kN</span>
      <span>n máx ≈ ${r.nmax_rpm} rpm</span>
    </div>
    ${verified ? `<div class="bcard__verified">✓ Referencia verificada en taller</div>` : ''}
    <div class="bcard__actions">
      <button class="btn btn--small btn--primary">Ver ficha</button>
      <button class="btn btn--small">+ Comparar</button>
    </div>
  `;
  div.querySelector('.btn--primary').onclick = ()=> { showFicha(r, STATE.pendingSuffixes, verified); STATE.pendingSuffixes = []; };
  div.querySelectorAll('.btn--small')[1].onclick = ()=> addToCompare(r);
  return div;
}

/* ----------------------------- FICHA TÉCNICA ----------------------------- */
function showFicha(r, suffixes=[], verified=null){
  switchView('ficha');
  const cont = document.getElementById('fichaContent');
  const sealMap = { '2Z':'2Z', 'ZZ':'2Z', 'Z':'2Z', '2RS1':'2RS', '2RSR':'2RS', '2RS':'2RS', 'DDU':'2RS', 'LLU':'2RS', 'RSH':'2RS', 'RS':'2RS' };
  const sealGroup = suffixes.map(s=>sealMap[s]).find(Boolean);
  const sealBrandCode = sealGroup && SEAL_CODE[r.brand] && SEAL_CODE[r.brand][sealGroup];
  const displaySuffixes = suffixes.map(s => sealMap[s] ? (sealBrandCode || s) : s)
                                   .filter((s,i,arr)=> arr.indexOf(s)===i); // dedupe si coincide
  const fullRef = r.designation + (displaySuffixes.length ? ' ' + displaySuffixes.join(' ') : '');
  const seal = sealBrandCode || suffixes.find(s=>['2Z','ZZ','Z','2RS','2RS1','2RSR','DDU','LLU','RSH','RS'].includes(s));
  const clearance = suffixes.find(s=>['C2','C3','C4','C5','CN'].includes(s));
  const special = suffixes.filter(s=>['INSOCOAT','EXPLORER','HIBRIDO','CERAMICO'].includes(s));

  const shaftFitSuggest = ISO286.RECOMMENDED.shaft[0];
  const housingFitSuggest = ISO286.RECOMMENDED.housing[0];

  cont.innerHTML = `
    <div class="fichaHead">
      <div>
        <h1>${r.brand} ${fullRef}</h1>
        <div class="fichaHead__tags">
          <span class="tag blue">${r.type}</span>
          <span class="tag">Serie ${r.series}</span>
          ${clearance? `<span class="tag green">Juego ${clearance}</span>`:''}
          ${seal? `<span class="tag">Sellado ${seal}</span>`:''}
          ${special.map(s=>`<span class="tag blue">${s}</span>`).join('')}
          ${verified? `<span class="tag green">✓ Verificado en taller</span>`:''}
        </div>
      </div>
    </div>

    <div class="readoutBig">d ${r.d} mm &nbsp;×&nbsp; D ${r.D} mm &nbsp;×&nbsp; B ${r.B} mm</div>

    <div class="fichaGrid">
      <div>
        <table class="specTable">
          <tr><td>Rodamiento</td><td>${r.brand} ${fullRef}</td></tr>
          <tr><td>Tipo</td><td>${r.type}</td></tr>
          <tr><td>Serie</td><td>${r.series}</td></tr>
          <tr><td>Marca</td><td>${r.brand}</td></tr>
          <tr><td>Diámetro interior (d)</td><td>${r.d} mm</td></tr>
          <tr><td>Diámetro exterior (D)</td><td>${r.D} mm</td></tr>
          <tr><td>Ancho / altura (B)</td><td>${r.B} mm</td></tr>
          <tr><td>Capacidad dinámica Cr</td><td>≈ ${r.Cr_kN} kN *</td></tr>
          <tr><td>Capacidad estática C0r</td><td>≈ ${r.C0r_kN} kN *</td></tr>
          <tr><td>Velocidad máxima (grasa)</td><td>≈ ${r.nmax_rpm} rpm *</td></tr>
          <tr><td>Peso aproximado</td><td>≈ ${r.weight_kg} kg *</td></tr>
          <tr><td>Juego interno</td><td>${clearance || 'No especificado (consultar CN/C3 según aplicación)'}</td></tr>
          <tr><td>Sellado</td><td>${seal || 'Abierto / según variante solicitada'}</td></tr>
          <tr><td>Material</td><td>${r.material}</td></tr>
          <tr><td>Norma</td><td>${r.norm}</td></tr>
        </table>
        <div class="note">* Valores orientativos de referencia calculados por escalado dimensional estándar. Confirmar siempre con el catálogo oficial del fabricante antes de un diseño crítico.</div>
        ${verified ? `
        <div class="card" style="margin-top:14px;">
          <h3>Medición real verificada en taller</h3>
          <table class="specTable">
            <tr><td>Referencia registrada</td><td>${verified.ref}</td></tr>
            <tr><td>Marca registrada</td><td>${verified.brand}</td></tr>
            <tr><td>Alojamiento (OD) medido</td><td>${verified.OD_min} – ${verified.OD_max} mm</td></tr>
            <tr><td>Eje (ID) medido</td><td>${verified.ID_min} – ${verified.ID_max} mm</td></tr>
          </table>
        </div>` : ''}
      </div>

      <div>
        <div class="card">
          <h3>Tolerancias normalizadas — Eje (ISO 286)</h3>
          ${renderShaftMiniTable(r.d)}
        </div>
        <div class="card">
          <h3>Tolerancias normalizadas — Alojamiento (ISO 286)</h3>
          ${renderHousingMiniTable(r.D)}
        </div>
        <div class="card">
          <h3>Información técnica</h3>
          <p style="color:var(--text-dim);font-size:13px;">${TYPE_TEXT(r.type)}</p>
          ${glossaryInlineFor(suffixes, clearance, sealGroup, special)}
        </div>
      </div>
    </div>
  `;
}

function TYPE_TEXT(type){
  return STATE.typeDesc[type] || 'Información técnica general disponible en el glosario.';
}

function renderShaftMiniTable(d){
  const classes = ['j6','k5','k6','m5','m6','n6','p6'];
  let rows = classes.map(c=>{
    const r = ISO286.shaftLimits(c, d);
    if(!r) return '';
    return `<tr><td>${c}</td><td>${(d+r.ei/1000).toFixed(3)} mm</td><td>${(d+r.es/1000).toFixed(3)} mm</td><td>${r.it} µm</td></tr>`;
  }).join('');
  return `<table class="toleranceTable"><tr><th>Ajuste</th><th>Mín</th><th>Máx</th><th>IT</th></tr>${rows}</table>`;
}
function renderHousingMiniTable(D){
  const classes = ['H6','H7','J6','J7','K7','M7'];
  let rows = classes.map(c=>{
    const r = ISO286.housingLimits(c, D);
    if(!r) return '';
    return `<tr><td>${c}</td><td>${(D+r.EI/1000).toFixed(3)} mm</td><td>${(D+r.ES/1000).toFixed(3)} mm</td><td>${r.it} µm</td></tr>`;
  }).join('');
  return `<table class="toleranceTable"><tr><th>Ajuste</th><th>Mín</th><th>Máx</th><th>IT</th></tr>${rows}</table>`;
}

function glossaryInlineFor(suffixes, clearance, seal, special){
  const keys = new Set();
  if(clearance) keys.add(clearance);
  if(seal) Object.keys(GLOSARIO).forEach(k=>{ if(k.includes(seal)) keys.add(k); });
  special.forEach(s=> keys.add(s.charAt(0)+s.slice(1).toLowerCase()));
  if(keys.size===0) return '';
  let html = '<div class="glossInline"><h3>Significado de códigos en esta referencia</h3><dl>';
  keys.forEach(k=>{
    const entry = GLOSARIO[k] || GLOSARIO[k.toUpperCase()];
    if(entry) html += `<dt>${k}</dt><dd>${entry}</dd>`;
  });
  html += '</dl></div>';
  return html;
}

/* ----------------------------- BÚSQUEDA POR MEDIDAS ----------------------------- */
document.getElementById('btnSearchDims').addEventListener('click', ()=>{
  const shaft = parseFloat(document.getElementById('searchShaft').value);
  const housing = parseFloat(document.getElementById('searchHousing').value);
  let res = STATE.bearings;
  const tol = 0.05;
  if(!isNaN(shaft)) res = res.filter(r=> Math.abs(r.d - shaft) <= tol);
  if(!isNaN(housing)) res = res.filter(r=> Math.abs(r.D - housing) <= tol);
  if(isNaN(shaft) && isNaN(housing)){ renderResults(STATE.bearings.slice(0,400), {resetPage:true}); return; }
  renderResults(res, {resetPage:true});
});

/* ----------------------------- ANÁLISIS POR DATOS DEL MOTOR ----------------------------- */
document.getElementById('btnMotorAnalyze').addEventListener('click', ()=>{
  const hLA = parseFloat(document.getElementById('motorHousingLA').value);
  const sLA = parseFloat(document.getElementById('motorShaftLA').value);
  const hLV = parseFloat(document.getElementById('motorHousingLV').value);
  const sLV = parseFloat(document.getElementById('motorShaftLV').value);
  const out = document.getElementById('motorResults');
  out.innerHTML = '';

  function suggestFor(label, dShaft, dHousing){
    const tol = 0.08;
    let candidates = STATE.bearings.filter(r=>
      (!isNaN(dShaft) ? Math.abs(r.d-dShaft)<=tol : true) &&
      (!isNaN(dHousing) ? Math.abs(r.D-dHousing)<=tol : true)
    );
    // priorizar tipos típicos de motor eléctrico: rígido de bolas primero
    candidates = uniqueBy(candidates, r=>r.designation+r.brand);
    candidates.sort((a,b)=> (a.type.includes('Rigido')?-1:1) - (b.type.includes('Rigido')?-1:1));
    const block = document.createElement('div');
    block.className='card';
    block.innerHTML = `<h3>${label} — eje ⌀${isNaN(dShaft)?'—':dShaft} mm / alojamiento ⌀${isNaN(dHousing)?'—':dHousing} mm</h3>`;
    if(candidates.length===0){
      block.innerHTML += `<p style="color:var(--text-dim);">No se encontraron coincidencias exactas en el rango ±0.08 mm. Revisa las medidas o usa el buscador por diámetro.</p>`;
    } else {
      const grid = document.createElement('div'); grid.className='grid';
      candidates.slice(0,12).forEach(r=> grid.appendChild(bearingCard(r)));
      block.appendChild(grid);
    }
    return block;
  }

  if(isNaN(hLA)&&isNaN(sLA)&&isNaN(hLV)&&isNaN(sLV)){
    out.innerHTML = '<p class="note">Introduce al menos un valor para analizar.</p>';
    return;
  }
  out.appendChild(suggestFor('Lado acople (LA)', sLA, hLA));
  out.appendChild(suggestFor('Lado libre (LV)', sLV, hLV));
});

/* ----------------------------- COMPARADOR ----------------------------- */
function addToCompare(r){
  if(STATE.compareList.find(x=>x.id===r.id)) return;
  if(STATE.compareList.length>=4){ alert('Ya hay 4 rodamientos en el comparador. Quita uno antes de añadir otro.'); return; }
  STATE.compareList.push(r);
  renderCompare();
  switchView('comparador');
}
function removeFromCompare(id){
  STATE.compareList = STATE.compareList.filter(x=>x.id!==id);
  renderCompare();
}
function renderCompare(){
  const slots = document.getElementById('compareSlots');
  slots.innerHTML='';
  for(let i=0;i<4;i++){
    const r = STATE.compareList[i];
    const div = document.createElement('div');
    div.className = 'compareSlot' + (r?' filled':'');
    if(r){
      div.innerHTML = `<b>${r.brand} ${r.designation}</b><span style="font-family:var(--mono);color:var(--readout)">${fmtDim(r)}</span><button class="btn btn--small btn--ghost">Quitar</button>`;
      div.querySelector('button').onclick = ()=> removeFromCompare(r.id);
    } else {
      div.textContent = `Espacio ${i+1} vacío — añade un rodamiento desde el buscador`;
    }
    slots.appendChild(div);
  }
  const wrap = document.getElementById('compareTableWrap');
  if(STATE.compareList.length<2){ wrap.innerHTML=''; return; }
  const rows = [
    ['Marca', r=>r.brand], ['Tipo', r=>r.type], ['Serie', r=>r.series],
    ['Diámetro interior d', r=>r.d+' mm'], ['Diámetro exterior D', r=>r.D+' mm'], ['Ancho B', r=>r.B+' mm'],
    ['Peso aprox.', r=>r.weight_kg+' kg'], ['Capacidad dinámica Cr', r=>'≈'+r.Cr_kN+' kN'],
    ['Capacidad estática C0r', r=>'≈'+r.C0r_kN+' kN'], ['Velocidad máxima', r=>'≈'+r.nmax_rpm+' rpm'],
    ['Material', r=>r.material], ['Norma', r=>r.norm],
  ];
  let html = '<table class="compareTable"><tr><th>Característica</th>' + STATE.compareList.map(r=>`<th>${r.brand} ${r.designation}</th>`).join('') + '</tr>';
  rows.forEach(([label,fn])=>{
    html += `<tr><td style="font-family:var(--sans);color:var(--text-dim);">${label}</td>` + STATE.compareList.map(r=>`<td>${fn(r)}</td>`).join('') + '</tr>';
  });
  html += '</table>';
  wrap.innerHTML = html;
}

/* ----------------------------- EQUIVALENCIAS ----------------------------- */
document.getElementById('equivInput').addEventListener('input', (e)=>{
  const q = e.target.value;
  const out = document.getElementById('equivResults');
  if(!q || q.trim().length<2){ out.innerHTML=''; return; }
  const { base, suffixes } = parseQuery(q);
  const matches = findByBase(base);
  if(matches.length===0){ out.innerHTML = '<p class="note">No se encontró esa referencia. Prueba con el número base, ej. 6208, NU314, 22220.</p>'; return; }
  const ref = matches[0];
  const sealMap = { '2Z':'2Z', 'ZZ':'2Z', 'Z':'2Z', '2RS1':'2RS', '2RSR':'2RS', '2RS':'2RS', 'DDU':'2RS', 'LLU':'2RS', 'RSH':'2RS', 'RS':'2RS' };
  const sealGroup = suffixes.map(s=>sealMap[s]).find(Boolean);
  const clearance = suffixes.find(s=>['C2','C3','C4','C5','CN'].includes(s));
  const extra = suffixes.filter(s=> s!==sealGroup && s!==clearance && !Object.keys(sealMap).includes(s));

  const sameFamily = STATE.bearings.filter(r=> r.d===ref.d && r.D===ref.D && r.B===ref.B && r.type===ref.type);
  const byBrand = uniqueBy(sameFamily, r=>r.brand);
  let html = `<p style="color:var(--text-dim);font-size:13px;margin-bottom:14px;">Equivalencias dimensionales para <b style="color:var(--text)">${ref.type} ⌀${ref.d}×⌀${ref.D}×${ref.B} mm</b> (mismas dimensiones ISO; comprobar siempre carga y tolerancias):</p>`;
  html += '<div class="equivChain">';
  byBrand.forEach((r,i)=>{
    let suffixPart = '';
    if(sealGroup && SEAL_CODE[r.brand] && SEAL_CODE[r.brand][sealGroup]) suffixPart += ' ' + SEAL_CODE[r.brand][sealGroup];
    if(clearance) suffixPart += ' ' + clearance;
    if(extra.length) suffixPart += ' ' + extra.join(' ');
    html += `<div class="equivRow"><b>${r.brand}</b><span>${r.designation}${suffixPart}</span></div>`;
    if(i<byBrand.length-1) html += '<div class="equivArrow">↓</div>';
  });
  html += '</div>';
  out.innerHTML = html;
});

/* ----------------------------- TOLERANCIAS ----------------------------- */
document.getElementById('btnConvCalc').addEventListener('click', ()=>{
  const d = parseFloat(document.getElementById('convDia').value);
  const code = document.getElementById('convFit').value.trim();
  const out = document.getElementById('convResult');
  if(isNaN(d) || !code){ out.innerHTML = '<p class="note">Introduce diámetro nominal y tipo de ajuste (ej. 50 y k6).</p>'; return; }
  const res = ISO286.calcFit(d, code);
  if(!res){ out.innerHTML = '<p class="note">Ajuste no reconocido. Prueba con j6, k5, k6, m5, m6, n6, p6, r6 (eje) o H6, H7, J6, J7, K6, K7, M6, M7, N6, N7, P7 (alojamiento).</p>'; return; }
  out.innerHTML = `
    <div class="readoutBig">${code.toUpperCase()} → ⌀ mín ${res.min.toFixed(3)} mm &nbsp;·&nbsp; ⌀ máx ${res.max.toFixed(3)} mm</div>
    <table class="specTable">
      <tr><td>Diámetro nominal</td><td>${d} mm</td></tr>
      <tr><td>Tipo</td><td>${res.kind}</td></tr>
      <tr><td>Desviación</td><td>${res.kind==='eje' ? `ei ${res.ei>=0?'+':''}${res.ei} µm / es ${res.es>=0?'+':''}${res.es} µm` : `EI ${res.EI>=0?'+':''}${res.EI} µm / ES ${res.ES>=0?'+':''}${res.ES} µm`}</td></tr>
      <tr><td>Tolerancia IT</td><td>${res.it} µm</td></tr>
      <tr><td>Diámetro mínimo</td><td>${res.min.toFixed(3)} mm</td></tr>
      <tr><td>Diámetro máximo</td><td>${res.max.toFixed(3)} mm</td></tr>
    </table>`;
});

function renderRecommendedTable(){
  const cont = document.getElementById('recommendedTable');
  let html = '<h4 style="color:var(--text-dim);font-size:12px;text-transform:uppercase;">Eje</h4><table class="toleranceTable"><tr><th>Condición</th><th>Clases recomendadas</th></tr>';
  ISO286.RECOMMENDED.shaft.forEach(s=> html += `<tr><td style="font-family:var(--sans);">${s.cond}</td><td>${s.classes.join(', ')}</td></tr>`);
  html += '</table><h4 style="color:var(--text-dim);font-size:12px;text-transform:uppercase;margin-top:14px;">Alojamiento</h4><table class="toleranceTable"><tr><th>Condición</th><th>Clases recomendadas</th></tr>';
  ISO286.RECOMMENDED.housing.forEach(s=> html += `<tr><td style="font-family:var(--sans);">${s.cond}</td><td>${s.classes.join(', ')}</td></tr>`);
  html += '</table>';
  cont.innerHTML = html;
}

document.getElementById('tolTableDia').addEventListener('input', renderTolTable);
function renderTolTable(){
  const d = parseFloat(document.getElementById('tolTableDia').value) || 40;
  document.getElementById('tolTableResult').innerHTML = `
    <div class="fichaGrid">
      <div><h4 style="font-size:12px;color:var(--text-dim);text-transform:uppercase;">Eje ⌀${d} mm</h4>${renderShaftMiniTable(d)}</div>
      <div><h4 style="font-size:12px;color:var(--text-dim);text-transform:uppercase;">Alojamiento ⌀${d} mm</h4>${renderHousingMiniTable(d)}</div>
    </div>`;
}

/* ----------------------------- CALCULADORAS ----------------------------- */
function buildCalculators(){
  const grid = document.getElementById('calcGrid');
  grid.innerHTML = '';

  // 1. Velocidad periférica
  grid.appendChild(calcCard('Velocidad periférica', [
    {id:'vp_d', label:'Diámetro (mm)', value:80},
    {id:'vp_n', label:'Velocidad de giro (rpm)', value:1500},
  ], (v)=> `v = ${CALC.perifSpeed(v.vp_d, v.vp_n).toFixed(2)} m/s`));

  // 2. Ajuste por interferencia
  grid.appendChild(calcCard('Ajuste por interferencia', [
    {id:'if_d', label:'Diámetro nominal (mm)', value:50},
    {id:'if_i', label:'Interferencia (µm)', value:20},
    {id:'if_l', label:'Longitud de ajuste (mm)', value:30},
  ], (v)=>{
    const r = CALC.interferenceFit(v.if_d, v.if_i, v.if_l);
    return `Presión de contacto ≈ ${r.pressure_MPa.toFixed(1)} MPa<br>Fuerza de montaje aprox. ≈ ${r.force_kN.toFixed(2)} kN`;
  }));

  // 3. Conversión pulgadas <-> mm
  grid.appendChild(calcCard('Conversión pulgadas ↔ milímetros', [
    {id:'in_val', label:'Pulgadas (in)', value:1},
    {id:'mm_val', label:'Milímetros (mm)', value:25.4},
  ], (v)=> `${v.in_val} in = ${CALC.inToMm(v.in_val).toFixed(3)} mm &nbsp;|&nbsp; ${v.mm_val} mm = ${CALC.mmToIn(v.mm_val).toFixed(4)} in`));

  // 4. Expansión térmica del eje
  grid.appendChild(calcCard('Expansión térmica del eje', [
    {id:'te_d', label:'Diámetro del eje (mm)', value:50},
    {id:'te_dt', label:'Incremento de temperatura ΔT (°C)', value:40},
  ], (v)=> `ΔD ≈ ${(CALC.thermalExpansion(v.te_d, v.te_dt, 'acero')*1000).toFixed(1)} µm (acero, α=11.5×10⁻⁶/°C)`));

  // 5. Expansión térmica del alojamiento
  grid.appendChild(calcCard('Expansión térmica del alojamiento', [
    {id:'th_d', label:'Diámetro del alojamiento (mm)', value:80},
    {id:'th_dt', label:'Incremento de temperatura ΔT (°C)', value:40},
    {id:'th_mat', label:'Material', type:'select', options:['fundicion','acero','aluminio','bronce'], value:'fundicion'},
  ], (v)=> `ΔD ≈ ${(CALC.thermalExpansion(v.th_d, v.th_dt, v.th_mat)*1000).toFixed(1)} µm (${v.th_mat})`));

  // 6. Juego interno
  grid.appendChild(calcCard('Juego interno radial típico', [
    {id:'ci_d', label:'Diámetro interior (mm)', value:50},
    {id:'ci_g', label:'Grupo de juego', type:'select', options:['CN','C2','C3','C4','C5'], value:'C3'},
  ], (v)=>{
    const r = CALC.internalClearance(v.ci_d, v.ci_g);
    return r ? `Juego radial ${v.ci_g} ≈ ${r.min_um} a ${r.max_um} µm` : 'Fuera de rango tabulado';
  }));

  // 7. Conversor general de tolerancias ISO (grado IT)
  grid.appendChild(calcCard('Unidad de tolerancia IT (grado ISO)', [
    {id:'it_d', label:'Diámetro nominal (mm)', value:50},
    {id:'it_g', label:'Grado IT', type:'select', options:['5','6','7','8','9'], value:'6'},
  ], (v)=> `IT${v.it_g} ≈ ${ISO286.itGradeMicrons(parseInt(v.it_g), v.it_d)} µm de ancho de tolerancia`));
}

function calcCard(title, fields, computeFn){
  const card = document.createElement('div');
  card.className = 'calcCard';
  card.innerHTML = `<h3>${title}</h3>`;
  fields.forEach(f=>{
    const label = document.createElement('label'); label.textContent = f.label;
    card.appendChild(label);
    if(f.type==='select'){
      const sel = document.createElement('select'); sel.id=f.id;
      f.options.forEach(o=>{ const opt=document.createElement('option'); opt.value=o; opt.textContent=o; if(o===f.value) opt.selected=true; sel.appendChild(opt); });
      card.appendChild(sel);
    } else {
      const inp = document.createElement('input'); inp.type='number'; inp.id=f.id; inp.value=f.value;
      card.appendChild(inp);
    }
  });
  const out = document.createElement('div'); out.className='out';
  card.appendChild(out);

  function recompute(){
    const v = {};
    fields.forEach(f=>{ const el=document.getElementById(f.id); v[f.id] = f.type==='select' ? el.value : parseFloat(el.value); });
    try{ out.innerHTML = computeFn(v); } catch(e){ out.textContent='—'; }
  }
  fields.forEach(f=>{ /* listener tras insertar en DOM, ver abajo */ });
  setTimeout(()=>{
    fields.forEach(f=>{ document.getElementById(f.id).addEventListener('input', recompute); document.getElementById(f.id).addEventListener('change', recompute); });
    recompute();
  }, 0);
  return card;
}

/* ----------------------------- GLOSARIO ----------------------------- */
function renderGlossary(){
  const cont = document.getElementById('glossaryList');
  cont.innerHTML = Object.entries(GLOSARIO).map(([k,v])=>`
    <div class="glossitem"><b>${k}</b><p>${v}</p></div>
  `).join('');
}

/* ----------------------------- INIT ----------------------------- */
loadData();
renderTolTable();
