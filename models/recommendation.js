const mongoose = require("mongoose");
const { Schema } = mongoose;

const recommendationSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  recommendation: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Recommendation", recommendationSchema);
