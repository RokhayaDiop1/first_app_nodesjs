const mongoose = require("mongoose");

const varianteSchema = new mongoose.Schema({
  couleur: String,
  taille: String,
  stock: { type: Number, min: 0, default: 0 },
});

const productSchema = new mongoose.Schema(
  {
    shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    categorie: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    nom: { type: String, required: true, trim: true },
    description: String,
    prix: { type: Number, required: true, min: 0 },
    photos: [String],
    stock: { type: Number, min: 0, default: 0 }, // utilisé quand il n'y a pas de variantes
    variantes: [varianteSchema],
    actif: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
