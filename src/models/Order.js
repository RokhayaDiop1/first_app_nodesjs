const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    produit: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    variante: mongoose.Schema.Types.ObjectId,
    nom: String,
    prix: Number,
    quantite: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

// Une sous-commande par artisane, avec son propre statut d'expédition
const subOrderSchema = new mongoose.Schema({
  shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
  items: [itemSchema],
  sousTotal: Number,
  fraisLivraison: Number,
  commission: Number,
  gainArtisane: Number,
  statut: {
    type: String,
    enum: ["en_attente", "confirmee", "expediee", "livree", "annulee"],
    default: "en_attente",
  },
});

const orderSchema = new mongoose.Schema(
  {
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sousCommandes: [subOrderSchema],
    adresseLivraison: { zone: { type: String, required: true }, adresse: String, telephone: String },
    modePaiement: { type: String, enum: ["livraison", "wave"], required: true },
    statutPaiement: { type: String, enum: ["en_attente", "paye"], default: "en_attente" },
    total: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
