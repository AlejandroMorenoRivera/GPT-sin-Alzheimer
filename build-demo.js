const builder = require("electron-builder");
const path = require("path");
const fs = require("fs");
const rimraf = require("rimraf");
const pkg = require("./package.json");

const version = pkg.version;
const outputDir = path.join(
  __dirname,
  "../builds",
  `GPT-sin-Alzheimer-v${version}`
);
const unpackedDir = path.join(outputDir, "win-unpacked");
const outputExe = path.join(unpackedDir, "GPT sin Alzheimer.exe");

// ✅ Verifica si el EXE está en uso
function isExeLocked(filePath) {
  try {
    const fd = fs.openSync(filePath, "r+");
    fs.closeSync(fd);
    return false;
  } catch {
    return true;
  }
}

// 🧹 Cancela si está en uso
if (fs.existsSync(outputExe) && isExeLocked(outputExe)) {
  console.log("❌ El EXE está en uso. Cierra la app o el explorador.");
  process.exit(1);
}

// 🧼 Limpia carpeta anterior
if (fs.existsSync(outputDir)) {
  console.log("🧹 Limpiando carpeta del build anterior...");
  rimraf.sync(outputDir);
}

// 📁 Crea carpeta nueva
fs.mkdirSync(outputDir, { recursive: true });

// 🔍 Debug: muestra lo que ve desde la raíz
console.log("📁 Contenido de la raíz:", fs.readdirSync(__dirname));

console.log(`🚧 Iniciando empaquetado de GPT sin Alzheimer v${version}...`);

builder
  .build({
    config: {
      directories: {
        app: ".", // 👈 raíz como base del proyecto
        output: outputDir,
      },
      asar: false,
      extraMetadata: {
        main: "desktop/main.js", // 👈 entrada principal
      },
      files: [
        "app/**/*",
        "desktop/**/*",
        "config/**/*",
        "data/**/*",
        "icon/**/*",
        "windows/**/*",
        "package.json",
        "README.md",
        "PRIVACY.md",
      ],
      win: {
        icon: "icon/gpt-sin-alzheimer.ico",
        target: "nsis",
      },
    },
  })
  .then(() => {
    console.log(`✅ EXE generado correctamente en: ${outputDir}`);
  })
  .catch((err) => {
    console.error("❌ Error al empaquetar:", err);
  });
