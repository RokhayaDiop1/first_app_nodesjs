require("dotenv").config();
const bcrypt = require("bcryptjs");
const connect = require("../config/db");
const User = require("../models/User");
const Category = require("../models/Category");

(async () => {
  await connect();
  const telephone = process.env.ADMIN_TELEPHONE, mdp = process.env.ADMIN_PASSWORD;
  if (!telephone || !mdp) throw new Error("ADMIN_TELEPHONE et ADMIN_PASSWORD requis");
  if (!(await User.exists({ telephone })))
    await User.create({ nom: "Administratrice", telephone, role: "admin", motDePasse: await bcrypt.hash(mdp, 10) });
  for (const nom of ["Sacs", "Bracelets", "Colliers", "Boucles d'oreilles", "Porte-clés"])
    if (!(await Category.exists({ nom }))) await Category.create({ nom });
  console.log("Admin et catégories prêts");
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
