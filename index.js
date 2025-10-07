const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@adiwajshing/baileys');
const express = require('express');
const fs = require('fs');
const path = require('path');
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
    if (!messages || !messages[0]) return;
    const msg = messages[0];
    await handleMessage(sock, msg);
  });

  sock.ev.on('connection.update', (update) => {
    const { connection } = update;
    if (connection === 'close') {
      console.log('[!] Conexión cerrada, reiniciando...');
      start();
    } else if (connection === 'open') {
      console.log('✅ Bot conectado a WhatsApp');
    }
  });

  // HTTP server para ping desde UptimeRobot
  const app = express();
  app.get('/', (_, res) => res.send('🤖 Bot activo en Render'));
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`🌐 Servidor corriendo en http://localhost:${port}`));
}

start();
