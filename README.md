# Cloudflare AI Assignment - AI-Powered Chat Assistant

A comprehensive AI-powered chat application built on Cloudflare's platform, featuring Llama 3.3 integration, real-time chat functionality, voice input, and persistent conversation memory.

## 🚀 Features

### ✅ Required Components (All Implemented)

- **🤖 LLM Integration**: Powered by Llama 3.3 via Cloudflare Workers AI
- **⚡ Workflow Coordination**: Custom workflow system for chat processing pipeline
- **💬 User Input**: Modern chat interface with both text and voice input
- **🧠 Memory & State**: Persistent conversation history using Durable Objects

### 🌟 Additional Features

- **🎤 Voice Input**: Web Speech API integration for hands-free interaction
- **📱 Responsive Design**: Beautiful, modern UI that works on all devices
- **💾 Session Management**: Persistent chat sessions with conversation history
- **🔄 Real-time Updates**: Live typing indicators and message animations
- **📊 Analytics**: Built-in chat analytics and session monitoring
- **🎨 Modern UI**: Gradient backgrounds, smooth animations, and intuitive design

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Cloudflare     │    │   Durable       │
│   (Pages)       │◄──►│   Worker         │◄──►│   Objects       │
│                 │    │                  │    │   (Memory)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   Workflows      │
                       │   (Coordination) │
                       └──────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   Llama 3.3      │
                       │   (Workers AI)   │
                       └──────────────────┘
```

## 🛠️ Setup Instructions

### Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Node.js**: Version 18 or higher
3. **Wrangler CLI**: Cloudflare's command-line tool

### Installation

1. **Clone and Install Dependencies**
   ```bash
   git clone <repository-url>
   cd cloudflare-ai-assignment
   npm install
   ```

2. **Configure Cloudflare**
   ```bash
   # Login to Cloudflare
   npx wrangler login
   
   # Update wrangler.toml with your account details
   # The file is already configured with the correct bindings
   ```

3. **Deploy the Application**
   ```bash
   # Deploy to Cloudflare Workers
   npm run deploy
   
   # Or deploy to staging
   npm run deploy:staging
   ```

### Development

```bash
# Start local development server
npm run dev

# The application will be available at:
# http://localhost:8787
```

## 📁 Project Structure

```
cloudflare-ai-assignment/
├── src/
│   ├── worker.ts                    # Main Worker entry point
│   ├── durable-objects/
│   │   └── chat-session.ts         # Chat session management & memory
│   └── workflows/
│       └── chat-workflow.ts        # Chat processing coordination
├── pages/                          # Cloudflare Pages frontend
│   ├── index.html                  # Main HTML page
│   ├── styles.css                  # Styling
│   ├── app.js                      # Frontend JavaScript
│   └── _routes.json               # Pages routing config
├── wrangler.toml                   # Cloudflare configuration
├── package.json                    # Dependencies
└── README.md                       # This file
```

## 🔧 Configuration

### Wrangler Configuration (`wrangler.toml`)

The application is pre-configured with:
- **AI Binding**: Connected to Cloudflare Workers AI
- **Durable Objects**: Chat session management
- **Environment Support**: Development, staging, and production

### Environment Variables

No additional environment variables are required - the application uses Cloudflare's built-in AI service.

## 🎯 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Main chat interface |
| `/api/chat` | POST | Send message to AI |
| `/api/session/init` | POST | Initialize chat session |
| `/api/session/history` | GET | Get chat history |
| `/api/session/clear` | POST | Clear chat history |
| `/api/health` | GET | Health check |

## 💡 Usage Examples

### Sending a Chat Message

```javascript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Hello, how are you?",
    sessionId: "session_123"
  })
});

const data = await response.json();
console.log(data.response); // AI response
```

### Voice Input

The application includes built-in voice recognition:
1. Click the microphone button
2. Speak your message
3. The text will be automatically transcribed and sent

## 🔍 Technical Details

### LLM Integration
- **Model**: Llama 3.3 70B Instruct
- **Provider**: Cloudflare Workers AI
- **Context Management**: Conversation history maintained in Durable Objects
- **Response Streaming**: Real-time response generation

### Memory & State Management
- **Durable Objects**: Persistent chat sessions
- **Conversation History**: Full message history with timestamps
- **Session Persistence**: Survives Worker restarts
- **Automatic Cleanup**: Inactive sessions cleaned up after 24 hours

### Workflow Coordination
- **Input Validation**: Message and session validation
- **Error Handling**: Comprehensive error management
- **Analytics**: Chat interaction logging
- **Batch Processing**: Support for multiple message processing

### Frontend Features
- **Real-time UI**: Live typing indicators and animations
- **Responsive Design**: Mobile-first approach
- **Accessibility**: Keyboard navigation and screen reader support
- **Offline Handling**: Graceful degradation when offline

## 🚀 Deployment Options

### Cloudflare Workers
```bash
npm run deploy
```

### Cloudflare Pages (Frontend Only)
```bash
cd pages
npm run build
# Deploy to Pages via dashboard or CLI
```

### Multi-Environment Deployment
```bash
# Staging
npm run deploy:staging

# Production
npm run deploy:prod
```

## 🔒 Security Features

- **CORS Protection**: Configured for secure cross-origin requests
- **Input Validation**: All user inputs are validated and sanitized
- **Rate Limiting**: Built-in protection against abuse (via Cloudflare)
- **Session Isolation**: Each chat session is isolated and secure

## 📊 Performance Optimizations

- **Edge Computing**: Runs on Cloudflare's global edge network
- **Durable Objects**: Efficient state management with minimal latency
- **Response Caching**: Intelligent caching of AI responses
- **Bundle Optimization**: Minimal JavaScript bundle size

## 🧪 Testing

```bash
# Test the health endpoint
curl https://your-worker.your-subdomain.workers.dev/api/health

# Test chat functionality
curl -X POST https://your-worker.your-subdomain.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","sessionId":"test123"}'
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is created for the Cloudflare AI Assignment and demonstrates the capabilities of building AI-powered applications on Cloudflare's platform.

## 🎉 Demo

Once deployed, your AI chat assistant will be available at your Cloudflare Workers URL. Features include:

- **Intelligent Conversations**: Powered by Llama 3.3
- **Voice Input**: Click the microphone to speak
- **Persistent Memory**: Remembers conversation context
- **Beautiful UI**: Modern, responsive design
- **Real-time Updates**: Live typing indicators and smooth animations

The application showcases all required components while providing an exceptional user experience that demonstrates the power of Cloudflare's AI and edge computing platform.

---

**Built with ❤️ using Cloudflare Workers AI, Llama 3.3, Durable Objects, and Workflows**