const express = require("express");
const app = express();
const passport = require("passport");
const flash = require("connect-flash");
const session = require("express-session");
const expressLayouts = require("express-ejs-layouts");
const methodOverride = require("method-override");
const homeRoutes = require("./routes/home.js");
const authRoutes = require("./routes/auth.js");
const adRoutes = require("./routes/admin.js");
const appRoutes = require("./routes/applicant.js");
const mailRoutes = require("./routes/mail.js");
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const User = require('./models/user.js');
const Admin = require('./models/admin.js');
const faker = require('faker');

const fs = require("fs")
const path = require("path");

require('dotenv').config();
// Add the no-cache middleware
app.use((req, res, next) => {
	res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
	res.header('Expires', '-1');
	res.header('Pragma', 'no-cache');
	next();
  });

app.use(session({
	secret: "secret",
	resave: false,
	saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
// Passport Config
require('./config/passport')(passport);
const connectDB = require('./config/dbConnection');

connectDB();

// Configure Nodemailer for sending emails (replace with your SMTP details)
const transporter = nodemailer.createTransport({
	service: 'Gmail',
	auth: {
	  user: 'ssoscholarsip@gmail.com',
	  pass: 'fgsadkvsziqmhaun '
	},
  });

// Set the view engine to EJS (if you're using EJS)
app.set('view engine', 'ejs');

// Express Layouts
app.use(expressLayouts);
app.use("/public", express.static(__dirname + "/public"));
// Middleware to exclude certain routes from intercepting
const excludeRoutes = ['/generate-pdf']; // Add routes that should be excluded

app.use((req, res, next) => {
  if (excludeRoutes.includes(req.path)) {
    next(); // Skip the middleware for excluded routes
  } else {
    express.urlencoded({ extended: true })(req, res, next); // Apply middleware for other routes
  }
});



// Flash Messages
app.use(flash());
app.use(methodOverride('_method'));
app.use((req, res, next) => {
	res.locals.currentUser = req.user;
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
	res.locals.warning = req.flash("warning");
	next();
});



// Routes
app.use(homeRoutes);
app.use(authRoutes);
app.use(appRoutes);
app.use(adRoutes);
app.use(mailRoutes);

// Handle 404 errors
app.get('*', (req, res) => {
	// Create a custom error object with details
	const error = new Error('Page Not Found');
	error.status = 404;
  
	// Render the '404' template with the error details
	res.status(404).render('404', { error });
  });
  

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
