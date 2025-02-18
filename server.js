/*
 * server.js
 * Express server to power the streaming chatbot.
 * 
 * Loads OpenAI API key and system prompt from environment variables.
 * Handles CORS by explicitly setting headers on every request.
 */

require('dotenv').config(); // Load .env variables in local development

const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 3000;

// Retrieve environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const systemPrompt = process.env.SYSTEM_PROMPT;

if (!OPENAI_API_KEY || !systemPrompt) {
  console.error('ERROR: Environment variables OPENAI_API_KEY and SYSTEM_PROMPT must be set.');
  process.exit(1);
}

/**
 * Custom middleware to add CORS headers.
 * This will respond to OPTIONS (preflight) requests with 200 and proper headers.
 */
app.use((req, res, next) => {
  // Change '*' to your domain (https://millionmedia.com) to restrict access if needed.
  res.header('Access-Control-Allow-Origin', 'https://millionmedia.com'); 
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // If this is a preflight request, send a 200 response directly.
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// Serve static files from the "public" folder
app.use(express.static('public'));
app.use(bodyParser.json());

// POST /api/chat – receives the conversation and streams the assistant's reply
app.post('/api/chat', async (req, res) => {
  const conversation = req.body.conversation;
  if (!conversation || !Array.isArray(conversation)) {
    return res.status(400).json({ error: "Invalid conversation format." });
  }

  // Prepend the system prompt (which instructs your assistant "Trained")
  const messages = [{ role: 'system', content: systemPrompt }, ...conversation];

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',  // Using GPT-4 as requested
        messages: messages,
        stream: true   // Request streaming responses
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

    // Pipe streaming data from OpenAI to the client
    response.body.on('data', (chunk) => {
      res.write(chunk);
    });
    response.body.on('end', () => {
      res.end();
    });
    response.body.on('error', (err) => {
      console.error('Streaming error:', err);
      res.end();
    });

  } catch (error) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({ error: error.toString() });
  }
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
