const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Listing = require("../models/listing");
const Booking = require("../models/booking");
const wrapAsync = require("../utils/wrapAsync");
const { isLoggedIn } = require("../utils/middleware");

// Initialize Razorpay only if keys are provided
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const razorpayEnabled =
  RAZORPAY_KEY_ID.trim().length > 5 && RAZORPAY_KEY_SECRET.trim().length > 5;

let razorpay = null;
if (razorpayEnabled) {
  const Razorpay = require("razorpay");
  razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });
}

// ─── POST /listings/:id/book ────────────────────────────────────────────────
// Creates a Razorpay Order (or simulates if no keys configured)
router.post(
  "/listings/:id/book",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const bookingData = req.body.booking;

    if (!bookingData || !bookingData.checkIn || !bookingData.checkOut) {
      req.flash("error", "Please select both check-in and check-out dates.");
      return res.redirect(`/listings/${id}`);
    }

    const { checkIn, checkOut } = bookingData;

    const listing = await Listing.findById(id);
    if (!listing) {
      req.flash("error", "Listing not found!");
      return res.redirect("/listings");
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (isNaN(checkInDate) || isNaN(checkOutDate)) {
      req.flash("error", "Invalid dates provided.");
      return res.redirect(`/listings/${id}`);
    }
    if (checkInDate >= checkOutDate) {
      req.flash("error", "Check-out date must be after check-in date.");
      return res.redirect(`/listings/${id}`);
    }

    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    const totalPrice = nights * listing.price;

    // Check for conflicting bookings
    const conflictingBooking = await Booking.findOne({
      listing: id,
      status: { $in: ["paid", "pending"] },
      checkIn: { $lt: checkOutDate },
      checkOut: { $gt: checkInDate }
    });

    if (conflictingBooking) {
      req.flash("error", "The selected dates are already booked! Please choose different dates.");
      return res.redirect(`/listings/${id}`);
    }

    // ── RAZORPAY ORDER CREATION ──
    if (razorpay) {
      try {
        const order = await razorpay.orders.create({
          amount: totalPrice * 100, // paise
          currency: "INR",
          receipt: `booking_${Date.now()}`,
          notes: {
            listing_id: listing._id.toString(),
            listing_title: listing.title,
            user_id: req.user._id.toString(),
            checkIn,
            checkOut,
            nights: nights.toString(),
          },
        });

        // Render a page that opens Razorpay checkout modal
        return res.render("bookings/checkout", {
          order,
          listing,
          checkIn,
          checkOut,
          nights,
          totalPrice,
          razorpayKeyId: RAZORPAY_KEY_ID,
          user: req.user,
          adminUpiId: process.env.ADMIN_UPI_ID || "wonderfull@okaxis",
          adminUpiName: process.env.ADMIN_UPI_NAME || "WonderFull Stays",
          adminUpiQrImage: process.env.ADMIN_UPI_QR_IMAGE || "",
        });
      } catch (err) {
        console.error("Razorpay Error:", err);
        const errMsg = err.description || (err.error && err.error.description) || err.message || "Payment order creation failed";
        req.flash("error", `Payment error: ${errMsg}`);
        return res.redirect(`/listings/${id}`);
      }
    }

    // ── RENDER CHECKOUT PAGE FOR DEMO MODE ──
    return res.render("bookings/checkout", {
      order: null,
      listing,
      checkIn,
      checkOut,
      nights,
      totalPrice,
      razorpayKeyId: "",
      user: req.user,
      adminUpiId: process.env.ADMIN_UPI_ID || "wonderfull@okaxis",
      adminUpiName: process.env.ADMIN_UPI_NAME || "WonderFull Stays",
      adminUpiQrImage: process.env.ADMIN_UPI_QR_IMAGE || "",
    });
  })
);

// ─── POST /bookings/verify ──────────────────────────────────────────────────
// Called by frontend after Razorpay payment succeeds — verifies the signature
router.post(
  "/bookings/verify",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      listing_id,
      checkIn,
      checkOut,
      totalPrice,
    } = req.body;

    // Verify HMAC SHA256 signature
    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      req.flash("error", "Payment verification failed. Please contact support.");
      return res.redirect("/listings");
    }

    // Idempotency — avoid duplicate bookings on retry
    let booking = await Booking.findOne({ paymentId: razorpay_payment_id });

    if (!booking) {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);

      // Check for overlap once more in case it got booked while user was on checkout page
      const conflictingBooking = await Booking.findOne({
        listing: listing_id,
        status: { $in: ["paid", "pending"] },
        checkIn: { $lt: checkOutDate },
        checkOut: { $gt: checkInDate }
      });

      if (conflictingBooking) {
        req.flash("error", "These dates were booked by someone else during checkout! We will initiate a refund. Please contact support.");
        return res.redirect("/listings");
      }

      booking = new Booking({
        listing: listing_id,
        user: req.user._id,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        totalPrice: Number(totalPrice),
        paymentId: razorpay_payment_id,
        status: "paid",
      });
      await booking.save();
      req.flash("success", "Payment verified! Your stay has been booked. 🎉");
    }

    return res.redirect(`/bookings/success?booking_id=${booking._id}`);
  })
);

// ─── GET /bookings/success ──────────────────────────────────────────────────
router.get(
  "/bookings/success",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const { booking_id } = req.query;

    if (!booking_id) {
      req.flash("error", "No booking found.");
      return res.redirect("/listings");
    }

    const booking = await Booking.findById(booking_id).populate("listing");
    if (!booking || !booking.user.equals(req.user._id)) {
      req.flash("error", "Booking not found.");
      return res.redirect("/listings");
    }

    return res.render("bookings/success", { booking, razorpayEnabled });
  })
);

// ─── POST /bookings/upi-confirm ─────────────────────────────────────────────
router.post(
  "/bookings/upi-confirm",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const { listing_id, checkIn, checkOut, totalPrice, upi_utr } = req.body;

    if (!listing_id || !checkIn || !checkOut || !totalPrice) {
      req.flash("error", "Invalid booking data.");
      return res.redirect("/listings");
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    // Double-booking check
    const conflictingBooking = await Booking.findOne({
      listing: listing_id,
      status: { $in: ["paid", "pending"] },
      checkIn: { $lt: checkOutDate },
      checkOut: { $gt: checkInDate }
    });

    if (conflictingBooking) {
      req.flash("error", "These dates are already booked! Please select a different date range.");
      return res.redirect(`/listings/${listing_id}`);
    }

    const simulatedTxnId = upi_utr
      ? `upi_utr_${upi_utr}`
      : `upi_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const booking = new Booking({
      listing: listing_id,
      user: req.user._id,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      totalPrice: Number(totalPrice),
      paymentId: simulatedTxnId,
      status: "paid",
    });

    await booking.save();
    req.flash("success", "UPI Payment verified successfully! Stay booked. 🎉");
    return res.redirect(`/bookings/success?booking_id=${booking._id}`);
  })
);

// ─── GET /bookings/my-trips ─────────────────────────────────────────────────
router.get(
  "/bookings/my-trips",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const bookings = await Booking.find({ user: req.user._id })
      .populate("listing")
      .sort({ createdAt: -1 });

    // Calculate cancellation details dynamically for UI display
    const enhancedBookings = bookings.map(b => {
      const bk = b.toObject();
      if (bk.status === "paid") {
        const now = new Date();
        const checkInDate = new Date(bk.checkIn);
        const timeDiffHours = (checkInDate - now) / (1000 * 60 * 60);

        let feePercent = 10; // default 10%
        if (timeDiffHours <= 0) {
          feePercent = 100; // 100% deduction if check-in has passed
        } else if (timeDiffHours < 24) {
          feePercent = 50; // 50% deduction if cancellation is within 24h
        } else if (timeDiffHours < 72) {
          feePercent = 25; // 25% deduction if cancellation is within 72h
        }

        bk.feePercent = feePercent;
        bk.cancellationFee = Math.round((bk.totalPrice * feePercent) / 100);
        bk.refundAmount = bk.totalPrice - bk.cancellationFee;
      }
      return bk;
    });

    res.render("bookings/my-trips", { bookings: enhancedBookings, razorpayEnabled });
  })
);

// ─── POST /bookings/:id/cancel ──────────────────────────────────────────────
router.post(
  "/bookings/:id/cancel",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const booking = await Booking.findById(id).populate("listing");

    if (!booking) {
      req.flash("error", "Booking not found.");
      return res.redirect("/bookings/my-trips");
    }

    // Verify ownership
    if (!booking.user.equals(req.user._id) && req.user.role !== "admin") {
      req.flash("error", "Unauthorized access.");
      return res.redirect("/bookings/my-trips");
    }

    if (booking.status !== "paid") {
      req.flash("error", "This booking cannot be cancelled (current status: " + booking.status + ").");
      return res.redirect("/bookings/my-trips");
    }

    // Calculate dynamic cancellation charge
    const now = new Date();
    const checkInDate = new Date(booking.checkIn);
    const timeDiffHours = (checkInDate - now) / (1000 * 60 * 60);

    let feePercent = 10;
    if (timeDiffHours <= 0) {
      feePercent = 100;
    } else if (timeDiffHours < 24) {
      feePercent = 50;
    } else if (timeDiffHours < 72) {
      feePercent = 25;
    }

    const cancellationFee = Math.round((booking.totalPrice * feePercent) / 100);
    const refundAmount = booking.totalPrice - cancellationFee;

    booking.cancellationFee = cancellationFee;
    booking.refundAmount = refundAmount;
    booking.cancelledAt = now;

    // Check if it's a real Razorpay payment or demo/UPI
    if (razorpay && booking.paymentId && !booking.paymentId.startsWith("demo_") && !booking.paymentId.startsWith("upi_")) {
      try {
        if (refundAmount > 0) {
          const refund = await razorpay.refunds.create({
            payment_id: booking.paymentId,
            amount: Math.round(refundAmount * 100), // in paise
          });
          booking.refundId = refund.id;
          booking.status = "refunded";
          req.flash("success", `Booking cancelled. Refund of ₹${refundAmount.toLocaleString("en-IN")} initiated (Refund ID: ${refund.id}). Cancellation fee: ₹${cancellationFee.toLocaleString("en-IN")} (${feePercent}%).`);
        } else {
          booking.status = "cancelled";
          req.flash("warning", `Booking cancelled. No refund is issued as the cancellation is within 0 hours of check-in (100% cancellation charge applied).`);
        }
      } catch (err) {
        console.error("Razorpay Refund Error:", err);
        
        let errMsg = "Payment gateway error";
        if (err) {
          if (typeof err === "string") {
            errMsg = err;
          } else if (err.description) {
            errMsg = err.description;
          } else if (err.error && err.error.description) {
            errMsg = err.error.description;
          } else if (err.message) {
            errMsg = err.message;
          }
        }
        
        // Fail-safe cancellation: still cancel the booking in the DB
        booking.status = "cancelled";
        booking.refundId = "failed_gateway_manual_pending";
        await booking.save();

        req.flash("warning", `Booking cancelled. Automatic refund failed (${errMsg}). Please contact support to receive your refund of ₹${refundAmount.toLocaleString("en-IN")} manually.`);
        return res.redirect(req.headers.referer || "/bookings/my-trips");
      }
    } else {
      // Demo mode or UPI payment cancellation
      if (refundAmount > 0) {
        booking.status = "refunded";
        req.flash("success", `Booking cancelled successfully. Simulated refund of ₹${refundAmount.toLocaleString("en-IN")} processed (deducted ₹${cancellationFee.toLocaleString("en-IN")} cancellation charge).`);
      } else {
        booking.status = "cancelled";
        req.flash("warning", `Booking cancelled successfully. No refund issued (100% cancellation charge applied).`);
      }
    }

    await booking.save();
    res.redirect(req.headers.referer || "/bookings/my-trips");
  })
);

module.exports = router;
