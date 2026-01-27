const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
  name: { type: String, required: true },

  // streak starts counting from here if user never relapsed
  startDate: { type: Date, default: Date.now },

  lastFailureDate: { type: Date, default: null },
  history: { type: [Date], default: [] },

  almostRelapses: {
    type: [
      {
        date: { type: Date, default: Date.now },
        note: { type: String, default: '' }
      }
    ],
    default: []
  },

  shareCode: { type: String, required: true },
  sharedWith: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] }
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  habits: [habitSchema]
});

module.exports = mongoose.model('User', userSchema);
