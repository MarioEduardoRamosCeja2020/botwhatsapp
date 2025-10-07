async function handleMessage(sock, msg) {
  const from = msg.key.remoteJid;
  const isGroup = from.endsWith('@g.us');
  const sender = msg.key.participant || msg.key.remoteJid;

  const text =
    msg.message.conversation ||
    msg.message.extendedTextMessage?.text ||
    '';

  if (!text || !isGroup) return;

  const cmd = text.trim().toLowerCase();

  switch (cmd) {
    case '!hola':
      await sock.sendMessage(from, { text: `👋 ¡Hola! Soy tu bot en Render.` });
      break;

    case '!info':
      await sock.sendMessage(from, {
        text: `🤖 *Bot WhatsApp (Render)*\nComandos:\n!hola - saludo\n!info - ver comandos`
      });
      break;

    default:
      if (cmd.startsWith('!')) {
        await sock.sendMessage(from, { text: `❓ Comando desconocido. Usa *!info*.` });
      }
      break;
  }
}

module.exports = { handleMessage };
