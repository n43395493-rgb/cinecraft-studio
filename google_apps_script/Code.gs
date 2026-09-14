/**
 * =========================================================================================
 * GOOGLE APPS SCRIPT - CINECRAFT AI STUDIO (LOGIN, REGISTER, STATUS & CARDS)
 * =========================================================================================
 * 
 * STRUKTUR SPREADSHEET:
 * 1. Tab 'Users':
 *    - Kolom A: Username   (Unik)
 *    - Kolom B: Role       ('admin' -> Bebas multi PC, 'user' -> Terkunci 1 PC)
 *    - Kolom C: HardwareID (Pengenal fisik PC)
 *    - Kolom D: Status     ('aktif' -> Bisa login, 'nonaktif' -> Menunggu aktivasi admin)
 * 
 * 2. Tab 'Cards':
 *    - Kolom A: ID
 *    - Kolom B: Title
 *    - Kolom C: Url
 *    - Kolom D: Icon
 *    - Kolom E: CreatedAt
 * =========================================================================================
 */

const SHEET_USERS = "Users";
const SHEET_CARDS = "Cards";
const SHEET_NEWS = "News";

function doGet(e) {
  return handleRequest(e ? e.parameter : {});
}

function doPost(e) {
  var params = {};
  if (e && e.postData && e.postData.contents) {
    try {
      params = JSON.parse(e.postData.contents);
    } catch (err) {
      params = e.parameter || {};
    }
  } else if (e && e.parameter) {
    params = e.parameter;
  }
  return handleRequest(params);
}

function handleRequest(params) {
  var action = (params.action || "ping").toLowerCase();
  var callback = params.callback;
  var result = { success: false, message: "Aksi tidak dikenal" };

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var userSheet = ss.getSheetByName(SHEET_USERS);
    var cardSheet = ss.getSheetByName(SHEET_CARDS);
    var newsSheet = ss.getSheetByName(SHEET_NEWS);

    // Auto-create Tab jika belum ada
    if (!userSheet) {
      userSheet = ss.insertSheet(SHEET_USERS);
      userSheet.getRange(1, 1, 1, 4).setValues([["Username", "Role", "HardwareID", "Status"]]);
      userSheet.getRange(1, 1, 1, 4).setBackground("#0f172a").setFontColor("#38bdf8").setFontWeight("bold").setHorizontalAlignment("center");
      userSheet.getRange(2, 1, 2, 4).setValues([
        ["admin", "admin", "", "aktif"],
        ["user1", "user", "", "aktif"]
      ]);
      userSheet.autoResizeColumns(1, 4);
    }

    if (!cardSheet) {
      cardSheet = ss.insertSheet(SHEET_CARDS);
      cardSheet.getRange(1, 1, 1, 5).setValues([["ID", "Title", "Url", "Icon", "CreatedAt"]]);
      cardSheet.getRange(1, 1, 1, 5).setBackground("#1e1b4b").setFontColor("#c084fc").setFontWeight("bold").setHorizontalAlignment("center");
      
      var initialCards = [
        ["CRD-01", "AI Drama & Short Film Generator", "https://storycanvas.ai", "fa-solid fa-clapperboard", "2026-09-15 00:00:00"],
        ["CRD-02", "Cinematic Movie & Video Studio", "https://runwayml.com", "fa-solid fa-film", "2026-09-15 00:00:00"],
        ["CRD-03", "StoryCanvas & Character Studio", "https://midjourney.com", "fa-solid fa-wand-magic-sparkles", "2026-09-15 00:00:00"],
        ["CRD-04", "SenseVoice Subtitle & Auto Dubbing", "https://elevenlabs.io", "fa-solid fa-microphone-lines", "2026-09-15 00:00:00"],
        ["CRD-05", "Wan2GP Video Generator AI", "https://huggingface.co", "fa-solid fa-video", "2026-09-15 00:00:00"],
        ["CRD-06", "UGC Maker & Social Clip Automation", "https://capcut.com", "fa-solid fa-photo-film", "2026-09-15 00:00:00"]
      ];
      cardSheet.getRange(2, 1, initialCards.length, 5).setValues(initialCards);
      cardSheet.autoResizeColumns(1, 5);
    }

    if (!newsSheet) {
      newsSheet = ss.insertSheet(SHEET_NEWS);
      newsSheet.getRange(1, 1, 1, 5).setValues([["ID", "Title", "Content", "CreatedAt", "Status"]]);
      newsSheet.getRange(1, 1, 1, 5).setBackground("#064e3b").setFontColor("#34d399").setFontWeight("bold").setHorizontalAlignment("center");
      
      var nowStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
      var initialNews = [
        ["NEWS-01", "Selamat Datang di CineCraft AI Studio!", "Studio kreasi AI resmi dibuka. Nikmati akses tools Drama Generator, Film AI, Dubbing Suara, dan Video Automation dengan performa terbaik.", nowStr, "aktif"]
      ];
      newsSheet.getRange(2, 1, initialNews.length, 5).setValues(initialNews);
      newsSheet.autoResizeColumns(1, 5);
    }

    if (action === "ping") {
      result = {
        success: true,
        message: "Server Google Apps Script Aktif!",
        timestamp: new Date().toISOString()
      };
    } 
    else if (action === "login") {
      result = processLogin(userSheet, params);
    } 
    else if (action === "register") {
      result = processRegister(userSheet, params);
    } 
    else if (action === "get_cards") {
      result = processGetCards(cardSheet);
    } 
    else if (action === "add_card") {
      result = processAddCard(cardSheet, params);
    } 
    else if (action === "delete_card") {
      result = processDeleteCard(cardSheet, params);
    } 
    else if (action === "get_news") {
      result = processGetNews(newsSheet);
    }
    else if (action === "add_news") {
      result = processAddNews(newsSheet, params);
    }
    else if (action === "delete_news") {
      result = processDeleteNews(newsSheet, params);
    }
    else if (action === "reset_hwid") {
      result = processResetHWID(userSheet, params);
    }
  } catch (error) {
    result = {
      success: false,
      message: "Terjadi kesalahan server: " + error.toString()
    };
  }

  var jsonString = JSON.stringify(result);
  if (callback) {
    return ContentService.createTextOutput(callback + "(" + jsonString + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    return ContentService.createTextOutput(jsonString)
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Logika Login Pengguna
 */
function processLogin(sheet, params) {
  var username = (params.username || "").trim();
  var hardwareId = (params.hardwareId || "").trim();

  if (!username) return { success: false, message: "Username wajib diisi!" };
  if (!hardwareId) return { success: false, message: "Hardware ID tidak terdeteksi dari browser!" };

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { 
      success: false, 
      userNotFound: true,
      message: "Username '" + username + "' belum terdaftar. Silakan pilih tab 'Daftar Baru' untuk membuat akun." 
    };
  }

  var colUser = 0;
  var colRole = 1;
  var colHwid = 2;
  var colStatus = 3;

  var userRowIndex = -1;
  var userData = null;

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (String(row[colUser]).toLowerCase() === username.toLowerCase()) {
      userRowIndex = i + 1;
      userData = row;
      break;
    }
  }

  // Jika Username belum ada di Spreadsheet -> Otomatis simpan ke Database dengan Status: nonaktif
  if (!userData) {
    sheet.appendRow([username, "user", hardwareId, "nonaktif"]);
    return { 
      success: false, 
      isNewRegistration: true,
      errorType: "ACCOUNT_INACTIVE",
      message: "Username '" + username + "' berhasil disimpan ke Database dengan status NONAKTIF.\n\nSilakan hubungi Admin penyedia untuk aktivasi akun agar bisa login." 
    };
  }

  var rawRole = String(userData[colRole] || "user").trim();
  var roleLower = rawRole.toLowerCase();
  var existingHWID = String(userData[colHwid] || "").trim();
  var rawStatus = String(userData[colStatus] || "nonaktif").trim().toLowerCase();

  // 1. Validasi Status Akun (Aktif vs Nonaktif)
  if (rawStatus !== "aktif" && rawStatus !== "active") {
    return {
      success: false,
      errorType: "ACCOUNT_INACTIVE",
      message: "Akun '" + username + "' berstatus NONAKTIF. Hubungi Admin penyedia untuk mengaktifkan akun Anda."
    };
  }

  // 2. Role Admin: Bebas multi PC
  if (roleLower === "admin" || roleLower === "administrator") {
    return {
      success: true,
      isAdmin: true,
      isFirstBinding: false,
      message: "Login ADMIN Berhasil! Bebas kelola tool di PC mana saja.",
      user: {
        username: userData[colUser],
        fullName: userData[colUser] + " (Admin)",
        role: "admin",
        hardwareId: "Unlimited (Admin Bypass)",
        status: "aktif"
      }
    };
  }

  // 3. Role User: Terkunci 1 PC
  // Kondisi A: HWID masih kosong di sheet -> Bind ke PC ini
  if (!existingHWID || existingHWID === "" || existingHWID === "-") {
    sheet.getRange(userRowIndex, colHwid + 1).setValue(hardwareId);
    return {
      success: true,
      isAdmin: false,
      isFirstBinding: true,
      message: "Login Berhasil! Username '" + userData[colUser] + "' telah di-binding pada PC ini.",
      user: {
        username: userData[colUser],
        fullName: userData[colUser],
        role: "user",
        hardwareId: hardwareId,
        status: "aktif"
      }
    };
  }

  // Kondisi B: HWID cocok
  if (existingHWID === hardwareId) {
    return {
      success: true,
      isAdmin: false,
      isFirstBinding: false,
      message: "Login Berhasil! Perangkat PC terverifikasi.",
      user: {
        username: userData[colUser],
        fullName: userData[colUser],
        role: "user",
        hardwareId: hardwareId,
        status: "aktif"
      }
    };
  } 
  
  // Kondisi C: HWID beda (PC lain)
  else {
    return {
      success: false,
      errorType: "DEVICE_LOCKED",
      message: "AKSES DITOLAK (DEVICE LOCKED):\nAkun '" + username + "' sudah terikat pada PC lain!\n\nID Terdaftar: " + existingHWID.substring(0, 10) + "...\nID PC Anda: " + hardwareId.substring(0, 10) + "...\n\nSatu akun hanya bisa digunakan pada 1 PC."
    };
  }
}

/**
 * Logika Pendaftaran Akun Baru (Status Otomatis: nonaktif)
 */
function processRegister(sheet, params) {
  var username = (params.username || "").trim();
  var hardwareId = (params.hardwareId || "").trim();

  if (!username) return { success: false, message: "Username wajib diisi!" };
  if (!hardwareId) return { success: false, message: "Hardware ID tidak terdeteksi dari browser!" };

  var data = sheet.getDataRange().getValues();

  // Cek apakah username sudah dipakai
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === username.toLowerCase()) {
      return { 
        success: false, 
        message: "Username '" + username + "' sudah digunakan oleh pengguna lain. Silakan pilih username yang berbeda!" 
      };
    }
  }

  // Masukkan baris baru ke Spreadsheet dengan Status: nonaktif
  sheet.appendRow([username, "user", hardwareId, "nonaktif"]);

  return {
    success: true,
    isNewRegistration: true,
    message: "Pendaftaran Berhasil! Akun '" + username + "' telah tersimpan di sistem dengan status NONAKTIF. Hubungi Admin penyedia untuk aktivasi akun."
  };
}

/**
 * Ambil Seluruh Data Kartu dari Tab 'Cards'
 */
function processGetCards(cardSheet) {
  var data = cardSheet.getDataRange().getValues();
  var cards = [];

  if (data.length > 1) {
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (row[0] && row[1]) {
        cards.push({
          id: String(row[0]),
          title: String(row[1]),
          url: String(row[2]),
          icon: String(row[3] || "fa-solid fa-wand-magic-sparkles"),
          createdAt: String(row[4] || "")
        });
      }
    }
  }

  return {
    success: true,
    cards: cards
  };
}

/**
 * Tambah Kartu Baru ke Tab 'Cards'
 */
function processAddCard(cardSheet, params) {
  var title = (params.title || "").trim();
  var url = (params.url || "").trim();
  var icon = (params.icon || "").trim();

  if (!title) return { success: false, message: "Nama tool/kartu wajib diisi!" };
  if (!url) return { success: false, message: "Link URL akses wajib diisi!" };

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }

  if (!icon) {
    icon = getSmartIconForTitle(title);
  }

  var cardId = "CRD-" + Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyyMMdd-HHmmss");
  var nowStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");

  cardSheet.appendRow([
    cardId,
    title,
    url,
    icon,
    nowStr
  ]);

  return {
    success: true,
    message: "Tool '" + title + "' berhasil disimpan!",
    card: {
      id: cardId,
      title: title,
      url: url,
      icon: icon,
      createdAt: nowStr
    }
  };
}

/**
 * Hapus Kartu dari Tab 'Cards'
 */
function processDeleteCard(cardSheet, params) {
  var cardId = (params.cardId || "").trim();
  if (!cardId) return { success: false, message: "ID kartu tidak valid!" };

  var data = cardSheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === cardId) {
      cardSheet.deleteRow(i + 1);
      return { success: true, message: "Tool berhasil dihapus!" };
    }
  }

  return { success: false, message: "Tool tidak ditemukan!" };
}

/**
 * Ambil Seluruh Data Berita/Pengumuman dari Tab 'News'
 */
function processGetNews(newsSheet) {
  var data = newsSheet.getDataRange().getValues();
  var newsList = [];

  if (data.length > 1) {
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (row[0] && row[1]) {
        var status = String(row[4] || "aktif").toLowerCase();
        if (status === "aktif" || status === "active") {
          newsList.push({
            id: String(row[0]),
            title: String(row[1]),
            content: String(row[2]),
            createdAt: String(row[3] || ""),
            status: status
          });
        }
      }
    }
  }

  // Ambil berita terbaru (urutan terbalik)
  newsList.reverse();

  return {
    success: true,
    news: newsList,
    latestNews: newsList.length > 0 ? newsList[0] : null
  };
}

/**
 * Tambah Berita Baru ke Tab 'News'
 */
function processAddNews(newsSheet, params) {
  var title = (params.title || "").trim();
  var content = (params.content || "").trim();

  if (!title) return { success: false, message: "Judul berita wajib diisi!" };
  if (!content) return { success: false, message: "Isi / deskripsi berita wajib diisi!" };

  var newsId = "NEWS-" + Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyyMMdd-HHmmss");
  var nowStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");

  newsSheet.appendRow([
    newsId,
    title,
    content,
    nowStr,
    "aktif"
  ]);

  return {
    success: true,
    message: "Berita '" + title + "' berhasil dipublikasikan!",
    news: {
      id: newsId,
      title: title,
      content: content,
      createdAt: nowStr,
      status: "aktif"
    }
  };
}

/**
 * Hapus Berita dari Tab 'News'
 */
function processDeleteNews(newsSheet, params) {
  var newsId = (params.newsId || "").trim();
  if (!newsId) return { success: false, message: "ID berita tidak valid!" };

  var data = newsSheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === newsId) {
      newsSheet.deleteRow(i + 1);
      return { success: true, message: "Berita berhasil dihapus!" };
    }
  }

  return { success: false, message: "Berita tidak ditemukan!" };
}

/**
 * Pemilih Icon Otomatis
 */
function getSmartIconForTitle(title) {
  var t = title.toLowerCase();
  if (t.includes("drama") || t.includes("teater") || t.includes("acting")) return "fa-solid fa-masks-theater";
  if (t.includes("film") || t.includes("movie") || t.includes("cinema") || t.includes("bioskop")) return "fa-solid fa-film";
  if (t.includes("video") || t.includes("clip") || t.includes("wan2gp") || t.includes("clipping")) return "fa-solid fa-clapperboard";
  if (t.includes("story") || t.includes("canvas") || t.includes("naskah") || t.includes("script")) return "fa-solid fa-book-open-reader";
  if (t.includes("voice") || t.includes("audio") || t.includes("dubbing") || t.includes("suara")) return "fa-solid fa-microphone-lines";
  if (t.includes("music") || t.includes("suno") || t.includes("lagu")) return "fa-solid fa-music";
  if (t.includes("ugc") || t.includes("tiktok") || t.includes("reels") || t.includes("shorts")) return "fa-solid fa-mobile-screen-button";
  if (t.includes("character") || t.includes("avatar") || t.includes("tokoh")) return "fa-solid fa-user-astronaut";
  if (t.includes("github") || t.includes("git")) return "fa-brands fa-github";
  if (t.includes("youtube")) return "fa-brands fa-youtube";
  if (t.includes("drive") || t.includes("google")) return "fa-brands fa-google-drive";

  var coolIcons = [
    "fa-solid fa-clapperboard",
    "fa-solid fa-film",
    "fa-solid fa-wand-magic-sparkles",
    "fa-solid fa-video",
    "fa-solid fa-masks-theater",
    "fa-solid fa-bolt"
  ];
  return coolIcons[Math.floor(Math.random() * coolIcons.length)];
}

/**
 * Reset HWID
 */
function processResetHWID(userSheet, params) {
  var targetUser = (params.targetUser || "").trim();
  if (!targetUser) return { success: false, message: "Target user wajib diisi!" };

  var data = userSheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === targetUser.toLowerCase()) {
      userSheet.getRange(i + 1, 3).setValue("");
      return { success: true, message: "HWID untuk user '" + targetUser + "' berhasil di-reset!" };
    }
  }
  return { success: false, message: "Target user tidak ditemukan." };
}

/**
 * Inisialisasi Tab Awal Manual
 */
function initialSetup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. SETUP TAB USERS
  var userSheet = ss.getSheetByName(SHEET_USERS);
  if (!userSheet) userSheet = ss.insertSheet(SHEET_USERS);
  userSheet.clear();
  userSheet.getRange(1, 1, 1, 4).setValues([["Username", "Role", "HardwareID", "Status"]]);
  userSheet.getRange(1, 1, 1, 4).setBackground("#0f172a").setFontColor("#38bdf8").setFontWeight("bold").setHorizontalAlignment("center");
  userSheet.getRange(2, 1, 2, 4).setValues([
    ["admin", "admin", "", "aktif"],
    ["user1", "user", "", "aktif"]
  ]);
  userSheet.autoResizeColumns(1, 4);

  // 2. SETUP TAB CARDS
  var cardSheet = ss.getSheetByName(SHEET_CARDS);
  if (!cardSheet) cardSheet = ss.insertSheet(SHEET_CARDS);
  cardSheet.clear();
  cardSheet.getRange(1, 1, 1, 5).setValues([["ID", "Title", "Url", "Icon", "CreatedAt"]]);
  cardSheet.getRange(1, 1, 1, 5).setBackground("#1e1b4b").setFontColor("#c084fc").setFontWeight("bold").setHorizontalAlignment("center");
  
  var sampleCards = [
    ["CRD-01", "AI Drama & Short Film Generator", "https://storycanvas.ai", "fa-solid fa-clapperboard", "2026-09-15 00:00:00"],
    ["CRD-02", "Cinematic Movie & Video Studio", "https://runwayml.com", "fa-solid fa-film", "2026-09-15 00:00:00"],
    ["CRD-03", "StoryCanvas & Character Studio", "https://midjourney.com", "fa-solid fa-wand-magic-sparkles", "2026-09-15 00:00:00"],
    ["CRD-04", "SenseVoice Subtitle & Auto Dubbing", "https://elevenlabs.io", "fa-solid fa-microphone-lines", "2026-09-15 00:00:00"],
    ["CRD-05", "Wan2GP Video Generator AI", "https://huggingface.co", "fa-solid fa-video", "2026-09-15 00:00:00"],
    ["CRD-06", "UGC Maker & Social Clip Automation", "https://capcut.com", "fa-solid fa-photo-film", "2026-09-15 00:00:00"]
  ];
  cardSheet.getRange(2, 1, sampleCards.length, 5).setValues(sampleCards);
  cardSheet.autoResizeColumns(1, 5);

  // 3. SETUP TAB NEWS
  var newsSheet = ss.getSheetByName(SHEET_NEWS);
  if (!newsSheet) newsSheet = ss.insertSheet(SHEET_NEWS);
  newsSheet.clear();
  newsSheet.getRange(1, 1, 1, 5).setValues([["ID", "Title", "Content", "CreatedAt", "Status"]]);
  newsSheet.getRange(1, 1, 1, 5).setBackground("#064e3b").setFontColor("#34d399").setFontWeight("bold").setHorizontalAlignment("center");
  
  var nowStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
  var sampleNews = [
    ["NEWS-01", "Selamat Datang di CineCraft AI Studio!", "Studio kreasi AI resmi dibuka. Nikmati akses tools Drama Generator, Film AI, Dubbing Suara, dan Video Automation dengan performa terbaik.", nowStr, "aktif"]
  ];
  newsSheet.getRange(2, 1, sampleNews.length, 5).setValues(sampleNews);
  newsSheet.autoResizeColumns(1, 5);
}
