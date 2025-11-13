/**
 * Siliguri College Notice Board - Main JavaScript
 * Production-quality dashboard with modern UX patterns
 */

// ==========================================
// Configuration & Constants
// ==========================================
const CONFIG = {
    CACHE_KEY: 'siliguri_notices_cache',
    CACHE_EXPIRY_MS: 5 * 60 * 1000, // 5 minutes
    NOTICES_FILE: 'notices.json',
    NEW_THRESHOLD_DAYS: 7,
    RECENT_THRESHOLD_DAYS: 30
};

// ==========================================
// State Management
// ==========================================
let state = {
    allNotices: [],
    filteredNotices: [],
    activeFilter: 'all', // 'all', 'recent', 'drive'
    searchQuery: '',
    sortBy: 'date-desc',
    isLoading: false
};

// ==========================================
// DOM Elements Cache
// ==========================================
const DOM = {
    // States
    loadingState: document.getElementById('loadingState'),
    errorState: document.getElementById('errorState'),
    emptyState: document.getElementById('emptyState'),
    noticesGrid: document.getElementById('noticesGrid'),
    
    // Search & Filters
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearch'),
    // These may be present under different IDs or implemented as pill buttons
    filterAll: document.getElementById('filterAll'),
    filterRecent: document.getElementById('filterRecent'),
    filterDrive: document.getElementById('filterDrive'),
    filterPillsContainer: document.querySelector('.filter-pills'),
    // sortSelect id in HTML may be 'sortSelect' (fallback to older 'sortBy')
    sortDropdown: document.getElementById('sortBy') || document.getElementById('sortSelect'),
    
    // Actions
    retryBtn: document.getElementById('retryBtn'),
    clearFiltersBtn: document.getElementById('clearFilters'),
    
    // Header
    syncTimestamp: document.getElementById('syncTimestamp')
};

// ==========================================
// Initialization
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    setupEventListeners();
    await loadNotices();
    // Ensure filter pills reflect the initial active filter on load
    setActiveFilter(state.activeFilter || 'all');
}

// ==========================================
// Event Listeners
// ==========================================
function setupEventListeners() {
    // Search
    DOM.searchInput?.addEventListener('input', debounce(handleSearch, 300));
    DOM.clearSearchBtn?.addEventListener('click', clearSearch);
    
    // Filter Pills: prefer delegated buttons inside .filter-pills for flexibility
    if (DOM.filterPillsContainer) {
        DOM.filterPillsContainer.addEventListener('click', (ev) => {
            const btn = ev.target.closest('.filter-pill');
            if (!btn) return;
            const filter = btn.getAttribute('data-filter') || 'all';
            setActiveFilter(filter);
        });
    } else {
        DOM.filterAll?.addEventListener('click', () => setActiveFilter('all'));
        DOM.filterRecent?.addEventListener('click', () => setActiveFilter('recent'));
        DOM.filterDrive?.addEventListener('click', () => setActiveFilter('drive'));
    }
    
    // Sort
    DOM.sortDropdown?.addEventListener('change', handleSortChange);
    
    // Actions
    DOM.retryBtn?.addEventListener('click', () => loadNotices(true));
    DOM.clearFiltersBtn?.addEventListener('click', clearAllFilters);
}

// ==========================================
// Data Loading
// ==========================================
async function loadNotices(forceRefresh = false) {
    try {
        setLoadingState(true);
        
        // Check cache unless force refresh
        if (!forceRefresh) {
            const cached = getCachedData();
            if (cached) {
                state.allNotices = cached.notices || [];
                updateSyncTimestamp(cached.scraped_at);
                applyFilters();
                setLoadingState(false);
                return;
            }
        }
        
        // Fetch fresh data
        const response = await fetch(CONFIG.NOTICES_FILE);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: Failed to fetch notices`);
        }
        
        const data = await response.json();
        state.allNotices = data.notices || [];
        
        // Cache the data
        setCachedData(data);
        
        // Update UI
        updateSyncTimestamp(data.scraped_at);
        applyFilters();
        setLoadingState(false);
        
    } catch (error) {
        console.error('Error loading notices:', error);
        showError(error.message);
    }
}

// ==========================================
// Cache Management
// ==========================================
function getCachedData() {
    try {
        const cached = localStorage.getItem(CONFIG.CACHE_KEY);
        if (!cached) return null;
        
        const { data, timestamp } = JSON.parse(cached);
        
        // Check expiry
        if (Date.now() - timestamp > CONFIG.CACHE_EXPIRY_MS) {
            localStorage.removeItem(CONFIG.CACHE_KEY);
            return null;
        }
        
        return data;
    } catch (error) {
        console.error('Cache read error:', error);
        return null;
    }
}

function setCachedData(data) {
    try {
        localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.error('Cache write error:', error);
    }
}

// ==========================================
// Filter & Search Logic
// ==========================================
function handleSearch(e) {
    state.searchQuery = e.target.value.trim().toLowerCase();
    applyFilters();
    
    // Show/hide clear button
    if (DOM.clearSearchBtn) {
        DOM.clearSearchBtn.style.display = state.searchQuery ? 'block' : 'none';
    }
}

function clearSearch() {
    state.searchQuery = '';
    if (DOM.searchInput) DOM.searchInput.value = '';
    if (DOM.clearSearchBtn) DOM.clearSearchBtn.style.display = 'none';
    applyFilters();
}

function setActiveFilter(filter) {
    state.activeFilter = filter;

    // Normalize possible filter keys (support 'withDrive' too)
    const normalized = (f) => (f === 'withDrive' ? 'drive' : f);
    const active = normalized(filter);

    // Update any .filter-pill buttons (delegated UI) so aria-pressed toggles correctly
    const pills = document.querySelectorAll('.filter-pill');
    if (pills && pills.length) {
        pills.forEach(p => {
            const f = normalized(p.getAttribute('data-filter') || 'all');
            p.setAttribute('aria-pressed', f === active ? 'true' : 'false');
        });
    }

    // Also keep any specific DOM cached elements in sync (if present)
    if (DOM.filterAll) DOM.filterAll.setAttribute('aria-pressed', active === 'all' ? 'true' : 'false');
    if (DOM.filterRecent) DOM.filterRecent.setAttribute('aria-pressed', active === 'recent' ? 'true' : 'false');
    if (DOM.filterDrive) DOM.filterDrive.setAttribute('aria-pressed', (active === 'drive') ? 'true' : 'false');

    applyFilters();
}

function handleSortChange(e) {
    // Map UI values to internal sort keys
    const val = e.target.value;
    if (val === 'newest') state.sortBy = 'date-desc';
    else if (val === 'oldest') state.sortBy = 'date-asc';
    else state.sortBy = val;
    applyFilters();
}

function clearAllFilters() {
    state.searchQuery = '';
    state.activeFilter = 'all';
    if (DOM.searchInput) DOM.searchInput.value = '';
    if (DOM.clearSearchBtn) DOM.clearSearchBtn.style.display = 'none';
    setActiveFilter('all');
}

function applyFilters() {
    let filtered = [...state.allNotices];
    
    // Apply search
    if (state.searchQuery) {
        filtered = filtered.filter(notice => 
            notice.title?.toLowerCase().includes(state.searchQuery) ||
            notice.date?.toLowerCase().includes(state.searchQuery)
        );
    }
    
    // Apply filter pills
    const now = Date.now();
    if (state.activeFilter === 'recent') {
        const cutoff = now - (CONFIG.RECENT_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(notice => {
            const noticeDate = parseNoticeDate(notice.date);
            return noticeDate.getTime() >= cutoff;
        });
    } else if (state.activeFilter === 'drive') {
        filtered = filtered.filter(notice => notice.google_drive);
    }
    
    // Apply sort
    filtered = sortNotices(filtered, state.sortBy);
    
    state.filteredNotices = filtered;
    
    // Update counts
    updateFilterCounts();
    
    // Render
    renderNotices();
}

function sortNotices(notices, sortBy) {
    const sorted = [...notices];
    
    switch (sortBy) {
        case 'date-desc':
            return sorted.sort((a, b) => 
                parseNoticeDate(b.date).getTime() - parseNoticeDate(a.date).getTime()
            );
        case 'date-asc':
            return sorted.sort((a, b) => 
                parseNoticeDate(a.date).getTime() - parseNoticeDate(b.date).getTime()
            );
        case 'title-asc':
            return sorted.sort((a, b) => 
                (a.title || '').localeCompare(b.title || '')
            );
        case 'title-desc':
            return sorted.sort((a, b) => 
                (b.title || '').localeCompare(a.title || '')
            );
        default:
            return sorted;
    }
}

function updateFilterCounts() {
    const allCount = state.allNotices.length;
    
    const now = Date.now();
    const recentCutoff = now - (CONFIG.RECENT_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
    const recentCount = state.allNotices.filter(notice => 
        parseNoticeDate(notice.date).getTime() >= recentCutoff
    ).length;
    
    const driveCount = state.allNotices.filter(notice => notice.google_drive).length;
    
    // Update pill counts — prefer explicit IDs if present
    const allCountEl = document.getElementById('countAll') || DOM.filterAll?.querySelector('.pill-count');
    const recentCountEl = document.getElementById('countRecent') || DOM.filterRecent?.querySelector('.pill-count');
    const driveCountEl = document.getElementById('countDrive') || DOM.filterDrive?.querySelector('.pill-count');

    if (allCountEl) allCountEl.textContent = allCount;
    if (recentCountEl) recentCountEl.textContent = recentCount;
    if (driveCountEl) driveCountEl.textContent = driveCount;
}

// ==========================================
// Rendering
// ==========================================
function renderNotices() {
    hideAllStates();
    
    if (state.filteredNotices.length === 0) {
        showEmpty();
        return;
    }
    
    if (!DOM.noticesGrid) return;
    DOM.noticesGrid.style.display = 'grid';
    
    DOM.noticesGrid.innerHTML = state.filteredNotices
        .map(notice => createNoticeCard(notice))
        .join('');
}

function createNoticeCard(notice) {
    const isNew = isNewNotice(notice.date);
    const hasDrive = notice.google_drive;
    const formattedDate = formatDate(notice.date);
    
    return `
        <article class="notice-card" role="article" aria-label="${escapeHtml(notice.title)}">
            <div class="notice-header-section">
                <div class="notice-badges" role="group" aria-label="Notice tags">
                    ${isNew ? '<span class="badge-new" role="status">New</span>' : ''}
                    ${hasDrive ? '<span class="badge-drive" role="status">📎</span>' : ''}
                </div>
            </div>
            
            <h3 class="notice-title">${escapeHtml(notice.title)}</h3>
            
            <div class="notice-date" aria-label="Posted on ${formattedDate}">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z"/>
                </svg>
                ${formattedDate}
            </div>
            
            <div class="notice-actions">
                <a href="${escapeHtml(notice.url)}" 
                   target="_blank" 
                   rel="noopener noreferrer" 
                   class="btn-notice btn-view"
                   aria-label="View ${escapeHtml(notice.title)}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0M2.04 4.326c.325 1.329 2.532 2.54 3.717 3.19.48.263.793.434.743.484-.08.08-.162.158-.242.234-.416.396-.787.749-.758 1.266.035.634.618.824 1.214 1.017.577.188 1.168.38 1.286.983.082.417-.075.988-.22 1.52-.215.782-.406 1.48.22 1.48 1.5-.5 3.798-3.186 4-5 .138-1.243-2-2-3.5-2.5-.478-.16-.755.081-.99.284-.172.15-.322.279-.51.216-.445-.148-2.5-2-1.5-2.5.78-.39.952-.171 1.227.182.078.099.163.208.273.318.609.304.662-.132.723-.633.039-.322.081-.671.277-.867.434-.434 1.265-.791 2.028-1.12.712-.306 1.365-.587 1.579-.88A7 7 0 1 0 2.04 4.327Z"/>
                    </svg>
                    View Notice
                </a>
                ${hasDrive ? `
                    <a href="${escapeHtml(notice.google_drive)}" 
                       target="_blank" 
                       rel="noopener noreferrer" 
                       class="btn-notice btn-drive"
                       aria-label="Open Google Drive link for ${escapeHtml(notice.title)}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                            <path d="M4.406 1.342A5.53 5.53 0 0 1 8 0c2.69 0 4.923 2 5.166 4.579C14.758 4.804 16 6.137 16 7.773 16 9.569 14.502 11 12.687 11H10a.5.5 0 0 1 0-1h2.688C13.979 10 15 8.988 15 7.773c0-1.216-1.02-2.228-2.313-2.228h-.5v-.5C12.188 2.825 10.328 1 8 1a4.53 4.53 0 0 0-2.941 1.1c-.757.652-1.153 1.438-1.153 2.055v.448l-.445.049C2.064 4.805 1 5.952 1 7.318 1 8.785 2.23 10 3.781 10H6a.5.5 0 0 1 0 1H3.781C1.708 11 0 9.366 0 7.318c0-1.763 1.266-3.223 2.942-3.593.143-.863.698-1.723 1.464-2.383"/>
                            <path d="M7.646 15.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 14.293V5.5a.5.5 0 0 0-1 0v8.793l-2.146-2.147a.5.5 0 0 0-.708.708z"/>
                        </svg>
                        Download
                    </a>
                ` : ''}
            </div>
        </article>
    `;
}

// ==========================================
// UI State Management
// ==========================================
function setLoadingState(isLoading) {
    state.isLoading = isLoading;
    
    if (isLoading) {
        hideAllStates();
        if (DOM.loadingState) DOM.loadingState.style.display = 'block';
    } else {
        if (DOM.loadingState) DOM.loadingState.style.display = 'none';
    }
}

function showError(message) {
    hideAllStates();
    if (DOM.errorState) {
        DOM.errorState.style.display = 'block';
        const errorText = DOM.errorState.querySelector('p');
        if (errorText) {
            errorText.textContent = message || 'Failed to load notices. Please try again.';
        }
    }
}

function showEmpty() {
    hideAllStates();
    if (DOM.emptyState) DOM.emptyState.style.display = 'block';
}

function hideAllStates() {
    [DOM.loadingState, DOM.errorState, DOM.emptyState, DOM.noticesGrid].forEach(el => {
        if (el) el.style.display = 'none';
    });
}

// ==========================================
// Utility Functions
// ==========================================
function parseNoticeDate(dateStr) {
    if (!dateStr) return new Date(0);
    
    const cleaned = dateStr.trim();
    
    // Try ISO format first
    let parsed = new Date(cleaned);
    if (!isNaN(parsed.getTime())) return parsed;
    
    // Try DD-MMM-YYYY format (e.g., "15-Jan-2025")
    const parts = cleaned.split('-');
    if (parts.length === 3) {
        const [day, month, year] = parts;
        parsed = new Date(`${month} ${day}, ${year}`);
        if (!isNaN(parsed.getTime())) return parsed;
    }
    
    return new Date(0); // Fallback to epoch
}

function formatDate(dateStr) {
    if (!dateStr) return 'No date';
    
    const date = parseNoticeDate(dateStr);
    if (date.getTime() === 0) return dateStr;
    
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function isNewNotice(dateStr) {
    if (!dateStr) return false;
    
    const noticeDate = parseNoticeDate(dateStr);
    const daysOld = (Date.now() - noticeDate.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysOld >= 0 && daysOld <= CONFIG.NEW_THRESHOLD_DAYS;
}

function updateSyncTimestamp(scrapedAt) {
    if (!DOM.syncTimestamp || !scrapedAt) return;
    
    const date = new Date(scrapedAt);
    const formatted = date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    DOM.syncTimestamp.textContent = `Updated: ${formatted}`;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
