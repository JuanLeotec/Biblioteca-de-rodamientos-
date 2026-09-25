# Biblioteca Técnica de Rodamientos Industriales

Aplicación web 100% estática (HTML5 + CSS3 + JavaScript puro, sin frameworks
ni librerías externas) para identificar rodamientos industriales, consultar
sus dimensiones, tolerancias ISO 286, equivalencias entre fabricantes y
calculadoras de metrología útiles en el mantenimiento de motores eléctricos.

Funciona completamente en el navegador, sin backend ni base de datos:
toda la información vive en archivos JSON que se cargan al abrir la página.

## Contenido del proyecto

```
index.html              Página principal (estructura de la app)
css/style.css            Estilos (tema oscuro industrial: azul/gris/blanco)
js/iso286.js             Tablas y cálculos de tolerancias ISO 286
js/calc.js               Calculadoras de metrología + glosario técnico
js/app.js                Lógica principal: búsqueda, filtros, fichas, comparador…
data/bearings.json       Catálogo generado (≈3400 referencias, 7 marcas)
data/verified.json       Datos reales medidos en taller (origen: tu Excel)
data/type_desc.json      Descripciones de cada tipo de rodamiento
assets/logo.png          Logo de la empresa
```

## Cómo publicarlo en GitHub Pages

1. Crea un repositorio nuevo en GitHub (puede ser público o privado con
   GitHub Pages habilitado en tu plan).
2. Sube **todo el contenido de esta carpeta** (no la carpeta en sí, sino
   los archivos `index.html`, `css/`, `js/`, `data/`, `assets/`) a la raíz
   del repositorio, o a una rama `gh-pages` / carpeta `docs` según prefieras.
3. En GitHub: **Settings → Pages → Source**, selecciona la rama y carpeta
   donde subiste los archivos (por ejemplo `main` / `root`).
4. Espera 1–2 minutos y tu aplicación quedará publicada en:
   `https://<tu-usuario>.github.io/<tu-repositorio>/`

No necesitas build, ni `npm install`, ni configuración adicional: son
archivos estáticos servidos directamente.

### Probarlo en tu computador antes de publicar

Como el navegador bloquea `fetch()` sobre archivos locales (`file://`),
para probarlo en tu PC necesitas un mini-servidor local. Con Python ya
instalado, desde esta carpeta ejecuta:

```
python3 -m http.server 8000
```

y abre `http://localhost:8000` en tu navegador.

## Ampliar la base de datos

Todo el catálogo está en `data/bearings.json` (un array de objetos). Para
añadir o corregir referencias puedes editar ese archivo directamente —no
es necesario tocar el código— siguiendo la misma estructura de campos
(`designation`, `brand`, `type`, `series`, `d`, `D`, `B`, `Cr_kN`, `C0r_kN`,
`nmax_rpm`, `weight_kg`, `norm`, `material`, `sealOptions`).

Los datos verificados en taller (medidos realmente con calibre/micrómetro)
están en `data/verified.json`, separados del catálogo general para que
siempre se distingan con la etiqueta "✓ Verificado en taller".

## Notas importantes sobre los datos

- **Dimensiones (d × D × B):** siguen las tablas normalizadas ISO 15 /
  ISO 492 de dimensiones de acoplamiento, comunes a todos los fabricantes.
- **Capacidades de carga (Cr, C0r), velocidad máxima y peso:** son valores
  **orientativos** calculados por escalado dimensional estándar, no cifras
  copiadas de un catálogo específico. Antes de un diseño o reparación
  crítica, confirma siempre los valores exactos en el catálogo oficial
  del fabricante (SKF, FAG, NSK, NTN, KOYO, NACHI o Timken).
- **Tolerancias ISO 286:** valores normalizados de referencia técnica de
  uso general en metrología de rodamientos. Para tolerancias críticas,
  verifica contra la norma ISO 286 oficial.
- **Equivalencias entre marcas:** se calculan por coincidencia de
  dimensiones (d × D × B) y tipo, aplicando las convenciones de sufijo de
  sellado típicas de cada fabricante (SKF 2RS1 / FAG 2RSR / NSK DDU /
  NTN LLU / KOYO RS / NACHI 2NSE / Timken 2RS). Verifica siempre la
  designación exacta antes de comprar un repuesto.

## Funcionalidades incluidas

- Buscador con autocompletado por referencia (ej. `6204 C3`, `NU314`,
  `22220 EK`, `6319 INSOCOAT`).
- Búsqueda por diámetro de eje y por diámetro de alojamiento.
- Formulario de identificación por datos del motor (4 medidas → sugerencia
  de rodamientos por lado acople/libre).
- Fichas técnicas completas con tolerancias ISO 286 calculadas para ese
  diámetro exacto.
- Filtros por marca, tipo, serie, juego interno, sellado y dimensiones.
- Comparador de hasta 4 rodamientos.
- Equivalencias entre fabricantes.
- Conversor de tolerancias ISO 286 (diámetro + ajuste → mín/máx).
- Calculadoras: velocidad periférica, ajuste por interferencia, conversión
  pulgadas↔mm, expansión térmica (eje/alojamiento), juego interno radial,
  unidad de tolerancia IT.
- Glosario técnico (C3, 2RS, 2Z, INSOCOAT, Explorer, NU/NJ/NUP, series 222/223/230/231/232, etc.).

Compatible con Chrome, Edge y Firefox. Responsive (escritorio, tablet y móvil).
