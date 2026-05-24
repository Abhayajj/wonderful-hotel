const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const wrapAsync = require("../utils/wrapAsync");
const ExpressError = require("../utils/ExpressError");
const { listingSchema } = require("../schema");
const Listing = require("../models/listing");
const { seedHotelsForLocation } = require("../utils/seeder");
const { isLoggedIn, isOwner } = require("../utils/middleware");
const multer = require("multer");
const { cloudinary, storage, cloudinaryEnabled } = require("../config/cloudinary");
const upload = multer({ storage });

const validateListing = (req, res, next) => {
  const { error } = listingSchema.validate(req.body);
  if (error) {
    const errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

// Index Route
router.get("/", wrapAsync(async (req, res) => {
  const { q, category, minPrice, maxPrice, amenities } = req.query;
  const filter = {};

  if (q && q.trim() !== "") {
    const searchFilter = {
      $or: [
        { title: { $regex: q.trim(), $options: "i" } },
        { location: { $regex: q.trim(), $options: "i" } },
        { country: { $regex: q.trim(), $options: "i" } }
      ]
    };
    
    try {
      const count = await Listing.countDocuments(searchFilter);
      if (count < 3) {
        await seedHotelsForLocation(q.trim());
      }
    } catch (seedErr) {
      console.error("❌ On-the-fly seeding failed:", seedErr);
    }

    filter.$or = [
      { title: { $regex: q.trim(), $options: "i" } },
      { location: { $regex: q.trim(), $options: "i" } },
      { country: { $regex: q.trim(), $options: "i" } }
    ];
  }

  if (category && category.trim() !== "" && category !== "All") {
    filter.category = category.trim();
  }

  // Price Filters
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  // Amenities Filter
  if (amenities) {
    const amenitiesArr = Array.isArray(amenities) ? amenities : [amenities];
    filter.amenities = { $all: amenitiesArr };
  }

  const allListings = await Listing.find(filter);
  
  res.render("listings/index", {
    allListings,
    q: q || "",
    activeCategory: category || "All",
    minPrice: minPrice || "",
    maxPrice: maxPrice || "",
    activeAmenities: amenities ? (Array.isArray(amenities) ? amenities : [amenities]) : []
  });
}));

// New Route
router.get("/new", isLoggedIn, (req, res) => {
  res.render("listings/new");
});

// Recommend Route GET
router.get("/recommend", (req, res) => {
  res.render("listings/recommend");
});

// Recommend Route POST
router.post("/recommend", wrapAsync(async (req, res) => {
  const Recommendation = require("../models/recommendation");
  const { name, email, recommendation } = req.body;
  const newRecommendation = new Recommendation({ name, email, recommendation });
  await newRecommendation.save();
  res.render("listings/thankyou", { recommendation: newRecommendation });
}));

// Rated Route
router.get("/rated", wrapAsync(async (req, res) => {
  let listings = await Listing.find({ title: { $in: ["Venic", "Cozy Beachfront Cottage", "Modern Loft in Downtown", "Mountain Retreat"] } });
  if (listings.length === 0) {
    listings = await Listing.find({}).limit(4);
  }
  res.render("listings/rated", { listings });
}));

// Best Route
router.get("/best", wrapAsync(async (req, res) => {
  let listings = await Listing.find({ title: { $in: ["Venic", "Cozy Beachfront Cottage", "Modern Loft in Downtown", "Mountain Retreat"] } });
  if (listings.length === 0) {
    listings = await Listing.find({}).limit(4);
  }
  res.render("listings/best", { listings });
}));

// Show Route
router.get("/:id", wrapAsync(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash("error", "Invalid Listing ID");
    return res.redirect("/listings");
  }

  const matchObj = {};
  if (!req.user || req.user.role !== "admin") {
    matchObj.flagged = { $ne: true };
  }

  const listing = await Listing.findById(id)
    .populate({
      path: "reviews",
      match: matchObj,
      populate: {
        path: "author",
      },
    })
    .populate("owner");
  if (!listing) {
    req.flash("error", "Listing Not Found");
    return res.redirect("/listings");
  }
  const Booking = require("../models/booking");
  const bookings = await Booking.find({
    listing: id,
    status: { $in: ["paid", "pending"] },
    checkOut: { $gt: new Date() }
  }).select("checkIn checkOut");
  res.render("listings/show", { listing, bookings });
}));

// Create Route
router.post("/", isLoggedIn, upload.array("listing[images]", 6), validateListing, wrapAsync(async (req, res, next) => {
  let geometry = {
    type: "Point",
    coordinates: [77.209, 28.613] // default to New Delhi, India
  };

  try {
    const query = `${req.body.listing.location}, ${req.body.listing.country}`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "WonderFull-Hotel-Booking-App"
      }
    });
    const data = await response.json();
    if (data && data.length > 0) {
      geometry = {
        type: "Point",
        coordinates: [parseFloat(data[0].lon), parseFloat(data[0].lat)]
      };
    }
  } catch (err) {
    console.error("❌ Free Nominatim Geocoding Error:", err);
  }

  const newListing = new Listing(req.body.listing);
  newListing.amenities = req.body.listing.amenities || [];
  newListing.owner = req.user._id;
  newListing.geometry = geometry;
  
  if (req.files && req.files.length > 0) {
    newListing.images = req.files.map(f => ({
      url: cloudinaryEnabled ? f.path : `/uploads/${f.filename}`,
      filename: f.filename
    }));
    if (!newListing.image) {
      newListing.image = cloudinaryEnabled ? req.files[0].path : `/uploads/${req.files[0].filename}`;
    }
  }
  
  await newListing.save();
  req.flash("success", "New Listing Created!");
  res.redirect("/listings");
}));

// Edit Route
router.get("/:id/edit", isLoggedIn, isOwner, wrapAsync(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash("error", "Invalid Listing ID");
    return res.redirect("/listings");
  }
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing Not Found");
    return res.redirect("/listings");
  }
  res.render("listings/edit", { listing });
}));

// Update Route
router.put("/:id", isLoggedIn, isOwner, upload.array("listing[images]", 6), validateListing, wrapAsync(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash("error", "Invalid Listing ID");
    return res.redirect("/listings");
  }
  
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing Not Found");
    return res.redirect("/listings");
  }
  
  listing.amenities = req.body.listing.amenities || [];
  Object.assign(listing, req.body.listing);
  
  if (req.files && req.files.length > 0) {
    const newImgs = req.files.map(f => ({
      url: cloudinaryEnabled ? f.path : `/uploads/${f.filename}`,
      filename: f.filename
    }));
    listing.images.push(...newImgs);
    if (!listing.image) {
      listing.image = cloudinaryEnabled ? req.files[0].path : `/uploads/${req.files[0].filename}`;
    }
  }
  
  if (req.body.deleteImages && req.body.deleteImages.length > 0) {
    for (let filename of req.body.deleteImages) {
      if (cloudinaryEnabled) {
        try {
          await cloudinary.uploader.destroy(filename);
        } catch (err) {
          console.error("Cloudinary error on image destroy:", err);
        }
      } else {
        try {
          const fs = require("fs");
          const path = require("path");
          const localPath = path.join(__dirname, "../public/uploads", filename);
          if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
          }
        } catch (err) {
          console.error("Local file unlink error:", err);
        }
      }
    }
    listing.images = listing.images.filter(img => !req.body.deleteImages.includes(img.filename));
    
    // If current main image is deleted, update it to another one or empty
    if (listing.images.length > 0 && (!listing.image || req.body.deleteImages.some(fn => listing.image.includes(fn)))) {
      listing.image = listing.images[0].url;
    } else if (listing.images.length === 0) {
      listing.image = "";
    }
  }
  
  await listing.save();
  req.flash("success", "Listing Updated!");
  res.redirect(`/listings/${id}`);
}));

// Delete Route
router.delete("/:id", isLoggedIn, isOwner, wrapAsync(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash("error", "Invalid Listing ID");
    return res.redirect("/listings");
  }
  
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing Not Found");
    return res.redirect("/listings");
  }
  
  if (listing.images && listing.images.length > 0) {
    for (let img of listing.images) {
      if (cloudinaryEnabled) {
        try {
          await cloudinary.uploader.destroy(img.filename);
        } catch (err) {
          console.error("Cloudinary error on image destroy:", err);
        }
      } else {
        try {
          const fs = require("fs");
          const path = require("path");
          const localPath = path.join(__dirname, "../public/uploads", img.filename);
          if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
          }
        } catch (err) {
          console.error("Local file unlink error:", err);
        }
      }
    }
  }
  
  await Listing.findByIdAndDelete(id);
  req.flash("success", "Listing Deleted!");
  res.redirect("/listings");
}));

module.exports = router;
