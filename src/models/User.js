const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true },
    telephone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    motDePasse: { type: String, required: true, select: false },
    role: { type: String, enum: ["cliente", "artisane", "admin"], default: "cliente" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
