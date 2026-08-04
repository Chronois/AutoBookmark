const btn = document.getElementById('submitBtn');
const input = document.getElementById('urlInput');
const list = document.getElementById('bookmarkList');
const loading = document.getElementById('loadingText');

// Mengambil daftar bookmark dari Local Storage browser
let bookmarks = JSON.parse(localStorage.getItem('myBookmarks')) || [];

// Fungsi untuk membersihkan judul yang didapat
function cleanTitle(rawTitle, domain) {
    let cleaned = rawTitle;
    cleaned = cleaned.replace(/(free download|build\s*\d*)/gi, '');
    const siteName = domain.split('.')[0]; 
    const siteRegex = new RegExp(siteName, 'gi');
    cleaned = cleaned.replace(siteRegex, '');
    cleaned = cleaned.replace(/(skidrow & reloaded games|skidrow|reloaded)/gi, '');
    cleaned = cleaned.replace(/\[\s*\]/g, ''); 
    cleaned = cleaned.replace(/[-|:]+\s*$/g, ''); 
    cleaned = cleaned.replace(/^\s*[-|:]+/g, ''); 
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned;
}

// Fungsi FALLBACK: Jika website memblokir proxy (seperti Cloudflare di SteamUnlocked)
// Maka ekstrak judul langsung dari link URL-nya agar tetap tersimpan rapi.
function getFallbackTitle(url) {
    try {
        const urlObj = new URL(url);
        let path = urlObj.pathname;
        let segments = path.split('/').filter(s => s.length > 0);
        let lastSegment = segments.pop() || urlObj.hostname;
        
        // Ubah tanda hubung dan garis bawah menjadi spasi, lalu kapitalisasi
        let title = lastSegment.replace(/[-_]/g, ' ');
        return title.replace(/\b\w/g, l => l.toUpperCase());
    } catch (e) {
        return "Judul Tidak Diketahui";
    }
}

// Fungsi untuk menampilkan daftar bookmark ke layar
function renderBookmarks() {
    list.innerHTML = '';
    bookmarks.forEach((bm, index) => {
        const card = document.createElement('div');
        card.className = 'result-card';
        card.innerHTML = `
            <h3 style="margin: 0;">
                <a href="${bm.original_url}" target="_blank" class="bookmark-title" title="Buka Link">${bm.title}</a>
            </h3>
            <a href="${bm.original_url}" target="_blank" class="bookmark-link">${bm.original_url}</a>
            <div class="tag-container">
                <span class="tag source">🌐 Source: ${bm.tags.source}</span>
                <span class="tag type">🏷️ Type: ${bm.tags.type}</span>
                <button class="delete-btn" onclick="deleteBookmark(${index})">Hapus</button>
            </div>
        `;
        list.appendChild(card);
    });
}

// Fungsi untuk menghapus bookmark
window.deleteBookmark = function(index) {
    bookmarks.splice(index, 1);
    localStorage.setItem('myBookmarks', JSON.stringify(bookmarks));
    renderBookmarks();
};

// Tampilkan saat halaman pertama kali dimuat
renderBookmarks();

btn.addEventListener('click', async () => {
    const url = input.value;
    if (!url) return alert('Mohon masukkan URL terlebih dahulu!');

    loading.style.display = 'block';

    let rawTitle = '';
    
    // 1. Dapatkan Source Tag
    let sourceTag = 'Unknown';
    try {
        const parsedUrl = new URL(url);
        sourceTag = parsedUrl.hostname.replace('www.', ''); 
    } catch(e) {
        alert('URL tidak valid.');
        loading.style.display = 'none';
        return;
    }

    try {
        // Coba fetch HTML menggunakan proxy
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        const data = await response.json();
        
        if (data && data.contents) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(data.contents, "text/html");
            const titleElement = doc.querySelector('title');
            if (titleElement) {
                rawTitle = titleElement.innerText.trim();
            }
        }
    } catch (error) {
        console.warn("Proxy diblokir, beralih ke metode fallback.");
    }

    // 2. Fallback System: 
    // Jika title kosong ATAU terdeteksi blokir dari Cloudflare (Anti-Bot)
    if (!rawTitle || rawTitle.includes('Just a moment') || rawTitle.includes('Cloudflare') || rawTitle.includes('Access denied')) {
        rawTitle = getFallbackTitle(url);
    }

    // Bersihkan judul akhir
    const cleanTitleText = cleanTitle(rawTitle, sourceTag);

    // 3. Tentukan Tipe Tag
    let typeTag = 'Lainnya'; 
    const detectGameKeywords = ['game', 'steam', 'skidrow', 'lewdzone', 'repack'];
    const urlString = url.toLowerCase();
    if (detectGameKeywords.some(keyword => urlString.includes(keyword))) {
        typeTag = 'Game';
    }

    // 4. Simpan Data Bookmark
    const newBookmark = {
        original_url: url,
        title: cleanTitleText,
        tags: { source: sourceTag, type: typeTag }
    };

    bookmarks.unshift(newBookmark);
    localStorage.setItem('myBookmarks', JSON.stringify(bookmarks));
    
    loading.style.display = 'none';
    renderBookmarks();
    input.value = '';
});
