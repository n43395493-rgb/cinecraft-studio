/**
 * =========================================================================================
 * NEWS & ANNOUNCEMENTS CONTROLLER (CINECRAFT AI STUDIO)
 * - Menangani popup pemberitahuan / berita otomatis sesuai date time saat login / reload
 * - Admin dapat membuat berita baru (Judul + Deskripsi) otomatis tersimpan ke Spreadsheet
 * =========================================================================================
 */

class NewsManager {
    constructor() {
        this.newsList = [];
        this.latestNews = null;
        this.hasShownOnThisSession = false;
        this.init();
    }

    init() {
        // Event listeners untuk form berita admin jika ada
        document.addEventListener('DOMContentLoaded', () => {
            this.bindEvents();
        });
    }

    bindEvents() {
        const createNewsForm = document.getElementById('create-news-form');
        if (createNewsForm) {
            createNewsForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const titleInput = document.getElementById('news-title-input');
                const contentInput = document.getElementById('news-content-input');
                
                if (titleInput && contentInput) {
                    await this.createNews(titleInput.value, contentInput.value);
                }
            });
        }

        // Tombol buka popup berita di navbar / header
        document.querySelectorAll('.btn-open-latest-news').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLatestNewsPopup(false);
            });
        });
    }

    /**
     * Muat berita dari Google Apps Script
     */
    async fetchNews() {
        if (!window.authManager) return [];

        try {
            const res = await window.authManager.sendToGoogleScript({ action: 'get_news' });

            if (res && res.success && res.news) {
                this.newsList = res.news;
                this.latestNews = res.latestNews || (res.news.length > 0 ? res.news[0] : null);
                this.renderAdminNewsList();
                return this.newsList;
            }
        } catch (error) {
            console.error('Error fetching news:', error);
        }

        // Fallback Local Storage jika mode demo / offline
        const localNews = JSON.parse(localStorage.getItem('cinecraft_demo_news') || '[]');
        if (localNews.length === 0) {
            const defaultNews = [
                {
                    id: 'NEWS-01',
                    title: 'Selamat Datang di CineCraft AI Studio!',
                    content: 'Studio kreasi AI resmi dibuka. Nikmati akses tools Drama Generator, Film AI, Dubbing Suara, dan Video Automation dengan performa terbaik.',
                    createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
                    status: 'aktif'
                }
            ];
            localStorage.setItem('cinecraft_demo_news', JSON.stringify(defaultNews));
            this.newsList = defaultNews;
            this.latestNews = defaultNews[0];
        } else {
            this.newsList = localNews;
            this.latestNews = localNews[0];
        }

        this.renderAdminNewsList();
        return this.newsList;
    }

    /**
     * Tampilkan popup berita otomatis saat login atau reload (jika sudah login)
     */
    async checkAndShowPopupOnLoadOrLogin() {
        await this.fetchNews();

        if (this.latestNews) {
            this.showPopup(this.latestNews);
        }
    }

    /**
     * Format Tanggal & Waktu Bahasa Indonesia yang Cantik
     */
    formatDateTime(dateStr) {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr.replace(' ', 'T'));
            if (isNaN(d.getTime())) return dateStr;

            const options = {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            };
            return d.toLocaleDateString('id-ID', options) + ' WIB';
        } catch (e) {
            return dateStr;
        }
    }

    /**
     * Tampilkan Modal Berita
     */
    showPopup(newsItem) {
        if (!newsItem) return;

        const modal = document.getElementById('news-announcement-modal');
        if (!modal) return;

        const titleEl = document.getElementById('news-modal-title');
        const contentEl = document.getElementById('news-modal-content');
        const timeEl = document.getElementById('news-modal-time');

        if (titleEl) titleEl.textContent = newsItem.title;
        if (timeEl) timeEl.innerHTML = `<i class="fa-regular fa-clock"></i> ${this.formatDateTime(newsItem.createdAt)}`;
        
        if (contentEl) {
            // Ubah baris baru menjadi paragraf atau <br>
            const formatted = newsItem.content
                .split('\n')
                .filter(p => p.trim() !== '')
                .map(p => `<p style="margin-bottom:12px; line-height:1.65;">${p}</p>`)
                .join('');
            contentEl.innerHTML = formatted || `<p>${newsItem.content}</p>`;
        }

        modal.classList.add('active');
    }

    /**
     * Tampilkan Berita Terbaru secara manual dari tombol UI
     */
    async showLatestNewsPopup() {
        if (!this.latestNews) {
            await this.fetchNews();
        }
        if (this.latestNews) {
            this.showPopup(this.latestNews);
        } else {
            window.showToast?.('Belum ada pengumuman berita saat ini.', 'info');
        }
    }

    /**
     * Admin: Buat Berita Baru
     */
    async createNews(title, content) {
        if (!title.trim() || !content.trim()) {
            window.showToast?.('Judul dan isi berita wajib diisi!', 'warning');
            return;
        }

        const saveBtn = document.getElementById('btn-save-news');
        const originalText = saveBtn ? saveBtn.innerHTML : '';
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...`;
        }

        try {
            const scriptUrl = window.APP_CONFIG ? window.APP_CONFIG.GOOGLE_SCRIPT_URL : '';
            const isPlaceholder = !scriptUrl || scriptUrl.includes('_CONTOH_');

            if (isPlaceholder) {
                // Simpan Demo Local
                const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
                const newNews = {
                    id: 'NEWS-' + Date.now(),
                    title: title.trim(),
                    content: content.trim(),
                    createdAt: nowStr,
                    status: 'aktif'
                };
                let localNews = JSON.parse(localStorage.getItem('cinecraft_demo_news') || '[]');
                localNews.unshift(newNews);
                localStorage.setItem('cinecraft_demo_news', JSON.stringify(localNews));

                this.newsList = localNews;
                this.latestNews = newNews;
                this.renderAdminNewsList();

                const form = document.getElementById('create-news-form');
                if (form) form.reset();

                window.showToast?.(`Berita '${title}' berhasil dipublikasikan!`, 'success');
                this.showPopup(newNews);
                return;
            }

            const res = await window.authManager.sendToGoogleScript({
                action: 'add_news',
                title: title.trim(),
                content: content.trim()
            });

            if (res && res.success) {
                window.showToast?.(`Berita '${title}' berhasil disimpan ke Spreadsheet!`, 'success');
                const form = document.getElementById('create-news-form');
                if (form) form.reset();

                await this.fetchNews();
                if (this.latestNews) {
                    this.showPopup(this.latestNews);
                }
            } else {
                window.showToast?.(res ? res.message : 'Gagal menyimpan berita ke Spreadsheet', 'error');
            }
        } catch (err) {
            console.error('Error creating news:', err);
            window.showToast?.('Terjadi kesalahan saat mempublikasikan berita', 'error');
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
            }
        }
    }

    /**
     * Admin: Hapus Berita
     */
    async deleteNews(newsId) {
        if (!confirm('Apakah Anda yakin ingin menghapus berita ini?')) return;

        try {
            const scriptUrl = window.APP_CONFIG ? window.APP_CONFIG.GOOGLE_SCRIPT_URL : '';
            const isPlaceholder = !scriptUrl || scriptUrl.includes('_CONTOH_');

            if (isPlaceholder) {
                let localNews = JSON.parse(localStorage.getItem('cinecraft_demo_news') || '[]');
                localNews = localNews.filter(n => n.id !== newsId);
                localStorage.setItem('cinecraft_demo_news', JSON.stringify(localNews));
                this.newsList = localNews;
                this.latestNews = localNews.length > 0 ? localNews[0] : null;
                this.renderAdminNewsList();
                window.showToast?.('Berita berhasil dihapus!', 'info');
                return;
            }

            const res = await window.authManager.sendToGoogleScript({
                action: 'delete_news',
                newsId: newsId
            });

            if (res && res.success) {
                window.showToast?.('Berita berhasil dihapus dari Spreadsheet!', 'info');
                await this.fetchNews();
            } else {
                window.showToast?.(res ? res.message : 'Gagal menghapus berita', 'error');
            }
        } catch (err) {
            console.error('Error deleting news:', err);
            window.showToast?.('Gagal menghapus berita', 'error');
        }
    }

    /**
     * Render daftar riwayat berita di panel Admin
     */
    renderAdminNewsList() {
        const container = document.getElementById('admin-news-list-container');
        if (!container) return;

        if (this.newsList.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:18px; color:var(--text-muted); font-size:0.85rem;">
                    Belum ada pengumuman berita yang dipublikasikan.
                </div>
            `;
            return;
        }

        let html = '';
        this.newsList.forEach(n => {
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.06); padding:10px 14px; border-radius:8px; margin-bottom:8px;">
                    <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding-right:12px;">
                        <strong style="color:#fff; font-size:0.9rem; display:block;">${n.title}</strong>
                        <span style="font-size:0.75rem; color:var(--text-muted);"><i class="fa-regular fa-clock"></i> ${this.formatDateTime(n.createdAt)}</span>
                    </div>
                    <div style="display:flex; gap:6px; flex-shrink:0;">
                        <button class="btn btn-secondary btn-sm" style="padding:4px 8px; font-size:0.75rem;" onclick="window.newsManager.showPopup(${JSON.stringify(n).replace(/"/g, '&quot;')})">
                            <i class="fa-solid fa-eye"></i> Lihat
                        </button>
                        <button class="btn btn-danger-soft btn-sm" style="padding:4px 8px; font-size:0.75rem;" onclick="window.newsManager.deleteNews('${n.id}')">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }
}

// Global instance
window.newsManager = new NewsManager();
