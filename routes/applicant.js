const express = require("express");
const router = express.Router();
const User = require("../models/user.js");
const { ensureAuthenticated, forwardAuthenticated } = require('../middleware/index');


// Welcome Page
router.get('/', forwardAuthenticated, (req, res) => res.render('/home/welcome'));
// Dashboard
router.get("/applicant/dashboard", ensureAuthenticated, (req, res) =>
  res.render("applicant/dashboard", {
    user: req.user, message: req.flash('success')
  })
);
router.get("/applicant/applicationform", ensureAuthenticated, (req, res) =>
  res.render("applicant/applicationform")
);

router.get("/applicant/profile", ensureAuthenticated, (req, res) =>
  res.render("applicant/profile")
);
router.put("/applicant/profile", ensureAuthenticated, async (req,res) => {
	try
	{
		const id = req.user._id;
		const updateObj = req.body.user;	// updateObj: {firstName, lastName, gender, address, phone}
		await User.findByIdAndUpdate(id, updateObj);
		
		req.flash("success", "Profile updated successfully");
		res.redirect("/applicant/profile");
	}
	catch(err)
	{
		console.log(err);
		req.flash("error", "Some error occurred on the server.")
		res.redirect("back");
	}
	
});


module.exports = router;