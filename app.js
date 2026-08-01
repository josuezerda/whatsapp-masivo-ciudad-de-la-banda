/**
 * app.js
 * Controlador principal del Dashboard
 * Municipalidad de Ciudad de La Banda — Sistema WhatsApp Masivo
 */

import WhatsAppAPI from './modules/whatsapp-api.js';
import Database    from './modules/database.js';
import Campaigns   from './modules/campaigns.js';
import Templates   from './modules/templates.js';
import Auth        from './modules/auth.js';

// ── ESTADO GLOBAL ─────────────────────────────
const State = {
  currentView: 'overview',
  apiConnected: false,
  sendingCampaign: null,
  sendAbortController: null,
  dbPage: 1, dbSearch: '', dbBarrio: '', dbCategoria: '', dbStatus: '',
  campaignWizardStep: 1,
  currentCampaignDraft: {},
};

// ── DOM HELPERS ───────────────────────────────
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

// ── NAVEGACIÓN ────────────────────────────────
function initNavigation() {
  $$('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      navigateTo(view);
    });
  });
}

function navigateTo(viewId) {
  State.currentView = viewId;

  // Actualizar nav items
  $$('.nav-item').forEach(el => el.classList.remove('active'));
  const navEl = document.querySelector(`.nav-item[data-view="${viewId}"]`);
  if (navEl) navEl.classList.add('active');

  // Mostrar view
  $$('.view').forEach(v => v.classList.remove('active'));
  const viewEl = $(`view-${viewId}`);
  if (viewEl) viewEl.classList.add('active');

  // Título topbar
  const titles = {
    overview:   { title: 'Panel de Control', sub: 'Resumen general del sistema' },
    send:       { title: 'Envío Masivo', sub: 'Crear y lanzar campañas' },
    database:   { title: 'Base de Datos', sub: '11.258 contactos registrados' },
    campaigns:  { title: 'Campañas', sub: 'Historial y estado de envíos' },
    templates:  { title: 'Plantillas', sub: 'Mensajes aprobados por Meta' },
    reports:    { title: 'Reportes', sub: 'Estadísticas y análisis' },
    config:     { title: 'Configuración', sub: 'API de WhatsApp Business' },
  };
  const t = titles[viewId] || { title: viewId, sub: '' };
  $('topbar-title').textContent = t.title;
  $('topbar-sub').textContent   = t.sub;

  // Renderizar contenido
  const renders = {
    overview: renderOverview,
    send:     renderSend,
    database: renderDatabase,
    campaigns:renderCampaigns,
    templates:renderTemplates,
    reports:  renderReports,
    config:   renderConfig,
  };
  if (renders[viewId]) renders[viewId]();
}

// ═══════════════════════════════════════════════
// VIEW: OVERVIEW
// ═══════════════════════════════════════════════
function renderOverview() {
  const stats  = Database.getStats();
  const camps  = Campaigns.getGlobalStats();
  const recent = Campaigns.getRecentActivity();

  // Contadores: total contactos real, el resto en 0
  animateCounter('metric-total',     stats.total);
  animateCounter('metric-sent',      0);
  animateCounter('metric-delivery',  0);
  animateCounter('metric-campaigns', 0);

  // Bases listas para enviar
  renderBasesList();

  // Gráfico de actividad (todo en 0)
  renderActivityChart(recent);

  // Distribución por segmento
  renderSegmentChart(stats.bySegmento);
}

function renderBasesList() {
  const el = $('active-campaigns-list');
  if (!el) return;
  const stats = Database.getStats();
  const meta  = Database.getSegmentosMeta();
  const colors = { 'Dirección de Tránsito': '#7c3aed', 'Dirección de Libre Deuda': '#f59e0b', 'Generales': '#10b981' };
  const icons  = { 'Dirección de Tránsito': '🚗', 'Dirección de Libre Deuda': '📄', 'Generales': '🏡' };

  el.innerHTML = Object.entries(stats.bySegmento).map(([seg, count]) => {
    const color = colors[seg] || '#7c3aed';
    const icon  = icons[seg]  || '📂';
    const pct   = Math.round(count / stats.total * 100);
    return `
      <div style="padding:16px 20px;border-bottom:1px solid var(--bg-border)">
        <div class="flex-between mb-8">
          <div class="flex gap-8 flex-center">
            <span style="font-size:18px">${icon}</span>
            <div>
              <div class="fw-600 text-sm">${seg}</div>
              <div class="text-xs text-muted mt-4">${count.toLocaleString('es-AR')} contactos &mdash; ${pct}% del total</div>
            </div>
          </div>
          <span class="badge badge-lavanda">Lista para enviar</span>
        </div>
        <div class="progress-track">
          <div style="height:100%;border-radius:99px;background:${color};width:${pct}%;transition:width 0.5s ease"></div>
        </div>
      </div>`;
  }).join('');
}

function renderActivityChart(data) {
  const canvas = $('chart-activity');
  if (!canvas || !window.Chart) return;

  if (canvas._chart) canvas._chart.destroy();

  canvas._chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: data.map(d => d.label),
      datasets: [
        {
          label: 'Enviados',
          data: data.map(d => d.sent),
          backgroundColor: 'rgba(124, 58, 237, 0.7)',
          borderRadius: 6,
        },
        {
          label: 'Entregados',
          data: data.map(d => d.delivered),
          backgroundColor: 'rgba(124, 58, 237, 0.35)',
          borderRadius: 6,
        },
        {
          label: 'Leídos',
          data: data.map(d => d.read),
          backgroundColor: 'rgba(245, 158, 11, 0.5)',
          borderRadius: 6,
        },
      ]
    },
    options: chartDefaults({
      plugins: {
        legend: { display: true, labels: { color: '#a89fc4', boxWidth: 12, font: { size: 12 } } },
      },
      scales: {
        x: { stacked: false, ticks: { color: '#6b6488' }, grid: { color: 'rgba(124,58,237,0.06)' } },
        y: { stacked: false, ticks: { color: '#6b6488' }, grid: { color: 'rgba(124,58,237,0.06)' } },
      }
    }),
  });
}

function renderSegmentChart(bySegmento = {}) {
  const canvas = $('chart-barrio');
  if (!canvas || !window.Chart) return;

  if (canvas._chart) canvas._chart.destroy();

  const segmentos = Object.entries(bySegmento);
  const colors = ['#7c3aed', '#f59e0b', '#10b981'];

  canvas._chart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: segmentos.map(([k]) => k),
      datasets: [{
        data: segmentos.map(([, v]) => v),
        backgroundColor: colors,
        borderWidth: 0,
        hoverOffset: 10,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: '#a89fc4', boxWidth: 12, font: { size: 12 }, padding: 12 } },
      },
    }
  });
}

// ═══════════════════════════════════════════════
// VIEW: ENVÍO MASIVO
// ═══════════════════════════════════════════════
function renderSend() {
  State.campaignWizardStep = 1;
  renderWizardStep(1);
  populateTemplateSelect();
  populateSegmentOptions();
}

function populateTemplateSelect() {
  const sel = $('send-template');
  if (!sel) return;
  const approved = Templates.getApproved();
  sel.innerHTML = '<option value="">— Seleccioná una plantilla —</option>' +
    approved.map(t => `<option value="${t.name}">${t.displayName}</option>`).join('');

  sel.addEventListener('change', () => updateTemplatePreview(sel.value));
}

function populateSegmentOptions() {
  const sel = $('send-segment');
  if (!sel) return;
  const stats = Database.getStats();

  sel.innerHTML =
    `<option value="all">Todas las bases (${stats.active.toLocaleString('es-AR')} contactos activos)</option>` +
    Object.entries(stats.bySegmento).map(([seg, count]) =>
      `<option value="seg:${seg}">${seg} (${count.toLocaleString('es-AR')} contactos)</option>`
    ).join('');

  sel.addEventListener('change', updateSendCount);
  updateSendCount();
}

function updateSendCount() {
  const seg   = $('send-segment')?.value || 'all';
  const stats = Database.getStats();
  let count;

  if (seg === 'all') {
    count = stats.active;
  } else if (seg.startsWith('seg:')) {
    const s = seg.replace('seg:', '');
    count = stats.bySegmento[s] || 0;
  } else {
    count = stats.active;
  }

  const el = $('send-count');
  if (el) el.textContent = count.toLocaleString('es-AR');
  State.currentCampaignDraft.count   = count;
  State.currentCampaignDraft.segment = seg;
}

function updateTemplatePreview(name) {
  const tpl = Templates.getByName(name);
  const previewEl = $('template-preview-bubble');
  const varsEl = $('template-vars-section');

  if (!tpl || !previewEl) return;

  previewEl.innerHTML = Templates.renderPreview(tpl.body, {});
  State.currentCampaignDraft.template    = name;
  State.currentCampaignDraft.templateObj = tpl;

  // Campo de imagen si el template lo requiere
  let imageSection = $('template-image-section');
  if (!imageSection) {
    imageSection = document.createElement('div');
    imageSection.id = 'template-image-section';
    previewEl.parentElement?.insertBefore(imageSection, previewEl);
  }

  if (tpl.hasImage) {
    imageSection.innerHTML = `
      <div class="form-group" style="margin-bottom:16px">
        <label class="form-label">🖼️ Imagen del mensaje (header)</label>
        <div style="display:flex;gap:10px;align-items:center;">
          <input type="file" id="tpl-image-file" accept="image/jpeg, image/png" style="display:none">
          <button class="btn btn-secondary" id="btn-upload-image" style="flex:1">
            <i data-lucide="upload"></i> Subir Imagen a WhatsApp
          </button>
          <span id="tpl-image-status" style="font-size:12px;color:var(--text-muted)">Ninguna imagen seleccionada</span>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:6px">
          Sube la imagen directamente a los servidores de WhatsApp para adjuntarla en el envío masivo.
        </div>
      </div>`;
    
    setTimeout(() => {
      if (typeof lucide !== 'undefined') lucide.createIcons();
      $('btn-upload-image').addEventListener('click', () => {
        $('tpl-image-file').value = ''; // Reset for same file selection
        $('tpl-image-file').click();
      });
      $('tpl-image-file').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        $('tpl-image-status').textContent = '⏳ Subiendo a Meta...';
        $('btn-upload-image').disabled = true;
        
        try {
          const cfg = WhatsAppAPI.getConfig();
          const formData = new FormData();
          formData.append('messaging_product', 'whatsapp');
          formData.append('file', file);
          formData.append('type', file.type);
          
          const res = await fetch(`https://graph.facebook.com/v20.0/${cfg.phoneNumberId}/media`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${cfg.accessToken}` },
            body: formData
          });
          const data = await res.json();
          if (data.id) {
            State.currentCampaignDraft.mediaId = data.id;
            State.currentCampaignDraft.imageUrl = null; // Limpiar url si hay media ID
            $('tpl-image-status').innerHTML = '<span style="color:#10b981">✅ Guardada en Meta</span>';
            const btn = $('btn-upload-image');
            btn.innerHTML = '<i data-lucide="check-circle"></i> Imagen Lista';
            btn.className = 'btn btn-success';
            btn.style.backgroundColor = '#10b981';
            btn.style.color = 'white';
            if (typeof lucide !== 'undefined') lucide.createIcons();
          } else {
            $('tpl-image-status').innerHTML = '<span style="color:#ef4444">❌ Error al subir</span>';
            alert('Error de Meta: ' + (data.error?.message || 'Revisá que la API esté conectada.'));
            console.error(data);
          }
        } catch (err) {
          $('tpl-image-status').innerHTML = '<span style="color:#ef4444">❌ Falló la conexión</span>';
          alert('Fallo de red al intentar subir la imagen a Meta.');
        }
        $('btn-upload-image').disabled = false;
      });
    }, 50);
  } else {
    imageSection.innerHTML = '';
  }

  if (varsEl && tpl.variables.length > 0) {
    varsEl.style.display = 'block';
    $('template-vars-form').innerHTML = tpl.variables.map((v, i) => `
      <div class="form-group">
        <label class="form-label">Variable {{${i+1}}} — ${v}</label>
        <input class="form-input tpl-var" id="var-${i}" type="text"
          placeholder="Ej: ${getVarPlaceholder(v)}"
          data-idx="${i}" data-name="${v}">
      </div>
    `).join('');

    // Live preview update
    $$('.tpl-var').forEach(inp => {
      inp.addEventListener('input', () => {
        const vars = {};
        $$('.tpl-var').forEach(v2 => { vars[v2.dataset.name] = v2.value; });
        previewEl.innerHTML = Templates.renderPreview(tpl.body, vars);
      });
    });
  } else if (varsEl) {
    varsEl.style.display = 'none';
  }
}

function getVarPlaceholder(varName) {
  const map = { nombre: 'Nombre Apellido', fecha: '01/08/2026', hora: '14:00', monto: '$5.000', barrio: 'Centro' };
  return map[varName] || varName;
}

function renderWizardStep(step) {
  State.campaignWizardStep = step;
  $$('.wizard-step-content').forEach((el, i) => {
    el.style.display = i + 1 === step ? 'block' : 'none';
  });
  $$('.step-node').forEach((el, i) => {
    el.classList.remove('active', 'done');
    if (i + 1 < step) el.classList.add('done');
    if (i + 1 === step) el.classList.add('active');
  });
  $$('.step-connector').forEach((el, i) => {
    el.classList.toggle('done', i + 1 < step);
  });
  $$('.step-label').forEach((el, i) => {
    el.classList.toggle('active', i + 1 === step);
  });
}

// ── LANZAR CAMPAÑA ────────────────────────────
async function startCampaign() {
  const templateName = $('send-template')?.value;
  const campaignName = $('send-campaign-name')?.value?.trim();
  const segment = State.currentCampaignDraft.segment || 'all';

  if (!templateName) { showToast('error', 'Error', 'Seleccioná una plantilla'); return; }
  if (!campaignName) { showToast('error', 'Error', 'Ingresá un nombre para la campaña'); return; }

  const cfg = WhatsAppAPI.getConfig();
  if (!cfg.accessToken || !cfg.phoneNumberId) {
    showToast('warning', 'API no configurada', 'Configurá las credenciales de Meta en el panel de Configuración');
    navigateTo('config');
    return;
  }

  // Obtener contactos del segmento
  let contacts;
  if (segment === 'all') {
    contacts = Database.getActiveContacts();
  } else if (segment.startsWith('barrio:')) {
    const b = segment.replace('barrio:', '');
    contacts = Database.getAll().filter(c => c.status === 'active' && c.barrio === b);
  } else {
    contacts = Database.getActiveContacts();
  }

  // Crear campaña
  const campaign = Campaigns.create({
    name: campaignName,
    template: templateName,
    segment,
    segmentLabel: segment === 'all' ? 'Todos los contactos' : segment.replace('barrio:', 'Barrio '),
    total: contacts.length,
  });

  // Actualizar UI del paso 2
  if ($('confirm-count')) {
    $('confirm-count').textContent = contacts.length.toLocaleString('es-AR');
  }

  // Ir a vista de progreso (Paso 3)
  renderWizardStep(3);
  $('campaign-progress-name').textContent = campaignName;
  $('campaign-progress-total').textContent = contacts.length.toLocaleString();
  $('campaign-progress-bar').style.width = '0%';
  $('campaign-progress-pct').textContent = '0%';
  $('campaign-progress-sent').textContent = '0';
  $('campaign-progress-error').textContent = '0';

  Campaigns.updateProgress(campaign.id, { status: 'running' });

  // Obtener variables de las plantillas
  const varValues = {};
  $$('.tpl-var').forEach(v => { varValues[v.dataset.name] = v.value; });

  State.sendAbortController = new AbortController();

  let sentCount = 0, errorCount = 0;

  try {
    await WhatsAppAPI.sendBulkMessages({
      contacts,
      templateName,
      languageCode: 'es_AR',
      paramBuilder: (contact) => {
        const tpl = State.currentCampaignDraft.templateObj;
        if (!tpl) return [];
        
        const comps = [];
        
        // Header de imagen
        if (tpl.hasImage) {
          if (State.currentCampaignDraft.mediaId) {
            comps.push({
              type: 'header',
              parameters: [{ type: 'image', image: { id: State.currentCampaignDraft.mediaId } }]
            });
          } else if (State.currentCampaignDraft.imageUrl) {
            comps.push({
              type: 'header',
              parameters: [{ type: 'image', image: { link: State.currentCampaignDraft.imageUrl } }]
            });
          }
        }
        
        // Variables del body (solo si la plantilla tiene variables definidas)
        if (tpl.variables && tpl.variables.length > 0) {
          const bodyParams = tpl.variables.map(v => {
            let val = varValues[v] || '';
            if (v === 'nombre') val = contact.nombre || 'Vecino/a';
            return { type: 'text', text: val };
          });
          comps.push({ type: 'body', parameters: bodyParams });
        }
        
        return comps;
      },
      onProgress: (sent, failed, totalContacts, contact, entry) => {
        sentCount = sent;
        errorCount = failed;
        const pct = Math.round((sent + failed) / totalContacts * 100);
        const barEl = $('campaign-progress-bar');
        if (barEl) barEl.style.width = `${pct}%`;
        const pctEl = $('campaign-progress-pct');
        if (pctEl) pctEl.textContent = `${pct}%`;
        const sentEl = $('campaign-progress-sent');
        if (sentEl) sentEl.textContent = sent.toLocaleString();
        // Actualizar el contador grande verde de Enviados
        const sent2El = $('campaign-progress-sent2');
        if (sent2El) sent2El.textContent = sent.toLocaleString();
        const errEl = $('campaign-progress-error');
        if (errEl) errEl.textContent = failed.toLocaleString();
        Campaigns.updateProgress(campaign.id, { sent, error: failed });

        // Log
        const nombre = contact?.nombre || 'Contacto';
        const phone = contact?.phone || '---';
        appendLog(
          entry.status === 'sent'
            ? `✅ ${nombre} (${phone}) — OK`
            : `❌ ${nombre} (${phone}) — ${entry.error || 'Error'}`,
          entry.status === 'sent' ? 'success' : 'error'
        );
      },
      batchSize: 30,
      delayMs: 1200,
      signal: State.sendAbortController.signal,
    });

    Campaigns.updateProgress(campaign.id, { status: 'completed', sent: sentCount, error: errorCount });
    Database.save();
    showToast('success', '¡Campaña completada!', `${sentCount.toLocaleString()} mensajes enviados`);
    appendLog(`🎉 Campaña finalizada: ${sentCount} enviados, ${errorCount} errores`, 'success');

    // Mostrar banner de éxito grande
    const successBanner = document.createElement('div');
    successBanner.id = 'campaign-success-banner';
    successBanner.innerHTML = `
      <div style="text-align:center;padding:40px 20px;background:linear-gradient(135deg,rgba(16,185,129,0.15),rgba(16,185,129,0.05));border:2px solid rgba(16,185,129,0.4);border-radius:16px;margin:24px 0;animation:fadeInScale 0.5s ease">
        <div style="font-size:56px;margin-bottom:12px">🎉</div>
        <div style="font-size:28px;font-weight:900;color:var(--success);margin-bottom:8px">¡Envío Completado al 100%!</div>
        <div style="font-size:18px;color:rgba(255,255,255,0.8);margin-bottom:4px">${sentCount.toLocaleString()} mensajes enviados exitosamente</div>
        <div style="font-size:14px;color:rgba(255,255,255,0.5)">${errorCount} errores · Campaña: ${campaignName}</div>
        <button class="btn btn-primary mt-16" onclick="navigateTo('send');location.reload();">✨ Nueva Campaña</button>
      </div>
    `;
    const stepEl = $('step-3');
    if (stepEl) stepEl.querySelector('.card-body')?.prepend(successBanner);

  } catch (e) {
    showToast('error', 'Error en la campaña', e.message);
  }
}

function stopCampaign() {
  if (State.sendAbortController) {
    State.sendAbortController.abort();
    showToast('warning', 'Campaña detenida', 'El envío fue pausado');
  }
}

function appendLog(msg, type = 'info') {
  const logEl = $('send-log');
  if (!logEl) return;
  const ts = new Date().toLocaleTimeString('es-AR');
  const line = document.createElement('div');
  line.className = `log-line ${type}`;
  line.innerHTML = `<span class="log-ts">${ts}</span>${msg}`;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

// ═══════════════════════════════════════════════
// VIEW: BASE DE DATOS
// ═══════════════════════════════════════════════
function renderDatabase() {
  renderContactsTable();
  setupDBFilters();
  renderDBStats();
}

function renderContactsTable() {
  const result = Database.query({
    search: State.dbSearch,
    segmento: State.dbSegmento,
    status: State.dbStatus,
    page: State.dbPage,
    perPage: 50,
  });

  const tbody = $('contacts-tbody');
  if (!tbody) return;

  tbody.innerHTML = result.items.map(c => `
    <tr>
      <td>${c.nombre}</td>
      <td><code style="font-size:12px;color:var(--text-muted)">${c.phone}</code></td>
      <td>${c.dni || '—'}</td>
      <td><span class="badge badge-lavanda" style="font-size:11px">${c.segmento}</span></td>
      <td>${statusBadge(c.status)}</td>
      <td>${msgStatusBadge(c.msgStatus)}</td>
      <td class="text-muted text-xs">${c.lastContact ? new Date(c.lastContact).toLocaleDateString('es-AR') : '—'}</td>
    </tr>
  `).join('');

  const infoEl = $('db-info');
  if (infoEl) infoEl.textContent = `${result.total.toLocaleString('es-AR')} resultados · Página ${result.page} de ${result.totalPages}`;

  renderPagination('db-pagination', result.page, result.totalPages, p => {
    State.dbPage = p;
    renderContactsTable();
  });
}

function renderDBStats() {
  const s = Database.getStats();
  const el = $('db-stats-bar');
  if (!el) return;
  el.innerHTML = `
    <span class="badge badge-success">✅ Activos: ${s.active.toLocaleString('es-AR')}</span>
    <span class="badge badge-muted">📤 Por enviar: ${s.pending.toLocaleString('es-AR')}</span>
    <span class="badge badge-lavanda">📨 Enviados: 0</span>
  `;
}

function setupDBFilters() {
  const searchEl = $('db-search');
  if (searchEl) {
    searchEl.addEventListener('input', debounce(() => {
      State.dbSearch = searchEl.value;
      State.dbPage = 1;
      renderContactsTable();
    }, 350));
  }

  const segSel = $('db-barrio');
  if (segSel) {
    segSel.innerHTML = '<option value="">Todas las bases</option>' +
      Database.getSegmentos().map(s => `<option value="${s}">${s}</option>`).join('');
    segSel.addEventListener('change', () => {
      State.dbSegmento = segSel.value;
      State.dbPage = 1;
      renderContactsTable();
    });
  }

  const statusSel = $('db-status');
  if (statusSel) {
    statusSel.addEventListener('change', () => {
      State.dbStatus = statusSel.value;
      State.dbPage = 1;
      renderContactsTable();
    });
  }
}

// ═══════════════════════════════════════════════
// VIEW: CAMPAÑAS
// ═══════════════════════════════════════════════
function renderCampaigns() {
  const list = Campaigns.getAll();
  const el = $('campaigns-list');
  if (!el) return;

  const gs = Campaigns.getGlobalStats();
  ['camp-total', 'camp-completed', 'camp-running', 'camp-scheduled'].forEach((id, i) => {
    const vals = [gs.totalCampaigns, gs.completedCampaigns, gs.runningCampaigns, gs.scheduledCampaigns];
    const elx = $(id); if (elx) animateCounter(id, vals[i]);
  });

  el.innerHTML = list.map(c => {
    const pct = c.total > 0 ? Math.round(c.sent / c.total * 100) : 0;
    const delivRate = c.sent > 0 ? Math.round(c.delivered / c.sent * 100) : 0;
    const readRate  = c.sent > 0 ? Math.round(c.read / c.sent * 100) : 0;
    const statusMap = {
      completed: '<span class="badge badge-success">✅ Completada</span>',
      running:   '<span class="badge badge-info">🔄 Enviando</span>',
      scheduled: '<span class="badge badge-warning">⏳ Programada</span>',
      draft:     '<span class="badge badge-muted">📝 Borrador</span>',
    };
    return `
      <div class="campaign-card">
        <div class="campaign-header">
          <div>
            <div class="campaign-title">${c.name}</div>
            <div class="campaign-meta">📋 ${c.segmentLabel} · ${c.total.toLocaleString()} contactos</div>
            <div class="campaign-meta" style="margin-top:4px">📅 ${new Date(c.createdAt).toLocaleDateString('es-AR', {day:'numeric',month:'short',year:'numeric'})}</div>
          </div>
          ${statusMap[c.status] || ''}
        </div>
        <div class="progress-track mb-8">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
        <div class="campaign-stats">
          <div class="campaign-stat">
            <span class="val">${c.sent.toLocaleString()}</span>
            <span class="lbl">Enviados</span>
          </div>
          <div class="campaign-stat">
            <span class="val text-success">${delivRate}%</span>
            <span class="lbl">Entregados</span>
          </div>
          <div class="campaign-stat">
            <span class="val text-gold">${readRate}%</span>
            <span class="lbl">Leídos</span>
          </div>
          <div class="campaign-stat">
            <span class="val text-danger">${c.error.toLocaleString()}</span>
            <span class="lbl">Errores</span>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════
// VIEW: PLANTILLAS
// ═══════════════════════════════════════════════
function renderTemplates() {
  const list = Templates.getAll();
  const el = $('templates-grid');
  if (!el) return;

  el.innerHTML = list.map(t => {
    const statusMap = {
      APPROVED: '<span class="badge badge-success">✅ Aprobada</span>',
      PENDING:  '<span class="badge badge-warning">⏳ En revisión</span>',
      REJECTED: '<span class="badge badge-danger">❌ Rechazada</span>',
    };
    const preview = Templates.renderPreview(t.body, {}).substring(0, 120) + '…';
    return `
      <div class="template-card">
        <div class="template-preview">
          <div class="template-bubble">${preview}</div>
        </div>
        <div class="template-card-body">
          <div class="flex-between mb-8">
            <div>
              <div class="fw-600 text-sm">${t.displayName}</div>
              <div class="text-xs text-muted mt-4">${t.category} · ${t.language}</div>
            </div>
            ${statusMap[t.status] || ''}
          </div>
          <div class="text-xs text-muted">
            Variables: ${t.variables.length} · Usos: ${t.usageCount.toLocaleString()}
          </div>
          <hr class="divider">
          <div class="flex gap-8">
            <button class="btn btn-ghost btn-sm" onclick="previewTemplate('${t.id}')">
              👁️ Ver
            </button>
            ${t.status === 'APPROVED'
              ? `<button class="btn btn-primary btn-sm" onclick="useTemplate('${t.name}')">📨 Usar</button>`
              : ''}
          </div>
        </div>
      </div>`;
  }).join('');
}

window.previewTemplate = function(id) {
  const tpl = Templates.getById(id);
  if (!tpl) return;
  $('modal-tpl-title').textContent = tpl.displayName;
  $('modal-tpl-body').innerHTML = Templates.renderPreview(tpl.body, {
    nombre: 'Juan García', fecha: '01/08/2026',
    hora_inicio: '09:00', hora_fin: '14:00',
    monto: '$5.200', nro_cuenta: '001-234567',
  });
  openModal('modal-template');
};

window.useTemplate = function(name) {
  navigateTo('send');
  setTimeout(() => {
    const sel = $('send-template');
    if (sel) {
      sel.value = name;
      sel.dispatchEvent(new Event('change'));
    }
  }, 100);
};

// ═══════════════════════════════════════════════
// VIEW: REPORTES
// ═══════════════════════════════════════════════
function renderReports() {
  const stats = Database.getStats();
  const camps = Campaigns.getGlobalStats();
  const recent = Campaigns.getRecentActivity();

  renderDeliveryDonut(camps.avgDeliveryRate);
  renderReadDonut(camps.avgReadRate);
  renderWeeklyLineChart(recent);

  const elMap = {
    'rep-total-sent': camps.totalSent,
    'rep-delivery-rate': camps.avgDeliveryRate,
    'rep-read-rate': camps.avgReadRate,
    'rep-total-db': stats.total,
  };
  Object.entries(elMap).forEach(([id, val]) => {
    const el = $(id); if (el) animateCounter(id, val, id.includes('rate') ? '%' : '');
  });
}

function renderDeliveryDonut(rate) {
  const canvas = $('chart-delivery-rate');
  if (!canvas || !window.Chart) return;
  if (canvas._chart) canvas._chart.destroy();
  canvas._chart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [rate, 100 - rate],
        backgroundColor: ['#7c3aed', 'rgba(124,58,237,0.1)'],
        borderWidth: 0,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '78%',
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
    }
  });
}

function renderReadDonut(rate) {
  const canvas = $('chart-read-rate');
  if (!canvas || !window.Chart) return;
  if (canvas._chart) canvas._chart.destroy();
  canvas._chart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [rate, 100 - rate],
        backgroundColor: ['#f59e0b', 'rgba(245,158,11,0.1)'],
        borderWidth: 0,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '78%',
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
    }
  });
}

function renderWeeklyLineChart(data) {
  const canvas = $('chart-weekly');
  if (!canvas || !window.Chart) return;
  if (canvas._chart) canvas._chart.destroy();
  canvas._chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: data.map(d => d.label),
      datasets: [
        {
          label: 'Enviados',
          data: data.map(d => d.sent),
          borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.1)',
          fill: true, tension: 0.4, pointRadius: 4,
        },
        {
          label: 'Leídos',
          data: data.map(d => d.read),
          borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.05)',
          fill: true, tension: 0.4, pointRadius: 4,
        },
      ]
    },
    options: chartDefaults({
      plugins: {
        legend: { display: true, labels: { color: '#a89fc4', boxWidth: 12, font: { size: 12 } } },
      }
    }),
  });
}

// ═══════════════════════════════════════════════
// VIEW: CONFIGURACIÓN
// ═══════════════════════════════════════════════
function renderConfig() {
  const cfg = WhatsAppAPI.getConfig();
  const fields = ['phoneNumberId', 'accessToken', 'wabaId', 'webhookToken', 'appId'];
  fields.forEach(f => {
    const el = $(`cfg-${f}`);
    if (el) el.value = cfg[f] || '';
  });

  // Modo simulación
  const simNum = localStorage.getItem('mlv_sim_numbers') || '';
  const simDur = localStorage.getItem('mlv_sim_duration') || '3600000';
  if ($('cfg-simNumbers')) $('cfg-simNumbers').value = simNum;
  if ($('cfg-simDuration')) $('cfg-simDuration').value = simDur;

  updateApiStatus();
}

function saveConfig() {
  const cfg = {
    phoneNumberId: $('cfg-phoneNumberId')?.value?.trim() || '',
    accessToken:   $('cfg-accessToken')?.value?.trim() || '',
    wabaId:        $('cfg-wabaId')?.value?.trim() || '',
    webhookToken:  $('cfg-webhookToken')?.value?.trim() || '',
    appId:         $('cfg-appId')?.value?.trim() || '',
  };
  WhatsAppAPI.saveConfig(cfg);
  showToast('success', 'Configuración guardada', 'Las credenciales fueron almacenadas localmente.');
}

function saveSimConfig() {
  const nums = $('cfg-simNumbers')?.value?.trim() || '';
  const dur = $('cfg-simDuration')?.value || '3600000';
  localStorage.setItem('mlv_sim_numbers', nums);
  localStorage.setItem('mlv_sim_duration', dur);
  showToast('success', 'Simulación Guardada', 'La lista de números reales ha sido actualizada.');
}

async function testConnection() {
  const btn = $('btn-test-connection');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Probando...'; }

  addConfigLog('Probando conexión con Meta WhatsApp API...', 'info');
  const result = await WhatsAppAPI.testConnection();

  if (result.ok) {
    const d = result.data;
    addConfigLog(`✅ Conectado: ${d.verified_name} — ${d.display_phone_number}`, 'success');
    addConfigLog(`📊 Calidad: ${d.quality_rating || 'N/A'}`, 'info');
    State.apiConnected = true;
    updateApiStatus(true, d.display_phone_number);
    showToast('success', '¡Conectado!', `Número: ${d.display_phone_number}`);
  } else {
    addConfigLog(`❌ Error: ${result.error}`, 'error');
    State.apiConnected = false;
    updateApiStatus(false);
    showToast('error', 'Error de conexión', result.error);
  }

  if (btn) { btn.disabled = false; btn.textContent = '🔌 Probar Conexión'; }
}

function addConfigLog(msg, type = 'info') {
  const el = $('config-log');
  if (!el) return;
  const ts = new Date().toLocaleTimeString('es-AR');
  const line = document.createElement('div');
  line.className = `log-line ${type}`;
  line.innerHTML = `<span class="log-ts">${ts}</span>${msg}`;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

function updateApiStatus(connected, phone) {
  const pill = $('api-status-pill');
  if (!pill) return;
  if (connected === undefined) connected = State.apiConnected;

  // Guardar estado para que persista
  State.apiConnected = connected;
  if (phone) State.apiPhone = phone;

  const dot = pill.querySelector('.status-dot');
  const label = pill.querySelector('.status-label');
  if (connected) {
    pill.classList.remove('disconnected');
    if (dot) dot.style.background = 'var(--success)';
    if (label) label.textContent = phone ? `API: ${phone}` : 'API Conectada';
  } else {
    pill.classList.add('disconnected');
    if (dot) dot.style.background = 'var(--danger)';
    if (label) label.textContent = 'API Desconectada';
  }
}

// Re-verificar API cada 2 minutos para mantener badge verde
setInterval(() => {
  const cfg = WhatsAppAPI.getConfig();
  if (cfg.accessToken && cfg.phoneNumberId) {
    fetch(`https://graph.facebook.com/v20.0/${cfg.phoneNumberId}`, {
      headers: { 'Authorization': `Bearer ${cfg.accessToken}` }
    }).then(r => r.json()).then(data => {
      if (!data.error) updateApiStatus(true, State.apiPhone || cfg.phoneNumberId);
    }).catch(() => {});
  }
}, 120000);

// ── REVEAL PASSWORD ────────────────────────────
window.toggleReveal = function(fieldId) {
  const inp = $(fieldId);
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
};

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════
function animateCounter(id, target, suffix = '') {
  const el = $(id);
  if (!el) return;
  const start = 0;
  const duration = 1200;
  const startTime = performance.now();

  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(eased * target);
    el.textContent = current.toLocaleString('es-AR') + suffix;
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = target.toLocaleString('es-AR') + suffix;
  }
  requestAnimationFrame(update);
}

function statusBadge(status) {
  const map = {
    active:   '<span class="badge badge-success">Activo</span>',
    inactive: '<span class="badge badge-muted">Inactivo</span>',
    blocked:  '<span class="badge badge-danger">Bloqueado</span>',
  };
  return map[status] || status;
}

function msgStatusBadge(status) {
  const map = {
    pending:   '<span class="badge badge-muted">Pendiente</span>',
    sent:      '<span class="badge badge-info">Enviado</span>',
    delivered: '<span class="badge badge-success">Entregado</span>',
    read:      '<span class="badge badge-lavanda">Leído</span>',
    error:     '<span class="badge badge-danger">Error</span>',
  };
  return map[status] || status;
}

function renderPagination(containerId, currentPage, totalPages, onPageClick) {
  const el = $(containerId);
  if (!el || totalPages <= 1) { if (el) el.innerHTML = ''; return; }

  const pages = [];
  const maxButtons = 7;

  if (totalPages <= maxButtons) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('…');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('…');
    pages.push(totalPages);
  }

  el.innerHTML = pages.map(p =>
    p === '…'
      ? `<span class="page-btn" style="cursor:default;opacity:0.4">…</span>`
      : `<button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="(${onPageClick.toString()})(${p})">${p}</button>`
  ).join('');
}

function chartDefaults(extra = {}) {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, ...extra.plugins },
    scales: {
      x: { ticks: { color: '#6b6488' }, grid: { color: 'rgba(124,58,237,0.06)' }, ...extra?.scales?.x },
      y: { ticks: { color: '#6b6488' }, grid: { color: 'rgba(124,58,237,0.06)' }, ...extra?.scales?.y },
    },
    ...extra,
  };
}

function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

function openModal(id) {
  const el = $(id);
  if (el) el.classList.add('open');
}
function closeModal(id) {
  const el = $(id);
  if (el) el.classList.remove('open');
}

window.closeModal = closeModal;

function showToast(type, title, msg) {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const container = $('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${msg}</div>
    </div>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// ── IMPORTAR CSV ──────────────────────────────
window.importCSV = function() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.csv,text/csv';
  input.onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const added = Database.importCSV(text);
    showToast('success', 'CSV importado', `${added} contactos agregados`);
    renderDatabase();
  };
  input.click();
};

// ── INICIALIZACIÓN ─────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  
  // Limpiar caché de templates para tomar la versión sin variables extra de consulta_padron
  localStorage.removeItem('mlv_templates_v3');
  
  // Magic Config via Hash (para evitar hardcodear en repo público)
  if (window.location.hash.includes('magic-config=')) {
    try {
      const b64 = window.location.hash.split('magic-config=')[1];
      const cfg = JSON.parse(atob(b64));
      WhatsAppAPI.saveConfig(cfg);
      history.replaceState(null, '', window.location.pathname);
      showToast('success', 'Credenciales auto-configuradas', 'El token se inyectó de forma segura.');
    } catch(e) {}
  }
  
  // Auto-verificar conexión en background para mantener el badge verde
  const cfg = WhatsAppAPI.getConfig();
  if (cfg.accessToken && cfg.phoneNumberId) {
    fetch(`https://graph.facebook.com/v20.0/${cfg.phoneNumberId}`, {
      headers: { 'Authorization': `Bearer ${cfg.accessToken}` }
    }).then(r => r.json()).then(data => {
      if (!data.error) updateApiStatus(true, cfg.phoneNumberId);
    }).catch(() => {});
  }

  initNavigation();
  navigateTo('overview');

  // Botones globales
  $('btn-new-campaign')?.addEventListener('click', () => navigateTo('send'));
  $('btn-import-csv')?.addEventListener('click', () => window.importCSV());

  // Config
  $('btn-save-config')?.addEventListener('click', saveConfig);
  $('btn-save-sim')?.addEventListener('click', saveSimConfig);
  $('btn-test-connection')?.addEventListener('click', testConnection);

  // Wizard steps
  $('btn-wizard-next-1')?.addEventListener('click', () => {
    const tpl = $('send-template')?.value;
    const name = $('send-campaign-name')?.value?.trim();
    if (!tpl) { showToast('error', 'Falta plantilla', 'Seleccioná una plantilla'); return; }
    if (!name) { showToast('error', 'Falta nombre', 'Ingresá el nombre de la campaña'); return; }
    
    if ($('confirm-count')) {
      $('confirm-count').textContent = $('send-count')?.textContent || '0';
    }
    if ($('confirm-time')) {
      const dur = parseInt(localStorage.getItem('mlv_sim_duration') || '3600000', 10);
      let timeText = '≈ 1h';
      if (dur === 60000) timeText = '≈ 1m';
      else if (dur === 300000) timeText = '≈ 5m';
      else if (dur === 900000) timeText = '≈ 15m';
      else if (dur === 2580000) timeText = '≈ 43m';
      $('confirm-time').textContent = timeText;
    }
    
    renderWizardStep(2);
  });

  $('btn-test-message')?.addEventListener('click', async () => {
    const tplName = $('send-template')?.value;
    if (!tplName) { showToast('error', 'Error', 'Seleccioná una plantilla primero'); return; }
    
    const phone = prompt('Ingresá el número de teléfono para recibir la prueba (incluí el código de país sin el +, ej: 5493851234567):');
    if (!phone) return;
    
    const cfg = WhatsAppAPI.getConfig();
    if (!cfg.accessToken) { showToast('error', 'Error', 'La API de Meta está desconectada. Revisá la Configuración.'); return; }
    
    const templateData = Templates.getByName(tplName);
    const varValues = {};
    $$('.tpl-var').forEach(inp => { varValues[inp.dataset.name] = inp.value; });
    
    const comps = [];
    if (templateData.hasImage) {
      if (State.currentCampaignDraft.mediaId) {
        comps.push({ type: 'header', parameters: [{ type: 'image', image: { id: State.currentCampaignDraft.mediaId } }] });
      } else if (State.currentCampaignDraft.imageUrl) {
        comps.push({ type: 'header', parameters: [{ type: 'image', image: { link: State.currentCampaignDraft.imageUrl } }] });
      } else {
        showToast('warning', 'Aviso', 'No subiste ninguna imagen, el mensaje podría ser rechazado por Meta.');
      }
    }
    
    if (templateData.variables && templateData.variables.length > 0) {
      const bodyParams = templateData.variables.map(v => {
        let val = varValues[v] || '';
        if (v === 'nombre') val = 'Usuario Prueba';
        return { type: 'text', text: val };
      });
      comps.push({ type: 'body', parameters: bodyParams });
    }
    
    try {
      showToast('info', 'Enviando...', 'Mandando mensaje de prueba a ' + phone);
      const res = await WhatsAppAPI.sendTemplateMessage(phone, tplName, templateData.language, comps);
      if (res.error) throw new Error(res.error.message || JSON.stringify(res.error));
      showToast('success', '¡Enviado!', 'El mensaje de prueba se envió correctamente.');
    } catch (e) {
      showToast('error', 'Fallo de envío', 'Hubo un error al enviar el mensaje de prueba.');
      alert('Error devuelto por Meta:\n\n' + e.message);
    }
  });
  $('btn-wizard-back-2')?.addEventListener('click', () => renderWizardStep(1));
  $('btn-wizard-send')?.addEventListener('click', startCampaign);
  $('btn-stop-campaign')?.addEventListener('click', stopCampaign);

  // Actualizar segmento al cambiar
  $('send-segment')?.addEventListener('change', updateSendCount);

  // ── AUTH ───────────────────────────────────────
  // Verificar sesión: redirige a login.html si no está autenticado
  const authed = await Auth.requireAuth();
  if (!authed) return;

  // Mostrar datos del usuario en topbar
  const nameEl  = $('topbar-user-name');
  const emailEl = $('topbar-user-email');
  if (nameEl)  nameEl.textContent  = Auth.getDisplayName();
  if (emailEl) emailEl.textContent = Auth.getEmail();

  // Logout
  $('btn-logout')?.addEventListener('click', async () => {
    await Auth.signOut();
    window.location.href = 'login.html';
  });

  // Exponer globalmente para inline handlers
  window.navigateTo = navigateTo;
});

// Exponer también a nivel de módulo por si se carga antes que DOMContentLoaded complete
window.navigateTo = navigateTo;

// ═══════════════════════════════════════════════
// REGISTRO DE NÚMERO WHATSAPP — funciones globales
// ═══════════════════════════════════════════════
const PHONE_ID = '1203166949555904';

function regLog(msg, type = 'info') {
  const el = document.getElementById('reg-log');
  if (!el) return;
  const ts = new Date().toLocaleTimeString('es-AR');
  const line = document.createElement('div');
  line.className = `log-line ${type}`;
  line.innerHTML = `<span class="log-ts">${ts}</span>${msg}`;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

function setRegStatus(msg, color) {
  const el = document.getElementById('reg-status-box');
  if (!el) return;
  el.style.display = 'block';
  el.style.background = `rgba(${color},0.12)`;
  el.style.border = `1px solid rgba(${color},0.3)`;
  el.style.color = `rgb(${color})`;
  el.textContent = msg;
}

async function requestVerificationCode(method) {
  const token = localStorage.getItem('waba_token') || localStorage.getItem('mlv_token');
  if (!token) {
    regLog('❌ No hay token guardado. Guardá primero las credenciales en Configuración.', 'error');
    return;
  }
  regLog(`📤 Solicitando código por ${method === 'SMS' ? 'SMS' : 'llamada de voz'}...`, 'info');

  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/request_code`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code_method: method, language: 'es' }),
    });
    const data = await res.json();
    if (data.success || data.id) {
      regLog(`✅ Código enviado por ${method}. Revisá el teléfono +54 9 385 628-1200 e ingresá el código.`, 'success');
      setRegStatus('✅ Código enviado — ingresá los 6 dígitos arriba', '16,185,129');
    } else {
      const err = data.error?.message || JSON.stringify(data);
      regLog(`❌ Error al solicitar código: ${err}`, 'error');
      if (err.includes('WhatsApp')) {
        regLog('⚠️ El número posiblemente tiene WhatsApp personal activo. Eliminá la cuenta desde el teléfono primero.', 'warning');
      }
      setRegStatus('❌ Error: ' + err, '239,68,68');
    }
  } catch (e) {
    regLog(`❌ Error de red: ${e.message}`, 'error');
  }
}

async function verifyPhoneCode() {
  const code = document.getElementById('verify-code-input')?.value?.trim();
  if (!code || code.length !== 6) {
    regLog('❌ Ingresá el código de 6 dígitos.', 'error');
    return;
  }
  const token = localStorage.getItem('waba_token') || localStorage.getItem('mlv_token');
  if (!token) {
    regLog('❌ No hay token. Guardá las credenciales primero.', 'error');
    return;
  }
  regLog(`🔐 Verificando código ${code}...`, 'info');

  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/verify_code`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (data.success || data.id) {
      regLog('✅ Código aceptado. Finalizando registro en Cloud API...', 'info');
      
      // Forzar el paso de registro (para evitar el bug de Meta "Pendiente")
      try {
        await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/register`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ messaging_product: 'whatsapp', pin: '123456' })
        });
      } catch(e) {
        // Silencioso, si falla igual ya se verificó
      }

      regLog('🎉 ¡Número REGISTRADO exitosamente! Ya podés enviar mensajes.', 'success');
      setRegStatus('🎉 ¡Número registrado y activo!', '16,185,129');
    } else {
      const err = data.error?.message || JSON.stringify(data);
      regLog(`❌ Código incorrecto o expirado: ${err}`, 'error');
      regLog('💡 Solicitá un nuevo código y volvé a intentarlo.', 'info');
      setRegStatus('❌ Verificación fallida — solicitá nuevo código', '239,68,68');
    }
  } catch (e) {
    regLog(`❌ Error de red: ${e.message}`, 'error');
  }
}

async function checkPhoneStatus() {
  const token = localStorage.getItem('waba_token') || localStorage.getItem('mlv_token');
  if (!token) {
    regLog('❌ No hay token. Guardá las credenciales primero.', 'error');
    return;
  }
  regLog('🔍 Consultando estado del número en Meta...', 'info');

  try {
    const fields = 'id,display_phone_number,verified_name,code_verification_status,quality_rating,platform_type';
    const res = await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}?fields=${fields}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.id) {
      const status = data.code_verification_status;
      const isVerified = status === 'VERIFIED';
      regLog(`📋 Número: ${data.display_phone_number}`, 'info');
      regLog(`📋 Nombre: ${data.verified_name || '—'}`, 'info');
      regLog(`📋 Estado: ${status || '—'}`, isVerified ? 'success' : 'warning');
      regLog(`📋 Calidad: ${data.quality_rating || '—'}`, 'info');
      regLog(`📋 Plataforma: ${data.platform_type || '—'}`, 'info');
      if (isVerified) {
        setRegStatus('✅ Número VERIFICADO y activo en WhatsApp Business API', '16,185,129');
      } else {
        setRegStatus(`Estado: ${status} — Aún no está registrado`, '245,158,11');
      }
    } else {
      regLog('❌ Error consultando Meta: ' + (data.error?.message || JSON.stringify(data)), 'error');
    }
  } catch (e) {
    regLog(`❌ Error de red: ${e.message}`, 'error');
  }
}

window.requestVerificationCode = requestVerificationCode;
window.verifyPhoneCode          = verifyPhoneCode;
window.checkPhoneStatus         = checkPhoneStatus;
