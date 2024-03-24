const mongoose = require('mongoose');

// Define the User Schema
const userSchema = new mongoose.Schema({
  first_name: String,
  middle_name: String,
  last_name: String,
  suffix: String,
  email: { type: String, unique: true },
  password: String, // Hashed and salted password
  course: String,
  contact: String,
  districtSelect: String,
  barangaySelect: String,
  schoolName: String,
  schoolAddress: String,
  schoolID: String,
  category: String,
  // Add these fields for email verification
  verificationToken: {
    type: String,
    default: null,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  createdAt: {
      type: Date,
      default: Date.now()
  },
  updatedAt: {
      type: Date,
      default: Date.now()
  },
  deletedAt: {
    type: Date,
    default: null,
  },
  resetToken: String,
  resetTokenExpiration: Date,
  role: {
      type: String,
      default: 'user'
  }
});
module.exports = mongoose.model('User', userSchema);
