// Builds the phone app's web files (www/, which Capacitor copies into the Android app) from the
// desktop renderer: the same game, with the fonts and icon moved next to it and the phone shell
// (src/phone) added in front.
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const renderer = path.join(root, "src", "renderer");
const out = path.join(root, "www");
const FONTS = ["Galmuri11.woff2", "Galmuri11-Bold.woff2", "Galmuri9.woff2", "Galmuri7.woff2"];

const edit = (text, from, to) => {
  if (!text.includes(from)) throw new Error(`build-phone: expected to find ${JSON.stringify(from)}`);
  return text.split(from).join(to);
};

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, "fonts"), { recursive: true });

for (const name of fs.readdirSync(renderer)) {
  if (name !== "index.html" && name !== "style.css") fs.copyFileSync(path.join(renderer, name), path.join(out, name));
}
for (const name of ["phone.js", "phone.css"]) fs.copyFileSync(path.join(root, "src", "phone", name), path.join(out, name));
for (const name of FONTS) fs.copyFileSync(path.join(root, "node_modules", "galmuri", "dist", name), path.join(out, "fonts", name));
fs.copyFileSync(path.join(root, "src", "icon.png"), path.join(out, "icon.png"));

let css = fs.readFileSync(path.join(renderer, "style.css"), "utf8");
css = edit(css, "../../node_modules/galmuri/dist/", "fonts/");
fs.writeFileSync(path.join(out, "style.css"), css);

let html = fs.readFileSync(path.join(renderer, "index.html"), "utf8");
html = edit(html, `src="../icon.png"`, `src="icon.png"`);
// Older Android WebViews get Capacitor's bridge as an inline script.
html = edit(html, "script-src 'self'", "script-src 'self' 'unsafe-inline'");
html = edit(html, `<meta charset="utf-8">`, `<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">`);
html = edit(html, `<link rel="stylesheet" href="style.css">`, `<link rel="stylesheet" href="style.css">\n<link rel="stylesheet" href="phone.css">`);
html = edit(html, `<script src="data.js"></script>`, `<script src="phone.js"></script>\n<script src="data.js"></script>`);
fs.writeFileSync(path.join(out, "index.html"), html);

console.log("www/ ready");
