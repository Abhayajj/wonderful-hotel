
const mongoose = require("mongoose");
const { Schema } = mongoose;

const reviewSchema = new Schema({
  comment: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  createdAt: { type: Date, default: Date.now },
  author: { type: Schema.Types.ObjectId, ref: "User" },
  reply: {
    text: { type: String },
    repliedAt: { type: Date },
  },
  flagged: { type: Boolean, default: false },
  flaggedReason: { type: String, default: "" },
});

module.exports = mongoose.model("Review", reviewSchema);