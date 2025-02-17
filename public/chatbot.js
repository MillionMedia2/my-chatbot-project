/*
 * chatbot.js
 * Client-side script for the streaming chatbot.
 *
 * IMPORTANT: Update the API_URL below with the URL of your deployed Vercel project.
 * For example: "https://your-project-name.vercel.app/api/chat"
 */
const API_URL = 'https://your-project-name.vercel.app/api/chat'; // <-- update this!

// Store conversation thread in memory
let conversation = [];

// Get DOM elements
const chatDisplay = document.getElementById('chatDisplay');
const chatInput   = document.getElementById('chatInput');
const sendBtn     = document.getElementById('sendBtn');

// Listen for clicks on the send button and Enter key
sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

// Function to send a user message and display the assistant's streaming reply
async function sendMessage() {
  const userMessage = chatInput.value.trim();
  if (!userMessage) return;

  // Append user's message to the display and conversation thread
  appendMessage('user', userMessage);
  conversation.push({ role: 'user', content: userMessage });
  chatInput.value = '';

  // Append a placeholder for the assistant reply
  const assistantMessageEl = appendMessage('assistant', '');

  try {
    // Call the backend API with the conversation thread
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation })
    });

    if (!response.ok) {
      const errorText = await response.text();
      appendError("Error: " + errorText);
      return;
    }

    // Process the streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let assistantContent = '';

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      if (value) {
        const chunk = decoder.decode(value);
        assistantContent += chunk;
        assistantMessageEl.innerText = assistantContent;
      }
    }

    // Append the assistant's full reply to the conversation thread.
    conversation.push({ role: 'assistant', content: assistantContent });
  } catch (error) {
    console.error('Error during fetch:', error);
    appendError("Error: " + error.toString());
  }
}

// Helper: Append a message to the chat display.
function appendMessage(role, text) {
  const messageEl = document.createElement('div');
  messageEl.classList.add('message', role);
  messageEl.innerText = text;
  chatDisplay.appendChild(messageEl);
  chatDisplay.scrollTop = chatDisplay.scrollHeight;
  return messageEl;
}

// Helper: Append an error message.
function appendError(errorText) {
  const errorEl = document.createElement('div');
  errorEl.classList.add('error');
  errorEl.innerText = errorText;
  chatDisplay.appendChild(errorEl);
  chatDisplay.scrollTop = chatDisplay.scrollHeight;
}
