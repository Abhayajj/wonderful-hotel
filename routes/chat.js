const express = require("express");
const router = express.Router();
const Message = require("../models/message");
const Listing = require("../models/listing");
const User = require("../models/user");
const wrapAsync = require("../utils/wrapAsync");
const { isLoggedIn } = require("../utils/middleware");
const multer = require("multer");
const { storage, cloudinaryEnabled } = require("../config/cloudinary");
const upload = multer({ storage });

// ─── POST /chats/upload (Upload Chat Image) ──────────────────────────────────
router.post(
  "/chats/upload",
  isLoggedIn,
  upload.single("chatImage"),
  wrapAsync(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided." });
    }
    let imageUrl = req.file.path;
    if (!cloudinaryEnabled) {
      imageUrl = `/uploads/${req.file.filename}`;
    }
    res.json({ imageUrl });
  })
);

// ─── GET /chats (Inbox List) ────────────────────────────────────────────────
router.get(
  "/chats",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const messages = await Message.find({
      $or: [{ sender: req.user._id }, { receiver: req.user._id }],
    })
      .populate("sender", "username email")
      .populate("receiver", "username email")
      .populate("listing", "title image")
      .sort({ createdAt: -1 });

    const conversations = [];
    const seenPairs = new Set();

    for (let msg of messages) {
      if (!msg.listing) continue; // Skip messages with deleted listings
      
      const otherUser = msg.sender._id.equals(req.user._id) ? msg.receiver : msg.sender;
      if (!otherUser) continue; // Skip if user is deleted

      const pairKey = `${msg.listing._id}_${otherUser._id}`;
      if (!seenPairs.has(pairKey)) {
        seenPairs.add(pairKey);
        conversations.push({
          listing: msg.listing,
          otherUser: otherUser,
          lastMessage: msg.text,
          lastMessageTime: msg.createdAt,
        });
      }
    }

    res.render("chats/index", { conversations });
  })
);

// ─── GET /chats/:listingId/:receiverId (Private Live Chat Room) ─────────────
router.get(
  "/chats/:listingId/:receiverId",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const { listingId, receiverId } = req.params;

    if (req.user._id.equals(receiverId)) {
      req.flash("error", "You cannot chat with yourself.");
      return res.redirect("/listings");
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      req.flash("error", "Listing not found.");
      return res.redirect("/listings");
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      req.flash("error", "User not found.");
      return res.redirect("/listings");
    }

    // Mark previous messages sent to current user as read
    await Message.updateMany(
      {
        listing: listingId,
        sender: receiverId,
        receiver: req.user._id,
        read: false,
      },
      { read: true }
    );

    // Retrieve previous message history between these two users for this listing
    const messages = await Message.find({
      listing: listingId,
      $or: [
        { sender: req.user._id, receiver: receiverId },
        { sender: receiverId, receiver: req.user._id },
      ],
    })
      .populate("sender", "username")
      .populate("receiver", "username")
      .sort({ createdAt: 1 });

    // Generate unique private room ID lexicographically
    const ids = [req.user._id.toString(), receiverId.toString()].sort();
    const roomId = `${listingId}_${ids[0]}_${ids[1]}`;

    res.render("chats/show", {
      listing,
      receiver,
      messages,
      roomId,
    });
  })
);

module.exports = router;
