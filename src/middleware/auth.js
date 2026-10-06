const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Shop = require("../models/Shop");

const secret = () => process.env.JWT_SECRET || "dev-secret";

const signToken = (user) => jwt.sign({ id: user._id }, secret(), { expiresIn: "7d" });

async function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Authentification requise" });
  try {
    const { id } = jwt.verify(token, secret());
    const user = await User.findById(id);
    if (!user) return res.status(401).json({ message: "Utilisateur introuvable" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Token invalide" });
  }
}

const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: "Accès refusé" });

// Charge la boutique de l'artisane connectée
async function loadShop(req, res, next) {
  req.shop = await Shop.findOne({ artisane: req.user._id });
  if (!req.shop) return res.status(404).json({ message: "Boutique introuvable" });
  next();
}

const requireValidatedShop = (req, res, next) =>
  req.shop.statut === "validee"
    ? next()
    : res.status(403).json({ message: "Votre boutique n'a pas encore été validée" });

module.exports = { signToken, authenticate, requireRole, loadShop, requireValidatedShop };
