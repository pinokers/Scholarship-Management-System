const express = require("express");
const router = express.Router();
const User = require("../models/user.js");
const middleware = require("../middleware/index.js");
const mongoose = require("mongoose");
const PDFDocument = require('pdfkit');
const Schedule = require('../models/schedule');
const Announcement = require('../models/announcement')
const OldForm = require("../models/oldform.js");
const Pre_registration = require("../models/pre-reg.js");
const path = require('path');
const fs = require('fs');
const Pre_registration_disqualified = require("../models/pre-reg-disqualified.js");
const bcrypt = require("bcryptjs");



const multer = require('multer');
const Grid = require('gridfs-stream');
const { GridFsStorage } = require('multer-gridfs-storage');

const db = mongoose.connection;
let gfs;
    // Initialize GridFS stream with your MongoDB connection
    db.once('open', () => {
      try {
        gfs = Grid(db.db, mongoose.mongo);
        gfs.collection('uploads'); // Create an 'uploads' collection for file storage
      } catch (error) {
        console.error('Error initializing GridFS:', error);
      }
    });

    // Define storage engine for Multer using GridFS
    const storage = new GridFsStorage({
      db: db, // Use your existing MongoDB connection (e.g., db)
      file: (req, file) => {
        return {
          filename: file.originalname,
        };
      },
    });

    const upload = multer({ storage });

    const { check, validationResult } = require('express-validator');
    const Preregistration = require("../models/pre-reg-schedule.js");
// Define a route handler for POST requests to save form data
router.post('/applicant/applicationform', upload.fields([
  { name: 'certificate_of_registration', maxCount: 1 },
  { name: 'application_form', maxCount: 1 },
  { name: 'grades', maxCount: 1 },
  { name: 'school_id', maxCount: 1 },
  { name: 'voters_id', maxCount: 1 },
  { name: 'proof_of_payment', maxCount: 1 },
  { name: 'barangay_id', maxCount: 1 },
  { name: 'cswd_document', maxCount: 1 },
  { name: 'certificate_of_good_moral', maxCount: 1 },
  { name: 'certificate_of_ladderized_course', maxCount: 1 },
  { name: 'affidavit_of_guardianship', maxCount: 1 },
  { name: 'affidavit_of_support', maxCount: 1 },
]), [
  // Validation middleware for each field
  check('first_name').notEmpty().withMessage('First name is required'),
  check('middle_name').optional(),
  check('last_name').notEmpty().withMessage('Last name is required'),
  check('primary_cellphone').notEmpty().withMessage('Primary cellphone is required'),
  check('secondary_cellphone').optional(),

  check('barangay').notEmpty().withMessage('Barangay is required'),
  check('email').isEmail().withMessage('Invalid email address'),

  check('application_form').custom((value, { req }) => {
    if (!req.files['application_form'] || req.files['application_form'].length === 0) {
      throw new Error('Application form file is required');
    }
    return true;
  }),
 
  // Custom validation for file fields
  check('certificate_of_registration').custom((value, { req }) => {
    if (!req.files['certificate_of_registration'] || req.files['certificate_of_registration'].length === 0) {
      throw new Error('Certificate of Registration file is required');
    }
    return true;
  }),

  check('grades').custom((value, { req }) => {
    if (!req.files['grades'] || req.files['grades'].length === 0) {
      throw new Error('Grades file is required');
    }
    return true;
  }),

  check('school_id').custom((value, { req }) => {
    if (!req.files['school_id'] || req.files['school_id'].length === 0) {
      throw new Error('School ID file is required');
    }
    return true;
  }),

  check('voters_id').custom((value, { req }) => {
    if (!req.files['voters_id'] || req.files['voters_id'].length === 0) {
      throw new Error('Voters ID file is required');
    }
    return true;
  }),
  check('cswd_document').custom((value, { req }) => {
    if (!req.files['cswd_document'] || req.files['cswd_document'].length === 0) {
      throw new Error('Cswd_document file is required');
    }
    return true;
  }),
  check('proof_of_payment').custom((value, { req }) => {
    if (req.files['proof_of_payment'] && req.files['proof_of_payment'].length > 0) {
      // Voters ID file is present, perform any additional validation if needed.
      // For example, check the file type or size.
    }
    return true; // No error thrown if the file is optional.
  }),
  check('barangay_id').custom((value, { req }) => {
    if (req.files['barangay_id'] && req.files['barangay_id'].length > 0) {
      // Voters ID file is present, perform any additional validation if needed.
      // For example, check the file type or size.
    }
    return true; // No error thrown if the file is optional.
  }),
  check('certificate_of_good_moral').custom((value, { req }) => {
    if (req.files['certificate_of_good_moral'] && req.files['certificate_of_good_moral'].length > 0) {
      // Voters ID file is present, perform any additional validation if needed.
      // For example, check the file type or size.
    }
    return true; // No error thrown if the file is optional.
  }),
  check('certificate_of_ladderized_course').custom((value, { req }) => {
    if (req.files['certificate_of_ladderized_course'] && req.files['certificate_of_ladderized_course'].length > 0) {
      // Voters ID file is present, perform any additional validation if needed.
      // For example, check the file type or size.
    }
    return true; // No error thrown if the file is optional.
  }),
  check('affidavit_of_guardianship').custom((value, { req }) => {
    if (req.files['affidavit_of_guardianship'] && req.files['affidavit_of_guardianship'].length > 0) {
      // Voters ID file is present, perform any additional validation if needed.
      // For example, check the file type or size.
    }
    return true; // No error thrown if the file is optional.
  }),
  check('affidavit_of_support').custom((value, { req }) => {
    if (req.files['affidavit_of_support'] && req.files['affidavit_of_support'].length > 0) {
      // Voters ID file is present, perform any additional validation if needed.
      // For example, check the file type or size.
    }
    return true; // No error thrown if the file is optional.
  }),

  
], async (req, res) => {
  const errors = validationResult(req);
  if (req.body.first_name !== req.user.first_name || req.body.last_name !== req.user.last_name) {
    return res.render('applicant/applicationform', { errors: [{ msg: 'Warning!First name or last name does not match the logged-in user' }], formData: req.body, showForm: true });
  } 

if (!errors.isEmpty()) {

  // There are validation errors, re-render the form with error messages
  return res.render('applicant/applicationform', {errors: errors.array(), formData: req.body, showForm: true });
}
try {
  // Check the maximum number of submissions
  const count = await OldForm.countDocuments({ deletedAt: { $eq: null } });
  const schedule = await Schedule.findOne({ /* Your query criteria here */ }).exec();
  const currentTime = new Date();
  const startDateTime = new Date(schedule.start_date);
  const endDateTime = new Date(schedule.end_date);

  if (currentTime >= startDateTime && currentTime <= endDateTime) {
    // Application is open
    // Check if the maximum number of submissions has been reached
    if (count === schedule.limit) {
      // Maximum submissions reached, redirect to preregister page
      return res.redirect('/applicant/form');
    } else {
      // Proceed with form submission
      // Create a new instance of the OldForm model with the data from the request
      const formData = new OldForm({
        first_name: req.body.first_name,
        middle_name: req.body.middle_name,
        last_name: req.body.last_name,
        barangay: req.body.barangay,
        email: req.body.email,
        primary_cellphone: req.body.primary_cellphone,
        secondary_cellphone: req.body.secondary_cellphone,
        // Set the file IDs based on the field names
        certificate_of_registration: req.files['certificate_of_registration'][0].id,
        application_form: req.files['application_form'][0].id,
        grades: req.files['grades'][0].id,
        school_id: req.files['school_id'][0].id,
        voters_id: req.files['voters_id'][0].id,
        proof_of_payment: req.files['proof_of_payment'] ? req.files['proof_of_payment'][0].id : null,
        barangay_id: req.files['barangay_id'] ? req.files['barangay_id'][0].id : null,
        certificate_of_good_moral: req.files['certificate_of_good_moral'] ? req.files['certificate_of_good_moral'][0].id : null,
        certificate_of_ladderized_course: req.files['certificate_of_ladderized_course'] ? req.files['certificate_of_ladderized_course'][0].id : null,
        affidavit_of_guardianship: req.files['affidavit_of_guardianship'] ? req.files['affidavit_of_guardianship'][0].id : null,
        affidavit_of_support: req.files['affidavit_of_support'] ? req.files['affidavit_of_support'][0].id : null,
        cswd_document: req.files['cswd_document'] ? req.files['cswd_document'][0].id : null,
       
      });

      // Save the form data
      await formData.save();

      // Redirect to the appropriate page after successful submission
      return res.redirect('/applicant/form');
    }
  } else {
    // Application is not open, redirect to preregister page
    return res.redirect('/applicant/form');
  }
} catch (error) {
  console.error(error);
  req.flash('error', error.message);
  res.redirect('/applicant/applicationform');
}
});

router.get('/applicant/applicant-pre-reg', middleware.ensureApplicantLoggedIn, async (req, res) => {
  try {
    
    const existingForm = await Pre_registration.findOne({
      first_name: req.user.first_name,
      last_name: req.user.last_name,
      deletedAt: { $eq: null },
    }).exec();
    
    
    if (existingForm) {
      // If a user with the same first name and last name already has an OldForm, set showForm to false
      showForm = false; // Update the outer showForm variable
      return res.render('applicant/applicant-pre-reg', { showForm, existingForm, formData: {}, errors: [], message: null });
    } 

    const schedule = await Preregistration.findOne().exec();

    if (!schedule) {
      // Handle the case where no schedule was found
      const message = 'Sorry, there is no schedule yet.';
      return res.render('applicant/applicant-pre-reg', { showForm: false, message });
    }

    const currentTime = new Date();
    const startDateTime = new Date(schedule.startDate);
    const endDateTime = new Date(schedule.endDate);

    const timeUntilOpening = startDateTime - currentTime;

    // Calculate the threshold based on how close it is to opening
    let threshold = 60 * 60 * 1000; // Default threshold: 1 hour

    if (timeUntilOpening <= 0) {
      // Application is already open or past opening time, no threshold
      threshold = 0;
    } else if (timeUntilOpening < threshold) {
      // If it's less than the default threshold, adjust it to a shorter time
      threshold = timeUntilOpening;
    }

    if (currentTime >= startDateTime && currentTime <= endDateTime) {
      // Application is open
      const message = 'The application is currently open for submissions.';
      return res.render('applicant/applicant-pre-reg', { showForm: true, schedule, message, errors: null, formData: {} });
    } else if (timeUntilOpening > 0 && timeUntilOpening <= threshold) {
      // Application is opening soon
      const message = 'The application will open soon. Please check back shortly.';
      return res.render('applicant/applicant-pre-reg', { showForm: false, schedule, message, errors: null, formData: {} });
    } else {
      // Application is not open
      const message = 'The application is not currently open. Please wait for it to open.';
      return res.render('applicant/applicant-pre-reg', { showForm: false, schedule, message, errors: null, formData: {} });
    }
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to fetch the schedule');
    return res.status(500).send('Internal Server Error');
  }
});


router.post('/applicant/applicant-pre-reg', upload.fields([
  { name: 'support_enrolled', maxCount: 1 },
  { name: 'certificate_of_registration', maxCount: 1 },
  { name: 'grades', maxCount: 1 },
  { name: 'school_id', maxCount: 1 },
  { name: 'voters_id', maxCount: 1 },


]), [
  // Page 1
  check('enrolled').notEmpty().withMessage('Enrolled field is required'),
  check('units_enrolled').isNumeric().withMessage('Units enrolled must be a number'),
  check('incomplete_grade').notEmpty().withMessage('Incomplete grade field is required'),
  check('paranaque_resident').notEmpty().withMessage('Paranaque resident field is required'),
  check('registered_voter').notEmpty().withMessage('Registered voter field is required'),
  check('financial_assistance').notEmpty().withMessage('Financial assistance field is required'),
  check('barangay').notEmpty().withMessage('Barangay field is required'),
  check('declaration').notEmpty().withMessage('Declaration field is required'),

  // Page 2
  check('first_name').notEmpty().withMessage('First name is required'),
  check('middle_name').optional(),
  check('last_name').notEmpty().withMessage('Last name is required'),
  check('suffix').notEmpty().withMessage('Suffix is required'),
  check('address').notEmpty().withMessage('Address is required'),
  check('email').notEmpty().withMessage('Email is required'),
  check('contact_number').notEmpty().withMessage('Contact number is required'),
  check('alternative_contact_number').notEmpty().withMessage('Alternative contact number is required'),
  check('school_name').notEmpty().withMessage('School name is required'),
  check('course').notEmpty().withMessage('Course is required'),
  check('year_level').notEmpty().withMessage('Year level is required'),
  check('gwa').isNumeric().withMessage('GWA must be a number'),
  check('classification').notEmpty().withMessage('Classification is required'),
  check('last_application').optional(),
  

  // Custom validation for file fields
  check('support_enrolled').custom((value, { req }) => {
    if (!req.files['support_enrolled'] || req.files['support_enrolled'].length === 0) {
      
    }
    return true;
  }),

  // Custom validation for file fields
  check('certificate_of_registration').custom((value, { req }) => {
    if (!req.files['certificate_of_registration'] || req.files['certificate_of_registration'].length === 0) {
      throw new Error('Certificate of Registration file is required');
    }
    return true;
  }),

  check('grades').custom((value, { req }) => {
    if (!req.files['grades'] || req.files['grades'].length === 0) {
      throw new Error('Grades file is required');
    }
    return true;
  }),

  check('school_id').custom((value, { req }) => {
    if (!req.files['school_id'] || req.files['school_id'].length === 0) {
      throw new Error('School ID file is required');
    }
    return true;
  }),

  check('voters_id').custom((value, { req }) => {
    if (!req.files['voters_id'] || req.files['voters_id'].length === 0) {
      throw new Error('Voters ID file is required');
    }
    return true;
  }),

], async (req, res) => {
  const errors = validationResult(req);
  // Check if the first_name and last_name provided in the form match the first_name and last_name of the logged-in user
if (req.body.first_name !== req.user.first_name || req.body.last_name !== req.user.last_name) {
  return res.render('applicant/applicant-pre-reg', { errors: [{ msg: 'Warning!First name or last name does not match the logged-in user' }], formData: req.body, showForm: true });
} 

if (!errors.isEmpty()) {
  // There are validation errors, re-render the form with error messages
  return res.render('applicant/applicant-pre-reg', { errors: errors.array(), formData: req.body, showForm: true });
}

    // Create a new instance of the OldForm model with the data from the request
  const formData = new Pre_registration({
    enrolled: req.body.enrolled,
    units_enrolled: req.body.units_enrolled,
    incomplete_grade: req.body.incomplete_grade,
    paranaque_resident: req.body.paranaque_resident,
    registered_voter: req.body.registered_voter,
    financial_assistance: req.body.financial_assistance,
    other_agency: req.body.other_agency,
    barangay: req.body.barangay,
    declaration: req.body.declaration,

    // Page 2
    first_name: req.body.first_name,
    middle_name: req.body.middle_name,
    last_name: req.body.last_name,
    suffix: req.body.suffix,
    address: req.body.address,
    email: req.body.email,
    contact_number: req.body.contact_number,
    alternative_contact_number: req.body.alternative_contact_number,
    school_name: req.body.school_name,
    course: req.body.course,
    year_level: req.body.year_level,
    gwa: req.body.gwa,
    classification: req.body.classification,
    last_application: req.body.last_application,
    
     // Set the file IDs based on the field names
     support_enrolled: req.files['support_enrolled'] ? req.files['support_enrolled'][0].id : null,
     certificate_of_registration: req.files['certificate_of_registration'][0].id,
     grades: req.files['grades'][0].id,
     school_id: req.files['school_id'][0].id,
     voters_id: req.files['voters_id'][0].id,

  });
    
  formData.save()
  .then(() => {
    req.flash('success', 'Pre Registration has been submitted');
    res.redirect('/applicant/applicant-pre-reg');
  })
  .catch((error) => {
    req.flash('error', error.message);
    res.redirect('/applicant/applicant-pre-reg');
  });
});




router.get('/applicant/form', middleware.ensureApplicantLoggedIn, async (req, res) => {
  try {
      // Initialize variables
      let showForm = false;
      let message = '';
      let existingForm = null;

      // Check if a user with the same first name and last name already has a Pre_registration record
      const existingprereg = await Pre_registration.find({ deletedAt: { $eq: null } }).exec();

      if (existingprereg.length === 0) {
          // If no Pre_registration record found, set message
          message = 'You don\'t have a record of Pre-registration, please fill out the form first.';
      } else {
          // Check if a user with the same first name and last name already has an OldForm record
          existingForm = await OldForm.findOne({ first_name: req.user.first_name, last_name: req.user.last_name }).exec();

          // Check the maximum number of submissions
          const count = await OldForm.countDocuments({ deletedAt: { $eq: null } });
          const schedule = await Schedule.findOne({}).exec();

          if (!schedule) {
              // If no schedule found, set message
              message = 'Sorry, there is no schedule yet.';
          } else {
              const currentTime = new Date();
              const startDateTime = new Date(schedule.start_date);
              const endDateTime = new Date(schedule.end_date);
              const timeUntilOpening = startDateTime - currentTime;
              const threshold = 60 * 60 * 1000; // 1 hour threshold

              if (!startDateTime || !endDateTime) {
                  // Handle the case when start_date or end_date is missing
                  message = 'Sorry, the schedule is incomplete.';
              } else if (existingForm) {
                  // If existingForm found, set message
                  message = 'You already submitted the form.';
              } else if (count === schedule.limit) {
                  // If maximum submissions reached, set message
                  message = 'The maximum number of submissions has been reached. Please try again later.';
              } else if (currentTime >= startDateTime && currentTime <= endDateTime) {
                  // If application is open, set showForm to true
                  showForm = true;
                  message = 'The application is currently open for submissions.';
              } else if (timeUntilOpening > 0 && timeUntilOpening <= threshold) {
                  // If application opening soon, set message
                  message = 'The application will open soon. Please check back shortly.';
              } else {
                  // If application is not open, set message
                  message = 'The application is not currently open. Please wait for it to open.';
              }
          }
      }

      return res.render('applicant/form', { showForm, message, existingForm, existingprereg });

  } catch (error) {
      console.error(error);
      req.flash('error', 'Failed to fetch the schedule');
      return res.status(500).send('Internal Server Error');
  }
});


const checkPreregistrationCode = async (req, res, next) => {
  try {
    // Fetch the Pre_Registration record
    const preRegistration = await Pre_registration.findOne({
      first_name: req.user.first_name,
      last_name: req.user.last_name,
      deletedAt: { $eq: null },
    }).exec();

    // Check if the user has a pre-registration code
    if (!preRegistration || !preRegistration.code) {
      req.flash('error', 'You don\'t have a pre-registration code. Please fill out the pre-registration form.');
      return res.redirect('/applicant/form'); // Adjust the redirection URL as per your application's routes
    }

    // Check if the user is disqualified
    const disqualified = await Pre_registration_disqualified.findOne({
      first_name: req.user.first_name,
      last_name: req.user.last_name,
      deletedAt: { $eq: null },
    }).exec();

    if (disqualified) {
      req.flash('error', 'You are already disqualified.');
      return res.redirect('/applicant/form'); // Adjust the redirection URL as per your application's routes
    }

    // If the user has a pre-registration code and is not disqualified, proceed to the next middleware or route handler
    next();
  } catch (error) {
    console.error(error);
    req.flash('error', 'An error occurred. Please try again later.');
    return res.redirect('/applicant/form'); // Adjust the redirection URL as per your application's routes
  }
};


router.get('/applicant/applicationform', middleware.ensureApplicantLoggedIn,checkPreregistrationCode, async (req, res) => {
  try {
    // Find the user based on certain criteria, such as email or unique identifier
    const user = await User.findOne({ deletedAt: { $eq: null } }).exec();

    if (!user) {
      // Handle the case where the user is not found
      return res.status(404).send('User not found');
    }
    
    // Determine if the form should be shown based on user category
    let showForm = true; // Default to true
    if (user.category === 'new-applicant') {
      showForm = true;
    } else {
      showForm = false;
    }

    // Render the oldform view with user data and showForm status
    res.render("applicant/applicationform", { user, errors: null, formData: {}, showForm});
  } catch (error) {
    console.error(error);
    return res.status(500).send('Internal Server Error');
  }
});
router.post('/applicant/form', async (req, res) => {
  try {
      // Fetch the Pre_Registration record
      const preRegistration = await Pre_registration.findOne({
          first_name: req.user.first_name,
          last_name: req.user.last_name,
          deletedAt: { $eq: null },
      }).exec();

      const enteredCode = req.body.code;

      if (!preRegistration) {
          req.flash('error', 'You don\'t have a record of pre-registration. Please fill out the form first.');
          return res.redirect('/applicant/form');
      }

      // Check if entered code matches pre-registration code
      if (enteredCode === preRegistration.code) {
          req.flash('success', 'Entered code is correct.');
          return res.redirect('/applicant/applicationform');
      } else {
          req.flash('error', 'Invalid code. Please check your code and try again.');
          return res.redirect('/applicant/form');
      }
  } catch (error) {
      console.error(error);
      req.flash('error', 'An error occurred. Please try again later.');
      return res.redirect('/applicant/form');
  }
});




// Assuming you're using a route like /applicant/announcement
router.get('/applicant/announcement', middleware.ensureApplicantLoggedIn, async (req, res) => {
  try {
    // Fetch all announcements from MongoDB
    const announcements = await Announcement.find().exec();
    const formSched = await Schedule.find().exec();
    const preregSched = await Preregistration.find().exec();

    // Render the applicant announcement page and pass the announcements to the template
    res.render('applicant/announcement', {
      user: req.user,
      formSched: formSched,
      preregSched: preregSched,
      announcements: announcements, // Pass the announcements to the template
      message: req.flash('success')
    });
  } catch (error) {
    console.error(error);
    // Handle errors, perhaps by displaying an error message to the user
    res.status(500).send('An error occurred while fetching announcements.');
  }
});

  
router.get("/applicant/profile",middleware.ensureApplicantLoggedIn, (req, res) =>
  res.render("applicant/profile")
);
router.put("/applicant/profile", middleware.ensureApplicantLoggedIn, async (req, res) => {
  try {
      const id = req.user._id;
      const updateObj = req.body.user; // updateObj: {firstName, lastName, gender, address, phone, password}
      
      // Check if the updateObj contains a password field
      if (updateObj.password) {
          // Hash the new password before updating
          const hashedPassword = await bcrypt.hash(updateObj.password, 10);
          updateObj.password = hashedPassword; // Replace plain-text password with hashed password
      }

      await User.findByIdAndUpdate(id, updateObj);

      req.flash("success", "Profile updated successfully");
      res.redirect("/applicant/profile");
  } catch (err) {
      console.log(err);
      req.flash("error", "Some error occurred on the server.")
      res.redirect("back");
  }
});

/*
// Define a route to fetch and display uploaded files
router.get("/applicant/oldform", ensureAuthenticated, async (req, res) => {
  try {
    // Fetch the file information from the database
    const files = await File.find(); // Replace 'File' with your actual Mongoose model

    // Map the files to include URLs or paths based on your server's configuration
    const fileURLs = files.map(file => `/path/to/store/${file.filename}`); // Update the path as needed

    res.render("applicant/oldform", { fileURLs }); // Pass 'fileURLs' to the view
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Define a route that uses the upload middleware to handle file uploads
router.post("/applicant/oldform", uploadMiddleware.single("file"), async (req, res) => {
  try {
    // Access information about the uploaded file from 'req.file'
    const { filename, originalname, mimetype, size, id } = req.file;

    // Check the values of these variables for debugging
    console.log("filename:", filename);
    console.log("originalname:", originalname);
    console.log("mimetype:", mimetype);
    console.log("size:", size);
    console.log("id:", id);

    // Ensure the storage directory exists
    const storagePath = 'path/to/store/';
    if (!fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath, { recursive: true });
    }

    // Save the file data to GridFS
    if (bucket) {
      const readStream = bucket.openDownloadStream(id);
      const writeStream = fs.createWriteStream(`${storagePath}${filename}`);

      // Pipe the read stream to the write stream to save the file
      readStream.pipe(writeStream);

      // Handle the completion of the write stream
      writeStream.on('finish', () => {
        console.log('File saved successfully');

        // Construct the file URL based on your server's configuration
        const fileURL = `/path/to/store/${filename}`;

        // Now that the file is saved, you can render it in your response
        res.status(200).render("applicant/oldform", {
          fileURL, // Pass the fileURL to the view
          message: "File uploaded successfully"
        });
      });

      // Handle errors related to the write stream
      writeStream.on('error', (error) => {
        console.error('Error saving file:', error);
        res.status(500).json({ error: "Internal server error" });
      });
    } else {
      console.log('Bucket is not initialized');
      res.status(500).json({ error: "Internal server error" });
    }
  } catch (error) {
    // Handle other errors
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
*/

module.exports = router;