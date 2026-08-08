require("dotenv").config();

const express = require("express");
const cors = require("cors");

const uploadRoute = require("./routes/upload");
const generateRoute = require("./routes/generate"); // Added

const fs = require("fs");

// Ensure uploads folder exists on server start
if (!fs.existsSync("./uploads")) {
  fs.mkdirSync("./uploads");
}

const app = express();

app.use(cors());
app.use(express.json());

app.use("/upload", uploadRoute);
app.use("/generate", generateRoute); // Added

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Backend is running!",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});