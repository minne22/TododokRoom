// Builds the duck edition installer (the regular app plus ducks to adopt, made for a friend):
// switches the edition on, builds dist/duck/TodokRoom-Duck-Setup-<version>.exe, then switches it back.
// It is never published and is marked as an edition, so it doesn't update itself to the regular app.
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const file = path.join(__dirname, "..", "src", "renderer", "edition.js");
const regular = fs.readFileSync(file, "utf8");
try {
  fs.writeFileSync(file, regular.replace("window.EDITION = {};", "window.EDITION = { duck: true };"));
  const r = spawnSync("npx", ["electron-builder", "--win", "--publish", "never", "-c.artifactName=TodokRoom-Duck-Setup-${version}.${ext}", "-c.extraMetadata.edition=duck", "-c.directories.output=dist/duck"],
    { stdio: "inherit", shell: true, cwd: path.join(__dirname, "..") });
  process.exitCode = r.status;
} finally {
  fs.writeFileSync(file, regular);
}
