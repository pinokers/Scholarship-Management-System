const mongoose = require('mongoose');

const DisqualifiedSchema = new mongoose.Schema({
  first_name: String,
  middle_name: String,
  last_name: String,
  barangay: String,
  email: { type: String, unique: true },
  primary_cellphone: String,
  secondary_cellphone: String,
  
  // File upload fields as strings
  certificate_of_registration: String, // Store file path or URL
  application_form:String,
  grades: String, // Store file path or URL
  school_id: String, // Store file path or URL
  voters_id: String, // Store file path or URL

  proof_of_payment: String,
  barangay_id: String,
  certificate_of_good_moral: String,
  certificate_of_ladderized_course: String,
  affidavit_of_guardianship: String,
  affidavit_of_support: String,
  
  code: {
    type: Number,
    default: '',
    },
    selectedOption: {
      type: String,
      default: '', // Adjust the data type according to the type of data you expect
    },
    payoutStatus: {
    type: String, // You can adjust the data type as needed (String, Boolean, etc.)
    default: 'pending', // Default value if not provided
    },

  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  deletedAt: {
    type: Date,
    default: null,
  },
});

module.exports = mongoose.model('DisQualified', DisqualifiedSchema);
