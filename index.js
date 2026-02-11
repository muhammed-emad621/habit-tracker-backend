require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// ✅ middleware
app.use(cors({
  origin: [
    "http://localhost:5173",
    // add your Vercel URL later, like:
    // "https://your-frontend.vercel.app",
  ],
  credentials: true,
}));
app.use(express.json());

// ✅ routes
app.use("/auth", require("./routes/authRoutes"));
app.use("/habits", require("./routes/habitRoutes"));

// ✅ health check (super useful on Render)
app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Mongo connection error:", err);
    process.exit(1);
  }
}

start();
