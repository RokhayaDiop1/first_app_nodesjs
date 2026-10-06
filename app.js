const express = require("express");

const app = express();
app.use(express.json());

app.get("/", (req, res) => res.json({ message: "API Marketplace des artisanes" }));
app.use("/api/auth", require("./src/routes/auth"));
app.use("/api/categories", require("./src/routes/categories"));
app.use("/api/shops", require("./src/routes/shops"));
app.use("/api/products", require("./src/routes/products"));
app.use("/api/orders", require("./src/routes/orders"));
app.use("/api/admin", require("./src/routes/admin"));

app.use((req, res) => res.status(404).json({ message: "Route introuvable" }));

app.use((err, req, res, next) => {
  if (err.name === "ValidationError" || err.name === "CastError")
    return res.status(400).json({ message: err.message });
  console.error(err);
  res.status(500).json({ message: "Erreur serveur" });
});

module.exports = app;
