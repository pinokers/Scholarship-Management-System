const express = require("express");
const router = express.Router();
const Admin = require("../models/admin.js");
const passport = require("passport");
const bcrypt = require("bcryptjs");
const middleware = require("../middleware/index.js");
const { checkUserRole } = require('../middleware/checkUserRole');
const Schedule = require('../models/schedule');
const Announcement = require('../models/announcement');
const OldForm = require("../models/oldform.js");
const Qualified = require("../models/qualified.js")
const DisQualified = require("../models/disqualified.js")
const User = require("../models/user.js");
const Pre_registration = require("../models/pre-reg.js");
const Pre_registration_disqualified = require("../models/pre-reg-disqualified.js");
const random = import('random');
const nodemailer = require('nodemailer');
const Preregistration = require("../models/pre-reg-schedule.js");

const ExcelJS = require('exceljs');
const path = require('path'); // Import the path module
const { Readable } = require('stream');
const puppeteer = require("puppeteer");



// Configure Nodemailer for sending emails (replace with your SMTP details)
const transporter = nodemailer.createTransport({
	service: 'Gmail',
	auth: {
	  user: 'ssoscholarsip@gmail.com',
	  pass: 'fgsadkvsziqmhaun '
	},
  port: 465, // or 587
  secure: true, // true for 465, false for other ports
  });


const mongoose = require('mongoose');

const { GridFSBucket } = require('mongodb');
const { ObjectID } = require('mongodb'); 
const GridFsStorage = require('multer-gridfs-storage');
const multer = require('multer');
const disqualified = require("../models/disqualified.js");

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  const gridfsBucket = new GridFSBucket(db.db, {
    bucketName: 'fs',
  });

  // Define a route to serve files
  router.get('/files/:fileId', middleware.ensureAdminLoggedIn, (req, res) => {
    const fileId = req.params.fileId;

    // Check if fileId is a valid ObjectID
    if (!ObjectID.isValid(fileId)) {
      return res.status(400).json({ error: 'Invalid ObjectID' });
    }

    const objectId = new ObjectID(fileId);

    // Use the ObjectID to open a read stream (not download stream)
    const readstream = gridfsBucket.openDownloadStream(objectId);

    readstream.on('error', (err) => {
      console.log('Error while opening read stream:', err);
      res.status(404).json({ error: 'File not found' });
    });

    // Set the content type header
    res.set('Content-Type', 'application/pdf');

    // Pipe the file data to the response
    readstream.pipe(res);
  });

  // Define a route to serve pre-registration files
  router.get('/files_pre_registration/:fileId', middleware.ensureAdminLoggedIn, (req, res) => {
    const fileId = req.params.fileId;

    // Check if fileId is a valid ObjectID
    if (!ObjectID.isValid(fileId)) {
      return res.status(400).json({ error: 'Invalid ObjectID' });
    }

    const objectId = new ObjectID(fileId);

    // Use the ObjectID to open a read stream (not download stream)
    const readstream = gridfsBucket.openDownloadStream(objectId);

    readstream.on('error', (err) => {
      console.log('Error while opening read stream:', err);
      res.status(404).json({ error: 'File not found' });
    });

    // Set the content type header
    res.set('Content-Type', 'application/pdf');

    // Pipe the file data to the response
    readstream.pipe(res);
  });
});


const ejs = require('ejs');
const compile = async (dashboardName, data) => {
  try {
    const filePath = path.join(process.cwd(), 'views/admin', `${dashboardName}.ejs`);
    const template = await fs.promises.readFile(filePath, 'utf-8');

    // Remove the adminsidebar inclusion and the button from the template
    const modifiedTemplate = template
      .replace("<%- include('../partials/adminsidebar') %>", "")
      .replace(/<div\s+class="col text-end">\s*<form\s+id="generate-pdf-form"\s+action="\/generate-pdf"\s+method="POST">\s*<button\s+type="submit"\s+class="btn btn-success">Generate PDF<\/button>\s*<\/form>\s*<\/div>/,"");

    const compiledTemplate = ejs.compile(modifiedTemplate);
    return compiledTemplate(data);
  } catch (error) {
    console.error("Error compiling template:", error);
    throw error;
  }
};



const fs = require('fs');


// Define a route for generating the PDF
router.post("/generate-pdf", async (req, res) => {
  try {
    // Fetch the necessary data for PDF generation
    const data = await fetchData();
    const dashboardHTML = await compile('dashboard', data);

    // Launch a headless browser instance
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    // Set viewport size
    await page.setViewport({ width: 1200, height: 800 });

    // Load the dashboard HTML content into the page
    await page.setContent(dashboardHTML, { waitUntil: 'networkidle0' });

    // Set custom CSS styles directly targeting the elements in the dashboard
    await page.addStyleTag({
      content: `
        .row {
          display: grid !important;
          grid-template-columns: repeat(2, 1fr) !important;
          grid-gap: 10px !important; /* Adjust as needed */
        }
    
        .user-account-status,
        .application-form-status,
        .pre-registration-form-status,
        .payout-status {
          width: 550px !important;
          padding: 0 10px !important; /* Optional: Add spacing between elements */ 
        }
        /* Adjusting font size for labels */
        .user-account-status label,
        .application-form-status label,
        .pre-registration-form-status label,
        .payout-status label {
          font-size: 14px !important; /* Adjust font size as needed */
        }

    
        .user-account-status canvas,
        .application-form-status canvas,
        .pre-registration-form-status canvas,
        .payout-status canvas {
          width: 550px !important;
          height: 300px !important;
        }
      `
    });
    

    // Convert the HTML content to PDF
    const pdfBuffer = await page.pdf({ format: 'A4' });

    // Close the browser
    await browser.close();

    // Set the name of the PDF file
    const pdfName = 'dashboard.pdf';

    // Send the PDF as a response with specified name
    res.contentType("application/pdf");
    res.setHeader('Content-Disposition', `attachment; filename="${pdfName}"`);
    res.send(pdfBuffer);
      
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).send("Error generating PDF");
  }
});





router.get('/export-excel', async (req, res) => {
  try {
    const { barangay, status } = req.query;
    let data;

    // Define the fields to select
    const selectFields = {
      _id: 0,
      first_name: 1,
      last_name: 1,
      contact_number: 1,
      alternative_contact_number: 1,
      barangay: 1,
      school_name: 1,
      course: 1,
      year_level: 1
    };

    switch (status) {
      case 'onprocess':
        if (barangay === 'all') {
          data = await Pre_registration.find({ onprocess: { $ne: null }, code: "", deletedAt: null }).select(selectFields).lean();
        } else {
          data = await Pre_registration.find({ barangay, onprocess: { $ne: null }, code: "", deletedAt: null }).select(selectFields).lean();
        }
        break;

      case 'qualified':
        if (barangay === 'all') {
          data = await Pre_registration.find({ code: { $regex: /\d/ }, deletedAt: null }).select(selectFields).lean();
        } else {
          data = await Pre_registration.find({ barangay, code: { $regex: /\d/ }, deletedAt: null }).select(selectFields).lean();
        }
        break;

      case 'disqualified':
        if (barangay === 'all') {
          data = await Pre_registration_disqualified.find({ deletedAt: null }).select(selectFields).lean();
        } else {
          data = await Pre_registration_disqualified.find({ barangay, deletedAt: null }).select(selectFields).lean();
        }
        break;

      case 'all':
        if (barangay === 'all') {
          const data1 = await Pre_registration.find({ deletedAt: null }).select(selectFields).lean();
          const data2 = await Pre_registration_disqualified.find({ deletedAt: null }).select(selectFields).lean();
          data = [...data1, ...data2];
        } else {
          const data1 = await Pre_registration.find({ barangay, deletedAt: null }).select(selectFields).lean();
          const data2 = await Pre_registration_disqualified.find({ barangay, deletedAt: null }).select(selectFields).lean();
          data = [...data1, ...data2];
        }
        break;

      default:
        data = [];
    }

    // Create Excel workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet 1');

    // Define headers
    const headers = ['First Name', 'Last Name', 'Contact Number', 'Alternative Contact Number', 'Barangay', 'School Name', 'Course', 'Year Level'];
    worksheet.addRow(headers);

    // Calculate maximum length of each header
    const columnWidths = headers.map(header => header.length);

    // Add data rows
    data.forEach(row => {
      const values = [
        row['first_name'],
        row['last_name'],
        row['contact_number'],
        row['alternative_contact_number'],
        row['barangay'],
        row['school_name'],
        row['course'],
        row['year_level']
      ];
      worksheet.addRow(values);

      // Update maximum length of each column based on data values
      values.forEach((value, index) => {
        if (value && value.length > columnWidths[index]) {
          columnWidths[index] = value.length;
        }
      });
    });

    // Set column widths based on maximum length of each header
    columnWidths.forEach((width, index) => {
      worksheet.getColumn(index + 1).width = width + 2; // Add extra padding
    });

    // Generate Excel file
    const fileName = `${status}_${barangay}_data.xlsx`;
    const excelFilePath = path.join(__dirname, fileName);
    await workbook.xlsx.writeFile(excelFilePath);

    // Send the file as a response
    res.sendFile(excelFilePath, () => {
      // Clean up: delete the generated file after sending
      fs.unlinkSync(excelFilePath);
    });
  } catch (error) {
    console.error('Error exporting Excel:', error);
    res.status(500).send('Error exporting Excel');
  }
});


router.get('/export-excel-form', async (req, res) => {
  try {
    const { barangay, status } = req.query;
    let data;

    // Define the fields to select
    const selectFields = {
      _id: 0,
      first_name: 1,
      last_name: 1,
      primary_cellphone: 1,
      secondary_cellphone: 1,
      barangay: 1,
      email: 1,
      
    };

    switch (status) {
      case 'onprocess':
        if (barangay === 'all') {
          data = await OldForm.find({ deletedAt: null }).select(selectFields).lean();
        } else {
          data = await OldForm.find({ barangay, deletedAt: null }).select(selectFields).lean();
        }
        break;

      case 'qualified':
        if (barangay === 'all') {
          data = await Qualified.find({ deletedAt: null }).select(selectFields).lean();
        } else {
          data = await Qualified.find({ barangay, deletedAt: null }).select(selectFields).lean();
        }
        break;

      case 'disqualified':
        if (barangay === 'all') {
          data = await DisQualified.find({ deletedAt: null }).select(selectFields).lean();
        } else {
          data = await DisQualified.find({ barangay, deletedAt: null }).select(selectFields).lean();
        }
        break;

      case 'all':
        if (barangay === 'all') {
          const data1 = await OldForm.find({ deletedAt: null }).select(selectFields).lean();
          const data2 = await Qualified.find({ deletedAt: null }).select(selectFields).lean();
          const data3 = await DisQualified.find({ deletedAt: null }).select(selectFields).lean();
          data = [...data1, ...data2, ...data3];
        } else {
          const data1 = await OldForm.find({ barangay, deletedAt: null }).select(selectFields).lean();
          const data2 = await Qualified.find({ barangay, deletedAt: null }).select(selectFields).lean();
          const data3 = await DisQualified.find({ barangay, deletedAt: null }).select(selectFields).lean();
          data = [...data1, ...data2, ...data3];
        }
        break;

      default:
        data = [];
    }

    // Create Excel workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet 1');

    // Define headers
    const headers = ['First Name', 'Last Name', 'Contact Number', 'Alternative Contact Number', 'Barangay', 'email'];
    worksheet.addRow(headers);

    // Calculate maximum length of each header
    const columnWidths = headers.map(header => header.length);

    // Add data rows
    data.forEach(row => {
      const values = [
        row['first_name'],
        row['last_name'],
        row['primary_cellphone'],
        row['secondary_cellphone'],
        row['barangay'],
        row['email'],
      ];
      worksheet.addRow(values);

      // Update maximum length of each column based on data values
      values.forEach((value, index) => {
        if (value && value.length > columnWidths[index]) {
          columnWidths[index] = value.length;
        }
      });
    });

    // Set column widths based on maximum length of each header
    columnWidths.forEach((width, index) => {
      worksheet.getColumn(index + 1).width = width + 2; // Add extra padding
    });

    // Generate Excel file
    const fileName = `${status}_${barangay}_data.xlsx`;
    const excelFilePath = path.join(__dirname, fileName);
    await workbook.xlsx.writeFile(excelFilePath);

    // Send the file as a response
    res.sendFile(excelFilePath, () => {
      // Clean up: delete the generated file after sending
      fs.unlinkSync(excelFilePath);
    });
  } catch (error) {
    console.error('Error exporting Excel:', error);
    res.status(500).send('Error exporting Excel');
  }
});






// Assuming you have an Express route for rendering the form
router.get('/admin/admin-form-onprocess-view/:id', middleware.ensureAdminLoggedIn, (req, res) => {
  const oldFormId = req.params.id;

  // Replace 'OldForm' with your actual Mongoose model for OldForm
  OldForm.findById(oldFormId, (err, oldForm) => {
    if (err) {
      console.error('Error finding OldForm:', err);
      return res.status(500).send('Error finding OldForm');
    }

    if (!oldForm) {
      console.error('OldForm not found');
      return res.status(404).send('OldForm not found');
    }

    // Render the EJS template and pass 'oldForm' as data
    res.render('admin/admin-form-onprocess-view', { oldForm });
  });
});



// Route to get pre-registration schedule
router.get('/admin/admin-pre-reg-schedule', async (req, res) => {
  try {
    // Fetch pre-registration schedule from MongoDB
    const schedule = await Preregistration.find();

    // Render the EJS template with the schedule data
    res.render('admin/admin-pre-reg-schedule', { schedule });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Route to add a new pre-registration entry
router.post('/admin/preregistration-add', checkUserRole, async (req, res) => {
  try {
    // Extract start date and end date from the request body
    const { startDate, endDate } = req.body;

    // Check if there are any existing schedules that overlap with the new schedule
    const existingSchedule = await Preregistration.findOne({
      $or: [
        { $and: [{ startDate: { $lte: new Date(startDate) } }, { endDate: { $gte: new Date(startDate) } }] },
        { $and: [{ startDate: { $lte: new Date(endDate) } }, { endDate: { $gte: new Date(endDate) } }] },
      ],
    });

    if (existingSchedule) {
      // Flash an error message if there's an overlapping schedule
      req.flash('error', 'You can only create one schedule at a time.');
      return res.redirect('/admin/admin-pre-reg-schedule');
    }

    // Create a new pre-registration entry
    const newEntry = new Preregistration({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    // Save the entry to the database
    await newEntry.save();

    // Add a flash success message
    req.flash('success', 'Schedule Created Successfully ');

    // Redirect to the schedule page
    res.redirect('/admin/admin-pre-reg-schedule');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


// Router for displaying the edit schedule page
router.get("/admin/admin-pre-reg-schedule-edit/:Id", middleware.ensureAdminLoggedIn, async (req, res) => {
  try {

    const schedule = await Preregistration.findOne({ _id: req.params.Id });

    if (!schedule) {
      console.log('Schedule not found'); // Add this line
      return res.status(404).send("Schedule not found");
    }

    // Define the formatToLocalDatetime function
    res.locals.formatToLocalDatetime = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
    
      // Format the date and time components into the required format
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    res.render('admin/admin-pre-reg-schedule-edit', {
      schedule
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});
// Router for handling the schedule update
router.put("/admin/admin-pre-reg-schedule-edit/:Id", middleware.ensureAdminLoggedIn, checkUserRole, async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    // Assuming you have a Preregistration model
    const schedule = await Preregistration.findOne({ _id: req.params.Id });

    if (!schedule) {
      return res.status(404).send("Schedule not found");
    }

    // Update the schedule properties based on the form data
    schedule.startDate = new Date(startDate);
    schedule.endDate = new Date(endDate);

    // Save the updated schedule
    await schedule.save();
    // Add a flash success message
    req.flash('success', 'Schedule Successfully Updated');

    res.redirect('/admin/admin-pre-reg-schedule'); // Redirect to the schedule list page
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// DELETE route to delete a schedule
router.delete('/admin/prereg-schedule-delete/:scheduleId',checkUserRole, async (req, res) => {
  try {
    const scheduleId = req.params.scheduleId;

    // Check if the schedule with the given ID exists
    const schedule = await Preregistration.findById(scheduleId);

    if (!schedule) {
      req.flash('error', 'Schedule not found');
      return res.redirect('/admin/admin-pre-reg-schedule'); // Redirect with an error flash message
    }

    // Delete the schedule
    await Preregistration.remove();

    req.flash('success', 'Schedule deleted successfully');
    return res.redirect('/admin/admin-pre-reg-schedule'); // Redirect with a success flash message
  } catch (error) {
    // Handle errors here
    console.error('Error deleting schedule:', error);
    req.flash('error', 'Internal Server Error');
    res.redirect('/admin/admin-pre-reg-schedule'); // Redirect with an error flash message
  }
});


// Assuming you have an Express route for rendering the form


router.get('/admin/user', middleware.ensureAdminLoggedIn, async (req, res) => {
  try {
    let query = req.query.query;
    let barangayFilter = req.query.barangay;
    let perPage = 10;
    let page = req.query.page || 1;
  
    let userQuery = User.find({ deletedAt: { $eq: null } }); // Start with all non-deleted users
    
    if (barangayFilter) {
      // Add barangay filter to the query if provided
      userQuery = userQuery.where('barangaySelect').equals(barangayFilter);
    }

    if (query) {
      // Add search query to the user query
      userQuery = userQuery.or([
        { first_name: { $regex: new RegExp(query, 'i') } },
        { middle_name: { $regex: new RegExp(query, 'i') } },
        { last_name: { $regex: new RegExp(query, 'i') } }
      ]);
    }

    // Execute the user query to get filtered and searched users for pagination
    const user = await userQuery.sort({ updatedAt: -1 }).skip(perPage * page - perPage).limit(perPage).exec();
    const count = await User.countDocuments({ deletedAt: { $eq: null } }); // Count all non-deleted users

    res.render('admin/user', { user: user, current: page, pages: Math.ceil(count / perPage), results: user, perPage: perPage, count: count});
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching data');
  }
});
router.get("/admin/user-view/:id", middleware.ensureAdminLoggedIn, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id });

    if (!user) {
      return res.status(404).send("User not found");
    }

    res.render('admin/user-view', {
      user
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
});
router.get("/admin/user-edit/:id", middleware.ensureAdminLoggedIn, async (req, res) => {
  try {
    const newUser = await User.findOne({ _id: req.params.id });

    if (!newUser) {
      return res.status(404).send("User not found");
    }

    res.render('admin/user-edit', {
      newUser
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
});
router.put("/admin/user-edit/:id",checkUserRole, async (req, res) => {
  try {
    const existingUser = await User.findById(req.params.id);

    if (!existingUser) {
      return res.status(404).send("User not found");
    }

    // Prepare updated data
    const updatedData = {
      first_name: req.body.first_name,
      middle_name: req.body.middle_name,
      last_name: req.body.last_name,
      email: req.body.email,
      suffix: req.body.suffix,
      contact: req.body.contact,
      course: req.body.course,
      districtSelect: req.body.districtSelect,
      barangaySelect: req.body.barangaySelect,
      schoolName: req.body.schoolName,
      schoolAddress: req.body.schoolAddress,
      schoolID: req.body.schoolID,
      category: req.body.category,
      updatedAt: Date.now()
    };

    // Check if newPassword field exists in req.body and is not empty
    if (req.body.newPassword) {
      // Hash the new password
      const hashedPassword = await bcrypt.hash(req.body.newPassword, 10); // Hash the password with a salt round of 10
      updatedData.password = hashedPassword; // Store the hashed new password
    }

    // Update the user's information
    await User.findByIdAndUpdate(req.params.id, updatedData);

    // Add a flash success message
    req.flash('success', 'User Successfully Updated');

    // Redirect to admin edit page after a successful update
    res.redirect(`/admin/user-edit/${req.params.id}`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});
router.delete("/admin/user-delete/:id",checkUserRole, async (req, res) => {
  try {
    const userIdToDelete = req.params.id;

    // Soft delete: Set the deletedAt field instead of removing the document
    const userToDelete = await User.findByIdAndUpdate(
      userIdToDelete,
      { $set: { deletedAt: new Date() } },
      { new: true } // Return the modified document
    );
    // Check if the soft delete was successful
    if (!userToDelete) {
      req.flash('error', 'User record not found');
      return res.redirect("/admin/user");
    }

    // Add a success flash message for deletion
    req.flash('success', 'User record deleted');

    res.redirect("/admin/user");
  } catch (error) {
    console.error(error);
    // Handle errors and provide appropriate responses here
    req.flash('error', 'An error occurred while soft-deleting the applicant record');
    res.status(500).send("Internal Server Error");
  }
});

// Route to handle soft deleting selected records
router.post('/admin/delete-form-user',checkUserRole, async (req, res) => {
  try {
      // Extract the IDs of selected records from the request body
      const { ids } = req.body;

      // Check if IDs are provided and not empty
      if (!ids || ids.trim() === '') {
          return res.status(400).send('No IDs provided for deletion');
      }

      // Split the comma-separated string of IDs into an array
      const userIdsToDelete = ids.split(',');

      // Perform the soft deletion operation
      const currentTime = new Date();
      const softDeleteUpdates = userIdsToDelete.map(userId => {
          return User.findByIdAndUpdate(
              userId,
              { $set: { deletedAt: currentTime } },
              { new: true }
          );
      });

      // Wait for all updates to complete
      await Promise.all(softDeleteUpdates);
       // Add a success flash message for deletion
    req.flash('success', 'User record deleted');

      // Redirect to the specified URL after successful soft deletion
      res.redirect('/admin/user');
  } catch (error) {
      // Handle errors
      console.error(error);
      res.status(500).send('Internal Server Error');
  }
});


router.get('/admin/admin-form-payout', middleware.ensureAdminLoggedIn, async (req, res) => {
  try {
    let query = req.query.query;
    let perPage = 2;
    let page = req.query.page || 1;
    let perPageReceived = 5; // Define perPageReceived here
    let perPageNotReceived = 5;

    // Define currentReceived based on the current page for received data
    const pageReceived = req.query.pageReceived || 1;

    // Define currentNotReceived based on the current page for not received data
    const pageNotReceived = req.query.pageNotReceived || 1;

    let userQuery = Qualified.find({ deletedAt: { $eq: null } });

    if (query) {
      if (!isNaN(query)) { // Check if query is a valid number
        userQuery = userQuery.or([
          { first_name: { $regex: new RegExp(query, 'i') } },
          { middle_name: { $regex: new RegExp(query, 'i') } },
          { last_name: { $regex: new RegExp(query, 'i') } },
          { code: parseInt(query) } // Parse query as integer
        ]);
      } else {
        userQuery = userQuery.or([
          { first_name: { $regex: new RegExp(query, 'i') } },
          { middle_name: { $regex: new RegExp(query, 'i') } },
          { last_name: { $regex: new RegExp(query, 'i') } }
        ]);
      }
    }
    

    // Fetch all qualified data
    const allQualifiedData = await userQuery.sort({ updatedAt: -1 }).exec();
    const count = allQualifiedData.length;

    // Separate received and not received data
    const receivedData = allQualifiedData.filter(data => data.payoutStatus === 'received');
    const notReceivedData = allQualifiedData.filter(data => data.payoutStatus !== 'received');

    // Paginate received data
    const receivedDataPaginated = receivedData.slice(perPageReceived * pageReceived - perPageReceived, perPageReceived * pageReceived);
    const receivedCount = receivedData.length;

    // Paginate not received data
    const notReceivedDataPaginated = notReceivedData.slice(perPageNotReceived * pageNotReceived - perPageNotReceived, perPageNotReceived * pageNotReceived);
    const notReceivedCount = notReceivedData.length;

    res.render('admin/admin-form-payout', {
      receivedData: receivedDataPaginated,
      notReceivedData: notReceivedDataPaginated,
      
      currentReceived: pageReceived,
      currentnotReceived: pageNotReceived,

      receivedPages: Math.ceil(receivedCount / perPageReceived),
      notreceivedPages: Math.ceil(notReceivedCount / perPageNotReceived),

      receivedCount: receivedCount,
      notReceivedCount:notReceivedCount,

      perPageReceived: perPageReceived, // Pass perPageReceived to the template
      perPageNotReceived:perPageNotReceived
      
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});




// Handle the "Mark Received" button click
router.post('/admin/update-payout/:qualifiedId',checkUserRole, async (req, res) => {
  try {
    const qualifiedId = req.params.qualifiedId;

    // Find the qualified document by ID and update its payoutStatus to "received"
    const updatedQualified = await Qualified.findByIdAndUpdate(qualifiedId, { payoutStatus: 'received' });

    if (!updatedQualified) {
      return res.status(404).send('Qualified document not found.');
    }

    res.redirect('/admin/admin-form-payout');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating payout status');
  }
});



router.get('/admin/admin-announcement', middleware.ensureAdminLoggedIn, (req, res) => {
  // Fetch all announcements from the database
  Announcement.find({}, (err, announcements) => {
    if (err) {
      console.error(err);
      // Handle the error and render an error page or display an error message
      res.status(500).send('Error fetching announcements.');
    } else {
      // Render the "admin-announcement" view and pass the announcements to it
      res.render('admin/admin-announcement', { announcements });
    }
  });
});

router.post('/admin/admin-announcement',checkUserRole, (req, res) => {
  const { title, content, date } = req.body;

  // Create a new announcement document
  const newAnnouncement = new Announcement({
    title,
    content,
    date,
  });

  // Save it to the MongoDB database
  newAnnouncement.save((err) => {
    if (err) {
      console.error(err);
      req.flash('error', 'Error saving the announcement.'); // Flash an error message
      res.redirect('/admin/admin-announcement'); // Redirect back to the admin page
    } else {
      req.flash('success', 'Announcement saved successfully.'); // Flash a success message
      res.redirect('/admin/admin-announcement'); // Redirect back to the admin page
    }
  });
});
// DELETE route to delete a announcement
router.delete('/admin/announcement-delete/:announcementId',checkUserRole, async (req, res) => {
  try {
    const announcementId = req.params.announcementId;

    // Check if the schedule with the given ID exists
    const announcement = await Announcement.findById(announcementId);

    if (!announcement) {
      req.flash('error', 'Announcement not found');
      return res.redirect('/admin/admin-announcement'); // Redirect with an error flash message
    }

    // Delete the schedule
    await announcement.remove();

    req.flash('success', 'Announcement deleted successfully');
    return res.redirect('/admin/admin-announcement'); // Redirect with a success flash message
  } catch (error) {
    // Handle errors here
    console.error('Error deleting announcement:', error);
    req.flash('error', 'Internal Server Error');
    res.redirect('/admin/admin-announcement'); // Redirect with an error flash message
  }
});

router.get("/admin/admin-announcement-edit/:announcementId", middleware.ensureAdminLoggedIn, async (req, res) => {
  try {
    const announcement = await Announcement.findOne({ _id: req.params.announcementId });

    if (!announcement) {
      return res.status(404).send("Announcement not found");
    }
    // Define the formatToLocalDatetime function
    res.locals.formatToLocalDatetime = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
    
      // Format the date and time components into the required format
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    res.render('admin/admin-announcement-edit', {
      announcement
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// PUT route to handle schedule updates
router.put("/admin/admin-announcement-edit/:id",checkUserRole, async (req, res) => {
  try {
    const existingAnnouncement = await Announcement.findById(req.params.id);

    if (!existingAnnouncement) {
      return res.status(404).send("Announcement not found");
    }

    const updatedData = {
      title: req.body.title,
      date: req.body.date,
      content: req.body.content,
      updatedAt: Date.now()
    };

   
    // Update the admin's information
    await Announcement.findByIdAndUpdate(req.params.id, updatedData);

    // Add a flash success message
    req.flash('success', 'Announcement Successfully Updated');

    // Redirect to admin edit page after a successful update
    res.redirect(`/admin/admin-announcement-edit/${req.params.id}`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});



router.get('/admin/dashboard', middleware.ensureAdminLoggedIn, async (req, res) => {
  try {
    // Fetch data
    const data = await fetchData();
    
    // Render the template with the required variables
    res.render('admin/dashboard', { ...data });

  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching data');
  }
});

async function fetchData() {
  const totalCount = await OldForm.countDocuments();
  const UserCount = await User.countDocuments();
  const qualified = await Qualified.countDocuments();
  const disqualified = await DisQualified.countDocuments();
  const preregdisqualified = await Pre_registration_disqualified.countDocuments();
  
  const total = totalCount + qualified + disqualified;
  const preRegistrationCount = await Pre_registration.countDocuments();

  const preregtotal = preRegistrationCount + preregdisqualified;

  const preRegistrationWithCodeCount = await Pre_registration.countDocuments({
    code: { $regex: /\d/ },
  });
  const preRegistrationWithoutCodeCount = await Pre_registration.countDocuments({
    status: { $ne: 'code' },
    $or: [
      { code: null },
      { code: '' },
    ],
  });

  const userCategoryData = await User.aggregate([
    {
      $group: {
        _id: '$category',
        total: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: null,
        categories: { $push: '$_id' },
        totals: { $push: '$total' },
      },
    },
  ]);

  const labels = userCategoryData.length > 0 ? userCategoryData[0].categories : [];
  const values = userCategoryData.length > 0 ? userCategoryData[0].totals : [];

  const qualifiedData = await Qualified.aggregate([
    {
      $group: {
        _id: '$payoutStatus',
        count: { $sum: 1 },
      },
    },
  ]);

  const payoutStatusLabels = qualifiedData.map((entry) => entry._id ?? 'Pending Payout');
  const payoutStatusValues = qualifiedData.map((entry) => (entry._id === '' ? 'Pending' : entry.count || 0));

  const oldFormData = await OldForm.aggregate([
    {
      $group: {
        _id: '$barangay',
        count: { $sum: 1 },
      },
    },
  ]);

  const qualifiedCountsByBarangay = await Qualified.aggregate([
    {
      $group: {
        _id: '$barangay',
        count: { $sum: 1 },
      },
    },
  ]);

  const disqualifiedCountsByBarangay = await DisQualified.aggregate([
    {
      $group: {
        _id: '$barangay',
        count: { $sum: 1 },
      },
    },
  ]);

  const allBarangayData = mergeBarangayData(oldFormData, qualifiedCountsByBarangay, disqualifiedCountsByBarangay);

  return {
    labels,
    values,
    totalCount,
    UserCount,
    total,
    preregtotal,
    qualified,
    disqualified,
    preRegistrationCount,
    preRegistrationWithCodeCount,
    preregdisqualified,
    preRegistrationWithoutCodeCount,
    payoutStatusLabels,
    payoutStatusValues,
    allBarangayData,
  };
}

// Function to merge barangay data from multiple collections
function mergeBarangayData(oldFormData, qualifiedCountsByBarangay, disqualifiedCountsByBarangay) {
  const allBarangayData = {};

  oldFormData.forEach((entry) => {
    const barangay = entry._id ?? 'Unknown';
    allBarangayData[barangay] = { ...allBarangayData[barangay], oldFormCount: entry.count || 0 };
  });

  qualifiedCountsByBarangay.forEach((entry) => {
    const barangay = entry._id ?? 'Unknown';
    allBarangayData[barangay] = { ...allBarangayData[barangay], qualifiedCount: entry.count || 0 };
  });

  disqualifiedCountsByBarangay.forEach((entry) => {
    const barangay = entry._id ?? 'Unknown';
    allBarangayData[barangay] = { ...allBarangayData[barangay], disqualifiedCount: entry.count || 0 };
  });

  return allBarangayData;
}



router.get("/admin/manager", middleware.ensureAdminLoggedIn, checkUserRole, (req, res) => {
  // Assuming you have a function to fetch a list of admin users from your database
  Admin.find({ deletedAt: { $eq: null } }).exec((err, adminUsers) => {
    if (err) {
      console.error(err);
      // Handle the error and return an appropriate response
    } else {
      res.render("admin/manager", {
        adminUsers: adminUsers,
        admin: req.user,
        message: req.flash('success')
      });
    }
  });
});

router.get('/admin/adminschedule',middleware.ensureAdminLoggedIn, async (req, res) => {
  try {
    // Fetch the schedules from the database
    const schedules = await Schedule.find().exec();

    // Render the admin/adminschedule view and pass the schedules data
    res.render('admin/adminschedule', { admin: req.user, schedules, message: req.flash('success') });
  } catch (error) {
    // Handle errors here
    console.error('Error fetching schedules:', error);

    // Redirect or render an error page
    res.redirect('/admin/adminschedule');
  }
});
router.post('/admin/adminschedule', checkUserRole, async (req, res) => {
  const { semester, limit, start_date, end_date } = req.body;

  try {
    // Check if there's any existing schedule that overlaps with the new schedule
    const existingSchedule = await Schedule.findOne({
      $or: [
        { $and: [{ start_date: { $lte: new Date(start_date) } }, { end_date: { $gte: new Date(start_date) } }] },
        { $and: [{ start_date: { $lte: new Date(end_date) } }, { end_date: { $gte: new Date(end_date) } }] },
      ],
    });

    if (existingSchedule) {
      // Flash an error message if there's an overlapping schedule
      req.flash('error', 'You can only create one schedule at a time.');
      return res.redirect('/admin/adminschedule');
    }

    // Create a new schedule document
    const newSchedule = new Schedule({
      semester,
      limit,
      start_date,
      end_date,
    });

    // Save the schedule to MongoDB
    await newSchedule.save();

    // Flash a success message
    req.flash('success', 'Schedule created successfully.');

    // Redirect to a success page or any other desired action
    res.redirect('/admin/adminschedule');
  } catch (error) {
    // Flash an error message
    req.flash('error', 'An error occurred while saving the schedule.');

    // Handle errors here
    console.error('Error saving schedule:', error);

    // Redirect or render an error page
    res.redirect('/admin/adminschedule');
  }
});


// Define a route for editing a schedule
router.get("/admin/schedule-edit/:scheduleId", middleware.ensureAdminLoggedIn, async (req, res) => {
  try {
    const schedule = await Schedule.findOne({ _id: req.params.scheduleId });

    if (!schedule) {
      return res.status(404).send("Schedule not found");
    }

    // Define the formatToLocalDatetime function
    res.locals.formatToLocalDatetime = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
    
      // Format the date and time components into the required format
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    res.render('admin/schedule-edit', {
      schedule
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});


// PUT route to handle schedule updates
router.put("/admin/schedule-edit/:id",checkUserRole, async (req, res) => {
  try {
    const existingSchedule = await Schedule.findById(req.params.id);

    if (!existingSchedule) {
      return res.status(404).send("Schedule not found");
    }

    const updatedData = {
      semester: req.body.semester,
      limit: req.body.limit,
      start_date: req.body.start_date,
      end_date: req.body.end_date,
      updatedAt: Date.now()
    };

   
    // Update the admin's information
    await Schedule.findByIdAndUpdate(req.params.id, updatedData);

    // Add a flash success message
    req.flash('success', 'Schedule Successfully Updated');

    // Redirect to admin edit page after a successful update
    res.redirect(`/admin/schedule-edit/${req.params.id}`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// DELETE route to delete a schedule
router.delete('/admin/schedule-delete/:scheduleId',checkUserRole, async (req, res) => {
  try {
    const scheduleId = req.params.scheduleId;

    // Check if the schedule with the given ID exists
    const schedule = await Schedule.findById(scheduleId);

    if (!schedule) {
      req.flash('error', 'Schedule not found');
      return res.redirect('/admin/adminschedule'); // Redirect with an error flash message
    }

    // Delete the schedule
    await schedule.remove();

    req.flash('success', 'Schedule deleted successfully');
    return res.redirect('/admin/adminschedule'); // Redirect with a success flash message
  } catch (error) {
    // Handle errors here
    console.error('Error deleting schedule:', error);
    req.flash('error', 'Internal Server Error');
    res.redirect('/admin/adminschedule'); // Redirect with an error flash message
  }
});

  

router.get("/admin/view/:id", middleware.ensureAdminLoggedIn, async (req, res) => {
  try {
    const admin = await Admin.findOne({ _id: req.params.id });

    if (!admin) {
      return res.status(404).send("Admin not found");
    }

    res.render('admin/view', {
      admin
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
});
// GET route to render the admin edit form
router.get("/admin/edit/:id", middleware.ensureAdminLoggedIn, async (req, res) => {
  try {
    const admin = await Admin.findOne({ _id: req.params.id });

    if (!admin) {
      return res.status(404).send("Admin not found");
    }


    res.render('admin/edit', {
      admin
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// POST route to handle admin updates
router.put("/admin/edit/:id",checkUserRole, async (req, res) => {
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
      role:req.body.role,
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


router.get("/admin/add", middleware.ensureAdminLoggedIn, (req, res) =>
  res.render("admin/add")
);

// Handle admin registration
router.post('/admin/add',checkUserRole, (req, res) => {
  const { first_name,middle_name,last_name, email, password, password2, contact, address, role } = req.body;
  let errors = [];

  if (!first_name||!middle_name||!last_name|| !email || !password || !password2 || !contact || !address || !role) {
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
          first_name,
          middle_name,
          last_name,
          email,
          password,
          password2,
          contact,
          address,
          role
      });
  } else {
      Admin.findOne({ email: email }).then(admin => {
          if (admin) {
              errors.push({ msg: 'Email already exists' });
              res.render('admin/add', {
                  errors,
                  first_name,
                  middle_name,
                  last_name,
                  email,
                  password,
                  password2,
                  contact,
                  address,
                  role
              });
          } else {
              const newAdmin = new Admin({
                  first_name,
                  middle_name,
                  last_name,
                  email,
                  password,
                  contact,
                  address,
                  role // Assign the role based on the form input
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


/*
router.delete("/admin/delete/:id", async (req, res) => {
  try {
    const adminIdToDelete = req.params.id;
    const loggedInAdminId = req.user._id; // Get the ID of the currently logged-in admin

    // Check if the admin being deleted is not the currently logged-in admin
    if (adminIdToDelete === loggedInAdminId.toString()) {
      req.flash('error', 'You cannot delete your own admin account');
      return res.redirect("/admin/manager");
    }

    // Retrieve the admin data before deletion
    const adminToDelete = await Admin.findById(adminIdToDelete);

    // Connect to the backup database
    const backupConn = mongoose.createConnection(process.env.BACKUP_MONGODB_URI);

    // Ensure that backupConn is a valid Mongoose connection
    if (backupConn instanceof mongoose.Connection) {
      // Define the schema for the backupAdminModel
      const backupAdminSchema = new mongoose.Schema({
        // Define the schema fields here (excluding _id)
        first_name: String,
        middle_name: String,
        last_name: String,
        email: String,
        password: String,
        contact: String,
        address: String,
        role: String,
        createdAt: Date,
        updatedAt: Date,
      });

      // Create the backupAdminModel using the schema and connection
      const backupAdminModel = backupConn.model('BackupAdmin', backupAdminSchema);

      // Exclude the _id field before transferring data
      const dataToTransfer = adminToDelete.toObject();
      delete dataToTransfer._id;

      // Transfer data to the backup database
      await backupAdminModel.create(dataToTransfer);

      // Delete admin record from the default database
      await Admin.findByIdAndDelete(adminIdToDelete);

      // Add a success flash message
      req.flash('success', 'Admin record successfully deleted');

      res.redirect("/admin/manager");
    } else {
      console.error('Error: Invalid backup connection');
      req.flash('error', 'An error occurred while transferring data to the backup database');
      res.redirect("/admin/manager");
    }
  } catch (error) {
    console.error(error);
    // Handle errors and provide appropriate responses here
    req.flash('error', 'An error occurred while deleting the admin record');
    res.status(500).send("Internal Server Error");
  }
});
*/

router.delete("/admin/delete/:id",checkUserRole, async (req, res) => {
  try {
    const adminIdToDelete = req.params.id;
    const loggedInAdminId = req.user._id;
     // Check if the admin being deleted is not the currently logged-in admin
     if (adminIdToDelete === loggedInAdminId.toString()) {
      req.flash('error', 'You cannot delete your own admin account');
      return res.redirect("/admin/manager");
    }

    // Soft delete: Set the deletedAt field instead of removing the document
    const adminToDelete = await Admin.findByIdAndUpdate(
      adminIdToDelete,
      { $set: { deletedAt: new Date() } },
      { new: true } // Return the modified document
    );

    // Check if the soft delete was successful
    if (!adminToDelete) {
      req.flash('error', 'Admin record not found');
      return res.redirect("/admin/manager");
    }

    // Add a success flash message for soft deletion
    req.flash('success', 'Admin record successfully deleted');

    res.redirect("/admin/manager");
  } catch (error) {
    console.error(error);
    // Handle errors and provide appropriate responses here
    req.flash('error', 'An error occurred while soft deleting the admin record');
    res.status(500).send("Internal Server Error");
  }
});
router.post('/admin/delete-admin',checkUserRole, async (req, res) => {
  try {
    // Extract the IDs of selected records from the request body
    const { ids } = req.body;
    const loggedInAdminId = req.user._id;

    // Check if IDs are provided and not empty
    if (!ids || ids.trim() === '') {
      return res.status(400).send('No IDs provided for deletion');
    }

    // Split the comma-separated string of IDs into an array
    const adminIdsToDelete = ids.split(',');

    // Check if the admin being deleted is not the currently logged-in admin
    if (adminIdsToDelete.includes(loggedInAdminId.toString())) {
      req.flash('error', 'You cannot delete your own admin account');
      return res.redirect("/admin/manager");
    }

    // Perform the soft deletion operation
    const currentTime = new Date();
    const softDeleteUpdates = adminIdsToDelete.map(adminId => {
      return Admin.findByIdAndUpdate(
        adminId,
        { $set: { deletedAt: currentTime } },
        { new: true }
      );
    });

    // Wait for all updates to complete
    await Promise.all(softDeleteUpdates);

    // Add a success flash message for deletion
    req.flash('success', 'Admin record deleted');

    // Redirect to the specified URL after successful soft deletion
    res.redirect('/admin/manager');
  } catch (error) {
    // Handle errors
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});





router.get("/admin/profile", middleware.ensureAdminLoggedIn, (req, res) =>
  res.render("admin/profile")
);

router.put("/admin/profile",checkUserRole, middleware.ensureAdminLoggedIn, async (req, res) => {
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

const storage = multer.memoryStorage(); // Use memory storage to handle file uploads without saving to disk
const upload = multer({ storage: storage });

router.post('/admin/generateRandomCode/:id', checkUserRole, upload.single('applicationform'), async (req, res) => {
    const recordId = req.params.id;
    const randomCode = getRandomInt(1000, 10000).toString(); // Generate a random 4-digit code
    const message = req.body.message; // Extract message from request body
    const file = req.file; // Get the uploaded file object

    try {
        const preRegistration = await Pre_registration.findById(recordId);

        if (!preRegistration) {
            req.flash('error', 'Record not found'); // Set a flash error message
            return res.redirect('/admin/admin-pre-reg'); // Redirect to an error page
        }

        const email = preRegistration.email;

        if (!email) {
            req.flash('error', 'Email not found in the preRegistration record'); // Set a flash error message
            return res.redirect('/admin/admin-pre-reg'); // Redirect to an error page
        }

        preRegistration.code = randomCode;
        await preRegistration.save();

        const mailOptions = {
            from: 'ssoscholarsip@gmail.com',
            to: email,
            subject: 'Pre registration Update.',
            text: `${message} , save this code: ${randomCode}`, // Include the random code in the message
            
        };
        
        if (file) {
          mailOptions.attachments = [
              {
                  filename: file.originalname,
                  content: file.buffer // Use the file buffer directly
              }
          ];
      }

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                req.flash('error', 'Failed to send the email'); // Set a flash error message
                return res.redirect('/admin/admin-pre-reg'); // Redirect to an error page
            } else {
                req.flash('success', 'Email sent successfully'); // Set a flash success message
                return res.redirect('/admin/admin-pre-reg'); // Redirect to a success page
            }
        });
    } catch (err) {
        console.error('Error updating code in MongoDB:', err);
        req.flash('error', 'Failed to generate and save the code'); // Set a flash error message
        res.redirect('/admin/admin-pre-reg'); // Redirect to an error page
    }
});

// Function to generate a random integer between min (inclusive) and max (exclusive)
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

router.post('/admin/resetRandomCode/:id',checkUserRole, async (req, res) => {
  const recordId = req.params.id;
  const message = req.body.message; // Extract message from request body

  try {
    const preRegistration = await Pre_registration.findById(recordId);

    if (!preRegistration) {
      req.flash('error', 'Record not found'); // Set a flash error message
      return res.redirect('/admin/admin-pre-reg-qualified'); // Redirect to an error page
    }
    const email = preRegistration.email;

    if (!email) {
      req.flash('error', 'Email not found in the preRegistration record'); // Set a flash error message
      return res.redirect('/admin/admin-pre-reg-qualified'); // Redirect to an error page
    }
    

    preRegistration.code = ''; // Set the code to an empty string (or to the default value)
    await preRegistration.save();
    const mailOptions = {
      from: 'ssoscholarsip@gmail.com',
      to: email,
      subject: 'Pre registration Update.',
      text: message
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        req.flash('error', 'Failed to send the email'); // Set a flash error message
        return res.redirect('/admin/admin-pre-reg-qualified'); // Redirect to an error page
      } else {
        req.flash('success', 'Email sent successfully'); // Set a flash success message
        return res.redirect('/admin/admin-pre-reg-qualified'); // Redirect to a success page
      }
    });
  } catch (err) {
    console.error('Error resetting code in MongoDB:', err);
    req.flash('error', 'Failed to reset the code'); // Set a flash error message
    res.redirect('/admin/admin-pre-reg-qualified'); // Redirect to an error page
  }
});

router.get('/admin/admin-pre-reg-qualified', middleware.ensureAdminLoggedIn, async (req, res) => {
  try {
    const Pre_register = await Pre_registration.find({ deletedAt: { $eq: null } }).exec();
    

    if (!Pre_register) {
      console.error('Error fetching data');
      return res.status(500).send('Error fetching data');
    }

    let hasCode = false;
    
    // Check if any Pre_register object has a code
    Pre_register.forEach(applicant => {
      if (applicant.code) {
        hasCode = true;
        return;
      }
    });
    let query = req.query.query;
    let year_levelFilter = req.query.year_level;
    let perPage = 10;
    let page = req.query.page || 1;
  
    let userQuery = Pre_registration.find({ deletedAt: { $eq: null }, code: { $regex: /\d/ } }); // Start with all non-deleted users
    
    if (year_levelFilter) {
      // Add barangay filter to the query if provided
      userQuery = userQuery.where('year_level').equals(year_levelFilter);
    }
  
    if (query) {
      // Add search query to the user query
      userQuery = userQuery.or([
        { first_name: { $regex: new RegExp(query, 'i') } },
        { middle_name: { $regex: new RegExp(query, 'i') } },
        { last_name: { $regex: new RegExp(query, 'i') } }
      ]);
    }
  
    // Execute the user query to get filtered and searched users for pagination
    const user = await userQuery.sort({ updatedAt: -1 }).skip(perPage * page - perPage).limit(perPage).exec();
    const count = await Pre_registration.countDocuments({ deletedAt: { $eq: null }, code: { $regex: /\d/ } }); // Count all non-deleted users

    // Render the "admin-pre-reg" view and pass Pre_register and hasCode to it
    res.render('admin/admin-pre-reg-qualified', { Pre_register, hasCode, user: user, current: page, pages: Math.ceil(count / perPage), results: user, perPage: perPage, count: count });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching data');
  }
});
// Assuming you have an Express route for rendering the form
router.get('/admin/admin-pre-reg', middleware.ensureAdminLoggedIn, async (req, res) => {
  try {
    const Pre_register = await Pre_registration.find({}).exec();

    if (!Pre_register) {
      console.error('Error fetching data');
      return res.status(500).send('Error fetching data');
    }

    let hasCode = false;
    
    // Check if any Pre_register object has a code
    Pre_register.forEach(applicant => {
      if (applicant.code) {
        hasCode = true;
        return;
      }
    });
    let query = req.query.query;
    let year_levelFilter = req.query.year_level;
    let perPage = 10;
    let page = req.query.page || 1;
  
    let userQuery = Pre_registration.find({ deletedAt: { $eq: null }, code: { $in: [""] } }); // Start with all non-deleted users
    
    if (year_levelFilter) {
      // Add barangay filter to the query if provided
      userQuery = userQuery.where('year_level').equals(year_levelFilter);
    }
  
    if (query) {
      // Add search query to the user query
      userQuery = userQuery.or([
        { first_name: { $regex: new RegExp(query, 'i') } },
        { middle_name: { $regex: new RegExp(query, 'i') } },
        { last_name: { $regex: new RegExp(query, 'i') } }
      ]);
    }
  
    // Execute the user query to get filtered and searched users for pagination
    const user = await userQuery.sort({ updatedAt: -1 }).skip(perPage * page - perPage).limit(perPage).exec();
    const count = await Pre_registration.countDocuments({ deletedAt: { $eq: null }, code: { $in: [""] } }); // Count all non-deleted users

    // Render the "admin-pre-reg" view and pass Pre_register and hasCode to it
    res.render('admin/admin-pre-reg', { Pre_register, hasCode, user: user, current: page, pages: Math.ceil(count / perPage), results: user, perPage: perPage, count: count});
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching data');
  }
});
// Assuming you have an Express route for rendering the form
router.get('/admin/admin-pre-reg-view/:id', middleware.ensureAdminLoggedIn, (req, res) => {
  const Pre_registrationId = req.params.id;
  // Replace 'OldForm' with your actual Mongoose model for OldForm
  Pre_registration.findById(Pre_registrationId, (err, Pre_registration) => {
    if (err) {
      console.error('Error finding OldForm:', err);
      return res.status(500).send('Error finding OldForm');
    }

    if (!Pre_registration) {
      console.error('OldForm not found');
      return res.status(404).send('OldForm not found');
    }

    // Render the EJS template and pass 'oldForm' as data
    res.render('admin/admin-pre-reg-view', { Pre_registration });
  });
});

// Assuming you have an Express route for rendering the form
router.get('/admin/admin-pre-reg-disqualified', middleware.ensureAdminLoggedIn, async (req, res) => {
  try {
    const Pre_register_disqualified = await Pre_registration_disqualified.find({ deletedAt: { $eq: null } }).exec();
   
    if (!Pre_register_disqualified) {
      console.error('Error fetching data');
      return res.status(500).send('Error fetching data');
    }
    

    let hasCode = false;
    
    // Check if any Pre_register object has a code
    Pre_register_disqualified.forEach(applicant => {
      if (applicant.code) {
        hasCode = true;
        return;
      }
    });
    let query = req.query.query;
    let year_levelFilter = req.query.year_level;
    let perPage = 10;
    let page = req.query.page || 1;
  
    let userQuery = Pre_registration_disqualified.find({ deletedAt: { $eq: null }, code: { $in: [""] } }); // Start with all non-deleted users
    
    if (year_levelFilter) {
      // Add barangay filter to the query if provided
      userQuery = userQuery.where('year_level').equals(year_levelFilter);
    }
  
    if (query) {
      // Add search query to the user query
      userQuery = userQuery.or([
        { first_name: { $regex: new RegExp(query, 'i') } },
        { middle_name: { $regex: new RegExp(query, 'i') } },
        { last_name: { $regex: new RegExp(query, 'i') } }
      ]);
    }
  
    // Execute the user query to get filtered and searched users for pagination
    const user = await userQuery.sort({ updatedAt: -1 }).skip(perPage * page - perPage).limit(perPage).exec();
    const count = await Pre_registration_disqualified.countDocuments({ deletedAt: { $eq: null }, code: { $in: [""] } }); // Count all non-deleted users
   

    // Render the "admin-pre-reg" view and pass Pre_register and hasCode to it
    res.render('admin/admin-pre-reg-disqualified', { Pre_register_disqualified, hasCode, user: user, current: page, pages: Math.ceil(count / perPage), results: user, perPage: perPage, count: count });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching data');
  }
});
router.get('/admin/admin-prereg-disqualified-view/:id', middleware.ensureAdminLoggedIn, (req, res) => {
  const preregDisqualifiedId = req.params.id;
  // Replace 'OldForm' with your actual Mongoose model for OldForm
  Pre_registration_disqualified.findById(preregDisqualifiedId, (err, Pre_registration_disqualified) => {
    if (err) {
      console.error('Error finding Data:', err);
      return res.status(500).send('Error finding Data');
    }

    if (!Pre_registration_disqualified) {
      console.error('Data not found');
      return res.status(404).send('Data not found');
    }

    // Render the EJS template and pass 'oldForm' as data
    res.render('admin/admin-prereg-disqualified-view', { Pre_registration_disqualified });
  });
});

router.post("/admin/admin-pre-reg-disqualified/:formId",checkUserRole, async (req, res) => {
  const formId = req.params.formId;
  const message = req.body.message; // Extract message from request body
 
  try {
          // Find the document in the OldForm model by ID
       const preRegistrationData = await Pre_registration.findById(formId);

         if (preRegistrationData) {
            // Create a new document in the DisQualified model using the data from OldForm
            const newDisQualifiedData = new Pre_registration_disqualified(preRegistrationData.toObject());

            // Optionally, set a field to indicate the disqualification status
            newDisQualifiedData.disqualificationStatus = "Disqualified";


          // Optionally, you can delete the transferred data from the OldForm model
          await Pre_registration.findByIdAndDelete(formId);
          const email = preRegistrationData.email;

    if (!email) {
      req.flash('error', 'Email not found in the preRegistration record'); // Set a flash error message
      return res.redirect('/admin/admin-pre-reg'); // Redirect to an error page
    }
   // Save the transferred data to the DisQualified model
   await newDisQualifiedData.save();

    const mailOptions = {
      from: 'ssoscholarsip@gmail.com',
      to: email,
      subject: 'Pre registration Update.',
      text: message,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        req.flash('error', 'Failed to send the email'); // Set a flash error message
        return res.redirect('/admin//admin-pre-reg'); // Redirect to an error page
      } else {
        req.flash('success', 'Email sent successfully'); // Set a flash success message
        return res.redirect('/admin/admin-pre-reg'); // Redirect to a success page
      }
    });
          req.flash("success", "Email sent successfully");
          res.redirect("/admin/admin-pre-reg"); // Redirect to a page where the flash message can be displayed
      } else {
          console.log("Form not found in OldForm model");
          req.flash("error", "Form not found in OldForm model");
          res.redirect("/admin/admin-pre-reg"); // Redirect to a page where the flash message can be displayed
      }
  } catch (error) {
      console.error("Error:", error);
      console.log("Data transfer to Approved model failed");
      req.flash("error", "Data transfer to Approved model failed");
      res.redirect("/admin/admin-pre-reg"); // Redirect to a page where the flash message can be displayed
  }
});
router.delete("/admin/delete-prereg-qualified/:id",checkUserRole, async (req, res) => {
  try {
    const qualifiedPreregIdToDelete = req.params.id;

    // Soft delete: Set the deletedAt field instead of removing the document
    const qualifiedPreregToDelete = await Pre_registration.findByIdAndUpdate(
      qualifiedPreregIdToDelete,
      { $set: { deletedAt: new Date() } },
      { new: true } // Return the modified document
    );
    // Check if the soft delete was successful
    if (!qualifiedPreregToDelete) {
      req.flash('error', 'Applicant record not found');
      return res.redirect("/admin/admin-pre-reg-qualified");
    }

    // Add a success flash message for deletion
    req.flash('success', 'Applicant record deleted');

    res.redirect("/admin/admin-pre-reg-qualified");
  } catch (error) {
    console.error(error);
    // Handle errors and provide appropriate responses here
    req.flash('error', 'An error occurred while soft-deleting the applicant record');
    res.status(500).send("Internal Server Error");
  }
});
// Route to handle soft deleting selected records
router.post('/admin/delete-form-prereg-qualified',checkUserRole, async (req, res) => {
  try {
      // Extract the IDs of selected records from the request body
      const { ids } = req.body;

      // Check if IDs are provided and not empty
      if (!ids || ids.trim() === '') {
          return res.status(400).send('No IDs provided for deletion');
      }

      // Split the comma-separated string of IDs into an array
      const qualifiedIdsToDelete = ids.split(',');

      // Perform the soft deletion operation
      const currentTime = new Date();
      const softDeleteUpdates = qualifiedIdsToDelete.map(qualifiedId => {
          return Pre_registration.findByIdAndUpdate(
              qualifiedId,
              { $set: { deletedAt: currentTime } },
              { new: true }
          );
      });

      // Wait for all updates to complete
      await Promise.all(softDeleteUpdates);
      // Add a success flash message for deletion
      req.flash('success', 'Applicant record deleted');
      // Redirect to the specified URL after successful soft deletion
      res.redirect('/admin/admin-pre-reg-qualified');
  } catch (error) {
      // Handle errors
      console.error(error);
      res.status(500).send('Internal Server Error');
  }
});
router.post("/admin/transfer-disqualified-to-onprocess/:disqualifiedId",checkUserRole, async (req, res) => {
  const disqualifiedId = req.params.disqualifiedId;
  const message = req.body.message; // Extract message from request body

  try {
    // Find the document in the Disqualified model by ID
    const disqualifiedData = await Pre_registration_disqualified.findById(disqualifiedId);

    if (!disqualifiedData) {
      req.flash('error', 'Disqualified record not found'); // Set a flash error message
      return res.redirect('/admin/admin-pre-reg-disqualified'); // Redirect to an error page
    }

    const email = disqualifiedData.email;

    if (!email) {
      req.flash('error', 'Email not found in the disqualified record'); // Set a flash error message
      return res.redirect('/admin/admin-pre-reg-disqualified'); // Redirect to an error page
    }

    const mailOptions = {
      from: 'ssoscholarsip@gmail.com',
      to: email,
      subject: 'Scholarship Application Update.',
      text: message
    };

    await transporter.sendMail(mailOptions);

    // Create a new document in the Pre_registration model using the data from Pre_registration_disqualified
    const newPreRegistration = new Pre_registration(disqualifiedData.toObject());

    // Optionally, set any additional fields or modify the data as needed

    await newPreRegistration.save();

    // Delete the transferred data from the Pre_registration_disqualified model
    await Pre_registration_disqualified.findByIdAndDelete(disqualifiedId);

    req.flash("success", "Email sent successfully");
    res.redirect("/admin/admin-pre-reg-disqualified"); // Redirect to a page where the flash message can be displayed
  } catch (error) {
    console.error("Error transferring disqualified applicant:", error);
    req.flash("error", "Failed to transfer disqualified applicant");
    res.redirect("/admin/admin-pre-reg-disqualified"); // Redirect to a page where the flash message can be displayed
  }
});

router.delete("/admin/delete-prereg-disqualified/:id",checkUserRole, async (req, res) => {
  try {
    const disqualifiedPreregIdToDelete = req.params.id;

    // Soft delete: Set the deletedAt field instead of removing the document
    const disqualifiedPreregToDelete = await Pre_registration_disqualified.findByIdAndUpdate(
      disqualifiedPreregIdToDelete,
      { $set: { deletedAt: new Date() } },
      { new: true } // Return the modified document
    );
    // Check if the soft delete was successful
    if (!disqualifiedPreregToDelete) {
      req.flash('error', 'Applicant record not found');
      return res.redirect("/admin/admin-pre-reg-disqualified");
    }
    // Add a success flash message for deletion
    req.flash('success', 'Applicant record deleted');

    res.redirect("/admin/admin-pre-reg-disqualified");
  } catch (error) {
    console.error(error);
    // Handle errors and provide appropriate responses here
    req.flash('error', 'An error occurred while soft-deleting the applicant record');
    res.status(500).send("Internal Server Error");
  }
});
// Route to handle soft deleting selected records
router.post('/admin/delete-form-prereg-disqualified',checkUserRole, async (req, res) => {
  try {
      // Extract the IDs of selected records from the request body
      const { ids } = req.body;

      // Check if IDs are provided and not empty
      if (!ids || ids.trim() === '') {
          return res.status(400).send('No IDs provided for deletion');
      }

      // Split the comma-separated string of IDs into an array
      const qualifiedIdsToDelete = ids.split(',');

      // Perform the soft deletion operation
      const currentTime = new Date();
      const softDeleteUpdates = qualifiedIdsToDelete.map(qualifiedId => {
          return Pre_registration_disqualified.findByIdAndUpdate(
              qualifiedId,
              { $set: { deletedAt: currentTime } },
              { new: true }
          );
      });

      // Wait for all updates to complete
      await Promise.all(softDeleteUpdates);
      // Add a success flash message for deletion
      req.flash('success', 'Applicant record deleted');
      // Redirect to the specified URL after successful soft deletion
      res.redirect('/admin/admin-pre-reg-disqualified');
  } catch (error) {
      // Handle errors
      console.error(error);
      res.status(500).send('Internal Server Error');
  }
});


// Your other route handlers and middleware

router.post("/admin/admin-form-onprocess-qualified/:formId",checkUserRole, async (req, res) => {
  const formId = req.params.formId;
  const randomCode = getRandomInt(1000, 10000).toString(); // Generate a random 4-digit code
  const selectedOption = req.body.dropdownSelect; // Get the selected option from the form
  const message = req.body.message; // Extract message from request body
  
  try {

    // Find the document in the OldForm model by ID
    const oldFormData = await OldForm.findById(formId);

    if (oldFormData) {
      // Update the OldForm document with the selected option
      oldFormData.selectedOption = selectedOption; // Assuming 'selectedOption' is the field in OldForm to store the dropdown selection
      oldFormData.code = randomCode;
      // Save the updated OldForm document
      await oldFormData.save();

      // Create a new document in the Qualified model using the data from OldForm
      const newQualifiedData = new Qualified(oldFormData.toObject());

      // Optionally, set a field to indicate the approval status
      newQualifiedData.approvalStatus = "Approved";

      // Optionally, you can delete the transferred data from the OldForm model
      await OldForm.findByIdAndDelete(formId);

      const email = oldFormData.email;

      if (!email) {
        req.flash('error', 'Email not found in the preRegistration record'); // Set a flash error message
        return res.redirect('/admin/admin-form-onprocess'); // Redirect to an error page
      }

      // Save the newQualifiedData document
      await newQualifiedData.save();

      // The rest of your code for sending emails can remain as is
      const mailOptions = {
        from: 'ssoscholarsip@gmail.com',
        to: email,
        subject: 'Scholarship Application Update.',
        text: message,
      };

      await transporter.sendMail(mailOptions);
      

      req.flash("success", "Adding financial grant succesfullyyy!");
      res.redirect("/admin/admin-form-onprocess"); // Redirect to a page where the flash message can be displayed
    } else {
      console.log("Form not found in OldForm model");
      req.flash("error", "Form not found in OldForm model");
      res.redirect("/admin/admin-form-onprocess"); // Redirect to a page where the flash message can be displayed
    }
  } catch (error) {
    console.error("Error:", error);
    console.log("Data transfer to Qualified model failed");
    req.flash("error", "Data transfer to Qualified model failed");
    res.redirect("/admin/admin-form-onprocess"); // Redirect to a page where the flash message can be displayed
  }
});

router.delete("/admin/delete-qualified/:id",checkUserRole, async (req, res) => {
  try {
    const qualifiedIdToDelete = req.params.id;

    // Soft delete: Set the deletedAt field instead of removing the document
    const qualifiedToDelete = await Qualified.findByIdAndUpdate(
      qualifiedIdToDelete,
      { $set: { deletedAt: new Date() } },
      { new: true } // Return the modified document
    );
    // Check if the soft delete was successful
    if (!qualifiedToDelete) {
      req.flash('error', 'Applicant record not found');
      return res.redirect("/admin/admin-form-onprocess-qualified");
    }

    // Add a success flash message for deletion
    req.flash('success', 'Applicant record deleted');

    res.redirect("/admin/admin-form-onprocess-qualified");
  } catch (error) {
    console.error(error);
    // Handle errors and provide appropriate responses here
    req.flash('error', 'An error occurred while soft-deleting the applicant record');
    res.status(500).send("Internal Server Error");
  }
});

// Route to handle soft deleting selected records
router.post('/admin/delete-form-qualified',checkUserRole, async (req, res) => {
  try {
      // Extract the IDs of selected records from the request body
      const { ids } = req.body;

      // Check if IDs are provided and not empty
      if (!ids || ids.trim() === '') {
          return res.status(400).send('No IDs provided for deletion');
      }

      // Split the comma-separated string of IDs into an array
      const qualifiedIdsToDelete = ids.split(',');

      // Perform the soft deletion operation
      const currentTime = new Date();
      const softDeleteUpdates = qualifiedIdsToDelete.map(qualifiedId => {
          return Qualified.findByIdAndUpdate(
              qualifiedId,
              { $set: { deletedAt: currentTime } },
              { new: true }
          );
      });

      // Wait for all updates to complete
      await Promise.all(softDeleteUpdates);
       // Add a success flash message for deletion
    req.flash('success', 'Applicant record deleted');

      // Redirect to the specified URL after successful soft deletion
      res.redirect('/admin/admin-form-onprocess-qualified');
  } catch (error) {
      // Handle errors
      console.error(error);
      res.status(500).send('Internal Server Error');
  }
});




/*
router.delete("/admin/delete-qualified/:id", async (req, res) => {
  try {
    const qualifiedIdToDelete = req.params.id;
    // Retrieve the admin data before deletion
    const qualifiedToDelete = await Qualified.findById(qualifiedIdToDelete);

    // Connect to the backup database
    const backupConn = mongoose.createConnection(process.env.BACKUP_MONGODB_URI);

    // Ensure that backupConn is a valid Mongoose connection
    if (backupConn instanceof mongoose.Connection) {
      // Define the schema for the backupAdminModel
      const backupqualifiedSchema = new mongoose.Schema({
        // Define the schema fields here (excluding _id)
        first_name: String,
        middle_name: String,
        last_name: String,
        suffix: String,
        age: Number, // Assuming age is a number
        gender: String,
        date_of_birth: Date, // Assuming date_of_birth is a date
        place_of_birth: String,
        religion: String,
        citizenship: String,
        primary_cellphone: String,
        secondary_cellphone: String,
        barangay: String,
        email: { type: String, unique: true },
        home_address: String,
        schoolName: String,
        course: String,
        yearLevel: String,
        gwa: String,
        schoolContact: String,
        schoolAddress: String,
        elementarySchool: String,
        elementaryGradYear: String,
        juniorHighSchool: String,
        juniorHighGradYear: String,
        seniorHighSchool: String,
        seniorHighGradYear: String,
      
        fatherName: String,
        father_middle_name: String, // Follow conventional variable naming
        father_last_name: String, // Follow conventional variable naming
        father_suffix: String,
        father_status: String,
        father_contact_number: String, // Follow conventional variable naming
        father_occupation: String, // Follow conventional variable naming
        father_company: String,
        father_income_per_month: Number, // Assuming income is a number
        father_address: String,
      
        mother_name: String, // Follow conventional variable naming
        mother_middle_initial: String, // Follow conventional variable naming
        mother_last_name: String, // Follow conventional variable naming
        mother_status: String,
        mother_number: String, // Follow conventional variable naming
        mother_occupation: String, // Follow conventional variable naming
        mother_company: String,
        mother_income_per_month: Number, // Assuming income is a number
        mother_address: String,
      
        num_siblings: Number, // Assuming the number of siblings is a number
        siblings_scholarship: String,
        how_many: Number, // Assuming this is a number
      
        siblingsNames1: String,
        siblingsCourse1: String,
      
        siblingsNames2: String,
        siblingsCourse2: String,
      
        siblingsNames3: String,
        siblingsCourse3: String,
      
        siblingsNames4: String,
        siblingsCourse4: String,
      
        siblingsNames5: String,
        siblingsCourse5: String,
      
        // File upload fields as strings
        certificate_of_registration: String, // Store file path or URL
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
      
        createdAt: {
          type: Date,
          default: Date.now
        },
        updatedAt: {
          type: Date,
          default: Date.now
        },
        payoutStatus: {
          type: String, // You can adjust the data type as needed (String, Boolean, etc.)
          default: 'pending' // Default value if not provided
          },
          deletedAt: Date,
      });

      // Create the backupAdminModel using the schema and connection
      const backupQualifiedModel = backupConn.model('BackupQualified', backupqualifiedSchema);

      // Exclude the _id field before transferring data
      const dataToTransfer = qualifiedToDelete.toObject();
      delete dataToTransfer._id;

      // Transfer data to the backup database
      await backupQualifiedModel.create(dataToTransfer);

      // Delete admin record from the default database
      await Qualified.findByIdAndDelete(qualifiedToDelete);

      // Add a success flash message
      req.flash('success', 'Applicant record successfully deleted');

      res.redirect("/admin/admin-form-onprocess-qualified");
    } else {
      console.error('Error: Invalid backup connection');
      req.flash('error', 'An error occurred while transferring data to the backup database');
      res.redirect("/admin/admin-form-onprocess-qualified");
    }
  } catch (error) {
    console.error(error);
    // Handle errors and provide appropriate responses here
    req.flash('error', 'An error occurred while deleting the applicant record');
    res.status(500).send("Internal Server Error");
  }
});
*/
router.get('/admin/admin-form-onprocess', middleware.ensureAdminLoggedIn, async (req, res) => {
  try {
    let query = req.query.query;
    let barangayFilter = req.query.barangay;
    let perPage = 10;
    let page = req.query.page || 1;
  
    let userQuery = OldForm.find({ deletedAt: { $eq: null } }); // Start with all non-deleted users
    
    if (barangayFilter) {
      // Add barangay filter to the query if provided
      userQuery = userQuery.where('barangay').equals(barangayFilter);
    }

    if (query) {
      // Add search query to the user query
      userQuery = userQuery.or([
        { first_name: { $regex: new RegExp(query, 'i') } },
        { middle_name: { $regex: new RegExp(query, 'i') } },
        { last_name: { $regex: new RegExp(query, 'i') } }
      ]);
    }

    // Execute the user query to get filtered and searched users for pagination
    const user = await userQuery.sort({ updatedAt: -1 }).skip(perPage * page - perPage).limit(perPage).exec();
    const count = await OldForm.countDocuments({ deletedAt: { $eq: null } }); // Count all non-deleted users

    res.render('admin/admin-form-onprocess', { user: user, current: page, pages: Math.ceil(count / perPage), results: user, perPage: perPage, count: count});
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching data');
  }
});

// Define a route for fetching approved data
router.get('/admin/admin-form-onprocess-qualified', middleware.ensureAdminLoggedIn, async (req, res) => {
  try {
    let query = req.query.query;
    let barangayFilter = req.query.barangay;
    let perPage = 10;
    let page = req.query.page || 1;
  
    let userQuery = Qualified.find({ deletedAt: { $eq: null } }); // Start with all non-deleted users
    
    if (barangayFilter) {
      // Add barangay filter to the query if provided
      userQuery = userQuery.where('barangay').equals(barangayFilter);
    }

    if (query) {
      // Add search query to the user query
      userQuery = userQuery.or([
        { first_name: { $regex: new RegExp(query, 'i') } },
        { middle_name: { $regex: new RegExp(query, 'i') } },
        { last_name: { $regex: new RegExp(query, 'i') } }
      ]);
    }

    // Execute the user query to get filtered and searched users for pagination
    const user = await userQuery.sort({ updatedAt: -1 }).skip(perPage * page - perPage).limit(perPage).exec();
    const count = await Qualified.countDocuments({ deletedAt: { $eq: null } }); // Count all non-deleted users

    res.render('admin/admin-form-onprocess-qualified', { user: user, current: page, pages: Math.ceil(count / perPage), results: user, perPage: perPage, count: count});
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching data');
  }
});
router.get("/admin/admin-form-qualified-view/:id", middleware.ensureAdminLoggedIn, async (req, res) => {
  try {
      const qualified = await Qualified.findById(req.params.id); // Fetch the data from your database based on the provided ID

      // Render the view and pass the qualified data to it
      res.render('admin/admin-form-qualified-view', { qualified });
  } catch (error) {
      // Handle errors, for example, send a 404 response if the record is not found
      res.status(404).send('Not Found');
  }
});
// Route to transfer data from Approved to OldForm
router.post("/admin/transfer-approved-to-oldform/:approvedId",checkUserRole, async (req, res) => {
  const approvedId = req.params.approvedId;
  const message = req.body.message; // Extract message from request body
  try {
    // Find the document in the Approved model by ID
    const approvedData = await Qualified.findById(approvedId);
    const email = approvedData.email;

    if (!email) {
      req.flash('error', 'Email not found in the preRegistration record'); // Set a flash error message
      return res.redirect('/admin/admin-pre-reg-qualified'); // Redirect to an error page
    }

    // Clear the selectedOption, code, and payoutStatus fields
    approvedData.selectedOption = '';
    approvedData.code = '';
    approvedData.payoutStatus = '';

    // Save the changes
    await approvedData.save();

    const mailOptions = {
      from: 'ssoscholarsip@gmail.com',
      to: email,
      subject: 'Scholarship Application Update.',
      text: message
    };
    await transporter.sendMail(mailOptions);
    if (approvedData) {
      // Create a new document in the OldForm model using the data from Approved
      const newOldFormData = new OldForm(approvedData.toObject());

      // Optionally, set any additional fields or modify the data as needed

      await newOldFormData.save();

      // Optionally, you can delete the transferred data from the Approved model
      await Qualified.findByIdAndDelete(approvedId);

      req.flash("success", "Email sent successfully");
      res.redirect("/admin/admin-form-onprocess-qualified"); // Redirect to a page where the flash message can be displayed
    } else {
      console.log("Data not found in Approved model");
      req.flash("error", "Data not found in Approved model");
      res.redirect("/admin/admin-form-onprocess-qualified"); // Redirect to a page where the flash message can be displayed
    }
  } catch (error) {
    console.error("Error:", error);
    console.log("Data transfer from Approved to OldForm failed");
    req.flash("error", "Data transfer from Approved to OldForm failed");
    res.redirect("/admin/admin-form-onprocess-approved"); // Redirect to a page where the flash message can be displayed
  }
});



router.get('/admin/admin-form-onprocess-disqualified', middleware.ensureAdminLoggedIn, async (req, res) => {
  try {
    let query = req.query.query;
    let barangayFilter = req.query.barangay;
    let perPage = 10;
    let page = req.query.page || 1;
  
    let userQuery = DisQualified.find({ deletedAt: { $eq: null } }); // Start with all non-deleted users
    
    if (barangayFilter) {
      // Add barangay filter to the query if provided
      userQuery = userQuery.where('barangay').equals(barangayFilter);
    }

    if (query) {
      // Add search query to the user query
      userQuery = userQuery.or([
        { first_name: { $regex: new RegExp(query, 'i') } },
        { middle_name: { $regex: new RegExp(query, 'i') } },
        { last_name: { $regex: new RegExp(query, 'i') } }
      ]);
    }

    // Execute the user query to get filtered and searched users for pagination
    const user = await userQuery.sort({ updatedAt: -1 }).skip(perPage * page - perPage).limit(perPage).exec();
    const count = await DisQualified.countDocuments({ deletedAt: { $eq: null } }); // Count all non-deleted users

    res.render('admin/admin-form-onprocess-disqualified', { user: user, current: page, pages: Math.ceil(count / perPage), results: user, perPage: perPage, count: count});
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching data');
  }
});
router.post("/admin/admin-form-onprocess-disqualified/:formId",checkUserRole, async (req, res) => {
  const formId = req.params.formId;
  const message = req.body.message; // Extract message from request body

  try {
          // Find the document in the OldForm model by ID
          const oldFormData = await OldForm.findById(formId);

          if (oldFormData) {
            // Create a new document in the DisQualified model using the data from OldForm
            const newDisQualifiedData = new DisQualified(oldFormData.toObject());

            // Optionally, set a field to indicate the disqualification status
            newDisQualifiedData.disqualificationStatus = "Disqualified";

          // Optionally, you can delete the transferred data from the OldForm model
          await OldForm.findByIdAndDelete(formId);
          const email = oldFormData.email;

    if (!email) {
      req.flash('error', 'Email not found in the preRegistration record'); // Set a flash error message
      return res.redirect('/admin/admin-form-onprocess'); // Redirect to an error page
    }
   // Save the transferred data to the DisQualified model
   await newDisQualifiedData.save();

    const mailOptions = {
      from: 'ssoscholarsip@gmail.com',
      to: email,
      subject: 'Scholarship Application Update.',
      text: message,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        req.flash('error', 'Failed to send the email'); // Set a flash error message
        return res.redirect('/admin//admin-form-onprocess'); // Redirect to an error page
      } else {
        req.flash('success', 'Email sent successfully'); // Set a flash success message
        return res.redirect('/admin/admin-form-onprocess'); // Redirect to a success page
      }
    });
          req.flash("success", "Applicant disqualified succesfully");
          res.redirect("/admin/admin-form-onprocess"); // Redirect to a page where the flash message can be displayed
      } else {
          console.log("Form not found in OldForm model");
          req.flash("error", "Form not found in OldForm model");
          res.redirect("/admin/admin-form-onprocess"); // Redirect to a page where the flash message can be displayed
      }
  } catch (error) {
      console.error("Error:", error);
      console.log("Data transfer to Approved model failed");
      req.flash("error", "Data transfer to Approved model failed");
      res.redirect("/admin/admin-form-onprocess"); // Redirect to a page where the flash message can be displayed
  }
});
router.delete("/admin/delete-disqualified/:id",checkUserRole, async (req, res) => {
  try {
    const disqualifiedIdToDelete = req.params.id;

    // Soft delete: Set the deletedAt field instead of removing the document
    const disqualifiedToDelete = await DisQualified.findByIdAndUpdate(
      disqualifiedIdToDelete,
      { $set: { deletedAt: new Date() } },
      { new: true } // Return the modified document
    );
    // Check if the soft delete was successful
    if (!disqualifiedToDelete) {
      req.flash('error', 'Applicant record not found');
      return res.redirect("/admin/admin-form-onprocess-qualified");
    }

    // Add a success flash message for deletion
    req.flash('success', 'Applicant record deleted');

    res.redirect("/admin/admin-form-onprocess-disqualified");
  } catch (error) {
    console.error(error);
    // Handle errors and provide appropriate responses here
    req.flash('error', 'An error occurred while soft-deleting the applicant record');
    res.status(500).send("Internal Server Error");
  }
});
// Route to handle soft deleting selected records
router.post('/admin/delete-form-disqualified',checkUserRole, async (req, res) => {
  try {
      // Extract the IDs of selected records from the request body
      const { ids } = req.body;

      // Check if IDs are provided and not empty
      if (!ids || ids.trim() === '') {
          return res.status(400).send('No IDs provided for deletion');
      }

      // Split the comma-separated string of IDs into an array
      const qualifiedIdsToDelete = ids.split(',');

      // Perform the soft deletion operation
      const currentTime = new Date();
      const softDeleteUpdates = qualifiedIdsToDelete.map(qualifiedId => {
          return DisQualified.findByIdAndUpdate(
              qualifiedId,
              { $set: { deletedAt: currentTime } },
              { new: true }
          );
      });

      // Wait for all updates to complete
      await Promise.all(softDeleteUpdates);
       // Add a success flash message for deletion
    req.flash('success', 'Applicant record deleted');

      // Redirect to the specified URL after successful soft deletion
      res.redirect('/admin/admin-form-onprocess-disqualified');
  } catch (error) {
      // Handle errors
      console.error(error);
      res.status(500).send('Internal Server Error');
  }
});
router.post("/admin/transfer-disqualified-to-oldform/:disqualifiedId",checkUserRole, async (req, res) => {
  const disqualifiedId = req.params.disqualifiedId;
  const message = req.body.message; // Extract message from request body
  try {
    // Find the document in the Approved model by ID
    const disqualifiedData = await DisQualified.findById(disqualifiedId);
    const email = disqualifiedData.email;

    if (!email) {
      req.flash('error', 'Email not found in the preRegistration record'); // Set a flash error message
      return res.redirect('/admin/admin-pre-reg-qualified'); // Redirect to an error page
    }
    const mailOptions = {
      from: 'ssoscholarsip@gmail.com',
      to: email,
      subject: 'Scholarship Application Update.',
      text: message
    };
    await transporter.sendMail(mailOptions);

    if (disqualifiedData) {
      // Create a new document in the OldForm model using the data from Approved
      const newOldFormData = new OldForm(disqualifiedData.toObject());

      // Optionally, set any additional fields or modify the data as needed
      await newOldFormData.save();

      // Optionally, you can delete the transferred data from the Approved model
      await DisQualified.findByIdAndDelete(disqualifiedId);

      req.flash("success", "Email sent successfully");
      res.redirect("/admin/admin-form-onprocess-disqualified"); // Redirect to a page where the flash message can be displayed
    } else {
      console.log("Data not found in Approved model");
      req.flash("error", "Data not found");
      res.redirect("/admin/admin-form-onprocess-disqualified"); // Redirect to a page where the flash message can be displayed
    }
  } catch (error) {
    console.error("Error:", error);
    
    req.flash("error", "Data transfer failed");
    res.redirect("/admin/admin-form-onprocess-disqualified"); // Redirect to a page where the flash message can be displayed
  }
});
router.get("/admin/admin-form-disqualified-view/:id", middleware.ensureAdminLoggedIn, async (req, res) => {
  try {
      const disqualified = await DisQualified.findById(req.params.id); // Fetch the data from your database based on the provided ID

      // Render the view and pass the qualified data to it
      res.render('admin/admin-form-disqualified-view', { disqualified });
  } catch (error) {
      // Handle errors, for example, send a 404 response if the record is not found
      res.status(404).send('Not Found');
  }
});


router.get('/admin/admin-form-trash', middleware.ensureAdminLoggedIn, async (req, res) => {
  try {
    let query = req.query.query;
    let barangayFilter = req.query.barangay;
    let perPage = 10;
    let page = req.query.page || 1;
    
    const models = [Qualified, Pre_registration, DisQualified, Pre_registration_disqualified, Admin, User];
    const allDeletedData = [];

    // Fetch deleted records for each model
    for (const Model of models) {
      let userQuery = Model.find({ deletedAt: { $ne: null } });

      if (barangayFilter) {
        // Add barangay filter to the query if provided
        userQuery = userQuery.where('barangay').equals(barangayFilter);
      }

      if (query) {
        // Add search query to the user query
        userQuery = userQuery.or([
          { first_name: { $regex: new RegExp(query, 'i') } },
          { middle_name: { $regex: new RegExp(query, 'i') } },
          { last_name: { $regex: new RegExp(query, 'i') } }
        ]);
      }

      // Execute the user query to get filtered and searched users for pagination
      const deletedData = await userQuery.exec();
      
      if (!deletedData) {
        console.error('Error fetching deleted data');
        return res.status(500).send('Error fetching deleted data');
      }

      // Combine all deleted records into a single array
      allDeletedData.push(...deletedData);
    }

    // Calculate the total count of all deleted records
    const totalCount = allDeletedData.length;

    // Calculate the total number of pages based on the total count and records per page
    const totalPages = Math.ceil(totalCount / perPage);

    // Sort the combined deleted records by deletion timestamp in descending order
    allDeletedData.sort((a, b) => b.deletedAt - a.deletedAt);

    // Paginate the combined and sorted deleted data
    const paginatedDeletedData = allDeletedData.slice(perPage * (page - 1), perPage * page);

    // Render the "admin-form-trash" view and pass the paginated data and pagination details to it
    res.render('admin/admin-form-trash', { allDeletedData: paginatedDeletedData, totalCount, current: page, pages: totalPages, perPage });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching deleted data');
  }
});




// Route handler to handle restoration request for a specific record
router.put('/admin/restore/:modelName/:id',checkUserRole, middleware.ensureAdminLoggedIn, async (req, res) => {
  const { modelName, id } = req.params;

  try {
    // Find the model based on the provided modelName parameter
    let model;
    switch (modelName) {
      case 'Qualified':
        model = Qualified;
        break;
      case 'Pre_registration':
        model = Pre_registration;
        break;
      case 'DisQualified':
        model = DisQualified;
        break;
      case 'Pre_registration_disqualified':
        model = Pre_registration_disqualified;
        break;
      case 'Admin':
        model = Admin;
        break;
      case 'User':
        model = User;
        break;
      default:
        return res.status(404).send('Model not found');
    }

    // Find the soft-deleted record by ID and restore it
    const deletedRecord = await model.findByIdAndUpdate(
      id,
      { deletedAt: null }, // Set deletedAt to null to restore the record
      { new: true } // Return the updated record
    );
    if (!deletedRecord) {
      return res.status(404).send('Record not found');
    }

    // Update the deletedAt field to null to restore the record
    deletedRecord.deletedAt = null;
    await deletedRecord.save();

    // Redirect back to the trash page or send a success response
    res.redirect('/admin/admin-form-trash');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error restoring record');
  }
});

router.post('/admin/delete-form-restoreAll',checkUserRole, async (req, res) => {
  try {
    // Extract the IDs of selected records from the request body
    const { ids } = req.body;

    // Check if IDs are provided and not empty
    if (!ids || ids.trim() === '') {
      return res.status(400).send('No IDs provided for deletion');
    }

    // Split the comma-separated string of IDs into an array
    const recordIdsToDelete = ids.split(',');

    // Perform the soft deletion operation for each model
    const currentTime = new Date();
    const softDeleteUpdates = [];

    // Define models array
    const models = [Qualified, Pre_registration, DisQualified, Pre_registration_disqualified, Admin, User];

    // Iterate over each model and update their records
    for (const Model of models) {
      softDeleteUpdates.push(
        Model.updateMany(
          { _id: { $in: recordIdsToDelete } },
          { deletedAt: null }, // Set deletedAt to null to restore the record
          { new: true } // Return the updated record
        )
      );
    }

    // Wait for all updates to complete
    await Promise.all(softDeleteUpdates);

    // Add a success flash message for deletion
    req.flash('success', 'Records restored successfully');

    // Redirect to the specified URL after successful soft deletion
    res.redirect('/admin/admin-form-trash');
  } catch (error) {
    // Handle errors
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

router.post('/admin/delete-form-permanently',checkUserRole, async (req, res) => {
  try {
    // Extract the IDs of selected records from the request body
    const { ids } = req.body;

    // Check if IDs are provided and not empty
    if (!ids || ids.trim() === '') {
      return res.status(400).send('No IDs provided for deletion');
    }

    // Split the comma-separated string of IDs into an array
    const recordIdsToDelete = ids.split(',');

    // Perform the permanent deletion operation for each model
    const permanentDeleteUpdates = [];

    // Define models array
    const models = [Qualified, Pre_registration, DisQualified, Pre_registration_disqualified, Admin, User];

    // Iterate over each model and update their records
    for (const Model of models) {
      permanentDeleteUpdates.push(
        Model.deleteMany(
          { _id: { $in: recordIdsToDelete } }
        )
      );
    }

    // Wait for all updates to complete
    await Promise.all(permanentDeleteUpdates);

    // Add a success flash message for permanent deletion
    req.flash('success', 'Records permanently deleted successfully');

    // Redirect to the specified URL after successful permanent deletion
    res.redirect('/admin/admin-form-trash');
  } catch (error) {
    // Handle errors
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});







module.exports = router;