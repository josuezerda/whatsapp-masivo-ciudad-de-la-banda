/**
 * api/webhook.js
 * Vercel Serverless Function — Webhook WhatsApp Business API
 * Municipalidad de Ciudad de La Banda
 *
 * URL Producción: https://whatsapp-masivo-ciudad-de-la-banda.vercel.app/api/webhook
 * Token de verificación: banda_webhook_2025
 */

const VERIFY_TOKEN = 'banda_webhook_2025';

export default function handler(req, res) {

  // ── CORS preflight ────────────────────────────
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    return res.status(200).end();
  }

  // ── GET — Verificación del webhook por Meta ───
  if (req.method === 'GET') {
    const mode      = req.query['hub.mode'];
    const token     = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log(`[Webhook] Verificación recibida — mode: ${mode}, token: ${token}`);

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[Webhook] ✅ Verificado exitosamente');
      return res.status(200).send(challenge);
    }

    console.warn('[Webhook] ❌ Token inválido');
    return res.status(403).json({ error: 'Token de verificación inválido' });
  }

  // ── POST — Eventos entrantes de Meta ─────────
  if (req.method === 'POST') {
    const body = req.body;

    if (!body || body.object !== 'whatsapp_business_account') {
      return res.status(404).json({ error: 'Objeto no reconocido' });
    }

    try {
      body.entry?.forEach(entry => {
        const wabaId = entry.id;

        entry.changes?.forEach(change => {
          const value = change.value;

          // ── Mensajes recibidos ────────────────
          value.messages?.forEach(msg => {
            const from = msg.from;
            const type = msg.type;
            const text = msg.text?.body || '';
            const ts   = new Date(parseInt(msg.timestamp) * 1000).toISOString();

            console.log(JSON.stringify({
              event: 'message_received',
              waba:  wabaId,
              from, type, text, ts
            }));
          });

          // ── Actualizaciones de estado ─────────
          value.statuses?.forEach(status => {
            const msgId     = status.id;
            const recipient = status.recipient_id;
            const stat      = status.status; // sent | delivered | read | failed
            const ts        = new Date(parseInt(status.timestamp) * 1000).toISOString();
            const errors    = status.errors || [];

            console.log(JSON.stringify({
              event:  'status_update',
              waba:   wabaId,
              msgId, recipient, status: stat, ts,
              errors: errors.map(e => `${e.code}: ${e.title}`),
            }));
          });

        });
      });

      return res.status(200).json({ status: 'ok' });

    } catch (err) {
      console.error('[Webhook] Error procesando evento:', err);
      return res.status(500).json({ error: 'Error interno' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
