# 🔌 Servidor Webhook — WhatsApp Business API
## Municipalidad de Lavanda

Este archivo contiene el código Node.js listo para usar como servidor webhook de confirmaciones de Meta WhatsApp.

---

## ¿Para qué sirve el webhook?

Cuando enviás mensajes masivos, Meta te manda notificaciones en tiempo real sobre:
- ✅ **Entregado**: el mensaje llegó al celular del destinatario
- 👁️ **Leído**: el destinatario abrió el mensaje
- ❌ **Error**: número inválido, bloqueado, etc.
- 💬 **Respuesta**: si un vecino responde tu mensaje

---

## Paso 1 — Instalar Node.js

Si no tenés Node.js instalado: https://nodejs.org

---

## Paso 2 — Crear el servidor

Creá un archivo `webhook.js` con este contenido:

```javascript
const express = require('express');
const app = express();
app.use(express.json());

// Tu token de verificación (el mismo que pusiste en el panel de Meta)
const VERIFY_TOKEN = 'TU_WEBHOOK_VERIFY_TOKEN';

// ── VERIFICACIÓN DEL WEBHOOK ──────────────────────
app.get('/webhook', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verificado exitosamente');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// ── RECIBIR EVENTOS ───────────────────────────────
app.post('/webhook', (req, res) => {
  const body = req.body;

  if (body.object === 'whatsapp_business_account') {
    body.entry?.forEach(entry => {
      entry.changes?.forEach(change => {
        const value = change.value;

        // Mensajes recibidos
        value.messages?.forEach(msg => {
          const from = msg.from;
          const text = msg.text?.body;
          console.log(`📨 Mensaje recibido de ${from}: ${text}`);
        });

        // Actualizaciones de estado
        value.statuses?.forEach(status => {
          const id        = status.id;
          const recipient = status.recipient_id;
          const stat      = status.status; // sent | delivered | read | failed

          const icons = { sent: '📤', delivered: '📬', read: '👁️', failed: '❌' };
          console.log(`${icons[stat] || '?'} ${stat.toUpperCase()} → ${recipient} (msg: ${id})`);

          // Aquí podés actualizar tu base de datos
          // updateDatabase(id, stat);
        });
      });
    });
    return res.sendStatus(200);
  }
  res.sendStatus(404);
});

// ── INICIAR SERVIDOR ──────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor webhook escuchando en http://localhost:${PORT}/webhook`);
});
```

---

## Paso 3 — Instalar dependencias

```bash
npm init -y
npm install express
```

---

## Paso 4 — Iniciar el servidor

```bash
node webhook.js
```

---

## Paso 5 — Exponer a internet (para pruebas)

Usá **ngrok** para obtener una URL HTTPS pública:

```bash
# Instalar ngrok
npm install -g ngrok

# Exponer el puerto 3000
ngrok http 3000
```

Ngrok te dará una URL como: `https://abc123.ngrok.io`

---

## Paso 6 — Configurar en Meta

1. Ve a **Meta for Developers** → Tu App → WhatsApp → **Configuration**
2. En **Webhook**, hacé clic en **Edit**
3. Callback URL: `https://abc123.ngrok.io/webhook`
4. Verify Token: el mismo string que pusiste en el panel de configuración del dashboard
5. Suscribite a: `messages`, `message_deliveries`, `message_reads`
6. Hacé clic en **Verify and Save**

---

## Producción

Para producción, desplegá el servidor en:
- **Railway**: https://railway.app (gratis con límites)
- **Render**: https://render.com (gratis con límites)
- **VPS propio** con Nginx como reverse proxy

---

## Variables de entorno

Creá un archivo `.env`:

```
VERIFY_TOKEN=TU_WEBHOOK_VERIFY_TOKEN
PORT=3000
```

Y modificá el código para leer: `process.env.VERIFY_TOKEN`

---

> ⚠️ **Nunca subas el access token ni el verify token a un repositorio público.**
> Siempre usá variables de entorno o un gestor de secretos.
