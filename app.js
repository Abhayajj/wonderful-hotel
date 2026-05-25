if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const mongoSanitize = require("express-mongo-sanitize");
const helmet = require("helmet");

const User = require("./models/user");
const ExpressError = require("./utils/ExpressError");

const listings = require("./routes/listing.js");
const reviews = require("./routes/reviews.js");
const userRoutes = require("./routes/user.js");
const bookingRoutes = require("./routes/booking.js");
const adminRoutes = require("./routes/admin.js");
const chatRoutes = require("./routes/chat.js");
const dashboardRoutes = require("./routes/dashboard.js");

const MONGO_URL = process.env.ATLASDB_URL || process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/wonderful";

main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(MONGO_URL);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "/public")));

// MongoDB Query Injection Protection
app.use(mongoSanitize());

// Content Security Policy setup for Production
const scriptSrcUrls = [
  "https://cdn.jsdelivr.net",
  "https://unpkg.com",
  "https://checkout.razorpay.com",
  "https://code.jquery.com"
];
const styleSrcUrls = [
  "https://cdn.jsdelivr.net",
  "https://cdnjs.cloudflare.com",
  "https://fonts.googleapis.com",
  "https://unpkg.com"
];
const connectSrcUrls = [
  "https://unpkg.com",
  "https://*.tile.openstreetmap.org",
  "https://*.basemaps.cartocdn.com",
  "https://nominatim.openstreetmap.org",
  "https://api.razorpay.com",
  "https://checkout.razorpay.com"
];
const fontSrcUrls = [
  "https://fonts.googleapis.com",
  "https://fonts.gstatic.com",
  "https://cdnjs.cloudflare.com"
];

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", ...connectSrcUrls],
      scriptSrc: ["'unsafe-inline'", "'self'", ...scriptSrcUrls],
      styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
      workerSrc: ["'self'", "blob:"],
      objectSrc: [],
      imgSrc: [
        "'self'",
        "blob:",
        "data:",
        "https://*.unsplash.com",
        "https://images.pexels.com",
        "https://res.cloudinary.com",
        "https://maps.googleapis.com",
        "https://*.tile.openstreetmap.org",
        "https://*.basemaps.cartocdn.com",
        "https://unpkg.com"
      ],
      fontSrc: ["'self'", ...fontSrcUrls],
      frameSrc: ["'self'", "https://checkout.razorpay.com"]
    }
  })
);

const store = MongoStore.create({
  mongoUrl: MONGO_URL,
  crypto: {
    secret: process.env.SESSION_SECRET || "wonderfullsecretcode"
  },
  touchAfter: 24 * 3600 // touch update only once in 24 hours unless session changes
});

store.on("error", (err) => {
  console.log("ERROR IN MONGO SESSION STORE", err);
});

const sessionOptions = {
  store,
  secret: process.env.SESSION_SECRET || "wonderfullsecretcode",
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production"
  }
};

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});

app.get("/", (req, res) => {
  res.redirect("/listings");
});

app.use("/", userRoutes);
app.use("/", bookingRoutes);
app.use("/admin", adminRoutes);
app.use("/", chatRoutes);
app.use("/", dashboardRoutes);
app.use("/listings", listings);
app.use("/listings/:id/reviews", reviews);

app.get("/privacy", (req, res) => {
  res.render("privacy");
});

app.get("/terms", (req, res) => {
  res.render("terms");
});

// Catch-all Route
app.all("*", (req, res, next) => {
  next(new ExpressError(404, "Page Not Found!"));
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  const { statusCode = 500, message = "Something went wrong" } = err;
  res.status(statusCode).render("error", { err });
});

let io;
if (require.main === module) {
  const PORT = process.env.PORT || 8080;
  const server = app.listen(PORT, () => {
    console.log(`✅ Server is running at http://localhost:${PORT}`);
  });

  // Socket.io WebSockets Integration
  const socketio = require("socket.io");
  io = socketio(server);

  io.on("connection", (socket) => {
    console.log(`⚡ Socket connected: ${socket.id}`);

    socket.on("join_room", async (data) => {
      const { roomId, userId, otherId, listingId } = data;
      socket.join(roomId);
      console.log(`🚪 Socket ${socket.id} joined room ${roomId}`);

      if (userId && otherId && listingId) {
        try {
          const Message = require("./models/message");
          await Message.updateMany(
            { listing: listingId, sender: otherId, receiver: userId, read: false },
            { read: true }
          );
          socket.to(roomId).emit("messages_read", { readerId: userId });
        } catch (err) {
          console.error("❌ Socket mark-as-read error:", err);
        }
      }
    });

    socket.on("send_message", async (data) => {
      const { senderId, receiverId, listingId, text, image, roomId } = data;
      if ((!text || text.trim() === "") && (!image || image.trim() === "")) return;

      try {
        const Message = require("./models/message");
        const newMessage = new Message({
          sender: senderId,
          receiver: receiverId,
          listing: listingId,
          text: text ? text.trim() : "",
          image: image || "",
        });
        await newMessage.save();

        io.to(roomId).emit("receive_message", {
          _id: newMessage._id,
          sender: senderId,
          text: newMessage.text,
          image: newMessage.image,
          read: newMessage.read,
          createdAt: newMessage.createdAt,
        });
      } catch (err) {
        console.error("❌ Socket message persistence failed:", err);
      }
    });

    socket.on("typing", (data) => {
      const { roomId, username } = data;
      socket.to(roomId).emit("typing", { username });
    });

    socket.on("stop_typing", (data) => {
      const { roomId } = data;
      socket.to(roomId).emit("stop_typing");
    });

    socket.on("mark_read", async (data) => {
      const { messageId, roomId } = data;
      try {
        const Message = require("./models/message");
        await Message.findByIdAndUpdate(messageId, { read: true });
        socket.to(roomId).emit("messages_read", { messageId });
      } catch (err) {
        console.error("❌ Socket mark_read failed:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\n❌ Port ${PORT} is already in use!`);
      console.error(`   Run this command to fix it, then try again:\n`);
      console.error(`   npx kill-port ${PORT}\n`);
      process.exit(1);
    } else {
      throw err;
    }
  });
}

module.exports = app;
