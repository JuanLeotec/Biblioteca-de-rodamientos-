/* =========================================================================
   CALC.js  -  Calculadoras de metrologia y mantenimiento de rodamientos
   ========================================================================= */

/* Convenciones de designacion de sellado por marca (mismo concepto que en gen_db.py,
   para poder mostrar equivalencias realistas: SKF 2RS1 = FAG 2RSR = NSK DDU = NTN LLU ...) */
const SEAL_CODE = {
  SKF:    { '2Z': '2Z',  '2RS': '2RS1' },
  FAG:    { '2Z': '2Z',  '2RS': '2RSR' },
  NSK:    { '2Z': 'ZZ',  '2RS': 'DDU'  },
  NTN:    { '2Z': 'ZZ',  '2RS': 'LLU'  },
  KOYO:   { '2Z': 'ZZ',  '2RS': 'RS'   },
  NACHI:  { '2Z': 'ZZE', '2RS': '2NSE' },
  TIMKEN: { '2Z': 'ZZ',  '2RS': '2RS'  },
};

const CALC = (() => {

  // 1) Velocidad periferica  v = pi * d(mm) * n(rpm) / 60000   -> m/s
  function perifSpeed(d_mm, n_rpm) {
    return (Math.PI * d_mm * n_rpm) / 60000;
  }

  // 2) Ajuste por interferencia: presion de contacto y fuerza de montaje aproximada
  //    p = E * delta / d  (aprox., cubo macizo, simplificado)  [E acero ~206000 MPa]
  function interferenceFit(d_mm, interference_um, length_mm, E_MPa = 206000, frictionCoef = 0.15) {
    const delta = interference_um / 1000; // mm
    const p = (E_MPa * delta) / d_mm; // MPa, modelo simplificado de eje macizo / cubo de pared gruesa
    const area = Math.PI * d_mm * length_mm; // mm^2
    const forceN = p * area * frictionCoef; // N, fuerza axial de montaje/desmontaje aproximada
    return { pressure_MPa: p, force_N: forceN, force_kN: forceN / 1000 };
  }

  // 3) Conversion pulgadas <-> mm
  const IN_TO_MM = 25.4;
  function inToMm(v) { return v * IN_TO_MM; }
  function mmToIn(v) { return v / IN_TO_MM; }

  // 4) Expansion termica  dL = L0 * alpha * dT
  // alpha tipico: acero ~ 11.5e-6 /C ; fundicion (housing) ~ 10.5e-6 /C ; aluminio ~ 23e-6 /C
  const ALPHA = {
    'acero': 11.5e-6,
    'fundicion': 10.5e-6,
    'aluminio': 23e-6,
    'bronce': 18e-6,
  };
  function thermalExpansion(d_mm, deltaT_C, material = 'acero') {
    const a = ALPHA[material] || ALPHA.acero;
    return d_mm * a * deltaT_C; // mm de variacion de diametro
  }

  // 5) Juego interno radial tipico (valores orientativos de catalogo, micras) por
  //    grupo de juego para rodamientos rigidos de bolas, segun rango de diametro.
  const CLEARANCE_RANGES = [
    [10, 18], [18, 24], [24, 30], [30, 40], [40, 50], [50, 65], [65, 80], [80, 100], [100, 120]
  ];
  const CLEARANCE_GROUPS = {
    C2: [[0,7],[0,7],[0,7],[0,9],[0,9],[0,11],[0,11],[0,14],[0,14]],
    CN: [[2,13],[3,15],[5,18],[6,20],[6,23],[8,28],[10,30],[12,36],[15,42]],
    C3: [[5,16],[8,18],[8,20],[10,23],[10,25],[13,33],[15,35],[18,43],[20,48]],
    C4: [[10,21],[10,23],[12,26],[15,30],[15,33],[20,40],[25,44],[30,53],[35,60]],
    C5: [[13,29],[13,29],[18,32],[20,37],[20,40],[27,48],[30,55],[40,63],[40,73]],
  };
  function internalClearance(d_mm, group) {
    let idx = CLEARANCE_RANGES.findIndex(([a, b]) => d_mm > a && d_mm <= b);
    if (idx < 0) idx = d_mm <= 10 ? 0 : CLEARANCE_RANGES.length - 1;
    const tbl = CLEARANCE_GROUPS[group];
    if (!tbl) return null;
    const [min, max] = tbl[idx];
    return { min_um: min, max_um: max };
  }

  return { perifSpeed, interferenceFit, inToMm, mmToIn, thermalExpansion, internalClearance, ALPHA, CLEARANCE_GROUPS };
})();

/* =========================================================================
   GLOSARIO  -  Explicaciones tecnicas de codigos y sufijos de rodamientos
   ========================================================================= */
const GLOSARIO = {
  "C2": "Grupo de juego interno radial reducido (mas ajustado que el normal CN). Se usa cuando se requiere minima holgura, por ejemplo a baja velocidad o donde el ajuste eje/alojamiento produce expansion del aro interior.",
  "CN": "Juego interno radial normal. Es el juego estandar de fabricacion cuando no se indica ninguna letra de grupo.",
  "C3": "Grupo de juego interno radial mayor que el normal. Compensa la reduccion de holgura causada por ajustes apretados o por dilatacion termica diferencial entre aros en motores electricos; es el mas usado en mantenimiento industrial.",
  "C4": "Juego interno radial aun mayor que C3. Para condiciones de trabajo con temperaturas elevadas o ajustes muy apretados en ambos aros.",
  "C5": "Juego interno radial maximo de la gama estandar. Para condiciones extremas de temperatura o de montaje con interferencia fuerte en los dos aros.",
  "2RS": "Rodamiento obturado en ambos lados con sellos de contacto (goma sintetica) que rozan el aro contrario. Protege contra polvo y humedad y retiene la grasa de fabrica; introduce una ligera friccion adicional.",
  "RS": "Obturacion en un solo lado con sello de contacto; el lado opuesto queda abierto o blindado segun el diseno.",
  "2Z / ZZ": "Rodamiento blindado en ambos lados con chapas metalicas (sin contacto con el aro). Protege contra particulas gruesas pero no es estanco a la humedad ni al polvo fino como el sellado de contacto.",
  "Z": "Blindaje metalico en un solo lado.",
  "RSH": "Sello de contacto de diseno reforzado (perfil sintetico de alto rendimiento), usado por SKF en sustitucion de RS1/RS2 en algunas series para mejorar la retencion de grasa.",
  "INSOCOAT": "Rodamiento con recubrimiento ceramico aislante (oxido de aluminio) en el aro exterior o interior, que evita el paso de corriente electrica a traves del rodamiento. Se usa en motores con variador de frecuencia (VFD) para prevenir danos por electroerosion (fluting).",
  "Explorer": "Linea premium de SKF con mejoras en el diseno interno (geometria de pistas, acabado superficial, calidad de jaula y material) que aumenta la capacidad de carga, reduce la friccion, el ruido y la vibracion respecto al rodamiento estandar de las mismas medidas.",
  "Hibrido": "Rodamiento con bolas de ceramica (nitruro de silicio, Si3N4) y aros de acero. Reduce peso y friccion, soporta mayor velocidad y es electricamente no conductor entre bolas y pistas; muy usado en motores con VFD.",
  "Ceramico": "Rodamiento integral con bolas y/o aros ceramicos. Resistente a la corrosion, no conductor, muy ligero; usado en ambientes especiales (vacio, quimicos, altas temperaturas).",
  "NU": "Rodamiento de rodillos cilindricos sin resaltes en el aro interior: no transmite carga axial; el aro libre puede desplazarse axialmente, ideal como rodamiento 'libre' en el lado opuesto al rodamiento guia del motor.",
  "NJ": "Rodamiento de rodillos cilindricos con un resalte en el aro interior; admite carga axial ligera en un sentido, util como rodamiento 'guia' fijado axialmente de un solo lado.",
  "NUP": "Rodamiento de rodillos cilindricos con resaltes mas una arandela de fijacion (HJ) que lo convierte en rodamiento fijo, soportando carga axial en ambos sentidos.",
  "N": "Resaltes en el aro exterior y aro interior libre; misma funcion 'libre' que NU pero con el resalte invertido de posicion.",
  "NF": "Variante con resalte simple en el aro exterior, admite carga axial en un solo sentido.",
  "222": "Serie de rodamientos de rodillos esfericos (autoalineantes) ligera y estrecha (serie dimensional 22). Soporta grandes cargas radiales y alineacion automatica del eje.",
  "223": "Serie de rodillos esfericos ligera pero mas ancha que la 222 (mayor capacidad de carga axial y radial para el mismo diametro interior).",
  "230": "Serie de rodillos esfericos de seccion media, estrecha.",
  "231": "Serie de rodillos esfericos de seccion media, ancha; mayor capacidad de carga que la 230 del mismo diametro interior.",
  "232": "Serie de rodillos esfericos pesada, para las mayores cargas radiales dentro de un diametro interior dado.",
  "EK / E": "Diseno interior reforzado (jaula y geometria optimizada) de rodillos esfericos que incrementa la capacidad de carga respecto al diseno basico del mismo tamano.",
  "K (en 22220 EK)": "Indica agujero conico (1:12) para montaje sobre manguito de fijacion o eje conico, en lugar de agujero cilindrico.",
  "VL0241 / MC3VL": "Designacion especial SKF para rodamientos con recubrimiento o tratamiento aislante / antiestatico, similar en funcion a INSOCOAT segun la version.",
  "M": "Jaula mecanizada de laton (bronce) en lugar de jaula de chapa prensada; mayor robustez a alta velocidad o carga.",
  "ECM / ECP / ECJ": "Variantes constructivas del diseno optimizado de rodillos cilindricos (perfil de rodillo y pista mejorados) usadas por SKF en sus series E.",
  "P6 / P5 / P4": "Clase de precision dimensional y de giro del rodamiento (ISO 492): P6 es mas precisa que la normal (P0), P5 y P4 son de alta precision para husillos y aplicaciones de gran exactitud.",
};
