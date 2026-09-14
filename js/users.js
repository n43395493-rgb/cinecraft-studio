/**
 * =========================================================================================
 * USER MANAGEMENT CONTROLLER (CINECRAFT AI STUDIO - ADMIN ONLY)
 * - Menampilkan daftar user dari Spreadsheet (Username, Role, Hardware ID, Status)
 * - Tambah user baru langsung lewat form Admin
 * - Aktivasi / Nonaktifkan user, Reset HWID, dan Hapus user
 * =========================================================================================
 */

class UserManager {
    constructor() {
        this.users = [];
        this.isLoading = false;
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.bindEvents();
        });
    }

    bindEvents() {
        // Form Tambah User Baru oleh Admin
        const createUserForm = document.getElementById('admin-create-user-form');
        if (createUserForm) {
            createUserForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const usernameInput = document.getElementById('admin-user-username-input');
                const roleInput = document.getElementById('admin-user-role-input');
                const statusInput = document.getElementById('admin-user-status-input');

                if (usernameInput) {
                    const username = usernameInput.value.trim();
                    const role = roleInput ? roleInput.value : 'user';
                    const status = statusInput ? statusInput.value : 'aktif';
                    await this.addUser(username, role, status);
                }
            });
        }
    }

    /**
     * Ambil Data Seluruh Pengguna dari Google Spreadsheet
     */
    async fetchUsers() {
        const container = document.getElementById('admin-users-table-body');
        if (!container) return;

        this.isLoading = true;
        container.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding:24px; color:var(--text-muted);">
                    <i class="fa-solid fa-circle-notch fa-spin"></i> Memuat data pengguna dari Database...
                </td>
            </tr>
        `;

        try {
            const res = await window.authManager.sendToGoogleScript({ action: 'get_users' });
            if (res && res.success && Array.isArray(res.users)) {
                this.users = res.users;
            } else {
                this.loadLocalDemoUsers();
            }
        } catch (err) {
            console.warn('Error load users, fallback to local:', err);
            this.loadLocalDemoUsers();
        } finally {
            this.isLoading = false;
            this.renderUsers();
        }
    }

    loadLocalDemoUsers() {
        let demoDb = JSON.parse(localStorage.getItem('nexus_demo_db') || '[]');
        if (!demoDb || demoDb.length === 0) {
            demoDb = [
                { username: 'admin', role: 'admin', hwid: '', status: 'aktif' },
                { username: 'user1', role: 'user', hwid: '', status: 'aktif' }
            ];
            localStorage.setItem('nexus_demo_db', JSON.stringify(demoDb));
        }
        this.users = demoDb.map(u => ({
            username: u.username,
            role: u.role || 'user',
            hardwareId: u.hwid || '',
            isHwidBound: !!u.hwid,
            status: u.status || 'aktif'
        }));
    }

    /**
     * Render Tabel Pengguna ke DOM
     */
    renderUsers() {
        const tbody = document.getElementById('admin-users-table-body');
        const countBadge = document.getElementById('admin-users-count-badge');
        if (!tbody) return;

        if (countBadge) {
            countBadge.textContent = `${this.users.length} Akun`;
        }

        if (this.users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center; padding:20px; color:var(--text-muted);">
                        Belum ada data user di database.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.users.map((u, idx) => {
            const isAktif = u.status === 'aktif' || u.status === 'active';
            const isAdmin = u.role && u.role.toLowerCase() === 'admin';
            const hwidDisplay = isAdmin 
                ? '<span style="color:var(--text-muted); font-size:0.75rem;">(Bebas Multi PC)</span>'
                : (u.hardwareId ? `<span style="font-family:var(--font-mono); font-size:0.78rem; color:#38bdf8;" title="${u.hardwareId}">${u.hardwareId.substring(0, 10)}...</span>` : '<span style="color:var(--warning); font-size:0.78rem;">Belum Terikat</span>');

            const statusBadge = isAktif 
                ? '<span style="background:rgba(16,185,129,0.2); color:#34d399; border:1px solid rgba(16,185,129,0.3); padding:3px 8px; border-radius:12px; font-size:0.75rem; font-weight:700;"><i class="fa-solid fa-circle-check"></i> AKTIF</span>'
                : '<span style="background:rgba(239,68,68,0.2); color:#f87171; border:1px solid rgba(239,68,68,0.3); padding:3px 8px; border-radius:12px; font-size:0.75rem; font-weight:700;"><i class="fa-solid fa-circle-xmark"></i> NONAKTIF</span>';

            const roleBadge = isAdmin
                ? '<span style="background:rgba(245,158,11,0.2); color:#fbbf24; border:1px solid rgba(245,158,11,0.3); padding:2px 7px; border-radius:6px; font-size:0.72rem; font-weight:800;"><i class="fa-solid fa-crown"></i> ADMIN</span>'
                : '<span style="background:rgba(99,102,241,0.15); color:var(--primary-light); border:1px solid rgba(99,102,241,0.3); padding:2px 7px; border-radius:6px; font-size:0.72rem; font-weight:700;"><i class="fa-solid fa-user"></i> USER</span>';

            return `
                <tr style="border-bottom:1px solid rgba(255,255,255,0.05); transition:background 0.2s;">
                    <td style="padding:10px 12px; font-weight:700; color:#fff;">
                        <i class="fa-solid fa-user-circle" style="color:var(--text-muted); margin-right:6px;"></i>
                        ${this.escapeHtml(u.username)}
                    </td>
                    <td style="padding:10px 12px;">${roleBadge}</td>
                    <td style="padding:10px 12px;">${hwidDisplay}</td>
                    <td style="padding:10px 12px;">${statusBadge}</td>
                    <td style="padding:10px 12px; text-align:right;">
                        <div style="display:flex; justify-content:flex-end; gap:6px;">
                            <button type="button" class="btn btn-sm ${isAktif ? 'btn-danger-soft' : 'btn-cyan'}" style="padding:4px 8px; font-size:0.75rem;" onclick="window.userManager.toggleUserStatus('${u.username}', '${isAktif ? 'nonaktif' : 'aktif'}')" title="${isAktif ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}">
                                <i class="fa-solid ${isAktif ? 'fa-ban' : 'fa-check'}"></i> ${isAktif ? 'Nonaktif' : 'Aktifkan'}
                            </button>
                            ${(!isAdmin && u.hardwareId) ? `
                                <button type="button" class="btn btn-secondary btn-sm" style="padding:4px 8px; font-size:0.75rem;" onclick="window.userManager.resetUserHwid('${u.username}')" title="Reset Kunci Hardware ID">
                                    <i class="fa-solid fa-arrows-rotate"></i> Reset HWID
                                </button>
                            ` : ''}
                            ${!isAdmin ? `
                                <button type="button" class="btn btn-danger-soft btn-sm" style="padding:4px 8px; font-size:0.75rem;" onclick="window.userManager.deleteUser('${u.username}')" title="Hapus User">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Tambah User Baru
     */
    async addUser(username, role = 'user', status = 'aktif') {
        if (!username || !username.trim()) {
            window.showToast?.('Username wajib diisi!', 'warning');
            return;
        }

        const submitBtn = document.getElementById('btn-admin-save-user');
        const originalText = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
        }

        try {
            const res = await window.authManager.sendToGoogleScript({
                action: 'admin_add_user',
                username: username.trim(),
                role: role,
                status: status
            });

            if (res && res.success) {
                window.showToast?.(`User '${username}' berhasil ditambahkan ke Spreadsheet!`, 'success');
                document.getElementById('admin-create-user-form')?.reset();
                await this.fetchUsers();
            } else {
                window.showToast?.(res ? res.message : 'Gagal menambahkan user', 'error');
            }
        } catch (err) {
            console.error('Error adding user:', err);
            window.showToast?.('Terjadi kesalahan saat menambahkan user', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        }
    }

    /**
     * Ubah Status User (Aktif / Nonaktif)
     */
    async toggleUserStatus(targetUser, newStatus) {
        try {
            const res = await window.authManager.sendToGoogleScript({
                action: 'update_user_status',
                targetUser: targetUser,
                status: newStatus
            });

            if (res && res.success) {
                window.showToast?.(res.message || `Status user '${targetUser}' berhasil diubah!`, 'success');
                await this.fetchUsers();
            } else {
                window.showToast?.(res ? res.message : 'Gagal memperbarui status user', 'error');
            }
        } catch (err) {
            console.error('Error updating status:', err);
            window.showToast?.('Gagal memperbarui status user', 'error');
        }
    }

    /**
     * Reset Kunci Hardware ID Pengguna
     */
    async resetUserHwid(targetUser) {
        if (!confirm(`Apakah Anda yakin ingin me-reset Hardware ID untuk akun '${targetUser}'?\n\nPengguna akan bisa mengikat akunnya kembali pada PC baru saat login berikutnya.`)) {
            return;
        }

        try {
            const res = await window.authManager.sendToGoogleScript({
                action: 'reset_hwid',
                targetUser: targetUser
            });

            if (res && res.success) {
                window.showToast?.(`Hardware ID untuk akun '${targetUser}' berhasil di-reset!`, 'success');
                await this.fetchUsers();
            } else {
                window.showToast?.(res ? res.message : 'Gagal mereset Hardware ID', 'error');
            }
        } catch (err) {
            console.error('Error resetting HWID:', err);
            window.showToast?.('Gagal mereset Hardware ID', 'error');
        }
    }

    /**
     * Hapus User
     */
    async deleteUser(targetUser) {
        if (!confirm(`Apakah Anda yakin ingin MENGHAPUS permanen user '${targetUser}' dari Database?`)) {
            return;
        }

        try {
            const res = await window.authManager.sendToGoogleScript({
                action: 'delete_user',
                targetUser: targetUser
            });

            if (res && res.success) {
                window.showToast?.(`User '${targetUser}' berhasil dihapus dari Database!`, 'info');
                await this.fetchUsers();
            } else {
                window.showToast?.(res ? res.message : 'Gagal menghapus user', 'error');
            }
        } catch (err) {
            console.error('Error deleting user:', err);
            window.showToast?.('Gagal menghapus user', 'error');
        }
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
window.userManager = new UserManager();
