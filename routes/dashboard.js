const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Listing = require("../models/listing");
const Booking = require("../models/booking");
const User = require("../models/user");
const wrapAsync = require("../utils/wrapAsync");
const { isLoggedIn } = require("../utils/middleware");

// ─── GET /dashboard ─────────────────────────────────────────────────────────
router.get(
  "/dashboard",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    // Find all listings owned by this user
    const listings = await Listing.find({ owner: req.user._id });
    const listingIds = listings.map((l) => l._id);

    // Find all bookings for those listings
    const bookings = await Booking.find({ listing: { $in: listingIds } })
      .populate("listing")
      .populate("user")
      .sort({ createdAt: -1 });

    // Calculate metrics
    const totalListings = listings.length;
    const totalBookingsCount = bookings.length;
    
    const activeReservations = bookings.filter(
      (b) => b.status === "paid" && new Date(b.checkOut) >= new Date()
    ).length;

    // Total Earnings = Paid bookings + cancellation fee deductions from refunds
    const totalEarnings = bookings.reduce((sum, b) => {
      if (b.status === "paid") {
        return sum + b.totalPrice;
      } else if (b.status === "refunded" || b.status === "cancelled") {
        return sum + (b.cancellationFee || 0);
      }
      return sum;
    }, 0);

    // Calculate last 6 months earnings for Chart.js
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const chartLabels = [];
    const chartData = [];

    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      chartLabels.push(monthNames[d.getMonth()] + " " + d.getFullYear().toString().slice(2));
      chartData.push(0);
    }

    bookings.forEach((b) => {
      if (b.status === "paid" || b.status === "refunded") {
        const bDate = new Date(b.createdAt);
        const amount = b.status === "paid" ? b.totalPrice : (b.cancellationFee || 0);

        for (let i = 0; i < 6; i++) {
          const parts = chartLabels[i].split(" ");
          const labelMonthIndex = monthNames.indexOf(parts[0]);
          const labelYear = parseInt(parts[1]);

          if (bDate.getMonth() === labelMonthIndex && (bDate.getFullYear() % 100) === labelYear) {
            chartData[i] += amount;
            break;
          }
        }
      }
    });

    const hostUser = await User.findById(req.user._id);

    res.render("dashboard/index", {
      listings,
      bookings,
      totalListings,
      totalBookingsCount,
      activeReservations,
      totalEarnings,
      chartLabels,
      chartData,
      adEarnings: hostUser.adEarnings || 0,
      adImpressions: hostUser.adImpressions || 0,
      adClicks: hostUser.adClicks || 0
    });
  })
);

// ─── POST /dashboard/ads/track ──────────────────────────────────────────────
router.post(
  "/dashboard/ads/track",
  wrapAsync(async (req, res) => {
    const { type, listingId } = req.body;

    // 1. Basic validation
    if (!type || (type !== "impression" && type !== "click")) {
      return res.status(400).json({ error: "Invalid event type" });
    }

    // 2. Prevent click/impression spamming (Rate Limiting via Session)
    const now = Date.now();
    if (!req.session.adLimits) {
      req.session.adLimits = { lastImpression: 0, lastClick: 0, viewedListings: {} };
    }

    if (type === "impression") {
      // Limit to 1 impression per 3 seconds per session
      if (now - req.session.adLimits.lastImpression < 3000) {
        return res.status(429).json({ error: "Too many impression requests" });
      }
      
      // Deduplicate impressions per listing in the same session (max 1 per 5 minutes per listing)
      const targetIdKey = listingId || "global";
      const lastViewed = req.session.adLimits.viewedListings[targetIdKey];
      if (lastViewed && (now - lastViewed < 5 * 60 * 1000)) {
        return res.json({ success: true, message: "Duplicate impression ignored" });
      }
      
      req.session.adLimits.lastImpression = now;
      req.session.adLimits.viewedListings[targetIdKey] = now;
    }

    if (type === "click") {
      // Limit to 1 click per 5 seconds per session
      if (now - req.session.adLimits.lastClick < 5000) {
        return res.status(429).json({ error: "Too many click requests" });
      }
      req.session.adLimits.lastClick = now;
    }

    let targetUserId = null;

    if (listingId && mongoose.Types.ObjectId.isValid(listingId)) {
      const listing = await Listing.findById(listingId);
      if (listing) {
        targetUserId = listing.owner;
      }
    }

    // Fallback to logged-in user if no listing owner, or admin
    if (!targetUserId && req.user) {
      targetUserId = req.user._id;
    }

    if (!targetUserId) {
      const admin = await User.findOne({ username: "admin" });
      if (admin) targetUserId = admin._id;
    }

    if (targetUserId) {
      // 3. Security: Prevent owner self-clicking/viewing their own ads to generate revenue
      if (req.user && req.user._id.equals(targetUserId)) {
        return res.json({ success: true, message: "Self-views or self-clicks are not monetized" });
      }

      const user = await User.findById(targetUserId);
      if (user) {
        if (type === "impression") {
          user.adImpressions = (user.adImpressions || 0) + 1;
          user.adEarnings = (user.adEarnings || 0) + 0.50; // ₹0.50 per impression
        } else if (type === "click") {
          user.adClicks = (user.adClicks || 0) + 1;
          user.adEarnings = (user.adEarnings || 0) + 5.00; // ₹5.00 per click
        }
        await user.save();
      }
    }

    res.json({ success: true });
  })
);

module.exports = router;
