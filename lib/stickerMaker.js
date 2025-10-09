// lib/stickerMaker.js
const { createCanvas } = require('canvas');

async function makeStickerFromText(text) {
  const width = 512;
  const height = 512;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // FONDO blanco (puedes cambiar a transparente si lo prefieres)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Texto en negro
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Tamaño inicial grande
  let fontSize = 100;
  ctx.font = `${fontSize}px Sans`;

  const margin = 16;  // margen recomendado
  // Reducir la fuente si el texto es muy ancho
  while (ctx.measureText(text).width > width - margin * 2 && fontSize > 10) {
    fontSize--;
    ctx.font = `${fontSize}px Sans`;
  }

  // Opcional: si deseas que el texto se vaya en varias líneas si es demasiado largo
  // Puedes dividir el texto por palabras y distribuirlo en 2–3 líneas,
  // pero eso es más avanzado; por ahora lo centramos en una línea.

  ctx.fillText(text, width / 2, height / 2);

  // Retornar buffer PNG
  return canvas.toBuffer('image/png');
}

module.exports = { makeStickerFromText };
