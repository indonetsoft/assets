/**
 * rollup.config.js — ExamGuard Build Configuration
 *
 * Output:
 *   dist/exam-guard.js      → UMD  (Browser <script> tag + CommonJS require)
 *   dist/exam-guard.esm.js  → ESM  (import via Vite / Webpack)
 *   dist/exam-guard.min.js  → UMD minified (production CDN)
 */

import terser from "@rollup/plugin-terser";

const input = "src/exam-guard-core.js";

const banner = `/*!
 * ExamGuard v1.0.0
 * Media play limiter + anti-cheat guard for web-based exams
 * Author  : Aldo Expert
 * License : MIT
 */`;

export default [

  /* ── 1. UMD — Browser <script> tag dan require() ── */
  {
    input,
    output: {
      file     : "dist/exam-guard.js",
      format   : "umd",
      name     : "ExamGuard",
      exports  : "default",
      banner,
      sourcemap: true,
    },
  },

  /* ── 2. ESM — import via bundler (Vite, Webpack, Rollup) ── */
  {
    input,
    output: {
      file     : "dist/exam-guard.esm.js",
      format   : "es",
      banner,
      sourcemap: true,
    },
  },

  /* ── 3. UMD Minified — production CDN ── */
  {
    input,
    output: {
      file   : "dist/exam-guard.min.js",
      format : "umd",
      name   : "ExamGuard",
      exports: "default",
      banner,
    },
    plugins: [
      terser({
        format: { comments: /^!/ },
      }),
    ],
  },

];
