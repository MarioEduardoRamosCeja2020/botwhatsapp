const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@adiwajshing/baileys');
const express = require('express');
const { handleMessage } = require('./lib/messageHandler');

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages }) => {
    if (!messages || !messages.length) return;
    const msg = messages[0];
    await handleMessage(sock, msg);
  });

  sock.ev.on('connection.update', (update) => {
    const { connection } = update;
    if (connection === 'close') {
      console.log('[!] Conexión cerrada, reiniciando...');
      start();  // ojo con recursión, puede causar múltiples servidores
    } else if (connection === 'open') {
      console.log('✅ Bot conectado a WhatsApp');
    }
  });

  // HTTP server para ping desde UptimeRobot
  const app = express();
  app.get('/', (_, res) => res.send('🤖 Bot activo en Render'));

  const port = process.env.PORT || 3000;
  const server = app.listen(port, () => {
    console.log(`🌐 Servidor corriendo en puerto ${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`⚠️ Puerto ${port} ya en uso, intentando otro puerto...`);
      // puedes intentar otro puerto alternativo
      const altPort = port + 1;
      app.listen(altPort, () => {
        console.log(`Servidor escuchando en puerto alternativo ${altPort}`);
      });
    } else {
      throw err;
    }
  });
}

start();
