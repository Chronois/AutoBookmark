const btn = document.getElementById('submitBtn');
const input = document.getElementById('urlInput');
const customTagInput = document.getElementById('customTagInput');
const searchInput = document.getElementById('searchInput');
const list = document.getElementById('bookmarkList');
const loading = document.getElementById('loadingText');

// Modal Elements
const filterModal = document.getElementById('filterModal');
const openFilterBtn = document.getElementById('openFilterBtn');
const applyFilterBtn = document.getElementById('applyFilterBtn');
const resetFilterBtn = document.getElementById('resetFilterBtn');
const filterOrder = document.getElementById('filterOrder');
const filterType = document.getElementById('filterType');
const filterSource = document.getElementById('filterSource');
const filterTagsList = document.getElementById('filterTagsList');

// Load Data & Pastikan setiap data punya ID unik agar aman diedit walau sedang difilter
let bookmarks = JSON.parse(localStorage.getItem('myBookmarks')) || [];
bookmarks = bookmarks.map(bm => ({ ...bm, id: bm.id || Date.now() + Math.random() }));
saveData();

function saveData() {
    localStorage.setItem('myBookmarks', JSON.stringify(bookmarks));
}

function cleanTitle(rawTitle, domain) {
    let cleaned = rawTitle.replace(/(free download|build\s*\d*)/gi, '');
    const siteRegex = new RegExp(domain.split('.')[0], 'gi');
    cleaned = cleaned.replace(siteRegex, '').replace(/(skidrow & reloaded games|skidrow|reloaded)/gi, '');
    return cleaned.replace(/\[\s*\]/g, '').replace(/[-|:]+\s*$/g, '').replace(/^\s*[-|:]+/g, '').replace(/\s+/g, ' ').trim();
}

function getFallbackTitle(url) {
    try {
        let segments = new URL(url).pathname.split('/').filter(s => s.length > 0);
        let title = (segments.pop() || new URL(url).hostname).replace(/[-_]/g, ' ');
        return title.replace(/\b\w/g, l => l.toUpperCase());
    } catch (e) { return "Judul Tidak Diketahui"; }
}

// ================= FITUR FILTER ADVANCED =================

let activeFilters = { order: 'newest', type: 'all', source: 'all', customTags: [] };

function populateFilters() {
    let types = new Set(), sources = new Set(), tags = new Set();
    bookmarks.forEach(bm => {
        types.add(bm.tags.type);
        sources.add(bm.tags.source);
        if (bm.tags.custom) bm.tags.custom.forEach(t => tags.add(t));
    });

    // Populate Type & Source
    filterType.innerHTML = '<option value="all">All</option>' + [...types].map(t => `<option value="${t}">${t}</option>`).join('');
    filterSource.innerHTML = '<option value="all">All</option>' + [...sources].map(s => `<option value="${s}">${s}</option>`).join('');
    
    // Set selected values
    filterType.value = activeFilters.type;
    filterSource.value = activeFilters.source;

    // Populate Checkboxes (Genres/Tags)
    filterTagsList.innerHTML = [...tags].sort().map(tag => `
        <label class="checkbox-item">
            <input type="checkbox" value="${tag}" ${activeFilters.customTags.includes(tag) ? 'checked' : ''}>
            ${tag}
        </label>
    `).join('');
}

openFilterBtn.onclick = () => { populateFilters(); filterModal.style.display = 'flex'; }
resetFilterBtn.onclick = () => { 
    activeFilters = { order: 'newest', type: 'all', source: 'all', customTags: [] };
    filterOrder.value = 'newest';
    populateFilters(); 
}
applyFilterBtn.onclick = () => {
    activeFilters.order = filterOrder.value;
    activeFilters.type = filterType.value;
    activeFilters.source = filterSource.value;
    activeFilters.customTags = Array.from(filterTagsList.querySelectorAll('input:checked')).map(cb => cb.value);
    filterModal.style.display = 'none';
    renderBookmarks();
}
window.onclick = (e) => { if (e.target == filterModal) filterModal.style.display = 'none'; }
searchInput.addEventListener('input', renderBookmarks);

// ================= FITUR RENDER & EDIT =================

function renderBookmarks() {
    list.innerHTML = '';
    const term = searchInput.value.toLowerCase();

    // 1. Lakukan Filter
    let filtered = bookmarks.filter(bm => {
        const customString = bm.tags.custom ? bm.tags.custom.join(' ') : '';
        const matchSearch = `${bm.title} ${bm.original_url} ${bm.tags.source} ${bm.tags.type} ${customString}`.toLowerCase().includes(term);
        const matchType = activeFilters.type === 'all' || bm.tags.type === activeFilters.type;
        const matchSource = activeFilters.source === 'all' || bm.tags.source === activeFilters.source;
        const matchTags = activeFilters.customTags.length === 0 || activeFilters.customTags.some(t => bm.tags.custom && bm.tags.custom.includes(t));
        return matchSearch && matchType && matchSource && matchTags;
    });

    // 2. Lakukan Sorting
    filtered.sort((a, b) => {
        if (activeFilters.order === 'az') return a.title.localeCompare(b.title);
        if (activeFilters.order === 'za') return b.title.localeCompare(a.title);
        if (activeFilters.order === 'oldest') return bookmarks.indexOf(b) - bookmarks.indexOf(a); // Reverse original order
        return 0; // Default newest (sudah sesuai urutan array)
    });

    // 3. Generate HTML
    filtered.forEach(bm => {
        const customTagsHTML = (bm.tags.custom || []).map(tag => `<span class="tag custom">🏷️ ${tag}</span>`).join('');
        
        const card = document.createElement('div');
        card.className = 'result-card';
        card.id = `card-${bm.id}`;
        card.innerHTML = `
            <a href="${bm.original_url}" target="_blank" class="bookmark-title">${bm.title}</a>
            <a href="${bm.original_url}" target="_blank" class="bookmark-link">${bm.original_url}</a>
            <div class="tag-container">
                <span class="tag source">🌐 Source: ${bm.tags.source}</span>
                <span class="tag type">🎮 Type: ${bm.tags.type}</span>
                ${customTagsHTML}
                <div class="action-group">
                    <button class="btn-sm btn-edit" onclick="editBookmark(${bm.id})">Edit</button>
                    <button class="btn-sm btn-delete" onclick="deleteBookmark(${bm.id})">Hapus</button>
                </div>
            </div>
        `;
        list.appendChild(card);
    });
}

// Fitur Edit Inline
window.editBookmark = function(id) {
    const bm = bookmarks.find(b => b.id === id);
    const card = document.getElementById(`card-${id}`);
    card.innerHTML = `
        <input type="text" id="editTitle-${id}" value="${bm.title}" style="margin-bottom:5px; width:100%;">
        <span class="bookmark-link">${bm.original_url}</span>
        <input type="text" id="editTags-${id}" value="${bm.tags.custom ? bm.tags.custom.join(', ') : ''}" placeholder="Custom tags (koma)" style="margin-bottom:5px; width:100%;">
        <div class="tag-container">
            <div class="action-group" style="margin-left:0;">
                <button class="btn-sm btn-save" onclick="saveEdit(${id})">Simpan Perubahan</button>
                <button class="btn-sm btn-delete" onclick="renderBookmarks()">Batal</button>
            </div>
        </div>
    `;
}

window.saveEdit = function(id) {
    const bmIndex = bookmarks.findIndex(b => b.id === id);
    bookmarks[bmIndex].title = document.getElementById(`editTitle-${id}`).value;
    bookmarks[bmIndex].tags.custom = document.getElementById(`editTags-${id}`).value.split(',').map(t => t.trim()).filter(t => t !== '');
    saveData();
    renderBookmarks();
}

window.deleteBookmark = function(id) {
    bookmarks = bookmarks.filter(b => b.id !== id);
    saveData();
    renderBookmarks();
};

renderBookmarks();

// ================= PROSES TAMBAH LINK =================

btn.addEventListener('click', async () => {
    const url = input.value;
    if (!url) return alert('Mohon masukkan URL terlebih dahulu!');

    loading.style.display = 'block';
    let rawTitle = '', sourceTag = 'Unknown';
    
    try { sourceTag = new URL(url).hostname.replace('www.', ''); } 
    catch(e) { alert('URL tidak valid.'); loading.style.display = 'none'; return; }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    try {
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await response.json();
        if (data && data.contents) {
            const titleElement = new DOMParser().parseFromString(data.contents, "text/html").querySelector('title');
            if (titleElement) rawTitle = titleElement.innerText.trim();
        }
    } catch (error) {}

    if (!rawTitle || rawTitle.includes('Just a moment') || rawTitle.includes('Cloudflare')) rawTitle = getFallbackTitle(url);

    let typeTag = 'Lainnya'; 
    if (['game', 'steam', 'skidrow', 'lewdzone', 'repack'].some(kw => url.toLowerCase().includes(kw))) typeTag = 'Game';

    const customTagsArray = customTagInput.value.split(',').map(t => t.trim()).filter(t => t !== '');

    bookmarks.unshift({
        id: Date.now(),
        original_url: url,
        title: cleanTitle(rawTitle, sourceTag),
        tags: { source: sourceTag, type: typeTag, custom: customTagsArray }
    });

    saveData();
    loading.style.display = 'none';
    input.value = ''; customTagInput.value = ''; searchInput.value = '';
    renderBookmarks();
});
