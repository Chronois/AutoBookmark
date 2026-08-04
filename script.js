const btn = document.getElementById('submitBtn');
const input = document.getElementById('urlInput');
const searchInput = document.getElementById('searchInput');
const list = document.getElementById('bookmarkList');
const loading = document.getElementById('loadingText');

// Modals
const filterModal = document.getElementById('filterModal');
const manageTagsModal = document.getElementById('manageTagsModal');
const editBookmarkModal = document.getElementById('editBookmarkModal');

// Data
let bookmarks = JSON.parse(localStorage.getItem('myBookmarks')) || [];
bookmarks = bookmarks.map(bm => ({ ...bm, id: bm.id || Date.now() + Math.random() }));
let globalTags = JSON.parse(localStorage.getItem('myTags')) || ['Bagus', 'Menarik', 'Ringan', 'End', 'Axed'];
let pendingNewTags = []; 
let editingBookmarkId = null; 

// Simpan Data
function saveData() { localStorage.setItem('myBookmarks', JSON.stringify(bookmarks)); }
function saveTags() { localStorage.setItem('myTags', JSON.stringify(globalTags)); }

// ================= CUSTOM DIALOGS (PENGGANTI PROMPT & CONFIRM) =================
function customPrompt(message, defaultValue = '') {
    return new Promise((resolve) => {
        const modal = document.getElementById('customPromptModal');
        const msgEl = document.getElementById('promptMessage');
        const inputEl = document.getElementById('promptInput');
        const btnOk = document.getElementById('promptOk');
        const btnCancel = document.getElementById('promptCancel');

        msgEl.innerText = message;
        inputEl.value = defaultValue;
        modal.style.display = 'flex';
        inputEl.focus();

        const cleanup = () => { modal.style.display = 'none'; btnOk.onclick = null; btnCancel.onclick = null; inputEl.onkeydown = null; };
        
        btnOk.onclick = () => { cleanup(); resolve(inputEl.value); };
        btnCancel.onclick = () => { cleanup(); resolve(null); };
        inputEl.onkeydown = (e) => { if (e.key === 'Enter') { cleanup(); resolve(inputEl.value); } };
    });
}

function customConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customConfirmModal');
        const msgEl = document.getElementById('confirmMessage');
        const btnOk = document.getElementById('confirmOk');
        const btnCancel = document.getElementById('confirmCancel');

        msgEl.innerText = message;
        modal.style.display = 'flex';

        const cleanup = () => { modal.style.display = 'none'; btnOk.onclick = null; btnCancel.onclick = null; };
        
        btnOk.onclick = () => { cleanup(); resolve(true); };
        btnCancel.onclick = () => { cleanup(); resolve(false); };
    });
}

// ================= 1. MANAGE GLOBAL TAGS =================

const openManageTagsBtn = document.getElementById('openManageTagsBtn');
const closeManageTagsBtn = document.getElementById('closeManageTagsBtn');
const globalTagsList = document.getElementById('globalTagsList');
const addNewTagBtn = document.getElementById('addNewTagBtn');

const pencilIcon = `<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;
const trashIcon = `<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;

function renderManageTags() {
    globalTagsList.innerHTML = globalTags.map((tag, idx) => `
        <div class="tag-edit-item">
            <span class="drag-handle">=</span>
            <span class="tag-name">${tag}</span>
            <button class="tag-icon-btn" onclick="editGlobalTag(${idx})">${pencilIcon}</button>
            <button class="tag-icon-btn" onclick="deleteGlobalTag(${idx})">${trashIcon}</button>
        </div>
    `).join('');
}

openManageTagsBtn.onclick = () => { renderManageTags(); manageTagsModal.style.display = 'flex'; }
closeManageTagsBtn.onclick = () => manageTagsModal.style.display = 'none';

addNewTagBtn.onclick = async () => {
    const newTag = await customPrompt("Masukkan nama kategori/tag baru:");
    if (newTag && newTag.trim() !== '' && !globalTags.includes(newTag.trim())) {
        globalTags.push(newTag.trim());
        saveTags(); renderManageTags();
    }
}

window.editGlobalTag = async function(idx) {
    const oldTag = globalTags[idx];
    const newTag = await customPrompt("Edit nama kategori/tag:", oldTag);
    if (newTag && newTag.trim() !== '' && newTag !== oldTag) {
        globalTags[idx] = newTag.trim();
        bookmarks.forEach(bm => {
            if(bm.tags.custom) {
                const tIdx = bm.tags.custom.indexOf(oldTag);
                if(tIdx > -1) bm.tags.custom[tIdx] = newTag.trim();
            }
        });
        saveData(); saveTags(); renderManageTags(); renderBookmarks();
    }
}

window.deleteGlobalTag = async function(idx) {
    const tagToDelete = globalTags[idx];
    const isConfirmed = await customConfirm(`Yakin ingin menghapus tag "${tagToDelete}"?`);
    if (isConfirmed) {
        globalTags.splice(idx, 1);
        bookmarks.forEach(bm => {
            if(bm.tags.custom) bm.tags.custom = bm.tags.custom.filter(t => t !== tagToDelete);
        });
        saveData(); saveTags(); renderManageTags(); renderBookmarks();
    }
}

// ================= 2. POPUP EDIT BOOKMARK & SELECT TAGS =================

const openSelectTagsBtn = document.getElementById('openSelectTagsBtn');
const editBmTagsList = document.getElementById('editBmTagsList');
const saveEditBmBtn = document.getElementById('saveEditBmBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const editTitleGroup = document.getElementById('editTitleGroup');
const editBmTitle = document.getElementById('editBmTitle');
const editModalTitle = document.getElementById('editModalTitle');

function renderCheckboxList(selectedTags) {
    editBmTagsList.innerHTML = globalTags.map(tag => `
        <label class="checkbox-item">
            <input type="checkbox" value="${tag}" class="tag-checkbox" ${selectedTags.includes(tag) ? 'checked' : ''}>
            ${tag}
        </label>
    `).join('');
}

openSelectTagsBtn.onclick = () => {
    editingBookmarkId = null;
    editModalTitle.innerText = "Pilih Custom Tags";
    editTitleGroup.style.display = 'none';
    renderCheckboxList(pendingNewTags);
    editBookmarkModal.style.display = 'flex';
}

window.editBookmark = function(id) {
    editingBookmarkId = id;
    const bm = bookmarks.find(b => b.id === id);
    
    editModalTitle.innerText = "Edit Bookmark";
    editTitleGroup.style.display = 'block';
    editBmTitle.value = bm.title;
    
    renderCheckboxList(bm.tags.custom || []);
    editBookmarkModal.style.display = 'flex';
}

saveEditBmBtn.onclick = () => {
    const selected = Array.from(editBmTagsList.querySelectorAll('.tag-checkbox:checked')).map(cb => cb.value);
    
    if (editingBookmarkId === null) {
        pendingNewTags = selected;
        openSelectTagsBtn.innerText = `🏷️ Set Tag (${pendingNewTags.length})`;
    } else {
        const bmIndex = bookmarks.findIndex(b => b.id === editingBookmarkId);
        bookmarks[bmIndex].title = editBmTitle.value;
        bookmarks[bmIndex].tags.custom = selected;
        saveData(); renderBookmarks();
    }
    editBookmarkModal.style.display = 'none';
}

cancelEditBtn.onclick = () => editBookmarkModal.style.display = 'none';

// ================= 3. FILTER =================

const filterOrder = document.getElementById('filterOrder');
const filterType = document.getElementById('filterType');
const filterSource = document.getElementById('filterSource');
const filterTagsList = document.getElementById('filterTagsList');

let activeFilters = { order: 'newest', type: 'all', source: 'all', customTags: [] };

function populateFilters() {
    let types = new Set(), sources = new Set();
    bookmarks.forEach(bm => { types.add(bm.tags.type); sources.add(bm.tags.source); });

    filterType.innerHTML = '<option value="all">All</option>' + [...types].map(t => `<option value="${t}">${t}</option>`).join('');
    filterSource.innerHTML = '<option value="all">All</option>' + [...sources].map(s => `<option value="${s}">${s}</option>`).join('');
    
    filterType.value = activeFilters.type; filterSource.value = activeFilters.source;

    filterTagsList.innerHTML = globalTags.map(tag => `
        <label class="checkbox-item">
            <input type="checkbox" value="${tag}" ${activeFilters.customTags.includes(tag) ? 'checked' : ''}>
            ${tag}
        </label>
    `).join('');
}

document.getElementById('openFilterBtn').onclick = () => { populateFilters(); filterModal.style.display = 'flex'; }
document.getElementById('resetFilterBtn').onclick = () => { 
    activeFilters = { order: 'newest', type: 'all', source: 'all', customTags: [] };
    filterOrder.value = 'newest'; populateFilters(); 
}
document.getElementById('applyFilterBtn').onclick = () => {
    activeFilters.order = filterOrder.value; activeFilters.type = filterType.value; activeFilters.source = filterSource.value;
    activeFilters.customTags = Array.from(filterTagsList.querySelectorAll('input:checked')).map(cb => cb.value);
    filterModal.style.display = 'none'; renderBookmarks();
}

window.onclick = (e) => { 
    if (e.target == filterModal) filterModal.style.display = 'none'; 
    if (e.target == manageTagsModal) manageTagsModal.style.display = 'none'; 
    if (e.target == editBookmarkModal) editBookmarkModal.style.display = 'none'; 
}

// ================= RENDER UTAMA =================

searchInput.addEventListener('input', renderBookmarks);

function renderBookmarks() {
    list.innerHTML = '';
    const term = searchInput.value.toLowerCase();

    let filtered = bookmarks.filter(bm => {
        const customString = bm.tags.custom ? bm.tags.custom.join(' ') : '';
        const matchSearch = `${bm.title} ${bm.original_url} ${bm.tags.source} ${bm.tags.type} ${customString}`.toLowerCase().includes(term);
        const matchType = activeFilters.type === 'all' || bm.tags.type === activeFilters.type;
        const matchSource = activeFilters.source === 'all' || bm.tags.source === activeFilters.source;
        const matchTags = activeFilters.customTags.length === 0 || activeFilters.customTags.some(t => bm.tags.custom && bm.tags.custom.includes(t));
        return matchSearch && matchType && matchSource && matchTags;
    });

    filtered.sort((a, b) => {
        if (activeFilters.order === 'az') return a.title.localeCompare(b.title);
        if (activeFilters.order === 'za') return b.title.localeCompare(a.title);
        if (activeFilters.order === 'oldest') return bookmarks.indexOf(b) - bookmarks.indexOf(a);
        return 0; 
    });

    filtered.forEach(bm => {
        const customTagsHTML = (bm.tags.custom || []).map(tag => `<span class="tag custom">🏷️ ${tag}</span>`).join('');
        const card = document.createElement('div');
        card.className = 'result-card';
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

window.deleteBookmark = async function(id) {
    const isConfirmed = await customConfirm('Hapus tautan ini?');
    if(isConfirmed) {
        bookmarks = bookmarks.filter(b => b.id !== id);
        saveData(); renderBookmarks();
    }
};

renderBookmarks();

// ================= PROSES SIMPAN LINK BARU =================

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

btn.addEventListener('click', async () => {
    const url = input.value;
    if (!url) { await customConfirm('Mohon masukkan URL terlebih dahulu!'); return; }

    loading.style.display = 'block';
    let rawTitle = '', sourceTag = 'Unknown';
    
    try { sourceTag = new URL(url).hostname.replace('www.', ''); } 
    catch(e) { await customConfirm('URL tidak valid.'); loading.style.display = 'none'; return; }

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

    bookmarks.unshift({
        id: Date.now(),
        original_url: url,
        title: cleanTitle(rawTitle, sourceTag),
        tags: { source: sourceTag, type: typeTag, custom: [...pendingNewTags] }
    });

    saveData();
    loading.style.display = 'none';
    input.value = ''; searchInput.value = '';
    pendingNewTags = [];
    openSelectTagsBtn.innerText = '🏷️ Set Tag (0)';
    renderBookmarks();
});
