const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  course: {
    type: String, // Add course field
    required: true
  },
  contact: {
    type: String, // Add contact field
    required: true
  },
  schoolID: {
    type: String, // Add schoolID field
    required: true
  },
  schoolName: {
    type: String, // Add schoolName field
    required: true
  },
  schoolAddress: {
    type: String, // Add schoolAddress field
    required: true
  },
  role: {
    type: String,
    default: 'user' // Set the default role to 'user'
  },
  // Add any other fields or properties you need
});

module.exports = mongoose.model('User', userSchema);
