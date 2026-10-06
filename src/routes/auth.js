const router = require("express").Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Shop = require("../models/Shop");
const { signToken, authenticate } = require("../middleware/auth");

// Inscription cliente ou artisane (l'artisane fournit aussi sa boutique, validée ensuite par l'admin)
router.post("/register", async (req, res) => {
  const { nom, telephone, email, motDePasse, role = "cliente", boutique } = req.body;
  if (!nom || !telephone || !motDePasse || motDePasse.length < 6)
    return res.status(400).json({ message: "Nom, téléphone et mot de passe (6 caractères min.) requis" });
  if (!["cliente", "artisane"].includes(role))
    return res.status(400).json({ message: "Rôle invalide" });
  if (role === "artisane" && !boutique?.nom)
    return res.status(400).json({ message: "Le nom de la boutique est requis" });
  if (await User.exists({ telephone }))
    return res.status(409).json({ message: "Ce numéro est déjà utilisé" });

  const user = await User.create({
    nom, telephone, email, role,
    motDePasse: await bcrypt.hash(motDePasse, 10),
  });
  let shop;
  if (role === "artisane") {
    const { nom: shopNom, photo, bio, localisation, zonesLivraison } = boutique;
    shop = await Shop.create({ artisane: user._id, nom: shopNom, photo, bio, localisation, zonesLivraison });
  }
  res.status(201).json({
    token: signToken(user),
    user: { id: user._id, nom, telephone, role },
    boutique: shop,
  });
});

router.post("/login", async (req, res) => {
  const { telephone, motDePasse } = req.body;
  const user = await User.findOne({ telephone }).select("+motDePasse");
  if (!user || !(await bcrypt.compare(motDePasse || "", user.motDePasse)))
    return res.status(401).json({ message: "Identifiants incorrects" });
  res.json({ token: signToken(user), user: { id: user._id, nom: user.nom, telephone, role: user.role } });
});

router.get("/me", authenticate, (req, res) => res.json({ user: req.user }));

module.exports = router;
