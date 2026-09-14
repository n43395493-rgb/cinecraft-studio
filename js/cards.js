/**
 * CREATIVE AI STUDIO - CARDS & TOOLS HUB MANAGER
 * Mengelola kartu generator tools kreatif (AI Drama, Film Maker, Video Gen, Voice, dll).
 */

class CardManager {
    constructor() {
        this.cards = [];
        this.isLoading = false;
        this.defaultDemoCards = [
            { id: "CRD-01", title: "AI Drama & Short Film Generator", url: "https://storycanvas.ai", icon: "fa-solid fa-clapperboard", createdAt: "2026-09-15" },
            { id: "CRD-02", title: "Cinematic Movie & Video Studio", url: "https://runwayml.com", icon: "fa-solid fa-film", createdAt: "2026-09-15" },
            { id: "CRD-03", title: "StoryCanvas & Character Studio", url: "https://midjourney.com", icon: "fa-solid fa-wand-magic-sparkles", createdAt: "2026-09-15" },
            { id: "CRD-04", title: "SenseVoice Subtitle & Auto Dubbing", url: "https://elevenlabs.io", icon: "fa-solid fa-microphone-lines", createdAt: "2026-09-15" },
            { id: "CRD-05", title: "Wan2GP Video Generator AI", url: "https://huggingface.co", icon: "fa-solid fa-video", createdAt: "2026-09-15" },
            { id: "CRD-06", title: "UGC Maker & Social Clip Automation", url: "https://capcut.com", icon: "fa-solid fa-photo-film", createdAt: "2026-09-15" }
        ];

        this.init();
    }

    init() {
        // Render instan dari cache saat reload agar tidak ada delay / blank
        document.addEventListener('DOMContentLoaded', () => {
            this.loadCachedCardsInstantly();
            
            // Auto-refresh dari server Google Apps Script
            setTimeout(() => {
                this.loadCards();
            }, 300);
        });
    }

    /**
     * Render langsung dari cache lokal saat halaman dimuat ulang (reload)
     */
    loadCachedCardsInstantly() {
        const cached = localStorage.getItem('cinecraft_cached_cards') || localStorage.getItem('nexus_demo_cards');
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    this.cards = parsed;
                    this.renderCards();
                }
            } catch (e) {
                console.warn('Error reading cached cards:', e);
            }
        }
    }

    /**
     * Dapatkan Icon Cerdas Otomatis sesuai Nama Tool Kreatif
     */
    getSmartIcon(title) {
        if (!title) return "fa-solid fa-wand-magic-sparkles";
        const t = title.toLowerCase();

        if (t.includes("drama") || t.includes("teater") || t.includes("acting")) return "fa-solid fa-masks-theater";
        if (t.includes("film") || t.includes("movie") || t.includes("cinema") || t.includes("bioskop")) return "fa-solid fa-film";
        if (t.includes("video") || t.includes("clip") || t.includes("wan2gp") || t.includes("clipping")) return "fa-solid fa-clapperboard";
        if (t.includes("story") || t.includes("canvas") || t.includes("naskah") || t.includes("script") || t.includes("cerita")) return "fa-solid fa-book-open-reader";
        if (t.includes("voice") || t.includes("audio") || t.includes("dubbing") || t.includes("suara") || t.includes("sound")) return "fa-solid fa-microphone-lines";
        if (t.includes("music") || t.includes("suno") || t.includes("lagu") || t.includes("soundtrack")) return "fa-solid fa-music";
        if (t.includes("ugc") || t.includes("tiktok") || t.includes("reels") || t.includes("shorts")) return "fa-solid fa-mobile-screen-button";
        if (t.includes("image") || t.includes("gambar") || t.includes("photo") || t.includes("foto") || t.includes("art")) return "fa-solid fa-palette";
        if (t.includes("character") || t.includes("avatar") || t.includes("tokoh") || t.includes("wajah")) return "fa-solid fa-user-astronaut";
        if (t.includes("ai") || t.includes("bot") || t.includes("generator") || t.includes("gpt")) return "fa-solid fa-wand-magic-sparkles";
        if (t.includes("subtitle") || t.includes("sub") || t.includes("translate") || t.includes("terjemah")) return "fa-solid fa-closed-captioning";
        if (t.includes("download") || t.includes("asset") || t.includes("unduh") || t.includes("file")) return "fa-solid fa-cloud-arrow-down";
        if (t.includes("github") || t.includes("git")) return "fa-brands fa-github";
        if (t.includes("youtube")) return "fa-brands fa-youtube";
        if (t.includes("drive") || t.includes("google")) return "fa-brands fa-google-drive";

        const randomStudioIcons = [
            "fa-solid fa-clapperboard",
            "fa-solid fa-film",
            "fa-solid fa-wand-magic-sparkles",
            "fa-solid fa-masks-theater",
            "fa-solid fa-video",
            "fa-solid fa-photo-film",
            "fa-solid fa-bolt"
        ];
        return randomStudioIcons[Math.floor(Math.random() * randomStudioIcons.length)];
    }

    /**
     * Muat Seluruh Kartu dari Google Apps Script atau Demo Storage
     */
    async loadCards() {
        const container = document.getElementById('member-cards-container');
        if (!container) return;

        // Jika belum ada kartu yang dirender, tampilkan skeleton/loading
        if (this.cards.length === 0) {
            this.isLoading = true;
            container.innerHTML = `
                <div class="cards-loading-state">
                    <i class="fa-solid fa-circle-notch fa-spin"></i>
                    <span>Memuat daftar tools studio...</span>
                </div>
            `;
        }

        try {
            const res = await window.authManager.sendToGoogleScript({ action: 'get_cards' });
            if (res && res.success && Array.isArray(res.cards)) {
                this.cards = res.cards;
                localStorage.setItem('cinecraft_cached_cards', JSON.stringify(res.cards));
            } else if (res && res.message && res.message.includes('Aksi tidak dikenal')) {
                console.warn('Backend update required');
                this.loadLocalDemoCards();
            } else {
                this.loadLocalDemoCards();
            }
        } catch (err) {
            console.warn('Error load cards, fallback to storage:', err);
            this.loadLocalDemoCards();
        } finally {
            this.isLoading = false;
            this.renderCards();
        }
    }

    loadLocalDemoCards() {
        let saved = JSON.parse(localStorage.getItem('cinecraft_cached_cards') || localStorage.getItem('nexus_demo_cards') || 'null');
        if (!saved || saved.length === 0) {
            saved = this.defaultDemoCards;
            localStorage.setItem('cinecraft_cached_cards', JSON.stringify(saved));
        }
        this.cards = saved;
    }

    /**
     * Render Kartu ke Tampilan DOM
     */
    renderCards() {
        const container = document.getElementById('member-cards-container');
        if (!container) return;

        const currentUser = window.authManager?.currentUser;
        const isAdmin = currentUser && currentUser.role && currentUser.role.toLowerCase() === 'admin';

        // Tampilkan Form Create Tool untuk Admin
        const adminCreateBox = document.getElementById('admin-create-card-box');
        if (adminCreateBox) {
            if (isAdmin) {
                adminCreateBox.classList.remove('hidden');
            } else {
                adminCreateBox.classList.add('hidden');
            }
        }

        if (this.cards.length === 0) {
            container.innerHTML = `
                <div class="cards-empty-state">
                    <i class="fa-solid fa-film"></i>
                    <p>Belum ada tool generator di database.</p>
                    ${isAdmin ? '<p style="font-size:0.85rem; color:var(--primary-light);">Gunakan panel admin di atas untuk menambahkan tool generator baru.</p>' : ''}
                </div>
            `;
            return;
        }

        container.innerHTML = this.cards.map((card, idx) => {
            const iconClass = card.icon || this.getSmartIcon(card.title);
            const safeTitle = this.escapeHtml(card.title);
            const safeUrl = this.escapeHtml(card.url);

            return `
                <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="portal-link-card" style="animation-delay: ${idx * 0.05}s;">
                    <div class="link-card-top">
                        <div class="link-card-icon-wrap">
                            <i class="${iconClass}"></i>
                        </div>
                        ${isAdmin ? `
                            <button type="button" class="btn-delete-card" onclick="event.preventDefault(); event.stopPropagation(); window.cardManager.deleteCard('${card.id}')" title="Hapus Tool Ini">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        ` : `
                            <span class="link-card-badge"><i class="fa-solid fa-arrow-up-right-from-square"></i></span>
                        `}
                    </div>

                    <div class="link-card-body">
                        <h4 class="link-card-title">${safeTitle}</h4>
                    </div>

                    <div class="link-card-footer-glow">
                        <span><i class="fa-solid fa-play" style="font-size:0.7rem; margin-right:4px;"></i> Buka Tool</span>
                        <i class="fa-solid fa-chevron-right"></i>
                    </div>
                </a>
            `;
        }).join('');
    }

    /**
     * Buat Tool Baru (Admin Only)
     */
    async createCard(title, url) {
        if (!title || !title.trim()) {
            window.showToast('Nama tool generator wajib diisi!', 'warning');
            return;
        }
        if (!url || !url.trim()) {
            window.showToast('Link URL akses generator wajib diisi!', 'warning');
            return;
        }

        let formattedUrl = url.trim();
        if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
            formattedUrl = 'https://' + formattedUrl;
        }

        const iconClass = this.getSmartIcon(title.trim());

        const submitBtn = document.getElementById('btn-save-card');
        const originalText = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan ke Database...';
        }

        try {
            const payload = {
                action: 'add_card',
                title: title.trim(),
                url: formattedUrl,
                icon: iconClass
            };

            const res = await window.authManager.sendToGoogleScript(payload);

            if (res && res.success) {
                window.showToast(res.message || 'Tool berhasil ditambahkan ke Database!', 'success');
                if (res.card) {
                    this.cards.unshift(res.card);
                    this.renderCards();
                }
                await this.loadCards();
                document.getElementById('create-card-form')?.reset();
            } else {
                this.saveCardLocally(title, formattedUrl, iconClass);
            }
        } catch (err) {
            console.warn('Error saving:', err);
            this.saveCardLocally(title, formattedUrl, iconClass);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        }
    }

    saveCardLocally(title, formattedUrl, iconClass) {
        let saved = JSON.parse(localStorage.getItem('nexus_demo_cards') || 'null') || this.defaultDemoCards;
        const newCard = {
            id: 'CRD-' + Date.now(),
            title: title.trim(),
            url: formattedUrl,
            icon: iconClass,
            createdAt: new Date().toISOString()
        };
        saved.unshift(newCard);
        localStorage.setItem('nexus_demo_cards', JSON.stringify(saved));
        this.cards = saved;
        this.renderCards();
        window.showToast(`Tool '${title}' berhasil ditambahkan ke Studio!`, 'success');
        document.getElementById('create-card-form')?.reset();
    }

    /**
     * Hapus Tool (Admin Only)
     */
    async deleteCard(cardId) {
        if (!confirm('Apakah Anda yakin ingin menghapus tool ini?')) {
            return;
        }

        try {
            const res = await window.authManager.sendToGoogleScript({
                action: 'delete_card',
                cardId: cardId
            });

            if (res && res.success) {
                window.showToast('Tool berhasil dihapus!', 'success');
            }
        } catch (err) {
            console.warn('Delete error:', err);
        }

        this.cards = this.cards.filter(c => c.id !== cardId);
        localStorage.setItem('nexus_demo_cards', JSON.stringify(this.cards));
        this.renderCards();
        window.showToast('Tool berhasil dihapus!', 'info');
    }

    escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

// Global instance
window.cardManager = new CardManager();
