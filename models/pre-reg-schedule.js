// Create a MongoDB schema for pre-registration
const mongoose = require('mongoose');

const preregistrationSchema = new mongoose.Schema({
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  
  createdAt:{
    type: Date,
    default: Date.now()
 },
  updatedAt: {
    type: Date,
    default: Date.now, // Set the default value to the current date and time
  },
});

const Preregistration = mongoose.model('Preregistration_Schedule', preregistrationSchema);

module.exports = Preregistration;
