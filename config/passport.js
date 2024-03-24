const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
const User = require("../models/user.js");
const Admin = require("../models/admin.js");

module.exports = function(passport) {
  passport.use('local-user', new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
    // Find the user by email
    User.findOne({ deletedAt: { $eq: null }, email: email })
      .then(user => {
        if (!user) {
          // User not found
          return done(null, false, { message: 'User not found' });
        }

        // Compare the provided password with the hashed password
        bcrypt.compare(password, user.password, (err, isMatch) => {
          if (err) {
            return done(err);
          }
          if (!isMatch) {
            // Password incorrect
            return done(null, false, { message: 'Password incorrect' });
          } else {
            // Password is correct, return the authenticated user
            return done(null, user);
          }
        });
      })
      .catch(err => {
        return done(err);
      });
  }));

  passport.use('local-admin', new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
    // Find the admin user by email
    Admin.findOne({ deletedAt: { $eq: null }, email: email })
      .then(admin => {
        if (!admin) {
          // Admin not found
          return done(null, false, { message: 'Admin not found' });
        }

        // Compare the provided password with the hashed password
        bcrypt.compare(password, admin.password, (err, isMatch) => {
          if (err) {
            return done(err);
          }
          if (!isMatch) {
            // Password incorrect
            return done(null, false, { message: 'Password incorrect' });
          } else {
            // Password is correct, return the authenticated admin
            return done(null, admin);
          }
        });
      })
      .catch(err => {
        return done(err);
      });
  }));

  // Serialize and deserialize users (similar to your previous code)
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
      if (user) {
        return done(err, user);
      } else {
        // If the user is not found, try to find an admin
        Admin.findById(id, (err, admin) => {
          done(err, admin);
        });
      }
    });
  });
};
