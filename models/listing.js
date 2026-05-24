const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const listingSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String },
  images: [
    {
      url: String,
      filename: String,
    },
  ],
  price: { type: Number, required: true },
  country: { type: String, required: true },
  location: { type: String, required: true },
  category: {
    type: String,
    enum: [
      "Beach",
      "Mountain",
      "City",
      "Countryside",
      "Luxury",
      "Budget",
      "Treehouse",
      "Historic",
      "Other",
    ],
    default: "Other",
  },
  reviews: [{ type: Schema.Types.ObjectId, ref: "Review" }],
  owner: { type: Schema.Types.ObjectId, ref: "User" },
  amenities: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  geometry: {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
});

// Cascade delete reviews when a listing is deleted
listingSchema.post("findOneAndDelete", async (listing) => {
  if (listing) {
    const Review = require("./review");
    await Review.deleteMany({ _id: { $in: listing.reviews } });
  }
});

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;