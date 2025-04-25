// routes/galleryRoutes.js
const express = require("express");
const router = express.Router();
const { protect, restrictTo } = require("../controllers/authController");
const upload = require("../utils/multerConfig");
const galleryController = require("../controllers/galleryController");

// All gallery routes require authentication and vendor role
router.use(protect);
router.use(restrictTo("vendor"));

// Upload a single photo (field name: 'photo')
router.post("/post-img", upload.single("photo"), galleryController.uploadImage);

// Retrieve all images for this vendor
router.get("/get-img", galleryController.getGallery);

// Retrieve a specific image
router.get("/get-img/:id", galleryController.getImageById);

// Delete an image
router.delete("/get-img/:id", galleryController.deleteImage);

module.exports = router;
