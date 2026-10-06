const router = require("express").Router();
const Product = require("../models/Product");
const Shop = require("../models/Shop");
const { authenticate, requireRole, loadShop, requireValidatedShop } = require("../middleware/auth");

const artisane = [authenticate, requireRole("artisane"), loadShop, requireValidatedShop];
const FIELDS = ["categorie", "nom", "description", "prix", "photos", "stock", "variantes", "actif"];
const pick = (body) => Object.fromEntries(FIELDS.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

// Catalogue public avec filtres : categorie, artisane (shop), prixMin, prixMax, couleur, q
router.get("/", async (req, res) => {
  const { categorie, shop, prixMin, prixMax, couleur, q } = req.query;
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);

  const validShops = await Shop.find({ statut: "validee" }).distinct("_id");
  const filter = { actif: true, shop: { $in: validShops } };
  if (categorie) filter.categorie = categorie;
  if (shop) filter.shop = validShops.some((id) => id.equals(shop)) ? shop : null;
  if (prixMin || prixMax) filter.prix = {};
  if (prixMin) filter.prix.$gte = Number(prixMin);
  if (prixMax) filter.prix.$lte = Number(prixMax);
  if (couleur) filter["variantes.couleur"] = new RegExp(`^${couleur.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  if (q) filter.nom = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const [produits, total] = await Promise.all([
    Product.find(filter).populate("shop", "nom localisation").populate("categorie", "nom")
      .sort("-createdAt").skip((page - 1) * limit).limit(limit),
    Product.countDocuments(filter),
  ]);
  res.json({ produits, total, page, pages: Math.ceil(total / limit) });
});

router.get("/mine", ...artisane, async (req, res) =>
  res.json(await Product.find({ shop: req.shop._id }).populate("categorie", "nom")));

router.get("/:id", async (req, res) => {
  const p = await Product.findById(req.params.id).populate("shop", "nom localisation statut").populate("categorie", "nom");
  if (!p || !p.actif || p.shop.statut !== "validee") return res.status(404).json({ message: "Produit introuvable" });
  res.json(p);
});

router.post("/", ...artisane, async (req, res) => {
  const { categorie, nom, prix } = req.body;
  if (!categorie || !nom || prix === undefined)
    return res.status(400).json({ message: "Catégorie, nom et prix requis" });
  if (!req.body.photos?.length)
    return res.status(400).json({ message: "Au moins une photo réelle est obligatoire" });
  res.status(201).json(await Product.create({ ...pick(req.body), shop: req.shop._id }));
});

router.put("/:id", ...artisane, async (req, res) => {
  const p = await Product.findOne({ _id: req.params.id, shop: req.shop._id });
  if (!p) return res.status(404).json({ message: "Produit introuvable" });
  p.set(pick(req.body));
  await p.save();
  res.json(p);
});

router.delete("/:id", ...artisane, async (req, res) => {
  const p = await Product.findOneAndDelete({ _id: req.params.id, shop: req.shop._id });
  if (!p) return res.status(404).json({ message: "Produit introuvable" });
  res.json({ message: "Produit supprimé" });
});

module.exports = router;
