import { Ai } from '@cloudflare/ai';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ChatSessionState {
  sessionId: string;
  messages: ChatMessage[];
  createdAt: number;
  lastActivity: number;
  userPreferences?: {
    name?: string;
    language?: string;
    personality?: string;
  };
}

export class ChatSession {
  private state: ChatSessionState;
  private env: any;

  constructor(state: DurableObjectState, env: any) {
    this.env = env;
    this.state = {
      sessionId: '',
      messages: [
        {
          role: 'system',
          content: `You are a helpful AI assistant powered by Llama 3.3 running on Cloudflare Workers AI. 
          You should be friendly, informative, and helpful. You have access to the conversation history 
          and can remember context from previous messages. Keep responses concise but comprehensive. 
          If asked about your capabilities, mention that you're running on Cloudflare's infrastructure 
          using Llama 3.3 model.`,
          timestamp: Date.now()
        }
      ],
      createdAt: Date.now(),
      lastActivity: Date.now()
    };
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS
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

    try {
      if (path.includes('/chat') && request.method === 'POST') {
        return await this.handleChat(request);
      } else if (path.includes('/init') && request.method === 'POST') {
        return await this.handleInit(request);
      } else if (path.includes('/history') && request.method === 'GET') {
        return await this.handleGetHistory();
      } else if (path.includes('/clear') && request.method === 'POST') {
        return await this.handleClearHistory();
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error('ChatSession Error:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  private async handleInit(request: Request): Promise<Response> {
    const body = await request.json() as { sessionId: string };
    
    if (body.sessionId) {
      this.state.sessionId = body.sessionId;
      this.state.lastActivity = Date.now();
      
      // Persist the state
      await this.state.storage?.put('sessionState', this.state);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      sessionId: this.state.sessionId,
      messageCount: this.state.messages.length 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async handleChat(request: Request): Promise<Response> {
    const { message, sessionId } = await request.json() as { message: string; sessionId: string };
    
    if (!message || !sessionId) {
      return new Response(JSON.stringify({ error: 'Message and sessionId are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update session state
    this.state.sessionId = sessionId;
    this.state.lastActivity = Date.now();

    // Add user message to conversation history
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: Date.now()
    };
    this.state.messages.push(userMessage);

    try {
      // Generate AI response using Llama 3.3
      const aiResponse = await this.generateAIResponse();
      
      // Add AI response to conversation history
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: aiResponse,
        timestamp: Date.now()
      };
      this.state.messages.push(assistantMessage);

      // Persist updated state
      await this.state.storage?.put('sessionState', this.state);

      return new Response(JSON.stringify({ 
        response: aiResponse,
        sessionId: this.state.sessionId,
        timestamp: Date.now()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('AI Generation Error:', error);
      
      // Add error message to conversation
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: Date.now()
      };
      this.state.messages.push(errorMessage);

      return new Response(JSON.stringify({ 
        response: errorMessage.content,
        sessionId: this.state.sessionId,
        error: 'AI generation failed'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  private async generateAIResponse(): Promise<string> {
    try {
      // Prepare messages for Llama 3.3
      // Keep only the last 10 messages to manage context length
      const recentMessages = this.state.messages.slice(-10);
      
      // Convert to the format expected by Llama 3.3
      const formattedMessages = recentMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));

      // Use Llama 3.3 via Cloudflare Workers AI
      const response = await this.env.AI.run('@cf/meta/llama-3.3-70b-instruct', {
        messages: formattedMessages,
        max_tokens: 512,
        temperature: 0.7,
        stream: false
      });

      return response.response || 'I apologize, but I was unable to generate a response.';
      
    } catch (error) {
      console.error('Llama 3.3 API Error:', error);
      
      // Fallback response if AI service is unavailable
      return `I'm currently experiencing technical difficulties with my AI processing. 
      This is a demo application showcasing Cloudflare Workers AI with Llama 3.3. 
      In a production environment, this would be handled more gracefully. 
      Please try your question again in a moment.`;
    }
  }

  private async handleGetHistory(): Promise<Response> {
    return new Response(JSON.stringify({
      sessionId: this.state.sessionId,
      messages: this.state.messages,
      createdAt: this.state.createdAt,
      lastActivity: this.state.lastActivity,
      messageCount: this.state.messages.length
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async handleClearHistory(): Promise<Response> {
    // Keep only the system message
    this.state.messages = this.state.messages.filter(msg => msg.role === 'system');
    this.state.lastActivity = Date.now();
    
    await this.state.storage?.put('sessionState', this.state);

    return new Response(JSON.stringify({
      success: true,
      message: 'Chat history cleared',
      sessionId: this.state.sessionId
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Durable Object lifecycle methods
  async alarm() {
    // Clean up inactive sessions after 1 hour
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    if (now - this.state.lastActivity > oneHour) {
      console.log(`Cleaning up inactive session: ${this.state.sessionId}`);
      // In a real application, you might want to archive the session data
      // before deleting it
    }
  }
}
