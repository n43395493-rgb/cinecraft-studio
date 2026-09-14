# CineCraft AI Studio - Creative AI Hub & Drama Film Generator Suite

Landing page modern berbasis **GitHub Pages** yang berfungsi sebagai **Launchpad / Hub Akses Tools Generator Kreatif** (AI Drama Generator, Cinematic Movie Maker, StoryCanvas Studio, Voice Dubbing, Video Automation) dengan sinkronisasi ke **Google Spreadsheet**.

---

## 🌟 Struktur Tabel di Google Spreadsheet

### 1. Tab `Users` (4 Kolom):
| Kolom A (`Username`) | Kolom B (`Role`) | Kolom C (`HardwareID`) | Kolom D (`Status`) |
| :--- | :--- | :--- | :--- |
| `admin` | `admin` | *(Bebas Multi PC)* | `aktif` |
| `user1` | `user` | *(Terkunci 1 PC)* | `aktif` |
| `user_baru` | `user` | `NX-XXXX-XXXX` | `nonaktif` |

#### 🔒 Aturan Status & Pendaftaran Otomatis:
1. **Status `aktif`**: Pengguna dapat login dan mengakses seluruh kartu generator di studio.
2. **Status `nonaktif`**: Pengguna **tidak dapat login** dan akan muncul notifikasi: *"Akun Anda berstatus NONAKTIF. Hubungi Admin penyedia untuk aktivasi akun."*
3. **Pendaftaran Otomatis (Auto-Registration)**:
   - Jika ada user memasukkan username yang **belum ada di Spreadsheet**:
     - **Jika PC / Hardware ID belum pernah terdaftar**: Sistem otomatis memasukkan username tersebut ke baris baru di Spreadsheet dengan **Status: `nonaktif`**. User diminta menghubungi admin untuk aktivasi.
     - **Jika PC / Hardware ID sudah pernah terdaftar dengan username lain**: Sistem menolak pendaftaran akun baru di PC tersebut dan otomatis memunculkan username yang sudah terdaftar serta tombol satu-klik untuk login dengan akun tersebut.

---

### 2. Tab `Cards` (5 Kolom):
| Kolom A (`ID`) | Kolom B (`Title`) | Kolom C (`Url`) | Kolom D (`Icon`) | Kolom E (`CreatedAt`) |
| :--- | :--- | :--- | :--- | :--- |

---

### 3. Tab `News` (5 Kolom):
| Kolom A (`ID`) | Kolom B (`Title`) | Kolom C (`Content`) | Kolom D (`CreatedAt`) | Kolom E (`Status`) |
| :--- | :--- | :--- | :--- | :--- |
| `NEWS-20260915-033000` | Judul Pengumuman | Isi deskripsi pengumuman lengkap | `2026-09-15 03:30:00` | `aktif` |

- **Popup Berita Otomatis**: Muncul saat pengguna berhasil login atau me-reload halaman studio.
- **Dikelola oleh Admin**: Admin dapat mempublikasikan pengumuman baru langsung dari dashboard, tersimpan otomatis ke Spreadsheet.

---

## 🚀 Panduan Deploy Google Apps Script

1. Buka [Google Sheets](https://sheets.google.com).
2. Masuk ke **Ekstensi &rarr; Apps Script**.
3. Copy-paste seluruh kode dari file [google_apps_script/Code.gs](file:///e:/Xampp/htdocs/githubhtml/google_apps_script/Code.gs).
4. Klik **Deploy &rarr; Manage deployments &rarr; Edit (ikon pensil) &rarr; New version &rarr; Deploy**.
5. Salin link Web App dan pastikan sudah terpasang di [js/config.js](file:///e:/Xampp/htdocs/githubhtml/js/config.js).
