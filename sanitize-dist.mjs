// =============================================================
//  Strips external http(s):// URLs from the built game files.
//
//  Yandex Games moderation rejects archives that contain links to
//  external services / storage ("Обнаружена ссылка на сервисное
//  хранилище"). The scanner greps EVERY file in the ZIP, so even
//  harmless license-banner URLs inside the minified JS bundle
//  (react.dev error links, Tailwind's GitHub link, ...) trigger it.
//
//  This script replaces every external URL with "about:blank"
//  EXCEPT http://www.w3.org/* identifiers — those are SVG/XML
//  namespace constants used by React internally and are never
//  fetched over the network. Removing them would break rendering.
//
//  Run by the archive builders (pack-yandex.ps1 / собрать-архив.sh)
//  right before the ZIP is created.
// =============================================================
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "dist");
const URL_RE = /https?:\/\/[^"'`\s\\)\]},;>]+/g;

function clean(text) {
  return text.replace(URL_RE, (m) => (m.startsWith("http://www.w3.org") ? m : "about:blank"));
}

const files = [join(root, "index.html")];
try {
  const assets = join(root, "assets");
  for (const f of readdirSync(assets)) {
    if (/\.(js|css|html|svg)$/.test(f)) files.push(join(assets, f));
  }
} catch {
  console.error("  sanitize: dist/assets not found — rebuild first");
  process.exit(1);
}

let changed = 0;
let removed = 0;
for (const f of files) {
  const src = readFileSync(f, "utf8");
  const out = clean(src);
  if (out !== src) {
    removed += (src.match(URL_RE) || []).filter((m) => !m.startsWith("http://www.w3.org")).length;
    writeFileSync(f, out, "utf8");
    changed++;
  }
}
console.log(`  Sanitize     : ${removed} external URL(s) neutralized in ${changed} file(s)`);
