const path = require('path');

function cargarConfig() {
  return require(path.join(__dirname, '..', 'config'));
}

module.exports = { cargarConfig };
