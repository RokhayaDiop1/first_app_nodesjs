const router = require("express").Router();
const Shop = require("../models/Shop");
const Order = require("../models/Order");
const { authenticate, requireRole, loadShop } = require("../middleware/auth");

router.get("/", async (req, res) => res.json(await Shop.find({ statut: "validee" }).sort("nom")));

// Espace artisane (déclaré avant /:id)
const artisane = [authenticate, requireRole("artisane"), loadShop];

router.get("/me", ...artisane, (req, res) => res.json(req.shop));

router.put("/me", ...artisane, async (req, res) => {
  for (const k of ["nom", "photo", "bio", "localisation", "zonesLivraison"])
    if (req.body[k] !== undefined) req.shop[k] = req.body[k];
  await req.shop.save();
  res.json(req.shop);
});

// Tableau de bord simple : ventes et gains
router.get("/me/stats", ...artisane, async (req, res) => {
  const orders = await Order.find({ "sousCommandes.shop": req.shop._id });
  const stats = { commandes: 0, enAttente: 0, ventes: 0, gains: 0 };
  for (const o of orders)
    for (const s of o.sousCommandes) {
      if (!s.shop.equals(req.shop._id) || s.statut === "annulee") continue;
      stats.commandes++;
      if (s.statut === "en_attente") stats.enAttente++;
      stats.ventes += s.sousTotal;
      if (s.statut === "livree") stats.gains += s.gainArtisane;
    }
  res.json(stats);
});

router.get("/:id", async (req, res) => {
  const shop = await Shop.findOne({ _id: req.params.id, statut: "validee" });
  if (!shop) return res.status(404).json({ message: "Boutique introuvable" });
  res.json(shop);
});

module.exports = router;
