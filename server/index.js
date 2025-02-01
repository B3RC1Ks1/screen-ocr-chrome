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

app.use(express.json());
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 requests per windowMs
  message: { error: "Too many requests, please try again later." },
});
app.use(limiter);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ALLOWED_MODELS = ["gpt-4o", "gpt-4o-mini"];

app.post("/chat", async function (req, res) {
  const message = req.body.message;
  const model = req.body.model;
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: 'A valid "message" field is required.' });
  }
  let selectedModel;
  if (model) {
    let modelAllowed = false;
    for (let i = 0; i < ALLOWED_MODELS.length; i++) {
      if (ALLOWED_MODELS[i] === model) {
        modelAllowed = true;
        break;
      }
    }
    if (modelAllowed) {
      selectedModel = model;
    } else {
      return res.status(400).json({
        error: "Invalid model. Allowed models are: " + ALLOWED_MODELS.join(", "),
      });
    }
  } else {
    selectedModel = "gpt-4o";
  }
  try {
    const completion = await openai.chat.completions.create({
      model: selectedModel,
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: message },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });
    let assistantMessage = "";
    if (
      completion.choices &&
      completion.choices.length > 0 &&
      completion.choices[0].message &&
      completion.choices[0].message.content
    ) {
      assistantMessage = completion.choices[0].message.content;
    } else {
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

app.get("/health", function (req, res) {
  res.status(200).json({ status: "Server is healthy." });
});

const PORT = process.env.PORT || 9001;
app.listen(PORT, function () {
  console.log("Server is running on port " + PORT);
});


