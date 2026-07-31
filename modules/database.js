/**
 * modules/database.js
 * Gestión de la base de datos de contactos
 * 11.258 contactos — Municipalidad de Lavanda
 */

const Database = (() => {

  const STORAGE_KEY = 'mlv_contacts';
  const TOTAL_TARGET = 11258;

  // ── GENERAR BASE DE DEMO ──────────────────────
  function generateDemoContacts(count = TOTAL_TARGET) {
    const barrios = [
      'Centro', 'San Martín', 'Villa Nueva', 'El Progreso',
      'Los Álamos', 'Belgrano', 'Santa Rosa', 'La Paz',
      'Villa Floresta', 'Norte', 'Sur', 'Oeste', 'Este'
    ];
    const categorias = ['Vecino', 'Comerciante', 'Empleado Municipal', 'Jubilado', 'Estudiante'];
    const statuses = ['active', 'active', 'active', 'active', 'active', 'inactive', 'blocked'];

    const nombres = ['María','José','Carlos','Ana','Luis','Laura','Pedro','Sofía','Miguel','Lucía',
      'Juan','Valentina','Diego','Florencia','Pablo','Agustina','Martín','Camila','Roberto','Natalia',
      'Federico','Gabriela','Alejandro','Mariana','Sergio','Paola','Oscar','Verónica','Ricardo','Patricia'];
    const apellidos = ['García','González','Rodríguez','López','Martínez','Pérez','Sánchez','Romero',
      'Torres','Díaz','Flores','Ruiz','Moreno','Jiménez','Álvarez','Domínguez','Castro','Gutiérrez',
      'Herrera','Medina','Vásquez','Ortega','Molina','Delgado','Ramírez','Cruz','Reyes','Morales'];

    const contacts = [];
    for (let i = 0; i < count; i++) {
      const nombre = nombres[Math.floor(Math.random() * nombres.length)];
      const apellido = apellidos[Math.floor(Math.random() * apellidos.length)];
      const barrio = barrios[Math.floor(Math.random() * barrios.length)];
      const categoria = categorias[Math.floor(Math.random() * categorias.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const dni = 20000000 + Math.floor(Math.random() * 20000000);

      // Teléfonos argentinos formato +549...
      const area = ['11','221','351','341','261','264','299','387','388','381'][Math.floor(Math.random() * 10)];
      const num = Math.floor(Math.random() * 90000000 + 10000000);

      contacts.push({
        id: i + 1,
        nombre: `${nombre} ${apellido}`,
        phone: `+549${area}${num}`,
        dni: dni.toString(),
        barrio,
        categoria,
        status,
        msgStatus: 'pending',   // pending | sent | delivered | read | error
        msgId: null,
        lastContact: null,
        createdAt: new Date(Date.now() - Math.random() * 31536000000).toISOString(),
      });
    }
    return contacts;
  }

  // ── CARGA / GUARDADO ──────────────────────────
  let _contacts = null;

  function init() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      _contacts = JSON.parse(raw);
    } else {
      _contacts = generateDemoContacts(TOTAL_TARGET);
      save();
    }
    return _contacts;
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_contacts));
  }

  function getAll() {
    if (!_contacts) init();
    return _contacts;
  }

  // ── ESTADÍSTICAS ──────────────────────────────
  function getStats() {
    const all = getAll();
    const active   = all.filter(c => c.status === 'active').length;
    const inactive = all.filter(c => c.status === 'inactive').length;
    const blocked  = all.filter(c => c.status === 'blocked').length;

    const sent      = all.filter(c => c.msgStatus === 'sent').length;
    const delivered = all.filter(c => c.msgStatus === 'delivered').length;
    const read      = all.filter(c => c.msgStatus === 'read').length;
    const error     = all.filter(c => c.msgStatus === 'error').length;
    const pending   = all.filter(c => c.msgStatus === 'pending').length;

    const barrios = {};
    all.forEach(c => { barrios[c.barrio] = (barrios[c.barrio] || 0) + 1; });

    const categorias = {};
    all.forEach(c => { categorias[c.categoria] = (categorias[c.categoria] || 0) + 1; });

    return {
      total: all.length, active, inactive, blocked,
      sent, delivered, read, error, pending,
      barrios, categorias,
      deliveryRate: all.length > 0 ? Math.round((delivered + read) / all.length * 100) : 0,
      readRate: all.length > 0 ? Math.round(read / all.length * 100) : 0,
    };
  }

  // ── FILTROS Y PAGINACIÓN ──────────────────────
  function query({ search = '', barrio = '', categoria = '', status = '', msgStatus = '', page = 1, perPage = 50 } = {}) {
    let list = getAll();

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.nombre.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.dni.includes(q)
      );
    }
    if (barrio)    list = list.filter(c => c.barrio === barrio);
    if (categoria) list = list.filter(c => c.categoria === categoria);
    if (status)    list = list.filter(c => c.status === status);
    if (msgStatus) list = list.filter(c => c.msgStatus === msgStatus);

    const total = list.length;
    const totalPages = Math.ceil(total / perPage);
    const start = (page - 1) * perPage;
    const items = list.slice(start, start + perPage);

    return { items, total, page, totalPages, perPage };
  }

  // ── ACTUALIZAR ESTADO DE MENSAJE ──────────────
  function updateMsgStatus(id, msgStatus, msgId = null) {
    const c = _contacts.find(x => x.id === id);
    if (c) {
      c.msgStatus = msgStatus;
      if (msgId) c.msgId = msgId;
      c.lastContact = new Date().toISOString();
    }
  }

  function bulkUpdateMsgStatus(ids, msgStatus) {
    ids.forEach(id => updateMsgStatus(id, msgStatus));
    save();
  }

  function resetMsgStatuses() {
    _contacts.forEach(c => { c.msgStatus = 'pending'; c.msgId = null; c.lastContact = null; });
    save();
  }

  // ── IMPORTAR CSV ──────────────────────────────
  function importCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    const phIdx = headers.findIndex(h => h.includes('phone') || h.includes('telefon') || h.includes('celular') || h.includes('whatsapp'));
    const nmIdx = headers.findIndex(h => h.includes('nombre') || h.includes('name'));
    const brIdx = headers.findIndex(h => h.includes('barrio') || h.includes('distrito'));
    const catIdx = headers.findIndex(h => h.includes('categ'));

    let added = 0;
    const maxId = _contacts.length > 0 ? Math.max(..._contacts.map(c => c.id)) : 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      if (!cols[phIdx]) continue;

      _contacts.push({
        id: maxId + i,
        nombre: nmIdx >= 0 ? cols[nmIdx] : `Contacto ${maxId + i}`,
        phone: cols[phIdx].replace(/\D/g, '').startsWith('549') ? `+${cols[phIdx].replace(/\D/g,'')}` : `+549${cols[phIdx].replace(/\D/g,'')}`,
        dni: '',
        barrio: brIdx >= 0 ? cols[brIdx] : 'Sin asignar',
        categoria: catIdx >= 0 ? cols[catIdx] : 'Vecino',
        status: 'active',
        msgStatus: 'pending',
        msgId: null,
        lastContact: null,
        createdAt: new Date().toISOString(),
      });
      added++;
    }
    save();
    return added;
  }

  // ── GETTERS PARA FILTROS ──────────────────────
  function getBarrios() {
    return [...new Set(getAll().map(c => c.barrio))].sort();
  }
  function getCategorias() {
    return [...new Set(getAll().map(c => c.categoria))].sort();
  }

  function getActiveContacts() {
    return getAll().filter(c => c.status === 'active');
  }

  // ── INICIALIZAR ───────────────────────────────
  init();

  return {
    init, getAll, getStats,
    query, getBarrios, getCategorias,
    getActiveContacts,
    updateMsgStatus, bulkUpdateMsgStatus, resetMsgStatuses,
    importCSV, save,
    TOTAL_TARGET,
  };
})();

export default Database;
