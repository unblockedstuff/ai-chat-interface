// Chat Management and UI

// Chat History Storage Functions
function saveChatHistory() {
    try {
        localStorage.setItem('chatHistory', JSON.stringify(AppState.chatHistory));
    } catch (error) {
        console.error('Error saving chat history:', error);
    }
}

function loadChatHistory() {
    try {
        const savedHistory = localStorage.getItem('chatHistory');
        if (savedHistory) {
            AppState.chatHistory = JSON.parse(savedHistory);
            return AppState.chatHistory;
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
        localStorage.removeItem('chatHistory');
    }
    return [];
}

function clearChatHistory() {
    AppState.chatHistory = [];
    localStorage.removeItem('chatHistory');
    DOM.chatMessages.innerHTML = '';
}

function addToChatHistory(content, sender, timestamp = Date.now()) {
    const message = {
        content: content,
        sender: sender,
        timestamp: timestamp,
        id: `msg_${timestamp}_${Math.random().toString(36).substr(2, 9)}`
    };
    AppState.chatHistory.push(message);
    saveChatHistory();
    return message;
}

// Markdown Parsing Function
function parseMarkdown(text) {
    return text
        // Headers
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic (but not if it's a bullet point)
        .replace(/(?<!^|\n)\*(.*?)\*/g, '<em>$1</em>')
        // Code blocks (triple backticks)
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        // Inline code
        .replace(/`(.*?)`/g, '<code>$1</code>')
        // Blockquotes
        .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
        // Numbered lists (1., 2., etc.)
        .replace(/^(\d+\.\s+.*$)/gm, '<li>$1</li>')
        // Letter lists (a., b., etc.)
        .replace(/^([a-z]\.\s+.*$)/gim, '<li>$1</li>')
        // Bullet points (* or -)
        .replace(/^([*\-]\s+.*$)/gm, '<li>$1</li>')
        // Wrap consecutive list items in proper list tags
        .replace(/(<li>.*<\/li>)/gs, function(match) {
            const items = match.split('</li>').filter(item => item.trim());
            let result = '';
            let currentListType = null;
            
            items.forEach((item, index) => {
                if (!item.trim()) return;
                
                const cleanItem = item.replace('<li>', '').trim();
                let listType = 'ul';
                let content = cleanItem;
                
                // Determine list type and clean content
                if (/^\d+\.\s+/.test(cleanItem)) {
                    listType = 'ol';
                    content = cleanItem.replace(/^\d+\.\s+/, '');
                } else if (/^[a-z]\.\s+/i.test(cleanItem)) {
                    listType = 'ol';
                    content = cleanItem.replace(/^[a-z]\.\s+/i, '');
                } else if (/^[*\-]\s+/.test(cleanItem)) {
                    listType = 'ul';
                    content = cleanItem.replace(/^[*\-]\s+/, '');
                }
                
                // Start new list if type changed
                if (currentListType !== listType) {
                    if (currentListType) result += `</${currentListType}>`;
                    result += `<${listType}>`;
                    currentListType = listType;
                }
                
                result += `<li>${content}</li>`;
                
                // Close list if it's the last item
                if (index === items.length - 1) {
                    result += `</${currentListType}>`;
                }
            });
            
            return result;
        })
       // Line breaks
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        // Wrap in paragraphs (but not lists, headers, etc.)
        .replace(/^(?!<[h1-6]|<blockquote|<pre|<ul|<ol)(.+)/gm, '<p>$1</p>')
        // Clean up empty paragraphs and wrapped elements
        .replace(/<p><\/p>/g, '')
        .replace(/<p>(<[^>]+>.*?<\/[^>]+>)<\/p>/g, '$1')
        .replace(/<br><\/p>/g, '</p>')
        .replace(/<p><br>/g, '<p>');
}

// Message Display Functions
function addMessage(content, sender, skipSave = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = sender === 'user' ? 'U' : 'AI';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    // Parse markdown for AI messages, plain text for user messages
    if (sender === 'ai') {
        messageContent.innerHTML = parseMarkdown(content);
    } else {
        messageContent.textContent = content;
    }
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    
    DOM.chatMessages.appendChild(messageDiv);
    DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
    
    // Save to chat history unless we're loading from saved history
    if (!skipSave) {
        addToChatHistory(content, sender);
    }
}

function loadAndDisplayChatHistory() {
    const savedHistory = loadChatHistory();
    DOM.chatMessages.innerHTML = '';
    
    savedHistory.forEach(message => {
        addMessage(message.content, message.sender, true);
    });
    
    console.log(`Loaded ${savedHistory.length} messages from chat history`);
}

// Typing Indicator Functions
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai';
    typingDiv.id = 'typing-indicator';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = 'AI';
    
    const content = document.createElement('div');
    content.className = 'message-content typing-indicator';
    content.innerHTML = `
        <span>AI is thinking</span>
        <div class="typing-dots">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
    
    typingDiv.appendChild(avatar);
    typingDiv.appendChild(content);
    
    DOM.chatMessages.appendChild(typingDiv);
    DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
}

function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Input Handling
function adjustTextareaHeight() {
    DOM.messageInput.style.height = 'auto';
    DOM.messageInput.style.height = Math.min(DOM.messageInput.scrollHeight, 120) + 'px';
}

// Theme Management
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    
    if (DOM.themeIcon && DOM.themeToggle) {
        if (newTheme === 'dark') {
            DOM.themeIcon.textContent = '☀️';
            DOM.themeToggle.childNodes[1].textContent = ' Light Mode';
        } else {
            DOM.themeIcon.textContent = '🌙';
            DOM.themeToggle.childNodes[1].textContent = ' Dark Mode';
        }
    }
    
    localStorage.setItem('theme', newTheme);
}

// Load saved theme
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        toggleTheme();
    }
}

// Clear Chat Function
function clearChat() {
    clearChatHistory();
    updateStatus('Chat history cleared', 'connecting');
    setTimeout(() => {
        if (AppState.isAuthenticated) {
            updateStatus(`Connected! User ID: ${AppState.userId}`, 'connected');
        }
    }, 2000);
}

function addClearChatButton() {
    const existingBtn = document.getElementById('clear-chat-btn');
    if (existingBtn) return;
    
    const clearBtn = document.createElement('button');
    clearBtn.id = 'clear-chat-btn';
    clearBtn.textContent = 'Clear Chat';
    clearBtn.className = 'theme-toggle';
    clearBtn.style.margin = '10px';
    clearBtn.onclick = () => {
        if (confirm('Are you sure you want to clear all chat history? This cannot be undone.')) {
            clearChat();
        }
    };
    
    document.querySelector('header')?.appendChild(clearBtn);
}

// Initialize Input Event Listeners
function initializeInputHandlers() {
    DOM.messageInput.addEventListener('input', adjustTextareaHeight);
    DOM.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}