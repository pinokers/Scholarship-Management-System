const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require("bcryptjs");
const User = require('../models/user.js');
const Admin = require('../models/admin.js');
const nodemailer = require('nodemailer');


// Configure Nodemailer for sending emails (replace with your SMTP details)
const transporter = nodemailer.createTransport({
	service: 'Gmail',
	auth: {
	  user: 'ssoscholarsip@gmail.com',
	  pass: 'fgsadkvsziqmhaun '
	},
  });


router.get('/mail/forgetpassword', (req, res) => {
  res.render('mail/forgetpassword');
});

// Your password reset route
router.post('/mail/forgetpassword', async (req, res) => {
  try {
    const email = req.body.email; // Get the user's email from the request

    // Check if the email exists in the database
    const user = await User.findOne({ email });

    if (!user) {
      // Handle the case where the user does not exist
      req.flash('error', 'User not found'); // Set an error flash message
      return res.redirect('/mail/forgetpassword');
    }

    const token = crypto.randomBytes(20).toString('hex');

    user.resetToken = token;
    user.resetTokenExpiration = Date.now() + 3600000; // 1 hour
    await user.save();

    const mailOptions = {
      to: user.email,
      from: 'rexsonacebedo18@gmail.com',
      subject: 'Password Reset',
      text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n`
          + `Please click on the following link, or paste this into your browser to complete the process:\n\n`
          + `http://${req.headers.host}/mail/resetpassword/${token}\n\n`
          + `If you did not request this, please ignore this email and your password will remain unchanged.\n`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        req.flash('error', 'Email could not be sent'); // Set an error flash message
      } else {
        console.log('Email sent: ' + info.response);
        // Set a success flash message
      }
    });
    req.flash('success', 'Email sent! Check your inbox for further instructions.');
    res.redirect('/mail/forgetpassword');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Server Error'); // Set an error flash message for server errors
    res.status(500).send('Server Error');
  }
});

// Example route for resetting the password
router.get('/mail/resetpassword/:token', async (req, res) => {
  try {
    const user = await User.findOne({
      resetToken: req.params.token,
      resetTokenExpiration: { $gt: new Date() },
    });
    
    if (!user) {
      console.log('Invalid or expired token:', req.params.token);
      return res.redirect('/mail/forgetpassword');
    }

    console.log('User found for token:', user); // Debug log

    res.render('mail/resetpassword', { token: req.params.token });
  } catch (err) {
    console.error('Error in reset password route:', err); // Debug log
    res.status(500).send('Server Error');
  }
});


// Your password reset route
router.post('/mail/resetpassword/:token', async (req, res) => {
  try {
    const user = await User.findOne({
      resetToken: req.params.token,
      resetTokenExpiration: { $gt: Date.now() },
    });

    if (!user) {
      // Handle invalid or expired token
      req.flash('error', 'Invalid or expired token'); // Set an error flash message
      return res.redirect('/email/forgetpassword');
    }

    const newPassword = req.body.password;
    const confirmPassword = req.body.confirmPassword;

    // Check if the new password and confirm password match
    if (newPassword !== confirmPassword) {
      req.flash('error', 'Passwords do not match'); // Set an error flash message
      return res.redirect(`/mail/resetpassword/${req.params.token}`);
    }

    // Hash the new password using bcrypt
    const hashedPassword = await bcrypt.hash(newPassword, 10); // 10 is the salt rounds

    // Update the user's password and clear the reset token fields
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiration = undefined;
    await user.save();

    req.flash('success', 'Password reset successful'); // Set a success flash message
    res.redirect('/auth/applicantlogin'); // Redirect to the login page
  } catch (err) {
    console.error(err);
    req.flash('error', 'Server Error'); // Set an error flash message for server errors
    res.status(500).send('Server Error');
  }
});



router.get('/mail/forgetadmin', (req, res) => {
  res.render('mail/forgetadmin');
});
// For generating the reset token and sending the reset email for admin
router.post('/mail/forgetadmin', async (req, res) => {
  try {
    const email = req.body.email; // Get the admin's email from the request

    // Check if the email exists in the database and if the user is an admin
    const admin = await Admin.findOne({ email });

    if (!admin) {
      // Handle the case where the admin does not exist
      req.flash('error', 'Admin not found'); // Set an error flash message
      return res.redirect('/mail/forgetadmin');
    }


    const token = crypto.randomBytes(20).toString('hex');

    admin.resetToken = token;
    admin.resetTokenExpiration = Date.now() + 3600000; // 1 hour
    await admin.save();

    const mailOptions = {
      to: admin.email,
      from: 'rexsonacebedo18@gmail.com',
      subject: 'Password Reset',
      text: `You are receiving this because you (or someone else) have requested the reset of the password for your admin account.\n\n`
          + `Please click on the following link, or paste this into your browser to complete the process:\n\n`
          + `http://${req.headers.host}/mail/resetadmin/${token}\n\n`
          + `If you did not request this, please ignore this email, and your password will remain unchanged.\n`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        req.flash('error', 'Email could not be sent'); // Set an error flash message
      } else {
        console.log('Email sent: ' + info.response);
        // Set a success flash message
      }
    });
    req.flash('success', 'Email sent! Check your inbox for further instructions.');
    res.redirect('/mail/forgetadmin');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Server Error'); // Set an error flash message for server errors
    res.status(500).send('Server Error');
  }
});


// Example route for resetting the password
router.get('/mail/resetadmin/:token', async (req, res) => {
  try {
    const admin = await Admin.findOne({
      resetToken: req.params.token,
      resetTokenExpiration: { $gt: new Date() },
    });
    
    if (!admin) {
      console.log('Invalid or expired token:', req.params.token);
      return res.redirect('/mail/forgetadmin');
    }

    console.log('Admin found for token:', admin); // Debug log

    res.render('mail/resetadmin', { token: req.params.token });
  } catch (err) {
    console.error('Error in reset password route:', err); // Debug log
    res.status(500).send('Server Error');
  }
});

// Admin password reset route
router.post('/mail/resetadmin/:token', async (req, res) => {
  try {
    const admin = await Admin.findOne({
      resetToken: req.params.token,
      resetTokenExpiration: { $gt: Date.now() },
    });

    if (!admin) {
      // Handle invalid or expired token
      req.flash('error', 'Invalid or expired token'); // Set an error flash message
      return res.redirect('/email/forgetadmin');
    }

    const newPassword = req.body.password;
    const confirmPassword = req.body.confirmPassword;

    // Check if the new password and confirm password match
    if (newPassword !== confirmPassword) {
      req.flash('error', 'Passwords do not match'); // Set an error flash message
      return res.redirect(`/mail/resetadmin/${req.params.token}`);
    }

    // Hash the new password using bcrypt
    const hashedPassword = await bcrypt.hash(newPassword, 10); // 10 is the salt rounds

    // Update the admin's password and clear the reset token fields
    admin.password = hashedPassword;
    admin.resetToken = undefined;
    admin.resetTokenExpiration = undefined;
    await admin.save();

    req.flash('success', 'Password reset successful'); // Set a success flash message
    res.redirect('/auth/adminlogin'); // Redirect to the admin login page
  } catch (err) {
    console.error(err);
    req.flash('error', 'Server Error'); // Set an error flash message for server errors
    res.status(500).send('Server Error');
  }
});


module.exports = router;
