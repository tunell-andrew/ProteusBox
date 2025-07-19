/**
 * Local Network Directory Hub
 * Express.js server providing REST API and static file serving
 */

const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { URL } = require('url');

// =============================================================================
// SERVER CONFIGURATION
// =============================================================================

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(bodyParser.json());
app.use(express.static('public'));

// =============================================================================
// AUTHENTICATION CONFIGURATION
// =============================================================================

// Default bcrypt hash for password "password"
const DEFAULT_ADMIN_PASSWORD_HASH = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
let ADMIN_PASSWORD_HASH = DEFAULT_ADMIN_PASSWORD_HASH;

/**
 * Initialize admin password from environment variable
 * Hashes plaintext password if ADMIN_PASSWORD env var is provided
 */
async function initializeAdminPassword() {
    const plainPassword = process.env.ADMIN_PASSWORD;
    
    if (plainPassword) {
        try {
            ADMIN_PASSWORD_HASH = await bcrypt.hash(plainPassword, 10);
            console.log('Admin password configured from environment variable');
        } catch (error) {
            console.error('Error hashing admin password:', error);
            console.log('Falling back to default password');
        }
    } else {
        console.log('Using default admin password: "password"');
    }
}

// =============================================================================
// DATA MANAGEMENT
// =============================================================================

const DATA_FILE = path.join(__dirname, 'data', 'data.json');

// Directory for markdown project files
const PROJECT_DIR = path.join(__dirname, 'data', 'projects');

function ensureProjectDir() {
    try {
        if (!fs.existsSync(PROJECT_DIR)) {
            fs.mkdirSync(PROJECT_DIR, { recursive: true });
        }
    } catch (error) {
        console.error('Error ensuring project directory:', error);
    }
}

// Ensure on startup
ensureProjectDir();

// Default data structure
let data = {
    links: [],
    categories: [],
    nextId: 1,
    nextCategoryId: 1,
    homepageMessage: 'Welcome to your local network hub',
    siteTitle: 'Local Network Hub',
    chatConfig: {
        provider: 'flowise', // default provider
        apiUrl: '',
        chatflowId: '',
        ollamaBaseUrl: '',
        ollamaModel: ''
    },
    filterConfig: { 
        enabled: false, 
        keyword: '</think>' 
    },
    colorConfig: {
        primaryColor: '#330099'
    }
};

/**
 * Ensure default NAVIGATION category exists
 */
function ensureNavigationCategory() {
    // Check if NAVIGATION category already exists
    const navigationExists = data.categories.some(cat => cat.name === 'NAVIGATION' && cat.isDefault);
    
    if (!navigationExists) {
        // Create default NAVIGATION category
        const navigationCategory = {
            id: -1, // Use negative ID to distinguish from user categories
            name: 'NAVIGATION',
            private: false,
            order: -1, // Ensure it appears first
            isDefault: true, // Mark as default category
            createdAt: new Date().toISOString()
        };
        
        // Add to beginning of categories array
        data.categories.unshift(navigationCategory);
        
        // Update nextCategoryId to avoid conflicts
        if (data.nextCategoryId <= 0) {
            data.nextCategoryId = 1;
        }
        
        console.log('Created default NAVIGATION category');
    }
}

/**
 * Load data from JSON file with proper error handling
 */
function loadData() {
    try {
        const dataDir = path.dirname(DATA_FILE);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        if (fs.existsSync(DATA_FILE)) {
            const fileContent = fs.readFileSync(DATA_FILE, 'utf8');
            const loadedData = JSON.parse(fileContent);

            // Merge top-level fields
            data = { ...data, ...loadedData };

            // Deep-merge nested config objects to preserve new keys added in future versions
            if (loadedData.chatConfig) {
                data.chatConfig = { ...data.chatConfig, ...loadedData.chatConfig };
            }
            if (loadedData.filterConfig) {
                data.filterConfig = { ...data.filterConfig, ...loadedData.filterConfig };
            }
            if (loadedData.colorConfig) {
                data.colorConfig = { ...data.colorConfig, ...loadedData.colorConfig };
            }
        }
        
        // Ensure default NAVIGATION category exists
        ensureNavigationCategory();
        
        console.log('Data loaded successfully');
    } catch (error) {
        console.error('Error loading data:', error);
        console.log('Using default data structure');
    }
}

/**
 * Save data to JSON file with proper error handling
 */
function saveData() {
    try {
        const dataDir = path.dirname(DATA_FILE);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create HTTP/HTTPS request options from URL
 * @param {string} url - URL to parse
 * @param {string} method - HTTP method (GET, HEAD, POST, etc.)
 * @param {Object} additionalHeaders - Additional headers to include
 * @returns {Object} - Request options object
 */
function createHttpOptions(url, method = 'GET', additionalHeaders = {}) {
    const parsedUrl = new URL(url);
    return {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method,
        headers: {
            'User-Agent': 'LocalNetworkHub/1.0',
            ...additionalHeaders
        }
    };
}

/**
 * Make HTTP/HTTPS request with timeout and error handling
 * @param {string} url - URL to request
 * @param {Object} options - Request options
 * @param {number} timeout - Request timeout in milliseconds
 * @returns {Promise} - Promise that resolves with response or rejects with error
 */
function makeHttpRequest(url, options = {}, timeout = 5000) {
    return new Promise((resolve, reject) => {
        try {
            const parsedUrl = new URL(url);
            const client = parsedUrl.protocol === 'https:' ? https : http;
            
            const requestOptions = {
                ...createHttpOptions(url, options.method, options.headers),
                timeout
            };
            
            const req = client.request(requestOptions, (res) => {
                resolve(res);
            });
            
            req.on('error', (error) => {
                reject(error);
            });
            
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            
            req.setTimeout(timeout);
            req.end();
            
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Check website status via HTTP/HTTPS HEAD request
 * @param {string} url - URL to check
 * @returns {Promise<boolean>} - True if site is accessible
 */
async function checkWebsiteStatus(url) {
    try {
        const response = await makeHttpRequest(url, { method: 'HEAD' }, 5000);
        return response.statusCode >= 200 && response.statusCode < 400;
    } catch (error) {
        return false;
    }
}

/**
 * Validate required fields in request body
 * @param {Object} body - Request body object
 * @param {Array} requiredFields - Array of required field names
 * @returns {Object} - Validation result with success flag and error message
 */
function validateRequiredFields(body, requiredFields) {
    const missingFields = requiredFields.filter(field => !body[field] || !body[field].toString().trim());
    
    if (missingFields.length > 0) {
        return {
            success: false,
            error: `Missing required fields: ${missingFields.join(', ')}`
        };
    }
    
    return { success: true };
}

/**
 * Create standardized API response
 * @param {boolean} success - Success flag
 * @param {Object} data - Response data
 * @param {string} error - Error message (if any)
 * @returns {Object} - Standardized response object
 */
function createApiResponse(success, data = null, error = null) {
    const response = { success };
    
    if (success && data) {
        Object.assign(response, data);
    }
    
    if (!success && error) {
        response.error = error;
    }
    
    return response;
}

/**
 * Handle API errors consistently
 * @param {Object} res - Express response object
 * @param {Error} error - Error object
 * @param {string} operation - Operation being performed
 * @param {number} statusCode - HTTP status code
 */
function handleApiError(res, error, operation, statusCode = 500) {
    console.error(`${operation} error:`, error);
    res.status(statusCode).json(createApiResponse(false, null, `Server error during ${operation}`));
}

// =============================================================================
// API ROUTES - AUTHENTICATION
// =============================================================================

/**
 * Admin login endpoint
 */
app.post('/api/admin/login', async (req, res) => {
    const validation = validateRequiredFields(req.body, ['password']);
    if (!validation.success) {
        return res.status(400).json(createApiResponse(false, null, validation.error));
    }
    
    try {
        const isValid = await bcrypt.compare(req.body.password, ADMIN_PASSWORD_HASH);
        res.json(createApiResponse(isValid));
    } catch (error) {
        handleApiError(res, error, 'login');
    }
});

// =============================================================================
// API ROUTES - LINKS MANAGEMENT
// =============================================================================

/**
 * Get all links
 */
app.get('/api/links', (req, res) => {
    res.json(createApiResponse(true, { links: data.links }));
});

/**
 * Create new link
 */
app.post('/api/links', (req, res) => {
    const validation = validateRequiredFields(req.body, ['name', 'url']);
    if (!validation.success) {
        return res.status(400).json(createApiResponse(false, null, validation.error));
    }
    
    const { name, url, categoryId } = req.body;
    
    const newLink = {
        id: data.nextId++,
        name: name.trim(),
        url: url.trim(),
        categoryId: categoryId ? parseInt(categoryId) : null,
        createdAt: new Date().toISOString()
    };
    
    data.links.push(newLink);
    saveData();
    
    res.json(createApiResponse(true, { link: newLink }));
});

/**
 * Delete link by ID
 */
/**
 * Update link by ID
 */
app.put('/api/links/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const validation = validateRequiredFields(req.body, ['name', 'url']);
    if (!validation.success) {
        return res.status(400).json(createApiResponse(false, null, validation.error));
    }
    
    const { name, url, categoryId } = req.body;
    const linkIndex = data.links.findIndex(link => link.id === id);
    
    if (linkIndex === -1) {
        return res.status(404).json(createApiResponse(false, null, 'Link not found'));
    }
    
    // Update the link
    data.links[linkIndex] = {
        ...data.links[linkIndex],
        name: name.trim(),
        url: url.trim(),
        categoryId: categoryId ? parseInt(categoryId) : null,
        updatedAt: new Date().toISOString()
    };
    
    saveData();
    
    res.json(createApiResponse(true, { link: data.links[linkIndex] }));
});

/**
 * Delete link by ID
 */
app.delete('/api/links/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const linkIndex = data.links.findIndex(link => link.id === id);
    
    if (linkIndex === -1) {
        return res.status(404).json(createApiResponse(false, null, 'Link not found'));
    }
    
    data.links.splice(linkIndex, 1);
    saveData();
    
    res.json(createApiResponse(true));
});

/**
 * Check link status
 */
app.post('/api/status/:id', async (req, res) => {
    const validation = validateRequiredFields(req.body, ['url']);
    if (!validation.success) {
        return res.status(400).json(createApiResponse(false, null, validation.error));
    }
    
    try {
        const isOnline = await checkWebsiteStatus(req.body.url);
        res.json(createApiResponse(true, { online: isOnline }));
    } catch (error) {
        handleApiError(res, error, 'status check');
    }
});

// =============================================================================
// API ROUTES - CATEGORIES MANAGEMENT
// =============================================================================

/**
 * Get all categories
 */
app.get('/api/categories', (req, res) => {
    // Sort categories by order before returning
    const sortedCategories = [...data.categories].sort((a, b) => (a.order || 0) - (b.order || 0));
    res.json(createApiResponse(true, { categories: sortedCategories }));
});

/**
 * Create new category
 */
app.post('/api/categories', (req, res) => {
    const validation = validateRequiredFields(req.body, ['name']);
    if (!validation.success) {
        return res.status(400).json(createApiResponse(false, null, validation.error));
    }
    
    const { name } = req.body;
    
    const newCategory = {
        id: data.nextCategoryId++,
        name: name.trim(),
        private: false,
        order: data.categories.length,
        createdAt: new Date().toISOString()
    };
    
    data.categories.push(newCategory);
    saveData();
    
    res.json(createApiResponse(true, { category: newCategory }));
});

/**
 * Delete category by ID and update affected links
 */
app.delete('/api/categories/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const categoryIndex = data.categories.findIndex(category => category.id === id);
    
    if (categoryIndex === -1) {
        return res.status(404).json(createApiResponse(false, null, 'Category not found'));
    }
    
    // Prevent deletion of default NAVIGATION category
    const category = data.categories[categoryIndex];
    if (category.isDefault) {
        return res.status(400).json(createApiResponse(false, null, 'Cannot delete default system category'));
    }
    
    // Remove category from all links
    data.links.forEach(link => {
        if (link.categoryId === id) {
            link.categoryId = null;
        }
    });
    
    data.categories.splice(categoryIndex, 1);
    saveData();
    
    res.json(createApiResponse(true));
});

/**
 * Update category privacy status
 */
app.patch('/api/categories/:id/privacy', (req, res) => {
    const id = parseInt(req.params.id);
    const { private: isPrivate } = req.body;
    
    const category = data.categories.find(cat => cat.id === id);
    
    if (!category) {
        return res.status(404).json(createApiResponse(false, null, 'Category not found'));
    }
    
    category.private = Boolean(isPrivate);
    saveData();
    
    res.json(createApiResponse(true, { category }));
});

/**
 * Reorder categories
 */
app.post('/api/categories/reorder', (req, res) => {
    const validation = validateRequiredFields(req.body, ['categoryOrder']);
    if (!validation.success) {
        return res.status(400).json(createApiResponse(false, null, validation.error));
    }
    
    const { categoryOrder } = req.body;
    
    if (!Array.isArray(categoryOrder)) {
        return res.status(400).json(createApiResponse(false, null, 'Category order must be an array'));
    }
    
    try {
        // Update the order property for each category
        categoryOrder.forEach(({ id, order }) => {
            const category = data.categories.find(cat => cat.id === id);
            if (category) {
                category.order = order;
            }
        });
        
        // Sort categories by order
        data.categories.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        saveData();
        
        res.json(createApiResponse(true));
    } catch (error) {
        handleApiError(res, error, 'reorder categories');
    }
});

// =============================================================================
// API ROUTES - CONFIGURATION
// =============================================================================

/**
 * Get homepage message
 */
app.get('/api/homepage-message', (req, res) => {
    res.json(createApiResponse(true, { message: data.homepageMessage }));
});

/**
 * Update homepage message
 */
app.post('/api/homepage-message', (req, res) => {
    const validation = validateRequiredFields(req.body, ['message']);
    if (!validation.success) {
        return res.status(400).json(createApiResponse(false, null, validation.error));
    }
    
    data.homepageMessage = req.body.message.trim();
    saveData();
    
    res.json(createApiResponse(true));
});

/**
 * Get site title
 */
app.get('/api/site-title', (req, res) => {
    res.json(createApiResponse(true, { title: data.siteTitle }));
});

/**
 * Update site title
 */
app.post('/api/site-title', (req, res) => {
    const validation = validateRequiredFields(req.body, ['title']);
    if (!validation.success) {
        return res.status(400).json(createApiResponse(false, null, validation.error));
    }
    
    data.siteTitle = req.body.title.trim();
    saveData();
    
    res.json(createApiResponse(true));
});

/**
 * Get chat configuration
 */
app.get('/api/chat-config', (req, res) => {
    res.json(createApiResponse(true, { config: data.chatConfig }));
});

/**
 * Update chat configuration
 */
app.post('/api/chat-config', (req, res) => {
    const { provider, apiUrl, chatflowId, ollamaBaseUrl, ollamaModel } = req.body;

    // Persist full configuration for both Flowise and Ollama providers
    data.chatConfig = {
        provider: provider || 'flowise',
        apiUrl: apiUrl || '',
        chatflowId: chatflowId || '',
        ollamaBaseUrl: ollamaBaseUrl || '',
        ollamaModel: ollamaModel || ''
    };
    saveData();

    res.json(createApiResponse(true));
});

// =============================================================================
// OLLAMA PROXY ENDPOINTS (to avoid client-side CORS issues)
// =============================================================================

/**
 * Fetch available Ollama models (GET)
 * Optional query param ?baseUrl= overrides the saved config (useful from admin before save)
 */
app.get('/api/ollama-models', async (req, res) => {
    try {
        const explicitBase = req.query.baseUrl;
        const baseUrl = explicitBase || data.chatConfig.ollamaBaseUrl;
        if (!baseUrl) {
            return res.status(400).json(createApiResponse(false, null, 'Ollama base URL not configured'));
        }

        const resp = await fetch(`${baseUrl.replace(/\/$/, '')}/api/tags`);
        const json = await resp.json();

        if (json && Array.isArray(json.models)) {
            return res.json({ models: json.models });
        }
        return res.status(500).json(createApiResponse(false, null, 'Invalid response from Ollama'));
    } catch (error) {
        console.error('Ollama models proxy error:', error);
        return res.status(500).json(createApiResponse(false, null, 'Failed to fetch Ollama models'));
    }
});

/**
 * Proxy chat completions to Ollama (POST)
 * Body => { message: string }
 */
app.post('/api/ollama-chat', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || !message.toString().trim()) {
            return res.status(400).json(createApiResponse(false, null, 'Message is required'));
        }

        const { ollamaBaseUrl, ollamaModel } = data.chatConfig;
        if (!ollamaBaseUrl || !ollamaModel) {
            return res.status(400).json(createApiResponse(false, null, 'Ollama not configured'));
        }

        const resp = await fetch(`${ollamaBaseUrl.replace(/\/$/, '')}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: ollamaModel,
                messages: [{ role: 'user', content: message }],
                stream: false
            })
        });

        const json = await resp.json();
        return res.json(json);
    } catch (error) {
        console.error('Ollama chat proxy error:', error);
        return res.status(500).json(createApiResponse(false, null, 'Failed to connect to Ollama'));
    }
});

/**
 * Get filter configuration
 */
app.get('/api/filter-config', (req, res) => {
    res.json(createApiResponse(true, { config: data.filterConfig }));
});

/**
 * Update filter configuration
 */
app.post('/api/filter-config', (req, res) => {
    const { enabled, keyword } = req.body;
    
    data.filterConfig = {
        enabled: enabled || false,
        keyword: keyword || '</think>'
    };
    saveData();
    
    res.json(createApiResponse(true));
});

/**
 * Get color configuration
 */
app.get('/api/color-config', (req, res) => {
    res.json(createApiResponse(true, { config: data.colorConfig }));
});

/**
 * Update color configuration
 */
app.post('/api/color-config', (req, res) => {
    const validation = validateRequiredFields(req.body, ['primaryColor']);
    if (!validation.success) {
        return res.status(400).json(createApiResponse(false, null, validation.error));
    }
    
    const { primaryColor } = req.body;
    
    if (!/^#[0-9A-F]{6}$/i.test(primaryColor)) {
        return res.status(400).json(createApiResponse(false, null, 'Valid hex color code is required (e.g., #330099)'));
    }
    
    data.colorConfig = {
        primaryColor: primaryColor
    };
    saveData();
    
    res.json(createApiResponse(true));
});

// =============================================================================
// MEDIA PROXY
// =============================================================================

/**
 * Proxy endpoint for serving media from local network
 * Enables access to ComfyUI images through public container
 */
app.get('/api/image-proxy', async (req, res) => {
    const mediaUrl = req.query.url;
    
    if (!mediaUrl) {
        return res.status(400).json(createApiResponse(false, null, 'Missing media URL parameter'));
    }
    
    try {
        const proxyRes = await makeHttpRequest(mediaUrl, { method: 'GET' }, 10000);
        
        // Preserve original content type
        const contentType = proxyRes.headers['content-type'];
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }
        
        // Set caching and streaming headers
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('Accept-Ranges', 'bytes');
        
        // Copy headers for video support
        if (proxyRes.headers['content-length']) {
            res.setHeader('Content-Length', proxyRes.headers['content-length']);
        }
        if (proxyRes.headers['content-range']) {
            res.setHeader('Content-Range', proxyRes.headers['content-range']);
        }
        
        res.status(proxyRes.statusCode);
        proxyRes.pipe(res);
        
    } catch (error) {
        console.error('Media proxy error:', error);
        if (error.message === 'Request timeout') {
            res.status(500).json(createApiResponse(false, null, 'Media fetch timeout'));
        } else {
            res.status(500).json(createApiResponse(false, null, 'Failed to fetch media'));
        }
    }
});

// ================= PROJECT FILES =================

/** List markdown project files */
app.get('/api/projects', (req, res) => {
    try {
        ensureProjectDir();
        const files = fs.readdirSync(PROJECT_DIR)
            .filter(f => f.endsWith('.md'));
        res.json(createApiResponse(true, { files }));
    } catch (err) {
        handleApiError(res, err, 'list project files');
    }
});

/** Get content of specific file */
app.get('/api/projects/:name', (req, res) => {
    try {
        const name = path.basename(req.params.name);
        const filePath = path.join(PROJECT_DIR, name);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json(createApiResponse(false, null, 'File not found'));
        }
        const content = fs.readFileSync(filePath, 'utf8');
        res.json(createApiResponse(true, { content }));
    } catch (err) {
        handleApiError(res, err, 'read project file');
    }
});

/** Create or update file */
app.post('/api/projects', (req, res) => {
    const validation = validateRequiredFields(req.body, ['name', 'content']);
    if (!validation.success) {
        return res.status(400).json(createApiResponse(false, null, validation.error));
    }
    try {
        ensureProjectDir();
        let { name, content } = req.body;
        name = path.basename(name);
        if (!name.endsWith('.md')) name += '.md';
        const filePath = path.join(PROJECT_DIR, name);
        fs.writeFileSync(filePath, content, 'utf8');
        res.json(createApiResponse(true));
    } catch (err) {
        handleApiError(res, err, 'save project file');
    }
});

/** Delete file */
app.delete('/api/projects/:name', (req, res) => {
    try {
        const name = path.basename(req.params.name);
        const filePath = path.join(PROJECT_DIR, name);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json(createApiResponse(false, null, 'File not found'));
        }
        fs.unlinkSync(filePath);
        res.json(createApiResponse(true));
    } catch (err) {
        handleApiError(res, err, 'delete project file');
    }
});

// =============================================================================
// STATIC ROUTES
// =============================================================================

/**
 * Serve main application
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// =============================================================================
// SERVER INITIALIZATION
// =============================================================================

/**
 * Initialize server with proper startup sequence
 */
async function startServer() {
    // Initialize data and authentication
    loadData();
    await initializeAdminPassword();
    
    // Start HTTP server
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Local Network Hub running on port ${PORT}`);
        console.log(`Access the application at: http://localhost:${PORT}`);
        console.log('Current chat provider:', data.chatConfig.provider);
    });
}

// Start the application
startServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});