// Global variables
let allNotices = [];
let filteredNotices = [];
// derived
let departments = new Set();

// Fetch and display notices
async function loadNotices() {
    try {
        const response = await fetch('notices.json');
        
        if (!response.ok) {
            throw new Error('Failed to load notices');
        }
        
        const data = await response.json();
        allNotices = (data.notices || []).map(n => ({...n}));
        filteredNotices = [...allNotices];

        // build department list
        buildDepartments(allNotices);
        
        // Update stats
        updateStats(data);
        
        // Display notices
        displayNotices();
        
    } catch (error) {
        console.error('Error loading notices:', error);
        document.getElementById('noticeContainer').innerHTML = `
            <div class="no-results">
                <p>❌ Error loading notices. Please make sure notices.json exists in the same folder.</p>
            </div>
        `;
    }
}

// Update statistics
function updateStats(data) {
    const totalNoticesEl = document.getElementById('totalNotices');
    const scrapedTimeEl = document.getElementById('scrapedTime');
    
    totalNoticesEl.textContent = `Total Notices: ${data.total_notices}`;
    
    // Format scraped date
    const scrapedDate = new Date(data.scraped_at);
    scrapedTimeEl.textContent = scrapedDate.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Parse date from notice
function parseNoticeDate(dateString) {
    // Extract date from format: "Posted on : Wednesday, 12th November 2025"
    const match = dateString.match(/(\d+)(?:st|nd|rd|th)\s+(\w+)\s+(\d{4})/);
    if (match) {
        const day = match[1];
        const month = match[2];
        const year = match[3];
        return new Date(`${month} ${day}, ${year}`);
    }
    return new Date();
}

// Format date for display
function formatDate(dateObj) {
    return dateObj.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

// Group notices by date
function groupNoticesByDate(notices) {
    const grouped = {};
    
    notices.forEach(notice => {
        const dateObj = parseNoticeDate(notice.date);
        const dateKey = formatDate(dateObj);
        
        if (!grouped[dateKey]) {
            grouped[dateKey] = {
                dateObj: dateObj,
                notices: []
            };
        }
        
        grouped[dateKey].notices.push(notice);
    });
    
    return grouped;
}

// Attempt to extract department names from titles for filters
function extractDeptFromTitle(title) {
    if (!title) return null;
    // common patterns: "DEPT OF X", "DEPT. OF X", "DEPT OF X,"
    const m = title.match(/DEPT(?:\.|)\s*(?:OF\s*)?([A-Z &]+)/i) || title.match(/DEPARTMENT\s+OF\s+([A-Z &]+)/i);
    if (m && m[1]) return m[1].trim();
    // fallback: look for known department keywords
    const candidates = ['MATHEMATICS','CHEMISTRY','POLITICAL SCIENCE','HISTORY','ZOOLOGY','ENGLISH','BENGALI','COMPUTER SCIENCE','BCA','ECONOMICS','MICROBIOLOGY','STATISTICS','SANSKRIT'];
    for (const c of candidates) {
        if (title.toUpperCase().includes(c)) return c;
    }
    return null;
}

function buildDepartments(notices) {
    departments = new Set();
    notices.forEach(n => {
        const d = extractDeptFromTitle(n.title || '');
        if (d) departments.add(d);
    });

    const select = document.getElementById('deptFilter');
    if (!select) return;
    // clear existing except first
    select.innerHTML = '<option value="all">All Departments</option>';
    Array.from(departments).sort().forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d.charAt(0) + d.slice(1).toLowerCase();
        select.appendChild(opt);
    });
}

// Display notices grouped by date
function displayNotices() {
    const container = document.getElementById('noticeContainer');
    const noResults = document.getElementById('noResults');
    
    if (filteredNotices.length === 0) {
        container.style.display = 'none';
        noResults.style.display = 'block';
        return;
    }
    
    container.style.display = 'grid';
    noResults.style.display = 'none';
    
    const groupedNotices = groupNoticesByDate(filteredNotices);
    
    // Convert to array and sort by date
    const sortOrder = document.getElementById('sortOrder').value;
    const sortedGroups = Object.entries(groupedNotices).sort((a, b) => {
        if (sortOrder === 'newest') {
            return b[1].dateObj - a[1].dateObj;
        } else {
            return a[1].dateObj - b[1].dateObj;
        }
    });
    
    // Build HTML
    let html = '';
    
    sortedGroups.forEach(([dateKey, group]) => {
        html += `
            <div class="date-group">
                <div class="date-header">${dateKey}</div>
        `;
        
        group.notices.forEach(notice => {
            // highlight if recent
            const dateObj = parseNoticeDate(notice.date);
            const isRecent = (Date.now() - dateObj.getTime()) <= (7 * 24 * 60 * 60 * 1000);
            html += `
                <div class="notice-card ${isRecent ? 'recent' : ''}">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
                        <div class="notice-title">${notice.title}</div>
                        <div style="display:flex;gap:8px;align-items:center">
                            ${isRecent ? '<span class="badge">New</span>' : ''}
                            ${notice.google_drive ? '<span class="badge" title="Has Drive link">PDF</span>' : ''}
                        </div>
                    </div>
                    <div class="notice-meta">
                        <div class="notice-date">${notice.date}</div>
                        <div class="notice-links">
                            <a href="${notice.url}" target="_blank" class="btn btn-primary">View</a>
                            ${notice.google_drive ? `<a href="${notice.google_drive}" target="_blank" class="btn btn-secondary">Drive</a>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
    });
    
    container.innerHTML = html;
}

// Apply filters from UI
function applyFilters() {
    const searchTerm = document.getElementById('searchBox').value.toLowerCase().trim();
    const dept = document.getElementById('deptFilter').value;
    const dateRange = document.getElementById('dateRange').value;
    const hasDrive = document.getElementById('hasDriveFilter').checked;

    filteredNotices = allNotices.filter(n => {
        // search
        if (searchTerm) {
            const hay = `${n.title} ${n.date} ${n.url}`.toLowerCase();
            if (!hay.includes(searchTerm)) return false;
        }

        // dept
        if (dept && dept !== 'all') {
            const d = extractDeptFromTitle(n.title || '') || 'General';
            if (d !== dept) return false;
        }

        // hasDrive
        if (hasDrive && !n.google_drive) return false;

        // date range
        if (dateRange && dateRange !== 'all') {
            const days = parseInt(dateRange, 10);
            const dateObj = parseNoticeDate(n.date);
            if ((Date.now() - dateObj.getTime()) > (days * 24 * 60 * 60 * 1000)) return false;
        }

        return true;
    });

    displayNotices();
}

function clearFilters() {
    document.getElementById('searchBox').value = '';
    document.getElementById('deptFilter').value = 'all';
    document.getElementById('dateRange').value = 'all';
    document.getElementById('hasDriveFilter').checked = false;
    document.getElementById('sortOrder').value = 'newest';
    filteredNotices = [...allNotices];
    displayNotices();
}

// Search functionality
function handleSearch(searchTerm) {
    searchTerm = searchTerm.toLowerCase().trim();
    
    if (searchTerm === '') {
        filteredNotices = [...allNotices];
    } else {
        filteredNotices = allNotices.filter(notice => 
            notice.title.toLowerCase().includes(searchTerm) ||
            notice.date.toLowerCase().includes(searchTerm)
        );
    }
    
    displayNotices();
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load notices on page load
    loadNotices();
    
    // Search functionality
    const searchBox = document.getElementById('searchBox');
    searchBox.addEventListener('input', (e) => { applyFilters(); });

    // Sort functionality
    const sortOrder = document.getElementById('sortOrder');
    sortOrder.addEventListener('change', () => { displayNotices(); });

    // department/date/drive filters
    const deptFilter = document.getElementById('deptFilter');
    const dateRange = document.getElementById('dateRange');
    const hasDrive = document.getElementById('hasDriveFilter');
    const clearBtn = document.getElementById('clearFilters');

    if (deptFilter) deptFilter.addEventListener('change', applyFilters);
    if (dateRange) dateRange.addEventListener('change', applyFilters);
    if (hasDrive) hasDrive.addEventListener('change', applyFilters);
    if (clearBtn) clearBtn.addEventListener('click', clearFilters);

    // Off-canvas filter toggle for mobile
    const filtersToggle = document.getElementById('filtersToggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('overlay');

    function openSidebar() {
        if (!sidebar) return;
        sidebar.classList.add('open');
        document.body.classList.add('sidebar-open');
        if (overlay) overlay.classList.add('visible');
        if (filtersToggle) filtersToggle.setAttribute('aria-expanded', 'true');
    }

    function closeSidebar() {
        if (!sidebar) return;
        sidebar.classList.remove('open');
        document.body.classList.remove('sidebar-open');
        if (overlay) overlay.classList.remove('visible');
        if (filtersToggle) filtersToggle.setAttribute('aria-expanded', 'false');
    }

    if (filtersToggle) filtersToggle.addEventListener('click', (e) => {
        const isOpen = sidebar && sidebar.classList.contains('open');
        if (isOpen) closeSidebar(); else openSidebar();
    });

    if (overlay) overlay.addEventListener('click', () => closeSidebar());

    // close sidebar when resizing to large screens
    window.addEventListener('resize', () => {
        if (window.innerWidth > 880) closeSidebar();
    });

    // Mobile search: sync with main search and apply filters
    const mobileSearch = document.getElementById('mobileSearch');
    if (mobileSearch) {
        // show mobile search for screen readers when visible
        mobileSearch.addEventListener('input', (e) => {
            const val = e.target.value;
            const mainSearch = document.getElementById('searchBox');
            if (mainSearch) mainSearch.value = val;
            applyFilters();
        });
        // when opening the sidebar, keep mobile search value in sync
        if (filtersToggle) filtersToggle.addEventListener('click', () => {
            const mainSearch = document.getElementById('searchBox');
            if (mainSearch && mobileSearch.value !== mainSearch.value) mobileSearch.value = mainSearch.value;
        });
    }
});

// Refresh notices (optional - can be called manually or on a timer)
function refreshNotices() {
    loadNotices();
}

// Auto-refresh every 5 minutes (optional)
// setInterval(refreshNotices, 5 * 60 * 1000);
