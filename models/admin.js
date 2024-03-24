const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  first_name: {
    type: String,
    required: true
  },
  middle_name: {
    type: String,
    required: true
  },
  last_name: {
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
  contact: {
    type: String, // Add contact field
    required: true
  },
 
  address: {
    type: String, // Add schoolAddress field
    required: true
  },
  role: {
    type: String,
    required: true
  },
  createdAt:{
    type: Date,
    default: Date.now()
 },
  updatedAt:{
    type: Date,
    default: Date.now()    
 },
 deletedAt: {
  type: Date,
  default: null,
},
  resetToken: String,
  resetTokenExpiration: Date
  // Add any other fields or properties you need
});

module.exports = mongoose.model('Admin', adminSchema);