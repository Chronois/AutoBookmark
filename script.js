const btn = document.getElementById('submitBtn');
const input = document.getElementById('urlInput');
const searchInput = document.getElementById('searchInput');
const list = document.getElementById('bookmarkList');
const loading = document.getElementById('loadingText');

// Modals
const filterModal = document.getElementById('filterModal');
const manageTagsModal = document.getElementById('manageTagsModal');
const editBookmarkModal = document.getElementById('editBookmarkModal');

// Data Fetch & Migration (Legacy support)
let bookmarks = JSON.parse(localStorage.getItem('myBookmarks')) || [];
bookmarks = bookmarks.map(bm => {
    if (bm.original_url && !bm.urls) {
        bm.urls = [bm.original_url];
        delete bm.original_url;
    }
    if (bm.tags && typeof bm.tags.source === 'string') {
        bm.tags.source = [bm.tags.source];
    }
    return { ...bm, id: bm.id || Date.now() + Math.random() };
});

let globalTagsData = JSON.parse(localStorage.getItem('myTagsData')) || [
    { name: 'Favorite', color: '#1f6feb' },
    { name: 'Read Later', color: '#8957e5' },
    { name: 'Reference', color: '#238636' },
    { name: 'Completed', color: '#8b949e' },
    { name: 'Dropped', color: '#da3633' }
];

globalTagsData = globalTagsData.map(t => typeof t === 'string' ? { name: t, color: '#3b82f6' } : t);

let pendingNewTags = []; 
let editingBookmarkId = null; 

function saveData() { localStorage.setItem('myBookmarks', JSON.stringify(bookmarks)); }
function saveTags() { localStorage.setItem('myTagsData', JSON.stringify(globalTagsData)); }

function getHostname(urlStr) {
    try { return new URL(urlStr).hostname.replace('www.', ''); } catch(e) { return 'Unknown'; }
}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function getTagColor(tagName) {
    const found = globalTagsData.find(t => t.name === tagName);
    return found ? found.color : '#3b82f6';
}

// ================= ICONS SVG =================
const editIcon = `<svg viewBox="0 0 16 16"><path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086ZM11.189 6.25 9.75 4.81l-7.246 7.246a.25.25 0 0 0-.06.1l-.621 2.172 2.172-.62a.25.25 0 0 0 .1-.06l7.094-7.093Z"></path></svg>`;
const trashIcon = `<svg viewBox="0 0 16 16"><path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z"></path></svg>`;
const linkIcon = `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;
const dragIcon = `<svg viewBox="0 0 24 24"><path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm10-12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/></svg>`;

// ================= CUSTOM DIALOGS =================
function customPrompt(message, defaultValue = '', titleText = 'Input Required') {
    return new Promise((resolve) => {
        const modal = document.getElementById('customPromptModal');
        const titleEl = document.getElementById('promptTitleModal');
        const msgEl = document.getElementById('promptMessage');
        const inputEl = document.getElementById('promptInput');
        const btnOk = document.getElementById('promptOk');
        const btnCancel = document.getElementById('promptCancel');

        titleEl.innerText = titleText;
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

function customConfirm(message, showCancel = true) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customConfirmModal');
        const msgEl = document.getElementById('confirmMessage');
        const btnOk = document.getElementById('confirmOk');
        const btnCancel = document.getElementById('confirmCancel');

        msgEl.innerText = message;
        modal.style.display = 'flex';
        btnCancel.style.display = showCancel ? 'inline-block' : 'none';

        const cleanup = () => { modal.style.display = 'none'; btnOk.onclick = null; btnCancel.onclick = null; };
        
        btnOk.onclick = () => { cleanup(); resolve(true); };
        btnCancel.onclick = () => { cleanup(); resolve(false); };
    });
}

// ================= EXPORT / IMPORT =================
document.getElementById('exportBtn').addEventListener('click', () => {
    const dataObj = { bookmarks, globalTagsData };
    const dataStr = JSON.stringify(dataObj, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `AutoBookmark_Backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

document.getElementById('importFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const parsed = JSON.parse(event.target.result);
            if (parsed.globalTagsData) {
                globalTagsData = parsed.globalTagsData.map(t => typeof t === 'string' ? { name: t, color: getRandomColor() } : t);
            } else if (parsed.globalTags) {
                globalTagsData = parsed.globalTags.map(t => typeof t === 'string' ? { name: t, color: getRandomColor() } : t);
            }
            if (parsed.bookmarks) {
                bookmarks = parsed.bookmarks.map(bm => {
                    if (bm.original_url && !bm.urls) {
                        bm.urls = [bm.original_url];
                        delete bm.original_url;
                    }
                    if (bm.tags && typeof bm.tags.source === 'string') {
                        bm.tags.source = [bm.tags.source];
                    }
                    return { ...bm, id: bm.id || Date.now() + Math.random() };
                });
            }
            saveData(); saveTags(); renderBookmarks();
            await customConfirm("Data successfully loaded!", false);
        } catch (err) {
            await customConfirm("Failed to load file. Please ensure it is a valid JSON.", false);
        }
    };
    reader.readAsText(file);
    e.target.value = ''; 
});

// ================= MANAGE GLOBAL TAGS & DRAG N DROP =================

const openManageTagsBtn = document.getElementById('openManageTagsBtn');
const closeManageTagsBtn = document.getElementById('closeManageTagsBtn');
const globalTagsList = document.getElementById('globalTagsList');
const addNewTagBtn = document.getElementById('addNewTagBtn');

let draggedIndex = null;

function renderManageTags() {
    globalTagsList.innerHTML = globalTagsData.map((tagObj, idx) => `
        <div class="tag-edit-item" draggable="true" data-index="${idx}">
            <span class="drag-handle" title="Drag to reorder">${dragIcon}</span>
            <input type="color" class="tag-color-input" value="${tagObj.color}" onchange="changeTagColor(${idx}, this.value)" title="Change tag color">
            <span class="tag-name">${tagObj.name}</span>
            <button class="btn-icon" onclick="editGlobalTag(${idx})" title="Edit tag">${editIcon}</button>
            <button class="btn-icon delete" onclick="deleteGlobalTag(${idx})" title="Delete tag">${trashIcon}</button>
        </div>
    `).join('');

    initDragAndDrop();
}

function initDragAndDrop() {
    const items = globalTagsList.querySelectorAll('.tag-edit-item');
    items.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            draggedIndex = parseInt(item.getAttribute('data-index'));
            item.classList.add('dragging');
        });

        item.addEventListener('dragend', (e) => {
            item.classList.remove('dragging');
            items.forEach(i => i.classList.remove('drag-over'));
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            const targetItem = e.target.closest('.tag-edit-item');
            if (targetItem && targetItem !== item) {
                items.forEach(i => i.classList.remove('drag-over'));
                targetItem.classList.add('drag-over');
            }
        });

        item.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetItem = e.target.closest('.tag-edit-item');
            if (!targetItem) return;
            const targetIndex = parseInt(targetItem.getAttribute('data-index'));

            if (draggedIndex !== null && draggedIndex !== targetIndex) {
                const movedItem = globalTagsData.splice(draggedIndex, 1)[0];
                globalTagsData.splice(targetIndex, 0, movedItem);
                saveTags();
                renderManageTags();
                renderBookmarks();
            }
        });
    });
}

openManageTagsBtn.onclick = () => { renderManageTags(); manageTagsModal.style.display = 'flex'; }
closeManageTagsBtn.onclick = () => manageTagsModal.style.display = 'none';

window.changeTagColor = function(idx, newColor) {
    globalTagsData[idx].color = newColor;
    saveTags();
    renderBookmarks();
}

addNewTagBtn.onclick = async () => {
    const newTagName = await customPrompt("Enter new tag name:", "", "Add New Tag");
    if (newTagName && newTagName.trim() !== '') {
        const trimmed = newTagName.trim();
        if (!globalTagsData.some(t => t.name === trimmed)) {
            const randomColor = getRandomColor();
            globalTagsData.push({ name: trimmed, color: randomColor });
            saveTags(); renderManageTags();
        }
    }
}

window.editGlobalTag = async function(idx) {
    const oldObj = globalTagsData[idx];
    const newName = await customPrompt("Edit tag name:", oldObj.name, "Edit Tag");
    if (newName && newName.trim() !== '' && newName.trim() !== oldObj.name) {
        const updatedName = newName.trim();
        globalTagsData[idx].name = updatedName;
        bookmarks.forEach(bm => {
            if(bm.tags && bm.tags.custom) {
                const tIdx = bm.tags.custom.indexOf(oldObj.name);
                if(tIdx > -1) bm.tags.custom[tIdx] = updatedName;
            }
        });
        saveData(); saveTags(); renderManageTags(); renderBookmarks();
    }
}

window.deleteGlobalTag = async function(idx) {
    const tagToDelete = globalTagsData[idx].name;
    const isConfirmed = await customConfirm(`Delete tag "${tagToDelete}"?`);
    if (isConfirmed) {
        globalTagsData.splice(idx, 1);
        bookmarks.forEach(bm => {
            if(bm.tags && bm.tags.custom) {
                bm.tags.custom = bm.tags.custom.filter(t => t !== tagToDelete);
            }
        });
        saveData(); saveTags(); renderManageTags(); renderBookmarks();
    }
}

// ================= POPUP EDIT BOOKMARK & SELECT TAGS =================

const openSelectTagsBtn = document.getElementById('openSelectTagsBtn');
const editBmTagsList = document.getElementById('editBmTagsList');
const saveEditBmBtn = document.getElementById('saveEditBmBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const editTitleGroup = document.getElementById('editTitleGroup');
const editUrlGroup = document.getElementById('editUrlGroup');
const editBmTitle = document.getElementById('editBmTitle');
const editUrlList = document.getElementById('editUrlList');
const addNewUrlBtn = document.getElementById('addNewUrlBtn');
const editModalTitle = document.getElementById('editModalTitle');

function renderCheckboxList(selectedTags) {
    editBmTagsList.innerHTML = globalTagsData.map(tagObj => `
        <label class="checkbox-item">
            <input type="checkbox" value="${tagObj.name}" class="tag-checkbox" ${selectedTags.includes(tagObj.name) ? 'checked' : ''}>
            <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${tagObj.color}; margin-right:6px;"></span>
            ${tagObj.name}
        </label>
    `).join('');
}

function renderEditUrlInputs(urlsArray) {
    editUrlList.innerHTML = '';
    urlsArray.forEach(url => createUrlInputNode(url));
}

function createUrlInputNode(value = '') {
    const div = document.createElement('div');
    div.style.cssText = "display: flex; gap: 8px;";
    div.innerHTML = `
        <input type="url" class="input-field edit-url-input" value="${value}" placeholder="https://...">
        <button class="btn btn-outline remove-url-btn" style="width: auto; padding: 0 12px; height: 40px;" title="Remove link">${trashIcon}</button>
    `;
    div.querySelector('.remove-url-btn').onclick = function() { div.remove(); };
    editUrlList.appendChild(div);
}

addNewUrlBtn.onclick = () => createUrlInputNode('');

openSelectTagsBtn.onclick = () => {
    editingBookmarkId = null;
    editModalTitle.innerText = "Select Custom Tags";
    editTitleGroup.style.display = 'none';
    editUrlGroup.style.display = 'none';
    renderCheckboxList(pendingNewTags);
    editBookmarkModal.style.display = 'flex';
}

window.editBookmark = function(id) {
    editingBookmarkId = id;
    const bm = bookmarks.find(b => b.id === id);
    
    editModalTitle.innerText = "Edit Bookmark";
    editTitleGroup.style.display = 'block';
    editUrlGroup.style.display = 'block';
    
    editBmTitle.value = bm.title;
    renderEditUrlInputs(bm.urls || []);
    renderCheckboxList(bm.tags.custom || []);
    editBookmarkModal.style.display = 'flex';
}

saveEditBmBtn.onclick = () => {
    const selected = Array.from(editBmTagsList.querySelectorAll('.tag-checkbox:checked')).map(cb => cb.value);
    
    if (editingBookmarkId === null) {
        pendingNewTags = selected;
        openSelectTagsBtn.innerText = `Set Tag (${pendingNewTags.length})`;
    } else {
        const bmIndex = bookmarks.findIndex(b => b.id === editingBookmarkId);
        const urlInputs = Array.from(document.querySelectorAll('.edit-url-input')).map(inp => inp.value.trim()).filter(val => val !== '');
        
        bookmarks[bmIndex].title = editBmTitle.value;
        bookmarks[bmIndex].urls = urlInputs;
        bookmarks[bmIndex].tags.source = [...new Set(urlInputs.map(url => getHostname(url)))];
        bookmarks[bmIndex].tags.custom = selected;
        
        saveData(); renderBookmarks();
    }
    editBookmarkModal.style.display = 'none';
}

cancelEditBtn.onclick = () => editBookmarkModal.style.display = 'none';

// ================= FILTER =================

const filterOrder = document.getElementById('filterOrder');
const filterSource = document.getElementById('filterSource');
const filterTagsList = document.getElementById('filterTagsList');

let activeFilters = { order: 'newest', source: 'all', customTags: [] };

function populateFilters() {
    let sources = new Set();
    bookmarks.forEach(bm => {
        if(Array.isArray(bm.tags.source)) {
            bm.tags.source.forEach(s => sources.add(s));
        } else if(bm.tags.source) {
            sources.add(bm.tags.source);
        }
    });

    filterSource.innerHTML = '<option value="all">All Sources</option>' + [...sources].map(s => `<option value="${s}">${s}</option>`).join('');
    filterSource.value = activeFilters.source;

    filterTagsList.innerHTML = globalTagsData.map(tagObj => `
        <label class="checkbox-item">
            <input type="checkbox" value="${tagObj.name}" ${activeFilters.customTags.includes(tagObj.name) ? 'checked' : ''}>
            <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${tagObj.color}; margin-right:6px;"></span>
            ${tagObj.name}
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
        const customString = (bm.tags.custom || []).join(' ');
        const urlsString = (bm.urls || []).join(' ');
        const sourceArr = Array.isArray(bm.tags.source) ? bm.tags.source : [bm.tags.source || ''];
        const sourcesString = sourceArr.join(' ');
        
        const matchSearch = `${bm.title} ${urlsString} ${sourcesString} ${customString}`.toLowerCase().includes(term);
        const matchSource = activeFilters.source === 'all' || sourceArr.includes(activeFilters.source);
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
        const sortedCustomTags = (bm.tags.custom || []).sort((a, b) => {
            const indexA = globalTagsData.findIndex(t => t.name === a);
            const indexB = globalTagsData.findIndex(t => t.name === b);
            return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
        });

        const customTagsHTML = sortedCustomTags.map(tag => {
            const color = getTagColor(tag);
            return `<span class="tag custom" style="background: ${color}22; color: ${color}; border-color: ${color}44;">${tag}</span>`;
        }).join('');
        
        const sourceTagsHTML = (Array.isArray(bm.tags.source) ? bm.tags.source : [bm.tags.source]).map(src => `<span class="tag source">${src}</span>`).join('');
        
        const urlsHTML = (bm.urls || []).map(url => `<a href="${url}" target="_blank" class="bookmark-link">${linkIcon} ${url}</a>`).join('');

        const card = document.createElement('div');
        card.className = 'list-row';
        card.innerHTML = `
            <div class="row-header">
                <div style="overflow: hidden; width: 100%;">
                    <div class="bookmark-title">${bm.title}</div>
                    <div class="bookmark-link-group">
                        ${urlsHTML}
                    </div>
                </div>
                <div class="action-group">
                    <button class="btn-icon" onclick="editBookmark(${bm.id})" title="Edit">${editIcon}</button>
                    <button class="btn-icon delete" onclick="deleteBookmark(${bm.id})" title="Delete">${trashIcon}</button>
                </div>
            </div>
            <div class="tag-container">
                ${sourceTagsHTML}
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
    if (!url) { await customConfirm('Link cannot be empty!', false); return; }

    loading.style.display = 'block';
    let rawTitle = '', sourceTag = 'Unknown';
    
    try { sourceTag = getHostname(url); } 
    catch(e) { await customConfirm('Invalid link format.', false); loading.style.display = 'none'; return; }

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
        urls: [url],
        title: cleanTitle(rawTitle, sourceTag),
        tags: { source: [sourceTag], custom: [...pendingNewTags] }
    });

    saveData();
    loading.style.display = 'none';
    input.value = ''; searchInput.value = '';
    // Perbaikan: pendingNewTags TIDAK DIHAPUS agar pilihan tag tetap sama saat menambah link berikutnya
    renderBookmarks();
});
