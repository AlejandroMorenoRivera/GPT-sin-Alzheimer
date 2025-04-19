// Importamos librerías necesarias
const express = require('express');         // Framework para construir APIs HTTP
const cors = require('cors');               // Para permitir peticiones desde cualquier origen (útil si el GPT usa navegador)
const fs = require('fs-extra');             // Para leer y escribir archivos fácilmente
const path = require('path');               // Para construir rutas de carpetas y archivos

// Configuración básica
const PORT = 3611; // Puerto en el que escuchará la app local
const DATA_DIR = path.join(__dirname, '..', 'data');             // Carpeta donde guardamos todo lo importante
const USUARIOS_DIR = path.join(DATA_DIR, 'usuarios');            // Subcarpeta con los datos de cada usuario
const ESTADO_FILE = path.join(DATA_DIR, 'estado.json');          // Archivo que recuerda el usuario activo

const app = express();
app.use(cors());
app.use(express.json()); // Permite recibir JSON en los POST

// 🔧 Función auxiliar: obtener el usuario actualmente activo
function getUsuarioActual() {
  try {
    if (!fs.existsSync(ESTADO_FILE)) return null;
    const estado = fs.readJSONSync(ESTADO_FILE);
    return estado.usuario || null;
  } catch (err) {
    console.error("Error leyendo estado.json:", err.message);
    return null;
  }
}


// 🔧 Función auxiliar: cambiar el usuario activo
function setUsuarioActual(nombre) {
  fs.writeJSONSync(ESTADO_FILE, { usuario: nombre });
}

// 🔒 Middleware global: bloquea el acceso a rutas si no hay usuario activo
// (Excepto la creación/selección de usuario)
app.use((req, res, next) => {
  const usuario = getUsuarioActual();
  if (!usuario && req.path !== '/usuario' && req.path !== '/usuarios') {
    return res.status(400).json({ error: 'No hay usuario seleccionado' });
  }
  req.usuario = usuario;
  next();
});


// ✅ POST /usuario - Crear un nuevo usuario y activarlo
app.post('/usuario', (req, res) => {
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });

  const userPath = path.join(USUARIOS_DIR, nombre);
  if (fs.existsSync(userPath)) {
    return res.status(400).json({ error: 'Ese usuario ya existe' });
  }

  // Creamos carpetas del nuevo usuario
  fs.ensureDirSync(path.join(userPath, 'notas'));
  fs.ensureDirSync(path.join(userPath, 'archivos'));

  // Configuración inicial vacía
  fs.writeJSONSync(path.join(userPath, 'config.json'), { reglas: [] });

  setUsuarioActual(nombre);
  res.json({ mensaje: `Usuario ${nombre} creado y activado.` });
});


// ✅ POST /usuario/activar - Cambiar el usuario activo
app.post('/usuario/activar', (req, res) => {
  const { nombre } = req.body;
  const userPath = path.join(USUARIOS_DIR, nombre);
  if (!fs.existsSync(userPath)) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  setUsuarioActual(nombre);
  res.json({ mensaje: `Usuario ${nombre} activado.` });
});


// ✅ GET /usuarios - Lista de todos los usuarios disponibles
app.get('/usuarios', (req, res) => {
  const carpetas = fs.readdirSync(USUARIOS_DIR).filter(n =>
    fs.statSync(path.join(USUARIOS_DIR, n)).isDirectory()
  );
  res.json(carpetas);
});


// ✅ GET /notas - Devuelve nombres de todas las notas del usuario actual
app.get('/notas', (req, res) => {
  const notasDir = path.join(USUARIOS_DIR, req.usuario, 'notas');
  const archivos = fs.readdirSync(notasDir);
  res.json(archivos);
});


// ✅ GET /nota/:nombre - Leer el contenido de una nota específica
app.get('/nota/:nombre', (req, res) => {
  const notaPath = path.join(USUARIOS_DIR, req.usuario, 'notas', req.params.nombre);
  if (!fs.existsSync(notaPath)) return res.status(404).json({ error: 'Nota no encontrada' });
  const contenido = fs.readFileSync(notaPath, 'utf-8');
  res.send(contenido);
});


// ✅ POST /nota - Guardar una nota (nombre + contenido)
app.post('/nota', (req, res) => {
  const { nombre, contenido } = req.body;
  if (!nombre || !contenido) {
    return res.status(400).json({ error: 'Falta nombre o contenido' });
  }

  const notaPath = path.join(USUARIOS_DIR, req.usuario, 'notas', nombre);
  fs.writeFileSync(notaPath, contenido, 'utf-8');
  res.json({ mensaje: `Nota ${nombre} guardada.` });
});


// ✅ DELETE /nota/:nombre - Eliminar una nota por nombre
app.delete('/nota/:nombre', (req, res) => {
  const notaPath = path.join(USUARIOS_DIR, req.usuario, 'notas', req.params.nombre);
  if (!fs.existsSync(notaPath)) return res.status(404).json({ error: 'Nota no encontrada' });

  fs.unlinkSync(notaPath);
  res.json({ mensaje: `Nota ${req.params.nombre} eliminada.` });
});


// 🟢 Iniciar el servidor
app.use('/openapi.yaml', express.static(path.join(__dirname, '..', 'gpt', 'openapi.yaml')));
app.listen(PORT, () => {
  console.log(`GPT sin Alzheimer escuchando en http://localhost:${PORT}`);
});
