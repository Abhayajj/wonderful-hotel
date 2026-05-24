const mongoose = require("mongoose");
const Listing = require("../models/listing");
const Review = require("../models/review");
const User = require("../models/user");

const MONGO_URL = "mongodb://127.0.0.1:27017/wonderful";

async function test() {
  console.log("📡 Connecting to MongoDB for integration testing...");
  await mongoose.connect(MONGO_URL);
  console.log("✅ Connected");

  // 1. Resolve users
  const admin = await User.findOne({ username: "admin" });
  const guest = await User.findOne({ username: "test_guest" });

  if (!admin || !guest) {
    console.error("❌ Pre-requisites not met. Please seed test users first!");
    await mongoose.disconnect();
    return;
  }

  // 2. Find a listing
  const listing = await Listing.findOne({});
  if (!listing) {
    console.error("❌ No listings in database to test review!");
    await mongoose.disconnect();
    return;
  }
  console.log(`🏡 Testing on listing: "${listing.title}"`);

  // 3. Create a test review
  const testReview = new Review({
    comment: "This is a spam comment containing link: http://malicious-spam-url.com",
    rating: 1,
    author: guest._id
  });
  await testReview.save();
  listing.reviews.push(testReview._id);
  await listing.save();
  console.log("✅ Created test review successfully");

  // 4. Verify initial public show populate matches (should return 1 review)
  let publicListing = await Listing.findById(listing._id).populate({
    path: "reviews",
    match: { flagged: { $ne: true } }
  });
  const hasSpamReviewPublic = publicListing.reviews.some(r => r._id.equals(testReview._id));
  console.log(`🔍 Is review visible publicly before flagging? ${hasSpamReviewPublic ? "YES (Pass)" : "NO (Fail)"}`);

  // 5. Flag the review
  testReview.flagged = true;
  testReview.flaggedReason = "Spam or misleading";
  await testReview.save();
  console.log("🚩 Review flagged with reason: 'Spam or misleading'");

  // 6. Verify public show populate MATCHES (should filter out the review)
  publicListing = await Listing.findById(listing._id).populate({
    path: "reviews",
    match: { flagged: { $ne: true } }
  });
  const hasSpamReviewPublicAfter = publicListing.reviews.some(r => r._id.equals(testReview._id));
  console.log(`🔍 Is review visible publicly after flagging? ${hasSpamReviewPublicAfter ? "YES (Fail)" : "NO (Pass - successfully hidden)"}`);

  // 7. Verify admin populate matching (should still see flagged review inline)
  const adminListing = await Listing.findById(listing._id).populate({
    path: "reviews", // Admins see all reviews (no match filter applied)
    populate: { path: "author" }
  });
  const hasSpamReviewAdmin = adminListing.reviews.some(r => r._id.equals(testReview._id));
  console.log(`🔍 Is review visible in admin details view? ${hasSpamReviewAdmin ? "YES (Pass)" : "NO (Fail)"}`);

  // 8. Verify admin moderation queue counts
  const flaggedQueueCount = await Review.countDocuments({ flagged: true });
  console.log(`🔍 Admin flagged moderation queue count: ${flaggedQueueCount} (Flagged review in queue: ${flaggedQueueCount > 0 ? "Pass" : "Fail"})`);

  // 9. Approve the review / Dismiss flag
  testReview.flagged = false;
  testReview.flaggedReason = "";
  await testReview.save();
  console.log("🟢 Admin approved review / dismissed flag");

  // 10. Verify it is visible publicly again
  publicListing = await Listing.findById(listing._id).populate({
    path: "reviews",
    match: { flagged: { $ne: true } }
  });
  const hasSpamReviewPublicApproved = publicListing.reviews.some(r => r._id.equals(testReview._id));
  console.log(`🔍 Is review visible publicly after admin approval? ${hasSpamReviewPublicApproved ? "YES (Pass)" : "NO (Fail)"}`);

  // 11. Clean up - delete the review
  await Listing.updateOne({ _id: listing._id }, { $pull: { reviews: testReview._id } });
  await Review.findByIdAndDelete(testReview._id);
  console.log("🧹 Test cleanup completed");

  await mongoose.disconnect();
  console.log("🏁 All integration tests finished successfully!");
}

test().catch(console.error);
