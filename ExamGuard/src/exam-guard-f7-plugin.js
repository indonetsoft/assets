/**
 * ExamGuard — Framework7 Plugin
 *
 * Cara penggunaan:
 *
 *   import ExamGuard         from "./exam-guard-core.js";
 *   import ExamGuardF7Plugin from "./exam-guard-f7-plugin.js";
 *
 *   const app = new Framework7({
 *     // ...
 *     plugins : [ExamGuardF7Plugin],
 *     examGuard: {
 *       sessionToken       : "TOKEN_DARI_SERVER",
 *       maxPlay            : 2,
 *       fullscreenMode     : true,
 *       disableCopy        : true,
 *       disableTabSwitch   : true,
 *       preventMultipleTab    : true,
 *       lockOnViolation    : false,
 *     }
 *   });
 *
 * Plugin akan otomatis menginisialisasi ExamGuard di setiap halaman
 * yang memiliki elemen .exam-media (atau selector yang dikonfigurasi).
 *
 * Author  : Aldo Expert
 * License : MIT
 */

import ExamGuard from "./exam-guard-core.js";

const ExamGuardF7Plugin = {

	name: "examGuard",

	// Skema default params plugin
	params: {
		examGuard: {
			selector           : ".exam-media",
			sessionToken       : null,
			maxPlay            : 2,
			fullscreenMode     : true,
			disableCopy        : true,
			disableTabSwitch   : true,
			preventMultipleTab    : true,
			forcePlayUntilEnd  : false,
			lockOnViolation    : false,
			onViolation        : null,
			onMediaBlocked     : null,
		}
	},

	create() {

		// Ekspos ExamGuard class ke instance app (app.ExamGuard)
		this.ExamGuard = ExamGuard;

		// Instance aktif akan disimpan di sini
		this.examGuardInstance = null;

	},

	on: {

		pageInit(page) {

			const app    = page.app;
			const params = app.params.examGuard || {};

			if (!params.sessionToken) {
				// Tidak ada token — skip inisialisasi
				return;
			}

			// Cek apakah halaman ini punya container media
			const selector  = params.selector || ".exam-media";
			const container = page.el.querySelector(selector);

			if (!container) {
				// Halaman ini tidak memiliki media ujian — skip
				return;
			}

			// Hancurkan instance lama jika ada (misal: navigasi antar halaman)
			if (app.examGuardInstance) {
				app.examGuardInstance._cleanup();
				app.examGuardInstance = null;
			}

			// Buat instance baru dengan selector yang di-scope ke halaman ini
			app.examGuardInstance = new ExamGuard({
				...params,
				// Override selector agar lebih spesifik ke halaman aktif
				// ExamGuard menggunakan document.querySelector, jadi pastikan
				// container memiliki ID atau class yang unik jika diperlukan.
				selector: selector,
			});

		},

		pageBeforeRemove(page) {

			const app = page.app;

			// Bersihkan saat halaman dihapus dari DOM
			if (app.examGuardInstance) {
				app.examGuardInstance._cleanup();
				app.examGuardInstance = null;
			}

		}

	}

};

export default ExamGuardF7Plugin;
