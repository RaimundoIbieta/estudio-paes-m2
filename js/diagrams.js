/** Diagramas SVG para lecciones — reemplazan arte ASCII */

export function renderDiagram(type) {
  const fns = {
    'paralelas-transversal': diagramParalelas,
    'angulos-tipos': diagramAngulosTipos,
    'triangulo-rectangulo': diagramTrianguloRect,
  };
  const fn = fns[type];
  return fn ? fn() : '';
}

function diagramParalelas() {
  const α = 35.2;
  const au = 90 + α / 2;
  const ad = α / 2;
  const bd = 270 - α / 2;
  const bi = 180 + α / 2;
  const r = 28;
  const cx1 = 200, cy1 = 55;
  const cx2 = 95, cy2 = 125;

  function label(cx, cy, angle, n) {
    const rad = (angle * Math.PI) / 180;
    const x = cx + r * Math.cos(rad);
    const y = cy - r * Math.sin(rad);
    return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-size="13" font-family="serif" fill="#1a2332">${n}</text>`;
  }

  return `<svg viewBox="0 0 280 165" class="lesson-svg" aria-label="Rectas paralelas y transversal">
    <line x1="20" y1="55" x2="260" y2="55" stroke="#1a2332" stroke-width="1.5"/>
    <line x1="20" y1="125" x2="260" y2="125" stroke="#1a2332" stroke-width="1.5"/>
    <line x1="40" y1="155" x2="240" y2="15" stroke="#1a2332" stroke-width="1.5"/>
    <text x="265" y="58" font-size="11" fill="#5c6b82">L₁</text>
    <text x="265" y="128" font-size="11" fill="#5c6b82">L₂</text>
    <text x="245" y="18" font-size="11" fill="#5c6b82">T</text>
    ${label(cx1, cy1, au, 1)}
    ${label(cx1, cy1, ad, 2)}
    ${label(cx1, cy1, bd, 3)}
    ${label(cx1, cy1, bi, 4)}
    ${label(cx2, cy2, au, 5)}
    ${label(cx2, cy2, ad, 6)}
    ${label(cx2, cy2, bd, 7)}
    ${label(cx2, cy2, bi, 8)}
  </svg>`;
}

function diagramAngulosTipos() {
  return `<svg viewBox="0 0 320 70" class="lesson-svg" aria-label="Tipos de ángulos">
    <g transform="translate(10,10)">
      <text x="25" y="52" font-size="9" fill="#5c6b82">Agudo</text>
      <line x1="0" y1="40" x2="50" y2="40" stroke="#1a2332" stroke-width="1.2"/>
      <line x1="0" y1="40" x2="38" y2="8" stroke="#1a2332" stroke-width="1.2"/>
      <path d="M 12 40 A 12 12 0 0 0 18 28" fill="none" stroke="#1e5a9e" stroke-width="1"/>
    </g>
    <g transform="translate(90,10)">
      <text x="20" y="52" font-size="9" fill="#5c6b82">Recto</text>
      <line x1="0" y1="40" x2="50" y2="40" stroke="#1a2332" stroke-width="1.2"/>
      <line x1="0" y1="40" x2="0" y2="0" stroke="#1a2332" stroke-width="1.2"/>
      <rect x="0" y="32" width="8" height="8" fill="none" stroke="#1e5a9e" stroke-width="1"/>
    </g>
    <g transform="translate(170,10)">
      <text x="18" y="52" font-size="9" fill="#5c6b82">Obtuso</text>
      <line x1="0" y1="40" x2="50" y2="40" stroke="#1a2332" stroke-width="1.2"/>
      <line x1="0" y1="40" x2="42" y2="18" stroke="#1a2332" stroke-width="1.2"/>
      <path d="M 14 40 A 14 14 0 0 0 8 30" fill="none" stroke="#1e5a9e" stroke-width="1"/>
    </g>
    <g transform="translate(250,10)">
      <text x="10" y="52" font-size="9" fill="#5c6b82">Extendido</text>
      <line x1="0" y1="40" x2="50" y2="40" stroke="#1a2332" stroke-width="1.2"/>
      <line x1="0" y1="40" x2="50" y2="40" stroke="#1a2332" stroke-width="1.2" transform="rotate(180 0 40)"/>
      <path d="M 8 40 A 8 8 0 0 0 0 32" fill="none" stroke="#1e5a9e" stroke-width="1"/>
    </g>
  </svg>`;
}

function diagramTrianguloRect() {
  return `<svg viewBox="0 0 200 120" class="lesson-svg" aria-label="Triángulo rectángulo">
    <polygon points="30,100 30,30 150,100" fill="none" stroke="#1a2332" stroke-width="1.5"/>
    <rect x="30" y="88" width="12" height="12" fill="none" stroke="#1e5a9e" stroke-width="1"/>
    <text x="18" y="68" font-size="12" font-family="serif" fill="#1a2332">a</text>
    <text x="85" y="112" font-size="12" font-family="serif" fill="#1a2332">b</text>
    <text x="95" y="58" font-size="12" font-family="serif" fill="#1a2332">c</text>
    <text x="38" y="108" font-size="11" font-family="serif" fill="#1e5a9e">α</text>
    <path d="M 42 100 A 14 14 0 0 0 38 88" fill="none" stroke="#1e5a9e" stroke-width="1"/>
  </svg>`;
}
