// Global state
let sessionId = null;
let isRecording = false;
let recognition = null;
let messageHistory = [];
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
  setupEventListeners();
  setupSpeechRecognition();
  updateWelcomeTimestamp();
});

function initializeApp() {
  // Generate a unique session ID
  sessionId = 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  
  // Update session display
  document.getElementById('sessionId').textContent = sessionId.substr(0, 15) + '...';
  
  // Initialize session with backend
  initializeSession();
  
  // Set up auto-save for message history
  loadMessageHistory();
}

function setupEventListeners() {
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.querySelector('.send-btn');
  
  // Input field events
  messageInput.addEventListener('keydown', handleKeyDown);
  messageInput.addEventListener('input', handleInputChange);
  messageInput.addEventListener('paste', handlePaste);
  
  // Send button
  sendBtn.addEventListener('click', sendMessage);
  
  // Connection status monitoring
  window.addEventListener('online', updateConnectionStatus);
  window.addEventListener('offline', updateConnectionStatus);
  
  // Auto-save message history
  setInterval(saveMessageHistory, 30000); // Every 30 seconds
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', cleanup);
}

function setupSpeechRecognition() {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
    
    recognition.onstart = function() {
      console.log('Speech recognition started');
      isRecording = true;
      updateVoiceButton();
      showVoiceModal();
    };
    
    recognition.onresult = function(event) {
      const transcript = event.results[0][0].transcript;
      console.log('Speech recognition result:', transcript);
      
      document.getElementById('messageInput').value = transcript;
      hideVoiceModal();
      sendMessage();
    };
    
    recognition.onerror = function(event) {
      console.error('Speech recognition error:', event.error);
      hideVoiceModal();
      showNotification('Voice recognition error: ' + event.error, 'error');
    };
    
    recognition.onend = function() {
      console.log('Speech recognition ended');
      isRecording = false;
      updateVoiceButton();
      hideVoiceModal();
    };
  } else {
    console.warn('Speech recognition not supported');
    document.getElementById('voiceBtn').style.display = 'none';
  }
}

// Message handling
async function sendMessage() {
  const messageInput = document.getElementById('messageInput');
  const message = messageInput.value.trim();
  
  if (!message) return;
  
  // Disable input while processing
  messageInput.disabled = true;
  document.querySelector('.send-btn').disabled = true;
  
  try {
    // Add user message to chat
    addMessageToChat('user', message);
    messageInput.value = '';
    adjustTextareaHeight(messageInput);
    
    // Show typing indicator
    showTypingIndicator();
    
    // Send to backend
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        sessionId: sessionId
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Hide typing indicator
    hideTypingIndicator();
    
    // Add AI response to chat
    addMessageToChat('ai', data.response);
    
    // Update connection status
    updateConnectionStatus();
    
    // Save to history
    messageHistory.push({
      role: 'user',
      content: message,
      timestamp: Date.now()
    });
    messageHistory.push({
      role: 'ai',
      content: data.response,
      timestamp: Date.now()
    });
    
    saveMessageHistory();
    
  } catch (error) {
    console.error('Error sending message:', error);
    hideTypingIndicator();
    
    addMessageToChat('ai', 'I apologize, but I encountered an error processing your request. Please try again.');
    
    showNotification('Failed to send message. Please check your connection.', 'error');
    
    // Attempt to reconnect
    if (reconnectAttempts < maxReconnectAttempts) {
      setTimeout(() => {
        reconnectAttempts++;
        sendMessage();
      }, 2000);
    }
  } finally {
    // Re-enable input
    messageInput.disabled = false;
    document.querySelector('.send-btn').disabled = false;
    messageInput.focus();
  }
}

function addMessageToChat(role, content) {
  const chatMessages = document.getElementById('chatMessages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}-message`;
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.innerHTML = role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
  
  const messageContent = document.createElement('div');
  messageContent.className = 'message-content';
  
  const messageHeader = document.createElement('div');
  messageHeader.className = 'message-header';
  
  const senderName = document.createElement('span');
  senderName.className = 'sender-name';
  senderName.textContent = role === 'user' ? 'You' : 'AI Assistant';
  
  const timestamp = document.createElement('span');
  timestamp.className = 'timestamp';
  timestamp.textContent = formatTimestamp(Date.now());
  
  messageHeader.appendChild(senderName);
  messageHeader.appendChild(timestamp);
  
  const messageText = document.createElement('div');
  messageText.className = 'message-text';
  messageText.textContent = content;
  
  const messageActions = document.createElement('div');
  messageActions.className = 'message-actions';
  
  const copyBtn = document.createElement('button');
  copyBtn.className = 'action-btn';
  copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
  copyBtn.onclick = () => copyMessage(copyBtn, content);
  
  messageActions.appendChild(copyBtn);
  
  messageContent.appendChild(messageHeader);
  messageContent.appendChild(messageText);
  messageContent.appendChild(messageActions);
  
  messageDiv.appendChild(avatar);
  messageDiv.appendChild(messageContent);
  
  chatMessages.appendChild(messageDiv);
  
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  // Add animation
  messageDiv.style.opacity = '0';
  messageDiv.style.transform = 'translateY(20px)';
  setTimeout(() => {
    messageDiv.style.transition = 'all 0.3s ease-out';
    messageDiv.style.opacity = '1';
    messageDiv.style.transform = 'translateY(0)';
  }, 10);
}

function showTypingIndicator() {
  const typingIndicator = document.getElementById('typingIndicator');
  typingIndicator.style.display = 'flex';
  
  // Scroll to bottom
  const chatMessages = document.getElementById('chatMessages');
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTypingIndicator() {
  const typingIndicator = document.getElementById('typingIndicator');
  typingIndicator.style.display = 'none';
}

// Input handling
function handleKeyDown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

function handleInputChange(event) {
  adjustTextareaHeight(event.target);
}

function handlePaste(event) {
  // Handle paste events - could add special handling for images, files, etc.
  setTimeout(() => {
    adjustTextareaHeight(event.target);
  }, 0);
}

function adjustTextareaHeight(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

// Voice functionality
function toggleVoiceRecording() {
  if (!recognition) {
    showNotification('Voice recognition not supported in this browser', 'error');
    return;
  }
  
  if (isRecording) {
    recognition.stop();
  } else {
    recognition.start();
  }
}

function updateVoiceButton() {
  const voiceBtn = document.getElementById('voiceBtn');
  const icon = voiceBtn.querySelector('i');
  
  if (isRecording) {
    voiceBtn.classList.add('recording');
    icon.className = 'fas fa-stop';
    voiceBtn.title = 'Stop Recording';
  } else {
    voiceBtn.classList.remove('recording');
    icon.className = 'fas fa-microphone';
    voiceBtn.title = 'Voice Input';
  }
}

function showVoiceModal() {
  document.getElementById('voiceModal').style.display = 'flex';
}

function hideVoiceModal() {
  document.getElementById('voiceModal').style.display = 'none';
}

function stopVoiceRecording() {
  if (recognition && isRecording) {
    recognition.stop();
  }
}

// Chat history
function toggleHistory() {
  const sidebar = document.getElementById('historySidebar');
  sidebar.classList.toggle('open');
  
  if (sidebar.classList.contains('open')) {
    loadChatHistory();
  }
}

async function loadChatHistory() {
  const historyContent = document.getElementById('historyContent');
  historyContent.innerHTML = '<div class="history-loading"><i class="fas fa-spinner fa-spin"></i> Loading history...</div>';
  
  try {
    const response = await fetch(`/api/session/history?sessionId=${sessionId}`);
    if (response.ok) {
      const data = await response.json();
      displayChatHistory(data.messages);
    } else {
      historyContent.innerHTML = '<div class="history-loading">No history available</div>';
    }
  } catch (error) {
    console.error('Error loading chat history:', error);
    historyContent.innerHTML = '<div class="history-loading">Error loading history</div>';
  }
}

function displayChatHistory(messages) {
  const historyContent = document.getElementById('historyContent');
  
  if (!messages || messages.length === 0) {
    historyContent.innerHTML = '<div class="history-loading">No messages yet</div>';
    return;
  }
  
  const historyHTML = messages
    .filter(msg => msg.role !== 'system')
    .map(msg => `
      <div class="history-message">
        <div class="history-role">${msg.role === 'user' ? 'You' : 'AI'}</div>
        <div class="history-content">${msg.content}</div>
        <div class="history-timestamp">${formatTimestamp(msg.timestamp)}</div>
      </div>
    `).join('');
  
  historyContent.innerHTML = `
    <div class="history-messages">
      ${historyHTML}
    </div>
  `;
}

function clearChat() {
  if (confirm('Are you sure you want to clear the chat history?')) {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = `
      <div class="message ai-message">
        <div class="message-avatar">
          <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
          <div class="message-header">
            <span class="sender-name">AI Assistant</span>
            <span class="timestamp">${formatTimestamp(Date.now())}</span>
          </div>
          <div class="message-text">
            Chat history cleared. How can I help you today?
          </div>
          <div class="message-actions">
            <button class="action-btn" onclick="copyMessage(this)">
              <i class="fas fa-copy"></i>
            </button>
          </div>
        </div>
      </div>
    `;
    
    messageHistory = [];
    saveMessageHistory();
    
    // Clear backend history
    fetch('/api/session/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    }).catch(console.error);
    
    showNotification('Chat history cleared', 'success');
  }
}

// Utility functions
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) { // Less than 1 minute
    return 'Just now';
  } else if (diff < 3600000) { // Less than 1 hour
    return `${Math.floor(diff / 60000)}m ago`;
  } else if (diff < 86400000) { // Less than 1 day
    return `${Math.floor(diff / 3600000)}h ago`;
  } else {
    return date.toLocaleDateString();
  }
}

function updateWelcomeTimestamp() {
  const timestamp = document.getElementById('welcomeTimestamp');
  if (timestamp) {
    timestamp.textContent = formatTimestamp(Date.now());
  }
}

function copyMessage(button, content = null) {
  const messageText = content || button.closest('.message-content').querySelector('.message-text').textContent;
  
  navigator.clipboard.writeText(messageText).then(() => {
    showNotification('Message copied to clipboard', 'success');
  }).catch(() => {
    showNotification('Failed to copy message', 'error');
  });
}

function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  // Style the notification
  Object.assign(notification.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 20px',
    borderRadius: '8px',
    color: 'white',
    fontWeight: '500',
    zIndex: '3000',
    animation: 'slideInRight 0.3s ease-out'
  });
  
  // Set background color based on type
  const colors = {
    success: '#10b981',
    error: '#dc2626',
    info: '#3b82f6'
  };
  notification.style.background = colors[type] || colors.info;
  
  // Add to page
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease-in';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

function updateConnectionStatus() {
  const statusElement = document.getElementById('connectionStatus');
  const icon = statusElement.querySelector('i');
  const text = statusElement.querySelector('span');
  
  if (navigator.onLine) {
    icon.style.color = '#10b981';
    text.textContent = 'Connected';
    reconnectAttempts = 0;
  } else {
    icon.style.color = '#dc2626';
    text.textContent = 'Disconnected';
  }
}

// Session management
async function initializeSession() {
  try {
    const response = await fetch('/api/session/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
    
    if (response.ok) {
      console.log('Session initialized successfully');
    }
  } catch (error) {
    console.error('Failed to initialize session:', error);
  }
}

// Local storage for message history
function saveMessageHistory() {
  try {
    localStorage.setItem(`chat_history_${sessionId}`, JSON.stringify(messageHistory));
  } catch (error) {
    console.error('Failed to save message history:', error);
  }
}

function loadMessageHistory() {
  try {
    const saved = localStorage.getItem(`chat_history_${sessionId}`);
    if (saved) {
      messageHistory = JSON.parse(saved);
    }
  } catch (error) {
    console.error('Failed to load message history:', error);
    messageHistory = [];
  }
}

function cleanup() {
  if (recognition && isRecording) {
    recognition.stop();
  }
  saveMessageHistory();
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes slideOutRight {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(100%);
    }
  }
  
  .history-message {
    padding: 12px;
    border-bottom: 1px solid #e5e7eb;
    margin-bottom: 8px;
  }
  
  .history-role {
    font-weight: 600;
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 4px;
  }
  
  .history-content {
    font-size: 14px;
    line-height: 1.4;
    margin-bottom: 4px;
    word-wrap: break-word;
  }
  
  .history-timestamp {
    font-size: 11px;
    color: #9ca3af;
  }
`;
document.head.appendChild(style);
