// Message Sending and Response Polling

// Message Sending Function
async function sendMessage() {
    const message = DOM.messageInput.value.trim();
    if (!message || !AppState.isAuthenticated || AppState.isWaitingForResponse || !AppState.userId) return;

    addMessage(message, 'user');
    DOM.messageInput.value = '';
    adjustTextareaHeight();
    
    DOM.sendButton.disabled = true;
    AppState.isWaitingForResponse = true;
    
    showTypingIndicator();

    try {
        // Ensure we have a valid token
        if (!AppState.accessToken) {
            throw new Error('No access token available');
        }

        // Send both the message and user ID simultaneously using batch update
        const requests = [
            {
                range: CONFIG.RANGES.INPUT,
                values: [[message]]
            },
            {
                range: CONFIG.RANGES.USER_ID,
                values: [[AppState.userId]]
            }
        ];

        const response = await gapi.client.sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: CONFIG.SPREADSHEET_ID,
            resource: {
                valueInputOption: 'USER_ENTERED',
                data: requests
            }
        });

        console.log('Message and user ID sent successfully:', response);

    } catch (error) {
        console.error('Failed to send message:', error);
        hideTypingIndicator();
        
        if (error.status === 401 || error.status === 403) {
            console.log('Auth error during message send, attempting token refresh...');
            if (AppState.tokenClient) {
                await refreshToken();
                // Don't show error message immediately, let refresh attempt complete
                setTimeout(() => {
                    if (!AppState.isAuthenticated) {
                        addMessage('Authentication expired. Please refresh the page and sign in again.', 'ai');
                        updateStatus('Authentication expired - please refresh', 'error');
                    }
                }, 2000);
            } else {
                addMessage('Authentication expired. Please refresh the page and sign in again.', 'ai');
                updateStatus('Authentication expired - please refresh', 'error');
                clearTokenData();
            }
        } else {
            addMessage(`Error: ${error.message || 'Failed to send message. Please try again.'}`, 'ai');
        }
        
        DOM.sendButton.disabled = false;
        AppState.isWaitingForResponse = false;
    }
}

// Response Polling Functions
function startResponsePolling() {
    AppState.pollInterval = setInterval(checkForResponse, CONFIG.POLL_INTERVAL);
}

async function checkForResponse() {
    if (!AppState.isWaitingForResponse || !AppState.isAuthenticated || !AppState.accessToken) return;

    try {
        // Get the response text from B1, status from D1, and response user ID from E1
        const result = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: CONFIG.SPREADSHEET_ID,
            range: 'Sheet1!B1:E1'
        });

        const values = result.result.values;
        if (!values || !values[0]) return;

        // B1 = actual response text, D1 = status/trigger, E1 = response user ID
        const responseText = values[0][0] ? values[0][0].trim() : '';  // B1
        const statusValue = values[0][2] ? values[0][2].trim() : '';   // D1
        const responseUserId = values[0][3] ? values[0][3].trim() : ''; // E1
        
        console.log('Checking response:', {
            responseText,
            statusValue,
            responseUserId,
            currentUserId: AppState.userId,
            lastResponseValue: AppState.lastResponseValue
        });
        
        // Check if we have a new response AND it's for the current user
        // Use the status value (D1) to detect changes, but display the response text (B1)
        if (statusValue && 
            statusValue !== AppState.lastResponseValue && 
            responseUserId === AppState.userId &&
            responseText) {
            
            console.log('New response received for current user!');
            AppState.lastResponseValue = statusValue; // Track the status change
            hideTypingIndicator();
            addMessage(responseText, 'ai'); // Display the actual response text
            
            DOM.sendButton.disabled = false;
            AppState.isWaitingForResponse = false;
        } else if (statusValue && statusValue !== AppState.lastResponseValue) {
            // Response exists but not for this user - log for debugging
            console.log('Response found but not for current user:', {
                responseUserId,
                currentUserId: AppState.userId
            });
        }
    } catch (error) {
        console.error('Failed to check for response:', error);
        if (error.status === 401 || error.status === 403) {
            console.log('Authentication expired during polling, attempting refresh...');
            if (AppState.tokenClient) {
                await refreshToken();
            } else {
                clearInterval(AppState.pollInterval);
                clearTokenData();
                updateStatus('Authentication expired - please refresh', 'error');
                hideTypingIndicator();
                DOM.sendButton.disabled = false;
                AppState.isWaitingForResponse = false;
            }
        }
    }
}

// Main Initialization Function
function initializeApp() {
    console.log('Page loaded, initializing...');
    
    // Initialize DOM references
    initializeDOMReferences();
    
    // Initialize theme
    initializeTheme();
    
    // Initialize input handlers
    initializeInputHandlers();
    
    // Add debug info
    console.log('Client ID:', CONFIG.CLIENT_ID);
    console.log('Spreadsheet ID:', CONFIG.SPREADSHEET_ID);
    
    // Check if required libraries are loaded
    if (typeof google === 'undefined') {
        console.error('Google Identity Services not loaded');
        updateStatus('Failed to load Google services', 'error');
        return;
    }
    
    if (typeof gapi === 'undefined') {
        console.error('Google API client not loaded');
        updateStatus('Failed to load Google API client', 'error');
        return;
    }
    
    console.log('All libraries loaded, starting initialization...');
    setTimeout(initializeGoogleAPI, 1000);
    
    // Add logout and clear chat buttons if authenticated
    setTimeout(() => {
        if (AppState.isAuthenticated) {
            addLogoutButton();
            addClearChatButton();
        }
    }, 2000);
}

// Event Listeners
window.addEventListener('load', initializeApp);

// Cleanup
window.addEventListener('beforeunload', () => {
    if (AppState.pollInterval) {
        clearInterval(AppState.pollInterval);
    }
});
