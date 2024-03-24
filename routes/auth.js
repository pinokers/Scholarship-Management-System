const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/user.js");
const Admin = require("../models/admin.js");
const passport = require("passport");
const { forwardAuthenticated } = require('../middleware/index');
const admin = require("../models/admin.js");


router.get("/auth/register", forwardAuthenticated, (req,res) => {
	res.render("auth/register", { title: "User Signup" });
});
router.get("/auth/adminregister", forwardAuthenticated, (req,res) => {
	res.render("auth/adminregister", { title: "Admin Signup" });
});

// Register

router.post('/auth/register', (req, res) => {
    const { name, email, password, password2, course, contact, schoolID, schoolName, schoolAddress } = req.body;
    let errors = [];
  
    if (!name || !email || !password || !password2 || !course || !contact || !schoolID || !schoolName || !schoolAddress) {
      errors.push({ msg: 'Please enter all fields' });
    }
  
    if (password !== password2) {
      errors.push({ msg: 'Passwords do not match' });
    }
  
    if (password.length < 6) {
      errors.push({ msg: 'Password must be at least 6 characters' });
    }
  
    if (errors.length > 0) {
      res.render('auth/register', {
        errors,
        name,
        email,
        password,
        password2,
        course,
        contact,
        schoolID,
        schoolName,
        schoolAddress
      });
    } else {
      User.findOne({ email: email }).then(user => {
        if (user) {
          errors.push({ msg: 'Email already exists' });
          res.render('auth/register', {
            errors,
            name,
            email,
            password,
            password2,
            course,
            contact,
            schoolID,
            schoolName,
            schoolAddress
          });
        } else {
          const newUser = new User({
            name,
            email,
            password,
            course,
            contact,
            schoolID,
            schoolName,
            schoolAddress
          });
  
          bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(newUser.password, salt, (err, hash) => {
              if (err) throw err;
              newUser.password = hash;
              newUser
                .save()
                .then(user => {
                  req.flash(
                    'success',
                    'You are now registered and can log in'
                  );
                  res.redirect('/auth/applicantlogin');
                })
                .catch(err => console.log(err));
            });
          });
        }
      });
    }
  });
  router.get("/auth/applicantlogin", forwardAuthenticated, (req,res) => {
    res.render("auth/applicantlogin", { title: "User login", message: req.flash('success') });
  });
  
  // Login
  router.post('/auth/applicantlogin', (req, res, next) => {
    passport.authenticate('local-user', {
      successRedirect: '/applicant/dashboard', // Redirect to the user dashboard on success
      failureRedirect: '/auth/applicantlogin',     // Redirect back to the login page on failure
      failureFlash: true                 // Enable flash messages for login failures
    })(req, res, next);
  });
  

  // Example route to retrieve all admin users
  router.get("/auth/adminlogin",  (req,res) => {
    res.render("auth/adminlogin", { title: "Admin login" });
  });
// Login
router.post('/auth/adminlogin', (req, res, next) => {
  passport.authenticate('local-admin', {
    successRedirect: '/admin/manager', // Redirect to the admin dashboard on success
    failureRedirect: '/auth/adminlogin', // Redirect back to the admin login page on failure
    failureFlash: true                  // Enable flash messages for admin login failures
  })(req, res, next);
});


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
router.get('/auth/adminlogout', function(req, res, next){
  if(req.user){
    req.flash('success', 'You have been logged out successfully'); // Add a success flash message
    req.session.destroy();
    res.redirect('/auth/adminlogin');
  } else {
    res.redirect('/');
  }
});







module.exports = router;