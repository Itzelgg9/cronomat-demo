// ============================================================
// Cronomat Organizer v2 - Frontend (SPA sin frameworks)
// ============================================================

const state = {
  usuario: null, // { id, usuario, rol, nombre, profesor_id }
  view: 'inicio',
  cursos: [],
  materias: [],
  profesores: [],
  grupos: [],
  calSelectorType: 'profesor', // 'profesor' | 'grupo'
  calSelectedId: null,
  calWeekStart: startOfWeek(new Date()),
};

// ---------- Roles ----------
const esAdmin = () => state.usuario && state.usuario.rol === 'administrador';
const esAdministrativo = () => state.usuario && state.usuario.rol === 'administrativo';
const esProfesor = () => state.usuario && state.usuario.rol === 'profesor';

const ETIQUETA_ROL = {
  administrador: 'Administrador',
  administrativo: 'Control escolar',
  profesor: 'Profesor',
};

// Iconos de la barra lateral (trazo simple, heredan el color del texto)
const ICONOS = {
  inicio: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.8V20a1 1 0 0 0 1 1h3.5v-6h5v6H18a1 1 0 0 0 1-1V9.8"/>',
  cursos: '<path d="M12 4 3 8l9 4 9-4-9-4Z"/><path d="M3 13l9 4 9-4"/><path d="M3 17.5l9 4 9-4"/>',
  materias: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H19v3H6.5A2.5 2.5 0 0 1 4 20.5Z"/>',
  profesores: '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16.5 5.6a3.2 3.2 0 0 1 0 6.3"/><path d="M18 14.4A6.2 6.2 0 0 1 21.5 20"/>',
  grupos: '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
  calendario: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
};
const icono = (v) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${ICONOS[v] || ''}</svg>`;

// Que pestanas ve cada rol
const TABS_POR_ROL = {
  administrador: [
    { view: 'inicio', label: 'Inicio' },
    { view: 'cursos', label: 'Cursos' },
    { view: 'materias', label: 'Materias' },
    { view: 'profesores', label: 'Profesores' },
    { view: 'grupos', label: 'Grupos' },
    { view: 'calendario', label: 'Calendario' },
  ],
  administrativo: [
    { view: 'inicio', label: 'Inicio' },
    { view: 'grupos', label: 'Grupos' },
    { view: 'calendario', label: 'Horarios por grupo' },
  ],
  profesor: [
    { view: 'inicio', label: 'Inicio' },
    { view: 'calendario', label: 'Mi horario' },
  ],
};

// ---------- Utilidades ----------
async function api(path, options = {}) {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    // La sesion expiro o nunca existio: de vuelta al login
    state.usuario = null;
    mostrarLogin();
    throw new Error(data.error || 'Necesitas iniciar sesión');
  }
  if (!res.ok) throw new Error(data.error || 'Error de red');
  return data;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

function openModal(html, onMount) {
  const backdrop = document.getElementById('modal-backdrop');
  const box = document.getElementById('modal-box');
  box.innerHTML = html;
  backdrop.classList.remove('hidden');
  if (onMount) onMount(box);
  backdrop.onclick = (e) => { if (e.target === backdrop) closeModal(); };
}
function closeModal() {
  document.getElementById('modal-backdrop').classList.add('hidden');
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function fmtDate(d) {
  // Componentes locales, no UTC: con toISOString un dia en México se recorre al siguiente
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}
function fmtDiaLargo(d) {
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtDateLabel(d) {
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}
function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function starsHtml(n) {
  n = Number(n) || 0;
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

// ---------- Navegacion ----------
document.getElementById('tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  setView(btn.dataset.view);
});

function pintarTabs() {
  const permitidas = TABS_POR_ROL[state.usuario.rol] || [];
  document.getElementById('tabs').innerHTML = permitidas
    .map((t) => `<button class="tab ${t.view === state.view ? 'active' : ''}" data-view="${t.view}">`
      + `${icono(t.view)}<span>${esc(t.label)}</span></button>`)
    .join('');
}

function vistaPermitida(view) {
  return (TABS_POR_ROL[state.usuario.rol] || []).some((t) => t.view === view);
}

function setView(view) {
  if (!vistaPermitida(view)) return;
  cerrarMenu();
  state.view = view;
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === view));
  render();
}

async function render() {
  const root = document.getElementById('view-root');
  if (!vistaPermitida(state.view)) {
    root.innerHTML = '<div class="empty-state">Tu usuario no tiene acceso a esta sección</div>';
    return;
  }
  root.innerHTML = esqueleto();
  try {
    switch (state.view) {
      case 'inicio': return renderInicio();
      case 'cursos': return renderCursos();
      case 'materias': return renderMaterias();
      case 'profesores': return renderProfesores();
      case 'grupos': return renderGrupos();
      case 'calendario': return renderCalendario();
      default: root.innerHTML = '<div class="empty-state">Vista no encontrada</div>';
    }
  } catch (err) {
    root.innerHTML = `<div class="empty-state">⚠️ ${esc(err.message)}</div>`;
  }
}

// ---------- Piezas de tablero ----------

// Ficha de indicador: numero grande con su contexto debajo
function indicador({ etiqueta, valor, pie, acento }) {
  return `
    <div class="kpi${acento ? ' kpi-acento' : ''}">
      <div class="kpi-etiqueta">${esc(etiqueta)}</div>
      <div class="kpi-valor">${esc(String(valor))}</div>
      ${pie ? `<div class="kpi-pie">${pie}</div>` : ''}
    </div>`;
}

// Encabezado de vista con su linea de contexto arriba
function encabezado({ sobre, titulo, sub, acciones }) {
  return `
    <div class="view-header">
      <div>
        ${sobre ? `<div class="sobre-titulo">${esc(sobre)}</div>` : ''}
        <h2>${esc(titulo)}</h2>
        ${sub ? `<div class="subtitle">${esc(sub)}</div>` : ''}
      </div>
      ${acciones || ''}
    </div>`;
}

// Esqueleto mientras carga: se siente mas solido que un "Cargando..."
function esqueleto() {
  return `
    <div class="cargando">
      <div class="esq esq-titulo"></div>
      <div class="esq-fila">
        <div class="esq esq-kpi"></div><div class="esq esq-kpi"></div>
        <div class="esq esq-kpi"></div><div class="esq esq-kpi"></div>
      </div>
      <div class="esq esq-bloque"></div>
    </div>`;
}

const totalHoras = (eventos) => eventos.reduce(
  (t, e) => t + (aMinutos(e.hora_fin) - aMinutos(e.hora_inicio)), 0) / 60;
const formatoHoras = (h) => (Number.isInteger(h) ? String(h) : h.toFixed(1).replace('.0', ''));

// ---------- INICIO ----------
// Orden en que se muestran los planteles; los que no esten aqui van despues, alfabeticos
const ORDEN_PLANTELES = ['Hidalgo', 'San Cosme'];

function ordenarPlanteles(lista) {
  return [...lista].sort((a, b) => {
    const ia = ORDEN_PLANTELES.indexOf(a);
    const ib = ORDEN_PLANTELES.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return a.localeCompare(b, 'es');
  });
}

// ---------- Rejilla de calendario ----------
const ALTO_SLOT = 28;   // pixeles que mide media hora
const MIN_SLOT = 30;    // minutos por slot

// Sobre un fondo claro el texto blanco no se lee. Se calcula el contraste real
// contra blanco y contra gris oscuro, y se usa el que se lea mejor.
function luminancia(hex) {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return 0;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function colorTexto(fondo) {
  const L = luminancia(fondo);
  const contraste = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const conBlanco = contraste(L, 1);
  const conOscuro = contraste(L, luminancia('#1f2937'));
  return conOscuro > conBlanco ? '#1f2937' : '#fff';
}
const COLOR_SIN_CURSO = '#6B7280';

const aMinutos = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + m;
};
const aHora = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

// Reparte en columnas las clases que se encimen, para que no queden una encima de otra
function acomodarEnColumnas(eventos) {
  const orden = [...eventos].sort((a, b) => aMinutos(a.hora_inicio) - aMinutos(b.hora_inicio)
    || aMinutos(a.hora_fin) - aMinutos(b.hora_fin));
  const colocados = [];
  let grupo = [];
  let finGrupo = -1;

  const cerrarGrupo = () => {
    if (!grupo.length) return;
    const columnas = [];
    for (const ev of grupo) {
      let col = columnas.findIndex((finCol) => finCol <= aMinutos(ev.hora_inicio));
      if (col === -1) { columnas.push(aMinutos(ev.hora_fin)); col = columnas.length - 1; }
      else columnas[col] = aMinutos(ev.hora_fin);
      ev._col = col;
    }
    for (const ev of grupo) ev._cols = columnas.length;
    colocados.push(...grupo);
    grupo = [];
    finGrupo = -1;
  };

  for (const ev of orden) {
    // Si ya no se encima con nada del grupo actual, el grupo se cierra
    if (grupo.length && aMinutos(ev.hora_inicio) >= finGrupo) cerrarGrupo();
    grupo.push(ev);
    finGrupo = Math.max(finGrupo, aMinutos(ev.hora_fin));
  }
  cerrarGrupo();
  return colocados;
}

/**
 * Dibuja un calendario. `dias` es un arreglo de Date.
 * Cada clase se pinta desde su hora de inicio hasta su hora de fin.
 */
// Muestra que color corresponde a cada curso de los que aparecen en pantalla
function leyendaCursos(eventos) {
  const vistos = new Map();
  for (const e of eventos) {
    const nombre = e.curso_nombre || 'Sin curso';
    if (!vistos.has(nombre)) vistos.set(nombre, e.curso_color || COLOR_SIN_CURSO);
  }
  if (!vistos.size) return '';
  const items = [...vistos.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es'));
  return `<div class="leyenda">
    ${items.map(([nombre, color]) => `
      <span class="leyenda-item">
        <span class="leyenda-color" style="background:${esc(color)}"></span>${esc(nombre)}
      </span>`).join('')}
  </div>`;
}

function rejillaCalendario(eventos, dias, {
  mostrarProfesor = true,
  mostrarGrupo = true,
  desde: desdeFijo = null,   // '07:00' para mostrar siempre la misma franja
  hasta: hastaFijo = null,
  interactivo = false,       // agrega los data-* que necesitan los clicks
} = {}) {
  if (!eventos.length && !desdeFijo) {
    return '<div class="dia-vacio">Sin clases programadas</div>';
  }

  let desde;
  let hasta;
  if (desdeFijo) {
    // Franja fija, pero se estira si hay clases fuera de ella
    desde = aMinutos(desdeFijo);
    hasta = aMinutos(hastaFijo || '21:00');
    if (eventos.length) {
      desde = Math.min(desde, Math.floor(Math.min(...eventos.map((e) => aMinutos(e.hora_inicio))) / 60) * 60);
      hasta = Math.max(hasta, Math.ceil(Math.max(...eventos.map((e) => aMinutos(e.hora_fin))) / 60) * 60);
    }
  } else {
    // El rango se ajusta a lo que realmente hay ese periodo
    desde = Math.floor(Math.min(...eventos.map((e) => aMinutos(e.hora_inicio))) / 60) * 60;
    hasta = Math.ceil(Math.max(...eventos.map((e) => aMinutos(e.hora_fin))) / 60) * 60;
    if (hasta - desde < 180) hasta = desde + 180; // que no quede una franja diminuta
  }

  const totalSlots = (hasta - desde) / MIN_SLOT;
  const alto = totalSlots * ALTO_SLOT;
  const horas = [];
  for (let m = desde; m < hasta; m += 60) horas.push(m);

  const nombresDia = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

  const cabeceras = dias.map((d) => {
    const idx = (d.getDay() + 6) % 7;
    const esHoy = fmtDate(d) === fmtDate(new Date());
    return `<div class="cal2-cabecera ${esHoy ? 'hoy' : ''}">
      <span class="cal2-dianombre">${nombresDia[idx]}</span>
      <span class="cal2-dianum">${esc(fmtDateLabel(d))}</span>
    </div>`;
  }).join('');

  const columnaHoras = `<div class="cal2-horas" style="height:${alto}px">
    ${horas.map((m) => `<div class="cal2-hora" style="height:${(60 / MIN_SLOT) * ALTO_SLOT}px">${aHora(m)}</div>`).join('')}
  </div>`;

  // Se resuelve primero el acomodo de cada dia: los dias con clases encimadas
  // necesitan una columna mas ancha para que no se corte el texto
  const ANCHO_CLASE = 132; // ancho comodo para una clase
  const porDia = dias.map((d) => {
    const fecha = fmtDate(d);
    return { d, fecha, clases: acomodarEnColumnas(eventos.filter((e) => e.fecha === fecha)) };
  });
  const anchoDia = porDia.map(({ clases }) =>
    ANCHO_CLASE * Math.max(1, ...clases.map((e) => e._cols || 1)));

  const columnasDias = porDia.map(({ d, fecha, clases: delDia }) => {
    const bloques = delDia.map((ev) => {
      const ini = Math.max(aMinutos(ev.hora_inicio), desde);
      const fin = Math.min(aMinutos(ev.hora_fin), hasta);
      const top = ((ini - desde) / MIN_SLOT) * ALTO_SLOT;
      const altoEv = Math.max(((fin - ini) / MIN_SLOT) * ALTO_SLOT - 2, 18);
      const ancho = 100 / ev._cols;
      const detalles = [];
      // En una clase de area se juntan varios grupos: se listan todos
      if (mostrarGrupo) {
        detalles.push(esc(ev.grupos_total > 1 ? ev.grupos_nombres.replace(/ \| /g, ', ') : ev.grupo_nombre));
      }
      if (ev.plantel) detalles.push(esc(ev.plantel));
      if (mostrarProfesor) detalles.push(esc(`${ev.profesor_nombre} ${ev.profesor_apellido || ''}`.trim()));
      const titulo = `${ev.hora_inicio} a ${ev.hora_fin} — ${ev.materia_nombre}`
        + (ev.curso_nombre ? ` (${ev.curso_nombre})` : '')
        + (ev.area_nombre ? ` — ${ev.area_nombre}` : '')
        + (detalles.length ? ` — ${detalles.join(' · ')}` : '');
      const fondo = ev.curso_color || COLOR_SIN_CURSO;
      const dur = aMinutos(ev.hora_fin) - aMinutos(ev.hora_inicio);
      // Segun lo alto que quede el bloque se recorta cuanta info cabe
      const talla = dur <= 30 ? 'corta' : dur <= 60 ? 'media' : dur <= 90 ? 'justa' : '';
      return `<div class="cal2-ev ${talla}" title="${esc(titulo)}"
        ${interactivo ? `data-ev-id="${ev.id}"` : ''}
        style="top:${top}px; height:${altoEv}px; left:${ev._col * ancho}%; width:calc(${ancho}% - 3px);
               background:${esc(fondo)}; color:${colorTexto(fondo)}">
        <b>${esc(ev.hora_inicio)} a ${esc(ev.hora_fin)}</b>
        <span class="cal2-materia">${esc(ev.materia_nombre)}</span>
        ${ev.curso_nombre ? `<span class="cal2-curso">${esc(ev.curso_nombre)}</span>` : ''}
        ${ev.area_clave ? `<span class="cal2-area">${esc(ev.area_clave)} · ${esc(ev.area_institucion)}</span>` : ''}
        ${detalles.length ? `<span class="cal2-detalle">${detalles.join(' · ')}</span>` : ''}
      </div>`;
    }).join('');
    // Marca de la hora actual, solo en la columna de hoy y si cae en el rango
    let ahora = '';
    if (fecha === fmtDate(new Date())) {
      const n = new Date();
      const min = n.getHours() * 60 + n.getMinutes();
      if (min >= desde && min <= hasta) {
        const y = ((min - desde) / MIN_SLOT) * ALTO_SLOT;
        ahora = `<div class="cal2-ahora" style="top:${y}px" title="Ahora, ${aHora(min)}"></div>`;
      }
    }
    return `<div class="cal2-dia" ${interactivo ? `data-fecha="${fecha}"` : ''}
      style="height:${alto}px; background-size:100% ${ALTO_SLOT * 2}px">${ahora}${bloques}</div>`;
  }).join('');

  const columnas = `58px ${anchoDia.map((a) => `minmax(${a}px, 1fr)`).join(' ')}`;

  return `<div class="cal2" style="--dias:${dias.length}; grid-template-columns:${columnas}"
    data-desde="${desde}" data-alto="${ALTO_SLOT}" data-min="${MIN_SLOT}">
    <div class="cal2-esquina"></div>
    ${cabeceras}
    ${columnaHoras}
    ${columnasDias}
  </div>`;
}

async function renderInicio() {
  const saludo = state.usuario.nombre || state.usuario.usuario;
  const root = document.getElementById('view-root');

  // ---------- Administrador: la semana completa, separada por plantel ----------
  if (esAdmin()) {
    const inicio = state.calWeekStart;
    const fin = addDays(inicio, 6);
    const eventos = await api(`/horarios?desde=${fmtDate(inicio)}&hasta=${fmtDate(fin)}`);

    const planteles = ordenarPlanteles([...new Set(eventos.map((e) => e.plantel || 'Sin plantel'))]);
    const dias = Array.from({ length: 7 }, (_, i) => addDays(inicio, i));

    const horas = totalHoras(eventos);
    const profesoresDistintos = new Set(eventos.map((e) => e.profesor_id)).size;
    const gruposDistintos = new Set(eventos.map((e) => e.grupo_id)).size;

    root.innerHTML = `
      ${encabezado({
        sobre: 'Panel general',
        titulo: `Bienvenido, ${saludo}`,
        sub: 'Clases agendadas de la semana, por plantel',
      })}
      <div class="kpi-fila">
        ${indicador({ etiqueta: 'Clases esta semana', valor: eventos.length, acento: true,
          pie: planteles.map((p) => `${esc(p)} ${eventos.filter((e) => (e.plantel || 'Sin plantel') === p).length}`).join(' · ') })}
        ${indicador({ etiqueta: 'Horas de clase', valor: formatoHoras(horas),
          pie: eventos.length ? `Promedio ${formatoHoras(horas / eventos.length)} h por clase` : '' })}
        ${indicador({ etiqueta: 'Profesores frente a grupo', valor: profesoresDistintos })}
        ${indicador({ etiqueta: 'Grupos con clase', valor: gruposDistintos,
          pie: `${planteles.length} plantel(es)` })}
      </div>
      <div class="week-nav">
        <button class="btn secondary small" id="ini-prev">← Semana anterior</button>
        <span class="label">Semana del ${esc(fmtDate(inicio))} al ${esc(fmtDate(fin))}</span>
        <button class="btn secondary small" id="ini-next">Semana siguiente →</button>
      </div>
      ${eventos.length === 0
        ? emptyState('Sin clases esta semana', 'Usa las flechas para moverte a otra semana')
        : planteles.map((plantel) => {
          const delPlantel = eventos.filter((e) => (e.plantel || 'Sin plantel') === plantel);
          return `
            <section class="plantel-bloque">
              <div class="plantel-titulo">
                <h3>Plantel ${esc(plantel)}</h3>
                <span class="badge">${delPlantel.length} clase(s)</span>
              </div>
              <div class="plantel-cuerpo">
                ${leyendaCursos(delPlantel)}
                ${rejillaCalendario(delPlantel, dias, {})}
              </div>
            </section>`;
        }).join('')}
    `;

    document.getElementById('ini-prev').addEventListener('click', () => {
      state.calWeekStart = addDays(state.calWeekStart, -7); renderInicio();
    });
    document.getElementById('ini-next').addEventListener('click', () => {
      state.calWeekStart = addDays(state.calWeekStart, 7); renderInicio();
    });
    return;
  }

  // ---------- Control escolar: el horario de hoy, solo de su plantel ----------
  if (esAdministrativo()) {
    const hoy = fmtDate(new Date());
    const eventos = await api(`/horarios?desde=${hoy}&hasta=${hoy}`);
    const plantel = state.usuario.plantel;

    const horasHoy = totalHoras(eventos);
    root.innerHTML = `
      ${encabezado({
        sobre: plantel ? `Plantel ${plantel}` : 'Todos los planteles',
        titulo: `Bienvenido, ${saludo}`,
        sub: 'Horario de hoy',
      })}
      <div class="kpi-fila">
        ${indicador({ etiqueta: 'Clases hoy', valor: eventos.length, acento: true })}
        ${indicador({ etiqueta: 'Horas de clase', valor: formatoHoras(horasHoy) })}
        ${indicador({ etiqueta: 'Grupos en operación', valor: new Set(eventos.map((e) => e.grupo_id)).size })}
        ${indicador({ etiqueta: 'Profesores en aula', valor: new Set(eventos.map((e) => e.profesor_id)).size })}
      </div>
      <section class="plantel-bloque">
        <div class="plantel-titulo">
          <h3>${esc(fmtDiaLargo(new Date()))}</h3>
          <span class="badge">${eventos.length} clase(s)</span>
        </div>
        <div class="plantel-cuerpo">
          ${eventos.length
            ? leyendaCursos(eventos) + rejillaCalendario(eventos, [new Date()], {})
            : '<div class="dia-vacio">Hoy no hay clases programadas en tu plantel</div>'}
        </div>
      </section>
      <div class="detail-section" style="margin-top:20px">
        <h3>Ver otra fecha</h3>
        <p style="color:var(--text-muted); font-size:14px">
          Entra a <b>Horarios por grupo</b> para elegir un grupo y moverte por semana.
        </p>
      </div>
    `;
    return;
  }

  // ---------- Profesor: su semana completa ----------
  const inicioSem = state.calWeekStart;
  const finSem = addDays(inicioSem, 6);
  const dias = Array.from({ length: 7 }, (_, i) => addDays(inicioSem, i));
  const eventos = await api(`/horarios?desde=${fmtDate(inicioSem)}&hasta=${fmtDate(finSem)}`);

  const hoy = fmtDate(new Date());
  const ahoraHM = new Date().toTimeString().slice(0, 5);
  const deHoy = eventos.filter((e) => e.fecha === hoy);

  // La siguiente clase: hoy si aun queda, si no la primera de los dias que vienen
  const ordenadas = eventos.slice().sort((a, b) =>
    a.fecha.localeCompare(b.fecha) || a.hora_inicio.localeCompare(b.hora_inicio));
  const proxima = ordenadas.find((e) => e.fecha > hoy || (e.fecha === hoy && e.hora_fin > ahoraHM));
  const esHoy = proxima && proxima.fecha === hoy;

  root.innerHTML = `
    ${encabezado({ sobre: 'Mi semana', titulo: `Hola, ${saludo}`, sub: 'Tu horario de la semana' })}
    <div class="kpi-fila">
      ${indicador({ etiqueta: 'Clases esta semana', valor: eventos.length, acento: true,
        pie: `${deHoy.length} hoy` })}
      ${indicador({ etiqueta: 'Horas frente a grupo', valor: formatoHoras(totalHoras(eventos)),
        pie: deHoy.length ? `${formatoHoras(totalHoras(deHoy))} h hoy` : 'Hoy sin clases' })}
      ${indicador({ etiqueta: 'Siguiente clase',
        valor: proxima ? proxima.hora_inicio : '—',
        pie: proxima
          ? `${esHoy ? 'Hoy' : esc(fmtDateLabel(new Date(`${proxima.fecha}T12:00:00`)))} · ${esc(proxima.materia_nombre)} · ${esc(proxima.grupo_nombre)}`
          : 'Sin clases pendientes esta semana' })}
      ${indicador({ etiqueta: 'Grupos que atiendes', valor: new Set(eventos.map((e) => e.grupo_id)).size })}
    </div>

    <div class="week-nav">
      <button class="btn secondary small" id="ini-prev">← Semana anterior</button>
      <span class="label">Semana del ${esc(fmtDate(inicioSem))} al ${esc(fmtDate(finSem))}</span>
      <button class="btn secondary small" id="ini-next">Semana siguiente →</button>
      <button class="btn ghost small" id="ini-hoy">Ir a esta semana</button>
    </div>

    <section class="plantel-bloque">
      <div class="plantel-titulo">
        <h3>Mi horario</h3>
        <span class="badge">${eventos.length} clase(s)</span>
      </div>
      <div class="plantel-cuerpo">
        ${eventos.length
          ? leyendaCursos(eventos) + rejillaCalendario(eventos, dias, { mostrarProfesor: false })
          : '<div class="dia-vacio">No tienes clases programadas esta semana</div>'}
      </div>
    </section>
  `;

  document.getElementById('ini-prev').addEventListener('click', () => {
    state.calWeekStart = addDays(state.calWeekStart, -7); renderInicio();
  });
  document.getElementById('ini-next').addEventListener('click', () => {
    state.calWeekStart = addDays(state.calWeekStart, 7); renderInicio();
  });
  document.getElementById('ini-hoy').addEventListener('click', () => {
    state.calWeekStart = startOfWeek(new Date()); renderInicio();
  });
}

// ---------- CURSOS ----------
async function renderCursos() {
  const cursos = await api('/cursos');
  state.cursos = cursos;
  const root = document.getElementById('view-root');
  root.innerHTML = `
    <div class="view-header">
      <div><h2>Cursos</h2><div class="subtitle">${cursos.length} curso(s) registrados</div></div>
      <button class="btn" id="btn-new-curso">+ Nuevo curso</button>
    </div>
    ${cursos.length ? `<div class="card-grid">${cursos.map(cursoCard).join('')}</div>` :
      emptyState('No hay cursos todavía', 'Crea el primero con el botón "+ Nuevo curso"')}
  `;
  document.getElementById('btn-new-curso').addEventListener('click', () => cursoFormModal());
  root.querySelectorAll('[data-curso-id]').forEach((el) => {
    el.addEventListener('click', () => cursoDetail(el.dataset.cursoId));
  });
}
function cursoCard(c) {
  return `<div class="card" data-curso-id="${c.id}">
    <h3>${esc(c.nombre)}</h3>
    <div class="meta">Click para ver materias</div>
  </div>`;
}
function emptyState(title, subtitle) {
  return `<div class="empty-state"><div class="icon">📭</div><div><b>${esc(title)}</b></div><div>${esc(subtitle)}</div></div>`;
}
function cursoFormModal(curso = null) {
  openModal(`
    <h3>${curso ? 'Editar curso' : 'Nuevo curso'}</h3>
    <div class="form-grid single">
      <div class="field"><label>Nombre</label><input id="f-nombre" value="${curso ? esc(curso.nombre) : ''}" placeholder="Ej. Ing Bachillerato"></div>
    </div>
    <div class="modal-actions">
      <button class="btn secondary" id="btn-cancel">Cancelar</button>
      <button class="btn" id="btn-save">Guardar</button>
    </div>
  `, (box) => {
    box.querySelector('#btn-cancel').addEventListener('click', closeModal);
    box.querySelector('#btn-save').addEventListener('click', async () => {
      const nombre = box.querySelector('#f-nombre').value.trim();
      if (!nombre) return showToast('El nombre es obligatorio', 'error');
      try {
        if (curso) await api(`/cursos/${curso.id}`, { method: 'PUT', body: JSON.stringify({ nombre }) });
        else await api('/cursos', { method: 'POST', body: JSON.stringify({ nombre }) });
        closeModal(); showToast('Curso guardado', 'success'); renderCursos();
      } catch (err) { showToast(err.message, 'error'); }
    });
  });
}
async function cursoDetail(id) {
  const curso = await api(`/cursos/${id}`);
  const root = document.getElementById('view-root');
  root.innerHTML = `
    <div class="view-header">
      <div><h2>${esc(curso.nombre)}</h2><div class="subtitle">${curso.materias.length} materia(s)</div></div>
      <div style="display:flex; gap:8px">
        <button class="btn secondary" id="btn-back">← Volver</button>
        <button class="btn secondary" id="btn-edit">Editar</button>
        <button class="btn danger" id="btn-del">Eliminar</button>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Materia</th><th></th></tr></thead>
        <tbody>
          ${curso.materias.map((m) => `<tr><td>${esc(m.nombre)}</td><td></td></tr>`).join('') ||
            '<tr><td colspan="2" style="text-align:center;color:var(--text-muted)">Sin materias</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
  document.getElementById('btn-back').addEventListener('click', renderCursos);
  document.getElementById('btn-edit').addEventListener('click', () => cursoFormModal(curso));
  document.getElementById('btn-del').addEventListener('click', async () => {
    if (!confirm(`¿Eliminar el curso "${curso.nombre}" y todas sus materias?`)) return;
    await api(`/cursos/${id}`, { method: 'DELETE' });
    showToast('Curso eliminado', 'success'); renderCursos();
  });
}

// ---------- MATERIAS ----------
async function renderMaterias() {
  const [materias, cursos] = await Promise.all([api('/materias'), api('/cursos')]);
  state.materias = materias; state.cursos = cursos;
  const root = document.getElementById('view-root');
  root.innerHTML = `
    <div class="view-header">
      <div><h2>Materias</h2><div class="subtitle">${materias.length} materia(s) registradas</div></div>
      <button class="btn" id="btn-new-materia" ${cursos.length ? '' : 'disabled'}>+ Nueva materia</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Nombre</th><th>Curso</th><th></th></tr></thead>
        <tbody>
          ${materias.map((m) => `
            <tr>
              <td>${esc(m.nombre)}</td>
              <td>${esc(m.curso_nombre)}</td>
              <td><button class="btn small danger" data-del="${m.id}">Eliminar</button></td>
            </tr>`).join('') || '<tr><td colspan="3" style="text-align:center;color:var(--text-muted)">Sin materias</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
  document.getElementById('btn-new-materia').addEventListener('click', () => materiaFormModal(cursos));
  root.querySelectorAll('[data-del]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar esta materia?')) return;
      await api(`/materias/${btn.dataset.del}`, { method: 'DELETE' });
      showToast('Materia eliminada', 'success'); renderMaterias();
    });
  });
}
function materiaFormModal(cursos) {
  openModal(`
    <h3>Nueva materia</h3>
    <div class="form-grid single">
      <div class="field"><label>Nombre</label><input id="f-nombre" placeholder="Ej. Matematicas"></div>
      <div class="field"><label>Curso</label>
        <select id="f-curso">${cursos.map((c) => `<option value="${c.id}">${esc(c.nombre)}</option>`).join('')}</select>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn secondary" id="btn-cancel">Cancelar</button>
      <button class="btn" id="btn-save">Guardar</button>
    </div>
  `, (box) => {
    box.querySelector('#btn-cancel').addEventListener('click', closeModal);
    box.querySelector('#btn-save').addEventListener('click', async () => {
      const nombre = box.querySelector('#f-nombre').value.trim();
      const curso_id = box.querySelector('#f-curso').value;
      if (!nombre) return showToast('El nombre es obligatorio', 'error');
      try {
        await api('/materias', { method: 'POST', body: JSON.stringify({ nombre, curso_id }) });
        closeModal(); showToast('Materia creada', 'success'); renderMaterias();
      } catch (err) { showToast(err.message, 'error'); }
    });
  });
}

// ---------- PROFESORES ----------
async function renderProfesores() {
  const profesores = await api('/profesores');
  state.profesores = profesores;
  const root = document.getElementById('view-root');
  root.innerHTML = `
    <div class="view-header">
      <div><h2>Profesores</h2><div class="subtitle">${profesores.length} profesor(es) registrados</div></div>
      <button class="btn" id="btn-new-profesor">+ Nuevo profesor</button>
    </div>
    ${profesores.length ? `<div class="card-grid">${profesores.map(profesorCard).join('')}</div>` :
      emptyState('No hay profesores todavía', 'Crea el primero con el botón "+ Nuevo profesor"')}
  `;
  document.getElementById('btn-new-profesor').addEventListener('click', () => profesorFormModal());
  root.querySelectorAll('[data-prof-id]').forEach((el) => {
    el.addEventListener('click', () => profesorDetail(el.dataset.profId));
  });
}
function profesorCard(p) {
  return `<div class="card" data-prof-id="${p.id}">
    <h3>${esc(p.nombre)} ${esc(p.apellido_paterno || '')}</h3>
    <div class="meta">${esc(p.correo || 'Sin correo')}</div>
    <div class="meta">${esc(p.celular || 'Sin celular')}</div>
  </div>`;
}
function profesorFormModal(profesor = null) {
  openModal(`
    <h3>${profesor ? 'Editar profesor' : 'Nuevo profesor'}</h3>
    <div class="form-grid">
      <div class="field"><label>Nombre</label><input id="f-nombre" value="${profesor ? esc(profesor.nombre) : ''}"></div>
      <div class="field"><label>Apellido paterno</label><input id="f-ap" value="${profesor ? esc(profesor.apellido_paterno || '') : ''}"></div>
      <div class="field"><label>Apellido materno</label><input id="f-am" value="${profesor ? esc(profesor.apellido_materno || '') : ''}"></div>
      <div class="field"><label>Correo (para notificaciones)</label><input id="f-correo" type="email" value="${profesor ? esc(profesor.correo || '') : ''}" placeholder="correo@ejemplo.com"></div>
      <div class="field"><label>Celular (para WhatsApp)</label><input id="f-celular" value="${profesor ? esc(profesor.celular || '') : ''}" placeholder="5511223344"></div>
      <div class="field"><label>Usuario</label><input id="f-usuario" value="${profesor ? esc(profesor.usuario || '') : ''}"></div>
      <div class="field"><label>Contraseña</label><input id="f-password" type="password" placeholder="${profesor ? 'Dejar en blanco para no cambiar' : ''}"></div>
    </div>
    <div class="modal-actions">
      <button class="btn secondary" id="btn-cancel">Cancelar</button>
      <button class="btn" id="btn-save">Guardar</button>
    </div>
  `, (box) => {
    box.querySelector('#btn-cancel').addEventListener('click', closeModal);
    box.querySelector('#btn-save').addEventListener('click', async () => {
      const payload = {
        nombre: box.querySelector('#f-nombre').value.trim(),
        apellido_paterno: box.querySelector('#f-ap').value.trim(),
        apellido_materno: box.querySelector('#f-am').value.trim(),
        correo: box.querySelector('#f-correo').value.trim(),
        celular: box.querySelector('#f-celular').value.trim(),
        usuario: box.querySelector('#f-usuario').value.trim(),
      };
      const pass = box.querySelector('#f-password').value;
      if (pass) payload.password = pass;
      if (!payload.nombre) return showToast('El nombre es obligatorio', 'error');
      try {
        if (profesor) await api(`/profesores/${profesor.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        else await api('/profesores', { method: 'POST', body: JSON.stringify(payload) });
        closeModal(); showToast('Profesor guardado', 'success'); renderProfesores();
      } catch (err) { showToast(err.message, 'error'); }
    });
  });
}
async function profesorDetail(id) {
  const [profesor, materias, cursos] = await Promise.all([
    api(`/profesores/${id}`), api('/materias'), api('/cursos'),
  ]);
  const root = document.getElementById('view-root');
  root.innerHTML = `
    <div class="view-header">
      <div><h2>${esc(profesor.nombre)} ${esc(profesor.apellido_paterno || '')}</h2>
        <div class="subtitle">${esc(profesor.correo || 'sin correo')} · ${esc(profesor.celular || 'sin celular')}</div></div>
      <div style="display:flex; gap:8px">
        <button class="btn secondary" id="btn-back">← Volver</button>
        <button class="btn secondary" id="btn-edit">Editar</button>
        <button class="btn secondary" id="btn-ver-horario">Ver horario</button>
        <button class="btn danger" id="btn-del">Eliminar</button>
      </div>
    </div>

    <div class="detail-section">
      <h3>Materias asignadas</h3>
      <div class="table-wrap" style="margin-bottom:14px">
        <table>
          <thead><tr><th>Materia</th><th>Curso</th><th>Desempeño</th><th></th></tr></thead>
          <tbody>
            ${profesor.materias.map((m) => `
              <tr>
                <td>${esc(m.materia_nombre)}</td>
                <td>${esc(m.curso_nombre)}</td>
                <td class="stars">${starsHtml(m.desempeno)}</td>
                <td><button class="btn small danger" data-del-asig="${m.asignacion_id}">Quitar</button></td>
              </tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">Sin materias asignadas</td></tr>'}
          </tbody>
        </table>
      </div>
      <div class="form-grid">
        <div class="field"><label>Curso</label>
          <select id="asig-curso">${cursos.map((c) => `<option value="${c.id}">${esc(c.nombre)}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Materia</label><select id="asig-materia"></select></div>
      </div>
      <button class="btn" id="btn-asignar-materia" style="margin-top:10px">+ Asignar materia (envía correo/WhatsApp)</button>
      <div id="notif-result"></div>
    </div>

    <div class="detail-section">
      <h3>Días no disponibles</h3>
      <div class="table-wrap" style="margin-bottom:14px">
        <table>
          <thead><tr><th>Fecha</th><th>Motivo</th><th></th></tr></thead>
          <tbody>
            ${profesor.dias_no_disponibles.map((d) => `
              <tr><td>${esc(d.fecha)}</td><td>${esc(d.motivo || '—')}</td>
              <td><button class="btn small danger" data-del-dia="${d.id}">Quitar</button></td></tr>
            `).join('') || '<tr><td colspan="3" style="text-align:center;color:var(--text-muted)">Ninguno</td></tr>'}
          </tbody>
        </table>
      </div>
      <div class="form-grid">
        <div class="field"><label>Fecha</label><input type="date" id="dia-fecha"></div>
        <div class="field"><label>Motivo (opcional)</label><input id="dia-motivo" placeholder="Ej. Vacaciones"></div>
      </div>
      <button class="btn secondary" id="btn-agregar-dia" style="margin-top:10px">+ Agregar día no disponible</button>
    </div>
  `;

  document.getElementById('btn-back').addEventListener('click', renderProfesores);
  document.getElementById('btn-edit').addEventListener('click', () => profesorFormModal(profesor));
  document.getElementById('btn-ver-horario').addEventListener('click', () => {
    state.calSelectorType = 'profesor';
    state.calSelectedId = String(id);
    setView('calendario');
  });
  document.getElementById('btn-del').addEventListener('click', async () => {
    if (!confirm(`¿Eliminar al profesor ${profesor.nombre}?`)) return;
    await api(`/profesores/${id}`, { method: 'DELETE' });
    showToast('Profesor eliminado', 'success'); renderProfesores();
  });

  const cursoSel = document.getElementById('asig-curso');
  const materiaSel = document.getElementById('asig-materia');
  function refreshMateriaOptions() {
    const opciones = materias.filter((m) => String(m.curso_id) === cursoSel.value);
    materiaSel.innerHTML = opciones.map((m) => `<option value="${m.id}">${esc(m.nombre)}</option>`).join('') ||
      '<option value="">Sin materias en este curso</option>';
  }
  cursoSel.addEventListener('change', refreshMateriaOptions);
  refreshMateriaOptions();

  document.getElementById('btn-asignar-materia').addEventListener('click', async () => {
    const materia_id = materiaSel.value;
    if (!materia_id) return showToast('Selecciona una materia', 'error');
    const btn = document.getElementById('btn-asignar-materia');
    btn.disabled = true; btn.textContent = 'Asignando y notificando...';
    try {
      const result = await api(`/profesores/${id}/materias`, {
        method: 'POST', body: JSON.stringify({ materia_id }),
      });
      showToast('Materia asignada. Notificaciones enviadas.', 'success');
      const n = result.notificaciones || {};
      document.getElementById('notif-result').innerHTML = `
        <div class="notif-summary">
          Correo: <span class="${n.email && n.email.ok ? 'ok' : 'fail'}">${n.email && n.email.ok ? 'enviado ✓' : (n.email && n.email.error) || 'no enviado'}</span>
          &nbsp;|&nbsp; WhatsApp: <span class="${n.whatsapp && n.whatsapp.ok ? 'ok' : 'fail'}">${n.whatsapp && n.whatsapp.ok ? 'enviado ✓' : (n.whatsapp && n.whatsapp.error) || 'no enviado'}</span>
        </div>`;
      profesorDetail(id);
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false; btn.textContent = '+ Asignar materia (envía correo/WhatsApp)';
    }
  });

  root.querySelectorAll('[data-del-asig]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api(`/profesores/${id}/materias/${btn.dataset.delAsig}`, { method: 'DELETE' });
      showToast('Materia removida', 'success'); profesorDetail(id);
    });
  });

  document.getElementById('btn-agregar-dia').addEventListener('click', async () => {
    const fecha = document.getElementById('dia-fecha').value;
    const motivo = document.getElementById('dia-motivo').value.trim();
    if (!fecha) return showToast('Selecciona una fecha', 'error');
    await api(`/profesores/${id}/dias-no-disponibles`, { method: 'POST', body: JSON.stringify({ fecha, motivo }) });
    showToast('Día no disponible agregado', 'success'); profesorDetail(id);
  });
  root.querySelectorAll('[data-del-dia]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api(`/profesores/${id}/dias-no-disponibles/${btn.dataset.delDia}`, { method: 'DELETE' });
      showToast('Registro eliminado', 'success'); profesorDetail(id);
    });
  });
}

// ---------- GRUPOS ----------
async function renderGrupos() {
  const grupos = await api('/grupos');
  state.grupos = grupos;
  const root = document.getElementById('view-root');
  root.innerHTML = `
    <div class="view-header">
      <div><h2>Grupos</h2><div class="subtitle">${grupos.length} grupo(s) registrados</div></div>
      ${esAdmin() ? '<button class="btn" id="btn-new-grupo">+ Nuevo grupo</button>' : ''}
    </div>
    ${grupos.length ? `<div class="card-grid">${grupos.map(grupoCard).join('')}</div>` :
      emptyState('No hay grupos todavía', esAdmin() ? 'Crea el primero con el botón "+ Nuevo grupo"' : 'Todavía no hay grupos registrados')}
  `;
  const btnNuevoGrupo = document.getElementById('btn-new-grupo');
  if (btnNuevoGrupo) btnNuevoGrupo.addEventListener('click', () => grupoFormModal());
  root.querySelectorAll('[data-grupo-id]').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-cal]')) return;
      // Control escolar no edita: al hacer click va directo al horario del grupo
      if (!esAdmin()) {
        state.calSelectorType = 'grupo';
        state.calSelectedId = el.dataset.grupoId;
        setView('calendario');
        return;
      }
      grupoFormModal(grupos.find((g) => g.id == el.dataset.grupoId));
    });
  });
  root.querySelectorAll('[data-cal]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.calSelectorType = 'grupo';
      state.calSelectedId = btn.dataset.cal;
      setView('calendario');
    });
  });
}
function grupoCard(g) {
  return `<div class="card" data-grupo-id="${g.id}">
    <h3>${esc(g.nombre)}</h3>
    <div class="meta">${esc(g.plantel || 'Sin plantel')}</div>
    <button class="btn small secondary" data-cal="${g.id}" style="margin-top:8px">📅 Ver calendario</button>
  </div>`;
}
function grupoFormModal(grupo = null) {
  openModal(`
    <h3>${grupo ? 'Editar grupo' : 'Nuevo grupo'}</h3>
    <div class="form-grid single">
      <div class="field"><label>Nombre</label><input id="f-nombre" value="${grupo ? esc(grupo.nombre) : ''}" placeholder="Ej. CP Martinez Nuno Carlos"></div>
      <div class="field"><label>Plantel</label><input id="f-plantel" value="${grupo ? esc(grupo.plantel || '') : ''}" placeholder="Ej. Hidalgo"></div>
    </div>
    <div class="modal-actions">
      ${grupo ? '<button class="btn danger" id="btn-del" style="margin-right:auto">Eliminar</button>' : ''}
      <button class="btn secondary" id="btn-cancel">Cancelar</button>
      <button class="btn" id="btn-save">Guardar</button>
    </div>
  `, (box) => {
    box.querySelector('#btn-cancel').addEventListener('click', closeModal);
    if (grupo) box.querySelector('#btn-del').addEventListener('click', async () => {
      if (!confirm('¿Eliminar este grupo?')) return;
      await api(`/grupos/${grupo.id}`, { method: 'DELETE' });
      closeModal(); showToast('Grupo eliminado', 'success'); renderGrupos();
    });
    box.querySelector('#btn-save').addEventListener('click', async () => {
      const nombre = box.querySelector('#f-nombre').value.trim();
      const plantel = box.querySelector('#f-plantel').value.trim();
      if (!nombre) return showToast('El nombre es obligatorio', 'error');
      try {
        if (grupo) await api(`/grupos/${grupo.id}`, { method: 'PUT', body: JSON.stringify({ nombre, plantel }) });
        else await api('/grupos', { method: 'POST', body: JSON.stringify({ nombre, plantel }) });
        closeModal(); showToast('Grupo guardado', 'success'); renderGrupos();
      } catch (err) { showToast(err.message, 'error'); }
    });
  });
}

// ---------- CALENDARIO ----------
const HORAS = [];
for (let h = 7; h < 21; h++) {
  HORAS.push(`${String(h).padStart(2, '0')}:00`);
  HORAS.push(`${String(h).padStart(2, '0')}:30`);
}
function addMin(hhmm, min) {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + min;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

async function renderCalendario() {
  const root = document.getElementById('view-root');

  // ----- Profesor: solo su propio horario, sin selectores ni edicion -----
  if (esProfesor()) {
    state.calSelectorType = 'profesor';
    state.calSelectedId = state.usuario.profesor_id;
    root.innerHTML = `
      <div class="view-header">
        <div><h2>Mi horario</h2>
        <div class="subtitle">${esc(state.usuario.nombre || '')}</div></div>
      </div>
      <div class="week-nav">
        <button class="btn secondary small" id="week-prev">← Semana anterior</button>
        <span class="label" id="week-label"></span>
        <button class="btn secondary small" id="week-next">Semana siguiente →</button>
      </div>
      <div id="calendar-container"></div>
    `;
    document.getElementById('week-prev').addEventListener('click', () => {
      state.calWeekStart = addDays(state.calWeekStart, -7); loadCalendarGrid();
    });
    document.getElementById('week-next').addEventListener('click', () => {
      state.calWeekStart = addDays(state.calWeekStart, 7); loadCalendarGrid();
    });
    await loadCalendarGrid();
    return;
  }

  // ----- Control escolar: solo por grupo. Administrador: por profesor o grupo -----
  const soloGrupos = esAdministrativo();
  if (soloGrupos) state.calSelectorType = 'grupo';

  const grupos = await api('/grupos');
  state.grupos = grupos;
  const profesores = soloGrupos ? [] : await api('/profesores');
  state.profesores = profesores;

  if (!state.calSelectedId) {
    state.calSelectedId = state.calSelectorType === 'profesor'
      ? (profesores[0] && profesores[0].id)
      : (grupos[0] && grupos[0].id);
  }

  root.innerHTML = `
    <div class="view-header">
      <div><h2>${soloGrupos ? 'Horarios por grupo' : 'Calendario'}</h2>
      <div class="subtitle">Horario semanal</div></div>
    </div>
    <div class="toolbar">
      ${soloGrupos ? '' : `
      <div class="segmentado" role="tablist">
        <button type="button" class="seg ${state.calSelectorType === 'profesor' ? 'activo' : ''}" data-tipo="profesor">Por profesor</button>
        <button type="button" class="seg ${state.calSelectorType === 'grupo' ? 'activo' : ''}" data-tipo="grupo">Por grupo</button>
      </div>
      <select id="cal-tipo" class="hidden">
        <option value="profesor" ${state.calSelectorType === 'profesor' ? 'selected' : ''}>Por profesor</option>
        <option value="grupo" ${state.calSelectorType === 'grupo' ? 'selected' : ''}>Por grupo</option>
      </select>`}
      <select id="cal-id"></select>
      ${esAdmin() ? '<button class="btn" id="btn-nueva-clase">+ Agregar clase</button>' : ''}
    </div>
    <div class="week-nav">
      <button class="btn secondary small" id="week-prev">← Semana anterior</button>
      <span class="label" id="week-label"></span>
      <button class="btn secondary small" id="week-next">Semana siguiente →</button>
    </div>
    <div id="calendar-container"></div>
  `;

  const tipoSel = document.getElementById('cal-tipo');
  const idSel = document.getElementById('cal-id');
  function refreshIdOptions() {
    const list = (tipoSel ? tipoSel.value : state.calSelectorType) === 'profesor' ? profesores : grupos;
    idSel.innerHTML = list.map((x) => `<option value="${x.id}">${esc(x.nombre)}${x.apellido_paterno ? ' ' + esc(x.apellido_paterno) : ''}</option>`).join('');
    if (state.calSelectedId && list.some((x) => String(x.id) === String(state.calSelectedId))) {
      idSel.value = state.calSelectedId;
    } else if (list.length) {
      state.calSelectedId = String(list[0].id);
      idSel.value = state.calSelectedId;
    }
  }
  root.querySelectorAll('.seg').forEach((b) => {
    b.addEventListener('click', () => {
      if (!tipoSel || b.classList.contains('activo')) return;
      root.querySelectorAll('.seg').forEach((o) => o.classList.toggle('activo', o === b));
      tipoSel.value = b.dataset.tipo;
      tipoSel.dispatchEvent(new Event('change'));
    });
  });

  if (tipoSel) {
    tipoSel.addEventListener('change', () => {
      state.calSelectorType = tipoSel.value;
      state.calSelectedId = null;
      refreshIdOptions();
      loadCalendarGrid();
    });
  }
  idSel.addEventListener('change', () => {
    state.calSelectedId = idSel.value;
    loadCalendarGrid();
  });
  refreshIdOptions();

  document.getElementById('week-prev').addEventListener('click', () => {
    state.calWeekStart = addDays(state.calWeekStart, -7); loadCalendarGrid();
  });
  document.getElementById('week-next').addEventListener('click', () => {
    state.calWeekStart = addDays(state.calWeekStart, 7); loadCalendarGrid();
  });
  const btnNueva = document.getElementById('btn-nueva-clase');
  if (btnNueva) btnNueva.addEventListener('click', () => nuevaClaseModal());

  await loadCalendarGrid();
}

async function loadCalendarGrid() {
  const weekStart = state.calWeekStart;
  const weekEnd = addDays(weekStart, 6);
  document.getElementById('week-label').textContent =
    `Semana del ${fmtDate(weekStart)} al ${fmtDate(weekEnd)}`;

  const query = state.calSelectorType === 'profesor'
    ? `profesor_id=${state.calSelectedId}` : `grupo_id=${state.calSelectedId}`;
  const eventos = state.calSelectedId
    ? await api(`/horarios?${query}&desde=${fmtDate(weekStart)}&hasta=${fmtDate(weekEnd)}`)
    : [];

  const dias = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Franja fija para que siempre haya rejilla donde hacer click, aunque no haya clases
  const container = document.getElementById('calendar-container');
  container.innerHTML = leyendaCursos(eventos) + rejillaCalendario(eventos, dias, {
    desde: '07:00',
    hasta: '21:00',
    interactivo: true,
    mostrarProfesor: state.calSelectorType === 'grupo' || esAdmin(),
    mostrarGrupo: true,
  });

  // Agregar y eliminar clases es exclusivo del administrador
  if (!esAdmin()) return;

  const rejilla = container.querySelector('.cal2');
  if (!rejilla) return;
  const desdeMin = Number(rejilla.dataset.desde);
  const altoSlot = Number(rejilla.dataset.alto);
  const minSlot = Number(rejilla.dataset.min);

  // Click en un hueco: se calcula la hora a partir de donde se hizo click
  container.querySelectorAll('.cal2-dia').forEach((col) => {
    col.classList.add('editable');
    col.addEventListener('click', (e) => {
      if (e.target.closest('.cal2-ev')) return;
      const y = e.clientY - col.getBoundingClientRect().top;
      const slot = Math.floor(y / altoSlot);
      nuevaClaseModal({
        fecha: col.dataset.fecha,
        hora_inicio: aHora(desdeMin + slot * minSlot),
      });
    });
  });

  container.querySelectorAll('[data-ev-id]').forEach((evEl) => {
    evEl.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm('¿Eliminar esta clase del horario?')) {
        await api(`/horarios/${evEl.dataset.evId}`, { method: 'DELETE' });
        showToast('Clase eliminada', 'success');
        loadCalendarGrid();
      }
    });
  });
}

async function nuevaClaseModal(prefill = {}) {
  const [profesores, grupos, materias, areas] = await Promise.all([
    api('/profesores'), api('/grupos'), api('/materias'), api('/areas'),
  ]);

  // Duraciones mas usadas; siempre se puede escribir la hora de fin a mano
  const DURACIONES = [30, 45, 60, 90, 120, 150, 180, 240];
  const etiquetaDur = (min) => (min < 60 ? `${min} min`
    : min % 60 === 0 ? `${min / 60} h` : `${Math.floor(min / 60)} h ${min % 60} min`);

  const inicio = prefill.hora_inicio || '08:00';
  const finPrevio = aHora(Math.min(aMinutos(inicio) + 60, 23 * 60 + 30));

  openModal(`
    <h3>Agregar clase al horario</h3>
    <div class="form-grid">
      <div class="field"><label>Profesor</label>
        <select id="c-profesor">${profesores.map((p) => `<option value="${p.id}" ${String(p.id) === String(state.calSelectedId) && state.calSelectorType === 'profesor' ? 'selected' : ''}>${esc(p.nombre)} ${esc(p.apellido_paterno || '')}</option>`).join('')}</select>
      </div>
      <div class="field"><label>Grupo</label>
        <select id="c-grupo">${grupos.map((g) => `<option value="${g.id}" ${String(g.id) === String(state.calSelectedId) && state.calSelectorType === 'grupo' ? 'selected' : ''}>${esc(g.nombre)}</option>`).join('')}</select>
      </div>
      <div class="field"><label>Materia</label>
        <select id="c-materia">${materias.map((m) => `<option value="${m.id}">${esc(m.nombre)} (${esc(m.curso_nombre)})</option>`).join('')}</select>
      </div>
      <div class="field"><label>Fecha</label>
        <input type="date" id="c-fecha" value="${prefill.fecha || fmtDate(new Date())}">
      </div>
      <div class="field"><label>Hora de inicio</label>
        <input type="time" id="c-hora-inicio" step="300" value="${esc(inicio)}">
      </div>
      <div class="field"><label>Duración</label>
        <select id="c-duracion">
          ${DURACIONES.map((d) => `<option value="${d}" ${d === 60 ? 'selected' : ''}>${etiquetaDur(d)}</option>`).join('')}
          <option value="otra">Otra (escribo la hora de fin)</option>
        </select>
      </div>
      <div class="field"><label>Hora de fin</label>
        <input type="time" id="c-hora-fin" step="300" value="${esc(finPrevio)}">
      </div>
      <div class="field field-ancho"><label>Área propedéutica <span class="opcional">(solo si es clase de área)</span></label>
        <select id="c-area">
          <option value="">Clase normal, sin área</option>
          ${['UNAM', 'IPN'].map((inst) => {
            const delInst = areas.filter((a) => a.institucion === inst);
            return delInst.length ? `<optgroup label="${esc(inst)}">${delInst.map((a) =>
              `<option value="${a.id}">${esc(a.nombre)}</option>`).join('')}</optgroup>` : '';
          }).join('')}
        </select>
      </div>
      <div class="field field-ancho hidden" id="c-grupos-extra-campo">
        <label>Grupos que se juntan <span class="opcional">(además del grupo de arriba)</span></label>
        <div class="grupos-check" id="c-grupos-extra">
          ${grupos.map((g) => `<label class="chk"><input type="checkbox" value="${g.id}"> ${esc(g.nombre)} <span class="plantel">${esc(g.plantel || '')}</span></label>`).join('')}
        </div>
      </div>
    </div>
    <div class="resumen-clase" id="c-resumen"></div>
    <p style="font-size:13px;color:var(--text-muted); margin-top:10px">
      Al guardar, se le notificará al profesor por correo y WhatsApp automáticamente.
    </p>
    <div class="modal-actions">
      <button class="btn secondary" id="btn-cancel">Cancelar</button>
      <button class="btn" id="btn-save">Guardar y notificar</button>
    </div>
  `, (box) => {
    const inicioEl = box.querySelector('#c-hora-inicio');
    const finEl = box.querySelector('#c-hora-fin');
    const durEl = box.querySelector('#c-duracion');
    const resumen = box.querySelector('#c-resumen');

    function pintarResumen() {
      const ini = aMinutos(inicioEl.value || '0:00');
      const fin = aMinutos(finEl.value || '0:00');
      if (!inicioEl.value || !finEl.value || fin <= ini) {
        resumen.className = 'resumen-clase error';
        resumen.textContent = 'La hora de fin debe ser posterior a la de inicio.';
        return false;
      }
      resumen.className = 'resumen-clase';
      resumen.textContent = `Clase de ${inicioEl.value} a ${finEl.value} — dura ${etiquetaDur(fin - ini)}.`;
      return true;
    }

    // Cambiar inicio o duracion recalcula el fin; escribir el fin cambia la duracion
    function aplicarDuracion() {
      if (durEl.value === 'otra' || !inicioEl.value) return;
      finEl.value = aHora(aMinutos(inicioEl.value) + Number(durEl.value));
    }
    inicioEl.addEventListener('change', () => { aplicarDuracion(); pintarResumen(); });
    durEl.addEventListener('change', () => { aplicarDuracion(); pintarResumen(); });
    finEl.addEventListener('change', () => {
      const dur = aMinutos(finEl.value) - aMinutos(inicioEl.value);
      const opcion = [...durEl.options].find((o) => o.value === String(dur));
      durEl.value = opcion ? String(dur) : 'otra';
      pintarResumen();
    });

    // Los grupos adicionales solo tienen sentido en una clase de area
    const areaEl = box.querySelector('#c-area');
    const extraCampo = box.querySelector('#c-grupos-extra-campo');
    const grupoEl = box.querySelector('#c-grupo');
    function sincronizarExtras() {
      extraCampo.classList.toggle('hidden', !areaEl.value);
      // El grupo principal no se marca dos veces
      extraCampo.querySelectorAll('input[type=checkbox]').forEach((chk) => {
        const esPrincipal = chk.value === grupoEl.value;
        chk.closest('.chk').classList.toggle('hidden', esPrincipal);
        if (esPrincipal) chk.checked = false;
      });
    }
    areaEl.addEventListener('change', sincronizarExtras);
    grupoEl.addEventListener('change', sincronizarExtras);
    sincronizarExtras();

    aplicarDuracion();
    pintarResumen();

    box.querySelector('#btn-cancel').addEventListener('click', closeModal);
    box.querySelector('#btn-save').addEventListener('click', async () => {
      if (!pintarResumen()) return showToast('Revisa las horas de la clase', 'error');

      const payload = {
        profesor_id: box.querySelector('#c-profesor').value,
        grupo_id: box.querySelector('#c-grupo').value,
        materia_id: box.querySelector('#c-materia').value,
        fecha: box.querySelector('#c-fecha').value,
        hora_inicio: inicioEl.value,
        hora_fin: finEl.value,
        area_id: areaEl.value || null,
        grupos_ids: areaEl.value
          ? [...extraCampo.querySelectorAll('input[type=checkbox]:checked')].map((c) => Number(c.value))
          : [],
      };

      const btn = box.querySelector('#btn-save');
      btn.disabled = true; btn.textContent = 'Guardando y notificando...';
      try {
        await api('/horarios', { method: 'POST', body: JSON.stringify(payload) });
        closeModal(); showToast('Clase agregada. Notificaciones enviadas.', 'success');
        if (state.view === 'calendario') loadCalendarGrid(); else render();
      } catch (err) {
        // Si el choque es del grupo, se puede forzar; si es del profesor, no
        if (/ya tiene clase/.test(err.message) && /El grupo/.test(err.message)) {
          btn.disabled = false; btn.textContent = 'Guardar y notificar';
          resumen.className = 'resumen-clase error';
          resumen.textContent = err.message;
          if (confirm(`${err.message}\n\n¿Aun asi quieres agregarla? (se encimarian las dos)`)) {
            btn.disabled = true; btn.textContent = 'Guardando...';
            try {
              await api('/horarios', {
                method: 'POST',
                body: JSON.stringify({ ...payload, permitir_empalme_grupo: true }),
              });
              closeModal(); showToast('Clase agregada (encimada con otra del grupo)', 'success');
              if (state.view === 'calendario') loadCalendarGrid(); else render();
              return;
            } catch (err2) {
              showToast(err2.message, 'error');
            }
          }
          btn.disabled = false; btn.textContent = 'Guardar y notificar';
          return;
        }
        showToast(err.message, 'error');
        resumen.className = 'resumen-clase error';
        resumen.textContent = err.message;
        btn.disabled = false; btn.textContent = 'Guardar y notificar';
      }
    });
  });
}

// ---------- Tema claro / oscuro ----------
// Se recuerda la eleccion; si no hay ninguna, se sigue la del sistema.
function aplicarTema(tema) {
  document.documentElement.setAttribute('data-tema', tema);
  try { localStorage.setItem('cronomat-tema', tema); } catch { /* modo privado */ }
}
function temaInicial() {
  let guardado = null;
  try { guardado = localStorage.getItem('cronomat-tema'); } catch { /* sin acceso */ }
  if (guardado === 'dark' || guardado === 'light') return guardado;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
aplicarTema(temaInicial());

document.getElementById('btn-tema').addEventListener('click', () => {
  const actual = document.documentElement.getAttribute('data-tema');
  aplicarTema(actual === 'dark' ? 'light' : 'dark');
});

// ---------- Menu lateral en pantallas chicas ----------
const shell = document.getElementById('app-shell');
const velo = document.getElementById('velo');

function abrirMenu() {
  shell.classList.add('menu-abierto');
  velo.hidden = false;
}
function cerrarMenu() {
  shell.classList.remove('menu-abierto');
  velo.hidden = true;
}
document.getElementById('btn-menu').addEventListener('click', abrirMenu);
document.getElementById('btn-cerrar-menu').addEventListener('click', cerrarMenu);
velo.addEventListener('click', cerrarMenu);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarMenu(); });

// ---------- Sesion ----------
function mostrarLogin(mensaje) {
  document.getElementById('app-shell').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  closeModal();
  const err = document.getElementById('login-error');
  if (mensaje) { err.textContent = mensaje; err.classList.remove('hidden'); }
  else { err.textContent = ''; err.classList.add('hidden'); }
  const campo = document.getElementById('login-usuario');
  if (campo) campo.focus();
}

function mostrarApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  const quien = state.usuario.nombre || state.usuario.usuario;
  document.getElementById('user-name').textContent = quien;
  document.getElementById('user-role').textContent = ETIQUETA_ROL[state.usuario.rol] || state.usuario.rol;
  // Iniciales para el avatar: primera letra del nombre y del apellido
  const iniciales = quien.trim().split(/\s+/).slice(0, 2).map((p) => p[0] || '').join('').toUpperCase();
  document.getElementById('user-avatar').textContent = iniciales || '?';
  document.getElementById('user-avatar-movil').textContent = iniciales || '?';

  // Cada rol entra a la primera pestana que tiene permitida
  const permitidas = TABS_POR_ROL[state.usuario.rol] || [];
  state.view = permitidas.length ? permitidas[0].view : 'inicio';
  pintarTabs();
  render();
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('login-submit');
  const err = document.getElementById('login-error');
  err.classList.add('hidden');
  btn.disabled = true; btn.textContent = 'Entrando...';
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        usuario: document.getElementById('login-usuario').value,
        password: document.getElementById('login-password').value,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'No se pudo entrar');
    state.usuario = data;
    state.calSelectedId = null;
    document.getElementById('login-password').value = '';
    mostrarApp();
  } catch (e2) {
    err.textContent = e2.message;
    err.classList.remove('hidden');
  } finally {
    btn.disabled = false; btn.textContent = 'Entrar';
  }
});

document.getElementById('btn-logout').addEventListener('click', async () => {
  cerrarMenu();
  await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
  state.usuario = null;
  document.getElementById('login-usuario').value = '';
  mostrarLogin();
});

document.getElementById('btn-password').addEventListener('click', () => {
  openModal(`
    <h3>Cambiar mi contraseña</h3>
    <div class="form-grid">
      <div class="field"><label>Contraseña actual</label><input type="password" id="p-actual" autocomplete="current-password"></div>
      <div class="field"><label>Nueva contraseña</label><input type="password" id="p-nueva" autocomplete="new-password"></div>
      <div class="field"><label>Repite la nueva</label><input type="password" id="p-repite" autocomplete="new-password"></div>
    </div>
    <p style="font-size:13px;color:var(--text-muted);margin-top:10px">Mínimo 8 caracteres.</p>
    <div class="modal-actions">
      <button class="btn secondary" id="btn-cancel">Cancelar</button>
      <button class="btn" id="btn-save">Guardar</button>
    </div>
  `, (box) => {
    box.querySelector('#btn-cancel').addEventListener('click', closeModal);
    box.querySelector('#btn-save').addEventListener('click', async () => {
      const actual = box.querySelector('#p-actual').value;
      const nueva = box.querySelector('#p-nueva').value;
      if (nueva !== box.querySelector('#p-repite').value) {
        return showToast('Las contraseñas nuevas no coinciden', 'error');
      }
      try {
        await api('/me/password', {
          method: 'POST',
          body: JSON.stringify({ password_actual: actual, password_nueva: nueva }),
        });
        closeModal();
        showToast('Contraseña actualizada', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
});

// ---------- Arranque ----------
(async function arrancar() {
  try {
    const res = await fetch('/api/me', { credentials: 'same-origin' });
    if (!res.ok) throw new Error('sin sesión');
    state.usuario = await res.json();
    mostrarApp();
  } catch {
    mostrarLogin();
  }
})();
