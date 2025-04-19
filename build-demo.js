const builder = require("electron-builder");
const path = require("path");
const fs = require("fs");
const rimraf = require("rimraf");
const pkg = require("./package.json");

const version = pkg.version;
const outputDir = path.join(
  __dirname,
  "builds",
  `GPT-sin-Alzheimer-v${version}`
);
const unpackedDir = path.join(outputDir, "win-unpacked");
const outputExe = path.join(unpackedDir, "GPT sin Alzheimer.exe");

// Función para saber si el .exe está bloqueado o en uso por otro proceso
function isExeLocked(filePath) {
  try {
    const fd = fs.openSync(filePath, "r+");
    fs.closeSync(fd);
    return false; // ✅ Se pudo abrir → NO está en uso
  } catch (err) {
    return true; // ❌ Está en uso o bloqueado
  }
}

// Si ya existe el ejecutable y está bloqueado → cancelar build
if (fs.existsSync(outputExe) && isExeLocked(outputExe)) {
  console.log("❌ El EXE está en uso o bloqueado por el sistema.");
  console.log("🔒 Posibles causas:");
  console.log("   - El Explorador de archivos tiene abierta la carpeta.");
  console.log("   - Un antivirus está escaneando el archivo.");
  console.log("   - Un proceso zombie de Electron sigue activo.");
  console.log("👉 Cierra todo lo relacionado y vuelve a intentar.");
  process.exit(1);
}

// Si la carpeta de destino ya existe y el .exe no está bloqueado → limpiarla
if (fs.existsSync(outputDir)) {
  console.log("🧹 Limpiando carpeta del build anterior...");
  rimraf.sync(outputDir);
}

// Recrear carpeta limpia
fs.mkdirSync(outputDir, { recursive: true });

console.log(`🚧 Iniciando empaquetado de GPT sin Alzheimer v${version}...`);

builder
  .build({
    config: {
      directories: {
        app: ".", // 👈 ¡Empaqueta desde la raíz!
        output: outputDir,
      },
    },
  })
  .then(() => {
    console.log(`✅ EXE generado correctamente en: ${outputDir}`);
  })
  .catch((err) => {
    console.error("❌ Error al empaquetar:", err);
  });
