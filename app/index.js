const express = require("express");
const cors = require("cors");
const fs = require("fs-extra");
const path = require("path");

const PORT = 3611;
const DATA_DIR = path.join(__dirname, "..", "data");
const USUARIOS_DIR = path.join(DATA_DIR, "usuarios");
const ESTADO_FILE = path.join(DATA_DIR, "estado.json");

const app = express();
app.use(cors());
app.use(express.json());

const log = (msg) => console.log(`[STDOUT] ${msg}`);
const logReq = (ruta) => log(`→ Requerido: ${ruta}`);
const logOK = (ruta, datos) => log(`✔️ OK: ${ruta} → ${JSON.stringify(datos)}`);
const logError = (ruta, status, err) =>
  log(`❌ ERROR ${status}: ${ruta} → ${err}`);

// 🔧 Estado del usuario
function getUsuarioActual() {
  try {
    if (!fs.existsSync(ESTADO_FILE)) return null;
    const estado = fs.readJSONSync(ESTADO_FILE);
    return estado.usuario || null;
  } catch (err) {
    logError("estado.json", 500, err.message);
    return null;
  }
}

function setUsuarioActual(nombre) {
  fs.writeJSONSync(ESTADO_FILE, { usuario: nombre });
  log(`🔄 Usuario activo cambiado a "${nombre}"`);
}

// 🔐 Middleware: verifica usuario activo
app.use((req, res, next) => {
  if (["/usuario", "/usuarios"].includes(req.path)) return next();
  const usuario = getUsuarioActual();
  if (!usuario) {
    logError(req.path, 400, "No hay usuario seleccionado");
    return res.status(400).json({ error: "No hay usuario seleccionado" });
  }
  req.usuario = usuario;
  next();
});

// 🧠 Usuario: Crear
app.post("/usuario", (req, res) => {
  logReq("/usuario");
  const { nombre } = req.body;
  if (!nombre) {
    logError("/usuario", 400, "Nombre requerido");
    return res.status(400).json({ error: "Nombre requerido" });
  }

  const userPath = path.join(USUARIOS_DIR, nombre);
  if (fs.existsSync(userPath)) {
    logError("/usuario", 400, "Ese usuario ya existe");
    return res.status(400).json({ error: "Ese usuario ya existe" });
  }

  fs.ensureDirSync(path.join(userPath, "notas"));
  fs.ensureDirSync(path.join(userPath, "archivos"));
  fs.writeJSONSync(path.join(userPath, "config.json"), { reglas: [] });

  setUsuarioActual(nombre);
  const respuesta = { mensaje: `Usuario ${nombre} creado y activado.` };
  logOK("/usuario", respuesta);
  res.json(respuesta);
});

// 🧠 Usuario: Activar
app.post("/usuario/activar", (req, res) => {
  logReq("/usuario/activar");
  const { nombre } = req.body;
  const userPath = path.join(USUARIOS_DIR, nombre);
  if (!fs.existsSync(userPath)) {
    logError("/usuario/activar", 404, "Usuario no encontrado");
    return res.status(404).json({ error: "Usuario no encontrado" });
  }

  setUsuarioActual(nombre);
  const respuesta = { mensaje: `Usuario ${nombre} activado.` };
  logOK("/usuario/activar", respuesta);
  res.json(respuesta);
});

// 🧠 Usuario: Listado
app.get("/usuarios", (req, res) => {
  logReq("/usuarios");
  const carpetas = fs
    .readdirSync(USUARIOS_DIR)
    .filter((n) => fs.statSync(path.join(USUARIOS_DIR, n)).isDirectory());

  logOK("/usuarios", carpetas);
  res.json(carpetas);
});

// 🗒️ Notas: Listado
app.get("/notas", (req, res) => {
  logReq("/notas");
  const notasDir = path.join(USUARIOS_DIR, req.usuario, "notas");
  const archivos = fs.readdirSync(notasDir);
  logOK("/notas", archivos);
  res.json(archivos);
});

// 🗒️ Notas: Obtener
app.get("/nota/:nombre", (req, res) => {
  const ruta = `/nota/${req.params.nombre}`;
  logReq(ruta);
  const notaPath = path.join(
    USUARIOS_DIR,
    req.usuario,
    "notas",
    req.params.nombre
  );
  if (!fs.existsSync(notaPath)) {
    logError(ruta, 404, "Nota no encontrada");
    return res.status(404).json({ error: "Nota no encontrada" });
  }

  const contenido = fs.readFileSync(notaPath, "utf-8");
  logOK(ruta, { contenido });
  res.send(contenido);
});

// 🗒️ Notas: Guardar
app.post("/nota", (req, res) => {
  logReq("/nota");
  const { nombre, contenido } = req.body;
  if (!nombre || !contenido) {
    logError("/nota", 400, "Falta nombre o contenido");
    return res.status(400).json({ error: "Falta nombre o contenido" });
  }

  const notaPath = path.join(USUARIOS_DIR, req.usuario, "notas", nombre);
  fs.writeFileSync(notaPath, contenido, "utf-8");
  const respuesta = { mensaje: `Nota ${nombre} guardada.` };
  logOK("/nota", respuesta);
  res.json(respuesta);
});

// 🗒️ Notas: Eliminar
app.delete("/nota/:nombre", (req, res) => {
  const ruta = `/nota/${req.params.nombre}`;
  logReq(ruta);
  const notaPath = path.join(
    USUARIOS_DIR,
    req.usuario,
    "notas",
    req.params.nombre
  );
  if (!fs.existsSync(notaPath)) {
    logError(ruta, 404, "Nota no encontrada");
    return res.status(404).json({ error: "Nota no encontrada" });
  }

  fs.unlinkSync(notaPath);
  const respuesta = { mensaje: `Nota ${req.params.nombre} eliminada.` };
  logOK(ruta, respuesta);
  res.json(respuesta);
});

// 📜 YAML de la API
app.use(
  "/openapi.yaml",
  express.static(path.join(__dirname, "..", "gpt", "openapi.yaml"))
);

// 🚀 Arranque
app.listen(PORT, () => {
  log("🧪 Backend activo en puerto 3611 (esperando solicitudes)");
  console.log(`GPT sin Alzheimer escuchando en http://localhost:${PORT}`);
});

// 🧪 Ping cada 1 minuto
setInterval(() => {
  log("📡 Ping: backend operativo");
}, 60 * 1000);
