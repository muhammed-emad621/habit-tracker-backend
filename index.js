require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://habit-tracker-nine-sandy.vercel.app", // Vercel domain
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (Postman, curl, server-to-server)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) return callback(null, true);

      return callback(new Error("Not allowed by CORS: " + origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ handle preflight for all routes
app.options("*", cors());

app.use(express.json());

// ✅ routes
app.use("/auth", require("./routes/authRoutes"));
app.use("/habits", require("./routes/habitRoutes"));

// ✅ health check
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
