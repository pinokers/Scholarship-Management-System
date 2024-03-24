const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title: String,
    content: String,
    date: Date,
    createdAt:{
        type: Date,
        default: Date.now()
     },
      updatedAt:{
        type: Date,
        default: Date.now()    
     },
     deletedAt: {
      type: Date,
      default: null,
    },
  });
  module.exports = mongoose.model('Announcement', announcementSchema);