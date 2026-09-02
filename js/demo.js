/**
 * Modo demo: sustituye al servidor.
 *
 * Se carga ANTES que app.js e intercepta las llamadas a /api/... para
 * responderlas con los datos horneados en datos.js, aplicando las mismas reglas
 * de permiso que aplica el servidor real. Asi la demo se comporta igual que el
 * sistema, pero sin backend.
 */
(function () {
  const D = window.DEMO;
  if (!D) return;

  let sesion = D.sesiones[0];               // se arranca como administrador
  const guardada = (() => { try { return localStorage.getItem('demo-rol'); } catch { return null; } })();
  if (guardada) sesion = D.sesiones.find((s) => s.usuario === guardada) || sesion;

  const json = (datos, status = 200) => Promise.resolve(new Response(
    JSON.stringify(datos), { status, headers: { 'Content-Type': 'application/json' } }
  ));

  // Mismas reglas que el servidor: cada rol ve solo lo suyo
  function horariosDe(params) {
    const desde = params.get('desde');
    const hasta = params.get('hasta');
    const grupoId = params.get('grupo_id');
    let profesorId = params.get('profesor_id');
    let plantel = null;

    if (sesion.rol === 'profesor') {
      profesorId = sesion.profesor_id;
    } else if (sesion.rol === 'administrativo') {
      if (profesorId) {
        return json({ error: 'Tu usuario consulta los horarios por grupo, no por profesor' }, 403);
      }
      profesorId = null;
      plantel = sesion.plantel;
    }

    const filas = D.horarios.filter((h) => {
      if (desde && h.fecha < desde) return false;
      if (hasta && h.fecha > hasta) return false;
      if (profesorId && String(h.profesor_id) !== String(profesorId)) return false;
      if (grupoId) {
        const gs = D.gruposDeClase[h.id] || [h.grupo_id];
        if (!gs.some((g) => String(g) === String(grupoId))) return false;
      }
      if (plantel) {
        const gs = D.gruposDeClase[h.id] || [h.grupo_id];
        const suyo = gs.some((g) => (D.grupos.find((x) => x.id === g) || {}).plantel === plantel);
        if (!suyo) return false;
      }
      return true;
    });
    return json(filas);
  }

  const original = window.fetch;
  window.fetch = function (url, opciones = {}) {
    const u = String(url);
    if (!u.includes('/api/')) return original(url, opciones);

    const ruta = u.split('/api/')[1];
    const [camino, consulta] = ruta.split('?');
    const params = new URLSearchParams(consulta || '');

    if (camino === 'me') return json(sesion);
    if (camino === 'login') return json(sesion);
    if (camino === 'logout') return json({ ok: true });
    if (camino.startsWith('horarios')) {
      if ((opciones.method || 'GET') !== 'GET') {
        return json({ error: 'La demo es solo de consulta: no guarda cambios.' }, 403);
      }
      return horariosDe(params);
    }
    if (camino.startsWith('grupos')) {
      const lista = sesion.rol === 'administrativo' && sesion.plantel
        ? D.grupos.filter((g) => g.plantel === sesion.plantel)
        : D.grupos;
      return sesion.rol === 'profesor'
        ? json({ error: 'Tu usuario no tiene permiso para esta acción' }, 403)
        : json(lista);
    }
    if (camino.startsWith('profesores')) {
      return sesion.rol === 'administrador'
        ? json(D.profesores)
        : json({ error: 'Tu usuario no tiene permiso para esta acción' }, 403);
    }
    if (camino.startsWith('cursos')) return json(D.cursos);
    if (camino.startsWith('materias')) return json(D.materias);
    if (camino.startsWith('areas')) return json(D.areas);
    if (camino.startsWith('usuarios')) {
      return json({ error: 'Tu usuario no tiene permiso para esta acción' }, 403);
    }
    return json({ error: 'La demo no incluye esta sección.' }, 404);
  };

  // ---------- Selector de rol ----------
  document.addEventListener('DOMContentLoaded', () => {
    const sel = document.getElementById('demo-rol');
    if (!sel) return;
    const etiqueta = { administrador: 'Administrador', administrativo: 'Control escolar', profesor: 'Profesor' };
    sel.innerHTML = D.sesiones.map((s) =>
      `<option value="${s.usuario}" ${s.usuario === sesion.usuario ? 'selected' : ''}>`
      + `${etiqueta[s.rol]} — ${s.nombre}</option>`).join('');
    sel.addEventListener('change', () => {
      try { localStorage.setItem('demo-rol', sel.value); } catch { /* modo privado */ }
      location.reload();
    });
  });
})();
