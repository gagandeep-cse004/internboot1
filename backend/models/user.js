// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    username: { type: String, unique: true, index: true },
    email: { type: String, unique: true, index: true },
    mobile: String,
    password: String, // hashed
    skills: String,
    status: String,
    education: String,
    category: String,
    tenure: String,
    token: String,
    identityType: String,
    aadhar: String,
    passport: String,
    profilePic: String, // stored file path
    idDoc: String // Aadhar or Passport file path
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
