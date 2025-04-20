const express = require("express");
const router = express.Router();
const serviceController = require("../controllers/serviceController");
const { protect, restrictTo } = require("../controllers/authController");

// All routes below require the user to be authenticated.
router.use(protect);

// Routes open to any authenticated user
router.get("/", serviceController.getServices);
router.get("/:id", serviceController.getServiceById);

// Routes that require the user to have an 'vendor' role.
router.post("/", restrictTo("vendor"), serviceController.createService);
router.put("/:id", restrictTo("vendor"), serviceController.updateService);
router.delete("/:id", restrictTo("vendor"), serviceController.deleteService);

module.exports = router;
