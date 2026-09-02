/**
 * Modo demo: sustituye al servidor.
 *
 * Se carga ANTES que app.js e intercepta las llamadas a /api/... para
 * responderlas con los datos horneados en datos.js, aplicando las mismas reglas
 * que aplica el servidor real: sin iniciar sesion no se ve nada, y quien eres
 * lo determina el usuario y la contrasena con que entras.
 */
(function () {
  const D = window.DEMO;
  if (!D) return;

  const CLAVE = 'demo';                 // la misma para todas las cuentas de muestra
  const LLAVE = 'demo-sesion';
  let sesion = null;

  // Se recuerda la sesion entre recargas, como haria la cookie del servidor
  try {
    const guardada = localStorage.getItem(LLAVE);
    if (guardada) sesion = D.sesiones.find((s) => s.usuario === guardada) || null;
  } catch { /* modo privado */ }

  const json = (datos, status = 200) => Promise.resolve(new Response(
    JSON.stringify(datos), { status, headers: { 'Content-Type': 'application/json' } }
  ));
  const sinSesion = () => json({ error: 'Necesitas iniciar sesión' }, 401);
  const sinPermiso = () => json({ error: 'Tu usuario no tiene permiso para esta acción' }, 403);

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
        if (!gs.some((g) => (D.grupos.find((x) => x.id === g) || {}).plantel === plantel)) return false;
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

    // ---- Acceso ----
    if (camino === 'login') {
      let cuerpo = {};
      try { cuerpo = JSON.parse(opciones.body || '{}'); } catch { /* vacio */ }
      const encontrada = D.sesiones.find((s) => s.usuario === String(cuerpo.usuario || '').trim());
      if (!encontrada || String(cuerpo.password) !== CLAVE) {
        return json({ error: 'Usuario o contraseña incorrectos' }, 401);
      }
      sesion = encontrada;
      try { localStorage.setItem(LLAVE, sesion.usuario); } catch { /* modo privado */ }
      return json(sesion);
    }
    if (camino === 'logout') {
      sesion = null;
      try { localStorage.removeItem(LLAVE); } catch { /* modo privado */ }
      return json({ ok: true });
    }
    if (camino === 'me') return sesion ? json(sesion) : sinSesion();

    // ---- De aqui en adelante hace falta sesion ----
    if (!sesion) return sinSesion();

    if (camino.startsWith('horarios')) {
      if ((opciones.method || 'GET') !== 'GET') {
        return json({ error: 'La demo es solo de consulta: no guarda cambios.' }, 403);
      }
      return horariosDe(params);
    }
    if (camino.startsWith('grupos')) {
      if (sesion.rol === 'profesor') return sinPermiso();
      const lista = sesion.rol === 'administrativo' && sesion.plantel
        ? D.grupos.filter((g) => g.plantel === sesion.plantel)
        : D.grupos;
      return json(lista);
    }
    if (camino.startsWith('profesores')) {
      return sesion.rol === 'administrador' ? json(D.profesores) : sinPermiso();
    }
    if (camino.startsWith('cursos')) return json(D.cursos);
    if (camino.startsWith('materias')) return json(D.materias);
    if (camino.startsWith('areas')) return json(D.areas);
    if (camino.startsWith('usuarios')) return sinPermiso();
    return json({ error: 'La demo no incluye esta sección.' }, 404);
  };

  // El sello de DEMO se muestra una vez cargada la pantalla
  document.addEventListener('DOMContentLoaded', () => {
    const sello = document.getElementById('demo-sello-flotante');
    if (sello) sello.hidden = false;
  });
})();
