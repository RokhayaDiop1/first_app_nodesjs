const { test, before, after } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../app");
const User = require("../src/models/User");
const Category = require("../src/models/Category");

let mongod;
before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});
after(async () => {
  await mongoose.disconnect();
  await mongod?.stop();
});

test("parcours complet : artisane -> validation -> commande multi-boutiques", async () => {
  const api = request(app);
  await User.create({ nom: "Admin", telephone: "700", role: "admin", motDePasse: await bcrypt.hash("secret1", 10) });
  const cat = await Category.create({ nom: "Sacs" });
  const admin = (await api.post("/api/auth/login").send({ telephone: "700", motDePasse: "secret1" })).body.token;

  const reg = async (tel, nom) =>
    (await api.post("/api/auth/register").send({
      nom, telephone: tel, motDePasse: "secret1", role: "artisane",
      boutique: { nom: `Boutique ${nom}`, zonesLivraison: [{ zone: "Kaolack", frais: 1000 }] },
    })).body;
  const a1 = await reg("701", "Awa"), a2 = await reg("702", "Fatou");

  // Produit refusé tant que la boutique n'est pas validée
  const body = { categorie: cat._id, nom: "Sac perlé", prix: 10000, photos: ["u"], stock: 5 };
  await api.post("/api/products").set("Authorization", `Bearer ${a1.token}`).send(body).expect(403);

  for (const a of [a1, a2])
    await api.patch(`/api/admin/shops/${a.boutique._id}`).set("Authorization", `Bearer ${admin}`).send({ statut: "validee" }).expect(200);

  const p1 = (await api.post("/api/products").set("Authorization", `Bearer ${a1.token}`).send(body).expect(201)).body;
  const p2 = (await api.post("/api/products").set("Authorization", `Bearer ${a2.token}`)
    .send({ ...body, nom: "Collier", prix: 5000, stock: 0, variantes: [{ couleur: "Rouge", stock: 3 }] }).expect(201)).body;

  const cat1 = await api.get("/api/products?couleur=rouge").expect(200);
  assert.equal(cat1.body.total, 1);

  const cli = (await api.post("/api/auth/register").send({ nom: "Cli", telephone: "703", motDePasse: "secret1" })).body.token;
  const order = (await api.post("/api/orders").set("Authorization", `Bearer ${cli}`).send({
    items: [{ produit: p1._id, quantite: 2 }, { produit: p2._id, variante: p2.variantes[0]._id, quantite: 1 }],
    adresseLivraison: { zone: "Kaolack" }, modePaiement: "livraison",
  }).expect(201)).body;
  assert.equal(order.sousCommandes.length, 2);
  assert.equal(order.total, 20000 + 1000 + 5000 + 1000);
  assert.equal(order.sousCommandes[0].commission, 2000);

  // stock insuffisant
  await api.post("/api/orders").set("Authorization", `Bearer ${cli}`).send({
    items: [{ produit: p1._id, quantite: 4 }], adresseLivraison: { zone: "Kaolack" }, modePaiement: "wave",
  }).expect(409);

  const sub = order.sousCommandes[0]._id;
  await api.patch(`/api/orders/${order._id}/sous-commandes/${sub}`).set("Authorization", `Bearer ${a1.token}`).send({ statut: "livree" }).expect(200);
  const stats = (await api.get("/api/shops/me/stats").set("Authorization", `Bearer ${a1.token}`).expect(200)).body;
  assert.equal(stats.gains, 18000);
  // une artisane ne touche pas la sous-commande d'une autre
  await api.patch(`/api/orders/${order._id}/sous-commandes/${sub}`).set("Authorization", `Bearer ${a2.token}`).send({ statut: "livree" }).expect(404);
});
