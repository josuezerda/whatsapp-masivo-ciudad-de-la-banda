/**
 * modules/templates.js
 * Plantillas de mensaje — Municipalidad de Ciudad de La Banda
 * Exclusivamente para: Dirección de Tránsito, Dirección de Libre Deuda, Generales
 */

const Templates = (() => {

  const STORAGE_KEY = 'mlv_templates_v3'; // v3 — incluye consulta_padron
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
        id: 'tpl_consulta_padron',
        name: 'consulta_padron',
        displayName: '¡Buen día! Consulta Padrón Municipal',
        category: 'MARKETING',
        segmento: 'Generales',
        status: 'APPROVED',
        language: 'es_AR',
        hasImage: true,          // ← header de imagen
        hasButton: true,         // ← botón URL
        buttonType: 'URL',
        buttonText: 'Ver enlace',
        body: '✌️ ¡Buen dia compañer@s!\n\nDe cara a la jornada electoral del próximo 2 de agosto, ya se encuentra habilitada la consulta rápida del padrón para que cada vecino y vecina sepa dónde vota.\n\n🗳️ Consulta tu lugar de votación con el botón de abajo.\n\n¡Compañero que consulta, compañero que organiza! ✌️\nPartido Justicialista',
        variables: [],
        imageUrl: '',
        usageCount: 0,
        lastUsed: null,
      },

      {
        id: 'tpl_transito_01',
        name: 'transito_vencimiento_licencia',
        displayName: 'Vencimiento de Licencia de Conducir',
        category: 'UTILITY',
        segmento: 'Dirección de Tránsito',
        status: 'APPROVED',
        language: 'es_AR',
        body: '🚦 *Dirección de Tránsito\nMunicipalidad de Ciudad de La Banda*\n\nEstimado/a *{{1}}*, le informamos que su Licencia de Conducir vence el *{{2}}*.\n\nPara renovarla, acercarse a la Dirección de Tránsito con:\n📋 DNI original\n📋 Libre deuda municipal\n📋 Certificado de aptitud física\n\n📍 Av. Belgrano 450 — Lunes a Viernes 7 a 13 hs\n📞 (0385) 421-0000',
        variables: ['nombre', 'fecha_vencimiento'],
        usageCount: 0,
        lastUsed: null,
      },
      {
        id: 'tpl_transito_02',
        name: 'transito_infraccion_pendiente',
        displayName: 'Infracción de Tránsito Pendiente',
        category: 'UTILITY',
        segmento: 'Dirección de Tránsito',
        status: 'APPROVED',
        language: 'es_AR',
        body: '🚦 *Dirección de Tránsito\nMunicipalidad de Ciudad de La Banda*\n\nEstimado/a *{{1}}*, registra una infracción pendiente de pago:\n\n📌 Acta N°: *{{2}}*\n📅 Fecha: *{{3}}*\n💰 Monto: $*{{4}}*\n\nEl pago puede realizarse en:\n• Tesorería Municipal\n• Dirección de Tránsito\n• Pago Fácil / Rapipago\n\n_Evite recargos abonando antes del *{{5}}*._',
        variables: ['nombre', 'nro_acta', 'fecha_infraccion', 'monto', 'fecha_limite'],
        usageCount: 0,
        lastUsed: null,
      },

      // ── DIRECCIÓN DE LIBRE DEUDA ───────────────
      {
        id: 'tpl_libdeuda_01',
        name: 'libre_deuda_certificado_listo',
        displayName: 'Certificado de Libre Deuda Disponible',
        category: 'UTILITY',
        segmento: 'Dirección de Libre Deuda',
        status: 'APPROVED',
        language: 'es_AR',
        body: '✅ *Dirección de Libre Deuda\nMunicipalidad de Ciudad de La Banda*\n\nEstimado/a *{{1}}*, su Certificado de Libre Deuda Municipal ya se encuentra disponible para retirar.\n\n📋 Expediente N°: *{{2}}*\n📍 Oficina de Libre Deuda — Planta Baja, Municipalidad\n⏰ Horario: Lunes a Viernes de 7 a 13 hs\n\nPresentar DNI al momento del retiro.\n_Validez del certificado: 30 días hábiles._',
        variables: ['nombre', 'nro_expediente'],
        usageCount: 0,
        lastUsed: null,
      },
      {
        id: 'tpl_libdeuda_02',
        name: 'libre_deuda_deuda_pendiente',
        displayName: 'Deuda Municipal Pendiente',
        category: 'UTILITY',
        segmento: 'Dirección de Libre Deuda',
        status: 'APPROVED',
        language: 'es_AR',
        body: '⚠️ *Dirección de Libre Deuda\nMunicipalidad de Ciudad de La Banda*\n\nEstimado/a *{{1}}*, registra deuda municipal pendiente:\n\n💰 Monto total: $*{{2}}*\n📅 Vencimiento: *{{3}}*\n\nRegularice su situación para obtener el Certificado de Libre Deuda.\n\n💳 Puede abonar en:\n• Tesorería Municipal (L a V — 7 a 13 hs)\n• Pago Fácil / Rapipago\n• Homebanking\n\n📞 Consultas: (0385) 421-0000 int. 220',
        variables: ['nombre', 'monto_total', 'fecha_vencimiento'],
        usageCount: 0,
        lastUsed: null,
      },

      // ── GENERALES ──────────────────────────────
      {
        id: 'tpl_general_01',
        name: 'general_aviso_municipal',
        displayName: 'Aviso General Municipal',
        category: 'UTILITY',
        segmento: 'Generales',
        status: 'APPROVED',
        language: 'es_AR',
        body: '🏛️ *Municipalidad de Ciudad de La Banda*\n\nEstimado/a vecino/a *{{1}}*,\n\n*{{2}}*\n\nPara mayor información comuníquese con la Municipalidad:\n📞 (0385) 421-0000\n📍 Av. Belgrano 450 — L a V de 7 a 13 hs\n\n_Municipalidad de Ciudad de La Banda_\n_Trabajo · Libertad · Progreso_',
        variables: ['nombre', 'mensaje'],
        usageCount: 0,
        lastUsed: null,
      },
      {
        id: 'tpl_general_02',
        name: 'general_corte_servicio',
        displayName: 'Aviso de Corte de Servicio',
        category: 'UTILITY',
        segmento: 'Generales',
        status: 'APPROVED',
        language: 'es_AR',
        body: '🏛️ *Municipalidad de Ciudad de La Banda*\n\nEstimado/a *{{1}}*, le informamos que el servicio de *{{2}}* estará interrumpido el día *{{3}}* entre las *{{4}}* hs y las *{{5}}* hs por tareas de mantenimiento programado.\n\nDisculpe los inconvenientes ocasionados.\n\n📞 Consultas: (0385) 421-0000',
        variables: ['nombre', 'servicio', 'fecha', 'hora_inicio', 'hora_fin'],
        usageCount: 0,
        lastUsed: null,
      },

    ];
  }

  // ── CRUD ──────────────────────────────────────
  function getAll()      { return [..._templates]; }
  function getApproved() { return _templates.filter(t => t.status === 'APPROVED'); }
  function getBySegmento(seg) { return _templates.filter(t => t.segmento === seg); }
  function getById(id)   { return _templates.find(t => t.id === id); }
  function getByName(n)  { return _templates.find(t => t.name === n); }

  function create(template) {
    const tpl = { id: 'tpl_' + Date.now(), status: 'PENDING', usageCount: 0, lastUsed: null, ...template };
    _templates.push(tpl);
    save();
    return tpl;
  }

  function update(id, changes) {
    const idx = _templates.findIndex(t => t.id === id);
    if (idx >= 0) { _templates[idx] = { ..._templates[idx], ...changes }; save(); return _templates[idx]; }
  }

  function remove(id) { _templates = _templates.filter(t => t.id !== id); save(); }

  function incrementUsage(name) {
    const tpl = _templates.find(t => t.name === name);
    if (tpl) { tpl.usageCount++; tpl.lastUsed = new Date().toISOString(); save(); }
  }

  // ── PREVIEW ───────────────────────────────────
  function renderPreview(body, vars = {}) {
    let preview = body;
    Object.entries(vars).forEach(([k, v], i) => {
      preview = preview.replace(new RegExp(`\\{\\{${i + 1}\\}\\}`, 'g'), v || `[${k}]`);
    });
    return preview
      .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  load();

  return {
    getAll, getApproved, getBySegmento, getById, getByName,
    create, update, remove, incrementUsage,
    renderPreview, save,
  };
})();

export default Templates;
