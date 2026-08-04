const btn = document.getElementById('submitBtn');
const input = document.getElementById('urlInput');
const customTagInput = document.getElementById('customTagInput');
const searchInput = document.getElementById('searchInput');
const list = document.getElementById('bookmarkList');
const loading = document.getElementById('loadingText');

let bookmarks = JSON.parse(localStorage.getItem('myBookmarks')) || [];

function cleanTitle(rawTitle, domain) {
    let cleaned = rawTitle.replace(/(free download|build\s*\d*)/gi, '');
    const siteRegex = new RegExp(domain.split('.')[0], 'gi');
    cleaned = cleaned.replace(siteRegex, '');
    cleaned = cleaned.replace(/(skidrow & reloaded games|skidrow|reloaded)/gi, '');
    cleaned = cleaned.replace(/\[\s*\]/g, ''); 
    cleaned = cleaned.replace(/[-|:]+\s*$/g, ''); 
    cleaned = cleaned.replace(/^\s*[-|:]+/g, ''); 
    return cleaned.replace(/\s+/g, ' ').trim();
}

function getFallbackTitle(url) {
    try {
        const urlObj = new URL(url);
        let segments = urlObj.pathname.split('/').filter(s => s.length > 0);
        let lastSegment = segments.pop() || urlObj.hostname;
        let title = lastSegment.replace(/[-_]/g, ' ');
        return title.replace(/\b\w/g, l => l.toUpperCase());
    } catch (e) {
        return "Judul Tidak Diketahui";
    }
}

// Fungsi render dengan fitur Filter Pencarian
function renderBookmarks(filterTerm = '') {
    list.innerHTML = '';
    
    // Konversi term ke huruf kecil untuk pencarian tidak sensitif huruf
    const term = filterTerm.toLowerCase();

    bookmarks.forEach((bm, index) => {
        // Cek apakah data cocok dengan pencarian (Judul, URL, Source, Type, atau Custom Tag)
        const customTagsString = bm.tags.custom ? bm.tags.custom.join(' ') : '';
        const searchString = `${bm.title} ${bm.original_url} ${bm.tags.source} ${bm.tags.type} ${customTagsString}`.toLowerCase();
        
        if (term && !searchString.includes(term)) return; // Lewati jika tidak cocok

        // HTML untuk Custom Tags
        let customTagsHTML = '';
        if (bm.tags.custom && bm.tags.custom.length > 0) {
            customTagsHTML = bm.tags.custom.map(tag => `<span class="tag custom">🏷️ ${tag}</span>`).join('');
        }

        const card = document.createElement('div');
        card.className = 'result-card';
        card.innerHTML = `
            <a href="${bm.original_url}" target="_blank" class="bookmark-title">${bm.title}</a>
            <a href="${bm.original_url}" target="_blank" class="bookmark-link">${bm.original_url}</a>
            <div class="tag-container">
                <span class="tag source">🌐 Source: ${bm.tags.source}</span>
                <span class="tag type">🎮 Type: ${bm.tags.type}</span>
                ${customTagsHTML}
                <button class="delete-btn" onclick="deleteBookmark(${index})">Hapus</button>
            </div>
        `;
        list.appendChild(card);
    });
}

window.deleteBookmark = function(index) {
    bookmarks.splice(index, 1);
    localStorage.setItem('myBookmarks', JSON.stringify(bookmarks));
    renderBookmarks(searchInput.value);
};

// Event listener untuk Filter / Pencarian
searchInput.addEventListener('input', (e) => renderBookmarks(e.target.value));

renderBookmarks();

btn.addEventListener('click', async () => {
    const url = input.value;
    if (!url) return alert('Mohon masukkan URL terlebih dahulu!');

    loading.style.display = 'block';

    let rawTitle = '';
    let sourceTag = 'Unknown';
    
    try {
        const parsedUrl = new URL(url);
        sourceTag = parsedUrl.hostname.replace('www.', ''); 
    } catch(e) {
        alert('URL tidak valid.');
        loading.style.display = 'none';
        return;
    }

    // PENGATURAN KECEPATAN EKSTRAKSI: Batas waktu maksimal 1.5 detik
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl, { signal: controller.signal });
        clearTimeout(timeoutId); // Hapus timer jika sukses cepat
        const data = await response.json();
        
        if (data && data.contents) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(data.contents, "text/html");
            const titleElement = doc.querySelector('title');
            if (titleElement) rawTitle = titleElement.innerText.trim();
        }
    } catch (error) {
        // Akan langsung dieksekusi jika koneksi lambat (> 1.5 detik) atau diblokir
        console.warn("Ekstraksi lambat / diblokir. Menggunakan mode cepat (Fallback).");
    }

    if (!rawTitle || rawTitle.includes('Just a moment') || rawTitle.includes('Cloudflare')) {
        rawTitle = getFallbackTitle(url);
    }

    let typeTag = 'Lainnya'; 
    if (['game', 'steam', 'skidrow', 'lewdzone', 'repack'].some(kw => url.toLowerCase().includes(kw))) {
        typeTag = 'Game';
    }

    // Memproses Custom Tag (Pemisahan berdasarkan koma)
    const customTagsArray = customTagInput.value
        .split(',')
        .map(t => t.trim())
        .filter(t => t !== ''); // Hapus yang kosong

    const newBookmark = {
        original_url: url,
        title: cleanTitle(rawTitle, sourceTag),
        tags: { 
            source: sourceTag, 
            type: typeTag,
            custom: customTagsArray
        }
    };

    bookmarks.unshift(newBookmark);
    localStorage.setItem('myBookmarks', JSON.stringify(bookmarks));
    
    loading.style.display = 'none';
    input.value = '';
    customTagInput.value = '';
    searchInput.value = ''; // Reset filter saat menambah baru
    
    renderBookmarks();
});
