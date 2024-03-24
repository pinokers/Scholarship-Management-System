const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/user.js");
const Admin = require("../models/admin.js");
const passport = require("passport");
const middleware = require('../middleware/index');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { check, validationResult } = require('express-validator');


router.get("/auth/register", middleware.ensureNotLoggedIn, (req, res) => {
  res.render("auth/register", { title: "User Signup", newUser: {}, errors: [] });
});


router.get("/auth/adminregister", middleware.ensureNotLoggedIn, (req,res) => {
	res.render("auth/adminregister", { title: "Admin Signup" });
});

router.get('/auth/verify-email', async (req, res) => {
  try {
    // Extract the verification token from the query parameters
    const { token } = req.query;

    // Find the user with the corresponding verification token
    const user = await User.findOne({ verificationToken: token });

    // Define a variable to represent the verification status
    let verified = false;

    // Check if the user exists and if the email is not already verified
    if (user && !user.verified) {
      // Update the user's verification status to true
      user.verified = true;

      // Save the updated user to the database
      await user.save();

      // Set verified to true if the verification is successful
      verified = true;
    }

    // Render the 'auth/verify-email' template with the email and verification status
    res.render('auth/verify-email', { email: user ? user.email : null, verified });
  } catch (error) {
    console.error(error);
    // Redirect to an error page if an exception occurs during the verification process
    res.render('auth/verification-error');
  }
});



router.post('/auth/register', [
  // Validation checks using express-validator
  check('first_name').notEmpty().withMessage('Please enter your first name'),
  check('middle_name').optional(),
  check('last_name').notEmpty().withMessage('Please enter your last name'),
  check('suffix').notEmpty().withMessage('Please select a suffix'),
  check('email').isEmail().withMessage('Please enter a valid email address'),
  check('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  check('password2').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  }),
  check('course').notEmpty().withMessage('Please enter your course'),
  check('contact').notEmpty().withMessage('Please enter your contact information'),
  check('districtSelect').notEmpty().withMessage('Please select a district'),
  check('barangaySelect').notEmpty().withMessage('Please select a barangay'),
  check('schoolID').notEmpty().withMessage('Please enter your school ID'),
  check('schoolName').notEmpty().withMessage('Please enter your school name'),
  check('schoolAddress').notEmpty().withMessage('Please enter your school address'),
  check('category').notEmpty().withMessage('Please select a category'),
], async (req, res) => {
  // Handle validation errors
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.render('auth/register', {
      errors: errors.array(),
       newUser: req.body ,
    });
  }
  // If there are no validation errors, continue with the registration logic

    try {
            // Check if the user with the provided email already exists
          const existingEmail = await User.findOne({ 
            email: req.body.email 
          });

          if (existingEmail) {
            req.flash('error', 'Email already existed, please login or use a different email');
            return res.render('auth/register', {
                errors: [{ msg: 'Email already existed, please login or use a different email' }],
                newUser: req.body,
            });
          }
        // Check if the user with the provided email already exists
        const existingUser = await User.findOne({  
          first_name: req.body.first_name, 
          last_name: req.body.last_name 
        });
        if (existingUser) {
          req.flash('error', 'Warning you can only register one account per person, please login or contact us for account recovery');
          return res.render('auth/register', {
              errors: [{ msg: ' user already exists, please login' }],
              newUser: req.body,
          });
        }

    // Create a new user with the provided data
    const newUser = new User({
      first_name: req.body.first_name,
      middle_name: req.body.middle_name,
      last_name: req.body.last_name,
      suffix: req.body.suffix,
      email: req.body.email,
      password: req.body.password,
      course: req.body.course,
      contact: req.body.contact,
      districtSelect: req.body.districtSelect,
      barangaySelect: req.body.barangaySelect,
      schoolID: req.body.schoolID,
      schoolName: req.body.schoolName,
      schoolAddress: req.body.schoolAddress,
      category: req.body.category,
      verified: false,
    });

    // Generate a verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Update the new user with the verification token
    newUser.verificationToken = verificationToken;

    // Hash the user's password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newUser.password, salt);
    newUser.password = hash;

    // Save the user to the database
    await newUser.save();

    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: 'ssoscholarsip@gmail.com',
        pass: 'fgsadkvsziqmhaun',
      },
      port: 465, // or 587
      secure: true, // true for 465, false for other ports
    });

    // Send verification email
    const verificationLink = `${req.protocol}://${req.hostname}${req.originalUrl}/auth/verify-email?token=${verificationToken}`;
    const mailOptions = {
      from: 'ssoscholarsip@gmail.com',
      to: req.body.email,
      subject: 'Email Verification',
      html: `<p>Thank you for registering! Please click <a href="${verificationLink}">here</a> to verify your email.</p>`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
        // Handle email sending error
        req.flash('error', 'Error sending verification email');
        return res.redirect('/auth/register');
      } else {
        req.flash('success', 'Go to your email for verification');
        // Email sent successfully, redirect to a page informing the user to check their email
        return res.redirect('/auth/applicantlogin');
      }
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Error during registration');
    return res.redirect('/auth/register');
  }
});



  router.get("/auth/applicantlogin", middleware.ensureNotLoggedIn, (req,res) => {
    res.render("auth/applicantlogin", { title: "User login", message: req.flash('success') });
  });
  
  // Login
  router.post('/auth/applicantlogin', async (req, res, next) => {
    passport.authenticate('local-user', async (err, user, info) => {
      try {
        if (err) {
          console.error(err);
          return next(err);
        }
  
        if (!user) {
          // User not found or password incorrect
          req.flash('error', 'Invalid email or password');
          return res.redirect('/auth/applicantlogin');
        }
  
        // Check if the user is verified
        if (!user.verified) {
          // User not verified, display an error or redirect to a verification page
          req.flash('error', 'Your email is not verified. Please check your email for the verification link.');
          return res.redirect('/auth/applicantlogin');
        }
  
        req.logIn(user, (loginErr) => {
          if (loginErr) {
            console.error(loginErr);
            return next(loginErr);
          }
  
          // Successfully logged in, redirect to the user dashboard
          return res.redirect('/applicant/announcement');
        });
      } catch (error) {
        console.error(error);
        return next(error);
      }
    })(req, res, next);
  });
  
  

  // Example route to retrieve all admin users
  router.get("/auth/adminlogin",middleware.ensureNotLoggedIn,  (req,res) => {
    res.render("auth/adminlogin", { title: "Admin login" });
  });
// Login
router.post("/auth/adminlogin", middleware.ensureNotLoggedIn,
    passport.authenticate('local-admin', {
        failureRedirect: "/auth/adminlogin",
        failureFlash: true,
        successFlash: true
    }), (req, res) => {
        // After successful authentication, establish a session for the user
        req.login(req.user, function(err) {
            if (err) {
                return next(err);
            }
           
            // Redirect using JavaScript
            res.send('<script>window.location="/admin/dashboard";</script>');
        });
    }
);





// Logout
router.get('/auth/logout', function(req, res, next){
  if(req.user){
    req.flash('success', 'You have been logged out successfully'); // Add a success flash message
    req.session.destroy();
    res.redirect('/auth/applicantlogin');
  } else {
    res.redirect('/');
  }
});
// Logout
router.get("/auth/adminlogout", (req, res) => {
  req.logout(function(err) {
    if (err) { return next(err); }

    // Set cache-control headers to prevent caching
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Redirect using JavaScript
    res.send('<script>window.location="/auth/adminlogin";</script>');
  });
});










module.exports = router;