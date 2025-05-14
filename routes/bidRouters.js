const express = require("express");
const router = express.Router();
const bidController = require("../controllers/bitController");
const { protect, restrictTo } = require("../controllers/authController");

// All routes require authentication
router.use(protect);

/**
 * Requester routes:
 * - Create a new bid
 * - Update/Delete own bids
 */
router.route("/").get(bidController.getAllBids).post(bidController.createBid);

router
  .route("/:id")
  .get(bidController.getBid)
  .patch(bidController.updateBid)
  .delete(bidController.deleteBid);

router.get("/vendor/:vendorId", bidController.getBidsByVendorId);

/**
 * Provider routes:
 * - Accept (assign) a bid
 */
router.post("/:id/assign", restrictTo("vendor"), bidController.assignBid);

/**
 * Vendor routes:
 * - Submit a quote/amount for a bid
 */
router.post("/:id/quote", restrictTo("vendor"), bidController.placeBidAmount);
// routes/bidRoutes.js
router.patch("/:id/quote", bidController.editQuote);

module.exports = router;
