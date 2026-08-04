const btn = document.getElementById('submitBtn');
const input = document.getElementById('urlInput');
const list = document.getElementById('bookmarkList');
const loading = document.getElementById('loadingText');

// Mengambil daftar bookmark dari Local Storage browser
let bookmarks = JSON.parse(localStorage.getItem('myBookmarks')) || [];

// Fungsi untuk membersihkan judul
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

// Fungsi untuk menampilkan daftar bookmark ke layar
function renderBookmarks() {
    list.innerHTML = '';
    bookmarks.forEach((bm, index) => {
        const card = document.createElement('div');
        card.className = 'result-card';
        card.innerHTML = `
            <h3 style="margin: 0 0 10px 0;">
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

    try {
        // MENGGUNAKAN PUBLIC CORS PROXY (allorigins.win)
        // Ini memungkinkan browser mengambil HTML dari website lain tanpa diblokir
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        const data = await response.json();
        
        // Ekstrak HTML dari response
        const html = data.contents;

        // Parsing HTML menggunakan DOMParser bawaan browser
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        
        // Ambil Tag Asal
        const parsedUrl = new URL(url);
        const sourceTag = parsedUrl.hostname.replace('www.', ''); 

        // Ambil dan Bersihkan Judul
        const titleElement = doc.querySelector('title');
        const rawTitle = titleElement ? titleElement.innerText.trim() : 'Judul tidak ditemukan';
        const cleanTitleText = cleanTitle(rawTitle, sourceTag);

        // Tentukan Tipe Tag
        let typeTag = 'Lainnya'; 
        const detectGameKeywords = ['game', 'steam', 'skidrow', 'lewdzone', 'repack'];
        const urlString = url.toLowerCase();
        if (detectGameKeywords.some(keyword => urlString.includes(keyword))) {
            typeTag = 'Game';
        }

        // Buat objek data baru
        const newBookmark = {
            original_url: url,
            title: cleanTitleText,
            tags: { source: sourceTag, type: typeTag }
        };

        // Simpan ke local storage dan perbarui tampilan
        bookmarks.unshift(newBookmark);
        localStorage.setItem('myBookmarks', JSON.stringify(bookmarks));
        
        loading.style.display = 'none';
        renderBookmarks();
        input.value = '';

    } catch (error) {
        loading.style.display = 'none';
        alert('Gagal mengambil data dari URL. Pastikan link valid.');
        console.error(error);
    }
});
