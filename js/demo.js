/**
 * Modo demo: sustituye al servidor.
 *
 * Se carga ANTES que app.js e intercepta las llamadas a /api/... Responde con
 * los datos horneados en datos.js y aplica las mismas reglas que el servidor
 * real: sin sesion no se ve nada, cada rol ve solo lo suyo, y al programar una
 * clase se revisan los empalmes igual que en el sistema.
 *
 * La demo SI deja crear y borrar. Los cambios se guardan en el navegador de
 * quien la usa: son suyos, nadie mas los ve, y se pueden deshacer desde el
 * boton de restablecer.
 */
(function () {
  const D = window.DEMO;
  if (!D) return;

  const CLAVE = 'demo';
  const LLAVE_SESION = 'demo-sesion';
  const LLAVE_CAMBIOS = 'demo-cambios';

  // ---------- Cambios de quien visita ----------
  const vacio = () => ({ horarios: [], borrados: [], cursos: [], materias: [], grupos: [], profesores: [] });
  let cambios = vacio();
  try {
    const g = localStorage.getItem(LLAVE_CAMBIOS);
    if (g) cambios = { ...vacio(), ...JSON.parse(g) };
  } catch { /* modo privado */ }

  const guardar = () => {
    try { localStorage.setItem(LLAVE_CAMBIOS, JSON.stringify(cambios)); } catch { /* sin espacio */ }
    marcarCambios();
  };

  // Los datos vivos son los horneados mas lo que agrego quien visita, menos lo borrado
  const horarios = () => [...D.horarios, ...cambios.horarios].filter((h) => !cambios.borrados.includes(h.id));
  const cursos = () => [...D.cursos, ...cambios.cursos];
  const materias = () => [...D.materias, ...cambios.materias];
  const grupos = () => [...D.grupos, ...cambios.grupos];
  const profesores = () => [...D.profesores, ...cambios.profesores];
  const nuevoId = () => Date.now() * 10 + Math.floor(Math.random() * 10);

  // Que grupos asisten a una clase
  const gruposDe = (h) => (h._grupos || D.gruposDeClase[h.id] || [h.grupo_id]);

  let sesion = null;
  try {
    const g = localStorage.getItem(LLAVE_SESION);
    if (g) sesion = D.sesiones.find((s) => s.usuario === g) || null;
  } catch { /* modo privado */ }

  const json = (datos, status = 200) => Promise.resolve(new Response(
    JSON.stringify(datos), { status, headers: { 'Content-Type': 'application/json' } }
  ));
  const sinSesion = () => json({ error: 'Necesitas iniciar sesión' }, 401);
  const sinPermiso = () => json({ error: 'Tu usuario no tiene permiso para esta acción' }, 403);
  const min = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };

  // ---------- Consulta de horarios, con las reglas de cada rol ----------
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

    const filas = horarios().filter((h) => {
      if (desde && h.fecha < desde) return false;
      if (hasta && h.fecha > hasta) return false;
      if (profesorId && String(h.profesor_id) !== String(profesorId)) return false;
      if (grupoId && !gruposDe(h).some((g) => String(g) === String(grupoId))) return false;
      if (plantel) {
        const suyo = gruposDe(h).some((g) => (grupos().find((x) => x.id === g) || {}).plantel === plantel);
        if (!suyo) return false;
      }
      return true;
    });
    return json(filas);
  }

  // ---------- Programar una clase: las mismas validaciones del servidor ----------
  function crearHorario(cuerpo) {
    const {
      profesor_id, grupo_id, materia_id, fecha, hora_inicio, hora_fin,
      area_id, grupos_ids, permitir_empalme_grupo,
    } = cuerpo;

    if (!profesor_id || !grupo_id || !materia_id || !fecha || !hora_inicio || !hora_fin) {
      return json({ error: 'Faltan datos de la clase' }, 400);
    }
    if (hora_fin <= hora_inicio) {
      return json({ error: 'La hora de fin debe ser posterior a la de inicio' }, 400);
    }

    const profesor = profesores().find((p) => String(p.id) === String(profesor_id));
    if (!profesor) return json({ error: 'Profesor no encontrado' }, 404);
    const materia = materias().find((m) => String(m.id) === String(materia_id));
    if (!materia) return json({ error: 'Materia no encontrada' }, 404);
    const area = area_id ? D.areas.find((a) => String(a.id) === String(area_id)) : null;

    const ids = [...new Set([Number(grupo_id), ...(Array.isArray(grupos_ids) ? grupos_ids.map(Number) : [])])];
    const susGrupos = ids.map((id) => grupos().find((g) => g.id === id)).filter(Boolean);
    if (!susGrupos.length) return json({ error: 'Grupo no encontrado' }, 404);
    const grupo = susGrupos[0];

    const encima = (h) => h.fecha === fecha
      && !(min(h.hora_fin) <= min(hora_inicio) || min(h.hora_inicio) >= min(hora_fin));

    // El profesor no puede estar en dos lugares a la vez. Nunca.
    const choqueProfesor = horarios().find((h) => String(h.profesor_id) === String(profesor_id) && encima(h));
    if (choqueProfesor) {
      return json({
        error: `${profesor.nombre} ya tiene clase de ${choqueProfesor.hora_inicio} a ${choqueProfesor.hora_fin}`
          + ` (${choqueProfesor.materia_nombre}, ${choqueProfesor.grupo_nombre})`,
        motivo: 'profesor_ocupado',
      }, 409);
    }

    // El grupo tampoco, salvo que sean dos areas distintas
    if (!permitir_empalme_grupo) {
      const choqueGrupo = horarios().find((h) => encima(h) && gruposDe(h).some((g) => ids.includes(g)));
      if (choqueGrupo) {
        const areasDistintas = area && choqueGrupo.area_id && Number(choqueGrupo.area_id) !== Number(area_id);
        if (!areasDistintas) {
          return json({
            error: `El grupo ${choqueGrupo.grupo_nombre} ya tiene clase de ${choqueGrupo.hora_inicio}`
              + ` a ${choqueGrupo.hora_fin} (${choqueGrupo.materia_nombre}, con ${choqueGrupo.profesor_nombre})`,
            motivo: 'grupo_ocupado',
          }, 409);
        }
      }
    }

    const curso = cursos().find((c) => String(c.id) === String(materia.curso_id));
    const nueva = {
      id: nuevoId(),
      profesor_id: Number(profesor_id),
      grupo_id: grupo.id,
      materia_id: Number(materia_id),
      fecha,
      hora_inicio,
      hora_fin,
      area_id: area ? area.id : null,
      es_prueba: 0,
      materia_nombre: materia.nombre,
      grupo_nombre: grupo.nombre,
      plantel: grupo.plantel,
      profesor_nombre: profesor.nombre,
      profesor_apellido: profesor.apellido_paterno,
      profesor_color: profesor.color,
      area_nombre: area ? area.nombre : null,
      area_clave: area ? area.clave : null,
      area_institucion: area ? area.institucion : null,
      curso_id: curso ? curso.id : null,
      curso_nombre: curso ? curso.nombre : null,
      curso_color: curso ? curso.color : null,
      grupos_total: susGrupos.length,
      grupos_nombres: susGrupos.map((g) => g.nombre).join(' | '),
      _grupos: susGrupos.map((g) => g.id),
    };

    cambios.horarios.push(nueva);
    guardar();
    return json({ ...nueva, grupos: susGrupos.map((g) => ({ id: g.id, nombre: g.nombre })), notificaciones: null }, 201);
  }

  // ---------- Catalogos ----------
  function altaCatalogo(lista, cuerpo, arma) {
    const item = { id: nuevoId(), ...arma(cuerpo) };
    cambios[lista].push(item);
    guardar();
    return json(item, 201);
  }

  function bajaCatalogo(lista, id) {
    const antes = cambios[lista].length;
    cambios[lista] = cambios[lista].filter((x) => String(x.id) !== String(id));
    if (cambios[lista].length === antes) {
      return json({ error: 'En la demo solo puedes borrar los registros que tú diste de alta.' }, 403);
    }
    guardar();
    return json({ ok: true });
  }

  // ---------- Interceptor ----------
  const original = window.fetch;
  window.fetch = function (url, opciones = {}) {
    const u = String(url);
    if (!u.includes('/api/')) return original(url, opciones);

    const ruta = u.split('/api/')[1];
    const [camino, consulta] = ruta.split('?');
    const params = new URLSearchParams(consulta || '');
    const metodo = (opciones.method || 'GET').toUpperCase();
    let cuerpo = {};
    try { cuerpo = JSON.parse(opciones.body || '{}'); } catch { /* sin cuerpo */ }
    const partes = camino.split('/');
    const seccion = partes[0];
    const id = partes[1];

    // ---- Acceso ----
    if (camino === 'login') {
      const cuenta = D.sesiones.find((s) => s.usuario === String(cuerpo.usuario || '').trim());
      if (!cuenta || String(cuerpo.password) !== CLAVE) {
        return json({ error: 'Usuario o contraseña incorrectos' }, 401);
      }
      sesion = cuenta;
      try { localStorage.setItem(LLAVE_SESION, sesion.usuario); } catch { /* modo privado */ }
      return json(sesion);
    }
    if (camino === 'logout') {
      sesion = null;
      try { localStorage.removeItem(LLAVE_SESION); } catch { /* modo privado */ }
      return json({ ok: true });
    }
    if (camino === 'me') return sesion ? json(sesion) : sinSesion();
    if (camino === 'me/password') {
      return json({ error: 'En la demo no se puede cambiar la contraseña.' }, 403);
    }

    if (!sesion) return sinSesion();
    const esAdmin = sesion.rol === 'administrador';

    // ---- Horarios ----
    if (seccion === 'horarios') {
      if (metodo === 'GET') return horariosDe(params);
      if (!esAdmin) return sinPermiso();
      if (metodo === 'POST') return crearHorario(cuerpo);
      if (metodo === 'DELETE') {
        if (!horarios().some((h) => String(h.id) === String(id))) {
          return json({ error: 'Registro no encontrado' }, 404);
        }
        cambios.horarios = cambios.horarios.filter((h) => String(h.id) !== String(id));
        if (!cambios.borrados.includes(Number(id))) cambios.borrados.push(Number(id));
        guardar();
        return json({ ok: true });
      }
    }

    // ---- Grupos ----
    if (seccion === 'grupos') {
      if (sesion.rol === 'profesor') return sinPermiso();
      if (metodo === 'GET') {
        const lista = sesion.rol === 'administrativo' && sesion.plantel
          ? grupos().filter((g) => g.plantel === sesion.plantel)
          : grupos();
        return id ? json(lista.find((g) => String(g.id) === String(id)) || { error: 'No encontrado' }) : json(lista);
      }
      if (!esAdmin) return sinPermiso();
      if (metodo === 'POST') {
        if (!cuerpo.nombre) return json({ error: 'El nombre es obligatorio' }, 400);
        return altaCatalogo('grupos', cuerpo, (c) => ({ nombre: c.nombre, plantel: c.plantel || null }));
      }
      if (metodo === 'DELETE') return bajaCatalogo('grupos', id);
    }

    // ---- Cursos ----
    if (seccion === 'cursos') {
      if (metodo === 'GET') return json(cursos());
      if (!esAdmin) return sinPermiso();
      if (metodo === 'POST') {
        if (!cuerpo.nombre) return json({ error: 'El nombre es obligatorio' }, 400);
        return altaCatalogo('cursos', cuerpo, (c) => ({ nombre: c.nombre, color: c.color || null }));
      }
      if (metodo === 'DELETE') return bajaCatalogo('cursos', id);
    }

    // ---- Materias ----
    if (seccion === 'materias') {
      if (metodo === 'GET') return json(materias());
      if (!esAdmin) return sinPermiso();
      if (metodo === 'POST') {
        if (!cuerpo.nombre || !cuerpo.curso_id) return json({ error: 'nombre y curso son obligatorios' }, 400);
        const curso = cursos().find((c) => String(c.id) === String(cuerpo.curso_id));
        return altaCatalogo('materias', cuerpo, (c) => ({
          nombre: c.nombre, curso_id: Number(c.curso_id), curso_nombre: curso ? curso.nombre : '',
        }));
      }
      if (metodo === 'DELETE') return bajaCatalogo('materias', id);
    }

    // ---- Profesores ----
    if (seccion === 'profesores') {
      if (!esAdmin) return sinPermiso();
      if (metodo === 'GET') {
        if (!id) return json(profesores());
        const p = profesores().find((x) => String(x.id) === String(id));
        if (!p) return json({ error: 'Profesor no encontrado' }, 404);
        return json({ ...p, materias: [], dias_no_disponibles: [] });
      }
      if (metodo === 'POST' && !id) {
        if (!cuerpo.nombre) return json({ error: 'El nombre es obligatorio' }, 400);
        // Las mismas validaciones de contacto que el sistema real
        if (cuerpo.correo && !/^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/.test(String(cuerpo.correo))) {
          return json({ error: `"${cuerpo.correo}" no es un correo válido. Debe ser como nombre@dominio.com` }, 400);
        }
        if (cuerpo.celular) {
          const d = String(cuerpo.celular).replace(/\D/g, '');
          if (d.length !== 10) {
            return json({ error: `El celular debe tener 10 dígitos; "${cuerpo.celular}" tiene ${d.length}` }, 400);
          }
        }
        return altaCatalogo('profesores', cuerpo, (c) => ({
          nombre: c.nombre,
          apellido_paterno: c.apellido_paterno || null,
          apellido_materno: c.apellido_materno || null,
          correo: c.correo || null,
          celular: c.celular || null,
          color: c.color || '#3B82F6',
        }));
      }
      if (metodo === 'DELETE') return bajaCatalogo('profesores', id);
      return json({ error: 'La demo no incluye esta acción.' }, 404);
    }

    if (seccion === 'areas') return metodo === 'GET' ? json(D.areas) : sinPermiso();
    if (seccion === 'usuarios') return sinPermiso();

    return json({ error: 'La demo no incluye esta sección.' }, 404);
  };

  // ---------- Sello y boton de restablecer ----------
  function marcarCambios() {
    const n = cambios.horarios.length + cambios.borrados.length + cambios.cursos.length
      + cambios.materias.length + cambios.grupos.length + cambios.profesores.length;
    const txt = document.getElementById('demo-cambios');
    const btn = document.getElementById('demo-reset');
    if (txt) txt.textContent = n ? `${n} cambio${n === 1 ? '' : 's'} tuyos` : 'Puedes crear y borrar';
    if (btn) btn.hidden = n === 0;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const sello = document.getElementById('demo-sello-flotante');
    if (sello) sello.hidden = false;
    const btn = document.getElementById('demo-reset');
    if (btn) {
      btn.addEventListener('click', () => {
        if (!confirm('Se borrarán los cambios que hiciste en la demo. ¿Continuar?')) return;
        cambios = vacio();
        try { localStorage.removeItem(LLAVE_CAMBIOS); } catch { /* modo privado */ }
        location.reload();
      });
    }
    marcarCambios();
  });
})();
