const { getUsuarioActual } = require("../utils/estado");
const { logError } = require("../utils/logger");

module.exports = function authUser(req, res, next) {
  if (["/usuario", "/usuarios"].includes(req.path)) return next();

  const usuario = getUsuarioActual();
  if (!usuario) {
    logError(req.path, 400, "No hay usuario seleccionado");
    return res.status(400).json({ error: "No hay usuario seleccionado" });
  }

  req.usuario = usuario;
  next();
};
