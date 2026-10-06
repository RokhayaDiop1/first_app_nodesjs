const mongoose = require("mongoose");

module.exports = mongoose.model(
  "Category",
  new mongoose.Schema({
    nom: { type: String, required: true, unique: true, trim: true },
  })
);
