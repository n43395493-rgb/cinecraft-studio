/**
 * AUTHENTICATION & HARDWARE ID VERIFICATION HANDLER
 * - 4 Kolom: Username, Role, HardwareID, Status (aktif/nonaktif)
 * - Auto-registration jika username belum ada & HWID belum terdaftar (status: nonaktif)
 * - Auto-detect username jika HWID sudah terdaftar di PC tersebut
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.currentHwid = null;
        this.deviceDetails = null;
        this.isSimulatedDevice = false;
        this.init();
    }

    async init() {
        const hwInfo = await window.deviceFingerprint.getHardwareInfo();
        this.currentHwid = hwInfo.hwid;
        this.deviceDetails = hwInfo.details;

        this.updateHwidBadges();
        this.checkExistingSession();
    }

    updateHwidBadges() {
        const hwidElements = document.querySelectorAll('.display-hwid');
        hwidElements.forEach(el => {
            el.textContent = this.currentHwid || 'Generating...';
        });

        const deviceEl = document.getElementById('display-device-summary');
        if (deviceEl && this.deviceDetails) {
            deviceEl.textContent = this.deviceDetails.deviceSummary;
        }
    }

    async sendToGoogleScript(params) {
        const scriptUrl = window.APP_CONFIG ? window.APP_CONFIG.GOOGLE_SCRIPT_URL : '';

        const isPlaceholderUrl = !scriptUrl || 
                                scriptUrl.includes('_CONTOH_') || 
                                !scriptUrl.startsWith('https://script.google.com/macros/s/');

        if (isPlaceholderUrl) {
            console.warn('URL Google Apps Script belum disetup, beralih ke Mode Simulasi (Demo Mode)');
            return this.handleDemoModeRequest(params);
        }

        try {
            const queryParams = new URLSearchParams(params).toString();
            const fullUrl = `${scriptUrl}?${queryParams}`;

            const response = await fetch(fullUrl, {
                method: 'GET',
                mode: 'cors',
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (fetchError) {
            console.warn('Direct fetch error, mencoba JSONP Fallback:', fetchError);
            return this.sendViaJSONP(scriptUrl, params);
        }
    }

    sendViaJSONP(url, params) {
        return new Promise((resolve, reject) => {
            const callbackName = 'gas_callback_' + Math.round(100000 * Math.random());
            params.callback = callbackName;

            const queryParams = new URLSearchParams(params).toString();
            const fullUrl = `${url}?${queryParams}`;

            const script = document.createElement('script');
            script.src = fullUrl;

            const timeoutId = setTimeout(() => {
                cleanup();
                if (window.APP_CONFIG && window.APP_CONFIG.ALLOW_DEMO_MODE) {
                    console.warn('GAS Timeout, fallback ke Demo Engine');
                    resolve(this.handleDemoModeRequest(params));
                } else {
                    reject(new Error('Koneksi ke Google Apps Script timeout (15s).'));
                }
            }, 15000);

            function cleanup() {
                if (window[callbackName]) delete window[callbackName];
                if (script.parentNode) script.parentNode.removeChild(script);
                clearTimeout(timeoutId);
            }

            window[callbackName] = (data) => {
                cleanup();
                resolve(data);
            };

            script.onerror = () => {
                cleanup();
                if (window.APP_CONFIG && window.APP_CONFIG.ALLOW_DEMO_MODE) {
                    resolve(this.handleDemoModeRequest(params));
                } else {
                    reject(new Error('Gagal memuat script dari Google Apps Script'));
                }
            };

            document.body.appendChild(script);
        });
    }

    /**
     * Demo Mode Engine
     */
    handleDemoModeRequest(params) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const action = params.action;
                const username = (params.username || '').toLowerCase();
                const hwid = params.hardwareId || this.currentHwid;

                let demoDb = JSON.parse(localStorage.getItem('nexus_demo_db') || 'null');
                if (!demoDb) {
                    demoDb = [
                        { username: 'admin', role: 'admin', hwid: null, status: 'aktif' },
                        { username: 'user1', role: 'user', hwid: null, status: 'aktif' }
                    ];
                    localStorage.setItem('nexus_demo_db', JSON.stringify(demoDb));
                }

                if (action === 'login') {
                    const user = demoDb.find(u => u.username.toLowerCase() === username);

                    // KASUS 1: Username belum ada di Database
                    if (!user) {
                        // Cek apakah HWID sudah pernah terdaftar dengan user lain
                        const existingUserWithSameHWID = demoDb.find(u => u.hwid && u.hwid === hwid);
                        if (existingUserWithSameHWID) {
                            return resolve({
                                success: false,
                                isDemo: true,
                                errorType: 'HWID_ALREADY_REGISTERED',
                                existingUsername: existingUserWithSameHWID.username,
                                message: `Perangkat ini sudah terdaftar dengan username '${existingUserWithSameHWID.username}'. Silakan gunakan username tersebut.`
                            });
                        }

                        // Auto-register akun baru (status: nonaktif)
                        const newUser = {
                            username: username,
                            role: 'user',
                            hwid: hwid,
                            status: 'nonaktif'
                        };
                        demoDb.push(newUser);
                        localStorage.setItem('nexus_demo_db', JSON.stringify(demoDb));

                        return resolve({
                            success: false,
                            isDemo: true,
                            isNewRegistration: true,
                            errorType: 'ACCOUNT_INACTIVE',
                            message: `Akun '${username}' berhasil didaftarkan dengan status NONAKTIF. Hubungi Admin penyedia untuk aktivasi akun.`
                        });
                    }

                    // KASUS 2: Username terdaftar -> Cek Status
                    if (user.status !== 'aktif') {
                        return resolve({
                            success: false,
                            isDemo: true,
                            errorType: 'ACCOUNT_INACTIVE',
                            message: `Akun '${user.username}' berstatus NONAKTIF. Hubungi Admin penyedia untuk mengaktifkan akun Anda.`
                        });
                    }

                    // Role Admin
                    if (user.role.toLowerCase() === 'admin') {
                        return resolve({
                            success: true,
                            isDemo: true,
                            isAdmin: true,
                            user: {
                                username: user.username,
                                fullName: user.username + ' (Admin)',
                                role: 'admin',
                                hardwareId: 'Unlimited (Admin Bypass)',
                                status: 'aktif'
                            }
                        });
                    }

                    // Role User -> Bind atau Cek HWID
                    if (!user.hwid) {
                        user.hwid = hwid;
                        localStorage.setItem('nexus_demo_db', JSON.stringify(demoDb));
                        return resolve({
                            success: true,
                            isDemo: true,
                            isAdmin: false,
                            isFirstBinding: true,
                            user: {
                                username: user.username,
                                fullName: user.username,
                                role: user.role,
                                hardwareId: hwid,
                                status: 'aktif'
                            }
                        });
                    }

                    if (user.hwid === hwid) {
                        return resolve({
                            success: true,
                            isDemo: true,
                            isAdmin: false,
                            isFirstBinding: false,
                            user: {
                                username: user.username,
                                fullName: user.username,
                                role: user.role,
                                hardwareId: hwid,
                                status: 'aktif'
                            }
                        });
                    }

                    // Device Mismatch
                    return resolve({
                        success: false,
                        isDemo: true,
                        errorType: 'DEVICE_LOCKED',
                        message: `AKSES DITOLAK: Akun '${user.username}' sudah terikat pada PC lain!`
                    });
                }

                if (action === 'register') {
                    const existingUser = demoDb.find(u => u.username.toLowerCase() === username);
                    if (existingUser) {
                        return resolve({ success: false, message: `Username '${username}' sudah terdaftar di sistem!` });
                    }

                    const newUser = {
                        username: username,
                        role: 'user',
                        hwid: hwid,
                        status: 'nonaktif'
                    };
                    demoDb.push(newUser);
                    localStorage.setItem('nexus_demo_db', JSON.stringify(demoDb));

                    return resolve({
                        success: true,
                        isNewRegistration: true,
                        message: `Pendaftaran Berhasil! Akun '${username}' telah tersimpan di sistem dengan status NONAKTIF. Hubungi Admin penyedia untuk aktivasi akun.`
                    });
                }

                resolve({ success: false, message: 'Aksi demo tidak dikenal' });
            }, 500);
        });
    }

    /**
     * Proses Login Pengguna
     */
    async login(username) {
        if (!username || !username.trim()) {
            throw new Error('Harap masukkan Username Anda!');
        }

        const hwInfo = await window.deviceFingerprint.getHardwareInfo();
        const effectiveHwid = this.isSimulatedDevice ? 'NX-FAKE-9999-FAKE-0000' : hwInfo.hwid;

        const payload = {
            action: 'login',
            username: username.trim(),
            hardwareId: effectiveHwid
        };

        const result = await this.sendToGoogleScript(payload);

        if (result && result.success) {
            this.currentUser = result.user;
            localStorage.setItem('nexus_user_session', JSON.stringify(result.user));
            this.onLoginSuccess(result);
            return result;
        } else {
            return result;
        }
    }

    /**
     * Proses Pendaftaran Akun Baru (Status: Nonaktif)
     */
    async register(username) {
        if (!username || !username.trim()) {
            throw new Error('Harap masukkan Username yang ingin didaftarkan!');
        }

        const hwInfo = await window.deviceFingerprint.getHardwareInfo();
        const effectiveHwid = this.isSimulatedDevice ? 'NX-FAKE-9999-FAKE-0000' : hwInfo.hwid;

        const payload = {
            action: 'register',
            username: username.trim(),
            hardwareId: effectiveHwid
        };

        const result = await this.sendToGoogleScript(payload);
        return result;
    }

    onLoginSuccess(result) {
        this.updateUIForLoggedInState(result.user);
        const welcomeMsg = result.isAdmin 
            ? `Selamat datang Admin ${result.user.username}! Akses studio aktif.` 
            : `Login Berhasil! Selamat berkarya, ${result.user.username}.`;
        window.showToast?.(welcomeMsg, 'success');

        // Tampilkan Popup Berita Otomatis saat Login
        setTimeout(() => {
            window.newsManager?.checkAndShowPopupOnLoadOrLogin();
        }, 600);
    }

    updateUIForLoggedInState(user) {
        const guestElements = document.querySelectorAll('.auth-guest-only');
        const memberElements = document.querySelectorAll('.auth-member-only');
        const userNameDisplays = document.querySelectorAll('.display-user-name');
        const userRoleDisplays = document.querySelectorAll('.display-user-role');
        const userHwidDisplays = document.querySelectorAll('.display-user-hwid');

        guestElements.forEach(el => el.classList.add('hidden'));
        memberElements.forEach(el => el.classList.remove('hidden'));

        userNameDisplays.forEach(el => el.textContent = user.username);
        userRoleDisplays.forEach(el => el.textContent = user.role ? user.role.toUpperCase() : 'USER');
        userHwidDisplays.forEach(el => el.textContent = user.hardwareId || this.currentHwid);

        const portalSection = document.getElementById('member-portal');
        if (portalSection) {
            portalSection.classList.remove('hidden');
        }

        if (window.cardManager) {
            window.cardManager.loadCards();
        }

        // Tampilkan fitur admin jika role admin
        const isAdmin = user.role && user.role.toLowerCase() === 'admin';
        const adminTools = document.querySelectorAll('.admin-only-feature');
        adminTools.forEach(el => {
            if (isAdmin) el.classList.remove('hidden');
            else el.classList.add('hidden');
        });

        if (isAdmin && window.userManager) {
            window.userManager.fetchUsers();
        }

        const authStatusBadge = document.getElementById('auth-status-indicator');
        if (authStatusBadge) {
            authStatusBadge.className = 'status-badge status-connected';
            const roleTag = (user.role && user.role.toLowerCase() === 'admin') ? 'ADMIN' : 'KREATOR AKTIF';
            authStatusBadge.innerHTML = `<span class="dot pulse"></span> <strong>${user.username}</strong> [${roleTag}]`;
        }
    }

    checkExistingSession() {
        try {
            const savedSession = localStorage.getItem('nexus_user_session');
            if (savedSession) {
                const user = JSON.parse(savedSession);
                if (user && user.username) {
                    const isAdmin = user.role && user.role.toLowerCase() === 'admin';
                    
                    // Verifikasi session: Admin bebas PC, atau User pada PC yang sama
                    if (isAdmin || !user.hardwareId || user.hardwareId === this.currentHwid || user.hardwareId.includes('Unlimited')) {
                        this.currentUser = user;
                        this.updateUIForLoggedInState(user);

                        // Auto-refresh kartu tools studio saat reload
                        if (window.cardManager) {
                            window.cardManager.loadCards();
                        } else {
                            setTimeout(() => window.cardManager?.loadCards(), 200);
                        }

                        // Tampilkan Popup Berita Otomatis saat Reload / Buka Ulang Halaman
                        setTimeout(() => {
                            window.newsManager?.checkAndShowPopupOnLoadOrLogin();
                        }, 800);
                    } else {
                        console.warn('Session HWID mismatch');
                        this.logout(false);
                    }
                }
            }
        } catch (e) {
            console.error('Error parsing session:', e);
        }
    }

    logout(showNotification = true) {
        this.currentUser = null;
        localStorage.removeItem('nexus_user_session');

        const guestElements = document.querySelectorAll('.auth-guest-only');
        const memberElements = document.querySelectorAll('.auth-member-only');
        guestElements.forEach(el => el.classList.remove('hidden'));
        memberElements.forEach(el => el.classList.add('hidden'));

        const portalSection = document.getElementById('member-portal');
        if (portalSection) {
            portalSection.classList.add('hidden');
        }

        const authStatusBadge = document.getElementById('auth-status-indicator');
        if (authStatusBadge) {
            authStatusBadge.className = 'status-badge status-disconnected';
            authStatusBadge.innerHTML = `<span class="dot"></span> Belum Login`;
        }

        if (showNotification) {
            window.showToast?.('Anda telah berhasil keluar dari Studio.', 'info');
        }
    }
}

// Global instance
window.authManager = new AuthManager();
