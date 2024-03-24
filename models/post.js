// models/Post.js
const mongoose = require('mongoose');

const User = require('../models/user.js');
const Admin = require('../models/admin.js');

// Create Post schema
const postSchema = new mongoose.Schema({
    content: String,
    createdAt: { type: Date, default: Date.now },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'createdByModel' // Reference path for dynamic referencing
    },
    createdByModel: {
        type: String,
        enum: ['User', 'Admin'] // Enum for specifying possible models
    }
});

module.exports = mongoose.model('Post', postSchema);

