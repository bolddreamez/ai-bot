const express = require("express");
const { GoogleGenAI } = require("@google/genai");

const router = express.Router();

// Initialize the Gemini AI client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// POST /generate/linkedin
router.post("/linkedin", async (req, res) => {
  const { transcript } = req.body;

  if (!transcript) {
    return res.status(400).json({ success: false, message: "Transcript is required." });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are an expert content creator. Rewrite this video transcript into an engaging, high-converting LinkedIn post. 
      Use professional yet conversational formatting, short paragraphs, bold hooks, and bullet points. Do not include meta-commentary.
      
      Transcript:
      "${transcript}"`,
    });

    res.json({ success: true, content: response.text });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /generate/x
router.post("/x", async (req, res) => {
  const { transcript } = req.body;

  if (!transcript) {
    return res.status(400).json({ success: false, message: "Transcript is required." });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are a viral storyteller on X (formerly Twitter). Rewrite this video transcript into a compelling, high-value X thread. 
      Format it explicitly as numbered tweets (1/, 2/, 3/ etc.). Keep each tweet strictly under 280 characters. Ensure every tweet flows smoothly to the next.
      
      Transcript:
      "${transcript}"`,
    });

    res.json({ success: true, content: response.text });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /generate/timestamps
router.post("/timestamps", async (req, res) => {
  const { transcript } = req.body;

  if (!transcript) {
    return res.status(400).json({ success: false, message: "Transcript is required." });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze this video transcript and identify the most engaging hooks, key takeaways, or sections perfect for YouTube Shorts. 
      Provide a list of recommended timestamps with short, punchy titles (e.g., 00:15 - The Big Mistake).
      
      Transcript:
      "${transcript}"`,
    });

    res.json({ success: true, content: response.text });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;