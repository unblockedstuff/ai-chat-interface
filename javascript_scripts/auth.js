// Authentication and Token Management

// Utility Functions
function generateUserId() {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    return `user_${timestamp}_${randomPart}`;
}

// Token Storage Functions
function saveTokenData(tokenData, userId) {
    const expiryTime = Date.now() + (tokenData.expires_in * 1000);
    const authData = {
        accessToken: tokenData.access_token,
        userId: userId,
        expiryTime: expiryTime
    };
    localStorage.setItem('googleAuthData', JSON.stringify(authData));
}

function loadTokenData() {
    try {
        const savedData = localStorage.getItem('googleAuthData');
        if (!savedData) return null;
        
        const authData = JSON.parse(savedData);
        
        // Check if token is expired (with buffer)
        if (Date.now() >= (authData.expiryTime - CONFIG.TOKEN_BUFFER_TIME)) {
            localStorage.removeItem('googleAuthData');
            return null;
        }
        
        return authData;
    } catch (error) {
        console.error('Error loading token data:', error);
        localStorage.removeItem('googleAuthData');
        return null;
    }
}

function clearTokenData() {
    localStorage.removeItem('googleAuthData');
    AppState.accessToken = null;
    AppState.userId = null;
    AppState.isAuthenticated = false;
}

// Token Refresh Function
async function refreshToken() {
    try {
        console.log('Attempting to refresh token...');
        if (AppState.tokenClient) {
            AppState.tokenClient.requestAccessToken({ 
                prompt: '',
                hint: 'select_account'
            });
        } else {
            throw new Error('Token client not available');
        }
    } catch (error) {
        console.error('Token refresh failed:', error);
        clearTokenData();
        updateStatus('Session expired - please sign in again', 'error');
        showRetryButton();
    }
}

// Google API Initialization
async function initializeGoogleAPI() {
    try {
        updateStatus('Connecting to Google Sheets...', 'connecting');
        
        // Initialize GAPI client first
        await new Promise(resolve => gapi.load('client', resolve));
        await gapi.client.init({
            apiKey: CONFIG.API_KEY,
            discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
        });

        console.log('GAPI initialized successfully');

        // Check for saved authentication first
        const savedAuth = loadTokenData();
        if (savedAuth) {
            console.log('Found saved authentication, attempting to use it...');
            AppState.accessToken = savedAuth.accessToken;
            AppState.userId = savedAuth.userId;
            
            gapi.client.setToken({
                access_token: AppState.accessToken
            });
            
            const isValid = await testConnection();
            if (isValid) {
                AppState.isAuthenticated = true;
                updateStatus(`Connected! User ID: ${AppState.userId}`, 'connected');
                loadAndDisplayChatHistory();
                startResponsePolling();
                return;
            } else {
                console.log('Saved token is invalid, proceeding with new authentication...');
                clearTokenData();
            }
        }

        // Initialize Google Identity Services
        updateStatus('Please authorize access to Google Sheets...', 'connecting');
        
        AppState.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CONFIG.CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/spreadsheets',
            callback: handleTokenResponse,
        });

        AppState.tokenClient.requestAccessToken({ 
            prompt: 'consent',
            hint: 'select_account'
        });
        
    } catch (error) {
        console.error('Failed to initialize Google API:', error);
        updateStatus(`Initialization error: ${error.message}`, 'error');
        showRetryButton();
    }
}

// Token Response Handler
function handleTokenResponse(tokenResponse) {
    console.log('Token response received:', tokenResponse);
    
    if (tokenResponse.error) {
        console.error('Token error:', tokenResponse.error);
        updateStatus('Authentication failed: ' + tokenResponse.error, 'error');
        showRetryButton();
        return;
    }
    
    if (!tokenResponse.access_token) {
        console.error('No access token in response');
        updateStatus('No access token received', 'error');
        showRetryButton();
        return;
    }
    
    console.log('Setting access token...');
    AppState.accessToken = tokenResponse.access_token;
    
    if (!AppState.userId) {
        AppState.userId = generateUserId();
        console.log('Generated new user ID:', AppState.userId);
    }
    
    saveTokenData(tokenResponse, AppState.userId);
    
    gapi.client.setToken({
        access_token: AppState.accessToken
    });
    
    console.log('Authentication successful!');
    AppState.isAuthenticated = true;
    updateStatus(`Connected! User ID: ${AppState.userId}`, 'connected');
    loadAndDisplayChatHistory();
    startResponsePolling();
    
    testConnection();
}

// Connection Test
async function testConnection() {
    try {
        console.log('Testing connection to spreadsheet...');
        const result = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: CONFIG.SPREADSHEET_ID,
            range: 'Sheet1!A1:E1'
        });
        console.log('Connection test successful:', result);
        return true;
    } catch (error) {
        console.error('Connection test failed:', error);
        
        if (error.status === 401 || error.status === 403) {
            console.log('Auth error during connection test, attempting token refresh...');
            if (AppState.tokenClient) {
                await refreshToken();
                return false;
            }
        }
        
        updateStatus(`Connection test failed: ${error.message}`, 'error');
        clearTokenData();
        return false;
    }
}

// UI Helper Functions
function showRetryButton() {
    const existingBtn = document.getElementById('retry-btn');
    if (existingBtn) existingBtn.remove();
    
    const retryBtn = document.createElement('button');
    retryBtn.id = 'retry-btn';
    retryBtn.textContent = 'Retry Authentication';
    retryBtn.className = 'theme-toggle';
    retryBtn.style.margin = '10px auto';
    retryBtn.style.display = 'block';
    retryBtn.onclick = () => {
        retryBtn.remove();
        clearTokenData();
        initializeGoogleAPI();
    };
    DOM.statusDiv.after(retryBtn);
}

function updateStatus(message, type) {
    DOM.statusDiv.textContent = message;
    DOM.statusDiv.className = `status-indicator ${type}`;
    
    if (type === 'connected') {
        setTimeout(() => {
            DOM.statusDiv.style.display = 'none';
        }, CONFIG.STATUS_DISPLAY_TIME);
    }
}

// Logout Functions
function logout() {
    clearTokenData();
    clearInterval(AppState.pollInterval);
    
    DOM.chatMessages.innerHTML = '';
    
    updateStatus('Logged out successfully', 'connecting');
    
    setTimeout(() => {
        initializeGoogleAPI();
    }, 1000);
}

function addLogoutButton() {
    const existingBtn = document.getElementById('logout-btn');
    if (existingBtn) return;
    
    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logout-btn';
    logoutBtn.textContent = 'Logout';
    logoutBtn.className = 'theme-toggle';
    logoutBtn.style.margin = '10px';
    logoutBtn.onclick = logout;
    
    document.querySelector('header')?.appendChild(logoutBtn);
}