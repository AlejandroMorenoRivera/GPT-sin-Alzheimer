const path = require('path');
const fs = require('fs-extra');

const cargar = (nombre) => fs.readJSONSync(path.join(__dirname, `${nombre}.json`));

module.exports = {
  app: cargar('app'),
  dev: cargar('dev')
  // openai: cargar('openai'),  // a futuro
  // rutas: cargar('rutas')     // a futuro
};
