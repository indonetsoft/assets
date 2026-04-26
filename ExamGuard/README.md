# ExamGuard

Media play limiter + anti-cheat guard untuk sistem ujian berbasis web (CBT / eLearning).

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Fitur

| Fitur | Keterangan |
|---|---|
| Batas pemutaran audio | Counter tersimpan meski browser refresh |
| Batas pemutaran video | Berbasis hash URL otomatis |
| Batas pemutaran YouTube | Via YouTube IFrame API |
| Restore posisi seek | `saveLastSeek` — resume dari posisi terakhir setelah refresh |
| Kontrol bar audio/video | `mediaControls` + `mediaPlayButton` — sembunyikan atau sisakan tombol play/pause |
| Anti multiple tab | BroadcastChannel + localStorage fallback |
| Fullscreen enforcement | Keluar fullscreen = pelanggaran |
| Disable copy / cut | Blokir Ctrl+C/V/U/S/A, F12, right-click |
| Deteksi tab switch | Via Visibility API |
| Session token based | Counter unik per peserta per sesi |
| Media control API | `lastPause`, `lastStop`, `lastCounter`, `playFirstMedia` |
| Callback kustom | `onViolation` dan `onMediaBlocked` |

---

## Struktur Repository

```
exam-guard/
├── src/
│   ├── exam-guard-core.js        ← Source utama
│   └── exam-guard-f7-plugin.js   ← Plugin Framework7
├── dist/                         ← Hasil build (generate via npm run build)
│   ├── exam-guard.js             ← UMD (Browser + CommonJS)
│   ├── exam-guard.esm.js         ← ES Module (Vite / Webpack)
│   └── exam-guard.min.js         ← UMD Minified (CDN / produksi)
├── example/
│   └── index.html                ← Demo lengkap
├── rollup.config.js
├── package.json
└── README.md
```

---

## Build untuk Production

### 1. Install dependencies

```bash
npm install
```

### 2. Build semua format

```bash
npm run build
```

Hasilnya ada di folder `dist/`:
- `exam-guard.js` — UMD, untuk `<script>` tag dan `require()`
- `exam-guard.esm.js` — ES Module, untuk `import` via Vite/Webpack
- `exam-guard.min.js` — UMD minified, untuk CDN / production browser

### 3. Mode development (watch)

```bash
npm run dev
```

---

## Instalasi

### Browser (via `<script>` tag)

```html
<!-- Versi lengkap (development) -->
<script src="dist/exam-guard.js"></script>

<!-- Versi minified (production) -->
<script src="dist/exam-guard.min.js"></script>
```

### NPM

```bash
npm install exam-guard
```

---

## Penggunaan

### 1. Browser — `<script>` tag

```html
<script src="dist/exam-guard.min.js"></script>

<div class="exam-media">
  <audio src="listening1.mp3" controls></audio>
  <video src="video1.mp4" controls></video>
  <iframe src="https://www.youtube.com/embed/VIDEO_ID?enablejsapi=1"></iframe>
</div>

<script>
  new ExamGuard({
    selector    : ".exam-media",
    sessionToken: "TOKEN_DARI_SERVER",
    maxPlay     : 2,
  });
</script>
```

### 2. NPM / ES Module (Vite, Webpack)

```js
import ExamGuard from "exam-guard";

new ExamGuard({
  selector           : ".exam-media",
  sessionToken       : "TOKEN_DARI_SERVER",
  maxPlay            : 2,
  fullscreenMode     : true,
  disableCopy        : true,
  disableTabSwitch   : true,
  preventMultipleTab : true,
  forcePlayUntilEnd  : false,
  lockOnViolation    : false,
  countOnPause       : false,
  saveLastSeek       : false,
  mediaControls      : true,
  mediaPlayButton    : true,
  ytClean            : true,
  ytOverlay          : false,
  devMode            : false,

  onViolation(type, message) {
    // Kirim log ke server, tampilkan notifikasi custom, dsb.
    console.warn("Pelanggaran:", type, message);
  },

  onMediaBlocked(mediaKey) {
    console.warn("Media diblokir:", mediaKey);
  },
});
```

### 3. Framework7 Plugin

```js
import ExamGuardF7Plugin from "exam-guard/src/exam-guard-f7-plugin.js";

const app = new Framework7({
  plugins: [ExamGuardF7Plugin],

  examGuard: {
    sessionToken       : "TOKEN_DARI_SERVER",
    maxPlay            : 2,
    fullscreenMode     : true,
    disableCopy        : true,
    disableTabSwitch   : true,
    preventMultipleTab : true,
    forcePlayUntilEnd  : false,
    lockOnViolation    : false,
    countOnPause       : false,
    saveLastSeek       : false,
    mediaControls      : true,
    mediaPlayButton    : true,
    ytClean            : true,
    ytOverlay          : false,
    devMode            : false,  // DEV ONLY — aktifkan shortcut Ctrl+Shift+A+E

    onViolation(type, message) {
      console.warn("Pelanggaran:", type, message);
    },

    onMediaBlocked(mediaKey) {
      console.warn("Media diblokir:", mediaKey);
    },
  }
});
```

Plugin otomatis aktif di halaman yang mengandung `.exam-media` dan bersih saat navigasi.

---

## Konfigurasi Lengkap

| Parameter | Default | Keterangan |
|---|---|---|
| `selector` | `.exam-media` | CSS selector container media |
| `sessionToken` | `required` | Token unik per peserta dari server. **Wajib.** |
| `maxPlay` | `2` | Batas jumlah pemutaran per media |
| `fullscreenMode` | `true` | Paksa fullscreen selama ujian |
| `disableCopy` | `true` | Blokir copy, cut, klik kanan, Ctrl+C/V/U/S/A, dan F12 |
| `disableTabSwitch` | `true` | Deteksi perpindahan tab |
| `preventMultipleTab` | `true` | Blokir tab ganda via BroadcastChannel (fallback localStorage) |
| `forcePlayUntilEnd` | `false` | Media tidak boleh di-pause setelah diputar |
| `lockOnViolation` | `false` | Kunci ujian jika ada pelanggaran |
| `countOnPause` | `false` | Tambah counter saat media di-pause. `false` = counter hanya bertambah saat play dari awal atau setelah ended. `true` = setiap pause dianggap akhir sesi, resume berikutnya dihitung sebagai play baru. |
| `saveLastSeek` | `false` | Simpan posisi terakhir media ke localStorage dan restore otomatis saat refresh. Berlaku untuk audio, video, dan YouTube. Posisi dihapus saat media selesai (`ended`) atau `clearSession()` dipanggil. |
| `mediaControls` | `true` | Tampilkan kontrol bar native audio/video. `true` = tampil penuh (default). `false` = sembunyikan seluruh kontrol bar. |
| `mediaPlayButton` | `true` | Hanya berlaku jika `mediaControls: false`. `true` = sisakan tombol ▶⏸ play/pause kustom. `false` = tidak ada kontrol sama sekali (headless). |
| `ytClean` | `true` | Bersihkan UI YouTube embed — sembunyikan kontrol, logo, rekomendasi, anotasi |
| `ytOverlay` | `false` | **`false`** — 2 overlay tipis (atas 25% + bawah 25%). Area tengah 50% tetap bisa diklik untuk play/pause native YouTube. Memblokir logo, title, share, dan rekomendasi. **`true`** — 1 overlay penuh, semua klik via IFrame API (play/pause toggle). Jika `forcePlayUntilEnd: true`, klik diabaikan sepenuhnya. |
| `devMode` | `false` | Mode developer. Aktifkan shortcut **Ctrl+Shift+A+E** untuk reset semua counter media sesi. **Jangan aktifkan di production.** |
| `onViolation` | `null` | Callback `(type, message)` — jika null tampil alert |
| `onMediaBlocked` | `null` | Callback `(mediaKey)` — jika null tampil alert |

---

## API

### `new ExamGuard(options)`

Membuat instance baru dan langsung menginisialisasi semua guard.

### `instance.lastPause()`

Pause media yang terakhir aktif. Posisi dipertahankan sehingga bisa di-resume jika user kembali ke soal tersebut.

```js
btnNext.addEventListener("click", () => {
  guard.lastPause();   // pause media soal ini
  goToNextQuestion();  // lanjut ke soal berikutnya
});
```

### `instance.lastStop()`

Stop media yang terakhir aktif dan reset posisi ke awal (`currentTime = 0`). Counter tidak berubah.

```js
btnNext.addEventListener("click", () => {
  guard.lastStop();
  goToNextQuestion();
});
```

### `instance.lastCounter()`

Stop + reset media terakhir, lalu tambah counter +1. Gunakan jika kebijakan ujian menetapkan bahwa meninggalkan media sebelum selesai tetap dihitung sebagai 1x pemutaran.

```js
btnNext.addEventListener("click", () => {
  guard.lastCounter();
  goToNextQuestion();
});
```

> **Catatan:** Ketiga method di atas secara otomatis menemukan media yang paling terakhir aktif. Jika ada media yang sedang diputar saat Next ditekan, media itulah yang menjadi target. Jika tidak ada yang sedang playing, target adalah media dengan timestamp play terakhir.

### `instance.playFirstMedia()`

Play media pertama (urutan DOM dari atas) yang saat ini **visible di viewport** dan belum mencapai `maxPlay`.

```js
// Saat halaman soal baru ditampilkan
guard.playFirstMedia();

// Kombinasi dengan lastPause untuk navigasi soal otomatis
btnNext.addEventListener("click", () => {
  guard.lastPause();       // pause media soal sekarang
  goToNextQuestion();      // pindah ke soal berikutnya
  guard.playFirstMedia();  // auto-play media soal berikutnya
});
```

**Behavior:**
- Jika ada beberapa media visible, yang paling atas di DOM (urutan `compareDocumentPosition`) yang diplay
- Jika media visible sudah `maxPlay`, dilewati — cari media visible berikutnya
- Jika semua media visible sudah `maxPlay`, `onMediaBlocked` dipanggil dengan key media visible pertama
- Jika tidak ada media visible sama sekali, warning di console

### `instance.clearSession()`

Menghapus semua data sesi ini dari localStorage — termasuk counter pemutaran **dan** seek position (jika `saveLastSeek: true`). Panggil setelah ujian selesai.

```js
const guard = new ExamGuard({ sessionToken: "TOKEN", ... });

// Setelah ujian selesai
guard.clearSession();
```

---

## Kombinasi `mediaControls` + `mediaPlayButton`

| `mediaControls` | `mediaPlayButton` | Hasil |
|---|---|---|
| `true` | *(apapun)* | Kontrol bar native browser tampil penuh *(default)* |
| `false` | `true` | Kontrol bar disembunyikan, tombol ▶⏸ kustom tetap muncul |
| `false` | `false` | Tidak ada kontrol sama sekali — headless total |

```js
// Contoh: sembunyikan kontrol bar, tapi sisakan tombol play/pause
new ExamGuard({
  sessionToken    : "TOKEN",
  mediaControls   : false,
  mediaPlayButton : true,
});
```

Tombol play/pause kustom otomatis sinkron dengan semua perubahan state dari luar
(`lastPause()`, `autoplay`, `ended`, dsb.) dan bisa di-style via class `exam-guard-play-btn`.

---

## Tips Production

**1. Selalu generate sessionToken dari server**, unik per peserta per sesi ujian:

```js
// Contoh di backend (Node.js)
const token = crypto.randomBytes(32).toString("hex");
// Simpan ke DB, kirim ke frontend saat halaman ujian dimuat
```

**2. Gunakan `onViolation` untuk log ke server:**

```js
onViolation(type, message) {
  fetch("/api/exam/violation", {
    method : "POST",
    headers: { "Content-Type": "application/json" },
    body   : JSON.stringify({ type, message, token: sessionToken }),
  });
}
```

**3. Gunakan `exam-guard.min.js` di production** untuk ukuran file yang lebih kecil.

---

## License

MIT License — bebas digunakan untuk keperluan komersial maupun non-komersial.
