const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Listing = require("../models/listing");
const Booking = require("../models/booking");
const Review = require("../models/review");
const wrapAsync = require("../utils/wrapAsync");
const { isAdmin } = require("../utils/middleware");

// ─── GET /admin/dashboard ──────────────────────────────────────────────────
router.get(
  "/dashboard",
  isAdmin,
  wrapAsync(async (req, res) => {
    const totalUsers = await User.countDocuments();
    const totalListings = await Listing.countDocuments();
    const totalBookings = await Booking.countDocuments();

    // Calculate total revenue from paid bookings
    const revenueResult = await Booking.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    // Calculate total refunded amount
    const refundResult = await Booking.aggregate([
      { $match: { status: "refunded" } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]);
    const totalRefunded = refundResult.length > 0 ? refundResult[0].total : 0;

    // Recent bookings
    const recentBookings = await Booking.find()
      .populate("listing")
      .populate("user")
      .sort({ createdAt: -1 })
      .limit(10);

    const Review = require("../models/review");
    const totalFlaggedReviews = await Review.countDocuments({ flagged: true });

    // Aggregate platform-wide ad analytics
    const adStatsResult = await User.aggregate([
      {
        $group: {
          _id: null,
          earnings: { $sum: "$adEarnings" },
          impressions: { $sum: "$adImpressions" },
          clicks: { $sum: "$adClicks" }
        }
      }
    ]);
    const totalAdEarnings = adStatsResult.length > 0 ? adStatsResult[0].earnings : 0;
    const totalAdImpressions = adStatsResult.length > 0 ? adStatsResult[0].impressions : 0;
    const totalAdClicks = adStatsResult.length > 0 ? adStatsResult[0].clicks : 0;

    res.render("admin/dashboard", {
      totalUsers,
      totalListings,
      totalBookings,
      totalRevenue,
      totalRefunded,
      recentBookings,
      totalFlaggedReviews,
      totalAdEarnings,
      totalAdImpressions,
      totalAdClicks,
    });
  })
);

// ─── GET /admin/users ───────────────────────────────────────────────────────
router.get(
  "/users",
  isAdmin,
  wrapAsync(async (req, res) => {
    const allUsers = await User.find().sort({ createdAt: -1 });
    res.render("admin/users", { allUsers });
  })
);

// ─── PUT /admin/users/:id/toggle-admin ──────────────────────────────────────
router.put(
  "/users/:id/toggle-admin",
  isAdmin,
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      req.flash("error", "User not found.");
      return res.redirect("/admin/users");
    }
    // Don't allow changing your own role
    if (user._id.equals(req.user._id)) {
      req.flash("error", "You cannot change your own admin status.");
      return res.redirect("/admin/users");
    }
    user.role = user.role === "admin" ? "user" : "admin";
    await user.save();
    req.flash("success", `${user.username} is now ${user.role === "admin" ? "an Admin" : "a regular User"}.`);
    res.redirect("/admin/users");
  })
);

// ─── DELETE /admin/users/:id ────────────────────────────────────────────────
router.delete(
  "/users/:id",
  isAdmin,
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    if (req.user._id.equals(id)) {
      req.flash("error", "You cannot delete your own account.");
      return res.redirect("/admin/users");
    }
    // Delete user's listings and their reviews
    const userListings = await Listing.find({ owner: id });
    for (let listing of userListings) {
      await Listing.findByIdAndDelete(listing._id);
    }
    // Delete user's reviews
    await Review.deleteMany({ author: id });
    // Delete user's bookings
    await Booking.deleteMany({ user: id });
    // Delete the user
    await User.findByIdAndDelete(id);

    req.flash("success", "User and all associated data deleted.");
    res.redirect("/admin/users");
  })
);

// ─── GET /admin/listings ────────────────────────────────────────────────────
router.get(
  "/listings",
  isAdmin,
  wrapAsync(async (req, res) => {
    const allListings = await Listing.find()
      .populate("owner")
      .sort({ createdAt: -1 });
    res.render("admin/listings", { allListings });
  })
);

// ─── DELETE /admin/listings/:id ─────────────────────────────────────────────
router.delete(
  "/listings/:id",
  isAdmin,
  wrapAsync(async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (listing && listing.images && listing.images.length > 0) {
      const { cloudinary } = require("../config/cloudinary");
      for (let img of listing.images) {
        try {
          await cloudinary.uploader.destroy(img.filename);
        } catch (err) {
          console.error("Cloudinary error on admin delete:", err);
        }
      }
    }
    await Listing.findByIdAndDelete(req.params.id);
    req.flash("success", "Listing deleted by admin.");
    res.redirect("/admin/listings");
  })
);

// ─── GET /admin/bookings ────────────────────────────────────────────────────
router.get(
  "/bookings",
  isAdmin,
  wrapAsync(async (req, res) => {
    const allBookings = await Booking.find()
      .populate("listing")
      .populate("user")
      .sort({ createdAt: -1 });
    res.render("admin/bookings", { allBookings });
  })
);

// ─── GET /admin/reviews (Flagged Reviews Queue) ──────────────────────────────
router.get(
  "/reviews",
  isAdmin,
  wrapAsync(async (req, res) => {
    const Review = require("../models/review");
    const flaggedReviews = await Review.find({ flagged: true })
      .populate("author", "username email")
      .sort({ createdAt: -1 });

    const enhancedReviews = [];
    for (let review of flaggedReviews) {
      const parentListing = await Listing.findOne({ reviews: review._id }).select("title location country");
      enhancedReviews.push({
        ...review.toObject(),
        listing: parentListing
      });
    }

    res.render("admin/reviews", { flaggedReviews: enhancedReviews });
  })
);

// ─── POST /admin/reviews/:reviewId/approve ───────────────────────────────────
router.post(
  "/reviews/:reviewId/approve",
  isAdmin,
  wrapAsync(async (req, res) => {
    const Review = require("../models/review");
    const review = await Review.findById(req.params.reviewId);
    if (!review) {
      req.flash("error", "Review not found.");
      return res.redirect("/admin/reviews");
    }
    review.flagged = false;
    review.flaggedReason = "";
    await review.save();
    req.flash("success", "Review approved and flag dismissed successfully! 🎉");
    res.redirect("/admin/reviews");
  })
);

// ─── DELETE /admin/reviews/:reviewId ─────────────────────────────────────────
router.delete(
  "/reviews/:reviewId",
  isAdmin,
  wrapAsync(async (req, res) => {
    const { reviewId } = req.params;
    const Review = require("../models/review");
    await Listing.updateOne({ reviews: reviewId }, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);
    req.flash("success", "Flagged review deleted permanently.");
    res.redirect("/admin/reviews");
  })
);

module.exports = router;
