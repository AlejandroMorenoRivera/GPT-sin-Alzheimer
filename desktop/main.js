const { app, Menu, Tray, dialog, ipcMain, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs-extra");
const { spawn } = require("child_process");

// 🗂️ Rutas
const USUARIOS_DIR = path.join(__dirname, "..", "data", "usuarios");
const ESTADO_FILE = path.join(__dirname, "..", "data", "estado.json");
const CONFIG_PATH = path.join(__dirname, "..", "config", "config.json");
const ICONO_PATH = path.join(__dirname, "icon.ico");

let tray = null;
let backend = null;
let tunnel = null;
let promptWindow = null;
let logsSistema = null;
let logsGPT = null;

let estado = { backendActivo: false, tunnelActivo: false, usuario: null };
let preferencias = {
  confirmarSalida: true,
  iniciarConSistema: false,
  modoDesarrollador: false,
  consolaGPT: false,
};

// 📤 Logs universales
function logSistema(msg) {
  console.log("[SISTEMA]", msg);
  if (logsSistema && !logsSistema.isDestroyed()) {
    logsSistema.webContents.send("log", msg.toString());
  }
}
function logGPT(msg) {
  console.log("[GPT]", msg);
  if (logsGPT && !logsGPT.isDestroyed()) {
    logsGPT.webContents.send("log", msg.toString());
  }
}

// 🪟 Consolas
function abrirVentanaLogsSistema() {
  if (logsSistema && !logsSistema.isDestroyed()) {
    logsSistema.focus();
    return;
  }
  logsSistema = new BrowserWindow({
    width: 600,
    height: 400,
    title: "Logs del sistema",
    alwaysOnTop: true,
    autoHideMenuBar: true,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });
  logsSistema.loadFile(path.join(__dirname, "windows", "logs-sistema.html"));
  logSistema("Consola del sistema abierta");
}

function abrirVentanaLogsGPT() {
  if (logsGPT && !logsGPT.isDestroyed()) {
    logsGPT.focus();
    return;
  }
  logsGPT = new BrowserWindow({
    width: 600,
    height: 400,
    title: "Logs GPT",
    alwaysOnTop: true,
    autoHideMenuBar: true,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });
  logsGPT.loadFile(path.join(__dirname, "windows", "logs-gpt.html"));
  logGPT("Consola GPT abierta");
}

// ⚙️ Configuración
function cargarPreferencias() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const datos = fs.readJSONSync(CONFIG_PATH);
      preferencias = {
        ...preferencias,
        ...datos, // Merge seguro
      };
      logSistema("Preferencias cargadas: " + JSON.stringify(preferencias));
    }
  } catch (err) {
    logSistema("Error cargando config.json: " + err);
  }
}

function guardarPreferencias() {
  fs.writeJSONSync(CONFIG_PATH, preferencias);
  logSistema("Preferencias guardadas: " + JSON.stringify(preferencias));
  app.setLoginItemSettings({
    openAtLogin: preferencias.iniciarConSistema,
    path: app.getPath("exe"),
  });
}

// 📌 Estado
function cargarEstado() {
  try {
    if (fs.existsSync(ESTADO_FILE)) {
      const data = fs.readJSONSync(ESTADO_FILE);
      estado.usuario = data.usuario || null;
    } else estado.usuario = null;
  } catch {
    estado.usuario = null;
  }
}

function escribirEstado(usuario) {
  fs.writeJSONSync(ESTADO_FILE, { usuario });
  estado.usuario = usuario;
}

// 🔌 Servidor y túnel
function iniciarServidor() {
  logSistema("Iniciando servidor...");
  const rutaBackend = path.join(__dirname, "..", "app", "index.js");
  backend = spawn("node", [rutaBackend], { shell: true });

  logSistema("Conectando túnel localtunnel...");
  tunnel = spawn("lt", ["--port", "3611", "--subdomain", "gptsinalzheimer"], {
    shell: true,
  });

  tunnel.stdout.on("data", (data) => {
    const msg = data.toString();
    logSistema("Tunnel info: " + msg);
    if (msg.includes("your url is:")) {
      const url = msg.split("your url is:")[1].trim();
      logSistema("Túnel activo en: " + url);
    }
  });

  tunnel.stderr.on("data", (data) => {
    logSistema("Error túnel: " + data.toString());
  });

  estado.backendActivo = true;
  estado.tunnelActivo = true;
  if (!app.isQuiting) actualizarMenu();
}

function detenerServidor() {
  if (backend) backend.kill();
  if (tunnel) tunnel.kill();
  estado.backendActivo = false;
  estado.tunnelActivo = false;
  logSistema("Servidor detenido");
  if (!app.isQuiting) actualizarMenu();
}

// 🧠 Menú
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
      logSistema("Usuario activo: " + nombre);
      if (!app.isQuiting) actualizarMenu();
    },
  }));

  usuarioMenu.push({ type: "separator" });
  usuarioMenu.push({
    label: "Crear nuevo usuario",
    click: () => {
      promptWindow = new BrowserWindow({
        width: 400,
        height: 240,
        resizable: false,
        frame: true,
        alwaysOnTop: true,
        autoHideMenuBar: true,
        webPreferences: { nodeIntegration: true, contextIsolation: false },
      });
      promptWindow.loadFile(
        path.join(__dirname, "windows", "nuevo-usuario.html")
      );
    },
  });

  const contextMenu = Menu.buildFromTemplate([
    { label: "🧠 GPT sin Alzheimer", enabled: false },
    {
      label: `📡 Estado: ${
        estado.backendActivo ? "🟢 Backend" : "🔴 Backend"
      }, ${estado.tunnelActivo ? "🟢 Tunnel" : "🔴 Tunnel"}`,
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
    { type: "separator" },
    {
      label: "🛠 Configuración",
      click: () => {
        const win = new BrowserWindow({
          width: 500,
          height: 370,
          resizable: false,
          alwaysOnTop: true,
          autoHideMenuBar: true,
          webPreferences: { nodeIntegration: true, contextIsolation: false },
        });
        win.loadFile(path.join(__dirname, "windows", "config.html"));
        logSistema("Ventana de configuración abierta");
      },
    },
    {
      label: "❌ Cerrar programa",
      click: () => {
        if (preferencias.confirmarSalida) {
          dialog
            .showMessageBox({
              type: "question",
              buttons: ["Cancelar", "Salir"],
              defaultId: 1,
              cancelId: 0,
              title: "¿Seguro que deseas salir?",
              message:
                "Esta acción cerrará la aplicación y detendrá el servidor.",
              checkboxLabel: "No volver a preguntar",
              checkboxChecked: false,
            })
            .then((result) => {
              logSistema("Resultado diálogo salida: " + result.response);
              if (result.response === 1) {
                if (result.checkboxChecked) {
                  preferencias.confirmarSalida = false;
                  guardarPreferencias();
                  logSistema("Confirmación desactivada");
                }
                if (!app.isQuiting) {
                  app.isQuiting = true;
                  detenerServidor();
                  app.quit();
                }
              }
            });
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

// 🧷 Eventos
app.isQuiting = false;
app.whenReady().then(() => {
  logSistema("Iniciando aplicación...");
  cargarEstado();
  cargarPreferencias();

  tray = new Tray(ICONO_PATH);
  actualizarMenu();

  if (preferencias.modoDesarrollador) abrirVentanaLogsSistema();
  if (preferencias.consolaGPT) abrirVentanaLogsGPT();
});

app.on("window-all-closed", (e) => e.preventDefault());

ipcMain.handle("obtenerConfig", () => {
  return preferencias;
});

ipcMain.on("guardarConfig", (event, nueva) => {
  preferencias = {
    ...preferencias,
    ...nueva,
  };
  guardarPreferencias();
  if (preferencias.modoDesarrollador) abrirVentanaLogsSistema();
  if (preferencias.consolaGPT) abrirVentanaLogsGPT();
});

ipcMain.on("abrirLogs", () => abrirVentanaLogsSistema());
ipcMain.on("abrirLogsGPT", () => abrirVentanaLogsGPT());

app.on("before-quit", () => {
  app.isQuiting = true;
});
