require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const app = express();

const cors = require("cors");
app.use(cors({
  origin: [
    "http://localhost:5173", // local frontend
    // we will add Render/Vercel URL later
  ],
  credentials: true
}));


app.use(express.json());

app.use(express.json());

app.use('/auth', require('./routes/authRoutes'));
app.use('/habits', require('./routes/habitRoutes'));

const PORT = process.env.PORT || 3000;


app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});


mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch(err => console.log(err));
