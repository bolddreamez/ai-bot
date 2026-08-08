const express = require("express");
const multer = require("multer");
const { GoogleGenAI, createUserContent, createPartFromUri } = require("@google/genai");
const fs = require("fs");
const path = require("path");

const router = express.Router();

// Initialize Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Configure disk storage
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

router.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded.",
    });
  }

  let uploadResult;

  try {
    // 1. Fallback MIME type detection for video/audio files
    let detectedMimeType = req.file.mimetype;
    const ext = path.extname(req.file.originalname).toLowerCase();
    
    if (ext === ".mp4") detectedMimeType = "video/mp4";
    else if (ext === ".mp3") detectedMimeType = "audio/mp3";
    else if (ext === ".wav") detectedMimeType = "audio/wav";
    else if (ext === ".mov") detectedMimeType = "video/mov";

    console.log(`Uploading file: ${req.file.originalname} (${detectedMimeType})`);

    // 2. Upload file to Google File API
    uploadResult = await ai.files.upload({
      file: req.file.path,
      mimeType: detectedMimeType,
    });

    // 3. Poll until file processing is COMPLETE
    let fileState = await ai.files.get({ name: uploadResult.name });
    let attempts = 0;

    while (fileState.state === "PROCESSING" && attempts < 30) {
      console.log("Gemini is processing the video file...");
      await new Promise((resolve) => setTimeout(resolve, 3000)); // wait 3s
      fileState = await ai.files.get({ name: uploadResult.name });
      attempts++;
    }

    if (fileState.state === "FAILED") {
      throw new Error("Gemini failed to process this video file. Ensure it contains audio and isn't corrupted.");
    }

    // 4. Generate transcript using Gemini Flash
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: createUserContent([
        createPartFromUri(uploadResult.uri, uploadResult.mimeType || detectedMimeType),
        "Provide an accurate word-for-word transcript of the spoken audio in this video. If there is no speech, describe the audio."
      ]),
    });

    // 5. Cleanup local and cloud temporary files
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    await ai.files.delete({ name: uploadResult.name });

    res.json({
      success: true,
      message: "File transcribed successfully using Gemini!",
      transcript: response.text,
    });

  } catch (error) {
    console.error("Gemini API Error:", error);

    // Clean up local temp file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: "Failed to transcribe the file using Gemini.",
      error: error.message,
    });
  }
});

module.exports = router;
