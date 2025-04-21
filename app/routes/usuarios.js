const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs-extra");
const { logReq, logError, logOK } = require("../utils/logger");
const { setUsuarioActual } = require("../utils/estado");

const USUARIOS_DIR = path.join(__dirname, "..", "..", "data", "usuarios");

router.post("/", (req, res) => {
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

  fs.ensureDirSync(userPath);
  setUsuarioActual(nombre);
  logOK("/usuario", { nombre });
  res.json({ ok: true });
});

module.exports = router;
