// Generar un cartón de Bingo 5x5
function generarCarton() {
  const carton = [];
  const numeros = Array.from({ length: 75 }, (_, i) => i + 1);
  for (let i = 0; i < 5; i++) {
    const fila = [];
    for (let j = 0; j < 5; j++) {
      const indice = Math.floor(Math.random() * numeros.length);
      fila.push(numeros.splice(indice, 1)[0]);
    }
    carton.push(fila);
  }
  carton[2][2] = 'LIBRE'; // Casilla central libre
  return carton;
}

// Mostrar el cartón en formato de texto
function mostrarCarton(carton) {
  return carton.map(fila => fila.join(' | ')).join('\n');
}

module.exports = { generarCarton, mostrarCarton };
