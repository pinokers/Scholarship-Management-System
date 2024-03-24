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


require('dotenv').config();
// Passport Config
require('./config/passport')(passport);
const connectDB = require('./config/dbConnection');
connectDB();


// Set the view engine to EJS (if you're using EJS)
app.set('view engine', 'ejs');

// Express Layouts
app.use(expressLayouts);
app.use("/public", express.static(__dirname + "/public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
	secret: "secret",
	resave: true,
	saveUninitialized: true
}));

// Initialize Passport middleware
app.use(passport.initialize());
app.use(passport.session());
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
