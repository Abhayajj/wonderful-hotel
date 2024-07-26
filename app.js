const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError");

const listings = require("./routes/listing.js");
const reviews =require("./routes/reviews.js")

const MONGO_URL = "mongodb://127.0.0.1:27017/wonderful";

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
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "/public")));

app.get("/", (req, res) => {
  res.send("Hi, I am root");
});

app.use("/listings", listings);
app.use("/listings/:id/reviews", reviews);

// Catch-all Route
app.all("*", (req, res, next) => {
  next(new ExpressError(404, "Page Not Found!"));
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  const { statusCode = 500, message = "Something went wrong" } = err;
  res.status(statusCode).render("error", { err });
});

app.listen(8080, () => {
  console.log("server is listening to port 8080");
});
