const { BrowserWindow } = require('electron');
const path = require('path');

function crearVentanaPrincipal(config) {
  const ventana = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, 'icon.ico'),
    show: config.dev?.modoDesarrollador
  });

  ventana.loadURL('http://localhost:3611'); // o local html si tienes
  if (config.dev?.modoDesarrollador) ventana.webContents.openDevTools();
}

module.exports = { crearVentanaPrincipal };
