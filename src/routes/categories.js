const router = require("express").Router();
const Category = require("../models/Category");
const { authenticate, requireRole } = require("../middleware/auth");

router.get("/", async (req, res) => res.json(await Category.find().sort("nom")));

router.post("/", authenticate, requireRole("admin"), async (req, res) => {
  if (!req.body.nom) return res.status(400).json({ message: "Nom requis" });
  if (await Category.exists({ nom: req.body.nom }))
    return res.status(409).json({ message: "Catégorie déjà existante" });
  res.status(201).json(await Category.create({ nom: req.body.nom }));
});

router.delete("/:id", authenticate, requireRole("admin"), async (req, res) => {
  const cat = await Category.findByIdAndDelete(req.params.id);
  if (!cat) return res.status(404).json({ message: "Catégorie introuvable" });
  res.json({ message: "Catégorie supprimée" });
});

module.exports = router;
