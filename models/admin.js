const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
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
    default: 'admin' // Set the default role to 'user'
  },
  createdAt:{
    type: Date,
    default: Date.now()
 },
  updatedAt:{
    type: Date,
    default: Date.now()    
 },
  // Add any other fields or properties you need
});

module.exports = mongoose.model('Admin', adminSchema);