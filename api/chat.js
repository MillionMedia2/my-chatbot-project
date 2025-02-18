// api/chat.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const serverless = require('serverless-http');
const app = express();

// Retrieve environment variables from Vercel (or .env during local testing)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const systemPrompt = process.env.SYSTEM_PROMPT;

if (!OPENAI_API_KEY || !systemPrompt) {
  console.error('ERROR: Environment variables OPENAI_API_KEY and SYSTEM_PROMPT must be set.');
  process.exit(1);
}

// Set up CORS middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');  // For production, replace '*' with your domain if needed.
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// Parse JSON bodies
app.use(bodyParser.json());

// Define the /api/chat endpoint
app.post('/api/chat', async (req, res) => {
  const conversation = req.body.conversation;
  if (!conversation || !Array.isArray(conversation)) {
    return res.status(400).json({ error: "Invalid conversation format." });
  }

  // Prepend the system prompt to the conversation
  const messages = [{ role: 'system', content: systemPrompt }, ...conversation];

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: messages,
        stream: true
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ error: errorData });
    }

    // Set headers for streaming response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Pipe the streaming data from OpenAI to the client
    response.body.on('data', (chunk) => res.write(chunk));
    response.body.on('end', () => res.end());
    response.body.on('error', (err) => {
      console.error('Streaming error:', err);
      res.end();
    });

  } catch (error) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({ error: error.toString() });
  }
});

// Export the Express app as a serverless function
module.exports = serverless(app);
