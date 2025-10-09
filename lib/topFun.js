// lib/topFun.js
function pickTopTheme(participants, theme, count = 3) {
  // participants: array de JIDs
  // theme: texto como “infieles”, “valientes”, etc.
  // count: cuantos salen en el top

  // Si hay menos participantes que count, ajusta
  const n = Math.min(participants.length, count);
  // mezclamos la lista
  const shuffled = participants.sort(() => 0.5 - Math.random());
  // cortamos los primeros n
  const selection = shuffled.slice(0, n);
  // devolvemos array de objetos
  return selection.map((jid, i) => ({
    jid,
    rank: i + 1
  }));
}

module.exports = { pickTopTheme };
