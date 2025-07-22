/**
 * Local Network Directory Hub
 * Client-side application logic
 */

// =============================================================================
// APPLICATION STATE
// =============================================================================

let isAdminLoggedIn = false;
const AUTH_STORAGE_KEY = 'local_network_hub_admin_auth';
const AUTH_EXPIRES_DAYS = 7;
let links = [];
let categories = [];
let chatConfig = null;
let filterConfig = null;
let chatboxHTML = null;

// =============================================================================
// APPLICATION INITIALIZATION
// =============================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Local Network Hub application starting...');
    checkStoredAuth();
    handleRouting();
    loadCategories();
    loadLinks();
    loadHomepageMessage();
    loadSiteTitle();
    loadChatConfig();
    loadAdminColorConfig();
    
    // Debug: Log any global errors
    window.addEventListener('error', function(e) {
        console.error('Global error caught:', e.error, e.filename, e.lineno);
    });
    
    // Debug: Log any unhandled promise rejections
    window.addEventListener('unhandledrejection', function(e) {
        console.error('Unhandled promise rejection:', e.reason);
    });
});

// =============================================================================
// ROUTING AND NAVIGATION
// =============================================================================

/**
 * Handle admin tab switching
 * @param {Event} event - The click event
 * @param {string} tabId - The ID of the tab to switch to
 */
function switchAdminTab(event, tabId) {
    // Remove active class from all tabs and content
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Add active class to clicked tab and corresponding content
    event.target.classList.add('active');
    document.getElementById(tabId).classList.add('active');
    
    // If switching to Admin Links tab, ensure private links are visible
    if (tabId === 'adminLinksTab') {
        const privateLinksSection = document.getElementById('privateLinksSection');
        if (privateLinksSection) {
            privateLinksSection.style.display = 'block';
        }
    }
    
    if (tabId === 'projectTab') {
        loadProjectFiles();
    }
}

/**
 * Handle client-side routing based on URL hash
 */
function handleRouting() {
    const hash = window.location.hash;
    
    if (hash === '#admin') {
        showAdminPage();
    } else {
        showMainPage();
    }
}

/**
 * Show the main application page
 */
function showMainPage() {
    document.getElementById('mainPage').classList.remove('hidden');
    document.getElementById('adminPage').classList.add('hidden');
}

/**
 * Show the admin management page
 */
function showAdminPage() {
    document.getElementById('mainPage').classList.add('hidden');
    document.getElementById('adminPage').classList.remove('hidden');
    
    // Initialize admin animation when page becomes visible
    if (window.initAdminAnimation) {
        setTimeout(() => {
            console.log('About to initialize admin animation...');
            window.initAdminAnimation();
        }, 500); // Longer delay to ensure page is fully shown and rendered
    }
    
    if (isAdminLoggedIn) {
        showAdminPanel();
    } else {
        showLoginForm();
    }
}

/**
 * Show admin login form
 */
function showLoginForm() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('adminPanel').classList.add('hidden');
    
    // Always clear admin data when showing login form for security
    clearAdminData();
}

/**
 * Show admin management panel
 */
function showAdminPanel() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('adminPanel').classList.remove('hidden');
    
    // Load admin data
    loadAdminCategories();
    loadAdminLinks();
    loadAdminHomepageMessage();
    loadAdminChatConfig();
    loadAdminFilterConfig();
    loadAdminColorConfig();
    loadPrivateLinks();
    loadSiteTitle();
    syncColorInputs();
    
    // Adjust button text colors for admin panel
    setTimeout(() => adjustAllButtonTextColors(), 200);
}

// Listen for hash changes
window.addEventListener('hashchange', handleRouting);

// Listen for Enter key on password field
document.getElementById('adminPassword').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        adminLogin();
    }
});

// =============================================================================
// AUTHENTICATION
// =============================================================================

/**
 * Check for stored authentication on page load
 */
function checkStoredAuth() {
    try {
        const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!storedAuth) return;
        
        const authData = JSON.parse(storedAuth);
        const expirationTime = new Date(authData.expires);
        
        if (expirationTime > new Date()) {
            isAdminLoggedIn = true;
            console.log('Admin session restored from storage');
        } else {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            console.log('Expired admin session removed');
        }
    } catch (error) {
        console.error('Error checking stored auth:', error);
        localStorage.removeItem(AUTH_STORAGE_KEY);
    }
}

/**
 * Store authentication data
 */
function storeAuthData() {
    try {
        const expirationTime = new Date();
        expirationTime.setDate(expirationTime.getDate() + AUTH_EXPIRES_DAYS);
        
        const authData = {
            authenticated: true,
            expires: expirationTime.toISOString(),
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
        console.log('Admin authentication stored for 7 days');
    } catch (error) {
        console.error('Error storing auth data:', error);
    }
}

/**
 * Clear authentication data
 */
function clearAuthData() {
    try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        console.log('Admin authentication cleared');
    } catch (error) {
        console.error('Error clearing auth data:', error);
    }
}

/**
 * Clear all admin-specific data and UI elements
 */
function clearAdminData() {
    // Clear private links section (but don't hide since it's in a tab)
    const privateLinksSection = document.getElementById('privateLinksSection');
    if (privateLinksSection) {
        const privateLinksContainer = document.getElementById('privateLinksContainer');
        if (privateLinksContainer) {
            privateLinksContainer.innerHTML = '';
        }
    }
    
    // Clear admin categories list
    const adminCategoriesList = document.getElementById('adminCategoriesList');
    if (adminCategoriesList) {
        adminCategoriesList.innerHTML = '';
    }
    
    // Clear admin links list
    const adminLinksList = document.getElementById('adminLinksList');
    if (adminLinksList) {
        adminLinksList.innerHTML = '';
    }
    
    // Clear form inputs
    const inputs = [
        'categoryName', 'linkName', 'linkUrl', 'homepageMessageInput',
        'chatApiUrl', 'chatflowId', 'filterKeyword'
    ];
    inputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.value = '';
        }
    });
    
    // Clear checkboxes
    const filterEnabled = document.getElementById('filterEnabled');
    if (filterEnabled) {
        filterEnabled.checked = false;
    }
    
    // Reset category select
    const linkCategory = document.getElementById('linkCategory');
    if (linkCategory) {
        linkCategory.innerHTML = '<option value="">No Category</option>';
    }
}

/**
 * Handle admin login
 */
async function adminLogin() {
    const password = document.getElementById('adminPassword').value;
    
    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            isAdminLoggedIn = true;
            storeAuthData();
            showAdminPanel();
            showFeedback('Successfully logged in!', 'success');
        } else {
            showFeedback('Invalid password', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showFeedback('Login failed', 'error');
    }
}

/**
 * Handle admin logout
 */
function adminLogout() {
    isAdminLoggedIn = false;
    clearAuthData();
    
    // Clear all admin-specific data and UI elements
    clearAdminData();
    
    showLoginForm();
    
    // Clear the password field
    document.getElementById('adminPassword').value = '';
    
    showFeedback('Successfully logged out', 'success');
    
    // Redirect to main page after short delay
    setTimeout(() => {
        window.location.hash = '';
        showMainPage();
    }, 1500);
}

// =============================================================================
// LINKS MANAGEMENT
// =============================================================================

/**
 * Load links from server
 */
async function loadLinks() {
    try {
        const response = await fetch('/api/links');
        const result = await response.json();
        
        if (result.success) {
            links = result.links;
            
            // Ensure categories are loaded before rendering
            if (categories.length === 0) {
                await loadCategories();
            }
            
            renderLinks();
        }
    } catch (error) {
        console.error('Load links error:', error);
    }
}

/**
 * Render links on the main page organized by categories
 */
function renderLinks() {
    const linksList = document.getElementById('linksList');
    linksList.innerHTML = '';

    // Group links by category id for quick lookup
    const linksByCategory = {};
    const uncategorizedLinks = [];

    links.forEach(link => {
        if (link.categoryId) {
            const category = categories.find(cat => cat.id === link.categoryId);
            if (category && !category.private && !category.isDefault) {
                if (!linksByCategory[category.id]) {
                    linksByCategory[category.id] = [];
                }
                linksByCategory[category.id].push(link);
            } else if (!category) {
                // Category removed but link still references it
                uncategorizedLinks.push(link);
            }
        } else {
            uncategorizedLinks.push(link);
        }
    });

    // Render uncategorized links (no header)
    if (uncategorizedLinks.length > 0) {
        const uncategorizedSection = document.createElement('div');
        uncategorizedSection.className = 'uncategorized-section';
        uncategorizedLinks.forEach(link => {
            uncategorizedSection.appendChild(createLinkElement(link));
        });
        linksList.appendChild(uncategorizedSection);
    }

    // Insert chatbox if configured (keep it near top)
    insertChatboxInLinks();

    // Render each category in the saved order
    const orderedCategories = categories
        .filter(cat => !cat.isDefault && !cat.private && linksByCategory[cat.id])
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    orderedCategories.forEach(category => {
        const categorySection = document.createElement('div');
        categorySection.className = 'category-section';
        categorySection.setAttribute('data-category-id', category.id);

        const categoryTitle = document.createElement('h2');
        categoryTitle.className = 'category-title';
        categoryTitle.textContent = category.name;
        categorySection.appendChild(categoryTitle);

        linksByCategory[category.id].forEach(link => {
            categorySection.appendChild(createLinkElement(link));
        });

        linksList.appendChild(categorySection);
    });
 
    // Render navigation links
    renderNavigationLinks();
    
    // Adjust all button text colors after rendering
    setTimeout(() => adjustAllButtonTextColors(), 100);
}

/**
 * Render navigation links in the header
 */
function renderNavigationLinks() {
    const navigationSection = document.getElementById('navigationSection');
    navigationSection.innerHTML = '';
    
    // Find NAVIGATION category
    const navigationCategory = categories.find(cat => cat.name === 'NAVIGATION' && cat.isDefault);
    if (!navigationCategory) {
        return;
    }
    
    // Get links for NAVIGATION category
    const navigationLinks = links.filter(link => link.categoryId === navigationCategory.id);
    
    if (navigationLinks.length === 0) {
        return;
    }
    
    // Create navigation links container
    const navContainer = document.createElement('div');
    navContainer.className = 'nav-links-container';
    
    navigationLinks.forEach(link => {
        const navItem = document.createElement('div');
        navItem.className = 'nav-link-item';
        navItem.innerHTML = `
            <div class="nav-link-name">${escapeHtml(link.name)}</div>
            <a href="${escapeHtml(link.url)}" target="_blank" class="nav-go-btn">Go</a>
        `;
        navContainer.appendChild(navItem);
    });
    
    navigationSection.appendChild(navContainer);
}

/**
 * Create a link element with status checking
 */
function createLinkElement(link) {
    const linkItem = document.createElement('div');
    linkItem.className = 'link-item';
    linkItem.innerHTML = `
        <div class="link-content">
            <div class="status-section">
                <div class="status-indicator status-checking" id="status-${link.id}"></div>
                <span class="status-text checking" id="status-text-${link.id}">Unknown</span>
            </div>
            <div class="link-name">${escapeHtml(link.name)}</div>
            <div class="link-url">${escapeHtml(link.url)}</div>
        </div>
        <a href="${escapeHtml(link.url)}" target="_blank" class="redirect-btn">Go →</a>
    `;
    
    // Check status after rendering
    setTimeout(() => checkWebsiteStatus(link.id, link.url), 100);
    
    return linkItem;
}

/**
 * Add a new link
 */
async function addLink() {
    const name = document.getElementById('linkName').value.trim();
    const url = document.getElementById('linkUrl').value.trim();
    const categoryId = document.getElementById('linkCategory').value || null;
    const button = event.target;
    
    if (!name || !url) {
        showFeedback('Please enter both name and URL', 'error');
        return;
    }
    
    button.textContent = 'Adding...';
    button.disabled = true;
    
    try {
        const response = await fetch('/api/links', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, url: url, categoryId: categoryId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('linkName').value = '';
            document.getElementById('linkUrl').value = '';
            document.getElementById('linkCategory').value = '';
            loadLinks();
            loadAdminLinks();
            showFeedback(`Successfully added "${name}"!`, 'success');
        } else {
            showFeedback('Failed to add link', 'error');
        }
    } catch (error) {
        console.error('Add link error:', error);
        showFeedback('Failed to add link', 'error');
    } finally {
        button.textContent = '+ Add Link';
        button.disabled = false;
    }
}

/**
 * Delete a link
 */
async function deleteLink(id) {
    if (!confirm('Are you sure you want to delete this link?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/links/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            loadLinks();
            loadAdminLinks();
        } else {
            alert('Failed to delete link');
        }
    } catch (error) {
        console.error('Delete link error:', error);
        alert('Failed to delete link');
    }
}

/**
 * Load links for admin panel
 */
async function loadAdminLinks() {
    const adminLinksList = document.getElementById('adminLinksList');
    adminLinksList.innerHTML = '';
    
    links.forEach(link => {
        const category = categories.find(cat => cat.id === link.categoryId);
        const categoryName = category ? category.name : 'No Category';
        
        const linkItem = document.createElement('div');
        linkItem.className = 'admin-link-item';
        linkItem.dataset.linkId = link.id;
        linkItem.innerHTML = `
            <div class="link-info">
                <div class="link-display" id="display-${link.id}">
                    <strong>${escapeHtml(link.name)}</strong><br>
                    <small>${escapeHtml(link.url)}</small><br>
                    <span class="category-tag">${escapeHtml(categoryName)}</span>
                </div>
                <div class="link-edit hidden" id="edit-${link.id}">
                    <div class="edit-field">
                        <label>Name:</label>
                        <input type="text" id="edit-name-${link.id}" value="${escapeHtml(link.name)}" required>
                    </div>
                    <div class="edit-field">
                        <label>URL:</label>
                        <input type="url" id="edit-url-${link.id}" value="${escapeHtml(link.url)}" required>
                    </div>
                    <div class="edit-field">
                        <label>Category:</label>
                        <select id="edit-category-${link.id}">
                            <option value="">No Category</option>
                            ${categories.map(cat => 
                                `<option value="${cat.id}" ${cat.id === link.categoryId ? 'selected' : ''}>${escapeHtml(cat.name)}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
            </div>
            <div class="link-actions">
                <div class="normal-actions" id="normal-actions-${link.id}">
                    <button onclick="startEditLink(${link.id})" class="edit-btn">Edit</button>
                    <button onclick="deleteLink(${link.id})" class="delete-btn">Delete</button>
                </div>
                <div class="edit-actions hidden" id="edit-actions-${link.id}">
                    <button onclick="saveEditLink(${link.id})" class="save-btn">Save</button>
                    <button onclick="cancelEditLink(${link.id})" class="cancel-btn">Cancel</button>
                </div>
            </div>
        `;
        adminLinksList.appendChild(linkItem);
    });
    
    // Adjust button colors for admin link actions
    setTimeout(() => adjustAllButtonTextColors(), 100);
}

// =============================================================================
// LINK EDITING FUNCTIONALITY
// =============================================================================

/**
 * Start editing a link
 */
function startEditLink(linkId) {
    const displayElement = document.getElementById(`display-${linkId}`);
    const editElement = document.getElementById(`edit-${linkId}`);
    const normalActions = document.getElementById(`normal-actions-${linkId}`);
    const editActions = document.getElementById(`edit-actions-${linkId}`);
    
    if (displayElement && editElement && normalActions && editActions) {
        displayElement.classList.add('hidden');
        editElement.classList.remove('hidden');
        normalActions.classList.add('hidden');
        editActions.classList.remove('hidden');
        
        // Focus on the name input
        const nameInput = document.getElementById(`edit-name-${linkId}`);
        if (nameInput) {
            nameInput.focus();
            
            // Add keyboard event listeners for save/cancel
            const keyHandler = (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    saveEditLink(linkId);
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelEditLink(linkId);
                }
            };
            
            // Store the handler function for later removal
            window[`keyHandler_${linkId}`] = keyHandler;
            
            // Add event listeners to all inputs in edit mode
            const editInputs = document.querySelectorAll(`#edit-${linkId} input, #edit-${linkId} select`);
            editInputs.forEach(input => {
                input.addEventListener('keydown', keyHandler);
                input.dataset.editMode = 'true';
            });
        }
        
        // Adjust button colors for edit actions
        setTimeout(() => adjustAllButtonTextColors(), 50);
    }
}

/**
 * Cancel editing a link
 */
function cancelEditLink(linkId) {
    const displayElement = document.getElementById(`display-${linkId}`);
    const editElement = document.getElementById(`edit-${linkId}`);
    const normalActions = document.getElementById(`normal-actions-${linkId}`);
    const editActions = document.getElementById(`edit-actions-${linkId}`);
    
    if (displayElement && editElement && normalActions && editActions) {
        displayElement.classList.remove('hidden');
        editElement.classList.add('hidden');
        normalActions.classList.remove('hidden');
        editActions.classList.add('hidden');
        
        // Reset form values to original values
        const link = links.find(l => l.id === linkId);
        if (link) {
            document.getElementById(`edit-name-${linkId}`).value = link.name;
            document.getElementById(`edit-url-${linkId}`).value = link.url;
            document.getElementById(`edit-category-${linkId}`).value = link.categoryId || '';
        }
        
        // Remove keyboard event listeners
        const keyHandler = window[`keyHandler_${linkId}`];
        if (keyHandler) {
            const editInputs = document.querySelectorAll(`#edit-${linkId} input, #edit-${linkId} select`);
            editInputs.forEach(input => {
                if (input.dataset.editMode) {
                    input.removeEventListener('keydown', keyHandler);
                    delete input.dataset.editMode;
                }
            });
            delete window[`keyHandler_${linkId}`];
        }
    }
}

/**
 * Save edited link
 */
async function saveEditLink(linkId) {
    const nameInput = document.getElementById(`edit-name-${linkId}`);
    const urlInput = document.getElementById(`edit-url-${linkId}`);
    const categorySelect = document.getElementById(`edit-category-${linkId}`);
    
    if (!nameInput || !urlInput || !categorySelect) {
        showFeedback('Error: Form elements not found', 'error');
        return;
    }
    
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    const categoryId = categorySelect.value ? parseInt(categorySelect.value) : null;
    
    // Validation
    if (!name) {
        showFeedback('Name is required', 'error');
        nameInput.focus();
        return;
    }
    
    if (!url) {
        showFeedback('URL is required', 'error');
        urlInput.focus();
        return;
    }
    
    // Basic URL validation
    try {
        new URL(url);
    } catch (e) {
        showFeedback('Please enter a valid URL', 'error');
        urlInput.focus();
        return;
    }
    
    // Disable save button during request
    const saveBtn = document.querySelector(`#edit-actions-${linkId} .save-btn`);
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;
    
    try {
        const response = await fetch(`/api/links/${linkId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: name,
                url: url,
                categoryId: categoryId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Update local links array
            const linkIndex = links.findIndex(l => l.id === linkId);
            if (linkIndex !== -1) {
                links[linkIndex] = { ...links[linkIndex], name, url, categoryId };
            }
            
            // Refresh displays
            loadAdminLinks();
            renderLinks();
            
            showFeedback('Link updated successfully!', 'success');
        } else {
            showFeedback(result.error || 'Failed to update link', 'error');
        }
    } catch (error) {
        console.error('Save link error:', error);
        showFeedback('Failed to update link', 'error');
    } finally {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    }
}

/**
 * Check website status
 */
async function checkWebsiteStatus(linkId, url) {
    const statusElement = document.getElementById(`status-${linkId}`);
    const statusTextElement = document.getElementById(`status-text-${linkId}`);
    
    try {
        const response = await fetch(`/api/status/${linkId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url })
        });
        
        const result = await response.json();
        
        if (result.success && result.online) {
            statusElement.className = 'status-indicator status-online';
            statusTextElement.className = 'status-text online';
            statusTextElement.textContent = 'Live';
        } else {
            statusElement.className = 'status-indicator status-offline';
            statusTextElement.className = 'status-text offline';
            statusTextElement.textContent = 'Down';
        }
    } catch (error) {
        console.error('Status check error:', error);
        statusElement.className = 'status-indicator status-offline';
        statusTextElement.className = 'status-text offline';
        statusTextElement.textContent = 'Down';
    }
}

// =============================================================================
// CATEGORIES MANAGEMENT
// =============================================================================

/**
 * Load categories from server
 */
async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        const result = await response.json();
        
        if (result.success) {
            categories = result.categories;
            // Sort categories by order (ascending)
            categories.sort((a, b) => (a.order || 0) - (b.order || 0));
            updateCategorySelect();
        }
    } catch (error) {
        console.error('Load categories error:', error);
    }
}

/**
 * Update category dropdown select
 */
function updateCategorySelect() {
    const select = document.getElementById('linkCategory');
    if (!select) return;
    
    select.innerHTML = '<option value="">No Category</option>';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        select.appendChild(option);
    });
}

/**
 * Add a new category
 */
async function addCategory() {
    const name = document.getElementById('categoryName').value.trim();
    const button = event.target;
    
    if (!name) {
        showFeedback('Please enter a category name', 'error');
        return;
    }
    
    button.textContent = 'Adding...';
    button.disabled = true;
    
    try {
        const response = await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name })
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('categoryName').value = '';
            await loadCategories();
            loadAdminCategories();
            renderLinks();
            showFeedback(`Successfully added category "${name}"!`, 'success');
        } else {
            showFeedback('Failed to add category', 'error');
        }
    } catch (error) {
        console.error('Add category error:', error);
        showFeedback('Failed to add category', 'error');
    } finally {
        button.textContent = '+ Add Category';
        button.disabled = false;
    }
}

/**
 * Delete a category
 */
async function deleteCategory(id) {
    if (!confirm('Are you sure you want to delete this category? Links will be moved to uncategorized.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/categories/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            loadCategories();
            loadAdminCategories();
            loadLinks();
            showFeedback('Category deleted successfully', 'success');
        } else {
            showFeedback('Failed to delete category', 'error');
        }
    } catch (error) {
        console.error('Delete category error:', error);
        showFeedback('Failed to delete category', 'error');
    }
}

/**
 * Load categories for admin panel
 */
async function loadAdminCategories() {
    const adminCategoriesList = document.getElementById('adminCategoriesList');
    adminCategoriesList.innerHTML = '';
    
    categories.forEach(category => {
        const categoryItem = document.createElement('div');
        categoryItem.className = category.isDefault ? 'category-item navigation-category' : 'category-item';
        categoryItem.draggable = !category.isDefault; // Prevent dragging default categories
        categoryItem.dataset.categoryId = category.id;
        
        // Different HTML for default vs regular categories
        if (category.isDefault) {
            categoryItem.innerHTML = `
                <div class="category-info">
                    <span class="category-tag">SYSTEM</span>
                    <span>${escapeHtml(category.name)}</span>
                </div>
                <span class="default-label">Default Category</span>
            `;
        } else {
            categoryItem.innerHTML = `
                <div class="drag-handle">⋮⋮</div>
                <div class="category-info">
                    <span>${escapeHtml(category.name)}</span>
                    <div class="privacy-toggle">
                        <label class="toggle-switch">
                            <input type="checkbox" ${category.private ? 'checked' : ''} 
                                   onchange="toggleCategoryPrivacy(${category.id}, this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                        <span class="toggle-label">Private</span>
                    </div>
                </div>
                <button onclick="deleteCategory(${category.id})" class="delete-btn">Delete</button>
            `;
        }
        
        // Add drag event listeners only for non-default categories
        if (!category.isDefault) {
            categoryItem.addEventListener('dragstart', handleCategoryDragStart);
            categoryItem.addEventListener('dragend', handleCategoryDragEnd);
            categoryItem.addEventListener('dragover', handleCategoryDragOver);
            categoryItem.addEventListener('drop', handleCategoryDrop);
        }
        
        adminCategoriesList.appendChild(categoryItem);
    });
    
    updateCategorySelect();
}

// =============================================================================
// CATEGORY DRAG AND DROP FUNCTIONALITY
// =============================================================================

let draggedCategory = null;

/**
 * Handle category drag start
 */
function handleCategoryDragStart(e) {
    draggedCategory = this;
    this.classList.add('dragging');
    
    // Set drag data
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.outerHTML);
}

/**
 * Handle category drag end
 */
function handleCategoryDragEnd(e) {
    this.classList.remove('dragging');
    
    // Remove drag-over class from all items
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('drag-over');
    });
    
    draggedCategory = null;
}

/**
 * Handle category drag over
 */
function handleCategoryDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    
    e.dataTransfer.dropEffect = 'move';
    
    // Add visual feedback
    if (this !== draggedCategory) {
        this.classList.add('drag-over');
    }
    
    return false;
}

/**
 * Handle category drop
 */
function handleCategoryDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    if (draggedCategory !== this) {
        // Get the dragged category ID and target category ID
        const draggedId = parseInt(draggedCategory.dataset.categoryId);
        const targetId = parseInt(this.dataset.categoryId);
        
        // Reorder categories array
        reorderCategories(draggedId, targetId);
    }
    
    this.classList.remove('drag-over');
    return false;
}

/**
 * Reorder categories in the array and update backend
 */
async function reorderCategories(draggedId, targetId) {
    const draggedIndex = categories.findIndex(cat => cat.id === draggedId);
    const targetIndex = categories.findIndex(cat => cat.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    // Remove dragged category from its current position
    const draggedCategory = categories.splice(draggedIndex, 1)[0];
    
    // Insert it at the target position
    categories.splice(targetIndex, 0, draggedCategory);
    
    // Update the order property for all categories
    categories.forEach((category, index) => {
        category.order = index;
    });
    
    // Update the backend
    try {
        const response = await fetch('/api/categories/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                categoryOrder: categories.map(cat => ({ id: cat.id, order: cat.order }))
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Refresh the display
            loadAdminCategories();
            renderLinks();
            showFeedback('Category order updated successfully!', 'success');
        } else {
            showFeedback('Failed to update category order', 'error');
            // Reload categories to restore original order
            loadCategories();
        }
    } catch (error) {
        console.error('Reorder categories error:', error);
        showFeedback('Failed to update category order', 'error');
        // Reload categories to restore original order
        loadCategories();
    }
}

/**
 * Load private links for display in admin page
 */
function loadPrivateLinks() {
    const privateLinksSection = document.getElementById('privateLinksSection');
    if (!privateLinksSection) return;
    
    // Get all links from private categories
    const privateLinks = links.filter(link => {
        if (link.categoryId) {
            const category = categories.find(cat => cat.id === link.categoryId);
            return category && category.private;
        }
        return false;
    });
    
    if (privateLinks.length === 0) {
        privateLinksSection.style.display = 'none';
        return;
    }
    
    // Always show the section now that it's in a tab
    privateLinksSection.style.display = 'block';
    const privateLinksContainer = document.getElementById('privateLinksContainer');
    privateLinksContainer.innerHTML = '';
    
    // Group private links by category
    const categorizedPrivateLinks = {};
    
    privateLinks.forEach(link => {
        const category = categories.find(cat => cat.id === link.categoryId);
        if (category) {
            if (!categorizedPrivateLinks[category.id]) {
                categorizedPrivateLinks[category.id] = {
                    category: category,
                    links: []
                };
            }
            categorizedPrivateLinks[category.id].links.push(link);
        }
    });
    
    // Render private links with category headers
    Object.values(categorizedPrivateLinks).forEach(group => {
        const categorySection = document.createElement('div');
        categorySection.className = 'category-section';
        categorySection.setAttribute('data-category-id', group.category.id);
        
        const categoryTitle = document.createElement('h2');
        categoryTitle.className = 'category-title';
        categoryTitle.textContent = group.category.name;
        categorySection.appendChild(categoryTitle);
        
        group.links.forEach(link => {
            const linkItem = createLinkElement(link);
            categorySection.appendChild(linkItem);
        });
        
        privateLinksContainer.appendChild(categorySection);
    });
}

/**
 * Toggle category privacy
 */
async function toggleCategoryPrivacy(categoryId, isPrivate) {
    try {
        const response = await fetch(`/api/categories/${categoryId}/privacy`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ private: isPrivate })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Update local categories data
            const category = categories.find(cat => cat.id === categoryId);
            if (category) {
                category.private = isPrivate;
            }
            
            // Refresh main page links display and private links
            loadLinks();
            loadPrivateLinks();
            showFeedback(`Category privacy ${isPrivate ? 'enabled' : 'disabled'}`, 'success');
        } else {
            showFeedback('Failed to update category privacy', 'error');
        }
    } catch (error) {
        console.error('Toggle category privacy error:', error);
        showFeedback('Failed to update category privacy', 'error');
    }
}

/**
 * Format homepage message with basic markdown-style formatting
 * @param {string} message - Raw message text
 * @returns {string} - HTML formatted message
 */
function formatHomepageMessage(message) {
    if (!message) return '';
    
    // Escape HTML to prevent XSS
    let formatted = escapeHtml(message);
    
    // Convert **bold** to <strong>
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert *italic* to <em>
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Convert line breaks to HTML
    formatted = formatted.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
    
    // Wrap in paragraph tags if contains line breaks
    if (formatted.includes('<br>') || formatted.includes('</p>')) {
        formatted = '<p>' + formatted + '</p>';
    }
    
    return formatted;
}

// =============================================================================
// CONFIGURATION MANAGEMENT
// =============================================================================

/**
 * Load homepage message
 */
async function loadHomepageMessage() {
    try {
        const response = await fetch('/api/homepage-message');
        const result = await response.json();
        
        if (result.success && result.message) {
            // Convert basic markdown-style formatting to HTML
            const formattedMessage = formatHomepageMessage(result.message);
            document.getElementById('homepageMessage').innerHTML = formattedMessage;
        }
    } catch (error) {
        console.error('Load homepage message error:', error);
    }
}

/**
 * Load homepage message for admin panel
 */
async function loadAdminHomepageMessage() {
    try {
        const response = await fetch('/api/homepage-message');
        const result = await response.json();
        
        if (result.success && result.message) {
            document.getElementById('homepageMessageInput').value = result.message;
        }
    } catch (error) {
        console.error('Load admin homepage message error:', error);
    }
}

/**
 * Update homepage message
 */
async function updateHomepageMessage() {
    const message = document.getElementById('homepageMessageInput').value.trim();
    const button = event.target;
    
    if (!message) {
        showFeedback('Please enter a message', 'error');
        return;
    }
    
    button.textContent = 'Updating...';
    button.disabled = true;
    
    try {
        const response = await fetch('/api/homepage-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message })
        });
        
        const result = await response.json();
        
        if (result.success) {
            loadHomepageMessage();
            showFeedback('Homepage message updated!', 'success');
        } else {
            showFeedback('Failed to update message', 'error');
        }
    } catch (error) {
        console.error('Update message error:', error);
        showFeedback('Failed to update message', 'error');
    } finally {
        button.textContent = 'Update Message';
        button.disabled = false;
    }
}

/**
 * Load site title from server and update UI
 */
async function loadSiteTitle() {
    try {
        const response = await fetch('/api/site-title');
        const result = await response.json();
        
        if (result.success && result.title) {
            // Update both main page and admin page titles
            const mainTitle = document.getElementById('mainTitle');
            const adminTitle = document.getElementById('adminTitle');
            const pageTitle = document.querySelector('title');
            
            if (mainTitle) mainTitle.textContent = result.title;
            if (adminTitle) adminTitle.textContent = result.title;
            if (pageTitle) pageTitle.textContent = `${result.title} - Local Network Hub`;
            
            // Update admin input field
            const siteTitleInput = document.getElementById('siteTitleInput');
            if (siteTitleInput) siteTitleInput.value = result.title;
        }
    } catch (error) {
        console.error('Load site title error:', error);
    }
}

/**
 * Update site title
 */
async function updateSiteTitle() {
    const title = document.getElementById('siteTitleInput').value.trim();
    const button = event.target;
    
    if (!title) {
        showFeedback('Please enter a site title', 'error');
        return;
    }
    
    button.textContent = 'Updating...';
    button.disabled = true;
    
    try {
        const response = await fetch('/api/site-title', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showFeedback('Site title updated successfully!', 'success');
            await loadSiteTitle(); // Refresh the displayed title
        } else {
            showFeedback(result.error || 'Failed to update site title', 'error');
        }
    } catch (error) {
        console.error('Update site title error:', error);
        showFeedback('Failed to update site title', 'error');
    } finally {
        button.textContent = 'Update Title';
        button.disabled = false;
    }
}

/**
 * Load chat configuration
 */
async function loadChatConfig() {
    try {
        const [chatResponse, filterResponse] = await Promise.all([
            fetch('/api/chat-config'),
            fetch('/api/filter-config')
        ]);
        
        const chatResult = await chatResponse.json();
        const filterResult = await filterResponse.json();
        
        if (filterResult.success && filterResult.config) {
            filterConfig = filterResult.config;
        }
        
        if (chatResult.success && chatResult.config) {
            const config = chatResult.config;
            const provider = config.provider || 'flowise';
            
            // Check if we have a valid configuration for the selected provider
            let hasValidConfig = false;
            
            if (provider === 'flowise' && config.apiUrl && config.chatflowId) {
                hasValidConfig = true;
            } else if (provider === 'ollama' && config.ollamaBaseUrl && config.ollamaModel) {
                hasValidConfig = true;
            }
            
            if (hasValidConfig) {
                chatboxHTML = createChatboxHTML();
                initializeChatbox(config);
                
                // Hide the original container
                const container = document.getElementById('codeSnippetContainer');
                container.style.display = 'none';
                
                // Re-render links to include chatbox
                renderLinks();
            } else {
                chatboxHTML = null;
                const container = document.getElementById('codeSnippetContainer');
                container.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Load chat config error:', error);
    }
}

/**
 * Load chat configuration for admin panel
 */
async function loadAdminChatConfig() {
    try {
        const response = await fetch('/api/chat-config');
        const result = await response.json();
        
        if (result.success && result.config) {
            const provider = result.config.provider || 'none';
            
            // Set the provider dropdown
            document.getElementById('aiProvider').value = provider;
            
            // Show/hide appropriate configuration sections
            toggleAiProvider();
            
            if (provider === 'flowise') {
                document.getElementById('chatApiUrl').value = result.config.apiUrl || '';
                document.getElementById('chatflowId').value = result.config.chatflowId || '';
            } else if (provider === 'ollama') {
                document.getElementById('ollamaBaseUrl').value = result.config.ollamaBaseUrl || '';
                
                // If there's a saved model, we need to fetch the models first to populate the dropdown
                if (result.config.ollamaModel && result.config.ollamaBaseUrl) {
                    // Try to fetch models to populate the dropdown directly
                    try {
                        const modelsResponse = await fetch(`/api/ollama-models`);
                        const modelsResult = await modelsResponse.json();
                        
                        if (modelsResult && modelsResult.models && Array.isArray(modelsResult.models)) {
                            const modelSelect = document.getElementById('ollamaModel');
                            modelSelect.innerHTML = '<option value="">Select a model...</option>';
                            
                            modelsResult.models.forEach(model => {
                                const option = document.createElement('option');
                                option.value = model.name;
                                option.textContent = `${model.name} (${model.size ? formatBytes(model.size) : 'Unknown size'})`;
                                if (model.name === result.config.ollamaModel) {
                                    option.selected = true;
                                }
                                modelSelect.appendChild(option);
                            });
                            
                            modelSelect.classList.remove('hidden');
                        }
                    } catch (modelError) {
                        console.warn('Could not fetch Ollama models during load:', modelError);
                        // Still set the model value even if we can't fetch the list
                        const modelSelect = document.getElementById('ollamaModel');
                        modelSelect.innerHTML = `<option value="${result.config.ollamaModel}" selected>${result.config.ollamaModel}</option>`;
                        modelSelect.classList.remove('hidden');
                    }
                }
            }
        }
    } catch (error) {
        console.error('Load admin chat config error:', error);
    }
}

/**
 * Toggle AI provider configuration sections
 */
function toggleAiProvider() {
    const provider = document.getElementById('aiProvider').value;
    const flowiseConfig = document.getElementById('flowiseConfig');
    const ollamaConfig = document.getElementById('ollamaConfig');
    
    if (provider === 'flowise') {
        flowiseConfig.classList.remove('hidden');
        ollamaConfig.classList.add('hidden');
    } else if (provider === 'ollama') {
        flowiseConfig.classList.add('hidden');
        ollamaConfig.classList.remove('hidden');
    } else {
        // Provider 'none' or any other value: hide all config sections
        flowiseConfig.classList.add('hidden');
        ollamaConfig.classList.add('hidden');
    }
}

/**
 * Fetch available models from Ollama endpoint
 */
async function fetchOllamaModels() {
    const baseUrl = document.getElementById('ollamaBaseUrl').value.trim();
    const button = event.target;
    const modelSelect = document.getElementById('ollamaModel');
    
    if (!baseUrl) {
        showFeedback('Please enter the Ollama base URL first', 'error');
        return;
    }
    
    button.textContent = 'Checking...';
    button.disabled = true;
    
    try {
        // Call backend proxy to avoid CORS (passes baseUrl)
        const response = await fetch(`/api/ollama-models?baseUrl=${encodeURIComponent(baseUrl)}`);
        const result = await response.json();
        
        if (result && result.models && Array.isArray(result.models)) {
            modelSelect.innerHTML = '<option value="">Select a model...</option>';
            
            result.models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.name;
                option.textContent = `${model.name} (${model.size ? formatBytes(model.size) : 'Unknown size'})`;
                modelSelect.appendChild(option);
            });
            
            modelSelect.classList.remove('hidden');
            showFeedback(`Found ${result.models.length} models on Ollama server`, 'success');
        } else {
            showFeedback('No models found or invalid response from Ollama server', 'error');
        }
    } catch (error) {
        console.error('Fetch Ollama models error:', error);
        showFeedback('Failed to connect to Ollama server. Check the URL and ensure Ollama is running.', 'error');
    } finally {
        button.textContent = 'Check Available Models';
        button.disabled = false;
    }
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Update chat configuration
 */
async function updateChatConfig() {
    const provider = document.getElementById('aiProvider').value;
    const button = event.target;
    let configData = { provider };
    
    // Get configuration based on selected provider
    if (provider === 'flowise') {
        const apiUrl = document.getElementById('chatApiUrl').value.trim();
        const chatflowId = document.getElementById('chatflowId').value.trim();
        
        if (!apiUrl || !chatflowId) {
            showFeedback('Please fill in both Flowise API URL and Chatflow ID', 'error');
            return;
        }
        
        configData.apiUrl = apiUrl;
        configData.chatflowId = chatflowId;
    } else if (provider === 'ollama') {
        const baseUrl = document.getElementById('ollamaBaseUrl').value.trim();
        const model = document.getElementById('ollamaModel').value;
        
        if (!baseUrl || !model) {
            showFeedback('Please fill in Ollama base URL and select a model', 'error');
            return;
        }
        
        configData.ollamaBaseUrl = baseUrl;
        configData.ollamaModel = model;
    } else if (provider === 'none') {
        // Clear all provider-specific fields so they don't linger
        configData.apiUrl = '';
        configData.chatflowId = '';
        configData.ollamaBaseUrl = '';
        configData.ollamaModel = '';
    }
    
    button.textContent = 'Updating...';
    button.disabled = true;
    
    try {
        const response = await fetch('/api/chat-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(configData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            loadChatConfig();
            showFeedback('Chat configuration updated successfully!', 'success');
        } else {
            showFeedback('Failed to update chat configuration', 'error');
        }
    } catch (error) {
        console.error('Update chat config error:', error);
        showFeedback('Failed to update chat configuration', 'error');
    } finally {
        button.textContent = 'Update Chat Config';
        button.disabled = false;
    }
}

/**
 * Load filter configuration for admin panel
 */
async function loadAdminFilterConfig() {
    try {
        const response = await fetch('/api/filter-config');
        const result = await response.json();
        
        if (result.success && result.config) {
            document.getElementById('filterEnabled').checked = result.config.enabled || false;
            document.getElementById('filterKeyword').value = result.config.keyword || '</think>';
        }
    } catch (error) {
        console.error('Load admin filter config error:', error);
    }
}

/**
 * Update filter configuration
 */
async function updateFilterConfig() {
    const enabled = document.getElementById('filterEnabled').checked;
    const keyword = document.getElementById('filterKeyword').value.trim();
    const button = event.target;
    
    button.textContent = 'Updating...';
    button.disabled = true;
    
    try {
        const response = await fetch('/api/filter-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: enabled, keyword: keyword })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showFeedback('Filter configuration updated successfully!', 'success');
        } else {
            showFeedback('Failed to update filter configuration', 'error');
        }
    } catch (error) {
        console.error('Update filter config error:', error);
        showFeedback('Failed to update filter configuration', 'error');
    } finally {
        button.textContent = 'Update Filter Config';
        button.disabled = false;
    }
}

/**
 * Load color configuration for admin panel
 */
async function loadAdminColorConfig() {
    try {
        const response = await fetch('/api/color-config');
        const result = await response.json();
        
        if (result.success && result.config) {
            const primaryColor = result.config.primaryColor || '#330099';
            document.getElementById('primaryColorPicker').value = primaryColor;
            document.getElementById('primaryColorText').value = primaryColor;
            applyColorTheme(primaryColor);
        }
    } catch (error) {
        console.error('Load admin color config error:', error);
    }
}

/**
 * Update color configuration
 */
async function updateColorConfig() {
    const primaryColor = document.getElementById('primaryColorText').value.trim() || 
                        document.getElementById('primaryColorPicker').value;
    const button = event.target;
    
    if (!/^#[0-9A-F]{6}$/i.test(primaryColor)) {
        showFeedback('Please enter a valid hex color code (e.g., #330099)', 'error');
        return;
    }
    
    button.textContent = 'Updating...';
    button.disabled = true;
    
    try {
        const response = await fetch('/api/color-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ primaryColor: primaryColor })
        });
        
        const result = await response.json();
        
        if (result.success) {
            applyColorTheme(primaryColor);
            showFeedback('Site color updated successfully!', 'success');
        } else {
            showFeedback(result.error || 'Failed to update site color', 'error');
        }
    } catch (error) {
        console.error('Update color config error:', error);
        showFeedback('Failed to update site color', 'error');
    } finally {
        button.textContent = 'Update Site Color';
        button.disabled = false;
    }
}

/**
 * Apply color theme to the entire site
 */
function applyColorTheme(primaryColor) {
    const root = document.documentElement;
    
    // Convert hex to RGB for calculations
    const hex = primaryColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Create color variations
    const variations = generateColorVariations(r, g, b);
    
    // Apply basic CSS custom properties
    root.style.setProperty('--primary-color', primaryColor);
    root.style.setProperty('--primary-dark', variations.dark);
    root.style.setProperty('--primary-light', variations.light);
    root.style.setProperty('--primary-muted', variations.muted);
    root.style.setProperty('--primary-background', variations.background);
    root.style.setProperty('--primary-accent', variations.accent);
    
    // Apply vibrancy variations
    root.style.setProperty('--vibrant-color', variations.vibrant);
    root.style.setProperty('--desaturated-color', variations.desaturated);
    root.style.setProperty('--electric-color', variations.electric);
    root.style.setProperty('--soft-color', variations.soft);
    
    // Apply complementary colors
    root.style.setProperty('--inverted-color', variations.inverted);
    root.style.setProperty('--inverted-vibrant', variations.invertedVibrant);
    root.style.setProperty('--inverted-soft', variations.invertedSoft);
    
    // Apply analogous colors
    root.style.setProperty('--analogous-1', variations.analogous1);
    root.style.setProperty('--analogous-2', variations.analogous2);
    root.style.setProperty('--analogous-vibrant-1', variations.analogousVibrant1);
    root.style.setProperty('--analogous-vibrant-2', variations.analogousVibrant2);
    
    // Apply split complementary
    root.style.setProperty('--split-comp-1', variations.splitComp1);
    root.style.setProperty('--split-comp-2', variations.splitComp2);
    
    // Apply triadic colors
    root.style.setProperty('--triadic-1', variations.triadic1);
    root.style.setProperty('--triadic-2', variations.triadic2);
    
    // Apply action colors
    root.style.setProperty('--edit-color', variations.edit);
    root.style.setProperty('--delete-color', variations.delete);
    root.style.setProperty('--success-color', variations.success);
    root.style.setProperty('--warning-color', variations.warning);
    
    // Apply special purpose colors
    root.style.setProperty('--highlight-color', variations.highlight);
    root.style.setProperty('--subtle-color', variations.subtle);
    root.style.setProperty('--glow-color', variations.glow);
    root.style.setProperty('--contrast-color', variations.contrast);
    
    // Apply background variations
    root.style.setProperty('--animation-bg', variations.animationBg);
    root.style.setProperty('--card-bg', variations.cardBg);
    root.style.setProperty('--hover-bg', variations.hoverBg);
    root.style.setProperty('--active-bg', variations.activeBg);
    
    // Background is always dark (#0a0a0f), so text should always be light for readability
    // Only the accent color should use the theme color, other text should remain light
    const textColors = {
        primary: '#ffffff',
        secondary: '#b8c5d6',
        muted: '#8b9299',
        accent: primaryColor
    };
    
    // Status colors should also remain bright for visibility on dark background
    const statusColors = {
        green: '#00ff88',
        pink: '#ff0080',
        orange: '#ff8800',
        blue: '#00f5ff',
        purple: '#bf00ff'
    };
    
    // Apply responsive text colors
    root.style.setProperty('--text-primary', textColors.primary);
    root.style.setProperty('--text-secondary', textColors.secondary);
    root.style.setProperty('--text-muted', textColors.muted);
    root.style.setProperty('--text-accent', textColors.accent);
    
    // Apply responsive status/neon colors
    root.style.setProperty('--neon-green', statusColors.green);
    root.style.setProperty('--neon-pink', statusColors.pink);
    root.style.setProperty('--neon-orange', statusColors.orange);
    root.style.setProperty('--neon-blue', statusColors.blue);
    root.style.setProperty('--neon-purple', statusColors.purple);
    
    // Update status indicator shadow colors to match
    const shadowOpacity = '0.3';
    const glowOpacity = '0.5';
    
    // Convert hex to RGB for shadows
    const greenRgb = statusColors.green.replace('#', '');
    const pinkRgb = statusColors.pink.replace('#', '');
    const orangeRgb = statusColors.orange.replace('#', '');
    
    const greenR = parseInt(greenRgb.substr(0, 2), 16);
    const greenG = parseInt(greenRgb.substr(2, 2), 16);
    const greenB = parseInt(greenRgb.substr(4, 2), 16);
    
    const pinkR = parseInt(pinkRgb.substr(0, 2), 16);
    const pinkG = parseInt(pinkRgb.substr(2, 2), 16);
    const pinkB = parseInt(pinkRgb.substr(4, 2), 16);
    
    const orangeR = parseInt(orangeRgb.substr(0, 2), 16);
    const orangeG = parseInt(orangeRgb.substr(2, 2), 16);
    const orangeB = parseInt(orangeRgb.substr(4, 2), 16);
    
    // Apply updated shadow colors
    root.style.setProperty('--status-green-shadow', `rgba(${greenR}, ${greenG}, ${greenB}, ${shadowOpacity})`);
    root.style.setProperty('--status-green-glow', `rgba(${greenR}, ${greenG}, ${greenB}, ${glowOpacity})`);
    root.style.setProperty('--status-pink-shadow', `rgba(${pinkR}, ${pinkG}, ${pinkB}, ${shadowOpacity})`);
    root.style.setProperty('--status-pink-glow', `rgba(${pinkR}, ${pinkG}, ${pinkB}, ${glowOpacity})`);
    root.style.setProperty('--status-orange-shadow', `rgba(${orangeR}, ${orangeG}, ${orangeB}, ${shadowOpacity})`);
    root.style.setProperty('--status-orange-glow', `rgba(${orangeR}, ${orangeG}, ${orangeB}, ${glowOpacity})`);
    
    // Background is always dark, so glass morphism should use white overlays
    const glassColor = '255, 255, 255';
    const shadowColor = '0, 0, 0';
    
    root.style.setProperty('--glass-bg', `rgba(${glassColor}, 0.02)`);
    root.style.setProperty('--glass-border', `rgba(${glassColor}, 0.05)`);
    root.style.setProperty('--glass-shadow', `rgba(${shadowColor}, 0.3)`);
    
    // Update various opacity levels for glass morphism
    root.style.setProperty('--glass-bg-01', `rgba(${glassColor}, 0.01)`);
    root.style.setProperty('--glass-bg-02', `rgba(${glassColor}, 0.02)`);
    root.style.setProperty('--glass-bg-03', `rgba(${glassColor}, 0.03)`);
    root.style.setProperty('--glass-bg-05', `rgba(${glassColor}, 0.05)`);
    root.style.setProperty('--glass-bg-08', `rgba(${glassColor}, 0.08)`);
    root.style.setProperty('--glass-bg-10', `rgba(${glassColor}, 0.1)`);
    root.style.setProperty('--glass-bg-15', `rgba(${glassColor}, 0.15)`);
    root.style.setProperty('--glass-bg-20', `rgba(${glassColor}, 0.2)`);
    
    // Update animation colors if web animation exists
    if (window.updateAnimationColors) {
        window.updateAnimationColors(primaryColor, variations);
    }
    
    // Apply category-specific colors for visual distinction
    applyCategoryColors(variations);
    
    // Update favicon color
    updateFavicon(primaryColor);
}

/**
 * Generate color variations from RGB values
 */
function generateColorVariations(r, g, b) {
    // Convert to HSL for better color manipulation
    const hsl = rgbToHsl(r, g, b);
    
    return {
        // Basic variations
        dark: `rgb(${Math.floor(r * 0.7)}, ${Math.floor(g * 0.7)}, ${Math.floor(b * 0.7)})`,
        light: `rgb(${Math.min(255, Math.floor(r * 1.3))}, ${Math.min(255, Math.floor(g * 1.3))}, ${Math.min(255, Math.floor(b * 1.3))})`,
        muted: `rgba(${r}, ${g}, ${b}, 0.6)`,
        background: `rgba(${r}, ${g}, ${b}, 0.05)`,
        accent: `rgba(${r}, ${g}, ${b}, 0.8)`,
        
        // Saturation and vibrancy variations
        vibrant: hslToRgb(hsl.h, Math.min(1, hsl.s * 1.4), Math.min(1, hsl.l * 1.1)), // High saturation, bright
        desaturated: hslToRgb(hsl.h, hsl.s * 0.3, hsl.l), // Low saturation, same lightness
        electric: hslToRgb(hsl.h, Math.min(1, hsl.s * 1.6), Math.min(1, hsl.l * 1.3)), // Maximum vibrancy
        soft: hslToRgb(hsl.h, hsl.s * 0.6, Math.min(1, hsl.l * 1.15)), // Soft, pleasant variant
        
        // Complementary color family
        inverted: hslToRgb((hsl.h + 180) % 360, hsl.s, hsl.l), // Direct complement
        invertedVibrant: hslToRgb((hsl.h + 180) % 360, Math.min(1, hsl.s * 1.3), Math.min(1, hsl.l * 1.1)), // Vibrant complement
        invertedSoft: hslToRgb((hsl.h + 180) % 360, hsl.s * 0.7, hsl.l), // Soft complement
        
        // Analogous colors (neighboring hues)
        analogous1: hslToRgb((hsl.h + 30) % 360, hsl.s, hsl.l), // +30 degrees
        analogous2: hslToRgb((hsl.h - 30 + 360) % 360, hsl.s, hsl.l), // -30 degrees
        analogousVibrant1: hslToRgb((hsl.h + 25) % 360, Math.min(1, hsl.s * 1.2), Math.min(1, hsl.l * 1.1)),
        analogousVibrant2: hslToRgb((hsl.h - 25 + 360) % 360, Math.min(1, hsl.s * 1.2), Math.min(1, hsl.l * 1.1)),
        
        // Split complementary
        splitComp1: hslToRgb((hsl.h + 150) % 360, hsl.s, hsl.l),
        splitComp2: hslToRgb((hsl.h + 210) % 360, hsl.s, hsl.l),
        
        // Triadic colors
        triadic1: hslToRgb((hsl.h + 120) % 360, hsl.s, hsl.l),
        triadic2: hslToRgb((hsl.h + 240) % 360, hsl.s, hsl.l),
        
        // Action-specific variations using color theory
        edit: hslToRgb((hsl.h + 15) % 360, Math.min(1, hsl.s * 1.1), Math.min(1, hsl.l * 1.1)), // Slightly shifted, brighter
        delete: hslToRgb((hsl.h + 180) % 360, Math.min(1, hsl.s * 1.2), hsl.l * 0.9), // Complementary, darker
        success: hslToRgb((hsl.h + 30) % 360, hsl.s * 0.9, Math.min(1, hsl.l * 1.2)), // Analogous, lighter
        warning: hslToRgb((hsl.h - 30 + 360) % 360, Math.min(1, hsl.s * 1.1), hsl.l * 0.95), // Other analogous
        
        // Special purpose colors
        highlight: hslToRgb(hsl.h, Math.min(1, hsl.s * 1.5), Math.min(1, hsl.l * 1.4)), // Maximum attention
        subtle: hslToRgb(hsl.h, hsl.s * 0.4, Math.min(1, hsl.l * 1.3)), // Barely noticeable
        glow: `rgba(${r}, ${g}, ${b}, 0.3)`, // For glowing effects
        
        // Contrast and accessibility
        contrast: hslToRgb(hsl.h, hsl.s, hsl.l > 0.5 ? 0.1 : 0.9), // High contrast
        
        // Background variations - ensure minimum contrast
        animationBg: generateSafeBackground(r, g, b, 0.15),
        cardBg: `rgba(${r}, ${g}, ${b}, 0.08)`,
        hoverBg: `rgba(${r}, ${g}, ${b}, 0.12)`,
        activeBg: `rgba(${r}, ${g}, ${b}, 0.2)`
    };
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    
    return { h: h * 360, s, l };
}

/**
 * Convert HSL to RGB string
 */
function hslToRgb(h, s, l) {
    h /= 360;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
        const k = (n + h * 12) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color);
    };
    
    return `rgb(${f(0)}, ${f(8)}, ${f(4)})`;
}

/**
 * Generate a safe background color that maintains readability
 */
function generateSafeBackground(r, g, b, factor) {
    const luminance = getRelativeLuminance(r, g, b);
    
    // For very light colors (white/near-white), make background darker
    if (luminance > 0.9) {
        return `rgb(${Math.floor(r * 0.05)}, ${Math.floor(g * 0.05)}, ${Math.floor(b * 0.05)})`;
    }
    // For very dark colors (black/near-black), make background lighter
    else if (luminance < 0.1) {
        return `rgb(${Math.min(255, Math.floor(r + 30))}, ${Math.min(255, Math.floor(g + 30))}, ${Math.min(255, Math.floor(b + 30))})`;
    }
    // For normal colors, use the provided factor
    else {
        return `rgb(${Math.floor(r * factor)}, ${Math.floor(g * factor)}, ${Math.floor(b * factor)})`;
    }
}

/**
 * Calculate relative luminance according to WCAG 2.1
 */
function getRelativeLuminance(r, g, b) {
    // Normalize RGB values
    const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    // Apply luminance formula
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Apply category-specific colors for visual distinction
 */
function applyCategoryColors(variations) {
    const colorVariations = [
        variations.analogous1,
        variations.analogous2,
        variations.splitComp1,
        variations.splitComp2,
        variations.triadic1,
        variations.triadic2,
        variations.analogousVibrant1,
        variations.analogousVibrant2,
        variations.invertedVibrant,
        variations.electric
    ];
    
    // Apply colors to category sections
    const categoryTitles = document.querySelectorAll('.category-title');
    categoryTitles.forEach((title, index) => {
        const colorIndex = index % colorVariations.length;
        const categoryColor = colorVariations[colorIndex];
        
        // Update the category title gradient
        title.style.background = `linear-gradient(90deg, ${categoryColor}, ${variations.vibrant}, ${variations.highlight})`;
        title.style.backgroundClip = 'text';
        title.style.webkitBackgroundClip = 'text';
        title.style.webkitTextFillColor = 'transparent';
        
        // Update the underline
        const afterElement = title.querySelector('::after');
        title.style.setProperty('--category-color', categoryColor);
    });
    
    // Apply automatic text color adjustment to all buttons
    adjustAllButtonTextColors();
}

/**
 * Calculate luminance of a color to determine if it's light or dark
 */
function calculateLuminance(r, g, b) {
    // Normalize RGB values
    const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    // Calculate relative luminance
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Determine if a color is light or dark
 */
function isLightColor(r, g, b) {
    const luminance = calculateLuminance(r, g, b);
    return luminance > 0.5; // Threshold for light vs dark
}

/**
 * Parse RGB string and extract values
 */
function parseRgbValues(rgbString) {
    const match = rgbString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
        return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    }
    return [0, 0, 0]; // fallback
}

/**
 * Get appropriate text color for a given background color using WCAG guidelines
 */
function getContrastTextColor(backgroundColorRgb, animationBgRgb) {
    const [r, g, b] = backgroundColorRgb;
    
    // Calculate relative luminance using WCAG 2.1 formula
    const luminance = getRelativeLuminance(r, g, b);
    
    // Use luminance threshold for better accessibility
    // 0.5 is the midpoint, but we adjust for better readability
    if (luminance > 0.4) {
        // Light background - use dark text
        // For very light backgrounds, use pure black for maximum contrast
        if (luminance > 0.8) {
            return '#000000';
        } else {
            // Medium-light backgrounds get a dark gray
            return '#1a1a1a';
        }
    } else {
        // Dark background - use light text
        // For very dark backgrounds, use pure white
        if (luminance < 0.1) {
            return '#ffffff';
        } else {
            // Medium-dark backgrounds get a light gray
            return '#f0f0f0';
        }
    }
}

/**
 * Adjust all button text colors based on their background brightness
 */
function adjustAllButtonTextColors() {
    const root = document.documentElement;
    
    // Get all the color variations used in buttons
    const primaryColor = getComputedStyle(root).getPropertyValue('--primary-color').trim();
    const vibrantColor = getComputedStyle(root).getPropertyValue('--vibrant-color').trim();
    const electricColor = getComputedStyle(root).getPropertyValue('--electric-color').trim();
    const editColor = getComputedStyle(root).getPropertyValue('--edit-color').trim();
    const deleteColor = getComputedStyle(root).getPropertyValue('--delete-color').trim();
    const successColor = getComputedStyle(root).getPropertyValue('--success-color').trim();
    const warningColor = getComputedStyle(root).getPropertyValue('--warning-color').trim();
    const invertedColor = getComputedStyle(root).getPropertyValue('--inverted-color').trim();
    const animationBg = getComputedStyle(root).getPropertyValue('--animation-bg').trim();
    
    // Parse animation background for contrast calculations
    const animationBgRgb = parseRgbValues(animationBg);
    
    // Adjust redirect buttons
    const redirectButtons = document.querySelectorAll('.redirect-btn');
    const vibrantRgb = parseRgbValues(vibrantColor);
    redirectButtons.forEach(button => {
        button.style.color = getContrastTextColor(vibrantRgb, animationBgRgb);
    });
    
    // Adjust edit buttons
    const editButtons = document.querySelectorAll('.edit-btn');
    const editRgb = parseRgbValues(editColor);
    editButtons.forEach(button => {
        button.style.color = getContrastTextColor(editRgb, animationBgRgb);
    });
    
    // Adjust delete buttons
    const deleteButtons = document.querySelectorAll('.delete-btn');
    const deleteRgb = parseRgbValues(deleteColor);
    deleteButtons.forEach(button => {
        button.style.color = getContrastTextColor(deleteRgb, animationBgRgb);
    });
    
    // Adjust save buttons
    const saveButtons = document.querySelectorAll('.save-btn');
    const successRgb = parseRgbValues(successColor);
    saveButtons.forEach(button => {
        button.style.color = getContrastTextColor(successRgb, animationBgRgb);
    });
    
    // Adjust admin buttons
    const adminButtons = document.querySelectorAll('.admin-btn');
    const primaryRgb = parseRgbValues(primaryColor);
    adminButtons.forEach(button => {
        button.style.color = getContrastTextColor(primaryRgb, animationBgRgb);
    });
    
    // Adjust logout buttons (uses inverted color)
    const logoutButtons = document.querySelectorAll('.logout-btn');
    const invertedRgb = parseRgbValues(invertedColor);
    logoutButtons.forEach(button => {
        button.style.color = getContrastTextColor(invertedRgb, animationBgRgb);
    });
    
    // Adjust form buttons
    const formButtons = document.querySelectorAll('.admin-form button');
    formButtons.forEach(button => {
        if (!button.classList.contains('edit-btn') && 
            !button.classList.contains('delete-btn') && 
            !button.classList.contains('save-btn') &&
            !button.classList.contains('cancel-btn')) {
            button.style.color = getContrastTextColor(primaryRgb, animationBgRgb);
        }
    });
    
    // Adjust admin tabs
    const adminTabs = document.querySelectorAll('.admin-tab');
    adminTabs.forEach(tab => {
        // Active tabs use gradient-accent, inactive tabs use transparent background
        if (tab.classList.contains('active')) {
            // Use primary color for active tab background analysis
            tab.style.color = getContrastTextColor(primaryRgb, animationBgRgb);
        } else {
            // Inactive tabs have transparent background, use a light readable color
            tab.style.color = 'var(--text-secondary)';
        }
    });
    
    // Adjust admin access button (⚙️ Admin)
    const adminAccessButtons = document.querySelectorAll('.admin-access-btn');
    adminAccessButtons.forEach(button => {
        // Uses glass background, so use readable secondary text color
        button.style.color = 'var(--text-secondary)';
    });
    
    // Adjust AI chat send button
    const sendButtons = document.querySelectorAll('.send-button');
    sendButtons.forEach(button => {
        button.style.color = getContrastTextColor(primaryRgb, animationBgRgb);
    });
    
    // Adjust other action buttons
    const actionButtons = document.querySelectorAll('button[onclick]');
    actionButtons.forEach(button => {
        if (!button.classList.contains('edit-btn') && 
            !button.classList.contains('delete-btn') && 
            !button.classList.contains('save-btn') &&
            !button.classList.contains('admin-btn') &&
            !button.classList.contains('logout-btn') &&
            !button.classList.contains('cancel-btn') &&
            !button.classList.contains('redirect-btn') &&
            !button.classList.contains('admin-tab') &&
            !button.classList.contains('send-button')) {
            button.style.color = getContrastTextColor(primaryRgb, animationBgRgb);
        }
    });
}


/**
 * Sync color picker inputs
 */
function syncColorInputs() {
    const colorPicker = document.getElementById('primaryColorPicker');
    const colorText = document.getElementById('primaryColorText');
    
    if (colorPicker && colorText) {
        colorPicker.addEventListener('input', function() {
            colorText.value = this.value;
        });
        
        colorText.addEventListener('input', function() {
            if (/^#[0-9A-F]{6}$/i.test(this.value)) {
                colorPicker.value = this.value;
            }
        });
    }
}

// =============================================================================
// CHAT FUNCTIONALITY
// =============================================================================

/**
 * Create chatbox HTML structure
 */
function createChatboxHTML() {
    const provider = chatConfig?.provider || 'flowise';
    const modelInfo = provider === 'ollama' && chatConfig?.ollamaModel ? ` (${chatConfig.ollamaModel})` : '';
    
    // Build header title
    const headerTitle = `AI Assistant${modelInfo}`;
    
    return `
        <div class="chatbox-container">
            <div class="chatbox-header">
                <h3>${headerTitle}</h3>
                <button class="chatbox-clear" onclick="clearConversation()">×</button>
            </div>
            <div class="chatbox-messages" id="chatMessages">
                <div class="chat-message bot">
                    <div class="message-content">Hello! How can I help you today?</div>
                </div>
            </div>
            <div class="chatbox-input">
                <input type="file" id="imageInput" accept="image/*" style="display: none" onchange="handleImageUpload()">
                <button class="image-button" onclick="document.getElementById('imageInput').click()" ${provider === 'ollama' ? 'style="opacity: 0.5;" title="Image uploads not supported with Ollama"' : ''}>📷</button>
                <input type="text" id="chatInput" placeholder="Type your message..." onkeypress="handleChatKeypress(event)">
                <button class="send-button" onclick="sendMessage()">Send</button>
            </div>
        </div>
    `;
}

/**
 * Initialize chatbox with configuration
 */
function initializeChatbox(config) {
    chatConfig = config;
}

/**
 * Insert chatbox into links section
 */
function insertChatboxInLinks() {
    const hasFlowise = chatConfig && chatConfig.provider === 'flowise' && chatConfig.apiUrl && chatConfig.chatflowId;
    const hasOllama = chatConfig && chatConfig.provider === 'ollama' && chatConfig.ollamaBaseUrl && chatConfig.ollamaModel;
    if (chatboxHTML && (hasFlowise || hasOllama)) {
        const linksList = document.getElementById('linksList');
        const existingChatbox = document.getElementById('chatboxInLinks');
        
        // Remove existing chatbox if present
        if (existingChatbox) {
            existingChatbox.remove();
        }
        
        // Create chatbox container
        const chatboxContainer = document.createElement('div');
        chatboxContainer.id = 'chatboxInLinks';
        chatboxContainer.innerHTML = chatboxHTML;
        
        linksList.appendChild(chatboxContainer);
        
        // Re-initialize chatbox functionality
        initializeChatbox(chatConfig);
    }
}

/**
 * Clear chat conversation
 */
function clearConversation() {
    const messagesContainer = document.getElementById('chatMessages');
    if (messagesContainer) {
        messagesContainer.innerHTML = `
            <div class="chat-message bot">
                <div class="message-content">Hello! How can I help you today?</div>
            </div>
        `;
    }
}

/**
 * Show typing indicator
 */
function showTypingIndicator() {
    const messagesContainer = document.getElementById('chatMessages');
    if (messagesContainer) {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-message bot typing-message';
        typingDiv.id = 'typingIndicator';
        typingDiv.innerHTML = `
            <div class="message-content">
                <div class="typing-indicator">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
            </div>
        `;
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

/**
 * Hide typing indicator
 */
function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

/**
 * Handle Enter key in chat input
 */
function handleChatKeypress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

/**
 * Send text message to AI
 */
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message || !chatConfig) return;
    
    addMessageToChat('You', message, 'user');
    input.value = '';
    
    // Show typing indicator
    showTypingIndicator();
    
    try {
        let response, result;
        
        if (chatConfig.provider === 'ollama') {
            // Proxy through backend to avoid CORS
            response = await fetch('/api/ollama-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });
            
            result = await response.json();
            
            // Hide typing indicator
            hideTypingIndicator();
            
            if (result && result.choices && result.choices[0] && result.choices[0].message) {
                const cleanText = processResponseText(result.choices[0].message.content);
                addMessageToChat('AI Assistant', cleanText, 'bot');
            } else {
                addMessageToChat('AI Assistant', 'Sorry, I encountered an error processing your request.', 'bot');
            }
        } else {
            // Flowise API call (default)
            response = await fetch(chatConfig.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    question: message,
                    chatflowid: chatConfig.chatflowId 
                })
            });
            
            result = await response.json();
            
            // Hide typing indicator
            hideTypingIndicator();
            
            if (result && result.text) {
                const extractedMedia = extractMediaFromText(result.text);
                const cleanText = processResponseText(result.text);
                
                addMessageToChat('AI Assistant', cleanText, 'bot', extractedMedia.images, extractedMedia.videos);
            } else {
                addMessageToChat('AI Assistant', 'Sorry, I encountered an error processing your request.', 'bot');
            }
        }
    } catch (error) {
        console.error('Chat error:', error);
        // Hide typing indicator on error
        hideTypingIndicator();
        addMessageToChat('AI Assistant', 'Sorry, I encountered an error connecting to the service.', 'bot');
    }
}

/**
 * Handle image upload
 */
function handleImageUpload() {
    const fileInput = document.getElementById('imageInput');
    const file = fileInput.files[0];
    
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const imageData = e.target.result;
        addImageToChat('You', imageData, 'user');
        sendImageMessage(imageData);
    };
    reader.readAsDataURL(file);
}

/**
 * Send image message to AI
 */
async function sendImageMessage(imageData) {
    if (!chatConfig) return;
    
    // Show typing indicator
    showTypingIndicator();
    
    try {
        if (chatConfig.provider === 'ollama') {
            // Hide typing indicator
            hideTypingIndicator();
            
            // Ollama doesn't support image uploads in this implementation
            addMessageToChat('AI Assistant', 'Image analysis is not available with Ollama endpoints in this configuration. Please switch to Flowise or send a text message instead.', 'bot');
            return;
        }
        
        // Flowise image processing
        const mimeMatch = imageData.match(/data:([^;]+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
        const extension = mimeType.split('/')[1] || 'png';
        
        const response = await fetch(chatConfig.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                question: 'Please analyze this image',
                chatflowid: chatConfig.chatflowId,
                uploads: [{
                    data: imageData,
                    type: "file",
                    name: `image.${extension}`,
                    mime: mimeType
                }]
            })
        });
        
        const result = await response.json();
        
        // Hide typing indicator
        hideTypingIndicator();
        
        if (result && result.text) {
            const extractedMedia = extractMediaFromText(result.text);
            const cleanText = processResponseText(result.text);
            
            addMessageToChat('AI Assistant', cleanText, 'bot', extractedMedia.images, extractedMedia.videos);
        } else {
            addMessageToChat('AI Assistant', 'Sorry, I encountered an error processing your image.', 'bot');
        }
    } catch (error) {
        console.error('Image chat error:', error);
        // Hide typing indicator on error
        hideTypingIndicator();
        addMessageToChat('AI Assistant', 'Sorry, I encountered an error processing your image.', 'bot');
    }
}

/**
 * Add message to chat interface
 */
function addMessageToChat(sender, message, type, images = null, videos = null) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    // Escape HTML and convert newlines to <br> tags
    const escapedMessage = message.replace(/&/g, '&amp;')
                                 .replace(/</g, '&lt;')
                                 .replace(/>/g, '&gt;')
                                 .replace(/"/g, '&quot;')
                                 .replace(/'/g, '&#x27;');
    messageContent.innerHTML = escapedMessage.replace(/\n/g, '<br>');
    
    messageDiv.appendChild(messageContent);
    
    // Add images if present
    if (images && Array.isArray(images) && images.length > 0) {
        images.forEach(imageUrl => {
            const img = document.createElement('img');
            img.src = imageUrl;
            img.className = 'response-image';
            img.alt = 'Generated image';
            img.style.maxWidth = '300px';
            img.style.height = 'auto';
            img.style.borderRadius = '8px';
            img.style.margin = '8px 0';
            img.style.border = '1px solid rgba(255, 255, 255, 0.2)';
            img.style.cursor = 'pointer';
            
            img.onclick = () => window.open(imageUrl, '_blank');
            
            messageDiv.appendChild(img);
        });
    }
    
    // Add videos if present
    if (videos && Array.isArray(videos) && videos.length > 0) {
        videos.forEach(videoUrl => {
            const video = document.createElement('video');
            video.src = videoUrl;
            video.className = 'response-video';
            video.controls = true;
            video.style.maxWidth = '400px';
            video.style.height = 'auto';
            video.style.borderRadius = '8px';
            video.style.margin = '8px 0';
            video.style.border = '1px solid rgba(255, 255, 255, 0.2)';
            video.style.backgroundColor = '#000';
            
            video.onerror = () => {
                // Create fallback link on video error
                const fallbackLink = document.createElement('a');
                fallbackLink.href = videoUrl;
                fallbackLink.target = '_blank';
                fallbackLink.textContent = '🎬 Click to view video';
                fallbackLink.style.display = 'block';
                fallbackLink.style.padding = '10px';
                fallbackLink.style.background = 'rgba(255, 255, 255, 0.1)';
                fallbackLink.style.borderRadius = '8px';
                fallbackLink.style.margin = '8px 0';
                fallbackLink.style.textDecoration = 'none';
                fallbackLink.style.color = '#F5F5DC';
                
                messageDiv.replaceChild(fallbackLink, video);
            };
            
            messageDiv.appendChild(video);
        });
    }
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Add image to chat (for user uploads)
 */
function addImageToChat(sender, imageSrc, type) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const img = document.createElement('img');
    img.src = imageSrc;
    img.className = 'chat-image';
    img.style.maxWidth = '200px';
    img.style.height = 'auto';
    img.style.borderRadius = '8px';
    
    messageContent.appendChild(img);
    messageDiv.appendChild(messageContent);
    messagesContainer.appendChild(messageDiv);
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Extract media URLs from response text
 */
function extractMediaFromText(text) {
    const imageUrls = [];
    const videoUrls = [];
    
    // Extract markdown images: ![alt](url)
    const markdownImageRegex = /!\[.*?\]\((.*?)\)/g;
    let match;
    
    while ((match = markdownImageRegex.exec(text)) !== null) {
        const originalUrl = match[1];
        // Convert local ComfyUI URLs to proxy URLs
        if (originalUrl.includes('192.168.0.7:8188') || originalUrl.includes('localhost:8188')) {
            const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`;
            imageUrls.push(proxyUrl);
        } else {
            imageUrls.push(originalUrl);
        }
    }
    
    // Extract video player format: [Video Player] followed by URL
    const videoPlayerRegex = /\[Video Player\]\s*\n?\s*(https?:\/\/[^\s\n]+)/g;
    
    while ((match = videoPlayerRegex.exec(text)) !== null) {
        const originalUrl = match[1];
        // Convert local ComfyUI URLs to proxy URLs
        if (originalUrl.includes('192.168.0.7:8188') || originalUrl.includes('localhost:8188')) {
            const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`;
            videoUrls.push(proxyUrl);
        } else {
            videoUrls.push(originalUrl);
        }
    }
    
    return { images: imageUrls, videos: videoUrls };
}

/**
 * Process response text (apply filters, remove media markup)
 */
function processResponseText(text) {
    let processedText = text;
    
    // Apply filter if enabled
    if (filterConfig && filterConfig.enabled && filterConfig.keyword) {
        const keywordIndex = processedText.indexOf(filterConfig.keyword);
        if (keywordIndex !== -1) {
            processedText = processedText.substring(keywordIndex + filterConfig.keyword.length).trim();
        }
    }
    
    // Remove markdown images and video player markup from text
    processedText = processedText.replace(/!\[.*?\]\(.*?\)/g, '').trim();
    processedText = processedText.replace(/\[Video Player\]\s*\n?\s*https?:\/\/[^\s\n]+/g, '').trim();
    
    return processedText;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show user feedback message
 */
function showFeedback(message, type) {
    const feedbackElement = document.getElementById('globalFeedback');
    const messageElement = document.getElementById('feedbackMessage');
    
    // Clear any existing timeout
    if (window.feedbackTimeout) {
        clearTimeout(window.feedbackTimeout);
    }
    
    // Set message and type
    messageElement.textContent = message;
    feedbackElement.className = `global-feedback ${type}`;
    
    // Show feedback
    feedbackElement.classList.remove('hidden');
    
    // Hide feedback after 4 seconds
    window.feedbackTimeout = setTimeout(() => {
        feedbackElement.classList.add('hidden');
    }, 4000);
}

/**
 * Dynamically update favicon using selected primary color
 */
function updateFavicon(primaryColor) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="${primaryColor}"/><circle cx="16" cy="16" r="8" fill="#0a0a0a"/></svg>`;
    const url = 'data:image/svg+xml;base64,' + btoa(svg);

    // Update or create link elements
    const rels = ['icon', 'apple-touch-icon'];
    rels.forEach(rel => {
        let link = document.querySelector(`link[rel="${rel}"]`);
        if (!link) {
            link = document.createElement('link');
            link.setAttribute('rel', rel);
            document.head.appendChild(link);
        }
        link.setAttribute('href', url);
    });
}

// =============================================================================
// PROJECT MANAGEMENT
// =============================================================================

let currentProjectFile = '';

async function loadProjectFiles() {
    try {
        const res = await fetch('/api/projects');
        const result = await res.json();
        if (result.success) {
            renderProjectFileList(result.files || []);
        }
    } catch (err) {
        console.error('Load project files error:', err);
    }
}

function renderProjectFileList(files) {
    const list = document.getElementById('projectFileList');
    if (!list) return;
    list.innerHTML = '';
    files.forEach(file => {
        const btn = document.createElement('button');
        btn.className = 'project-file-btn' + (file===currentProjectFile?' active':'');
        btn.type = 'button';
        btn.textContent = file.replace(/\.md$/i,'');
        btn.onclick = () => {
            console.log('Opening file',file);
            openProjectFile(file);
        };
        list.appendChild(btn);
    });
}

async function openProjectFile(filename) {
    try {
        const res = await fetch(`/api/projects/${encodeURIComponent(filename)}`);
        const result = await res.json();
        if (result.success) {
            currentProjectFile = filename;
            document.getElementById('projectTitle').value = filename.replace(/\.md$/i, '');
            const editorEl = document.getElementById('projectEditor');
            if (editorEl) {
                const html = window.marked ? marked.parse(result.content) : result.content;
                editorEl.innerHTML = html;
            }
            loadProjectFiles();
        } else {
            showFeedback(result.error || 'Failed to open file', 'error');
        }
    } catch (err) {
        console.error('Open project file error:', err);
        showFeedback('Failed to open file', 'error');
    }
}

async function createNewProjectFile() {
    // Save current file silently before creating new one
    if (currentProjectFile || document.getElementById('projectTitle').value.trim()) {
        await saveProjectFile(true);
    }
    
    currentProjectFile = '';
    document.getElementById('projectTitle').value = '';
    const editorEl = document.getElementById('projectEditor');
    if (editorEl) editorEl.innerHTML = '';
    
    // Refresh file list to show any newly saved file
    loadProjectFiles();
    
    // Update preview
    updateProjectPreview();
}

async function saveProjectFile() {
    const titleEl = document.getElementById('projectTitle');
    const editorEl = document.getElementById('projectEditor');
    if (!titleEl || !editorEl) return;
    let name = titleEl.value.trim();
    if (!name) {
        showFeedback('Please enter a file name', 'error');
        return;
    }
    if (!name.toLowerCase().endsWith('.md')) name += '.md';

    // Convert rich HTML to markdown
    let markdown = editorEl.innerText;
    if (window.TurndownService) {
        const turndownService = new TurndownService();
        markdown = turndownService.turndown(editorEl.innerHTML);
    }
 
    try {
        const res = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, content: markdown })
        });
        const result = await res.json();
        if (result.success) {
            currentProjectFile = name;
            showFeedback('File saved', 'success');
            loadProjectFiles();
        } else {
            showFeedback(result.error || 'Failed to save file', 'error');
        }
    } catch (err) {
        console.error('Save project file error:', err);
        showFeedback('Failed to save file', 'error');
    }
}

async function deleteProjectFile() {
    const titleVal = document.getElementById('projectTitle').value.trim();
    if (!titleVal && !currentProjectFile) return;
    if (!confirm('Delete this file?')) return;

    // Determine filename to delete (ensure .md extension)
    let filename = currentProjectFile || titleVal;
    if (!filename.toLowerCase().endsWith('.md')) filename += '.md';

    try {
        const res = await fetch(`/api/projects/${encodeURIComponent(filename)}`, { method: 'DELETE' });
        let result = null;
        try { result = await res.json(); } catch(e) { /* empty body */ }
        if ((result && result.success) || res.ok) {
            currentProjectFile = '';
            // Clear the editor without trying to save
            document.getElementById('projectTitle').value = '';
            const editorEl = document.getElementById('projectEditor');
            if (editorEl) editorEl.innerHTML = '';
            loadProjectFiles();
            showFeedback('File deleted', 'success');
        } else {
            showFeedback(result?.error || 'Failed to delete', 'error');
        }
    } catch (err) {
        console.error('Delete project file error:', err);
        showFeedback('Failed to delete file', 'error');
    }
}

/**
 * Apply basic markdown formatting to selected text in project editor
 */
function applyMarkdown(type) {
    const textarea = document.getElementById('projectFileContent');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);

    let replacement = selected;
    switch (type) {
        case 'bold':
            replacement = `**${selected || 'bold text'}**`;
            break;
        case 'italic':
            replacement = `*${selected || 'italic text'}*`;
            break;
        case 'h1':
            replacement = `# ${selected || 'Heading 1'}`;
            break;
        case 'h2':
            replacement = `## ${selected || 'Heading 2'}`;
            break;
        case 'h3':
            replacement = `### ${selected || 'Heading 3'}`;
            break;
        case 'bullet': {
            const lines = (selected || 'List item').split(/\n/).map(l => l.startsWith('- ') ? l : `- ${l}`);
            replacement = lines.join('\n');
            break;
        }
        case 'numbered': {
            const lines = (selected || 'List item').split(/\n/).map((l, idx) => `${idx + 1}. ${l.replace(/^\d+\.\s+/, '')}`);
            replacement = lines.join('\n');
            break;
        }
        default:
            break;
    }

    // Replace selection
    textarea.setRangeText(replacement, start, end, 'end');
    textarea.focus();
}

// Update preview when content changes
document.addEventListener('DOMContentLoaded', () => {
    const editor = document.getElementById('projectFileContent');
    if (editor) {
        editor.addEventListener('input', updateProjectPreview);
    }
});

function updateProjectPreview() {
    const text = document.getElementById('projectFileContent').value;
    const preview = document.getElementById('projectPreview');
    if (preview && window.marked) {
        preview.innerHTML = marked.parse(text);
    }
}

// also update preview when create new is handled in main createNewProjectFile function

function formatDoc(e, cmd){
    e.preventDefault();
    const editor = document.getElementById('projectEditor');
    editor.focus();
    document.execCommand(cmd,false,null);
}

function changeFontSize(e, delta){
    e.preventDefault();
    const editor = document.getElementById('projectEditor');
    editor.focus();
    const current = parseInt(document.queryCommandValue('fontSize')||3);
    const newSize = Math.max(1, Math.min(7, current+delta));
    document.execCommand('fontSize', false, newSize);
}

// Autosave support
let autosaveTimer = null;
function queueAutosave() {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
        saveProjectFile(true); // silent save
    }, 2000);
}

// Attach input listeners for autosave once DOM loaded
document.addEventListener('DOMContentLoaded', () => {
    const editor = document.getElementById('projectEditor');
    const titleInput = document.getElementById('projectTitle');
    if (editor) editor.addEventListener('input', queueAutosave);
    if (titleInput) titleInput.addEventListener('input', queueAutosave);
});

// Modify openProjectFile to autosave current before switching
async function openProjectFile(filename) {
    // save current edits silently first
    await saveProjectFile(true);
    try {
        const res = await fetch(`/api/projects/${encodeURIComponent(filename)}`);
        const result = await res.json();
        if (result.success) {
            currentProjectFile = filename;
            document.getElementById('projectTitle').value = filename.replace(/\.md$/i, '');
            const editorEl = document.getElementById('projectEditor');
            if (editorEl) {
                const html = window.marked ? marked.parse(result.content) : result.content;
                editorEl.innerHTML = html;
            }
            loadProjectFiles();
        } else {
            showFeedback(result.error || 'Failed to open file', 'error');
        }
    } catch (err) {
        console.error('Open project file error:', err);
        showFeedback('Failed to open file', 'error');
    }
}

// Modify saveProjectFile to accept silent param
async function saveProjectFile(silent=false) {
    const titleEl = document.getElementById('projectTitle');
    const editorEl = document.getElementById('projectEditor');
    if (!titleEl || !editorEl) return false;
    let name = titleEl.value.trim();
    if (!name) {
        if(!silent) showFeedback('Please enter a file name', 'error');
        return false;
    }
    if (!name.toLowerCase().endsWith('.md')) name += '.md';

    // Convert rich HTML to markdown
    let markdown = editorEl.innerText;
    if (window.TurndownService) {
        const turndownService = new TurndownService();
        markdown = turndownService.turndown(editorEl.innerHTML);
    }
    try {
        const res = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, content: markdown })
        });
        const result = await res.json();
        if (result.success) {
            currentProjectFile = name;
            if(!silent) showFeedback('File saved', 'success');
            loadProjectFiles();
            return true;
        } else {
            if(!silent) showFeedback(result.error || 'Failed to save file', 'error');
            return false;
        }
    } catch (err) {
        console.error('Save project file error:', err);
        if(!silent) showFeedback('Failed to save file', 'error');
        return false;
    }
}