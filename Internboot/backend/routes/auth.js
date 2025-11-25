const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const db = require("../config/db");

// Configure file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + "-" + file.originalname;
        cb(null, uniqueName);
    },
});

const upload = multer({ storage });

// Upload fields
const uploadFields = upload.fields([
    { name: "profilePic", maxCount: 1 },
    { name: "adhaar", maxCount: 1 },
    { name: "passport", maxCount: 1 },
]);

// Signup route
router.post("/signup", uploadFields, (req, res) => {
    const {
        firstName,
        lastName,
        username,
        email,
        mobile,
        password,
        skills,
        status,
        education,
        category,
        tenure,
        token,
        identityType,
        aadhar,
        passport,
    } = req.body;

    const profilePic = req.files?.profilePic?.[0]?.filename || null;
    const adhaarFile = req.files?.adhaar?.[0]?.filename || null;
    const passportFile = req.files?.passport?.[0]?.filename || null;

    const sql = `
    INSERT INTO users (
      firstName, lastName, username, email, mobile, password,
      skills, status, education, category, tenure, token,
      identityType, aadhar, passport, profilePic, adhaarFile, passportFile
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

    const values = [
        firstName,
        lastName,
        username,
        email,
        mobile,
        password,
        skills,
        status,
        education,
        category,
        tenure,
        token,
        identityType,
        aadhar || null,
        passport || null,
        profilePic,
        adhaarFile,
        passportFile,
    ];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Error inserting data:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }
        res.json({ success: true, message: "Signup successful!" });
    });
});

module.exports = router;
