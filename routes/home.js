const express = require("express");
const router = express.Router();
const User = require('../models/user.js');
const Admin = require('../models/admin.js');
const Post = require('../models/post');
const middleware = require("../middleware/index.js");

router.get("/", async (req, res) => {
    try {
        // Fetch all posts from the database and populate the createdBy field
        const posts = await Post.find().populate('createdBy').sort({ createdAt: -1 });

        // Retrieve current user information
        const currentUser = req.user;

        res.render("home/welcome", { posts: posts, currentUser: currentUser, message: req.flash('success') });
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


  
router.post('/posts', middleware.ensureLoggedIn, async (req, res) => {
    try {
        // Check if the user has already posted the maximum number of times
        const userPostsCount = await Post.countDocuments({ createdBy: req.user._id });
        const MAX_POSTS_PER_USER = 3; // Define the maximum number of posts per user

        if (userPostsCount >= MAX_POSTS_PER_USER) {
            req.flash('error', 'You have reached the maximum limit for posting(3)');
            return res.redirect('/'); // Redirect with an error flash message
        }

        // Proceed with creating the post
        const { content } = req.body;
        const createdBy = req.user._id; // Assuming the user ID is stored in req.user._id
        const createdByModel = req.user.role === 'staff' ? 'Admin' : 'User'; // Determine createdByModel based on user role

        const newPost = new Post({ content, createdBy, createdByModel });
        await newPost.save();

        req.flash('success', 'Post created successfully');

        // Redirect to the same page to maintain the current view
        res.redirect("/"); // Redirect to the same URL
    } catch (error) {
        console.error('Error creating post:', error);
        req.flash('error', 'Failed to create post');
        res.redirect("/"); // Redirect to the same URL
    }
});



// DELETE route to delete a announcement
router.delete('/home/post-delete/:postId', async (req, res) => {
	try {
	  const postId = req.params.postId;
  
	  // Check if the schedule with the given ID exists
	  const post = await Post.findById(postId);
  
	  if (!post) {
		req.flash('error', 'post not found');
		return res.redirect('/'); // Redirect with an error flash message
	  }
  
	  // Delete the schedule
	  await post.remove();
  
	  req.flash('success', 'Post deleted successfully');
	  return res.redirect('/'); // Redirect with a success flash message
	} catch (error) {
	  // Handle errors here
	  console.error('Error deleting post:', error);
	  req.flash('error', 'Internal Server Error');
	  res.redirect('/'); // Redirect with an error flash message
	}
  });



router.get("/home/about", (req,res) => {
	res.render("home/about",{ title: "About Us | SSO" });
});
router.get("/home/contact", (req,res) => {
	res.render("home/contact",{ title: "Contact | SSO" });
});

module.exports = router;