// routes/bidRoutes.js
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

module.exports = router;
