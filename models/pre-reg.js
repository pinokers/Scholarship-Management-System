const mongoose = require('mongoose');

// Define the User Schema
const Pre_registrationSchema = new mongoose.Schema({
  
  enrolled: String,
  units_enrolled: Number,
  incomplete_grade: String,
  paranaque_resident: String,
  registered_voter: String,
  financial_assistance: String,
  barangay: String,
  declaration: String, // Use Boolean for checkboxes

 
  first_name: String,
  middle_name: String,
  last_name: String,
  suffix: String,
  address: String,
  email: String,
  contact_number: String,
  alternative_contact_number: String,
  school_name: String,
  course: String,
  year_level: String,
  gwa: Number,
  classification: String,
  last_application: String,

  // Page 3 (file uploads)
  support_enrolled: String,
  certificate_of_registration: String, // Store file paths or URLs here
  grades: String, // Store file paths or URLs here
  school_id: String, // Store file paths or URLs here
  voters_id: String, // Store file paths or URLs here

  
  code: {
    type: String,
    default: '',
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
});

module.exports = mongoose.model('Pre_registration', Pre_registrationSchema);
