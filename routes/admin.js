const express = require("express");
const router = express.Router();
const Admin = require("../models/admin.js");
const passport = require("passport");
const bcrypt = require("bcryptjs");
const { ensureAuthenticated, forwardAuthenticated } = require('../middleware/index');


// Welcome Page
router.get('/', forwardAuthenticated, (req, res) => res.render('/home/welcome'));
// Dashboard
router.get("/admin/dashboard", ensureAuthenticated, (req, res) =>
  res.render("admin/dashboard", {
    admin: req.user, message: req.flash('success')
  })
);
router.get("/admin/manager", ensureAuthenticated, (req, res) => {
	// Assuming you have a function to fetch a list of admin users from your database
	Admin.find({}, (err, adminUsers) => {
	  if (err) {
		console.error(err);
		// Handle the error and return an appropriate response
	  } else {
		res.render("admin/manager", { adminUsers: adminUsers, admin: req.user, message: req.flash('success') });
	  }
	});
  });
  
router.get("/admin/add", ensureAuthenticated, (req, res) =>
  res.render("admin/add")
);
router.get("/admin/view/:id", ensureAuthenticated, async (req, res) => {
  try {
    const admin = await Admin.findOne({ _id: req.params.id });

    if (!admin) {
      return res.status(404).send("Admin not found");
    }

    const locals = {
      title: 'View Customer Data',
      description: 'Free NodeJs User Management System'
    };

    res.render('admin/view', {
      locals,
      admin
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
});
// GET route to render the admin edit form
router.get("/admin/edit/:id", ensureAuthenticated, async (req, res) => {
  try {
    const admin = await Admin.findOne({ _id: req.params.id });

    if (!admin) {
      return res.status(404).send("Admin not found");
    }

    const locals = {
      title: 'Edit Customer Data',
      description: 'Free NodeJs User Management System'
    };

    res.render('admin/edit', {
      locals,
      admin
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// POST route to handle admin updates
router.put("/admin/edit/:id", async (req, res) => {
  try {
    const existingAdmin = await Admin.findById(req.params.id);

    if (!existingAdmin) {
      return res.status(404).send("Admin not found");
    }

    const updatedData = {
      name: req.body.name,
      contact: req.body.contact,
      email: req.body.email,
      address: req.body.address,
      updatedAt: Date.now()
    };

    // Check if a new password was provided and it's different from the existing one
    if (req.body.password && req.body.password !== existingAdmin.password) {
      // Check if the new password meets the minimum length requirement (e.g., 6 characters)
      if (req.body.password.length < 6) {
        req.flash('error', 'Password must be at least 6 characters long');
        return res.redirect(`/admin/edit/${req.params.id}`);
      }

      // Add password validation and encryption logic here
      // For example, you can use bcrypt to hash the password
      const hashedPassword = await bcrypt.hash(req.body.password, 10); // 10 is the number of salt rounds
      updatedData.password = hashedPassword;
    }

    // You may want to add additional validation and error handling here before updating

    // Update the admin's information
    await Admin.findByIdAndUpdate(req.params.id, updatedData);

    // Add a flash success message
    req.flash('success', 'Account Successfully Updated');

    // Redirect to admin edit page after a successful update
    res.redirect(`/admin/edit/${req.params.id}`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});




// Handle admin registration
router.post('/admin/add', (req, res) => {
    const { name, email, password, password2, contact, address } = req.body;
    let errors = [];

    if (!name || !email || !password || !password2 || !contact || !address) {
        errors.push({ msg: 'Please enter all fields' });
    }

    if (password !== password2) {
        errors.push({ msg: 'Passwords do not match' });
    }

    if (password.length < 6) {
        errors.push({ msg: 'Password must be at least 6 characters' });
    }

    if (errors.length > 0) {
        res.render('admin/add', {
            errors,
            name,
            email,
            password,
            password2,
            contact,
            address
        });
    } else {
        Admin.findOne({ email: email }).then(admin => {
            if (admin) {
                errors.push({ msg: 'Email already exists' });
                res.render('admin/add', {
                    errors,
                    name,
                    email,
                    password,
                    password2,
                    contact,
                    address
                });
            } else {
                const newAdmin = new Admin({
                    name,
                    email,
                    password,
                    contact,
                    address
                });

                bcrypt.genSalt(10, (err, salt) => {
                    bcrypt.hash(newAdmin.password, salt, (err, hash) => {
                        if (err) throw err;
                        newAdmin.password = hash;
                        newAdmin
                            .save()
                            .then(admin => {
                                req.flash(
                                    'success',
                                    'Account Sucessfully Created'
                                );
                                res.redirect('/admin/manager');
                            })
                            .catch(err => console.log(err));
                    });
                });
            }
        });
    }
});

router.delete("/admin/delete/:id", async (req, res) => {
  try {
    const adminIdToDelete = req.params.id;
    const loggedInAdminId = req.user._id; // Get the ID of the currently logged-in admin

    // Check if the admin being deleted is not the currently logged-in admin
    if (adminIdToDelete === loggedInAdminId.toString()) {
      req.flash('error', 'You cannot delete your own admin account');
      return res.redirect("/admin/manager");
    }

    await Admin.deleteOne({ _id: adminIdToDelete });

    // Add a success flash message
    req.flash('success', 'Admin record successfully deleted');

    res.redirect("/admin/manager");
  } catch (error) {
    console.log(error);
    // Handle errors and provide appropriate responses here
    req.flash('error', 'An error occurred while deleting the admin record');
    res.status(500).send("Internal Server Error");
  }
});































router.get("/admin/profile", ensureAuthenticated, (req, res) =>
  res.render("admin/profile")
);



router.put("/admin/profile", ensureAuthenticated, async (req, res) => {
  try {
    const id = req.user._id;
    const updateObj = req.body.admin; // updateObj: {name, email, contact, address, password}

    // Fetch the current admin data
    const currentAdmin = await Admin.findById(id);

    if (!currentAdmin) {
      req.flash("error", "Admin not found");
      return res.redirect("/admin/profile");
    }

    // Check if a new password is provided and it's different from the current password
    if (updateObj.password && updateObj.password !== currentAdmin.password) {
      // Check if the new password meets the minimum length requirement (e.g., 6 characters)
      if (updateObj.password.length < 6) {
        req.flash("error", "Password must be at least 6 characters long");
        return res.redirect("/admin/profile");
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(updateObj.password, 10); // 10 is the number of salt rounds
      updateObj.password = hashedPassword;
    } else {
      // If the new password is the same as the current password, remove it from the updateObj
      delete updateObj.password;
    }

    // Update the admin's profile data
    await Admin.findByIdAndUpdate(id, updateObj);

    req.flash("success", "Profile updated successfully");
    res.redirect("/admin/profile");
  } catch (err) {
    console.error(err);
    req.flash("error", "Some error occurred on the server.");
    res.redirect("back");
  }
});



module.exports = router;