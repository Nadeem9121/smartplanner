// controllers/galleryController.js
const GalleryImage = require("../models/galleryModel");
const fs = require("fs");
const path = require("path");

exports.uploadImage = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const image = await GalleryImage.create({
    vendor: req.user._id,
    filename: req.file.filename,
    url: `/uploads/gallery/${req.file.filename}`,
    description: req.body.description || "",
  });

  res.status(201).json(image);
};

exports.getGallery = async (req, res) => {
  const images = await GalleryImage.find({ vendor: req.user._id }).sort(
    "-createdAt"
  );
  res.json(images);
};

exports.getImageById = async (req, res) => {
  const image = await GalleryImage.findById(req.params.id);
  if (!image || !image.vendor.equals(req.user._id)) {
    return res.status(404).json({ error: "Image not found" });
  }
  res.json(image);
};

exports.deleteImage = async (req, res) => {
  const image = await GalleryImage.findById(req.params.id);
  if (!image || !image.vendor.equals(req.user._id)) {
    return res.status(404).json({ error: "Image not found" });
  }

  const filePath = path.join(__dirname, "../uploads/gallery", image.filename);
  fs.unlink(filePath, (err) => {
    if (err) console.error("File deletion error:", err);
  });

  await image.remove();
  res.json({ message: "Image deleted successfully" });
};
