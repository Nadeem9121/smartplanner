const express = require("express");
const router = express.Router();
const serviceController = require("../controllers/serviceController");
const { protect, restrictTo } = require("../controllers/authController");

// All routes below require the user to be authenticated.
router.use(protect);
// router.get("/profile/:vendorId", serviceController.getVendorProfile);

router.get("/vendor/:vendorId", serviceController.getVendorProfile);

router.get("/public", serviceController.getAllServicesPublic);

// Route for advanced searching/filtering services
// Placed before '/:id' to avoid param conflicts
router.get("/search", serviceController.searchServices);

// Public routes for any authenticated user
router.get("/", serviceController.getServices);
router.get("/:id", serviceController.getServiceById);

// Routes restricted to users with 'vendor' role
router.post("/", restrictTo("vendor"), serviceController.createService);
router.put("/:id", restrictTo("vendor"), serviceController.updateService);
router.delete("/:id", restrictTo("vendor"), serviceController.deleteService);

// Update service availability time for a specific service
router.patch(
  "/:id/availability-time",
  restrictTo("vendor"),
  serviceController.updateServiceAvailabilityTime
);

module.exports = router;
