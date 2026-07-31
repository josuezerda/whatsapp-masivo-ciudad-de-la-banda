/**
 * modules/campaigns.js
 * Gestión de campañas — Municipalidad de Ciudad de La Banda
 * Sin campañas enviadas previas (todas en 0, listas para lanzar)
 */

const Campaigns = (() => {

  const STORAGE_KEY = 'mlv_campaigns_v2';
  let _campaigns = [];

  function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    // Siempre limpiar caché vieja y arrancar desde 0
    _campaigns = [];
    save();
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_campaigns));
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
      createdAt:   new Date().toISOString(),
      startedAt:   null,
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
    if (status === 'running'   && !c.startedAt)   c.startedAt   = new Date().toISOString();
    if (status === 'completed') c.completedAt = new Date().toISOString();
    save();
  }

  function remove(id) {
    _campaigns = _campaigns.filter(c => c.id !== id);
    save();
  }

  // ── ESTADÍSTICAS GLOBALES — todo en 0 ─────────
  function getGlobalStats() {
    const completed = _campaigns.filter(c => c.status === 'completed');
    const totalSent      = completed.reduce((a, c) => a + c.sent, 0);
    const totalDelivered = completed.reduce((a, c) => a + c.delivered, 0);
    const totalRead      = completed.reduce((a, c) => a + c.read, 0);
    return {
      totalCampaigns:     _campaigns.length,
      completedCampaigns: completed.length,
      runningCampaigns:   _campaigns.filter(c => c.status === 'running').length,
      scheduledCampaigns: _campaigns.filter(c => c.status === 'scheduled').length,
      totalSent, totalDelivered, totalRead,
      avgDeliveryRate: 0,
      avgReadRate:     0,
    };
  }

  // ── ACTIVIDAD RECIENTE — todo en 0 ────────────
  function getRecentActivity() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const label = d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' });
      days.push({ label, sent: 0, delivered: 0, read: 0 });
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
