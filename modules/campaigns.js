/**
 * modules/campaigns.js
 * Gestión de campañas de envío masivo
 * Municipalidad de Lavanda
 */

const Campaigns = (() => {

  const STORAGE_KEY = 'mlv_campaigns';

  let _campaigns = [];

  function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    _campaigns = raw ? JSON.parse(raw) : generateDemoCampaigns();
    save();
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_campaigns));
  }

  // ── CAMPAÑAS DE DEMO ──────────────────────────
  function generateDemoCampaigns() {
    const now = Date.now();
    return [
      {
        id: 'c001',
        name: 'Aviso de Corte de Agua — Zona Norte',
        template: 'aviso_servicio',
        segment: 'all',
        segmentLabel: 'Todos los contactos',
        total: 11258, sent: 11258, delivered: 10943, read: 8712, error: 315,
        status: 'completed',
        createdAt: new Date(now - 3 * 86400000).toISOString(),
        startedAt: new Date(now - 3 * 86400000 + 3600000).toISOString(),
        completedAt: new Date(now - 3 * 86400000 + 7200000).toISOString(),
      },
      {
        id: 'c002',
        name: 'Vacunación Antigripal — Campaña 2026',
        template: 'salud_campana',
        segment: 'barrio:Centro',
        segmentLabel: 'Barrio Centro',
        total: 1847, sent: 1204, delivered: 1198, read: 892, error: 6,
        status: 'running',
        createdAt: new Date(now - 2 * 3600000).toISOString(),
        startedAt: new Date(now - 90 * 60000).toISOString(),
        completedAt: null,
      },
      {
        id: 'c003',
        name: 'Cobro de Tasas — Vencimiento 31/07',
        template: 'tasa_vencimiento',
        segment: 'all',
        segmentLabel: 'Todos los contactos',
        total: 11258, sent: 0, delivered: 0, read: 0, error: 0,
        status: 'scheduled',
        scheduledAt: new Date(now + 86400000).toISOString(),
        createdAt: new Date(now - 1800000).toISOString(),
        startedAt: null,
        completedAt: null,
      },
    ];
  }

  // ── CRUD ──────────────────────────────────────
  function getAll() { return [..._campaigns].reverse(); }

  function getById(id) { return _campaigns.find(c => c.id === id); }

  function create({ name, template, segment, segmentLabel, total, scheduledAt = null }) {
    const campaign = {
      id: 'c' + Date.now(),
      name, template, segment, segmentLabel,
      total, sent: 0, delivered: 0, read: 0, error: 0,
      status: scheduledAt ? 'scheduled' : 'draft',
      scheduledAt,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
    };
    _campaigns.push(campaign);
    save();
    return campaign;
  }

  function updateProgress(id, { sent, delivered, read, error, status }) {
    const c = _campaigns.find(x => x.id === id);
    if (!c) return;
    if (sent      !== undefined) c.sent      = sent;
    if (delivered !== undefined) c.delivered = delivered;
    if (read      !== undefined) c.read      = read;
    if (error     !== undefined) c.error     = error;
    if (status    !== undefined) c.status    = status;
    if (status === 'running' && !c.startedAt) c.startedAt = new Date().toISOString();
    if (status === 'completed') c.completedAt = new Date().toISOString();
    save();
  }

  function remove(id) {
    _campaigns = _campaigns.filter(c => c.id !== id);
    save();
  }

  // ── ESTADÍSTICAS GLOBALES ─────────────────────
  function getGlobalStats() {
    const completed = _campaigns.filter(c => c.status === 'completed');
    const totalSent = completed.reduce((a, c) => a + c.sent, 0);
    const totalDelivered = completed.reduce((a, c) => a + c.delivered, 0);
    const totalRead = completed.reduce((a, c) => a + c.read, 0);

    return {
      totalCampaigns: _campaigns.length,
      completedCampaigns: completed.length,
      runningCampaigns: _campaigns.filter(c => c.status === 'running').length,
      scheduledCampaigns: _campaigns.filter(c => c.status === 'scheduled').length,
      totalSent, totalDelivered, totalRead,
      avgDeliveryRate: totalSent > 0 ? Math.round(totalDelivered / totalSent * 100) : 0,
      avgReadRate: totalSent > 0 ? Math.round(totalRead / totalSent * 100) : 0,
    };
  }

  // ── HISTORIAL POR DÍA (últimos 7 días) ────────
  function getRecentActivity() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const label = d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' });
      const sent = Math.floor(Math.random() * 4000) + 500;
      days.push({ label, sent, delivered: Math.floor(sent * 0.96), read: Math.floor(sent * 0.73) });
    }
    return days;
  }

  load();

  return {
    getAll, getById, create, updateProgress, remove,
    getGlobalStats, getRecentActivity, save,
  };
})();

export default Campaigns;
