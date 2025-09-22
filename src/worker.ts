import { ChatSession } from './durable-objects/chat-session';
import { executeChatWorkflow, ChatWorkflowInput } from './workflows/chat-workflow';

export interface Env {
  AI: Ai;
  CHAT_SESSIONS: DurableObjectNamespace;
  ASSIGNMENT_ENV: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS for development
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // API Routes
    if (path.startsWith('/api/')) {
      return handleApiRequest(request, env, ctx);
    }

    // Serve the Pages frontend for any other route
    return new Response(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI Chat Assistant</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
          .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
          .chat-container { height: 400px; overflow-y: auto; padding: 20px; border-bottom: 1px solid #eee; }
          .message { margin-bottom: 15px; padding: 12px; border-radius: 8px; max-width: 70%; }
          .user-message { background: #667eea; color: white; margin-left: auto; }
          .ai-message { background: #f1f3f4; color: #333; }
          .input-container { display: flex; padding: 20px; gap: 10px; }
          .input-container input { flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px; }
          .input-container button { padding: 12px 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; }
          .voice-btn { background: #28a745 !important; }
          .voice-btn.recording { background: #dc3545 !important; animation: pulse 1s infinite; }
          @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
          .typing { color: #666; font-style: italic; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🤖 AI Chat Assistant</h1>
            <p>Powered by Llama 3.3 on Cloudflare Workers AI</p>
          </div>
          <div class="chat-container" id="chatContainer">
            <div class="message ai-message">
              👋 Hello! I'm your AI assistant powered by Llama 3.3. How can I help you today?
            </div>
          </div>
          <div class="input-container">
            <input type="text" id="messageInput" placeholder="Type your message here..." />
            <button onclick="sendMessage()">Send</button>
            <button id="voiceBtn" class="voice-btn" onclick="toggleVoiceRecording()">🎤 Voice</button>
          </div>
        </div>

        <script>
          let sessionId = 'session_' + Math.random().toString(36).substr(2, 9);
          let isRecording = false;
          let recognition = null;

          // Initialize speech recognition
          if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onresult = function(event) {
              const transcript = event.results[0][0].transcript;
              document.getElementById('messageInput').value = transcript;
              sendMessage();
            };

            recognition.onerror = function(event) {
              console.error('Speech recognition error:', event.error);
            };
          }

          async function sendMessage() {
            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            if (!message) return;

            const chatContainer = document.getElementById('chatContainer');
            
            // Add user message
            const userMessage = document.createElement('div');
            userMessage.className = 'message user-message';
            userMessage.textContent = message;
            chatContainer.appendChild(userMessage);

            input.value = '';
            chatContainer.scrollTop = chatContainer.scrollHeight;

            // Show typing indicator
            const typingIndicator = document.createElement('div');
            typingIndicator.className = 'message ai-message typing';
            typingIndicator.textContent = 'AI is typing...';
            chatContainer.appendChild(typingIndicator);
            chatContainer.scrollTop = chatContainer.scrollHeight;

            try {
              const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, sessionId })
              });

              const data = await response.json();
              
              // Remove typing indicator
              chatContainer.removeChild(typingIndicator);
              
              // Add AI response
              const aiMessage = document.createElement('div');
              aiMessage.className = 'message ai-message';
              aiMessage.textContent = data.response;
              chatContainer.appendChild(aiMessage);
              
              chatContainer.scrollTop = chatContainer.scrollHeight;
            } catch (error) {
              console.error('Error:', error);
              chatContainer.removeChild(typingIndicator);
              
              const errorMessage = document.createElement('div');
              errorMessage.className = 'message ai-message';
              errorMessage.textContent = 'Sorry, I encountered an error. Please try again.';
              chatContainer.appendChild(errorMessage);
              chatContainer.scrollTop = chatContainer.scrollHeight;
            }
          }

          function toggleVoiceRecording() {
            if (!recognition) {
              alert('Speech recognition not supported in this browser');
              return;
            }

            const voiceBtn = document.getElementById('voiceBtn');
            
            if (isRecording) {
              recognition.stop();
              voiceBtn.classList.remove('recording');
              voiceBtn.textContent = '🎤 Voice';
              isRecording = false;
            } else {
              recognition.start();
              voiceBtn.classList.add('recording');
              voiceBtn.textContent = '🔴 Stop';
              isRecording = true;
            }
          }

          // Allow Enter key to send message
          document.getElementById('messageInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
              sendMessage();
            }
          });

          // Initialize session
          fetch('/api/session/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
          });
        </script>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
};

async function handleApiRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    switch (path) {
      case '/api/chat':
        return await handleChat(request, env);
      case '/api/session/init':
        return await handleSessionInit(request, env);
      case '/api/health':
        return new Response(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }), {
          headers: { 'Content-Type': 'application/json' }
        });
      case '/api/session/history':
        return await handleGetHistory(request, env);
      case '/api/session/clear':
        return await handleClearHistory(request, env);
      default:
        return new Response('Not Found', { status: 404 });
    }
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleChat(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { message, sessionId } = await request.json() as { message: string; sessionId: string };
  
  if (!message || !sessionId) {
    return new Response(JSON.stringify({ error: 'Message and sessionId are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Use the Chat Workflow for coordinated processing
    const workflowInput: ChatWorkflowInput = {
      sessionId,
      message,
      timestamp: Date.now(),
      context: {
        userAgent: request.headers.get('User-Agent'),
        origin: request.headers.get('Origin')
      }
    };

    const workflowResult = await executeChatWorkflow(env, workflowInput);

    return new Response(JSON.stringify({
      response: workflowResult.response,
      sessionId: workflowResult.sessionId,
      processingTime: workflowResult.processingTime,
      success: workflowResult.success,
      error: workflowResult.error
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Chat handling error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process chat request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleSessionInit(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { sessionId } = await request.json() as { sessionId: string };
  
  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'sessionId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Initialize the session in the durable object
  const durableObjectId = env.CHAT_SESSIONS.idFromName(sessionId);
  const durableObject = env.CHAT_SESSIONS.get(durableObjectId);

  const initRequest = new Request(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'init', sessionId })
  });

  const response = await durableObject.fetch(initRequest);
  return response;
}

async function handleGetHistory(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');
  
  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'sessionId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Get the durable object for this session
  const durableObjectId = env.CHAT_SESSIONS.idFromName(sessionId);
  const durableObject = env.CHAT_SESSIONS.get(durableObjectId);

  const historyRequest = new Request(request.url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  const response = await durableObject.fetch(historyRequest);
  return response;
}

async function handleClearHistory(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { sessionId } = await request.json() as { sessionId: string };
  
  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'sessionId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Get the durable object for this session
  const durableObjectId = env.CHAT_SESSIONS.idFromName(sessionId);
  const durableObject = env.CHAT_SESSIONS.get(durableObjectId);

  const clearRequest = new Request(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'clear', sessionId })
  });

  const response = await durableObject.fetch(clearRequest);
  return response;
}
