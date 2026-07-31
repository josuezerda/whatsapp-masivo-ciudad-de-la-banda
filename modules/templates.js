/**
 * modules/templates.js
 * Gestión de plantillas de mensaje WhatsApp
 * Municipalidad de Lavanda
 */

const Templates = (() => {

  const STORAGE_KEY = 'mlv_templates';

  let _templates = [];

  function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    _templates = raw ? JSON.parse(raw) : getDefaultTemplates();
    save();
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_templates));
  }

  function getDefaultTemplates() {
    return [
      {
        id: 'tpl_001',
        name: 'aviso_servicio',
        displayName: 'Aviso de Servicio',
        category: 'UTILITY',
        status: 'APPROVED',
        language: 'es_AR',
        body: '🏛️ *Municipalidad de Ciudad de La Banda*\n\nEstimado/a *{{1}}*, le informamos que el servicio de agua potable en su sector estará interrumpido el día *{{2}}* entre las *{{3}}* hs y las *{{4}}* hs por tareas de mantenimiento programado.\n\nDisculpe los inconvenientes. Para consultas: 📞 0800-333-LABANDA',
        variables: ['nombre', 'fecha', 'hora_inicio', 'hora_fin'],
        usageCount: 11258,
        lastUsed: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
      {
        id: 'tpl_002',
        name: 'salud_campana',
        displayName: 'Campaña de Salud',
        category: 'MARKETING',
        status: 'APPROVED',
        language: 'es_AR',
        body: '💉 *Campaña de Vacunación — Municipalidad de Ciudad de La Banda*\n\nHola *{{1}}*! Te recordamos que la campaña de vacunación *{{2}}* está disponible en el Centro de Salud de tu barrio hasta el *{{3}}*.\n\nEs gratuita y sin turno previo. ¡Cuidemos juntos nuestra comunidad! 💚',
        variables: ['nombre', 'tipo_vacuna', 'fecha_limite'],
        usageCount: 1204,
        lastUsed: new Date(Date.now() - 90 * 60000).toISOString(),
      },
      {
        id: 'tpl_003',
        name: 'tasa_vencimiento',
        displayName: 'Vencimiento de Tasas',
        category: 'UTILITY',
        status: 'APPROVED',
        language: 'es_AR',
        body: '🏛️ *Municipalidad de Ciudad de La Banda — Tesorería Municipal*\n\nEstimado/a *{{1}}*, le recordamos que su tasa municipal vence el *{{2}}*.\n\n💳 Puede abonar en:\n• Banca digital\n• Tesorería Municipal (Lunes a Viernes 8 a 14 hs)\n• Red Pago Fácil\n\nImporte: $*{{3}}*\nNro. de cuenta: *{{4}}*\n\n_Evite recargos por mora._',
        variables: ['nombre', 'fecha_vencimiento', 'monto', 'nro_cuenta'],
        usageCount: 0,
        lastUsed: null,
      },
      {
        id: 'tpl_004',
        name: 'evento_municipal',
        displayName: 'Evento Municipal',
        category: 'MARKETING',
        status: 'APPROVED',
        language: 'es_AR',
        body: '🎉 *Municipalidad de Ciudad de La Banda — Te invita!*\n\nHola *{{1}}*!\n\n📅 *{{2}}*\n📍 *{{3}}*\n🕐 *{{4}}* hs\n\n*{{5}}*\n\nEntrada libre y gratuita. ¡Te esperamos! 🏛️',
        variables: ['nombre', 'nombre_evento', 'lugar', 'hora', 'descripcion'],
        usageCount: 342,
        lastUsed: new Date(Date.now() - 7 * 86400000).toISOString(),
      },
      {
        id: 'tpl_005',
        name: 'tramite_listo',
        displayName: 'Trámite Listo para Retirar',
        category: 'UTILITY',
        status: 'APPROVED',
        language: 'es_AR',
        body: '✅ *Municipalidad de Ciudad de La Banda*\n\nBuenas *{{1}}*! Su trámite *{{2}}* ya está listo para retirar.\n\n🏛️ Lugar: Municipalidad, Planta Baja, Área *{{3}}*\n⏰ Horario: Lunes a Viernes, 8 a 14 hs\n📋 Presentar: DNI y número de expediente *{{4}}*\n\nValidez: hasta el *{{5}}*.',
        variables: ['nombre', 'tipo_tramite', 'area', 'nro_expediente', 'fecha_vencimiento'],
        usageCount: 867,
        lastUsed: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        id: 'tpl_006',
        name: 'encuesta_satisfaccion',
        displayName: 'Encuesta de Satisfacción',
        category: 'MARKETING',
        status: 'PENDING',
        language: 'es_AR',
        body: '📊 *Municipalidad de Ciudad de La Banda*\n\nHola *{{1}}*! Tu opinión es muy importante para nosotros.\n\nCompletá nuestra encuesta de satisfacción en 2 minutos:\n👉 *{{2}}*\n\nGracias por ayudarnos a mejorar los servicios de tu municipio. 🙏',
        variables: ['nombre', 'link_encuesta'],
        usageCount: 0,
        lastUsed: null,
      },
    ];
  }

  // ── CRUD ──────────────────────────────────────
  function getAll() { return [..._templates]; }

  function getApproved() { return _templates.filter(t => t.status === 'APPROVED'); }

  function getById(id) { return _templates.find(t => t.id === id); }

  function getByName(name) { return _templates.find(t => t.name === name); }

  function create(template) {
    const tpl = {
      id: 'tpl_' + Date.now(),
      status: 'PENDING',
      usageCount: 0,
      lastUsed: null,
      createdAt: new Date().toISOString(),
      ...template,
    };
    _templates.push(tpl);
    save();
    return tpl;
  }

  function update(id, changes) {
    const idx = _templates.findIndex(t => t.id === id);
    if (idx >= 0) {
      _templates[idx] = { ..._templates[idx], ...changes };
      save();
      return _templates[idx];
    }
  }

  function remove(id) {
    _templates = _templates.filter(t => t.id !== id);
    save();
  }

  function incrementUsage(name) {
    const tpl = _templates.find(t => t.name === name);
    if (tpl) {
      tpl.usageCount++;
      tpl.lastUsed = new Date().toISOString();
      save();
    }
  }

  // ── PREVIEW CON VARIABLES ─────────────────────
  function renderPreview(body, vars = {}) {
    let preview = body;
    Object.entries(vars).forEach(([k, v], i) => {
      preview = preview.replace(new RegExp(`\\{\\{${i + 1}\\}\\}`, 'g'), v || `[${k}]`);
    });
    // Estilo WhatsApp básico
    preview = preview
      .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
    return preview;
  }

  load();

  return {
    getAll, getApproved, getById, getByName,
    create, update, remove, incrementUsage,
    renderPreview, save,
  };
})();

export default Templates;
