const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  semester: String,
  limit: Number,
  start_date: Date,
  end_date: Date,
  createdAt:{
    type: Date,
    default: Date.now()
 },
  updatedAt: {
    type: Date,
    default: Date.now, // Set the default value to the current date and time
  },
});

const Schedule = mongoose.model('Schedule', scheduleSchema);

module.exports = Schedule;
