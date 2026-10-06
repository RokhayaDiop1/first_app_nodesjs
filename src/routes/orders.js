const router = require("express").Router();
const Order = require("../models/Order");
const Product = require("../models/Product");
const Shop = require("../models/Shop");
const { authenticate, requireRole, loadShop } = require("../middleware/auth");

const rate = () => Number(process.env.COMMISSION_RATE ?? 0.1);
const STATUTS = ["confirmee", "expediee", "livree", "annulee"];

// Décrémente le stock de façon atomique ; renvoie false si insuffisant
async function reserve(item) {
  const q = item.quantite;
  const r = item.variante
    ? await Product.updateOne(
        { _id: item.produit, variantes: { $elemMatch: { _id: item.variante, stock: { $gte: q } } } },
        { $inc: { "variantes.$.stock": -q } })
    : await Product.updateOne({ _id: item.produit, stock: { $gte: q } }, { $inc: { stock: -q } });
  return r.modifiedCount === 1;
}

const release = (item) =>
  item.variante
    ? Product.updateOne({ _id: item.produit, "variantes._id": item.variante }, { $inc: { "variantes.$.stock": item.quantite } })
    : Product.updateOne({ _id: item.produit }, { $inc: { stock: item.quantite } });

// Panier multi-boutiques -> commande principale + une sous-commande par artisane
router.post("/", authenticate, requireRole("cliente"), async (req, res) => {
  const { items, adresseLivraison, modePaiement } = req.body;
  if (!Array.isArray(items) || !items.length || !adresseLivraison?.zone)
    return res.status(400).json({ message: "Articles et zone de livraison requis" });
  if (!["livraison", "wave"].includes(modePaiement))
    return res.status(400).json({ message: "Mode de paiement invalide" });

  const lignes = [];
  for (const { produit, variante, quantite } of items) {
    const p = await Product.findById(produit);
    if (!p || !p.actif) return res.status(400).json({ message: `Produit introuvable : ${produit}` });
    if (!Number.isInteger(quantite) || quantite < 1) return res.status(400).json({ message: "Quantité invalide" });
    let nom = p.nom;
    if (p.variantes.length) {
      const v = p.variantes.id(variante);
      if (!v) return res.status(400).json({ message: `Variante requise pour « ${p.nom} »` });
      nom += ` (${[v.couleur, v.taille].filter(Boolean).join(", ")})`;
    }
    lignes.push({ shop: String(p.shop), item: { produit: p._id, variante: variante || undefined, nom, prix: p.prix, quantite } });
  }

  const parShop = new Map();
  for (const l of lignes) parShop.set(l.shop, [...(parShop.get(l.shop) || []), l.item]);

  const sousCommandes = [];
  for (const [shopId, shopItems] of parShop) {
    const shop = await Shop.findOne({ _id: shopId, statut: "validee" });
    if (!shop) return res.status(400).json({ message: "Une boutique n'est plus disponible" });
    const zone = shop.zonesLivraison.find((z) => z.zone.toLowerCase() === adresseLivraison.zone.toLowerCase());
    if (!zone) return res.status(400).json({ message: `La boutique « ${shop.nom} » ne livre pas à ${adresseLivraison.zone}` });
    const sousTotal = shopItems.reduce((s, i) => s + i.prix * i.quantite, 0);
    const commission = Math.round(sousTotal * rate());
    sousCommandes.push({ shop: shop._id, items: shopItems, sousTotal, fraisLivraison: zone.frais, commission, gainArtisane: sousTotal - commission });
  }

  const reserves = [];
  for (const sc of sousCommandes)
    for (const item of sc.items) {
      if (await reserve(item)) reserves.push(item);
      else {
        await Promise.all(reserves.map(release));
        return res.status(409).json({ message: `Stock insuffisant pour « ${item.nom} »` });
      }
    }

  const total = sousCommandes.reduce((s, sc) => s + sc.sousTotal + sc.fraisLivraison, 0);
  const order = await Order.create({ cliente: req.user._id, sousCommandes, adresseLivraison, modePaiement, total });
  res.status(201).json(order);
});

router.get("/mine", authenticate, requireRole("cliente"), async (req, res) =>
  res.json(await Order.find({ cliente: req.user._id }).sort("-createdAt").populate("sousCommandes.shop", "nom")));

// Sous-commandes reçues par l'artisane
router.get("/shop", authenticate, requireRole("artisane"), loadShop, async (req, res) => {
  const orders = await Order.find({ "sousCommandes.shop": req.shop._id }).sort("-createdAt").populate("cliente", "nom telephone");
  res.json(orders.map((o) => ({
    id: o._id, cliente: o.cliente, adresseLivraison: o.adresseLivraison, modePaiement: o.modePaiement, createdAt: o.createdAt,
    sousCommandes: o.sousCommandes.filter((s) => s.shop.equals(req.shop._id)),
  })));
});

router.patch("/:orderId/sous-commandes/:subId", authenticate, requireRole("artisane"), loadShop, async (req, res) => {
  if (!STATUTS.includes(req.body.statut)) return res.status(400).json({ message: "Statut invalide" });
  const order = await Order.findById(req.params.orderId);
  const sub = order?.sousCommandes.id(req.params.subId);
  if (!sub || !sub.shop.equals(req.shop._id)) return res.status(404).json({ message: "Sous-commande introuvable" });
  if (["livree", "annulee"].includes(sub.statut)) return res.status(409).json({ message: "Sous-commande déjà clôturée" });
  if (req.body.statut === "annulee") await Promise.all(sub.items.map(release));
  sub.statut = req.body.statut;
  // Paiement à la livraison : encaissé quand tout est livré
  if (order.modePaiement === "livraison" && order.sousCommandes.every((s) => s.statut === "livree"))
    order.statutPaiement = "paye";
  await order.save();
  res.json(order);
});

module.exports = router;
