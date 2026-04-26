/*!
 * ExamGuard v1.0.0
 * Media play limiter + anti-cheat guard for web-based exams
 * Author  : Aldo Expert
 * License : MIT
 */
/**
 * ExamGuard Core
 * Media play limiter + anti-cheat guard for web-based exams
 *
 * Source ini adalah pure ES Module.
 * Rollup akan menghasilkan:
 *   - dist/exam-guard.js       → UMD (Browser <script> + require)
 *   - dist/exam-guard.esm.js   → ES Module (import via Vite/Webpack)
 *   - dist/exam-guard.min.js   → UMD minified (production)
 *
 * Author  : Aldo Expert
 * License : MIT
 */


class ExamGuard {

	constructor(options = {}) {

		this.config = Object.assign({

			selector           : ".exam-media",  // CSS selector container media
			sessionToken       : null,            // Token sesi dari server (wajib)

			maxPlay            : 2,               // Batas jumlah pemutaran per media

			fullscreenMode     : true,            // Paksa fullscreen saat ujian
			disableCopy        : true,            // Blokir copy / cut
			disableTabSwitch   : true,            // Deteksi perpindahan tab
			preventMultipleTab    : true,            // Blokir tab ganda

			forcePlayUntilEnd  : false,           // Media tidak boleh di-pause
			lockOnViolation    : false,           // Hentikan ujian jika ada pelanggaran

			countOnPause       : false,           // Tambah counter saat di-pause (default: hanya hitung play dari awal/setelah ended)

			saveLastSeek       : false,           // Simpan posisi terakhir media ke localStorage, restore otomatis saat halaman di-refresh

			mediaControls      : true,            // Tampilkan kontrol bar native audio/video (true = tampil, false = sembunyikan)
			mediaPlayButton    : true,            // Jika mediaControls:false, sisakan tombol play/pause saja (true = ada, false = tidak ada sama sekali)

			ytClean            : true,            // Bersihkan UI YouTube embed (hide kontrol, logo, rekomendasi)
			ytOverlay          : false,           // Pasang overlay transparan di atas YouTube (cegah klik langsung ke player)

			onViolation        : null,            // Callback(type, message) saat pelanggaran
			onMediaBlocked     : null,            // Callback(mediaKey) saat media diblokir

			devMode            : false,           // Mode developer — aktifkan shortcut Ctrl+Shift+A+E untuk reset counter

		}, options);

		if (!this.config.sessionToken) {
			console.error("[ExamGuard] sessionToken wajib diisi.");
			return;
		}

		this._destroyed    = false;
		this._boundCleanup = this._cleanup.bind(this);

		/*
		 * Registry semua media yang sudah di-init.
		 * Digunakan oleh lastPause(), lastStop(), lastCounter()
		 * untuk menemukan media yang terakhir aktif (sedang diputar).
		 *
		 * Format setiap entry:
		 * {
		 *   type    : "audio" | "video" | "youtube",
		 *   el      : HTMLElement | null,  // audio/video DOM element
		 *   player  : YT.Player | null,    // YouTube IFrame player instance
		 *   key     : string,              // localStorage counter key
		 *   isPlaying : () => boolean,     // getter state saat ini
		 *   lastActive: number,            // timestamp terakhir play (Date.now())
		 * }
		 */
		this._mediaRegistry = [];

		this.init();

	}

	/* ================================================================
	   HASH & STORAGE KEY
	   ================================================================ */

	_hash(str) {

		let h = 0;

		for (let i = 0; i < str.length; i++) {
			h = (h << 5) - h + str.charCodeAt(i);
			h |= 0;
		}

		return "m" + Math.abs(h);

	}

	_storageKey(mediaIdentifier) {

		return "exam_guard:" + this.config.sessionToken + ":" + this._hash(mediaIdentifier);

	}

	/*
	 * Ekstrak YouTube video ID dari URL embed.
	 * Digunakan sebagai identifier storage key agar stabil meski URL
	 * punya parameter berbeda setiap kali halaman di-load.
	 *
	 * Format yang didukung:
	 *   https://www.youtube.com/embed/VIDEO_ID
	 *   https://www.youtube.com/embed/VIDEO_ID?...params
	 *
	 * Jika tidak bisa diekstrak, fallback ke full URL.
	 */
	_ytVideoId(src) {

		try {
			const url      = new URL(src);
			const segments = url.pathname.split("/").filter(Boolean);
			const embedIdx = segments.indexOf("embed");

			if (embedIdx !== -1 && segments[embedIdx + 1]) {
				return "yt:" + segments[embedIdx + 1];
			}
		} catch (e) {}

		return src;

	}

	/* ================================================================
	   STORAGE HELPER
	   ================================================================ */

	_getCount(key) {

		try {
			const v = localStorage.getItem(key);
			return v ? parseInt(v, 10) : 0;
		} catch (e) {
			return 0;
		}

	}

	_setCount(key, val) {

		try {
			localStorage.setItem(key, String(val));
		} catch (e) {
			console.warn("[ExamGuard] Gagal menyimpan ke localStorage:", e);
		}

	}

	/*
	 * Key seek selalu berbeda dari key counter —
	 * suffix ":seek" agar tidak bentrok.
	 */
	_seekKey(counterKey) {
		return counterKey + ":seek";
	}

	_getSeek(counterKey) {
		try {
			const v = localStorage.getItem(this._seekKey(counterKey));
			return v !== null ? parseFloat(v) : null;
		} catch (e) {
			return null;
		}
	}

	_setSeek(counterKey, seconds) {
		try {
			localStorage.setItem(this._seekKey(counterKey), String(seconds));
		} catch (e) {}
	}

	_clearSeek(counterKey) {
		try {
			localStorage.removeItem(this._seekKey(counterKey));
		} catch (e) {}
	}

	/* ================================================================
	   INIT
	   ================================================================ */

	_injectStyles() {

		const STYLE_ID = "exam-guard-styles";
		if (document.getElementById(STYLE_ID)) return; // idempotent

		const css = `
/* ── ExamGuard — auto-injected styles ── */

.exam-guard-media-controls-container {
  display        : flex;
  align-items    : center;
  gap            : 8px;
  font-size      : 0.825rem;
  color          : #888;
  margin-top     : 6px;
}

.exam-guard-media-controls-container .exam-guard-counter-val {
  font-weight : 600;
  white-space : nowrap;
  flex-shrink : 0;
}

/* Progress bar — pakai <progress> native, value/max dalam satuan detik atau counter */
.exam-guard-media-controls-container progress.counter-bar {
  flex              : 1;
  height            : 5px;
  min-width         : 40px;
  border            : none;
  border-radius     : 4px;
  overflow          : hidden;
  cursor            : default;
  pointer-events    : none;
  appearance        : none;
  -webkit-appearance: none;
  background        : #e0e0e0;
}

/* Chromium */
.exam-guard-media-controls-container progress.counter-bar::-webkit-progress-bar   { background: #e0e0e0; border-radius: 4px; }
.exam-guard-media-controls-container progress.counter-bar::-webkit-progress-value { background: #6366f1; border-radius: 4px; }

/* Firefox */
.exam-guard-media-controls-container progress.counter-bar::-moz-progress-bar { background: #6366f1; border-radius: 4px; }

/* Seek mode — warna redup, tanpa animasi */
.exam-guard-media-controls-container progress.counter-bar.counter-fill--seek::-webkit-progress-value { background: #999; }
.exam-guard-media-controls-container progress.counter-bar.counter-fill--seek::-moz-progress-bar      { background: #999; }

/* Tombol play/pause kustom */
.exam-guard-media-controls-container .exam-guard-play-btn {
  display        : inline-flex;
  align-items    : center;
  justify-content: center;
  flex-shrink    : 0;
  width          : 20px;
  height         : 20px;
  border-radius  : 50%;
  border         : 1.5px solid currentColor;
  background     : transparent;
  cursor         : pointer;
  padding        : 0;
  opacity        : 0.7;
  transition     : opacity 0.15s;
  color          : inherit;
}

.exam-guard-media-controls-container .exam-guard-play-btn:hover {
  opacity: 1;
}

/* Time display */
.exam-guard-media-controls-container .exam-guard-time {
  font-size   : 0.78rem;
  font-family : monospace;
  white-space : nowrap;
  flex-shrink : 0;
}

/* YouTube wrapper — 16:9 responsive */
.youtube-wrap {
  position      : relative;
  padding-top   : 56.25%;
  border-radius : 8px;
  overflow      : hidden;
  margin-bottom : 12px;
  background    : #000;
}

.youtube-wrap iframe {
  position : absolute;
  top      : 0;
  left     : 0;
  width    : 100%;
  height   : 100%;
  border   : none;
}
`;

		const el = document.createElement("style");
		el.id          = STYLE_ID;
		el.textContent = css;
		document.head.appendChild(el);

	}

		init() {

		this._injectStyles();

		const container = document.querySelector(this.config.selector);

		if (!container) {
			console.warn("[ExamGuard] Container tidak ditemukan:", this.config.selector);
			return;
		}

		this.container = container;

		this._initAudio(container);
		this._initVideo(container);
		this._initYoutube(container);
		this._initSecurity();

		window.addEventListener("beforeunload", this._boundCleanup);

	}

	/* ================================================================
	   AUDIO
	   ================================================================ */

	_initAudio(container) {

		container.querySelectorAll("audio").forEach(audio => {

			let playing  = false;
			let mediaKey = null;
			let entry    = null;   // referensi ke registry entry

			const bindEvents = () => {

				mediaKey = audio.currentSrc || audio.getAttribute("src") || "";

				if (!mediaKey) {
					console.warn("[ExamGuard] Audio tidak memiliki src yang valid.");
					return;
				}

				const key = this._storageKey(mediaKey);

				// Daftarkan ke registry
				entry = {
					type      : "audio",
					el        : audio,
					player    : null,
					key,
					isPlaying : () => playing,
					lastActive: 0,
				};

				this._mediaRegistry.push(entry);

				// Terapkan konfigurasi kontrol bar
				this._applyMediaControls(audio, entry);

				/*
				 * Restore posisi seek terakhir jika saveLastSeek aktif.
				 * Dilakukan setelah loadedmetadata agar currentTime bisa di-set.
				 */
				if (this.config.saveLastSeek) {
					const restoreSeek = () => {
						const saved = this._getSeek(key);
						if (saved !== null && saved > 0 && saved < audio.duration) {
							audio.currentTime = saved;
						}
					};
					if (audio.readyState >= 1) {
						restoreSeek();
					} else {
						audio.addEventListener("loadedmetadata", restoreSeek, { once: true });
					}
				}

				audio.addEventListener("play", () => {

					const count = this._getCount(key);

					if (count >= this.config.maxPlay) {
						audio.pause();
						this._notifyBlocked(mediaKey);
						return;
					}

					if (this.config.forcePlayUntilEnd && playing) {
						audio.pause();
						return;
					}

					/*
					 * countOnPause:true  — +1 saat fresh play dimulai.
					 * countOnPause:false — +1 saat ended / currentTime >= 98% duration.
					 */
					if (this.config.countOnPause && !playing) {
						this._setCount(key, count + 1);
					}

					playing          = true;
					entry.lastActive = Date.now();

				});

				/*
				 * Helper: kembalikan true jika audio dianggap selesai.
				 * Threshold 98% sebagai fallback — beberapa browser tidak
				 * selalu fire event ended dengan tepat.
				 */
				const _audioFinished = () =>
					playing &&
					isFinite(audio.duration) &&
					audio.duration > 0 &&
					// audio.currentTime >= audio.duration * 0.98;
					audio.duration - audio.currentTime <= 3;

				const _audioCountIfFinished = () => {
					if (!this.config.countOnPause && _audioFinished()) {
						const count = this._getCount(key);
						this._setCount(key, count + 1);
						playing = false; // guard: cegah penghitungan dobel
					}
				};

				audio.addEventListener("ended", () => {

					// ended: hitung jika belum dihitung via threshold
					if (!this.config.countOnPause && playing) {
						const count = this._getCount(key);
						this._setCount(key, count + 1);
					}

					playing = false;
					if (this.config.saveLastSeek) this._clearSeek(key);

				});

				audio.addEventListener("timeupdate", () => {

					// Simpan seek position
					if (this.config.saveLastSeek && playing && audio.currentTime > 0) {
						this._setSeek(key, audio.currentTime);
					}

					// Cek threshold 98% — hitung counter lebih awal dari ended
					_audioCountIfFinished();

				});

				audio.addEventListener("pause", () => {

					if (this.config.forcePlayUntilEnd && playing) {
						setTimeout(() => { if (playing) audio.play().catch(() => {}); }, 100);
						return;
					}

					// Jika di-pause di >=98% — tetap dihitung selesai
					_audioCountIfFinished();

					if (this.config.countOnPause && playing) {
						playing = false;
					}

				});

			};

			if (audio.readyState >= 1) {
				bindEvents();
			} else {
				audio.addEventListener("loadedmetadata", bindEvents, { once: true });
				setTimeout(() => { if (!mediaKey) bindEvents(); }, 500);
			}

		});

	}

	/* ================================================================
	   VIDEO
	   ================================================================ */

	_initVideo(container) {

		container.querySelectorAll("video").forEach(video => {

			let playing  = false;
			let mediaKey = null;
			let entry    = null;

			const bindEvents = () => {

				mediaKey = video.currentSrc || video.getAttribute("src") || "";

				if (!mediaKey) {
					console.warn("[ExamGuard] Video tidak memiliki src yang valid.");
					return;
				}

				const key = this._storageKey(mediaKey);

				entry = {
					type      : "video",
					el        : video,
					player    : null,
					key,
					isPlaying : () => playing,
					lastActive: 0,
				};

				this._mediaRegistry.push(entry);

				// Terapkan konfigurasi kontrol bar
				this._applyMediaControls(video, entry);

				// Restore seek position
				if (this.config.saveLastSeek) {
					const restoreSeek = () => {
						const saved = this._getSeek(key);
						if (saved !== null && saved > 0 && saved < video.duration) {
							video.currentTime = saved;
						}
					};
					if (video.readyState >= 1) {
						restoreSeek();
					} else {
						video.addEventListener("loadedmetadata", restoreSeek, { once: true });
					}
				}

				video.addEventListener("play", () => {

					const count = this._getCount(key);

					if (count >= this.config.maxPlay) {
						video.pause();
						this._notifyBlocked(mediaKey);
						return;
					}

					if (this.config.forcePlayUntilEnd && playing) {
						video.pause();
						return;
					}

					if (this.config.countOnPause && !playing) {
						this._setCount(key, count + 1);
					}

					playing          = true;
					entry.lastActive = Date.now();

				});

				const _videoFinished = () =>
					playing &&
					isFinite(video.duration) &&
					video.duration > 0 &&
					// video.currentTime >= video.duration * 0.98;
					video.duration - video.currentTime <= 3;

				const _videoCountIfFinished = () => {
					if (!this.config.countOnPause && _videoFinished()) {
						const count = this._getCount(key);
						this._setCount(key, count + 1);
						playing = false;
					}
				};

				video.addEventListener("ended", () => {

					if (!this.config.countOnPause && playing) {
						const count = this._getCount(key);
						this._setCount(key, count + 1);
					}

					playing = false;
					if (this.config.saveLastSeek) this._clearSeek(key);

				});

				video.addEventListener("timeupdate", () => {

					if (this.config.saveLastSeek && playing && video.currentTime > 0) {
						this._setSeek(key, video.currentTime);
					}

					_videoCountIfFinished();

				});

				video.addEventListener("pause", () => {

					if (this.config.forcePlayUntilEnd && playing) {
						setTimeout(() => { if (playing) video.play().catch(() => {}); }, 100);
						return;
					}

					_videoCountIfFinished();

					if (this.config.countOnPause && playing) {
						playing = false;
					}

				});

			};

			if (video.readyState >= 1) {
				bindEvents();
			} else {
				video.addEventListener("loadedmetadata", bindEvents, { once: true });
				setTimeout(() => { if (!mediaKey) bindEvents(); }, 500);
			}

		});

	}

	/* ================================================================
	   AUDIO / VIDEO CONTROLS
	   ================================================================ */

	/**
	 * Terapkan konfigurasi kontrol bar pada elemen audio/video.
	 *
	 * mediaControls: true  → tampilkan kontrol bar native (default)
	 * mediaControls: false → sembunyikan seluruh kontrol bar
	 *   mediaPlayButton: true  → sisakan tombol play/pause via overlay kustom
	 *   mediaPlayButton: false → tidak ada kontrol sama sekali (headless)
	 *
	 * Teknik:
	 *   - Hapus atribut `controls` agar browser tidak render control bar native
	 *   - Jika mediaPlayButton:true, inject tombol play/pause minimal di atas elemen
	 *
	 * @param {HTMLMediaElement} el  — elemen audio atau video
	 * @param {object}           entry — registry entry (untuk akses isPlaying)
	 */
	_applyMediaControls(el, entry) {

		if (this.config.mediaControls) return; // default — biarkan controls native

		// Sembunyikan kontrol bar native
		el.removeAttribute("controls");

		/*
		 * Satu container tunggal .exam-guard-media-controls-container.
		 * Dibuat otomatis tepat setelah el — tidak bergantung markup HTML.
		 * Idempotent: cek nextElementSibling sebelum inject.
		 *
		 * Layout:
		 *   mediaPlayButton:true  → [ ▶/⏸ ]  0:12 / 3:45  [████░░]  (1/2)
		 *   mediaPlayButton:false →                         [████░░]  (1/2)
		 *
		 * syncCounter dipasang di timeupdate agar update segera setelah
		 * _setCount dipanggil dari _audioCountIfFinished / _videoCountIfFinished.
		 */

		const CLS = "exam-guard-media-controls-container";
		if (el.nextElementSibling && el.nextElementSibling.classList.contains(CLS)) return;

		const container = document.createElement("div");
		container.className = CLS;
		el.insertAdjacentElement("afterend", container);

		// ── Helper format detik → m:ss ────────────────────────────────
		const fmt = (sec) => {
			if (!isFinite(sec) || isNaN(sec)) return "0:00";
			const m = Math.floor(sec / 60);
			const s = Math.floor(sec % 60);
			return m + ":" + String(s).padStart(2, "0");
		};

		// ── Tombol + time (hanya jika mediaPlayButton:true) ───────────
		if (this.config.mediaPlayButton) {

			const iconPlay  = `<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" style="display:block"><polygon points="5,3 19,12 5,21"/></svg>`;
			const iconPause = `<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" style="display:block"><rect x="5" y="3" width="4" height="18"/><rect x="15" y="3" width="4" height="18"/></svg>`;

			const btn = document.createElement("button");
			btn.type      = "button"; // cegah submit form
			btn.className = "exam-guard-play-btn";
			btn.setAttribute("aria-label", "Play / Pause");

			const timeEl = document.createElement("span");
			timeEl.className = "exam-guard-time";

			const syncIcon = () => { btn.innerHTML = el.paused ? iconPlay : iconPause; };
			const syncTime = () => { timeEl.textContent = fmt(el.currentTime) + " / " + fmt(el.duration); };

			syncIcon();
			syncTime();

			btn.addEventListener("click",      () => { el.paused ? el.play().catch(() => {}) : el.pause(); });
			btn.addEventListener("mouseenter", () => { btn.style.opacity = "1"; });
			btn.addEventListener("mouseleave", () => { btn.style.opacity = "0.7"; });

			el.addEventListener("play",           () => { syncIcon(); syncTime(); });
			el.addEventListener("pause",          () => { syncIcon(); syncTime(); });
			el.addEventListener("ended",          () => { syncIcon(); syncTime(); });
			el.addEventListener("timeupdate",     syncTime);
			el.addEventListener("durationchange", syncTime);
			el.addEventListener("loadedmetadata", syncTime);

			container.appendChild(btn);
			container.appendChild(timeEl);

		}

		// ── Progress bar (seek, value/max = detik) ────────────────────
		const progress = document.createElement("progress");
		progress.className = "counter-bar";
		progress.value     = 0;
		progress.max       = 1;

		const syncSeek = () => {
			if (!isFinite(el.duration) || el.duration <= 0) return;
			progress.max   = Math.floor(el.duration);
			progress.value = Math.floor(el.currentTime);
		};

		// ── Counter val ───────────────────────────────────────────────
		const counterVal = document.createElement("span");
		counterVal.className = "exam-guard-counter-val";

		const syncCounter = () => {
			const c = entry.key ? this._getCount(entry.key) : 0;
			counterVal.textContent = "(" + c + "/" + this.config.maxPlay + ")";
		};
		syncCounter();

		// timeupdate: syncSeek + syncCounter setiap tick
		// — kunci agar counter-val terupdate segera setelah _setCount dipanggil
		el.addEventListener("timeupdate",     () => { syncSeek(); syncCounter(); });
		el.addEventListener("durationchange", syncSeek);
		el.addEventListener("loadedmetadata", () => { syncSeek(); syncCounter(); });
		el.addEventListener("play",           syncCounter);
		el.addEventListener("pause",          syncCounter);
		el.addEventListener("ended",          syncCounter);

		container.appendChild(progress);
		container.appendChild(counterVal);

	}

	/* ================================================================
	   YOUTUBE
	   ================================================================ */

	/**
	 * Inject parameter URL YouTube untuk membersihkan UI player.
	 * Hanya mengubah URL string — tidak menyentuh DOM sama sekali.
	 */
	_cleanYoutubeUrl(src) {

		try {

			const url = new URL(src);

			// Wajib untuk IFrame API — satu-satunya parameter yang selalu diinjeksi
			url.searchParams.set("enablejsapi", "1");

			if (this.config.ytClean) {
				url.searchParams.set("controls",       "0");
				url.searchParams.set("rel",            "0");
				url.searchParams.set("modestbranding", "1");
				url.searchParams.set("iv_load_policy", "3");
				url.searchParams.set("disablekb",      "1");
				url.searchParams.set("fs",             "0");
				url.searchParams.set("playsinline",    "1");
			}

			return url.toString();

		} catch (e) {
			return src;
		}

	}

	/**
	 * Buat overlay transparan di atas iframe YouTube.
	 *
	 * Dua strategi berbeda berdasarkan config ytOverlay:
	 *
	 * ── ytOverlay: false → _createYoutubeDualOverlay ──────────────────
	 *   Dipanggil SEBELUM YT.Player init, langsung setelah iframe ditemukan.
	 *   Overlay tidak bergantung pada iframe sama sekali — hanya butuh wrapper.
	 *   Tidak ada observer, tidak ada interaksi klik.
	 *   Stabil karena wrapper tidak pernah di-replace YouTube.
	 *
	 * ── ytOverlay: true → _createYoutubeFullOverlay ───────────────────
	 *   Dipanggil di onReady setelah player siap.
	 *   Butuh referensi player untuk toggle play/pause via IFrame API.
	 *   Menggunakan observer untuk jaga posisi overlay saat iframe di-replace.
	 */

	_createYoutubeDualOverlay(frame) {

		const wrap = frame.parentElement;

		if (!wrap) return;

		// Sudah ada — skip (idempotent)
		if (wrap.querySelector(".exam-guard-yt-overlay-top")) return;

		// Wrapper wajib position: relative
		if (window.getComputedStyle(wrap).position === "static") {
			wrap.style.position = "relative";
		}

		/*
		 * Dual overlay — atas 25% + bawah 25%.
		 * Area tengah 50% terbuka untuk tombol play native YouTube.
		 * Tidak ada event listener — murni pemblokir visual/klik area tepi.
		 *
		 * Menggunakan cssText satu string agar tidak ada property yang tertimpa
		 * framework CSS dan hasilnya konsisten di semua browser.
		 */
		const top = document.createElement("div");
		top.className = "exam-guard-yt-overlay exam-guard-yt-overlay-top";
		top.style.cssText = "position:absolute;top:0;left:0;width:100%;height:25%;z-index:9999;background:transparent;pointer-events:all;cursor:default;";

		const bottom = document.createElement("div");
		bottom.className = "exam-guard-yt-overlay exam-guard-yt-overlay-bottom";
		bottom.style.cssText = "position:absolute;bottom:0;left:0;width:100%;height:25%;z-index:9999;background:transparent;pointer-events:all;cursor:default;";

		wrap.appendChild(top);
		wrap.appendChild(bottom);

	}

	_createYoutubeFullOverlay(liveFrame, entry) {

		const wrap = liveFrame.parentElement;

		if (!wrap) {
			console.warn("[ExamGuard] YouTube iframe tidak memiliki parent element.");
			return;
		}

		const frameId = liveFrame.id;

		// Disconnect observer lama
		if (entry._overlayObserver) {
			entry._overlayObserver.disconnect();
			entry._overlayObserver = null;
		}

		// Hapus overlay lama (full saja — dual tidak disentuh)
		wrap.querySelectorAll(".exam-guard-yt-overlay-full").forEach(el => el.remove());

		// Wrapper wajib position: relative
		if (window.getComputedStyle(wrap).position === "static") {
			wrap.style.position = "relative";
		}

		// Full overlay
		const overlay = document.createElement("div");
		overlay.className = "exam-guard-yt-overlay exam-guard-yt-overlay-full";
		overlay.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;z-index:9999;background:transparent;pointer-events:all;cursor:pointer;";

		overlay.addEventListener("click", () => {

			if (this.config.forcePlayUntilEnd) return;

			const player = entry.player;
			if (!player || typeof player.getPlayerState !== "function") return;

			try {
				const state = player.getPlayerState();
				if (state === window.YT.PlayerState.PLAYING) {
					player.pauseVideo();
				} else {
					player.playVideo();
				}
			} catch (e) {}

		});

		wrap.appendChild(overlay);

		/*
		 * Observer hanya untuk full overlay — jaga posisi saat YouTube replace iframe.
		 * Dual overlay tidak butuh observer karena tidak bergantung iframe.
		 */
		const observer = new MutationObserver((mutations) => {

			let iframeChanged = false;

			for (const mutation of mutations) {
				for (const node of mutation.addedNodes) {
					if (node.nodeType === 1 && (node.id === frameId || node.querySelector?.(`#${frameId}`))) {
						iframeChanged = true;
					}
				}
			}

			if (!iframeChanged) return;

			const freshFrame = document.getElementById(frameId);
			if (freshFrame) entry.el = freshFrame;

			// Re-append overlay full ke posisi terakhir agar di atas iframe baru
			const fullOverlay = wrap.querySelector(".exam-guard-yt-overlay-full");
			if (fullOverlay) {
				wrap.appendChild(fullOverlay);
			} else {
				// Hilang — reinit
				if (freshFrame) this._createYoutubeFullOverlay(freshFrame, entry);
			}

		});

		observer.observe(wrap, { childList: true, subtree: false });
		entry._overlayObserver = observer;

	}

	_initYoutube(container) {

		const iframes = Array.from(container.querySelectorAll("iframe[src*='youtube']"));

		if (!iframes.length) return;

		// Load YouTube IFrame API jika belum ada
		if (!window.YT) {
			const tag  = document.createElement("script");
			tag.src    = "https://www.youtube.com/iframe_api";
			tag.async  = true;
			document.head.appendChild(tag);
		}

		/*
		 * Siapkan semua iframe terlebih dahulu:
		 * - Bersihkan URL (inject enablejsapi + ytClean params)
		 * - Pastikan punya ID unik
		 * - Buat entry registry
		 *
		 * Dilakukan SEBELUM API ready supaya saat bindPlayers dipanggil,
		 * semua iframe sudah dalam kondisi siap.
		 */
		const queue = iframes.map(frame => {

			const rawSrc   = frame.getAttribute("src") || "";
			const cleanSrc = this._cleanYoutubeUrl(rawSrc);

			/*
			 * Key pakai video ID — bukan cleanSrc.
			 * cleanSrc mengandung parameter URL yang bisa berbeda tiap load
			 * sehingga hash-nya berubah dan counter dianggap media baru setelah refresh.
			 * Video ID selalu stabil selama embed URL sama.
			 */
			const key = this._storageKey(this._ytVideoId(rawSrc));

			// Set src hanya jika berbeda
			if (frame.getAttribute("src") !== cleanSrc) {
				frame.src = cleanSrc;
			}

			// Pastikan iframe punya ID unik
			if (!frame.id) {
				frame.id = "exam-guard-yt-" + Math.random().toString(36).slice(2, 8);
			}

			let playing = false;

			const entry = {
				type      : "youtube",
				el        : frame,
				player    : null,
				key,
				cleanSrc,
				isPlaying : () => playing,
				lastActive: 0,
				setPlaying: (v) => { playing = v; },
			};

			this._mediaRegistry.push(entry);

			/*
			 * Dual overlay diinject SEKARANG — sebelum YT API ready.
			 * Wrapper sudah ada di DOM, iframe belum di-replace YT.
			 * Karena tidak bergantung iframe sama sekali, ini stabil
			 * meski YouTube replace iframe berkali-kali setelahnya.
			 */
			if (!this.config.ytOverlay) {
				this._createYoutubeDualOverlay(frame);
			}

			return entry;

		});

		/*
		 * Inisialisasi player secara SEQUENTIAL — satu per satu.
		 * YouTube IFrame API tidak reliable jika multiple YT.Player
		 * diinisialisasi bersamaan dalam satu tick.
		 *
		 * Cara kerja:
		 *   initNext(0) → init iframe[0] → onReady → initNext(1) → dst.
		 */
		const initNext = (index) => {

			if (index >= queue.length) return;

			const entry = queue[index];
			const frame = entry.el;

			const ytPlayer = new window.YT.Player(frame.id, {

				events: {

					onReady: () => {

						entry.player = ytPlayer;

						const liveFrame = document.getElementById(frame.id);
						if (liveFrame) {
							entry.el = liveFrame;
							/*
							 * Full overlay dipasang di onReady karena butuh player reference.
							 * Dual overlay sudah dipasang sebelumnya di queue — tidak perlu lagi.
							 */
							if (this.config.ytOverlay) {
								this._createYoutubeFullOverlay(liveFrame, entry);
							}
						}

						if (this.config.saveLastSeek) {
							const saved = this._getSeek(entry.key);
							if (saved !== null && saved > 0) {
								try { ytPlayer.seekTo(saved, true); } catch (e) {}
							}
						}

						initNext(index + 1);

					},

					onStateChange: (event) => {

						const YTS             = window.YT.PlayerState;
						const { key, cleanSrc } = entry;

						if (event.data === YTS.PLAYING) {

							const count = this._getCount(key);

							if (count >= this.config.maxPlay) {
								event.target.pauseVideo();
								this._notifyBlocked(cleanSrc);
								return;
							}

							/*
							 * countOnPause: true  — counter dihitung saat fresh play dimulai.
							 * countOnPause: false — counter dihitung saat ended (selesai penuh).
							 */
							if (this.config.countOnPause && !entry.isPlaying()) {
								this._setCount(key, count + 1);
							}

							entry.setPlaying(true);
							entry.lastActive = Date.now();

							/*
							 * Simpan seek position YouTube secara periodik via setInterval.
							 * YouTube tidak punya event timeupdate seperti HTML5 media.
							 * Interval di-clear saat PAUSED/ENDED.
							 */
							if (this.config.saveLastSeek) {
								if (entry._seekInterval) clearInterval(entry._seekInterval);
								entry._seekInterval = setInterval(() => {
									try {
										const t = ytPlayer.getCurrentTime();
										if (t > 0) this._setSeek(key, t);
									} catch (e) {}
								}, 1000);
							}

						}

						if (event.data === YTS.PAUSED) {

							// Hentikan interval seek saat pause
							if (this.config.saveLastSeek) {
								if (entry._seekInterval) {
									clearInterval(entry._seekInterval);
									entry._seekInterval = null;
								}
								try {
									const t = ytPlayer.getCurrentTime();
									if (t > 0) this._setSeek(key, t);
								} catch (e) {}
							}

							if (this.config.forcePlayUntilEnd && entry.isPlaying()) {
								setTimeout(() => {
									try { event.target.playVideo(); } catch (e) {}
								}, 150);
								return;
							}

							/*
							 * countOnPause: true — pause dianggap akhir sesi.
							 * Reset playing agar play berikutnya dihitung sebagai sesi baru.
							 */
							if (this.config.countOnPause && entry.isPlaying()) {
								entry.setPlaying(false);
							}

						}

						if (event.data === YTS.ENDED) {

							/*
							 * countOnPause: false — counter dihitung saat video selesai penuh.
							 */
							if (!this.config.countOnPause && entry.isPlaying()) {
								const count = this._getCount(key);
								this._setCount(key, count + 1);
							}

							entry.setPlaying(false);
							if (this.config.saveLastSeek) {
								if (entry._seekInterval) {
									clearInterval(entry._seekInterval);
									entry._seekInterval = null;
								}
								this._clearSeek(key);
							}
						}

					}

				}

			});

		};

		const bindPlayers = () => initNext(0);

		// Jika API sudah siap langsung bind, jika belum tunggu callback
		if (window.YT && window.YT.Player) {

			bindPlayers();

		} else {

			const prev = window.onYouTubeIframeAPIReady;

			window.onYouTubeIframeAPIReady = () => {
				if (typeof prev === "function") prev();
				bindPlayers();
			};

		}

	}

	/* ================================================================
	   SECURITY
	   ================================================================ */

	_initSecurity() {

		if (this.config.disableCopy)       this._disableCopy();
		if (this.config.disableTabSwitch)  this._disableTabSwitch();
		if (this.config.fullscreenMode)    this._fullscreenGuard();
		if (this.config.preventMultipleTab) this._preventMultipleTab();
		if (this.config.devMode)           this._initDevMode();

	}

	_initDevMode() {

		/*
		 * Shortcut developer: Ctrl + Shift + A + E (ditekan bersamaan)
		 * Menampilkan confirm dialog untuk reset semua counter media sesi ini.
		 *
		 * Hanya aktif saat devMode: true.
		 * JANGAN aktifkan di production.
		 */

		const pressed = new Set();

		const onKeyDown = (e) => {
			pressed.add(e.key.toLowerCase());

			// Ctrl + Shift + A + E
			if (
				(e.ctrlKey || e.metaKey) &&
				e.shiftKey &&
				pressed.has("a") &&
				pressed.has("e")
			) {
				e.preventDefault();

				const confirmed = window.confirm(
					"[ExamGuard DevMode]\n\nReset semua counter media sesi ini?\n\n" +
					"Token  : " + this.config.sessionToken + "\n" +
					"Aksi ini akan mengizinkan semua media diputar ulang dari awal."
				);

				if (confirmed) {
					this.clearSession();

					// Reset flag playing di semua entry registry
					this._mediaRegistry.forEach(entry => {
						if (typeof entry.setPlaying === "function") {
							entry.setPlaying(false);
						}
					});

					console.info("[ExamGuard DevMode] Counter sesi berhasil direset.");
					window.alert("[ExamGuard DevMode] Counter berhasil direset. Semua media dapat diputar ulang.");
				}

				pressed.clear();
			}
		};

		const onKeyUp = (e) => {
			pressed.delete(e.key.toLowerCase());
		};

		document.addEventListener("keydown", onKeyDown);
		document.addEventListener("keyup",   onKeyUp);

		// Simpan referensi untuk cleanup
		this._devKeyDown = onKeyDown;
		this._devKeyUp   = onKeyUp;

	}

	_disableCopy() {

		document.addEventListener("contextmenu", e => e.preventDefault());
		document.addEventListener("copy",        e => e.preventDefault());
		document.addEventListener("cut",         e => e.preventDefault());

		document.addEventListener("keydown", e => {

			const blocked = ["c", "v", "u", "s", "a"];

			if ((e.ctrlKey || e.metaKey) && blocked.includes(e.key.toLowerCase())) {
				e.preventDefault();
			}

			if (e.key === "F12") {
				e.preventDefault();
			}

		});

	}

	_disableTabSwitch() {

		document.addEventListener("visibilitychange", () => {

			if (document.hidden) {
				this._triggerViolation("tab_switch", "Tidak boleh berpindah tab saat ujian berlangsung.");
			}

		});

	}

	_fullscreenGuard() {

		document.addEventListener("click", () => {

			if (!document.fullscreenElement) {
				document.documentElement.requestFullscreen().catch(() => {});
			}

		}, { once: true });

		document.addEventListener("fullscreenchange", () => {

			if (!document.fullscreenElement) {
				this._triggerViolation("fullscreen_exit", "Fullscreen wajib diaktifkan selama ujian.");
			}

		});

	}

	_preventMultipleTab() {

		const tabKey = "exam_guard_tab:" + this.config.sessionToken;

		if (typeof BroadcastChannel !== "undefined") {

			this._bc = new BroadcastChannel("exam_guard_" + this.config.sessionToken);

			this._bc.postMessage({ type: "tab_check" });

			this._bc.addEventListener("message", (e) => {

				if (e.data && e.data.type === "tab_check") {
					this._bc.postMessage({ type: "tab_exists" });
				}

				if (e.data && e.data.type === "tab_exists") {
					alert("Ujian sudah dibuka di tab lain. Tab ini akan dikunci.");
					this._lockExam();
				}

			});

		} else {

			if (localStorage.getItem(tabKey)) {
				alert("Ujian sudah dibuka di tab lain. Tab ini akan dikunci.");
				this._lockExam();
				return;
			}

			localStorage.setItem(tabKey, "1");
			this._tabKey = tabKey;

		}

	}

	/* ================================================================
	   VIOLATION & LOCK
	   ================================================================ */

	_triggerViolation(type, message) {

		if (typeof this.config.onViolation === "function") {
			this.config.onViolation(type, message);
		} else {
			alert(message);
		}

		if (this.config.lockOnViolation) {
			this._lockExam();
		}

	}

	_notifyBlocked(mediaKey) {

		if (typeof this.config.onMediaBlocked === "function") {
			this.config.onMediaBlocked(mediaKey);
		} else {
			alert("Batas pemutaran media telah tercapai.");
		}

	}

	_lockExam() {

		this._destroyed = true;

		document.body.innerHTML = `
			<div style="
				display:flex; flex-direction:column; align-items:center;
				justify-content:center; height:100vh; font-family:sans-serif;
				background:#1a1a2e; color:#e94560;
			">
				<h1 style="font-size:2rem; margin-bottom:1rem;">&#9940; Ujian Dihentikan</h1>
				<p style="color:#aaa; font-size:1rem;">Sesi ujian Anda telah berakhir karena pelanggaran.</p>
				<p style="color:#555; font-size:0.85rem; margin-top:1rem;">Hubungi pengawas ujian.</p>
			</div>
		`;

		this._cleanup();

	}

	/* ================================================================
	   CLEANUP
	   ================================================================ */

	_cleanup() {

		if (this._tabKey) {
			localStorage.removeItem(this._tabKey);
		}

		if (this._bc) {
			this._bc.close();
		}

		// Disconnect semua MutationObserver overlay YouTube + clear seek interval
		this._mediaRegistry.forEach(entry => {
			if (entry._overlayObserver) {
				entry._overlayObserver.disconnect();
				entry._overlayObserver = null;
			}
			if (entry._seekInterval) {
				clearInterval(entry._seekInterval);
				entry._seekInterval = null;
			}
		});

		// Remove dev keyboard listeners
		if (this._devKeyDown) {
			document.removeEventListener("keydown", this._devKeyDown);
			document.removeEventListener("keyup",   this._devKeyUp);
			this._devKeyDown = null;
			this._devKeyUp   = null;
		}

	}

	/**
	 * Hapus semua counter dan seek position media sesi ini dari localStorage.
	 * Panggil setelah ujian selesai.
	 */
	clearSession() {

		const prefix = "exam_guard:" + this.config.sessionToken + ":";

		Object.keys(localStorage)
			.filter(k => k.startsWith(prefix))
			.forEach(k => localStorage.removeItem(k));

	}

	/* ================================================================
	   MEDIA CONTROL — PUBLIC API
	   ================================================================

	   Ketiga method ini dirancang untuk skenario ujian soal-per-soal.
	   Panggil salah satunya saat user menekan tombol Next / navigasi soal
	   supaya media yang sedang berjalan dihentikan sebelum media
	   berikutnya dimuat.

	   Cara menemukan "last media":
	   - Jika ada media yang sedang aktif (isPlaying = true),
	     media itulah yang dijadikan target.
	   - Jika tidak ada yang sedang playing, ambil media dengan
	     lastActive timestamp terbaru (media yang terakhir diputar
	     meskipun sudah selesai / sudah di-pause sebelumnya).
	   ================================================================ */

	/**
	 * Kembalikan entry registry media yang paling terakhir aktif.
	 * Prioritas: sedang playing > lastActive timestamp terbesar.
	 * @returns {object|null}
	 */
	_getLastActiveMedia() {

		if (!this._mediaRegistry.length) return null;

		// Cari yang sedang playing terlebih dahulu
		const playing = this._mediaRegistry
			.filter(e => e.isPlaying())
			.sort((a, b) => b.lastActive - a.lastActive);

		if (playing.length) return playing[0];

		// Tidak ada yang playing — ambil yang paling terakhir diputar
		const sorted = [...this._mediaRegistry]
			.filter(e => e.lastActive > 0)
			.sort((a, b) => b.lastActive - a.lastActive);

		return sorted.length ? sorted[0] : null;

	}

	/**
	 * lastPause()
	 * Pause media terakhir yang aktif. Posisi dipertahankan
	 * sehingga bisa di-resume jika user kembali ke soal tersebut.
	 *
	 * @example
	 * btnNext.addEventListener("click", () => {
	 *   guard.lastPause();
	 *   goToNextQuestion();
	 * });
	 */
	lastPause() {

		const entry = this._getLastActiveMedia();

		if (!entry) {
			console.warn("[ExamGuard] lastPause: tidak ada media aktif yang ditemukan.");
			return;
		}

		if (entry.type === "youtube") {
			try { entry.player.pauseVideo(); } catch (e) {}
		} else {
			try { entry.el.pause(); } catch (e) {}
		}

	}

	/**
	 * lastStop()
	 * Stop media terakhir yang aktif dan reset ke posisi awal (currentTime = 0).
	 * Counter tidak berubah — pemutaran yang sudah terhitung tetap terhitung.
	 *
	 * @example
	 * btnNext.addEventListener("click", () => {
	 *   guard.lastStop();
	 *   goToNextQuestion();
	 * });
	 */
	lastStop() {

		const entry = this._getLastActiveMedia();

		if (!entry) {
			console.warn("[ExamGuard] lastStop: tidak ada media aktif yang ditemukan.");
			return;
		}

		if (entry.type === "youtube") {
			try { entry.player.stopVideo(); } catch (e) {}
		} else {
			try {
				entry.el.pause();
				entry.el.currentTime = 0;
			} catch (e) {}
		}

	}

	/**
	 * lastCounter()
	 * Stop media terakhir yang aktif, reset ke awal, DAN
	 * tambahkan +1 ke counter pemutaran media tersebut.
	 *
	 * Gunakan ini jika kebijakan ujian menetapkan bahwa
	 * melewati / meninggalkan media sebelum selesai
	 * tetap dihitung sebagai 1x pemutaran.
	 *
	 * @example
	 * btnNext.addEventListener("click", () => {
	 *   guard.lastCounter();
	 *   goToNextQuestion();
	 * });
	 */
	lastCounter() {

		const entry = this._getLastActiveMedia();

		if (!entry) {
			console.warn("[ExamGuard] lastCounter: tidak ada media aktif yang ditemukan.");
			return;
		}

		if (entry.type === "youtube") {
			try { entry.player.stopVideo(); } catch (e) {}
		} else {
			try {
				entry.el.pause();
				entry.el.currentTime = 0;
			} catch (e) {}
		}

		const current = this._getCount(entry.key);
		this._setCount(entry.key, current + 1);

	}

	/**
	 * playFirstMedia()
	 * Play media pertama (urutan DOM dari atas) yang saat ini visible di viewport
	 * dan belum mencapai batas maxPlay.
	 *
	 * Cara cek visibility:
	 *   - Element ada di DOM dan tidak hidden (display, visibility, opacity)
	 *   - Area element berpotongan dengan viewport (getBoundingClientRect)
	 *   - Khusus YouTube: cek iframe, bukan overlay
	 *
	 * Jika semua media visible sudah mencapai maxPlay,
	 * onMediaBlocked dipanggil dengan key media pertama yang ditemukan.
	 *
	 * @example
	 * // Saat halaman soal baru ditampilkan:
	 * guard.playFirstMedia();
	 */
	playFirstMedia() {

		/*
		 * Urutkan registry sesuai urutan DOM — gunakan compareDocumentPosition.
		 * Entry yang elemennya lebih atas di DOM akan punya index lebih kecil.
		 */
		const sorted = [...this._mediaRegistry].sort((a, b) => {

			const elA = a.type === "youtube" ? a.el : a.el;
			const elB = b.type === "youtube" ? b.el : b.el;

			if (!elA || !elB) return 0;

			const pos = elA.compareDocumentPosition(elB);

			// DOCUMENT_POSITION_FOLLOWING: elB setelah elA → a duluan
			if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
			// DOCUMENT_POSITION_PRECEDING: elB sebelum elA → b duluan
			if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;

			return 0;

		});

		/*
		 * Helper: cek apakah elemen visible di viewport.
		 * Visible = tidak hidden secara CSS dan area-nya masuk viewport.
		 */
		const isVisible = (el) => {

			if (!el) return false;

			// Cek computed style — hidden jika display:none, visibility:hidden, opacity:0
			const style = window.getComputedStyle(el);
			if (style.display === "none")       return false;
			if (style.visibility === "hidden")  return false;
			if (parseFloat(style.opacity) === 0) return false;

			// Cek apakah area element berpotongan dengan viewport
			const rect = el.getBoundingClientRect();

			return (
				rect.width  > 0 &&
				rect.height > 0 &&
				rect.bottom > 0 &&
				rect.right  > 0 &&
				rect.top    < (window.innerHeight || document.documentElement.clientHeight) &&
				rect.left   < (window.innerWidth  || document.documentElement.clientWidth)
			);

		};

		// Cari media visible pertama yang belum maxPlay
		for (const entry of sorted) {

			// Untuk YouTube gunakan el (iframe), untuk audio/video gunakan el langsung
			const checkEl = entry.el;

			if (!isVisible(checkEl)) continue;

			const count = this._getCount(entry.key);

			if (count >= this.config.maxPlay) {
				// Media ini visible tapi sudah maxPlay — lanjut cari berikutnya
				continue;
			}

			// Ketemu — play media ini
			if (entry.type === "youtube") {

				try { entry.player.playVideo(); } catch (e) {
					console.warn("[ExamGuard] playFirstMedia: gagal play YouTube.", e);
				}

			} else {

				entry.el.play().catch(err => {
					console.warn("[ExamGuard] playFirstMedia: gagal play media.", err);
				});

			}

			return; // selesai, jangan lanjut

		}

		/*
		 * Tidak ada media visible yang bisa diplay —
		 * semua sudah maxPlay atau tidak ada yang visible.
		 * Panggil onMediaBlocked dengan key media visible pertama yang ditemukan.
		 */
		const firstVisible = sorted.find(e => isVisible(e.el));

		if (firstVisible) {
			this._notifyBlocked(firstVisible.cleanSrc || firstVisible.key);
		} else {
			console.warn("[ExamGuard] playFirstMedia: tidak ada media visible di halaman.");
		}

	}

}

export { ExamGuard as default };
//# sourceMappingURL=exam-guard.esm.js.map
