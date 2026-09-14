/**
 * MAIN LANDING PAGE INTERACTION CONTROLLER
 * Menangani UI Interaktif, Modal, Form Login, Form Register & Notifikasi
 */

document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initModals();
    initAuthForms();
    initNavbarScroll();

    // Auto-load / Auto-refresh cards pada setiap reload
    setTimeout(() => {
        if (window.cardManager) {
            window.cardManager.loadCachedCardsInstantly();
            window.cardManager.loadCards();
        }
    }, 150);
});

/**
 * Toast Notification System
 */
window.showToast = function(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} slide-in-right`;

    const iconMap = {
        success: 'fa-solid fa-circle-check',
        error: 'fa-solid fa-circle-xmark',
        warning: 'fa-solid fa-triangle-exclamation',
        info: 'fa-solid fa-circle-info'
    };

    toast.innerHTML = `
        <i class="${iconMap[type] || iconMap.info} toast-icon"></i>
        <div class="toast-content">
            <div class="toast-text">${message.replace(/\n/g, '<br>')}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 400);
    }, 5000);
};

/**
 * Custom Modal Notification / Alert with Optional Action Button
 */
window.showNotificationModal = function(title, message, actionBtnConfig = null) {
    const modal = document.getElementById('alert-modal');
    if (!modal) return;

    document.getElementById('alert-modal-title').textContent = title;
    document.getElementById('alert-modal-message').innerHTML = message.replace(/\n/g, '<br>');
    
    const actionContainer = document.getElementById('alert-modal-action-wrap');
    if (actionContainer) {
        if (actionBtnConfig) {
            actionContainer.innerHTML = `
                <button class="btn btn-cyan btn-lg" id="alert-custom-action-btn" style="width:100%; margin-bottom:8px;">
                    ${actionBtnConfig.text}
                </button>
            `;
            document.getElementById('alert-custom-action-btn')?.addEventListener('click', () => {
                modal.classList.remove('active');
                actionBtnConfig.onClick();
            });
        } else {
            actionContainer.innerHTML = '';
        }
    }

    modal.classList.add('active');
};

/**
 * Inisialisasi Event Modal
 */
function initModals() {
    const openLoginBtns = document.querySelectorAll('.btn-open-login');
    const loginModal = document.getElementById('login-modal');

    openLoginBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (loginModal) {
                loginModal.classList.add('active');
                switchAuthTab('login');
                setTimeout(() => document.getElementById('login-username')?.focus(), 200);
            }
        });
    });

    const closeButtons = document.querySelectorAll('.modal-close, .modal-backdrop, .btn-close-modal');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal-wrapper').forEach(m => m.classList.remove('active'));
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-wrapper').forEach(m => m.classList.remove('active'));
        }
    });
}

/**
 * Switch Auth Tab: 'login' vs 'register'
 */
function switchAuthTab(tab) {
    const tabLoginBtn = document.getElementById('tab-btn-login');
    const tabRegisterBtn = document.getElementById('tab-btn-register');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (tab === 'login') {
        tabLoginBtn?.classList.add('active');
        tabLoginBtn?.style.setProperty('background', 'linear-gradient(135deg, var(--primary), var(--secondary))');
        tabLoginBtn?.style.setProperty('color', '#fff');

        tabRegisterBtn?.classList.remove('active');
        tabRegisterBtn?.style.setProperty('background', 'transparent');
        tabRegisterBtn?.style.setProperty('color', 'var(--text-muted)');

        loginForm?.classList.remove('hidden');
        registerForm?.classList.add('hidden');
        document.getElementById('login-username')?.focus();
    } else {
        tabRegisterBtn?.classList.add('active');
        tabRegisterBtn?.style.setProperty('background', 'linear-gradient(135deg, #06b6d4, #3b82f6)');
        tabRegisterBtn?.style.setProperty('color', '#fff');

        tabLoginBtn?.classList.remove('active');
        tabLoginBtn?.style.setProperty('background', 'transparent');
        tabLoginBtn?.style.setProperty('color', 'var(--text-muted)');

        registerForm?.classList.remove('hidden');
        loginForm?.classList.add('hidden');
        document.getElementById('register-username')?.focus();
    }
}

/**
 * Handle Form Login & Form Register Submission
 */
function initAuthForms() {
    // Tab Button Clickers
    document.getElementById('tab-btn-login')?.addEventListener('click', () => switchAuthTab('login'));
    document.getElementById('tab-btn-register')?.addEventListener('click', () => switchAuthTab('register'));

    document.querySelectorAll('.btn-switch-to-register').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            switchAuthTab('register');
        });
    });

    document.querySelectorAll('.btn-switch-to-login').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            switchAuthTab('login');
        });
    });

    // 1. LOGIN FORM SUBMISSION
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('login-username');
    const submitBtn = document.getElementById('login-submit-btn');
    const btnText = submitBtn?.querySelector('.btn-text');
    const spinner = submitBtn?.querySelector('.btn-spinner');

    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = usernameInput.value.trim();
        if (!username) {
            window.showToast('Silakan masukkan username Anda', 'warning');
            return;
        }

        if (submitBtn) submitBtn.disabled = true;
        if (btnText) btnText.textContent = 'Memverifikasi...';
        if (spinner) spinner.classList.remove('hidden');

        try {
            const res = await window.authManager.login(username);

            if (res && res.success) {
                document.getElementById('login-modal')?.classList.remove('active');
                loginForm.reset();
                return;
            }

            // USER TIDAK DITEMUKAN -> Tawarkan daftar baru
            if (res && res.userNotFound) {
                window.showNotificationModal(
                    'Username Belum Terdaftar ℹ️',
                    `Username <strong>${username}</strong> belum terdaftar di sistem.<br><br>Apakah Anda ingin mendaftarkan username ini sekarang?`,
                    {
                        text: `Daftarkan '${username}'`,
                        onClick: () => {
                            switchAuthTab('register');
                            const regInput = document.getElementById('register-username');
                            if (regInput) regInput.value = username;
                            document.getElementById('login-modal')?.classList.add('active');
                        }
                    }
                );
                return;
            }

            // STATUS NONAKTIF & AUTO REGISTRATION
            if (res && res.errorType === 'ACCOUNT_INACTIVE') {
                document.getElementById('login-modal')?.classList.remove('active');
                if (res.isNewRegistration) {
                    window.showNotificationModal(
                        'Pendaftaran Berhasil Tercatat 📝',
                        `Username <strong>${username}</strong> otomatis didaftarkan ke Database dengan status <strong>NONAKTIF</strong>.<br><br>👉 Silakan hubungi <strong>Admin penyedia</strong> untuk mengaktifkan akun Anda agar bisa mengakses tools studio.`
                    );
                } else {
                    window.showNotificationModal(
                        'Status Akun: Nonaktif ⚠️',
                        `Akun <strong>${username}</strong> berstatus <strong>NONAKTIF</strong>.<br><br>👉 Silakan hubungi <strong>Admin penyedia</strong> untuk mengaktifkan akun Anda agar bisa mengakses tools studio.`
                    );
                }
                return;
            }

            // PERANGKAT SUDAH TERDAFTAR (HWID ALREADY USED)
            if (res && res.errorType === 'HWID_ALREADY_REGISTERED' && res.existingUsername) {
                document.getElementById('login-modal')?.classList.remove('active');
                window.showNotificationModal(
                    'Perangkat Sudah Terdaftar 🔒',
                    `Perangkat ini sudah terikat dengan username: <br><strong style="font-size:1.15rem; color:#38bdf8;">${res.existingUsername}</strong><br><br>Silakan login dengan akun tersebut:`,
                    {
                        text: `Login dengan ${res.existingUsername}`,
                        onClick: () => {
                            if (usernameInput) usernameInput.value = res.existingUsername;
                            document.getElementById('login-modal')?.classList.add('active');
                            switchAuthTab('login');
                            setTimeout(() => submitBtn?.click(), 300);
                        }
                    }
                );
                return;
            }

            // DEVICE LOCKED (PC LAIN)
            if (res && res.errorType === 'DEVICE_LOCKED') {
                document.getElementById('login-modal')?.classList.remove('active');
                window.showNotificationModal(
                    'Akses Ditolak: Device Locked 🚫',
                    res.message || 'Akun ini terkunci pada perangkat PC lain!'
                );
                return;
            }

            if (res && res.message) {
                window.showToast(res.message, 'error');
            }
        } catch (err) {
            console.error('Login error:', err);
            window.showToast(err.message || 'Terjadi kesalahan saat login', 'error');
        } finally {
            if (submitBtn) submitBtn.disabled = false;
            if (btnText) btnText.textContent = 'Masuk ke Studio';
            if (spinner) spinner.classList.add('hidden');
        }
    });

    // 2. REGISTER FORM SUBMISSION
    const registerForm = document.getElementById('register-form');
    const registerInput = document.getElementById('register-username');
    const regSubmitBtn = document.getElementById('register-submit-btn');
    const regBtnText = regSubmitBtn?.querySelector('.btn-text');
    const regSpinner = regSubmitBtn?.querySelector('.btn-spinner');

    registerForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const newUsername = registerInput.value.trim();
        if (!newUsername) {
            window.showToast('Silakan tulis username baru yang diinginkan', 'warning');
            return;
        }

        if (regSubmitBtn) regSubmitBtn.disabled = true;
        if (regBtnText) regBtnText.textContent = 'Mendaftarkan ke Database...';
        if (regSpinner) regSpinner.classList.remove('hidden');

        try {
            const res = await window.authManager.register(newUsername);

            if (res && res.success) {
                document.getElementById('login-modal')?.classList.remove('active');
                registerForm.reset();

                window.showNotificationModal(
                    'Pendaftaran Berhasil 🎉',
                    `Akun baru <strong>${newUsername}</strong> berhasil didaftarkan ke sistem dengan status <strong>NONAKTIF</strong>.<br><br>👉 Silakan hubungi <strong>Admin penyedia</strong> untuk aktivasi akun agar bisa login.`
                );
            } else {
                window.showToast(res ? res.message : 'Pendaftaran gagal!', 'error');
            }
        } catch (err) {
            console.error('Register error:', err);
            window.showToast(err.message || 'Gagal mendaftarkan akun baru', 'error');
        } finally {
            if (regSubmitBtn) regSubmitBtn.disabled = false;
            if (regBtnText) regBtnText.textContent = 'Daftarkan Akun Baru';
            if (regSpinner) regSpinner.classList.add('hidden');
        }
    });

    // Logout Buttons
    document.querySelectorAll('.btn-do-logout').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            window.authManager.logout();
        });
    });
}

/**
 * Navbar blur on scroll
 */
function initNavbarScroll() {
    const nav = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 30) {
            nav?.classList.add('navbar-scrolled');
        } else {
            nav?.classList.remove('navbar-scrolled');
        }
    });
}

/**
 * Canvas Background Effect
 */
function initParticles() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const count = Math.min(Math.floor(window.innerWidth / 20), 60);

    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            radius: Math.random() * 2 + 1,
            alpha: Math.random() * 0.4 + 0.2
        });
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(168, 85, 247, ${p.alpha})`;
            ctx.fill();

            for (let j = i + 1; j < particles.length; j++) {
                const p2 = particles[j];
                const dx = p.x - p2.x;
                const dy = p.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 110) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = `rgba(129, 140, 248, ${0.15 * (1 - dist / 110)})`;
                    ctx.lineWidth = 0.7;
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(animate);
    }

    animate();
}
