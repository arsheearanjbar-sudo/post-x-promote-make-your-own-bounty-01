// SPDX-License-Identifier: MIT
// main.ts — copy POST.json from the repository root to the output directory.
//
// The house reads the post itself from X; this program only hands over the
// address stored in POST.json. A bad POST.json fails loudly, never silently.

import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

const botDir = process.env.MAKEFUN_BOT_DIR ?? ".";
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

const src = join(botDir, "POST.json");
let raw: string;
try {
  raw = readFileSync(src, "utf8");
} catch {
  fail(`cannot read ${src}`);
}

let post: unknown;
try {
  post = JSON.parse(raw!);
} catch {
  fail("POST.json is not valid JSON");
}

if (typeof post !== "object" || post === null || Array.isArray(post)) {
  fail("POST.json must be a JSON object");
}

const url = (post as { url?: unknown }).url;
if (typeof url !== "string" || url.length === 0) {
  fail("POST.json must hold a non-empty string url");
}

// First: is it a well-formed web address at all?
let parsed: URL;
try {
  parsed = new URL(url);
} catch {
  fail(`not a URL: ${url}`);
}
if (parsed.protocol !== "https:") {
  fail(`not a URL: ${url}`);
}

// Second: is it on X at all?
const host = parsed.hostname.replace(/^(www\.|mobile\.)/, "");
if (host !== "x.com" && host !== "twitter.com") {
  fail(`not an X post address: ${url}`);
}

// Third: is it an X post address? Either /<handle>/status/<id> with a
// 1–15 character handle, or the /i/web/status/<id> form from RULES.txt.
const handle = "[A-Za-z0-9_]{1,15}";
const match = parsed.pathname.match(
  new RegExp(`^/(?:${handle}/status|(i/web/status))/(\\d+)/?$`),
);
if (!match) {
  fail(`not an X post address: ${url}`);
}
const statusId = match[2];

mkdirSync(outDir, { recursive: true });
const dest = join(outDir, "POST.json");
writeFileSync(dest, raw!, "utf8");
chmodSync(dest, 0o644);
console.log(`copied POST.json -> ${dest} (status ${statusId})`);
