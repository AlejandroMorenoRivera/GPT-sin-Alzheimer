const { app, Menu, Tray, dialog, ipcMain, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs-extra");
const { spawn } = require("child_process");

const USUARIOS_DIR = path.join(__dirname, "..", "data", "usuarios");
const ESTADO_FILE = path.join(__dirname, "..", "data", "estado.json");
const ICONO_PATH = path.join(__dirname, "icon.ico");

let tray = null;
let backend = null;
let tunnel = null;
let estado = {
  backendActivo: false,
  tunnelActivo: false,
  usuario: null,
};
let promptWindow = null;

function cargarEstado() {
  try {
    if (fs.existsSync(ESTADO_FILE)) {
      const data = fs.readJSONSync(ESTADO_FILE);
      estado.usuario = data.usuario || null;
    } else {
      estado.usuario = null;
    }
  } catch (err) {
    estado.usuario = null;
  }
}

function escribirEstado(usuario) {
  fs.writeJSONSync(ESTADO_FILE, { usuario });
  estado.usuario = usuario;
}

function iniciarServidor() {
  const rutaBackend = path.join(__dirname, "..", "app", "index.js");
  backend = spawn("node", [rutaBackend], {
    shell: true,
    stdio: "ignore",
  });

  tunnel = spawn("lt", ["--port", "3611", "--subdomain", "gptsinalzheimer"], {
    shell: true,
    stdio: "ignore",
  });

  estado.backendActivo = true;
  estado.tunnelActivo = true;
  actualizarMenu();
}

function detenerServidor() {
  if (backend) backend.kill();
  if (tunnel) tunnel.kill();
  estado.backendActivo = false;
  estado.tunnelActivo = false;
  actualizarMenu();
}

function actualizarMenu() {
  const usuarios = fs.existsSync(USUARIOS_DIR)
    ? fs
        .readdirSync(USUARIOS_DIR)
        .filter((n) => fs.statSync(path.join(USUARIOS_DIR, n)).isDirectory())
    : [];

  const usuarioMenu = usuarios.map((nombre) => ({
    label: nombre,
    type: "radio",
    checked: nombre === estado.usuario,
    click: () => {
      escribirEstado(nombre);
      dialog.showMessageBox({ message: `Usuario cambiado a: ${nombre}` });
      actualizarMenu();
    },
  }));

  usuarioMenu.push({ type: "separator" });
  usuarioMenu.push({
    label: "➕ Crear nuevo usuario",
    click: () => {
      promptWindow = new BrowserWindow({
        width: 400,
        height: 240,
        resizable: false,
        frame: true, // ✅ Esto añade la barra con botón [X]
        autoHideMenuBar: true, // Oculta barra de menú (si aparece)
        alwaysOnTop: true,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
        },
      });

      promptWindow.loadFile(path.join(__dirname, "nuevo-usuario.html"));
    },
  });

  const contextMenu = Menu.buildFromTemplate([
    { label: `🧠 GPT sin Alzheimer`, enabled: false },
    {
      label: `Estado: ${estado.backendActivo ? "🟢 Backend" : "🔴 Backend"}, ${
        estado.tunnelActivo ? "🟢 Tunnel" : "🔴 Tunnel"
      }`,
      enabled: false,
    },
    { type: "separator" },
    { label: "⚙ Encender servidor", click: iniciarServidor },
    {
      label: "🔁 Reiniciar servidor",
      click: () => {
        detenerServidor();
        iniciarServidor();
      },
    },
    { label: "🛑 Apagar servidor", click: detenerServidor },
    { type: "separator" },
    { label: "🙋 Elegir usuario", submenu: usuarioMenu },
    {
      label: "⚙ Configuración",
      click: () => {
        const win = new BrowserWindow({
          width: 400,
          height: 240,
          resizable: false,
          alwaysOnTop: true,
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
          },
        });
        win.loadFile(path.join(__dirname, "windows", "config.html"));
      },
    },
    { type: "separator" },
    {
      label: "❌ Cerrar programa",
      click: () => {
        if (preferencias.confirmarSalida) {
          const confirm = dialog.showMessageBoxSync({
            type: "question",
            buttons: ["Cancelar", "Salir"],
            defaultId: 1,
            cancelId: 0,
            message: "¿Seguro que deseas salir?",
            checkboxLabel: "No volver a preguntar",
            checkboxChecked: false,
          });

          if (confirm.response === 1) {
            if (confirm.checkboxChecked) {
              preferencias.confirmarSalida = false;
              fs.writeJSONSync(CONFIG_PATH, preferencias);
            }
            detenerServidor();
            app.quit();
          }
        } else {
          detenerServidor();
          app.quit();
        }
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip(
    `GPT sin Alzheimer - ${estado.usuario || "Sin usuario activo"}`
  );
}

app.whenReady().then(() => {
  cargarEstado();
  tray = new Tray(ICONO_PATH);
  actualizarMenu();
});
app.on("window-all-closed", (e) => {
  // ⚠️ Evita que el cierre de ventanas termine la app
  e.preventDefault();
});

ipcMain.on("usuarioNuevo", (event, nombre) => {
  if (!nombre || !nombre.trim()) return;

  // Rechazar caracteres no válidos
  const nombreLimpio = nombre.trim().replace(/[<>:"/\\|?*]/g, "");
  const nombreProhibido = /^(con|prn|aux|nul|com\d|lpt\d)$/i;

  if (nombreLimpio === "" || nombreProhibido.test(nombreLimpio)) {
    dialog.showErrorBox(
      "Nombre inválido",
      "Ese nombre no es válido en Windows."
    );
    return;
  }

  const ruta = path.join(USUARIOS_DIR, nombreLimpio);
  if (fs.existsSync(ruta)) {
    dialog.showErrorBox(
      "Usuario ya existe",
      `El usuario "${nombreLimpio}" ya está registrado.`
    );
    return;
  }

  // ✅ Solo si es válido, cerrar la ventana y crear
  if (promptWindow) {
    promptWindow.close();
    promptWindow = null;
  }

  fs.ensureDirSync(path.join(ruta, "notas"));
  fs.ensureDirSync(path.join(ruta, "archivos"));
  fs.writeJSONSync(path.join(ruta, "config.json"), { reglas: [] });
  escribirEstado(nombreLimpio);
  dialog.showMessageBox({ message: `Usuario ${nombreLimpio} creado.` });
  actualizarMenu();
});

const CONFIG_PATH = path.join(__dirname, "..", "config", "config.json");
let preferencias = { confirmarSalida: true, iniciarConSistema: false };

function cargarPreferencias() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      preferencias = fs.readJSONSync(CONFIG_PATH);
    }
  } catch (err) {
    console.error("No se pudo cargar config.json:", err);
  }
}

ipcMain.handle("obtenerConfig", () => {
  return preferencias;
});

ipcMain.on("guardarConfig", (event, nueva) => {
  preferencias = nueva;
  fs.writeJSONSync(CONFIG_PATH, preferencias);
  app.setLoginItemSettings({
    openAtLogin: preferencias.iniciarConSistema,
    path: app.getPath("exe"),
  });
});
