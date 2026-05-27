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

// ─── OAuth Routes ────────────────────────────────────────────────────────────

// Google OAuth Route
router.get("/auth/google", (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID.startsWith("temp")) {
    req.flash("error", "Google Login is not configured. Please add your credentials in .env file.");
    return res.redirect("/login");
  }
  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

// Google OAuth Callback Route
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login", failureFlash: true }),
  (req, res, next) => {
    req.flash("success", `Welcome back to WonderFull, ${req.user.username}!`);
    req.session.save((err) => {
      if (err) {
        return next(err);
      }
      res.redirect("/listings");
    });
  }
);

// Facebook OAuth Route
router.get("/auth/facebook", (req, res, next) => {
  if (!process.env.FACEBOOK_APP_ID || process.env.FACEBOOK_APP_ID.startsWith("temp")) {
    req.flash("error", "Facebook Login is not configured. Please add your credentials in .env file.");
    return res.redirect("/login");
  }
  passport.authenticate("facebook", { scope: ["email"] })(req, res, next);
});

// Facebook OAuth Callback Route
router.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: "/login", failureFlash: true }),
  (req, res, next) => {
    req.flash("success", `Welcome back to WonderFull, ${req.user.username}!`);
    req.session.save((err) => {
      if (err) {
        return next(err);
      }
      res.redirect("/listings");
    });
  }
);

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

// ─── Forgot Password Routes ──────────────────────────────────────────────────
const crypto = require("crypto");

// GET /forgot - render page
router.get("/forgot", (req, res) => {
  res.render("users/forgot.ejs");
});

// POST /forgot - request reset token
router.post("/forgot", wrapAsync(async (req, res, next) => {
  const { email } = req.body;
  if (!email || email.trim() === "") {
    req.flash("error", "Email address is required.");
    return res.redirect("/forgot");
  }

  const user = await User.findOne({ email: { $regex: new RegExp("^" + email.trim() + "$", "i") } });
  if (!user) {
    req.flash("error", "No account with that email address exists.");
    return res.redirect("/forgot");
  }

  const token = crypto.randomBytes(20).toString("hex");
  user.resetPasswordToken = token;
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour expiration
  await user.save();

  // For testing, generate a simulation link and display it in the success flash message
  const resetUrl = `${req.protocol}://${req.headers.host}/reset/${token}`;
  req.flash("success", `Password reset token generated! Click here to reset: <a href="${resetUrl}" class="fw-bold text-decoration-underline text-success">${resetUrl}</a>`);
  res.redirect("/forgot");
}));

// GET /reset/:token - render reset password form
router.get("/reset/:token", wrapAsync(async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    req.flash("error", "Password reset token is invalid or has expired.");
    return res.redirect("/forgot");
  }

  res.render("users/reset.ejs", { token: req.params.token });
}));

// POST /reset/:token - update password
router.post("/reset/:token", wrapAsync(async (req, res, next) => {
  const { password, confirmPassword } = req.body;
  if (!password || password.length < 8) {
    req.flash("error", "Password must be at least 8 characters long.");
    return res.redirect(`/reset/${req.params.token}`);
  }

  if (password !== confirmPassword) {
    req.flash("error", "Passwords do not match.");
    return res.redirect(`/reset/${req.params.token}`);
  }

  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    req.flash("error", "Password reset token is invalid or has expired.");
    return res.redirect("/forgot");
  }

  await user.setPassword(password);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  req.login(user, (err) => {
    if (err) return next(err);
    req.flash("success", "Success! Your password has been reset and you are now logged in.");
    req.session.save((err) => {
      if (err) return next(err);
      res.redirect("/listings");
    });
  });
}));
