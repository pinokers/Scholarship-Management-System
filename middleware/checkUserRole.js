// middleware/checkUserRole.js

module.exports = {
  checkUserRole: (req, res, next) => {
    if (req.user && (req.user.role === 'adminmanager' || req.user.role === 'staff')) {
      return next();
    } else {
      req.flash('error', 'you dont have permission to change anything');
      res.redirect('/admin/dashboard'); // You can redirect to an error page or another route
    }
  },
};
