const middleware = {
	ensureLoggedIn: (req, res, next) => {
		if(req.isAuthenticated()) {
			return next();
		}
		req.flash("warning", "Please log in first to continue");
		res.redirect("/auth/applicantlogin");
	},
	ensureLoggedIn: (req, res, next) => {
		if(req.isAuthenticated()) {
			return next();
		}
		req.flash("warning", "Please log in first to continue");
		res.redirect("/auth/adminlogin");
	},
	
	ensureAdminLoggedIn: (req, res, next) => {
		if(req.isUnauthenticated()) {
			req.session.returnTo = req.originalUrl;
			req.flash("warning", "Please log in first to continue");
			return res.redirect("/auth/adminlogin");
		}
		if (req.user.role !== "staff" && req.user.role !== "adminmanager" && req.user.role !== "staffview") {
			req.flash("warning", "This route is allowed for admin only!");
			return res.redirect("back");
		}
		next();
	},
	
	ensureApplicantLoggedIn: (req, res, next) => {
		if(req.isUnauthenticated()) {
			req.session.returnTo = req.originalUrl;
			req.flash("warning", "Please log in first to continue");
			return res.redirect("/auth/applicantlogin");
		}
		if(req.user.role != "user") {
			req.flash("warning", "This route is allowed for applicant only!!");
			return res.redirect("back");
		}
		next();
	},
	
	
	ensureNotLoggedIn: (req, res, next) => {
		if(req.isAuthenticated()) {
			req.session.returnTo = req.originalUrl;
			req.flash("warning", "Please logout first to continue");
			if(req.user.role == "admin")
				return res.redirect("/admin/dashboard");
			if(req.user.role == "user")
				return res.redirect("/applicant/dashboard");
		}
		next();
	}
	
}

module.exports = middleware;