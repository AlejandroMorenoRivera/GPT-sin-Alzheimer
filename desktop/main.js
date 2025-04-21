const { app, Menu, Tray, dialog, ipcMain, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs-extra");
const { spawn } = require("child_process");

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

let colaLogsGPT = [];

let estado = { backendActivo: false, tunnelActivo: false, usuario: null };
let preferencias = {
  confirmarSalida: true,
  iniciarConSistema: false,
  modoDesarrollador: false,
  consolaGPT: false,
};

// 📤 Logs
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
  } else {
    colaLogsGPT.push(msg);
  }
}

function vaciarColaLogsGPT() {
  if (!logsGPT || logsGPT.isDestroyed()) return;
  while (colaLogsGPT.length > 0) {
    logsGPT.webContents.send("log", colaLogsGPT.shift());
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
  logsSistema
    .loadFile(path.join(__dirname, "windows", "logs-sistema.html"))
    .then(() => {
      logSistema("Consola del sistema abierta");
    });
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
  logsGPT
    .loadFile(path.join(__dirname, "windows", "logs-gpt.html"))
    .then(() => {
      logGPT("✅ Consola GPT abierta y lista.");
      vaciarColaLogsGPT();
    });
}

// ⚙️ Configuración
function cargarPreferencias() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      preferencias = { ...preferencias, ...fs.readJSONSync(CONFIG_PATH) };
      logSistema("Preferencias cargadas.");
    }
  } catch (err) {
    logSistema("Error cargando preferencias: " + err.message);
  }
}

function guardarPreferencias() {
  fs.writeJSONSync(CONFIG_PATH, preferencias);
  app.setLoginItemSettings({ openAtLogin: preferencias.iniciarConSistema });
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

// 🚀 Backend y túnel
function iniciarServidor() {
  if (estado.backendActivo || estado.tunnelActivo) return;

  logSistema("Iniciando backend...");
  if (!fs.existsSync(INDEX_BACKEND))
    return logSistema("❌ index.js no encontrado");

  backend = spawn("node", [INDEX_BACKEND], {
    shell: true,
    stdio: ["pipe", "pipe", "pipe", "ipc"],
  });

  backend.on("message", (msg) => {
    if (msg?.tipo === "listo") {
      backend.send({ tipo: "canal-listo" });
    }
    if (msg?.tipo === "log-gpt") {
      logGPT("📡 " + msg.mensaje);
    }
  });

  backend.stdout.on("data", (data) => {
    const texto = data.toString().trim();
    if (texto.includes("[STDOUT]")) {
      logGPT(texto);
    } else {
      logSistema(`🗒️ Salida backend: ${texto}`);
    }
  });

  backend.stderr.on("data", (data) => {
    logSistema("💥 Error backend:\n" + data.toString());
  });

  backend.on("exit", (code, signal) => {
    logSistema(
      `❌ Backend cerrado con código ${code} ${
        signal ? `(sig: ${signal})` : ""
      }`
    );
    estado.backendActivo = false;
    actualizarMenu();
  });

  tunnel = spawn("lt", ["--port", "3611", "--subdomain", "gptsinalzheimer"], {
    shell: true,
  });

  tunnel.stdout.on("data", (data) => {
    const msg = data.toString();
    if (msg.includes("your url is:")) {
      const url = msg.split("your url is:")[1].trim();
      if (url.includes("gptsinalzheimer")) {
        logSistema("✅ Túnel activo en: " + url);
      } else {
        tunnel.kill();
        setTimeout(iniciarServidor, 3000);
      }
    }
  });

  tunnel.on("exit", () => {
    logSistema("❌ Túnel cerrado");
    estado.tunnelActivo = false;
    actualizarMenu();
    if (!app.isQuiting) setTimeout(iniciarServidor, 3000);
  });

  estado.backendActivo = true;
  estado.tunnelActivo = true;
  actualizarMenu();
}

function detenerServidor() {
  if (backend) backend.kill();
  if (tunnel) tunnel.kill();
  backend = null;
  tunnel = null;
  estado.backendActivo = false;
  estado.tunnelActivo = false;
  actualizarMenu();
}

// 📋 Tray Menu
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
      logSistema(`Usuario cambiado a ${nombre}`);
      actualizarMenu();
    },
  }));

  usuarioMenu.push(
    { type: "separator" },
    {
      label: "Crear nuevo usuario",
      click: () => {
        promptWindow = new BrowserWindow({
          width: 400,
          height: 240,
          resizable: false,
          alwaysOnTop: true,
          autoHideMenuBar: true,
          webPreferences: { nodeIntegration: true, contextIsolation: false },
        });
        promptWindow.loadFile(
          path.join(__dirname, "windows", "nuevo-usuario.html")
        );
      },
    }
  );

  tray.setContextMenu(
    Menu.buildFromTemplate([
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
                title: "¿Salir?",
                message: "Esta acción cerrará la app y el servidor.",
                checkboxLabel: "No volver a preguntar",
                checkboxChecked: false,
              })
              .then((res) => {
                if (res.response === 1) {
                  if (res.checkboxChecked) {
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
    ])
  );

  tray.setToolTip(
    `GPT sin Alzheimer - ${estado.usuario || "Sin usuario activo"}`
  );
}

// 🚀 App Ready
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
ipcMain.on("guardarConfig", (_, nueva) => {
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
