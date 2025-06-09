/* ==========================================
   SIDEBAR FUNCTIONALITY
   Handles sidebar toggle, dropdown interactions, and responsive behavior
   ========================================== */

// Sidebar state management
let sidebarOpen = false;
let selectedModel = 'gemini-2.5-flash-preview-05-20'; // Default selection

// Initialize sidebar functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeSidebar();
    initializeDropdowns();
    handleResponsiveResize();
    updateTitle(); // Initialize title
});

// Initialize sidebar toggle functionality
function initializeSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const contentWrapper = document.querySelector('.content-wrapper');

    // Toggle sidebar
    sidebarToggle.addEventListener('click', toggleSidebar);
    
    // Close sidebar when clicking overlay (mobile)
    sidebarOverlay.addEventListener('click', closeSidebar);
    
    // Close sidebar on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && sidebarOpen) {
            closeSidebar();
        }
    });
}

// Toggle sidebar open/closed
function toggleSidebar() {
    if (sidebarOpen) {
        closeSidebar();
    } else {
        openSidebar();
    }
}

// Open sidebar
function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const contentWrapper = document.querySelector('.content-wrapper');
    
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('active');
    
    // Only adjust content margin on desktop
    if (window.innerWidth > 768) {
        contentWrapper.classList.add('sidebar-open');
    }
    
    sidebarOpen = true;
    
    // Update toggle button icon
    const toggleIcon = document.querySelector('#sidebarToggle .sidebar-icon');
    if (toggleIcon) {
        toggleIcon.textContent = '✕';
    }
}

// Close sidebar
function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const contentWrapper = document.querySelector('.content-wrapper');
    
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
    contentWrapper.classList.remove('sidebar-open');
    
    sidebarOpen = false;
    
    // Update toggle button icon
    const toggleIcon = document.querySelector('#sidebarToggle .sidebar-icon');
    if (toggleIcon) {
        toggleIcon.textContent = '☰';
    }
    
    // Close all dropdowns when sidebar closes
    closeAllDropdowns();
}

// Initialize dropdown functionality
function initializeDropdowns() {
    const dropdowns = document.querySelectorAll('.dropdown');
    
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        const menu = dropdown.querySelector('.dropdown-menu');
        const items = dropdown.querySelectorAll('.dropdown-item');
        
        // Toggle dropdown
        toggle.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // Close other dropdowns
            closeOtherDropdowns(dropdown);
            
            // Toggle current dropdown
            dropdown.classList.toggle('open');
        });
        
        // Handle item selection
        items.forEach(item => {
            item.addEventListener('click', function(e) {
                e.stopPropagation();
                
                // Update selection
                const dropdownType = dropdown.dataset.dropdown;
                const itemText = item.textContent.trim();
                
                if (dropdownType === 'models') {
                    selectModel(itemText, dropdown);
                }
                
                // Close dropdown
                dropdown.classList.remove('open');
            });
        });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', closeAllDropdowns);
}

// Select a model
function selectModel(modelName, dropdown) {
    selectedModel = modelName;
    
    // Update toggle text
    const toggle = dropdown.querySelector('.dropdown-toggle span');
    toggle.textContent = modelName;
    
    // Update selected state
    const items = dropdown.querySelectorAll('.dropdown-item');
    items.forEach(item => {
        item.classList.remove('selected');
        if (item.textContent.trim() === modelName) {
            item.classList.add('selected');
        }
    });
    
    // Update page title
    updateTitle();
    
    // Optional: Trigger model change event
    console.log('Model selected:', modelName);
    
    // You can add your model switching logic here
    // onModelChange(modelName);
}

// Update page title based on selected model
function updateTitle() {
    const titleElement = document.querySelector('.header h1');
    if (titleElement) {
        titleElement.textContent = `AI - ${selectedModel}`;
    }
}

// Close all dropdowns
function closeAllDropdowns() {
    const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
        dropdown.classList.remove('open');
    });
}

// Close other dropdowns except the current one
function closeOtherDropdowns(currentDropdown) {
    const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
        if (dropdown !== currentDropdown) {
            dropdown.classList.remove('open');
        }
    });
}

// Handle responsive behavior
function handleResponsiveResize() {
    window.addEventListener('resize', function() {
        const contentWrapper = document.querySelector('.content-wrapper');
        
        // Reset sidebar behavior on resize
        if (window.innerWidth <= 768) {
            contentWrapper.classList.remove('sidebar-open');
        } else if (sidebarOpen) {
            contentWrapper.classList.add('sidebar-open');
        }
    });
}

// Get current selected model (utility function)
function getSelectedModel() {
    return selectedModel;
}

// Set selected model programmatically (utility function)
function setSelectedModel(modelName) {
    const modelsDropdown = document.querySelector('[data-dropdown="models"]');
    if (modelsDropdown) {
        selectModel(modelName, modelsDropdown);
    }
}

// Update title when model changes externally
function updateModelAndTitle(modelName) {
    setSelectedModel(modelName);
    updateTitle();
}

// Export functions for external use
window.sidebarAPI = {
    toggle: toggleSidebar,
    open: openSidebar,
    close: closeSidebar,
    getSelectedModel: getSelectedModel,
    setSelectedModel: setSelectedModel,
    updateModelAndTitle: updateModelAndTitle
};
