const express = require("express");
const router = express.Router();
const User = require("../models/user");
const wrapAsync = require("../utils/wrapAsync");
const passport = require("passport");
const { saveRedirectUrl } = require("../utils/middleware");

// Signup GET Route
router.get("/signup", (req, res) => {
  res.render("users/signup.ejs");
});

// Signup POST Route
router.post(
  "/signup",
  wrapAsync(async (req, res, next) => {
    try {
      const { username, email, password } = req.body;
      const newUser = new User({ email, username });
      const registeredUser = await User.register(newUser, password);
      req.login(registeredUser, (err) => {
        if (err) {
          return next(err);
        }
        req.flash("success", "Welcome to WonderFull!");
        req.session.save((err) => {
          if (err) {
            return next(err);
          }
          res.redirect("/listings");
        });
      });
    } catch (e) {
      req.flash("error", e.message);
      res.redirect("/signup");
    }
  })
);

// Login GET Route
router.get("/login", (req, res) => {
  res.render("users/login.ejs");
});

// Login POST Route
router.post(
  "/login",
  saveRedirectUrl,
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  async (req, res, next) => {
    req.flash("success", `Welcome back to WonderFull, ${req.user.username}!`);
    let redirectUrl = res.locals.redirectUrl || "/listings";
    req.session.save((err) => {
      if (err) {
        return next(err);
      }
      res.redirect(redirectUrl);
    });
  }
);

// Logout Route
router.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.flash("success", "You are logged out successfully!");
    req.session.save((err) => {
      if (err) {
        return next(err);
      }
      res.redirect("/listings");
    });
  });
});

module.exports = router;

// ─── USER PROFILE ROUTES ─────────────────────────────────────────────────────
const multer = require("multer");
const { storage, cloudinaryEnabled } = require("../config/cloudinary");
const upload = multer({ storage });
const { isLoggedIn } = require("../utils/middleware");
const Listing = require("../models/listing");

// GET /profile - redirect to logged-in user's profile
router.get(
  "/profile",
  isLoggedIn,
  (req, res) => {
    res.redirect(`/profile/${req.user._id}`);
  }
);

// GET /profile/edit - edit profile form
router.get("/profile/edit", isLoggedIn, (req, res) => {
  res.render("users/edit-profile.ejs");
});

// POST /profile/edit - save profile updates
router.post(
  "/profile/edit",
  isLoggedIn,
  upload.single("profileImage"),
  wrapAsync(async (req, res) => {
    const { bio, phone } = req.body;
    const user = await User.findById(req.user._id);
    
    if (req.file) {
      let avatarUrl = req.file.path;
      if (!cloudinaryEnabled) {
        avatarUrl = `/uploads/${req.file.filename}`;
      }
      user.profileImage = avatarUrl;
    }
    
    user.bio = bio ? bio.trim() : "";
    user.phone = phone ? phone.trim() : "";
    
    await user.save();
    req.flash("success", "Profile updated successfully!");
    res.redirect(`/profile/${user._id}`);
  })
);

// GET /profile/:id - public user profile page
router.get(
  "/profile/:id",
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const profileUser = await User.findById(id);
    if (!profileUser) {
      req.flash("error", "User not found.");
      return res.redirect("/listings");
    }
    
    const hostListings = await Listing.find({ owner: id }).populate("reviews");
    let totalReviews = 0;
    let totalRatingSum = 0;
    for (let listing of hostListings) {
      if (listing.reviews && listing.reviews.length > 0) {
        totalReviews += listing.reviews.length;
        totalRatingSum += listing.reviews.reduce((acc, r) => acc + r.rating, 0);
      }
    }
    const hostRating = totalReviews > 0 ? (totalRatingSum / totalReviews).toFixed(1) : "New";

    res.render("users/profile.ejs", {
      profileUser,
      hostListings,
      hostRating,
      totalReviews
    });
  })
);
