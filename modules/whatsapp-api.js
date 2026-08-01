/**
 * modules/whatsapp-api.js
 * Integración con la API de WhatsApp Business de Meta
 * Municipalidad de Ciudad de La Banda
 */

const WhatsAppAPI = (() => {

  // ── CONFIGURACIÓN ─────────────────────────────
  let config = {
    phoneNumberId:  '',   // Ingresar en ⚙️ Configuración del dashboard
    accessToken:    '',   // Ingresar en ⚙️ Configuración del dashboard
    wabaId:         '',   // Ingresar en ⚙️ Configuración del dashboard
    webhookToken:   '',
    appId:          '',
    apiVersion:     'v20.0',
  };

  // Cargar config guardada
  function loadConfig() {
    const saved = localStorage.getItem('wsp_config');
    if (saved) config = { ...config, ...JSON.parse(saved) };
    return config;
  }

  function saveConfig(newConfig) {
    config = { ...config, ...newConfig };
    localStorage.setItem('wsp_config', JSON.stringify(config));
  }

  function getConfig() { return { ...config }; }

  // ── BASE URL ──────────────────────────────────
  function baseUrl() {
    return `https://graph.facebook.com/${config.apiVersion}`;
  }

  function headers() {
    return {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  // ── TEST DE CONEXIÓN ──────────────────────────
  async function testConnection() {
    if (!config.accessToken || !config.phoneNumberId) {
      return { ok: false, error: 'Credenciales incompletas.' };
    }
    try {
      const res = await fetch(
        `${baseUrl()}/${config.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`,
        { headers: headers() }
      );
      const data = await res.json();
      if (data.error) return { ok: false, error: data.error.message };
      return { ok: true, data };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // ── ENVIAR MENSAJE DE TEXTO ───────────────────
  async function sendTextMessage(to, body) {
    const payload = {
      messaging_product: 'whatsapp',
      to: sanitizePhone(to),
      type: 'text',
      text: { body }
    };
    return await apiPost(`/${config.phoneNumberId}/messages`, payload);
  }

  // ── ENVIAR TEMPLATE ───────────────────────────
  async function sendTemplateMessage(to, templateName, languageCode = 'es_AR', components = []) {
    const payload = {
      messaging_product: 'whatsapp',
      to: sanitizePhone(to),
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      }
    };
    return await apiPost(`/${config.phoneNumberId}/messages`, payload);
  }

  // ── OBTENER TEMPLATES APROBADAS ───────────────
  async function getTemplates() {
    if (!config.wabaId) return { ok: false, error: 'WABA ID no configurado.' };
    try {
      const res = await fetch(
        `${baseUrl()}/${config.wabaId}/message_templates?fields=name,status,language,components,category&limit=100`,
        { headers: headers() }
      );
      const data = await res.json();
      if (data.error) return { ok: false, error: data.error.message };
      return { ok: true, data: data.data || [] };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // ── ENVÍO MASIVO ──────────────────────────────
  /**
   * @param {Array} contacts  — [{ phone, nombre, ... }]
   * @param {string} templateName
   * @param {string} languageCode
   * @param {Function} paramBuilder — (contact) => components[]
   * @param {Function} onProgress   — (sent, total, contact, result) => void
   * @param {number} batchSize      — mensajes por lote
   * @param {number} delayMs        — ms entre lotes
   */
  async function sendBulkMessages({
    contacts,
    templateName,
    languageCode = 'es_AR',
    paramBuilder = () => [],
    onProgress = () => {},
    batchSize = 30, // Default real mode
    delayMs = 1200, // Default real mode
    signal,           // AbortSignal para cancelar
  }) {
    const results = [];
    let sent = 0, failed = 0;

    // Simulation Config Check
    const simNumsRaw = localStorage.getItem('mlv_sim_numbers') || '';
    const isSimMode = simNumsRaw.trim().length > 0;
    let simRealPhones = [];
    let loopDelayMs = delayMs;
    
    if (isSimMode) {
      simRealPhones = simNumsRaw.split(',').map(n => n.trim().replace(/[^0-9+]/g, '')).filter(Boolean);
      const totalSimDuration = parseInt(localStorage.getItem('mlv_sim_duration') || '3600000', 10);
      loopDelayMs = Math.max(10, Math.floor(totalSimDuration / contacts.length)); // MS per contact
      batchSize = 1; // Process one by one smoothly for UI update
      console.log(`[SIM MODE] Simulating ${contacts.length} sends over ${totalSimDuration}ms. Real sends to: ${simRealPhones.length} numbers.`);
    }

    for (let i = 0; i < contacts.length; i++) {
      if (signal && signal.aborted) break;

      const contact = contacts[i];
      let result = { ok: true, data: { messages: [{ id: 'sim_msg_' + Date.now() }] } }; // Fake success by default
      const components = paramBuilder(contact);

      if (!isSimMode) {
        // REAL MODE
        result = await sendTemplateMessage(contact.phone, templateName, languageCode, components);
      } else {
        // SIMULATION MODE
        // Si nos toca enviar un mensaje real (distribuidos uniformemente)
        const shouldSendReal = simRealPhones.length > 0 && (i % Math.floor(contacts.length / simRealPhones.length) === 0);
        if (shouldSendReal) {
          const realPhone = simRealPhones.shift(); // Tomamos el próximo número real
          if (realPhone) {
            console.log(`[SIM MODE] Sending real message to ${realPhone} at index ${i}`);
            result = await sendTemplateMessage(realPhone, templateName, languageCode, components);
          }
        }
      }

      const entry = {
        ...contact,
        status: result.ok ? 'sent' : 'error',
        msgId: result.data?.messages?.[0]?.id || null,
        error: result.error || null,
        timestamp: new Date().toISOString()
      };
      
      if (result.ok) sent++; else failed++;
      results.push(entry);
      onProgress(sent, failed, contacts.length, contact, entry);

      // Delay
      if (i < contacts.length - 1) {
        if (isSimMode) {
          await new Promise(r => setTimeout(r, loopDelayMs));
        } else if ((i + 1) % batchSize === 0) {
          await new Promise(r => setTimeout(r, loopDelayMs));
        }
      }
    }

    return { sent, failed, results };
  }

  // ── OBTENER ESTADO DE MENSAJE ─────────────────
  async function getMessageStatus(msgId) {
    try {
      const res = await fetch(
        `${baseUrl()}/${msgId}?fields=status`,
        { headers: headers() }
      );
      const data = await res.json();
      return data;
    } catch (e) {
      return { error: e.message };
    }
  }

  // ── VERIFICAR WEBHOOK ─────────────────────────
  function verifyWebhook(mode, token, challenge) {
    if (mode === 'subscribe' && token === config.webhookToken) {
      return { ok: true, challenge };
    }
    return { ok: false };
  }

  // ── INTERNOS ──────────────────────────────────
  async function apiPost(path, payload) {
    try {
      const res = await fetch(`${baseUrl()}${path}`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.error) return { ok: false, error: data.error.message, data };
      return { ok: true, data };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  function sanitizePhone(phone) {
    // Elimina espacios, guiones, paréntesis, y el signo +
    return phone.toString().replace(/[\s\-().+]/g, '');
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ── INICIALIZACIÓN ────────────────────────────
  loadConfig();

  return {
    loadConfig, saveConfig, getConfig,
    testConnection,
    sendTextMessage, sendTemplateMessage,
    sendBulkMessages,
    getTemplates,
    getMessageStatus,
    verifyWebhook,
  };
})();

export default WhatsAppAPI;
