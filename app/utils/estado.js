const fs = require("fs-extra");
const path = require("path");
const { logError, log } = require("./logger");

const ESTADO_FILE = path.join(__dirname, "..", "..", "data", "estado.json");

function getUsuarioActual() {
  try {
    if (!fs.existsSync(ESTADO_FILE)) return null;
    const estado = fs.readJSONSync(ESTADO_FILE);
    return estado.usuario || null;
  } catch (err) {
    logError("estado.json", 500, err.message);
    return null;
  }
}

function setUsuarioActual(nombre) {
  fs.writeJSONSync(ESTADO_FILE, { usuario: nombre });
  log(` Usuario activo cambiado a "${nombre}"`);
}

module.exports = { getUsuarioActual, setUsuarioActual };
