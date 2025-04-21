const { app, Menu, Tray, dialog, ipcMain, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs-extra");
const { spawn } = require("child_process");

// 📁 Rutas absolutas desde el directorio actual (desktop)
const USUARIOS_DIR = path.join(__dirname, "..", "data", "usuarios");
const ESTADO_FILE = path.join(__dirname, "..", "data", "estado.json");
const CONFIG_PATH = path.join(__dirname, "..", "config", "config.json");
const ICONO_PATH = path.join(__dirname, "..", "icon", "gpt-sin-alzheimer.ico");
const INDEX_BACKEND = path.join(__dirname, "..", "app", "index.js");

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
  if (logsSistema && !logsSistema.isDestroyed()) return logsSistema.focus();

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
  if (logsGPT && !logsGPT.isDestroyed()) return logsGPT.focus();

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
      preferencias = { ...preferencias, ...datos };
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

// Estado
function cargarEstado() {
  try {
    const data = fs.existsSync(ESTADO_FILE) ? fs.readJSONSync(ESTADO_FILE) : {};
    estado.usuario = data.usuario || null;
  } catch {
    estado.usuario = null;
  }
}

function escribirEstado(usuario) {
  fs.writeJSONSync(ESTADO_FILE, { usuario });
  estado.usuario = usuario;
}

// 🚀 Servidor & túnel
function iniciarServidor() {
  if (estado.backendActivo || estado.tunnelActivo) {
    logSistema("⚠️ El servidor ya está activo. Ignorando intento de reinicio.");
    return;
  }

  logSistema("Iniciando servidor...");

  if (!fs.existsSync(INDEX_BACKEND)) {
    logSistema("❌ El archivo del backend no se encontró en: " + INDEX_BACKEND);
    return;
  }

  backend = spawn("node", [INDEX_BACKEND], {
    shell: true,
    stdio: ["pipe", "pipe", "pipe", "ipc"],
  });

  backend.on("message", (msg) => {
    if (msg.tipo === "log-gpt") logGPT(msg.mensaje);
  });

  backend.on("exit", (code, signal) => {
    logSistema(
      `❌ Backend cerrado con código ${code} ${
        signal ? `(signal: ${signal})` : ""
      }`
    );
    estado.backendActivo = false;
    actualizarMenu();
  });

  backend.stderr.on("data", (data) => {
    logSistema("💥 Error del backend:\n" + data.toString());
  });

  logSistema("Conectando túnel localtunnel...");
  tunnel = spawn("lt", ["--port", "3611", "--subdomain", "gptsinalzheimer"], {
    shell: true,
  });

  tunnel.stdout.on("data", (data) => {
    const msg = data.toString();
    logSistema("Tunnel info: " + msg);

    if (msg.includes("your url is:")) {
      const url = msg.split("your url is:")[1].trim();

      if (!url.includes("gptsinalzheimer")) {
        logSistema("⚠️ Subdominio incorrecto, reiniciando túnel...");
        tunnel.kill();
        tunnel = null;
        setTimeout(() => iniciarServidor(), 3000);
        return;
      }

      logSistema("✅ Túnel activo en: " + url);
    }
  });

  tunnel.stderr.on("data", (data) =>
    logSistema("Error túnel: " + data.toString())
  );

  tunnel.on("exit", () => {
    logSistema("❌ Túnel cerrado inesperadamente");
    estado.tunnelActivo = false;
    actualizarMenu();

    if (!app.isQuiting) {
      logSistema("♻️ Reintentando conexión del túnel en 3s...");
      setTimeout(() => {
        if (!tunnel) iniciarServidor();
      }, 3000);
    }
  });

  estado.backendActivo = true;
  estado.tunnelActivo = true;
  actualizarMenu();
}

function detenerServidor() {
  if (backend) {
    backend.kill();
    backend = null;
  }
  if (tunnel) {
    tunnel.kill();
    tunnel = null;
  }

  estado.backendActivo = false;
  estado.tunnelActivo = false;
  logSistema("Servidor detenido");
  actualizarMenu();
}

// 📋 Menú tray
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
      actualizarMenu();
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
        setTimeout(iniciarServidor, 500);
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
              if (result.response === 1) {
                if (result.checkboxChecked) {
                  preferencias.confirmarSalida = false;
                  guardarPreferencias();
                }
                app.isQuiting = true;
                detenerServidor();
                setTimeout(() => app.quit(), 300);
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

// 🚀 Evento ready
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

ipcMain.handle("obtenerConfig", () => preferencias);
ipcMain.on("guardarConfig", (event, nueva) => {
  preferencias = { ...preferencias, ...nueva };
  guardarPreferencias();
  if (preferencias.modoDesarrollador) abrirVentanaLogsSistema();
  if (preferencias.consolaGPT) abrirVentanaLogsGPT();
});

ipcMain.on("abrirLogs", abrirVentanaLogsSistema);
ipcMain.on("abrirLogsGPT", abrirVentanaLogsGPT);

app.on("before-quit", () => (app.isQuiting = true));
process.on("exit", () => logSistema("🔚 Proceso Node.js terminado."));
process.on("SIGINT", () => {
  logSistema("🛑 Señal SIGINT capturada");
  detenerServidor();
  process.exit();
});
process.on("uncaughtException", (err) =>
  logSistema("⚠️ Error no capturado: " + err)
);
