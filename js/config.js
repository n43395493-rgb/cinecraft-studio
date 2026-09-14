/**
 * KONFIGURASI APLIKASI & GOOGLE APPS SCRIPT
 * 
 * Silakan ganti GOOGLE_SCRIPT_URL dengan URL Web App Google Apps Script Anda setelah di-deploy.
 * Format URL Web App: https://script.google.com/macros/s/AKfycbx.../exec
 */

const APP_CONFIG = {
    // URL Web App Google Apps Script
    GOOGLE_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzOMFk_MvXdqRQMF-q3xYBZth85GsjWymCkXKXr5qqveBTvTZtSiejYJ9vHuW28_XPWsw/exec",
    
    // Nama Aplikasi / Produk
    APP_NAME: "CineCraft AI Studio",
    
    // Versi Aplikasi
    VERSION: "3.0.0",
    
    // Izinkan Mode Simulasi / Demo jika URL belum diisi atau server offline
    ALLOW_DEMO_MODE: true,

    // Kredensial Akun Percobaan (Demo Mode) - Username Only (Unik)
    DEMO_ACCOUNTS: [
        {
            username: "admin",
            name: "Studio Manager",
            role: "admin",
            allowedHwid: null
        },
        {
            username: "user1",
            name: "Kreator Pro",
            role: "user",
            allowedHwid: null
        }
    ]
};

// Export ke global window
window.APP_CONFIG = APP_CONFIG;
