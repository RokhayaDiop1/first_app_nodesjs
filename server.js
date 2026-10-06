require("dotenv").config();
const http = require("http");
const app = require("./app");
const connect = require("./src/config/db");

const port = process.env.PORT || 3000;

connect()
  .then(() => http.createServer(app).listen(port, () => console.log(`API sur le port ${port}`)))
  .catch((err) => {
    console.error("Connexion MongoDB impossible :", err.message);
    process.exit(1);
  });
