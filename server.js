/*
 * server.js
 * Express server to power the streaming chatbot.
 * 
 * This version loads the OpenAI API key and system prompt from environment variables,
 * and uses the cors middleware to allow cross-origin requests.
 */

require('dotenv').config(); // Loads variables from a .env file during local development

const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Retrieve the API key and system prompt from environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const systemPrompt = process.env.SYSTEM_PROMPT;

// Check that the necessary environment variables are set.
if (!OPENAI_API_KEY || !systemPrompt) {
  console.error('ERROR: Environment variables OPENAI_API_KEY and SYSTEM_PROMPT must be set.');
  process.exit(1);
}

// Enable CORS for all origins
app.use(cors());
// If you want to restrict it to your WordPress domain, use:
// app.use(cors({ origin: 'https://millionmedia.com' }));

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

// Start the server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
