const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 3611;

app.use(cors());
app.use(express.json());

const authUser = require("./middleware/authUser");
const usuarioRoutes = require("./routes/usuarios");

app.use(authUser);
app.use("/usuario", usuarioRoutes);

app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
