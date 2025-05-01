const express = require("express");
const reviewController = require("../controllers/reviewController");
const { protect } = require("../controllers/authController");

const router = express.Router();

router.use(protect);

router.route("/").post(reviewController.createReview);
// Route to get average rating for a vendor
router.get("/averageRating/:vendorId", reviewController.calculateAverageRating);

router.route("/vendor/:vendorId").get(reviewController.getVendorReviews);

// Route to get review response percentage for a vendor
router.get(
  "/responsePercentage/:vendorId",
  reviewController.calculateReviewResponsePercentage
);

router
  .route("/:id")
  .patch(reviewController.updateReview)
  .delete(reviewController.deleteReview);

module.exports = router;
