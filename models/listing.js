const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const listingSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String },
  price: { type: Number, required: true },
  country: { type: String, required: true },
  location: { type: String, required: true },
  reviews: [{ type: Schema.Types.ObjectId, ref: "Review" }]
});

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;