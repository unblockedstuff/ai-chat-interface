// Configuration and Constants
const CONFIG = {
    CLIENT_ID: '50142104463-j01s178vds6sji6je554t5g9bkcg90gg.apps.googleusercontent.com',
    API_KEY: 'AIzaSyD_s5JtC90cjyC5YXq7vYGBebB-wpSJ0Xs',
    SPREADSHEET_ID: '1zpR2MrdrKGRRGG2X0ed9mGfqmZ7oKtmvel1DjBX3GG8',
    RANGES: {
        INPUT: 'Sheet1!A1',
        OUTPUT: 'Sheet1!D1',
        TEXTOUTPUT: 'Sheet1!B1',
        USER_ID: 'Sheet1!C1',
        RESPONSE_USER_ID: 'Sheet1!E1'
    },
    POLL_INTERVAL: 2000,
    STATUS_DISPLAY_TIME: 5000,
    TOKEN_BUFFER_TIME: 300000 // 5 minutes
};

// Global State
const AppState = {
    isAuthenticated: false,
    isWaitingForResponse: false,
    lastResponseValue: '',
    pollInterval: null,
    accessToken: null,
    userId: null,
    tokenClient: null,
    chatHistory: []
};

// DOM Elements - will be initialized when DOM is ready
let DOM = {};

// Initialize DOM references
function initializeDOMReferences() {
    DOM = {
        chatMessages: document.getElementById('chatMessages'),
        messageInput: document.getElementById('messageInput'),
        sendButton: document.getElementById('sendButton'),
        statusDiv: document.getElementById('status'),
        themeIcon: document.getElementById('theme-icon'),
        themeToggle: document.querySelector('.theme-toggle')
    };
}
