// server/index.js

import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS if needed
app.use(morgan("combined")); // Logging

// Rate Limiter
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 requests per windowMs
  message: { error: "Too many requests, please try again later." },
});
app.use(limiter);

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Allowed Models List (Whitelist)
const ALLOWED_MODELS = ["gpt-4o", "gpt-4o-mini"]; // Add more models as needed

// POST /chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const { message, model } = req.body;

    // Input Validation
    if (!message || typeof message !== "string") {
      res.status(400).json({ error: 'A valid "message" field is required.' });
      return;
    }

    // Validate Model
    if (model && !ALLOWED_MODELS.includes(model)) {
      res.status(400).json({
        error: `Invalid model. Allowed models are: ${ALLOWED_MODELS.join(", ")}`,
      });
      return;
    }

    let selectedModel;
    if (model) {
      selectedModel = model;
    } else {
      selectedModel = "gpt-4o"; // Default model if not provided
    }

    const completion = await openai.chat.completions.create({
      model: selectedModel,
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: message },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    const assistantMessage =
      completion.choices &&
      completion.choices[0] &&
      completion.choices[0].message &&
      completion.choices[0].message.content;

    if (!assistantMessage) {
      throw new Error("No response from OpenAI.");
    }

    res.json({ response: assistantMessage });
  } catch (error) {
    console.error("OpenAI API Error:", error);
    res.status(500).json({
      error: error.message || "An error occurred while processing your request.",
    });
  }
});

// Health Check Endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "Server is healthy." });
});

// Start Server
const PORT = process.env.PORT || 9001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
