// Authentication and Token Management - Redirect Method

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

// URL Parameters Helper
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

function getHashParameter(name) {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    return params.get(name);
}

function clearUrlParameters() {
    // Clear URL parameters without page reload
    const url = new URL(window.location);
    url.search = '';
    url.hash = '';
    window.history.replaceState({}, document.title, url.pathname);
}

// Generate OAuth URL
function generateAuthUrl() {
    const params = new URLSearchParams({
        client_id: CONFIG.CLIENT_ID,
        redirect_uri: window.location.origin + window.location.pathname,
        response_type: 'token',
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        include_granted_scopes: 'true',
        state: generateUserId() // Use this as the user ID
    });
    
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// Handle OAuth Redirect Response
function handleOAuthRedirect() {
    // Check for authorization code or access token in URL
    const accessToken = getHashParameter('access_token');
    const error = getHashParameter('error');
    const state = getHashParameter('state');
    const expiresIn = getHashParameter('expires_in');
    
    if (error) {
        console.error('OAuth error:', error);
        updateStatus('Authentication failed: ' + error, 'error');
        showRetryButton();
        clearUrlParameters();
        return false;
    }
    
    if (accessToken) {
        console.log('Access token received from redirect');
        
        // Create token response object similar to popup method
        const tokenResponse = {
            access_token: accessToken,
            expires_in: parseInt(expiresIn) || 3600
        };
        
        // Use state as user ID if available, otherwise generate new one
        AppState.userId = state || generateUserId();
        
        handleTokenResponse(tokenResponse);
        clearUrlParameters();
        return true;
    }
    
    return false;
}

// Token Refresh Function - Redirect Method
async function refreshToken() {
    try {
        console.log('Attempting to refresh token via redirect...');
        updateStatus('Refreshing authentication...', 'connecting');
        
        // For redirect method, we need to redirect to get a new token
        const authUrl = generateAuthUrl();
        window.location.href = authUrl;
        
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
        
        // Initialize GAPI client first - this must happen before everything else
        console.log('Loading GAPI client...');
        await new Promise((resolve, reject) => {
            if (typeof gapi === 'undefined') {
                reject(new Error('Google API library not loaded'));
                return;
            }
            gapi.load('client', {
                callback: resolve,
                onerror: () => reject(new Error('Failed to load GAPI client'))
            });
        });

        console.log('Initializing GAPI client...');
        await gapi.client.init({
            apiKey: CONFIG.API_KEY,
            discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
        });

        console.log('GAPI initialized successfully');

        // Now check if we're returning from OAuth redirect
        const redirectHandled = handleOAuthRedirect();
        if (redirectHandled) {
            return; // handleTokenResponse will be called from handleOAuthRedirect
        }

        // Check for saved authentication
        const savedAuth = loadTokenData();
        if (savedAuth) {
            console.log('Found saved authentication, attempting to use it...');
            AppState.accessToken = savedAuth.accessToken;
            AppState.userId = savedAuth.userId;
            
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

        // If no valid saved auth, start redirect flow
        updateStatus('Please authorize access to Google Sheets...', 'connecting');
        startRedirectAuth();
        
    } catch (error) {
        console.error('Failed to initialize Google API:', error);
        updateStatus(`Initialization error: ${error.message}`, 'error');
        showRetryButton();
    }
}

// Start Redirect Authentication
function startRedirectAuth() {
    console.log('Starting redirect authentication...');
    
    // Generate the OAuth URL and redirect
    const authUrl = generateAuthUrl();
    console.log('Redirecting to:', authUrl);
    
    // Add a small delay to show the status message
    setTimeout(() => {
        window.location.href = authUrl;
    }, 1000);
}

// Token Response Handler
async function handleTokenResponse(tokenResponse) {
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
    
    try {
        console.log('Setting access token...');
        AppState.accessToken = tokenResponse.access_token;
        
        if (!AppState.userId) {
            AppState.userId = generateUserId();
            console.log('Generated new user ID:', AppState.userId);
        }
        
        saveTokenData(tokenResponse, AppState.userId);
        
        console.log('Authentication successful!');
        AppState.isAuthenticated = true;
        updateStatus(`Connected! User ID: ${AppState.userId}`, 'connected');
        loadAndDisplayChatHistory();
        startResponsePolling();
        
        testConnection();
        
    } catch (error) {
        console.error('Error in handleTokenResponse:', error);
        updateStatus(`Authentication setup failed: ${error.message}`, 'error');
        showRetryButton();
    }
}

// Connection Test
async function testConnection() {
    try {
        console.log('Testing connection to spreadsheet...');
        
        // Use gapi.client.request with manual Authorization header
        const result = await gapi.client.request({
            path: `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/Sheet1!A1:E1`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${AppState.accessToken}`
            }
        });
        
        console.log('Connection test successful:', result);
        return true;
    } catch (error) {
        console.error('Connection test failed:', error);
        
        if (error.status === 401 || error.status === 403) {
            console.log('Auth error during connection test, attempting token refresh...');
            await refreshToken();
            return false;
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
