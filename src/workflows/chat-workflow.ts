import { ChatSession } from '../durable-objects/chat-session';

export interface ChatWorkflowInput {
  sessionId: string;
  message: string;
  timestamp: number;
  userId?: string;
  context?: Record<string, any>;
}

export interface ChatWorkflowOutput {
  success: boolean;
  response: string;
  sessionId: string;
  processingTime: number;
  timestamp: number;
  error?: string;
}

/**
 * Chat Workflow - Coordinates the entire chat processing pipeline
 * This demonstrates how Workflows can orchestrate complex operations
 * across multiple services and Durable Objects
 */
export class ChatWorkflow {
  constructor(
    private env: {
      CHAT_SESSIONS: DurableObjectNamespace;
      AI: any;
    }
  ) {}

  async run(input: ChatWorkflowInput): Promise<ChatWorkflowOutput> {
    const startTime = Date.now();
    
    try {
      // Step 1: Validate input
      if (!input.sessionId || !input.message) {
        throw new Error('Invalid input: sessionId and message are required');
      }

      // Step 2: Get or create chat session
      const sessionId = input.sessionId;
      const durableObjectId = this.env.CHAT_SESSIONS.idFromName(sessionId);
      const chatSession = this.env.CHAT_SESSIONS.get(durableObjectId);

      // Step 3: Process the chat message
      const chatRequest = new Request('http://localhost/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input.message,
          sessionId: sessionId,
          context: input.context
        })
      });

      const chatResponse = await chatSession.fetch(chatRequest);
      const chatResult = await chatResponse.json() as { response: string; sessionId: string };

      // Step 4: Log analytics (in a real app, this might go to analytics service)
      await this.logChatAnalytics({
        sessionId,
        messageLength: input.message.length,
        responseLength: chatResult.response.length,
        processingTime: Date.now() - startTime,
        timestamp: input.timestamp
      });

      // Step 5: Return structured output
      return {
        success: true,
        response: chatResult.response,
        sessionId: chatResult.sessionId,
        processingTime: Date.now() - startTime,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('ChatWorkflow Error:', error);
      
      return {
        success: false,
        response: 'I apologize, but I encountered an error processing your request. Please try again.',
        sessionId: input.sessionId,
        processingTime: Date.now() - startTime,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Batch processing workflow for handling multiple messages
   */
  async runBatch(inputs: ChatWorkflowInput[]): Promise<ChatWorkflowOutput[]> {
    const results: ChatWorkflowOutput[] = [];
    
    // Process messages in parallel for better performance
    const promises = inputs.map(input => this.run(input));
    const batchResults = await Promise.allSettled(promises);
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          success: false,
          response: 'Failed to process message',
          sessionId: inputs[index].sessionId,
          processingTime: 0,
          timestamp: Date.now(),
          error: result.reason?.message || 'Unknown error'
        });
      }
    });

    return results;
  }

  /**
   * Analytics and logging workflow step
   */
  private async logChatAnalytics(data: {
    sessionId: string;
    messageLength: number;
    responseLength: number;
    processingTime: number;
    timestamp: number;
  }): Promise<void> {
    // In a real application, this would send data to analytics services
    // For this demo, we'll just log it
    console.log('Chat Analytics:', {
      ...data,
      type: 'chat_interaction',
      environment: 'cloudflare-workers-ai'
    });

    // You could also store this in a Durable Object or send to external analytics
    // Example: await this.env.ANALYTICS_OBJECT.fetch(new Request('...', { method: 'POST', body: JSON.stringify(data) }));
  }

  /**
   * Session cleanup workflow
   */
  async cleanupInactiveSessions(maxAgeHours: number = 24): Promise<number> {
    const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
    let cleanedSessions = 0;

    try {
      // In a real implementation, you would iterate through all sessions
      // and clean up inactive ones. For this demo, we'll simulate the process
      
      console.log(`Starting cleanup of sessions older than ${maxAgeHours} hours`);
      
      // This is a simplified version - in production you'd need to:
      // 1. List all session IDs from storage
      // 2. Check each session's last activity
      // 3. Clean up inactive sessions
      
      return cleanedSessions;
      
    } catch (error) {
      console.error('Session cleanup error:', error);
      return cleanedSessions;
    }
  }
}

/**
 * Workflow execution helper function
 * This demonstrates how to use the workflow in a Worker
 */
export async function executeChatWorkflow(
  env: { CHAT_SESSIONS: DurableObjectNamespace; AI: any },
  input: ChatWorkflowInput
): Promise<ChatWorkflowOutput> {
  const workflow = new ChatWorkflow(env);
  return await workflow.run(input);
}
