const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema(
  {
    artisane: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    nom: { type: String, required: true, trim: true },
    photo: String,
    bio: String,
    localisation: String,
    // Zones desservies et frais de livraison gérés par l'artisane (Kaolack, Dakar, national...)
    zonesLivraison: [{ zone: { type: String, required: true }, frais: { type: Number, min: 0, default: 0 } }],
    statut: { type: String, enum: ["en_attente", "validee", "rejetee"], default: "en_attente" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Shop", shopSchema);
