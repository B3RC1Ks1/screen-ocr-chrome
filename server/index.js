// server/index.js

import express from 'express';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS if needed
app.use(morgan('combined')); // Logging

// Rate Limiter
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // Optional: organization and project can be included if needed
  // organization: 'org-YourOrganizationID',
  // project: 'your-project-id',
});

// POST /chat endpoint
app.post('/chat', async (req, res) => {
  const { message } = req.body;

  // Input Validation
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'A valid "message" field is required.' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Correct model name
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: message },
      ],
      temperature: 0.7, // Adjust as needed
      max_tokens: 150, // Limit response length
    });

    const assistantMessage = completion.choices?.[0]?.message?.content;

    if (!assistantMessage) {
      throw new Error('No response from OpenAI.');
    }

    res.json({ response: assistantMessage });
  } catch (error) {
    console.error('OpenAI API Error:', error);
    res.status(500).json({ error: error.message || 'An error occurred while processing your request.' });
  }
});

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'Server is healthy.' });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
