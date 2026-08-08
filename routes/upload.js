const express = require("express");
const multer = require("multer");
const { GoogleGenAI, createUserContent, createPartFromUri } = require("@google/genai");
const fs = require("fs");

const router = express.Router();

// Initialize the Gemini AI client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Store uploaded files in the "uploads" folder locally first
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// POST /upload -> Now transcribes using Gemini!
router.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded.",
    });
  }

  let uploadResult;

  try {
    // 1. Upload the file to Google's File API so Gemini can access it
    uploadResult = await ai.files.upload({
      file: req.file.path,
      mimeType: req.file.mimetype,
    });

    // 2. Wait for the file to finish processing if it's a large video/audio file
    let fileState = await ai.files.get({ name: uploadResult.name });
    while (fileState.state === "PROCESSING") {
      console.log("Gemini is processing the file...");
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
      fileState = await ai.files.get({ name: uploadResult.name });
    }

    if (fileState.state === "FAILED") {
      throw new Error("Google File API processing failed.");
    }

    // 3. Ask Gemini to transcribe using the explicit content helper formatting
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Fast and excellent for multimodal tasks
      contents: createUserContent([
        createPartFromUri(uploadResult.uri, uploadResult.mimeType),
        "Provide a highly accurate word-for-word transcription of this audio. Do not summarize or add commentary."
      ]),
    });

    // 4. Clean up: Delete the local file from your backend server
    fs.unlink(req.file.path, (err) => {
      if (err) console.error("Error deleting local file:", err);
    });
    
    // 5. Clean up: Delete the file from Google's servers to be safe
    await ai.files.delete({ name: uploadResult.name });

    // 6. Return the text transcript as JSON
    res.json({
      success: true,
      message: "File transcribed successfully using Gemini!",
      transcript: response.text,
    });

  } catch (error) {
    console.error("Gemini API Error:", error);

    // Ensure local file is cleaned up even if the process fails
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: "Failed to transcribe the audio file using Gemini.",
      error: error.message,
    });
  }
});

module.exports = router;