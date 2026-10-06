const router = require("express").Router();
const Shop = require("../models/Shop");
const Product = require("../models/Product");
const { authenticate, requireRole } = require("../middleware/auth");

router.use(authenticate, requireRole("admin"));

router.get("/shops", async (req, res) =>
  res.json(await Shop.find(req.query.statut ? { statut: req.query.statut } : {}).populate("artisane", "nom telephone")));

router.patch("/shops/:id", async (req, res) => {
  if (!["validee", "rejetee", "en_attente"].includes(req.body.statut))
    return res.status(400).json({ message: "Statut invalide" });
  const shop = await Shop.findByIdAndUpdate(req.params.id, { statut: req.body.statut }, { new: true });
  if (!shop) return res.status(404).json({ message: "Boutique introuvable" });
  res.json(shop);
});

// Modération : masquer / réactiver un produit
router.patch("/products/:id", async (req, res) => {
  const p = await Product.findByIdAndUpdate(req.params.id, { actif: !!req.body.actif }, { new: true });
  if (!p) return res.status(404).json({ message: "Produit introuvable" });
  res.json(p);
});

module.exports = router;
