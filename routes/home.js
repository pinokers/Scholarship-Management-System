const express = require("express");
const router = express.Router();

router.get("/", (req,res) => {
	res.render("home/welcome");
});
router.get("/home/about", (req,res) => {
	res.render("home/about",{ title: "About Us | SSO" });
});
router.get("/home/contact", (req,res) => {
	res.render("home/contact",{ title: "Contact | SSO" });
});
router.get("/home/home", (req,res) => {
	res.render("home/home",{ title: "Home | SSO" });
});
module.exports = router;