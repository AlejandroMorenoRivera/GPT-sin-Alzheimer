const log = (msg) => console.log(`[STDOUT] ${msg}`);

module.exports = {
  log,
  logReq: (ruta) => log(`→ Requerido: ${ruta}`),
  logOK: (ruta, datos) => log(`✔️ OK: ${ruta} → ${JSON.stringify(datos)}`),
  logError: (ruta, status, err) => log(`❌ ERROR ${status}: ${ruta} → ${err}`),
};
