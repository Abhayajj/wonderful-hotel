const express = require("express");
const router = express.Router(); // Correct initialization of router
const mongoose = require("mongoose"); // Import mongoose
const wrapAsync = require("../utils/wrapAsync");
const ExpressError = require("../utils/ExpressError");
const { listingSchema } = require("../schema");
const Listing = require("../models/listing");

const validateListing = (req, res, next) => {
  const { error } = listingSchema.validate(req.body);
  if (error) {
    const errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(404, errMsg);
  } else {
    next();
  }
};

// Index Route
router.get("/", wrapAsync(async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index", { allListings });
}));

// New Route
router.get("/new", (req, res) => {
  res.render("listings/new");
});

// Recommend Route
router.get("/recommend", (req, res) => {
  res.render("listings/recommend");
});

// Rated Route
router.get("/rated", (req, res) => {
  res.render("listings/rated");
});

// Best Route
router.get("/best", (req, res) => {
  res.render("listings/best");
});

// Show Route
router.get("/:id", wrapAsync(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ExpressError(404, "Invalid Listing ID");
  }
  const listing = await Listing.findById(id).populate('reviews');
  if (!listing) {
    throw new ExpressError(404, "Listing Not Found");
  }
  res.render("listings/show", { listing });
}));

// Create Route
router.post("/", validateListing, wrapAsync(async (req, res, next) => {
  const newListing = new Listing(req.body.listing);
  await newListing.save();
  res.redirect("/listings");
}));

// Edit Route
router.get("/:id/edit", wrapAsync(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ExpressError(404, "Invalid Listing ID");
  }
  const listing = await Listing.findById(id);
  if (!listing) {
    throw new ExpressError(404, "Listing Not Found");
  }
  res.render("listings/edit", { listing });
}));

// Update Route
router.put("/:id", validateListing, wrapAsync(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ExpressError(404, "Invalid Listing ID");
  }
  const updatedListing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });
  if (!updatedListing) {
    throw new ExpressError(404, "Listing Not Found");
  }
  res.redirect(`/listings/${id}`);
}));

// Delete Route
router.delete("/:id", wrapAsync(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ExpressError(404, "Invalid Listing ID");
  }
  const deletedListing = await Listing.findByIdAndDelete(id);
  if (!deletedListing) {
    throw new ExpressError(404, "Listing Not Found");
  }
  res.redirect("/listings");
}));

module.exports = router;
