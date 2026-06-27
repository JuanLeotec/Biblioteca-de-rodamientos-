/* =========================================================================
   ISO286.js
   Tablas de tolerancias normalizadas ISO 286 (ejes y alojamientos) para los
   ajustes de uso mas comun en el montaje de rodamientos, y utilidades de
   calculo de unidad de tolerancia IT por formula ISO.

   IMPORTANTE: los valores de desviacion (es/ei, ES/EI) de esta tabla son
   valores normalizados de referencia tecnica de uso general en metrologia
   de rodamientos. Para aplicaciones criticas o de alta precision, verificar
   siempre contra la norma ISO 286 oficial o el catalogo del fabricante.
   ========================================================================= */

const ISO286 = (() => {

  // Rangos de diametro nominal (mm): [desde(exclusivo), hasta(inclusivo)]
  const RANGES = [
    [10, 18], [18, 30], [30, 50], [50, 80], [80, 120],
    [120, 180], [180, 250], [250, 315], [315, 400], [400, 500]
  ];

  function rangeIndex(d) {
    for (let i = 0; i < RANGES.length; i++) {
      const [a, b] = RANGES[i];
      if (d > a && d <= b) return i;
    }
    // fuera de rango tabulado: usar el extremo mas cercano
    if (d <= RANGES[0][0]) return 0;
    return RANGES.length - 1;
  }

  // Unidad de tolerancia IT (micras) por grado, calculada por formula ISO:
  // i = 0.45*D^(1/3) + 0.001*D  (D = diametro geometrico medio del rango, mm)
  const IT_FACTOR = { 5: 7, 6: 10, 7: 16, 8: 25, 9: 40, 10: 64, 11: 100 };
  function itMicrons(grade, d) {
    const Dm = Math.sqrt(Math.max(d, 1) * Math.max(d, 1)); // se sustituye abajo por geo-mean real
    return null; // no usado directamente; ver itGradeMicrons()
  }
  function itGradeMicrons(grade, dNominal) {
    const idx = rangeIndex(dNominal);
    const [a, b] = RANGES[idx];
    const Dm = Math.sqrt(a * b);
    const i = 0.45 * Math.cbrt(Dm) + 0.001 * Dm; // micras
    const factor = IT_FACTOR[grade] || 16;
    return Math.round(i * factor);
  }

  // Tablas de desviaciones es/ei (EJE) en micras, por clase de ajuste y rango
  // de diametro. Indice = rangeIndex(d).
  const SHAFT = {
    j6:  [[6,-5],[6,-7],[7,-9],[9,-10],[10,-12],[12,-14],[14,-16],[16,-16],[18,-18],[20,-20]],
    js5: null, // calculado dinamicamente = +-IT5/2
    js6: null, // calculado dinamicamente = +-IT6/2
    k5:  [[9,1],[11,2],[13,2],[15,2],[18,3],[21,3],[24,4],[27,4],[29,4],[32,5]],
    k6:  [[12,1],[15,2],[18,2],[21,2],[25,3],[28,3],[33,4],[36,4],[40,4],[45,5]],
    m5:  [[15,7],[17,8],[20,9],[24,11],[28,13],[33,15],[37,17],[43,20],[46,21],[50,23]],
    m6:  [[18,7],[21,8],[25,9],[30,11],[35,13],[40,15],[46,17],[52,20],[57,21],[63,23]],
    n6:  [[23,12],[28,15],[33,17],[39,20],[45,23],[52,27],[60,31],[66,34],[73,37],[80,40]],
    p6:  [[29,18],[35,22],[42,26],[51,32],[59,37],[68,43],[79,50],[88,56],[98,62],[108,68]],
    r6:  [[34,23],[41,28],[50,34],[60,41],[70,48],[83,58],[96,67],[108,76],[119,84],[131,94]],
  };

  // Tablas de desviaciones ES/EI (ALOJAMIENTO) en micras
  const HOUSING = {
    H6:  [[11,0],[13,0],[16,0],[19,0],[22,0],[25,0],[29,0],[32,0],[36,0],[40,0]],
    H7:  [[18,0],[21,0],[25,0],[30,0],[35,0],[40,0],[46,0],[52,0],[57,0],[63,0]],
    J6:  [[8,-3],[10,-3],[12,-4],[13,-6],[14,-8],[16,-9],[18,-11],[20,-12],[22,-13],[24,-14]],
    J7:  [[12,-6],[13,-8],[14,-10],[18,-12],[22,-13],[26,-14],[30,-16],[36,-16],[39,-18],[43,-20]],
    JS6: null,
    JS7: null,
    K6:  [[3,-8],[2,-11],[2,-14],[3,-16],[4,-19],[4,-21],[5,-24],[5,-27],[6,-30],[6,-33]],
    K7:  [[6,-12],[6,-15],[7,-18],[9,-21],[10,-25],[12,-28],[13,-33],[16,-36],[17,-40],[18,-45]],
    M6:  [[-4,-15],[-4,-17],[-4,-20],[-5,-24],[-6,-28],[-8,-33],[-8,-37],[-9,-41],[-10,-46],[-10,-50]],
    M7:  [[0,-18],[0,-21],[0,-25],[0,-30],[0,-35],[0,-40],[0,-46],[0,-52],[0,-57],[0,-63]],
    N6:  [[-9,-20],[-11,-24],[-12,-28],[-14,-33],[-16,-38],[-20,-45],[-22,-51],[-25,-57],[-26,-62],[-27,-67]],
    N7:  [[-5,-23],[-7,-28],[-8,-33],[-9,-39],[-10,-45],[-12,-52],[-14,-60],[-14,-66],[-16,-73],[-17,-80]],
    P7:  [[-11,-29],[-14,-35],[-17,-42],[-21,-51],[-24,-59],[-28,-68],[-33,-79],[-36,-88],[-41,-98],[-45,-108]],
  };

  function shaftLimits(letter, d) {
    const idx = rangeIndex(d);
    letter = letter.toLowerCase();
    if (letter === 'js5' || letter === 'js6') {
      const grade = letter === 'js5' ? 5 : 6;
      const it = itGradeMicrons(grade, d);
      return { es: it / 2, ei: -it / 2, it };
    }
    const tbl = SHAFT[letter];
    if (!tbl) return null;
    const [es, ei] = tbl[idx];
    return { es, ei, it: es - ei };
  }

  function housingLimits(letter, d) {
    const idx = rangeIndex(d);
    const key = letter.toUpperCase();
    if (key === 'JS6' || key === 'JS7') {
      const grade = key === 'JS6' ? 6 : 7;
      const it = itGradeMicrons(grade, d);
      return { ES: it / 2, EI: -it / 2, it };
    }
    const tbl = HOUSING[key];
    if (!tbl) return null;
    const [ES, EI] = tbl[idx];
    return { ES, EI, it: ES - EI };
  }

  function isShaftClass(s) {
    const letter = (s.match(/^[A-Za-z]+/) || [''])[0];
    if (!letter || letter !== letter.toLowerCase()) return false;
    return !!SHAFT[s.toLowerCase()] || /^js[56]$/i.test(s);
  }
  function isHousingClass(s) {
    const letter = (s.match(/^[A-Za-z]+/) || [''])[0];
    if (!letter || letter !== letter.toUpperCase()) return false;
    return !!HOUSING[s.toUpperCase()] || /^JS[67]$/.test(s);
  }

  // Calculadora de ajuste generico: acepta "k6", "H7", "M7", etc.
  // Convencion ISO: letras MINUSCULAS = clase de EJE, letras MAYUSCULAS = clase de ALOJAMIENTO (agujero).
  function calcFit(dNominal, code) {
    code = code.trim();
    if (isShaftClass(code)) {
      const r = shaftLimits(code, dNominal);
      if (!r) return null;
      return {
        kind: 'eje', code, dNominal,
        min: round3(dNominal + r.ei / 1000), max: round3(dNominal + r.es / 1000),
        es: r.es, ei: r.ei, it: r.it,
      };
    } else if (isHousingClass(code)) {
      const r = housingLimits(code, dNominal);
      if (!r) return null;
      return {
        kind: 'alojamiento', code, dNominal,
        min: round3(dNominal + r.EI / 1000), max: round3(dNominal + r.ES / 1000),
        ES: r.ES, EI: r.EI, it: r.it,
      };
    }
    return null;
  }

  function round3(n) { return Math.round(n * 1000) / 1000; }

  // Ajustes recomendados tipicos para asientos de rodamientos (regla de bolsillo
  // de uso general en mantenimiento industrial, segun tipo de carga del aro):
  const RECOMMENDED = {
    shaft: [
      { cond: 'Carga normal o ligera, aro interior giratorio (uso general)', classes: ['j6', 'k5', 'k6'] },
      { cond: 'Carga pesada o de impacto, aro interior giratorio', classes: ['m5', 'm6', 'n6'] },
      { cond: 'Carga muy pesada, ejes de gran diametro', classes: ['p6', 'r6'] },
      { cond: 'Aro interior estacionario (carga giratoria en el alojamiento)', classes: ['g6', 'h6'] },
    ],
    housing: [
      { cond: 'Aro exterior estacionario (caso general en motores electricos)', classes: ['H7', 'J7'] },
      { cond: 'Carga giratoria en el alojamiento o carga pesada', classes: ['K7', 'M7'] },
      { cond: 'Alojamiento dividido o de pared delgada', classes: ['J6', 'JS6'] },
    ],
  };

  return { RANGES, rangeIndex, itGradeMicrons, shaftLimits, housingLimits, calcFit, RECOMMENDED, isShaftClass, isHousingClass };
})();
