const { app, Menu, Tray, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let tray = null;
let backend = null;
let tunnel = null;

function iniciarServidor() {
  const rutaBackend = path.join(__dirname, '..', 'app', 'index.js');
  backend = spawn('node', [rutaBackend], {
    shell: true,
    stdio: 'ignore'
  });

  const lt = spawn('lt', ['--port', '3611', '--subdomain', 'gptsinalzheimer'], {
    shell: true,
    stdio: 'ignore'
  });

  tunnel = lt;
}

function detenerServidor() {
  if (backend) backend.kill();
  if (tunnel) tunnel.kill();
}

app.on('ready', () => {
  tray = new Tray(path.join(__dirname, 'icono.ico'));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Abrir carpeta de datos',
      click: () => {
        const dir = path.join(__dirname, '..', 'data');
        require('child_process').exec(`start "" "${dir}"`);
      }
    },
    {
      label: 'Reiniciar servidor',
      click: () => {
        detenerServidor();
        iniciarServidor();
      }
    },
    {
      label: 'Salir',
      click: () => {
        detenerServidor();
        app.quit();
      }
    }
  ]);

  tray.setToolTip('GPT sin Alzheimer');
  tray.setContextMenu(contextMenu);

  iniciarServidor();
});
