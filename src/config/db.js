const mongoose = require("mongoose");

module.exports = (uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/marketplace_artisanes") =>
  mongoose.connect(uri);
