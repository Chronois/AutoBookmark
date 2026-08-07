const btn = document.getElementById('submitBtn');
const input = document.getElementById('urlInput');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const list = document.getElementById('bookmarkList');
const loading = document.getElementById('loadingText');

// Modals
const filterModal = document.getElementById('filterModal');
const manageTagsModal = document.getElementById('manageTagsModal');
const editBookmarkModal = document.getElementById('editBookmarkModal');
const bulkTagModal = document.getElementById('bulkTagModal');

// Bulk Selection State
let selectedBookmarkIds = new Set();
let currentlyVisibleIds = [];
let expandedTagGroups = new Set();

// Data Fetch & Migration
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

let globalTagsData = JSON.parse(localStorage.getItem('myTagsData')) || [];
if (globalTagsData.length === 0) {
    globalTagsData = [
        { name: 'Favorite', color: getRandomColor(), subtags: [] },
        { name: 'Read Later', color: getRandomColor(), subtags: [] },
        { name: 'Completed', color: getRandomColor(), subtags: [] }
    ];
}

// Migration for adding subtags array
globalTagsData = globalTagsData.map(t => {
    if (typeof t === 'string') return { name: t, color: getRandomColor(), subtags: [] };
    if (!t.subtags) t.subtags = [];
    return t;
});

let pendingNewTags = []; 
let editingBookmarkId = null; 

function saveData() { localStorage.setItem('myBookmarks', JSON.stringify(bookmarks)); }
function saveTags() { localStorage.setItem('myTagsData', JSON.stringify(globalTagsData)); }

function getHostname(urlStr) {
    try { 
        let hostname = new URL(urlStr).hostname.replace(/^www\./, ''); 
        const knownDomains = ['github.io', 'itch.io', 'vercel.app', 'netlify.app', 'herokuapp.com', 'blogspot.com'];
        for (let d of knownDomains) {
            if (hostname.endsWith('.' + d) || hostname === d) return d;
        }
        return hostname;
    } catch(e) { return 'Unknown'; }
}

function getRandomColor() {
    // Generate only light/bright colors (RGB values 127-255) for readable text
    const r = Math.floor(Math.random() * 128 + 127).toString(16).padStart(2, '0');
    const g = Math.floor(Math.random() * 128 + 127).toString(16).padStart(2, '0');
    const b = Math.floor(Math.random() * 128 + 127).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
}

function getTagColor(tagName) {
    const parentName = tagName.includes(' ➔ ') ? tagName.split(' ➔ ')[0] : tagName;
    const found = globalTagsData.find(t => t.name === parentName);
    return found ? found.color : '#58a6ff';
}

// ================= SEARCH BAR CLEAR BUTTON =================
searchInput.addEventListener('input', () => {
    clearSearchBtn.style.display = searchInput.value.length > 0 ? 'flex' : 'none';
    renderBookmarks();
});

clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    renderBookmarks();
});

// ================= ICONS SVG =================
const editIcon = `<svg viewBox="0 0 16 16"><path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086ZM11.189 6.25 9.75 4.81l-7.246 7.246a.25.25 0 0 0-.06.1l-.621 2.172 2.172-.62a.25.25 0 0 0 .1-.06l7.094-7.093Z"></path></svg>`;
const trashIcon = `<svg viewBox="0 0 16 16"><path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z"></path></svg>`;
const linkIcon = `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;
const dragIcon = `<svg viewBox="0 0 24 24"><path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm10-12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/></svg>`;
const addSubIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
const chevronRightIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
const chevronDownIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

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
                globalTagsData = parsed.globalTagsData.map(t => typeof t === 'string' ? { name: t, color: getRandomColor(), subtags: [] } : t);
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

// ================= TAG TOGGLE UI =================
window.toggleTagGroup = function(tagName, btnEl) {
    if (expandedTagGroups.has(tagName)) {
        expandedTagGroups.delete(tagName);
    } else {
        expandedTagGroups.add(tagName);
    }
    
    const wrapper = btnEl.parentElement.parentElement.querySelector('.subtags-list') || btnEl.parentElement.parentElement.querySelector('.subtags-wrapper');
    if (wrapper) {
        const isFlex = wrapper.classList.contains('subtags-list');
        wrapper.style.display = expandedTagGroups.has(tagName) ? (isFlex ? 'flex' : 'block') : 'none';
        btnEl.innerHTML = expandedTagGroups.has(tagName) ? chevronDownIcon : chevronRightIcon;
    }
}

// ================= MANAGE GLOBAL TAGS & DRAG N DROP =================

const openManageTagsBtn = document.getElementById('openManageTagsBtn');
const closeManageTagsBtn = document.getElementById('closeManageTagsBtn');
const globalTagsList = document.getElementById('globalTagsList');
const addNewTagBtn = document.getElementById('addNewTagBtn');

let draggedParentIndex = null;
let draggedSubtagContext = null;

function renderManageTags() {
    globalTagsList.innerHTML = globalTagsData.map((tagObj, idx) => {
        const hasSubtags = tagObj.subtags && tagObj.subtags.length > 0;
        const isExpanded = expandedTagGroups.has(tagObj.name);
        const icon = isExpanded ? chevronDownIcon : chevronRightIcon;

        return `
        <div class="tag-group-container" draggable="true" data-index="${idx}">
            <div class="tag-edit-item">
                <span class="drag-handle" title="Drag to reorder">${dragIcon}</span>
                ${hasSubtags ? `<button type="button" class="expand-btn" onclick="toggleTagGroup('${tagObj.name.replace(/'/g, "\\'")}', this)">${icon}</button>` : `<div style="width: 24px;"></div>`}
                <input type="color" class="tag-color-input" value="${tagObj.color}" onchange="changeTagColor(${idx}, this.value)" title="Change tag color">
                <span class="tag-name">${tagObj.name}</span>
                <button class="btn-icon" onclick="addSubtag(${idx})" title="Add subtag">${addSubIcon}</button>
                <button class="btn-icon" onclick="editGlobalTag(${idx})" title="Edit tag">${editIcon}</button>
                <button class="btn-icon delete" onclick="deleteGlobalTag(${idx})" title="Delete tag">${trashIcon}</button>
            </div>
            ${hasSubtags ? `
            <div class="subtags-list" style="display: ${isExpanded ? 'flex' : 'none'};">
                ${tagObj.subtags.map((sub, sIdx) => `
                    <div class="tag-edit-item subtag-item" draggable="true" data-parent-index="${idx}" data-sub-index="${sIdx}">
                        <span class="drag-handle" title="Drag to reorder subtag">${dragIcon}</span>
                        <span class="tag-name">${sub}</span>
                        <button class="btn-icon" onclick="editSubtag(${idx}, ${sIdx})" title="Edit subtag">${editIcon}</button>
                        <button class="btn-icon delete" onclick="deleteSubtag(${idx}, ${sIdx})" title="Delete subtag">${trashIcon}</button>
                    </div>
                `).join('')}
            </div>
            ` : ''}
        </div>
        `
    }).join('');

    initDragAndDrop();
}

function initDragAndDrop() {
    const parentItems = globalTagsList.querySelectorAll('.tag-group-container');
    const subItems = globalTagsList.querySelectorAll('.subtag-item');

    // PARENT DRAG
    parentItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            if (e.target.closest('.subtag-item')) return;
            draggedParentIndex = parseInt(item.getAttribute('data-index'));
            item.classList.add('dragging');
        });
        
        item.addEventListener('dragend', (e) => {
            if (draggedParentIndex !== null) {
                item.classList.remove('dragging');
                parentItems.forEach(i => i.classList.remove('drag-over'));
                draggedParentIndex = null;
            }
        });
        
        item.addEventListener('dragover', (e) => {
            if (draggedParentIndex !== null) {
                e.preventDefault();
                const targetItem = e.target.closest('.tag-group-container');
                if (targetItem && targetItem !== item) {
                    parentItems.forEach(i => i.classList.remove('drag-over'));
                    targetItem.classList.add('drag-over');
                }
            } else if (draggedSubtagContext !== null) {
                e.preventDefault();
                const targetItem = e.target.closest('.tag-group-container');
                if (targetItem) {
                    parentItems.forEach(i => i.classList.remove('drag-over-sub-target'));
                    targetItem.classList.add('drag-over-sub-target');
                }
            }
        });

        item.addEventListener('dragleave', (e) => {
            if (draggedSubtagContext !== null) {
                item.classList.remove('drag-over-sub-target');
            }
        });
        
        item.addEventListener('drop', (e) => {
            if (draggedParentIndex !== null) {
                e.preventDefault();
                const targetItem = e.target.closest('.tag-group-container');
                if (!targetItem) return;
                const targetIndex = parseInt(targetItem.getAttribute('data-index'));

                if (draggedParentIndex !== targetIndex) {
                    const movedItem = globalTagsData.splice(draggedParentIndex, 1)[0];
                    globalTagsData.splice(targetIndex, 0, movedItem);
                    saveTags(); renderManageTags(); renderBookmarks();
                }
            } else if (draggedSubtagContext !== null) {
                e.preventDefault();
                const targetParent = e.target.closest('.tag-group-container');
                if (!targetParent) return;
                
                const targetParentIdx = parseInt(targetParent.getAttribute('data-index'));
                if (e.target.closest('.subtag-item')) return;

                moveSubtag(draggedSubtagContext.parentIdx, draggedSubtagContext.subIdx, targetParentIdx, globalTagsData[targetParentIdx].subtags.length);
            }
        });
    });

    // SUBTAG DRAG
    subItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            e.stopPropagation();
            draggedSubtagContext = {
                parentIdx: parseInt(item.getAttribute('data-parent-index')),
                subIdx: parseInt(item.getAttribute('data-sub-index'))
            };
            item.classList.add('dragging-sub');
        });

        item.addEventListener('dragend', (e) => {
            e.stopPropagation();
            item.classList.remove('dragging-sub');
            subItems.forEach(i => i.classList.remove('drag-over-sub'));
            parentItems.forEach(i => i.classList.remove('drag-over-sub-target'));
            draggedSubtagContext = null;
        });

        item.addEventListener('dragover', (e) => {
            if (!draggedSubtagContext) return;
            e.preventDefault();
            e.stopPropagation(); 
            const targetItem = e.target.closest('.subtag-item');
            if (targetItem && targetItem !== item) {
                subItems.forEach(i => i.classList.remove('drag-over-sub'));
                targetItem.classList.add('drag-over-sub');
            }
        });

        item.addEventListener('drop', (e) => {
            if (!draggedSubtagContext) return;
            e.preventDefault();
            e.stopPropagation(); 
            const targetItem = e.target.closest('.subtag-item');
            if (!targetItem) return;
            
            const targetParentIdx = parseInt(targetItem.getAttribute('data-parent-index'));
            const targetSubIdx = parseInt(targetItem.getAttribute('data-sub-index'));

            moveSubtag(draggedSubtagContext.parentIdx, draggedSubtagContext.subIdx, targetParentIdx, targetSubIdx);
        });
    });
}

async function moveSubtag(oldParentIdx, oldSubIdx, newParentIdx, newSubIdx) {
    if (oldParentIdx === newParentIdx && oldSubIdx === newSubIdx) return;
    
    const subtagName = globalTagsData[oldParentIdx].subtags[oldSubIdx];

    if (oldParentIdx !== newParentIdx && globalTagsData[newParentIdx].subtags.includes(subtagName)) {
        await customConfirm("A subtag with this name already exists in the target tag.", false);
        return;
    }

    globalTagsData[oldParentIdx].subtags.splice(oldSubIdx, 1);
    
    let adjustedNewSubIdx = newSubIdx;
    if (oldParentIdx === newParentIdx && oldSubIdx < newSubIdx) {
        adjustedNewSubIdx--;
    }

    globalTagsData[newParentIdx].subtags.splice(adjustedNewSubIdx, 0, subtagName);

    if (oldParentIdx !== newParentIdx) {
        const oldFullTag = `${globalTagsData[oldParentIdx].name} ➔ ${subtagName}`;
        const newFullTag = `${globalTagsData[newParentIdx].name} ➔ ${subtagName}`;
        
        bookmarks.forEach(bm => {
            if (bm.tags && bm.tags.custom) {
                const tIdx = bm.tags.custom.indexOf(oldFullTag);
                if (tIdx > -1) bm.tags.custom[tIdx] = newFullTag;
            }
        });
        pendingNewTags = pendingNewTags.map(t => t === oldFullTag ? newFullTag : t);
        activeFilters.customTags = activeFilters.customTags.map(t => t === oldFullTag ? newFullTag : t);
        activeFilters.excludeTags = activeFilters.excludeTags.map(t => t === oldFullTag ? newFullTag : t);
        
        // Auto expand new parent
        expandedTagGroups.add(globalTagsData[newParentIdx].name);
    }

    saveTags(); saveData(); renderManageTags(); populateFilters(); renderBookmarks();
}

openManageTagsBtn.onclick = () => { renderManageTags(); manageTagsModal.style.display = 'flex'; }
closeManageTagsBtn.onclick = () => manageTagsModal.style.display = 'none';

window.changeTagColor = function(idx, newColor) {
    globalTagsData[idx].color = newColor;
    saveTags(); renderBookmarks();
}

addNewTagBtn.onclick = async () => {
    const newTagName = await customPrompt("Enter new tag name:", "", "Add New Tag");
    if (newTagName && newTagName.trim() !== '') {
        const trimmed = newTagName.trim();
        if (!globalTagsData.some(t => t.name === trimmed)) {
            globalTagsData.push({ name: trimmed, color: getRandomColor(), subtags: [] });
            saveTags(); renderManageTags();
        }
    }
}

window.editGlobalTag = async function(idx) {
    const oldObj = globalTagsData[idx];
    const oldName = oldObj.name;
    const newName = await customPrompt("Edit tag name:", oldName, "Edit Tag");
    
    if (newName && newName.trim() !== '' && newName.trim() !== oldName) {
        const updatedName = newName.trim();
        globalTagsData[idx].name = updatedName;
        
        // Also migrate expand state
        if (expandedTagGroups.has(oldName)) {
            expandedTagGroups.delete(oldName);
            expandedTagGroups.add(updatedName);
        }

        bookmarks.forEach(bm => {
            if(bm.tags && bm.tags.custom) {
                bm.tags.custom = bm.tags.custom.map(t => {
                    if (t === oldName) return updatedName;
                    if (t.startsWith(`${oldName} ➔ `)) return t.replace(`${oldName} ➔ `, `${updatedName} ➔ `);
                    return t;
                });
            }
        });

        pendingNewTags = pendingNewTags.map(t => {
            if (t === oldName) return updatedName;
            if (t.startsWith(`${oldName} ➔ `)) return t.replace(`${oldName} ➔ `, `${updatedName} ➔ `);
            return t;
        });

        activeFilters.customTags = activeFilters.customTags.map(t => {
            if (t === oldName) return updatedName;
            if (t.startsWith(`${oldName} ➔ `)) return t.replace(`${oldName} ➔ `, `${updatedName} ➔ `);
            return t;
        });

        activeFilters.excludeTags = activeFilters.excludeTags.map(t => {
            if (t === oldName) return updatedName;
            if (t.startsWith(`${oldName} ➔ `)) return t.replace(`${oldName} ➔ `, `${updatedName} ➔ `);
            return t;
        });

        saveData(); saveTags(); renderManageTags(); populateFilters(); renderBookmarks();
    }
}

window.deleteGlobalTag = async function(idx) {
    const tagToDelete = globalTagsData[idx].name;
    const isConfirmed = await customConfirm(`Delete tag "${tagToDelete}" and all its subtags?`);
    if (isConfirmed) {
        globalTagsData.splice(idx, 1);
        expandedTagGroups.delete(tagToDelete);
        
        bookmarks.forEach(bm => {
            if(bm.tags && bm.tags.custom) {
                bm.tags.custom = bm.tags.custom.filter(t => t !== tagToDelete && !t.startsWith(`${tagToDelete} ➔ `));
            }
        });
        saveData(); saveTags(); renderManageTags(); renderBookmarks();
    }
}

window.addSubtag = async function(idx) {
    const parentName = globalTagsData[idx].name;
    const newSub = await customPrompt(`Add subtag to "${parentName}":`, "", "Add Subtag");
    if (newSub && newSub.trim() !== '') {
        const trimmed = newSub.trim();
        if (!globalTagsData[idx].subtags.includes(trimmed)) {
            globalTagsData[idx].subtags.push(trimmed);
            expandedTagGroups.add(parentName); // Auto expand on add
            saveTags(); renderManageTags();
        } else {
            await customConfirm("Subtag already exists!", false);
        }
    }
}

window.editSubtag = async function(pIdx, sIdx) {
    const oldSub = globalTagsData[pIdx].subtags[sIdx];
    const parentName = globalTagsData[pIdx].name;
    const newSub = await customPrompt(`Edit subtag:`, oldSub, "Edit Subtag");
    
    if (newSub && newSub.trim() !== '' && newSub.trim() !== oldSub) {
        const updatedSub = newSub.trim();
        if (globalTagsData[pIdx].subtags.includes(updatedSub)) {
            await customConfirm("Subtag already exists!", false);
            return;
        }

        globalTagsData[pIdx].subtags[sIdx] = updatedSub;
        const oldFullTag = `${parentName} ➔ ${oldSub}`;
        const newFullTag = `${parentName} ➔ ${updatedSub}`;
        
        bookmarks.forEach(bm => {
            if (bm.tags && bm.tags.custom) {
                bm.tags.custom = bm.tags.custom.map(t => t === oldFullTag ? newFullTag : t);
            }
        });
        pendingNewTags = pendingNewTags.map(t => t === oldFullTag ? newFullTag : t);
        activeFilters.customTags = activeFilters.customTags.map(t => t === oldFullTag ? newFullTag : t);
        activeFilters.excludeTags = activeFilters.excludeTags.map(t => t === oldFullTag ? newFullTag : t);

        saveData(); saveTags(); renderManageTags(); populateFilters(); renderBookmarks();
    }
}

window.deleteSubtag = async function(pIdx, sIdx) {
    const subToDelete = globalTagsData[pIdx].subtags[sIdx];
    const parentName = globalTagsData[pIdx].name;
    const isConfirmed = await customConfirm(`Delete subtag "${subToDelete}"?`);
    
    if (isConfirmed) {
        globalTagsData[pIdx].subtags.splice(sIdx, 1);
        const fullTagToDelete = `${parentName} ➔ ${subToDelete}`;
        bookmarks.forEach(bm => {
            if (bm.tags && bm.tags.custom) {
                bm.tags.custom = bm.tags.custom.filter(t => t !== fullTagToDelete);
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

function getCheckboxListHTML(selectedTags) {
    return globalTagsData.map(tagObj => {
        const hasSubtags = tagObj.subtags && tagObj.subtags.length > 0;
        const isExpanded = expandedTagGroups.has(tagObj.name);
        const icon = isExpanded ? chevronDownIcon : chevronRightIcon;
        
        let html = `
        <div class="tag-group-cb-container">
            <div style="display: flex; align-items: center; gap: 4px;">
                ${hasSubtags ? `<button type="button" class="expand-btn" onclick="toggleTagGroup('${tagObj.name.replace(/'/g, "\\'")}', this)">${icon}</button>` : `<div style="width: 24px;"></div>`}
                <label class="checkbox-item" style="padding-left: 0;">
                    <input type="checkbox" value="${tagObj.name}" class="tag-checkbox custom-cb" ${selectedTags.includes(tagObj.name) ? 'checked' : ''}>
                    <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${tagObj.color}; margin-right:6px;"></span>
                    ${tagObj.name}
                </label>
            </div>
        `;
        
        if (hasSubtags) {
            html += `<div class="subtags-wrapper" style="display: ${isExpanded ? 'block' : 'none'}; padding-left: 20px;">`;
            html += tagObj.subtags.map(sub => {
                const fullVal = `${tagObj.name} ➔ ${sub}`;
                return `
                <div style="display: flex; align-items: center; gap: 4px; padding-left: 24px;">
                    <label class="checkbox-item" style="padding-left: 0;">
                        <input type="checkbox" value="${fullVal}" class="tag-checkbox custom-cb" ${selectedTags.includes(fullVal) ? 'checked' : ''}>
                        <span style="display:inline-block; width:10px; height:10px; border-radius:50%; border: 2px solid ${tagObj.color}; margin-right:6px;"></span>
                        ${sub}
                    </label>
                </div>
                `;
            }).join('');
            html += `</div>`;
        }
        
        html += `</div>`;
        return html;
    }).join('');
}

function renderCheckboxList(selectedTags) {
    editBmTagsList.innerHTML = getCheckboxListHTML(selectedTags);
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
const filterExcludeTagsList = document.getElementById('filterExcludeTagsList');

let activeFilters = { order: 'newest', source: 'all', customTags: [], excludeTags: [] };

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

    filterTagsList.innerHTML = getCheckboxListHTML(activeFilters.customTags);
    filterExcludeTagsList.innerHTML = getCheckboxListHTML(activeFilters.excludeTags);
}

document.getElementById('openFilterBtn').onclick = () => { populateFilters(); filterModal.style.display = 'flex'; }
document.getElementById('resetFilterBtn').onclick = () => { 
    activeFilters = { order: 'newest', source: 'all', customTags: [], excludeTags: [] };
    filterOrder.value = 'newest'; populateFilters(); 
}
document.getElementById('applyFilterBtn').onclick = () => {
    activeFilters.order = filterOrder.value; 
    activeFilters.source = filterSource.value;
    activeFilters.customTags = Array.from(filterTagsList.querySelectorAll('.tag-checkbox:checked')).map(cb => cb.value);
    activeFilters.excludeTags = Array.from(filterExcludeTagsList.querySelectorAll('.tag-checkbox:checked')).map(cb => cb.value);
    filterModal.style.display = 'none'; renderBookmarks();
}

window.onclick = (e) => { 
    if (e.target == filterModal) filterModal.style.display = 'none'; 
    if (e.target == manageTagsModal) manageTagsModal.style.display = 'none'; 
    if (e.target == editBookmarkModal) editBookmarkModal.style.display = 'none'; 
    if (e.target == bulkTagModal) bulkTagModal.style.display = 'none';
}

// ================= BULK ACTIONS & SELECTION =================

window.toggleBookmarkSelection = function(id, isChecked, el) {
    if (isChecked) {
        selectedBookmarkIds.add(id);
        if (el) el.closest('.list-row').classList.add('selected');
    } else {
        selectedBookmarkIds.delete(id);
        if (el) el.closest('.list-row').classList.remove('selected');
    }
    updateBulkActionBar();
    updateSelectAllState();
}

function updateBulkActionBar() {
    const bar = document.getElementById('bulkActionBar');
    const count = document.getElementById('bulkCount');
    if (selectedBookmarkIds.size > 0) {
        count.innerText = `${selectedBookmarkIds.size} selected`;
        bar.classList.add('show');
    } else {
        bar.classList.remove('show');
    }
}

function updateSelectAllState() {
    const selectAllCb = document.getElementById('selectAllCb');
    if (currentlyVisibleIds.length === 0) {
        selectAllCb.checked = false;
        return;
    }
    const allSelected = currentlyVisibleIds.every(id => selectedBookmarkIds.has(id));
    selectAllCb.checked = allSelected;
}

document.getElementById('selectAllCb').addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    currentlyVisibleIds.forEach(id => {
        if (isChecked) selectedBookmarkIds.add(id);
        else selectedBookmarkIds.delete(id);
    });
    renderBookmarks(); 
    updateBulkActionBar();
});

document.getElementById('bulkTagsBtn').onclick = () => {
    document.getElementById('bulkBmTagsList').innerHTML = getCheckboxListHTML([]);
    bulkTagModal.style.display = 'flex';
};

document.getElementById('saveBulkTagBtn').onclick = () => {
    const selectedTags = Array.from(document.querySelectorAll('#bulkBmTagsList .tag-checkbox:checked')).map(cb => cb.value);
    if (selectedTags.length > 0) {
        bookmarks.forEach(bm => {
            if (selectedBookmarkIds.has(bm.id)) {
                if (!bm.tags.custom) bm.tags.custom = [];
                bm.tags.custom = [...new Set([...bm.tags.custom, ...selectedTags])];
            }
        });
        saveData();
    }
    selectedBookmarkIds.clear();
    bulkTagModal.style.display = 'none';
    renderBookmarks();
    updateBulkActionBar();
};

document.getElementById('removeBulkTagBtn').onclick = () => {
    const selectedTags = Array.from(document.querySelectorAll('#bulkBmTagsList .tag-checkbox:checked')).map(cb => cb.value);
    if (selectedTags.length > 0) {
        bookmarks.forEach(bm => {
            if (selectedBookmarkIds.has(bm.id) && bm.tags.custom) {
                bm.tags.custom = bm.tags.custom.filter(t => !selectedTags.includes(t));
            }
        });
        saveData();
    }
    selectedBookmarkIds.clear();
    bulkTagModal.style.display = 'none';
    renderBookmarks();
    updateBulkActionBar();
};

document.getElementById('cancelBulkTagBtn').onclick = () => { bulkTagModal.style.display = 'none'; };

document.getElementById('bulkDeleteBtn').onclick = async () => {
    const isConfirmed = await customConfirm(`Delete ${selectedBookmarkIds.size} selected bookmarks?`);
    if (isConfirmed) {
        bookmarks = bookmarks.filter(bm => !selectedBookmarkIds.has(bm.id));
        selectedBookmarkIds.clear();
        saveData();
        renderBookmarks();
        updateBulkActionBar();
    }
};

document.getElementById('bulkCancelBtn').onclick = () => {
    selectedBookmarkIds.clear();
    renderBookmarks();
    updateBulkActionBar();
};

// ================= MAIN RENDER =================

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
        
        // Include filter
        const matchTags = activeFilters.customTags.length === 0 || activeFilters.customTags.some(t => bm.tags.custom && bm.tags.custom.includes(t));
        
        // Exclude filter
        const matchExclude = activeFilters.excludeTags.length === 0 || !activeFilters.excludeTags.some(t => bm.tags.custom && bm.tags.custom.includes(t));
        
        return matchSearch && matchSource && matchTags && matchExclude;
    });

    filtered.sort((a, b) => {
        if (activeFilters.order === 'az') return a.title.localeCompare(b.title);
        if (activeFilters.order === 'za') return b.title.localeCompare(a.title);
        if (activeFilters.order === 'oldest') return bookmarks.indexOf(b) - bookmarks.indexOf(a);
        return 0; 
    });

    currentlyVisibleIds = filtered.map(bm => bm.id);

    const listControls = document.getElementById('listControls');
    if (filtered.length === 0) {
        listControls.style.display = 'none';
        list.innerHTML = `<div style="text-align:center; padding:30px; color:#8b949e; font-size:13.5px;">No links found.</div>`;
        return;
    }

    listControls.style.display = 'flex';
    document.getElementById('visibleCount').innerText = `${filtered.length} entries`;
    updateSelectAllState();

    filtered.forEach(bm => {
        const sortedCustomTags = (bm.tags.custom || []).sort((a, b) => {
            const getParent = t => t.includes(' ➔ ') ? t.split(' ➔ ')[0] : t;
            const parentA = getParent(a);
            const parentB = getParent(b);
            const indexA = globalTagsData.findIndex(t => t.name === parentA);
            const indexB = globalTagsData.findIndex(t => t.name === parentB);
            
            if (indexA !== indexB) return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
            if (a === parentA) return -1;
            if (b === parentB) return 1;
            return a.localeCompare(b);
        });

        const customTagsHTML = sortedCustomTags.map(tag => {
            const color = getTagColor(tag);
            const displayText = tag.includes(' ➔ ') ? tag.split(' ➔ ')[1] : tag;
            return `<span class="tag custom" style="background: ${color}22; color: ${color}; border-color: ${color}44;">${displayText}</span>`;
        }).join('');
        
        const sourceTagsHTML = (Array.isArray(bm.tags.source) ? bm.tags.source : [bm.tags.source]).map(src => `<span class="tag source">${src}</span>`).join('');
        
        const urlsHTML = (bm.urls || []).map(url => `<a href="${url}" target="_blank" class="bookmark-link">${linkIcon} ${url}</a>`).join('');

        const isChecked = selectedBookmarkIds.has(bm.id) ? 'checked' : '';
        const rowClass = selectedBookmarkIds.has(bm.id) ? 'list-row selected' : 'list-row';

        const card = document.createElement('div');
        card.className = rowClass;
        card.innerHTML = `
            <div class="row-header">
                <div style="overflow: hidden; width: 100%;">
                    <div class="bookmark-title">${bm.title}</div>
                    <div class="bookmark-link-group">
                        ${urlsHTML}
                    </div>
                </div>
                <div class="action-container" style="display: flex; align-items: flex-start; gap: 12px; flex-shrink: 0;">
                    <input type="checkbox" class="bm-checkbox custom-cb" style="margin-top: 6px;" value="${bm.id}" ${isChecked} onchange="toggleBookmarkSelection(${bm.id}, this.checked, this)" title="Select for bulk action">
                    <div class="action-group">
                        <button class="btn-icon" onclick="editBookmark(${bm.id})" title="Edit">${editIcon}</button>
                        <button class="btn-icon delete" onclick="deleteBookmark(${bm.id})" title="Delete">${trashIcon}</button>
                    </div>
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
        selectedBookmarkIds.delete(id);
        saveData(); renderBookmarks(); updateBulkActionBar();
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
    input.value = ''; searchInput.value = ''; clearSearchBtn.style.display = 'none';
    renderBookmarks();
});
