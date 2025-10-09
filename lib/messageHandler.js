const { makeStickerFromText } = require('./stickerMaker');
const JokeAPI = require('@qgisk/jokeapi-wrapper');
const { Configuration, OpenAIApi } = require("openai");
const { generarCarton, mostrarCarton } = require('../bingo'); // ajusta ruta si está en otra carpeta


const mesasPorGrupo = {};
const ultimaAccionPorUsuario = {};
const jokeClient = new JokeAPI();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Utils
function pickTopTheme(participants, tema, count = 3) {
  const shuffled = participants.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).map((jid, i) => ({
    jid,
    rank: i + 1,
    tema
  }));
}

async function getJoke() {
  try {
    const joke = await jokeClient.getJoke();
    if (joke.type === 'single') return joke.joke;
    if (joke.type === 'twopart') return `${joke.setup}\n\n${joke.delivery}`;
  } catch (err) {
    console.error('Error obteniendo chiste:', err);
    return 'No pude obtener un chiste en este momento.';
  }
}

async function getAIResponse(question) {
  try {
    const response = await openai.createCompletion({
      model: "gpt-4",
      prompt: question,
      max_tokens: 100,
    });
    return response.data.choices[0].text.trim();
  } catch (error) {
    console.error("Error al obtener respuesta de la IA:", error);
    return "Lo siento, no pude obtener una respuesta en este momento.";
  }
}

async function iniciarTorneo(sock, groupId) {
  try {
    const metadata = await sock.groupMetadata(groupId);
    const participantes = metadata.participants.map(p => p.id);

    if (participantes.length < 4) {
      await sock.sendMessage(groupId, { text: 'Se necesitan al menos 4 participantes para iniciar el torneo.' });
      return;
    }

    if (participantes.length % 2 !== 0) {
      await sock.sendMessage(groupId, { text: 'Número impar de participantes, alguno quedará sin pareja.' });
    }

    const bracket = [];
    const shuffled = participantes.sort(() => 0.5 - Math.random());
    for (let i = 0; i < shuffled.length; i += 2) {
      bracket.push([shuffled[i], shuffled[i + 1] || null]);
    }

    let msg = '🎮 Torneo iniciado:\n';
    const mentions = [];
    bracket.forEach((match, i) => {
      if (match[1]) {
        msg += `Partida ${i + 1}: @${match[0].split('@')[0]} vs @${match[1].split('@')[0]}\n`;
        mentions.push(match[0], match[1]);
      } else {
        msg += `@${match[0].split('@')[0]} pasa automáticamente (bye)\n`;
        mentions.push(match[0]);
      }
    });

    await sock.sendMessage(groupId, { text: msg, mentions });
  } catch (err) {
    console.error('Error iniciando torneo:', err);
    await sock.sendMessage(groupId, { text: 'Error al iniciar el torneo.' });
  }
}

async function handleMessage(sock, msg) {

  if (text === '.bingo') {
  const carton = generarCarton();
  const mensaje = `🎉 ¡Bienvenidos al Bingo! 🎉\n\nTu cartón es:\n\n${mostrarCarton(carton)}\n\n¡Marca una línea completa y escribe \`.bingo\` para ganar!`;
  await sock.sendMessage(from, { text: mensaje });
  return; 
  }

  const from = msg.key.remoteJid;
  const isGroup = from.endsWith('@g.us');
  const textRaw = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
  const text = textRaw.trim().toLowerCase();
  if (!text || !isGroup) return;

  const userId = msg.key.participant || msg.key.remoteJid;
  const now = Date.now();

  // Anti spam mesa
  if (ultimaAccionPorUsuario[userId] && now - ultimaAccionPorUsuario[userId] < 10000) return;
  ultimaAccionPorUsuario[userId] = now;

  // .mesa <4|6> <reglas>
  if (text.startsWith('.mesa ')) {
    const partes = text.split(' ');
    const maxJugadores = parseInt(partes[1]);
    const reglas = partes.slice(2).join(' ');

    if (![4, 6].includes(maxJugadores)) {
      await sock.sendMessage(from, { text: 'Solo puedes crear mesas para 4 o 6 jugadores.' });
      return;
    }

    if (!reglas) {
      await sock.sendMessage(from, { text: 'Debes agregar reglas y premios después del número.' });
      return;
    }

    if (!mesasPorGrupo[from]) mesasPorGrupo[from] = [];

    mesasPorGrupo[from].push({
      maxJugadores,
      reglas,
      jugadores: [],
      estado: 'abierta'
    });

    await sock.sendMessage(from, {
      text: `Mesa para ${maxJugadores} jugadores creada.\nReglas y premios:\n${reglas}\n\nEscribe "yo" para unirte.`
    });
    return;
  }

  // "yo" para unirse
  if (text === 'yo') {
    const mesas = mesasPorGrupo[from];
    if (!mesas || mesas.length === 0) {
      await sock.sendMessage(from, { text: 'No hay mesas abiertas. Crea una con .mesa' });
      return;
    }

    const mesa = mesas.find(m => m.estado === 'abierta');
    if (!mesa) {
      await sock.sendMessage(from, { text: 'No hay mesas abiertas disponibles en este momento.' });
      return;
    }

    if (mesa.jugadores.includes(userId)) {
      await sock.sendMessage(from, { text: 'Ya estás registrado en la mesa.' });
      return;
    }

    mesa.jugadores.push(userId);

    await sock.sendMessage(from, {
      text: `Te has unido a la mesa (${mesa.jugadores.length}/${mesa.maxJugadores}).`
    });

    if (mesa.jugadores.length === mesa.maxJugadores) {
      mesa.estado = 'llena';
      const elegido = mesa.jugadores[Math.floor(Math.random() * mesa.jugadores.length)];
      await sock.sendMessage(from, {
        text: `La mesa está llena. @${elegido.split('@')[0]}, manda mesa por favor.`,
        mentions: [elegido]
      });
    }
    return;
  }

  // .s texto → sticker
  if (text.startsWith('.s ')) {
    const content = text.slice(3).trim();
    if (!content) {
      await sock.sendMessage(from, { text: 'Escribe algo después de `.s` para convertir en sticker.' });
      return;
    }
    try {
      const sticker = await makeStickerFromText(content);
      await sock.sendMessage(from, { sticker });
    } catch (err) {
      console.error('Error creando sticker:', err);
      await sock.sendMessage(from, { text: 'No se pudo crear el sticker.' });
    }
    return;
  }

  // .hidetag
  if (text === '.hidetag') {
    try {
      const metadata = await sock.groupMetadata(from);
      const mentions = metadata.participants.map(p => p.id);
      await sock.sendMessage(from, { text: '‎', mentions });
    } catch (err) {
      await sock.sendMessage(from, { text: 'No se pudo ejecutar hidetag.' });
    }
    return;
  }

  // .notify texto
  if (text.startsWith('.notify ')) {
    const mensaje = text.slice(8).trim() || 'Atención a todos';
    const metadata = await sock.groupMetadata(from);
    const mentions = metadata.participants.map(p => p.id);
    await sock.sendMessage(from, { text: mensaje, mentions });
    return;
  }

  // .parejas
  if (text === '.parejas') {
    const metadata = await sock.groupMetadata(from);
    const participantes = metadata.participants.map(p => p.id);
    if (participantes.length < 2) {
      await sock.sendMessage(from, { text: 'No hay suficientes miembros para formar parejas.' });
      return;
    }
    const shuffled = participantes.sort(() => 0.5 - Math.random());
    const pares = [];
    const mentions = [];
    let msg = '💕 Parejas formadas:\n';
    for (let i = 0; i < shuffled.length; i += 2) {
      const a = shuffled[i];
      const b = shuffled[i + 1];
      if (b) {
        msg += `@${a.split('@')[0]} + @${b.split('@')[0]}\n`;
        mentions.push(a, b);
      } else {
        msg += `@${a.split('@')[0]} sin pareja 😢\n`;
        mentions.push(a);
      }
    }
    await sock.sendMessage(from, { text: msg, mentions });
    return;
  }

  // .topinfieles
  if (text === '.topinfieles') {
    const metadata = await sock.groupMetadata(from);
    const top = pickTopTheme(metadata.participants.map(p => p.id), 'infieles', 3);
    const msg = top.map(p => `${p.rank}. @${p.jid.split('@')[0]}`).join('\n');
    await sock.sendMessage(from, { text: '🕵️ Top Infieles:\n' + msg, mentions: top.map(p => p.jid) });
    return;
  }

  // .topvalientes
  if (text === '.topvalientes') {
    const metadata = await sock.groupMetadata(from);
    const top = pickTopTheme(metadata.participants.map(p => p.id), 'valientes', 3);
    const msg = top.map(p => `${p.rank}. @${p.jid.split('@')[0]}`).join('\n');
    await sock.sendMessage(from, { text: '💪 Top Valientes:\n' + msg, mentions: top.map(p => p.jid) });
    return;
  }

  // .chiste
  if (text === '.chiste') {
    const chiste = await getJoke();
    await sock.sendMessage(from, { text: chiste });
    return;
  }

  // .torneo
  if (text === '.torneo') {
    await iniciarTorneo(sock, from);
    return;
  }
}

module.exports = { handleMessage };
