const { app } = require('electron');

const { cargarConfig } = require('./configLoader');
const { iniciarBackend, detenerBackend } = require('./backend');
const { crearVentanaPrincipal } = require('./ventanas');
const { crearTray } = require('./tray');

let backend;

app.whenReady().then(() => {
  const config = cargarConfig();
  backend = iniciarBackend();
  crearVentanaPrincipal(config);
  crearTray(app, backend);
});

app.on('before-quit', () => {
  if (backend) detenerBackend(backend);
});
