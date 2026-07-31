/**
 * modules/database.js
 * Base de datos de contactos — Municipalidad de Ciudad de La Banda
 * Distribuida en 3 segmentos oficiales
 */

const Database = (() => {

  const STORAGE_KEY  = 'mlv_contacts_v2';
  const TOTAL_TARGET = 11258;

  // ── DISTRIBUCIÓN OFICIAL ──────────────────────
  // Dirección de Tránsito:    3.847 contactos
  // Dirección de Libre Deuda: 3.124 contactos
  // Generales:                4.287 contactos
  // TOTAL:                   11.258 contactos

  const SEGMENTOS = {
    'Dirección de Tránsito':    { count: 3847,  color: '#7c3aed' },
    'Dirección de Libre Deuda': { count: 3124,  color: '#f59e0b' },
    'Generales':                { count: 4287,  color: '#10b981' },
  };

  // ── DATOS DE DEMO ─────────────────────────────
  function generateDemoContacts() {
    const nombres = [
      'María','José','Carlos','Ana','Luis','Laura','Pedro','Sofía','Miguel','Lucía',
      'Juan','Valentina','Diego','Florencia','Pablo','Agustina','Martín','Camila',
      'Roberto','Natalia','Federico','Gabriela','Alejandro','Mariana','Sergio',
      'Paola','Oscar','Verónica','Ricardo','Patricia','Ramón','Claudia','Hugo',
      'Mónica','César','Adriana','Héctor','Silvana','Rubén','Marcela'
    ];
    const apellidos = [
      'García','González','Rodríguez','López','Martínez','Pérez','Sánchez','Romero',
      'Torres','Díaz','Flores','Ruiz','Moreno','Jiménez','Álvarez','Domínguez',
      'Castro','Gutiérrez','Herrera','Medina','Vásquez','Ortega','Molina','Delgado',
      'Ramírez','Cruz','Reyes','Morales','Núñez','Ibáñez','Aguirre','Vargas',
      'Rojas','Ríos','Suárez','Mendoza','Silva','Cabrera','Acosta','Figueroa'
    ];
    const areas = ['385', '3855', '3856'];

    const contacts = [];
    let id = 1;

    for (const [segmento, { count }] of Object.entries(SEGMENTOS)) {
      for (let i = 0; i < count; i++) {
        const nombre   = nombres[Math.floor(Math.random() * nombres.length)];
        const apellido = apellidos[Math.floor(Math.random() * apellidos.length)];
        const area     = areas[Math.floor(Math.random() * areas.length)];
        const num      = Math.floor(Math.random() * 9000000 + 1000000);
        const dni      = (20000000 + Math.floor(Math.random() * 20000000)).toString();

        contacts.push({
          id,
          nombre:   `${nombre} ${apellido}`,
          phone:    `+549${area}${num}`,
          dni,
          segmento,
          status:   'active',
          msgStatus:'pending',
          msgId:    null,
          lastContact: null,
          createdAt: new Date(Date.now() - Math.random() * 63072000000).toISOString(),
        });
        id++;
      }
    }
    return contacts;
  }

  // ── CARGA / GUARDADO ──────────────────────────
  let _contacts = null;

  function init() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { _contacts = JSON.parse(raw); } catch { _contacts = null; }
    }
    if (!_contacts || _contacts.length === 0) {
      _contacts = generateDemoContacts();
      save();
    }
    return _contacts;
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_contacts)); } catch(e) {}
  }

  function getAll() {
    if (!_contacts) init();
    return _contacts;
  }

  // ── ESTADÍSTICAS ──────────────────────────────
  function getStats() {
    const all = getAll();
    const bySegmento = {};
    for (const seg of Object.keys(SEGMENTOS)) {
      bySegmento[seg] = all.filter(c => c.segmento === seg).length;
    }
    return {
      total:     all.length,
      active:    all.filter(c => c.status === 'active').length,
      inactive:  all.filter(c => c.status === 'inactive').length,
      // Mensajes — todos en 0 (sin campañas enviadas aún)
      sent:      0,
      delivered: 0,
      read:      0,
      error:     0,
      pending:   all.length,
      bySegmento,
      deliveryRate: 0,
      readRate:     0,
    };
  }

  // ── FILTROS Y PAGINACIÓN ──────────────────────
  function query({ search = '', segmento = '', status = '', page = 1, perPage = 50 } = {}) {
    let list = getAll();

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.nombre.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.dni.includes(q)
      );
    }
    if (segmento) list = list.filter(c => c.segmento === segmento);
    if (status)   list = list.filter(c => c.status   === status);

    const total      = list.length;
    const totalPages = Math.ceil(total / perPage);
    const start      = (page - 1) * perPage;
    const items      = list.slice(start, start + perPage);

    return { items, total, page, totalPages, perPage };
  }

  // ── ACTUALIZAR ESTADO ─────────────────────────
  function updateMsgStatus(id, msgStatus, msgId = null) {
    const c = _contacts.find(x => x.id === id);
    if (c) {
      c.msgStatus  = msgStatus;
      if (msgId) c.msgId = msgId;
      c.lastContact = new Date().toISOString();
    }
  }

  function resetMsgStatuses() {
    _contacts.forEach(c => { c.msgStatus = 'pending'; c.msgId = null; c.lastContact = null; });
    save();
  }

  // ── IMPORTAR CSV ──────────────────────────────
  function importCSV(csvText, segmentoDestino = 'Generales') {
    const lines   = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const phIdx   = headers.findIndex(h => h.includes('phone') || h.includes('telefon') || h.includes('celular'));
    const nmIdx   = headers.findIndex(h => h.includes('nombre') || h.includes('name'));
    const dniIdx  = headers.findIndex(h => h.includes('dni'));

    let added = 0;
    const maxId = _contacts.length > 0 ? Math.max(..._contacts.map(c => c.id)) : 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      if (!cols[phIdx]) continue;
      const rawPhone = cols[phIdx].replace(/\D/g, '');
      _contacts.push({
        id:          maxId + i,
        nombre:      nmIdx  >= 0 ? cols[nmIdx]  : `Contacto ${maxId + i}`,
        phone:       rawPhone.startsWith('549') ? `+${rawPhone}` : `+549${rawPhone}`,
        dni:         dniIdx >= 0 ? cols[dniIdx] : '',
        segmento:    segmentoDestino,
        status:      'active',
        msgStatus:   'pending',
        msgId:       null,
        lastContact: null,
        createdAt:   new Date().toISOString(),
      });
      added++;
    }
    save();
    return added;
  }

  // ── GETTERS ÚTILES ────────────────────────────
  function getSegmentos()     { return Object.keys(SEGMENTOS); }
  function getSegmentosMeta() { return SEGMENTOS; }
  function getActiveContacts(segmento = null) {
    let list = getAll().filter(c => c.status === 'active');
    if (segmento) list = list.filter(c => c.segmento === segmento);
    return list;
  }

  init();

  return {
    init, getAll, getStats,
    query, getSegmentos, getSegmentosMeta,
    getActiveContacts,
    updateMsgStatus, resetMsgStatuses,
    importCSV, save,
    TOTAL_TARGET,
    SEGMENTOS,
  };
})();

export default Database;
