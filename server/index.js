// // index.js
// import express from 'express';
// import dotenv from 'dotenv';
// import OpenAI from 'openai';

// dotenv.config();

// const app = express();
// app.use(express.json());

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
//   // Optionally, include organization and project if needed
//   // organization: 'org-YourOrganizationID',
//   // project: 'your-project-id',
// });

// app.post('/chat', async (req, res) => {
//   const { message } = req.body;

//   if (!message) {
//     return res.status(400).json({ error: 'Message is required' });
//   }

//   try {
//     const response = await openai.chat.completions.create({
//       model: 'gpt-4o', // Ensure this model is correct
//       messages: [
//         { role: 'system', content: 'You are a helpful assistant.' },
//         { role: 'user', content: message },
//       ],
//       temperature: 0.7, // Optional: Adjust as needed
//     });

//     // Ensure the response structure matches the latest SDK
//     const assistantMessage = response.choices[0]?.message?.content;

//     res.json({ response: assistantMessage });
//   } catch (error) {
//     console.error('Error:', error);
//     res.status(500).json({ error: error.message || 'An error occurred' });
//   }
// });

// const port = process.env.PORT || 3000;

// app.listen(port, () => {
//   console.log(`Server is running on port ${port}`);
// });
// index.js
import express from 'express';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // Optionally, include organization and project if needed
  // organization: 'org-YourOrganizationID',
  // project: 'your-project-id',
});

// Existing /chat endpoint for handling dynamic messages
app.post('/chat', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Corrected model name
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: message },
      ],
      temperature: 0.7, // Optional: Adjust as needed
    });

    // Ensure the response structure matches the latest SDK
    const assistantMessage = response.choices[0]?.message?.content;

    res.json({ response: assistantMessage });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message || 'An error occurred' });
  }
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
