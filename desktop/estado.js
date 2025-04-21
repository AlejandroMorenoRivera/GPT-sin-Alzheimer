const path = require('path');
const fs = require('fs-extra');

const ESTADO_PATH = path.join(__dirname, '..', 'data', 'estado.json');

function getUsuarioActivo() {
  try {
    const estado = fs.readJSONSync(ESTADO_PATH);
    return estado.usuario || null;
  } catch {
    return null;
  }
}

module.exports = { getUsuarioActivo };
