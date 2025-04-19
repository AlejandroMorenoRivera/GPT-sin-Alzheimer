const { app, Menu, Tray, dialog, ipcMain, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs-extra");
const { spawn } = require("child_process");

const USUARIOS_DIR = path.join(__dirname, "..", "data", "usuarios");
const ESTADO_FILE = path.join(__dirname, "..", "data", "estado.json");
const CONFIG_PATH = path.join(__dirname, "..", "config", "config.json");
const ICONO_PATH = path.join(__dirname, "icon.ico");

let tray = null;
let backend = null;
let tunnel = null;
let promptWindow = null;
let estado = { backendActivo: false, tunnelActivo: false, usuario: null };
let preferencias = { confirmarSalida: true, iniciarConSistema: false };

function cargarPreferencias() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      preferencias = fs.readJSONSync(CONFIG_PATH);
      console.log("Preferencias cargadas:", preferencias);
    }
  } catch (err) {
    console.error("Error al cargar config.json:", err);
  }
}

function guardarPreferencias() {
  fs.writeJSONSync(CONFIG_PATH, preferencias);
  console.log("Preferencias guardadas:", preferencias);
  app.setLoginItemSettings({
    openAtLogin: preferencias.iniciarConSistema,
    path: app.getPath("exe"),
  });
}

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
  backend = spawn("node", [rutaBackend], { shell: true });
  tunnel = spawn("lt", ["--port", "3611", "--subdomain", "gptsinalzheimer"], {
    shell: true,
  });
  estado.backendActivo = true;
  estado.tunnelActivo = true;
  console.log("Servidor iniciado");
  if (!app.isQuiting) actualizarMenu();
}

function detenerServidor() {
  if (backend) backend.kill();
  if (tunnel) tunnel.kill();
  estado.backendActivo = false;
  estado.tunnelActivo = false;
  console.log("Servidor detenido");
  if (!app.isQuiting) actualizarMenu();
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
      console.log("Usuario activo:", nombre);
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
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
        },
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
      label: "🛠 Configuracion",
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
        console.log("Ventana de configuracion abierta");
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
              title: "Salir de la aplicacion",
              message:
                "Esta accion cerrara la aplicacion y detendra el servidor.",
              checkboxLabel: "No volver a preguntar",
              checkboxChecked: false,
            })
            .then((result) => {
              console.log("Resultado del dialogo de salida:", result);
              if (result.response === 1) {
                if (result.checkboxChecked) {
                  preferencias.confirmarSalida = false;
                  guardarPreferencias();
                  console.log("Confirmacion desactivada para futuros cierres");
                }
                if (!app.isQuiting) {
                  app.isQuiting = true;
                  detenerServidor();
                  console.log("Cerrando aplicacion");
                  app.quit();
                }
              } else {
                console.log("Cierre cancelado");
              }
            });
        } else {
          detenerServidor();
          console.log("Cerrando aplicacion sin confirmar");
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

// INICIO
app.isQuiting = false;
app.whenReady().then(() => {
  console.log("Iniciando GPT sin Alzheimer...");
  cargarEstado();
  cargarPreferencias();
  tray = new Tray(ICONO_PATH);
  actualizarMenu();
});

// Evita que se cierre la app cuando no hay ventanas
app.on("window-all-closed", (e) => {
  e.preventDefault();
});

// Persistencia de configuración desde ventana HTML
ipcMain.handle("obtenerConfig", () => {
  console.log("Enviando configuracion actual");
  return preferencias;
});

ipcMain.on("guardarConfig", (event, nueva) => {
  preferencias = nueva;
  guardarPreferencias();
  console.log("Preferencias actualizadas desde ventana");
});

// Control de cierre real
app.on("before-quit", () => {
  console.log("Evento before-quit detectado");
  app.isQuiting = true;
});
