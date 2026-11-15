'use strict';
/* Equipo: tabla, inicio de sesión, agregar / editar / eliminar y estadísticas. */
window.PA = window.PA || {};

PA.usuarios = (function () {
  const $ = PA.$;
  let equipo = [];
  let actual = null;

  const hoy = () => new Date().toISOString().split('T')[0];

  function pintarTabla() {
    const cuerpo = $('roles-table-body');
    const filas = equipo.map(u => {
      const conectado = actual && actual.id === u.id;
      return `<tr class="highlight-row${conectado ? ' user-connected' : ''}" data-id="${u.id}">
        <td><strong>${u.id}</strong></td>
        <td class="col-nombre">${PA.escapar(u.nombre)}</td>
        <td class="col-cargo">${PA.escapar(u.cargo)}</td>
        <td class="col-area">${PA.escapar(u.area)}</td>
        <td>${conectado ? `<i class="fas fa-plug conectado"></i> ${PA.t('Conectado', 'Connected')}` : ''}</td>
        <td><div class="action-buttons">
          <button class="action-btn edit-btn" data-accion="editar" data-id="${u.id}" title="${PA.t('Editar usuario', 'Edit user')}"><i class="fas fa-edit"></i><span>${PA.t('Editar', 'Edit')}</span></button>
          <button class="action-btn delete-btn" data-accion="eliminar" data-id="${u.id}" title="${PA.t('Eliminar usuario', 'Delete user')}"><i class="fas fa-trash"></i><span>${PA.t('Eliminar', 'Delete')}</span></button>
        </div></td>
      </tr>`;
    });
    cuerpo.innerHTML = filas.join('');
    filtrar();
  }

  function filtrar() {
    const f = $('roles-filter').value.toLowerCase().trim();
    $('roles-table-body').querySelectorAll('tr').forEach(fila => {
      fila.style.display = !f || fila.textContent.toLowerCase().includes(f) ? '' : 'none';
    });
  }

  function llenarSelectores() {
    ['user-select', 'login-user'].forEach(id => {
      const sel = $(id);
      const elegido = sel.value;
      sel.innerHTML = '';
      const vacia = document.createElement('option');
      vacia.value = '';
      vacia.textContent = PA.t('select-user');
      sel.appendChild(vacia);
      equipo.forEach(u => {
        const o = document.createElement('option');
        o.value = u.id;
        o.textContent = `${u.nombre} - ${u.cargo}`;
        sel.appendChild(o);
      });
      sel.value = elegido;
    });
  }

  function refrescar() {
    equipo = PA.db.usuarios();
    pintarTabla();
    llenarSelectores();
  }

  function mostrarSesion() {
    const hay = Boolean(actual);
    $('user-info').style.display = hay ? 'flex' : 'none';
    $('user-display').textContent = hay ? actual.nombre : '';
    $('login-container').style.display = hay ? 'none' : 'block';
    $('database-container').style.display = hay ? 'block' : 'none';
  }

  function conectar(idSelector, saludo) {
    const id = parseInt($(idSelector).value, 10);
    if (!id) return PA.ui.aviso(PA.t('Seleccione un usuario primero', 'Select a user first'));
    const u = equipo.find(x => x.id === id);
    if (!u) return;
    actual = u;
    PA.db.guardarUsuarioActual(u);
    mostrarSesion();
    pintarTabla();
    estadisticas();
    PA.ui.aviso(saludo + u.nombre);
  }

  function salir() {
    actual = null;
    PA.db.guardarUsuarioActual(null);
    mostrarSesion();
    pintarTabla();
    estadisticas();
    PA.ui.aviso(PA.t('Sesión cerrada', 'Session closed'));
  }

  function leerFormulario(prefijo) {
    const datos = {
      nombre: $(`${prefijo}-name`).value.trim(),
      cargo: $(`${prefijo}-cargo`).value.trim(),
      area: $(`${prefijo}-area`).value.trim()
    };
    if (!datos.nombre || !datos.cargo || !datos.area) {
      PA.ui.aviso(PA.t('Complete todos los campos', 'Complete all fields'));
      return null;
    }
    return datos;
  }

  function crear(prefijo, modal, mensaje) {
    const datos = leerFormulario(prefijo);
    if (!datos) return;
    const lista = PA.db.usuarios();
    const id = lista.length ? Math.max(...lista.map(u => u.id)) + 1 : 1;
    lista.push({ id, ...datos });
    PA.db.guardarUsuarios(lista);
    refrescar();
    PA.ui.cerrarModal(modal);
    PA.ui.aviso(mensaje);
  }

  function editar(id) {
    const u = equipo.find(x => x.id === id);
    if (!u) return;
    PA.ui.abrirModal('edit-user-modal');
    $('edit-user-id').value = u.id;
    $('edit-user-name').value = u.nombre;
    $('edit-user-cargo').value = u.cargo;
    $('edit-user-area').value = u.area;
  }

  function guardarEdicion() {
    const id = parseInt($('edit-user-id').value, 10);
    const datos = leerFormulario('edit-user');
    if (!datos) return;
    const lista = PA.db.usuarios();
    const i = lista.findIndex(u => u.id === id);
    if (i < 0) return PA.ui.aviso(PA.t('Usuario no encontrado', 'User not found'));
    lista[i] = { ...lista[i], ...datos };
    PA.db.guardarUsuarios(lista);
    if (actual && actual.id === id) { actual = lista[i]; PA.db.guardarUsuarioActual(actual); mostrarSesion(); }
    refrescar();
    PA.ui.cerrarModal('edit-user-modal');
    PA.ui.aviso(PA.t('✅ Usuario actualizado', '✅ User updated'));
  }

  function eliminar(id) {
    if (!confirm(PA.t('¿Está seguro de eliminar este usuario?', 'Are you sure you want to delete this user?'))) return;
    const lista = PA.db.usuarios();
    const i = lista.findIndex(u => u.id === id);
    if (i < 0) return PA.ui.aviso(PA.t('Usuario no encontrado', 'User not found'));
    lista.splice(i, 1);
    PA.db.guardarUsuarios(lista);
    if (actual && actual.id === id) salir();
    refrescar();
    PA.ui.aviso(PA.t('✅ Usuario eliminado', '✅ User deleted'));
  }

  /** Se llama cuando termina un ejercicio. */
  function registrarActividad(ejercicio, saltado) {
    if (!actual || saltado || !ejercicio) return;
    const actividad = PA.db.actividad();
    const fecha = hoy();
    const ahora = new Date().toISOString();
    const existente = actividad.find(a => a.userId === actual.id && a.exerciseId === ejercicio.actividadId && a.date === fecha);
    if (existente) {
      existente.count += 1;
      existente.totalTime += ejercicio.duration;
      existente.lastSession = ahora;
    } else {
      actividad.push({
        userId: actual.id,
        userName: actual.nombre,
        userCargo: actual.cargo,
        userArea: actual.area,
        exerciseId: ejercicio.actividadId,
        exerciseName: ejercicio.title,
        date: fecha,
        count: 1,
        totalTime: ejercicio.duration,
        lastSession: ahora
      });
    }
    PA.db.guardarActividad(actividad);
    estadisticas();
  }

  function estadisticas() {
    if (!actual) {
      $('sessions-count').textContent = '0';
      $('total-time').textContent = '0 min';
      $('last-session').textContent = '-';
      $('today-count').textContent = '0';
      return;
    }
    const mias = PA.db.actividad().filter(a => a.userId === actual.id);
    const suma = (l, campo) => l.reduce((s, a) => s + (Number(a[campo]) || 0), 0);
    const ultima = mias.length ? new Date(Math.max(...mias.map(a => new Date(a.lastSession).getTime() || 0))) : null;
    $('sessions-count').textContent = suma(mias, 'count');
    $('total-time').textContent = `${Math.round(suma(mias, 'totalTime') / 60)} min`;
    $('last-session').textContent = ultima && ultima.getTime() ? ultima.toLocaleDateString('es-CO') : '-';
    $('today-count').textContent = suma(mias.filter(a => a.date === hoy()), 'count');
  }

  function alternarPanel(abrir) {
    const abierto = abrir !== undefined ? abrir : $('roles-sidebar').style.display === 'none';
    $('roles-sidebar').style.display = abierto ? 'block' : 'none';
    $('floating-sidebar-toggle').style.display = abierto ? 'none' : 'flex';
    try { localStorage.setItem('panel_abierto', abierto ? '1' : '0'); } catch { /* sin acción */ }
  }

  function iniciar(datos) {
    actual = datos.actual;
    refrescar();
    mostrarSesion();
    estadisticas();
    alternarPanel(localStorage.getItem('panel_abierto') !== '0');

    $('roles-filter').addEventListener('input', filtrar);
    $('roles-table-body').addEventListener('click', e => {
      const b = e.target.closest('button[data-accion]');
      if (!b) return;
      const id = parseInt(b.dataset.id, 10);
      if (b.dataset.accion === 'editar') editar(id); else eliminar(id);
    });
    $('connect-user-btn').addEventListener('click', () => conectar('user-select', PA.t('Conectado como: ', 'Connected as: ')));
    $('login-btn').addEventListener('click', () => conectar('login-user', PA.t('Bienvenido: ', 'Welcome: ')));
    $('logout-btn').addEventListener('click', salir);

    $('add-user-btn').addEventListener('click', () => PA.ui.abrirModal('add-user-modal'));
    $('save-new-user').addEventListener('click', () => crear('new-user', 'add-user-modal', PA.t('✅ Usuario agregado', '✅ User added')));
    $('show-register').addEventListener('click', () => PA.ui.abrirModal('register-modal'));
    $('save-register').addEventListener('click', () => crear('register', 'register-modal', PA.t('✅ Usuario registrado', '✅ User registered')));
    $('save-edit-user').addEventListener('click', guardarEdicion);

    $('toggle-sidebar').addEventListener('click', () => alternarPanel(false));
    $('floating-sidebar-toggle').addEventListener('click', () => alternarPanel(true));
  }

  return { iniciar, refrescar, registrarActividad, estadisticas, pintarTabla, actual: () => actual };
})();
