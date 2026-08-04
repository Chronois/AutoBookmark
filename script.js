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

// Default Tags translated to English
let globalTags = JSON.parse(localStorage.getItem('myTags')) || ['Favorite', 'Read Later', 'Reference', 'Completed', 'Dropped'];
let pendingNewTags = []; 
let editingBookmarkId = null; 

function saveData() { localStorage.setItem('myBookmarks', JSON.stringify(bookmarks)); }
function saveTags() { localStorage.setItem('myTags', JSON.stringify(globalTags)); }

// ================= ICONS SVG =================
const editIcon = `<svg viewBox="0 0 16 16"><path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086ZM11.189 6.25 9.75 4.81l-7.246 7.246a.25.25 0 0 0-.06.1l-.621 2.172 2.172-.62a.25.25 0 0 0 .1-.06l7.094-7.093Z"></path></svg>`;
const trashIcon = `<svg viewBox="0 0 16 16"><path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z"></path></svg>`;

// ================= CUSTOM DIALOGS =================
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

function renderManageTags() {
    globalTagsList.innerHTML = globalTags.map((tag, idx) => `
        <div class="tag-edit-item">
            <span class="tag-name">${tag}</span>
            <button class="btn-icon" onclick="editGlobalTag(${idx})" title="Edit tag">${editIcon}</button>
            <button class="btn-icon delete" onclick="deleteGlobalTag(${idx})" title="Delete tag">${trashIcon}</button>
        </div>
    `).join('');
}

openManageTagsBtn.onclick = () => { renderManageTags(); manageTagsModal.style.display = 'flex'; }
closeManageTagsBtn.onclick = () => manageTagsModal.style.display = 'none';

addNewTagBtn.onclick = async () => {
    const newTag = await customPrompt("Enter new tag name:");
    if (newTag && newTag.trim() !== '' && !globalTags.includes(newTag.trim())) {
        globalTags.push(newTag.trim());
        saveTags(); renderManageTags();
    }
}

window.editGlobalTag = async function(idx) {
    const oldTag = globalTags[idx];
    const newTag = await customPrompt("Edit tag name:", oldTag);
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
    const isConfirmed = await customConfirm(`Delete tag "${tagToDelete}"?`);
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
    editModalTitle.innerText = "Select Custom Tags";
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
const filterSource = document.getElementById('filterSource');
const filterTagsList = document.getElementById('filterTagsList');

let activeFilters = { order: 'newest', source: 'all', customTags: [] };

function populateFilters() {
    let sources = new Set();
    bookmarks.forEach(bm => { sources.add(bm.tags.source); });

    filterSource.innerHTML = '<option value="all">All Sources</option>' + [...sources].map(s => `<option value="${s}">${s}</option>`).join('');
    filterSource.value = activeFilters.source;

    filterTagsList.innerHTML = globalTags.map(tag => `
        <label class="checkbox-item">
            <input type="checkbox" value="${tag}" ${activeFilters.customTags.includes(tag) ? 'checked' : ''}>
            ${tag}
        </label>
    `).join('');
}

document.getElementById('openFilterBtn').onclick = () => { populateFilters(); filterModal.style.display = 'flex'; }
document.getElementById('resetFilterBtn').onclick = () => { 
    activeFilters = { order: 'newest', source: 'all', customTags: [] };
    filterOrder.value = 'newest'; populateFilters(); 
}
document.getElementById('applyFilterBtn').onclick = () => {
    activeFilters.order = filterOrder.value; 
    activeFilters.source = filterSource.value;
    activeFilters.customTags = Array.from(filterTagsList.querySelectorAll('input:checked')).map(cb => cb.value);
    filterModal.style.display = 'none'; renderBookmarks();
}

window.onclick = (e) => { 
    if (e.target == filterModal) filterModal.style.display = 'none'; 
    if (e.target == manageTagsModal) manageTagsModal.style.display = 'none'; 
    if (e.target == editBookmarkModal) editBookmarkModal.style.display = 'none'; 
}

// ================= MAIN RENDER =================

searchInput.addEventListener('input', renderBookmarks);

function renderBookmarks() {
    list.innerHTML = '';
    const term = searchInput.value.toLowerCase();

    let filtered = bookmarks.filter(bm => {
        const customString = bm.tags.custom ? bm.tags.custom.join(' ') : '';
        const matchSearch = `${bm.title} ${bm.original_url} ${bm.tags.source} ${customString}`.toLowerCase().includes(term);
        const matchSource = activeFilters.source === 'all' || bm.tags.source === activeFilters.source;
        const matchTags = activeFilters.customTags.length === 0 || activeFilters.customTags.some(t => bm.tags.custom && bm.tags.custom.includes(t));
        return matchSearch && matchSource && matchTags;
    });

    filtered.sort((a, b) => {
        if (activeFilters.order === 'az') return a.title.localeCompare(b.title);
        if (activeFilters.order === 'za') return b.title.localeCompare(a.title);
        if (activeFilters.order === 'oldest') return bookmarks.indexOf(b) - bookmarks.indexOf(a);
        return 0; 
    });

    if (filtered.length === 0) {
        list.innerHTML = `<div style="text-align:center; padding:30px; color:#8b949e; font-size:13.5px;">No links found.</div>`;
        return;
    }

    filtered.forEach(bm => {
        const customTagsHTML = (bm.tags.custom || []).map(tag => `<span class="tag custom">${tag}</span>`).join('');
        
        const card = document.createElement('div');
        card.className = 'list-row';
        card.innerHTML = `
            <div class="row-header">
                <div style="overflow: hidden;">
                    <a href="${bm.original_url}" target="_blank" class="bookmark-title">${bm.title}</a>
                    <a href="${bm.original_url}" target="_blank" class="bookmark-link">${bm.original_url}</a>
                </div>
                <div class="action-group">
                    <button class="btn-icon" onclick="editBookmark(${bm.id})" title="Edit">${editIcon}</button>
                    <button class="btn-icon delete" onclick="deleteBookmark(${bm.id})" title="Delete">${trashIcon}</button>
                </div>
            </div>
            <div class="tag-container">
                <span class="tag source">🌐 ${bm.tags.source}</span>
                ${customTagsHTML}
            </div>
        `;
        list.appendChild(card);
    });
}

window.deleteBookmark = async function(id) {
    const isConfirmed = await customConfirm('Remove this link from the list?');
    if(isConfirmed) {
        bookmarks = bookmarks.filter(b => b.id !== id);
        saveData(); renderBookmarks();
    }
};

renderBookmarks();

// ================= NEW LINK PROCESS =================

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
    } catch (e) { return "Unknown Title"; }
}

btn.addEventListener('click', async () => {
    const url = input.value;
    if (!url) { await customConfirm('Link cannot be empty!'); return; }

    loading.style.display = 'block';
    let rawTitle = '', sourceTag = 'Unknown';
    
    try { sourceTag = new URL(url).hostname.replace('www.', ''); } 
    catch(e) { await customConfirm('Invalid link format.'); loading.style.display = 'none'; return; }

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

    bookmarks.unshift({
        id: Date.now(),
        original_url: url,
        title: cleanTitle(rawTitle, sourceTag),
        tags: { source: sourceTag, custom: [...pendingNewTags] }
    });

    saveData();
    loading.style.display = 'none';
    input.value = ''; searchInput.value = '';
    pendingNewTags = [];
    openSelectTagsBtn.innerText = '🏷️ Set Tag (0)';
    renderBookmarks();
});
