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
    if (!messages || !messages[0]) return;
    const msg = messages[0];
    await handleMessage(sock, msg);
  });

  // en index.js o el archivo que crea el socket

    sock.ev.on('group-participants.update', async (update) => {
    try {
        const { id: groupId, participants, action } = update;
        // action puede ser 'add', 'remove', 'promote', 'demote'
        if (action === 'add') {
        for (const participant of participants) {
            // participant es el JID del usuario nuevo
            const welcomeText = `👋 Bienvenido al grupo, @${participant.split('@')[0]}!`;
            await sock.sendMessage(groupId, {
            text: welcomeText,
            mentions: [participant]
            });
        }
        }
    } catch (err) {
        console.error('Error en bienvenida de nuevo miembro:', err);
    }
    });


  sock.ev.on('connection.update', (update) => {
    const { connection } = update;
    if (connection === 'close') {
      console.log('[!] Conexión cerrada');
      // Aquí no reiniciamos todo, mejor manejar reconexión del socket interno (Baileys lo hace)
    } else if (connection === 'open') {
      console.log('✅ Bot conectado a WhatsApp');
    }
  });

  const app = express();
  app.get('/', (_, res) => res.send('🤖 Bot activo en Render'));

  // Parsear el puerto a número
  let port = parseInt(process.env.PORT) || 3000;

  function listenServer(p) {
    const server = app.listen(p, () => {
      console.log(`🌐 Servidor escuchando en puerto ${p}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`⚠️ Puerto ${p} ya está en uso, intentando puerto ${p + 1}`);
        listenServer(p + 1);  // probar con el siguiente puerto
      } else {
        throw err;
      }
    });
  }

  listenServer(port);
}

start().catch(err => {
  console.error('Error iniciando el bot:', err);
});
