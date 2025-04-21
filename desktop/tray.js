const { Tray, Menu } = require('electron');
const path = require('path');

function crearTray(app, backend) {
  const tray = new Tray(path.join(__dirname, 'icon.ico'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Mostrar', click: () => app.focus() },
    {
      label: 'Salir',
      click: () => {
        if (backend) backend.kill();
        app.quit();
      }
    }
  ]);

  tray.setToolTip('GPT sin Alzheimer');
  tray.setContextMenu(contextMenu);
}

module.exports = { crearTray };
