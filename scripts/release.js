// Publishes the version in package.json as a GitHub release that installed apps update from:
// makes the release first (so the uploads don't race to create it), builds and uploads the
// installer, its blockmap and latest.yml, then checks that latest.yml describes the uploaded file.
// Needs the GitHub CLI logged in (gh auth login). Run after committing and pushing.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const { version } = require("../package.json");
const tag = `v${version}`, repo = "minne22/TododokRoom", exe = `TodokRoom-Setup-${version}.exe`;
const gh = fs.existsSync("C:\\Program Files\\GitHub CLI\\gh.exe") ? "C:\\Program Files\\GitHub CLI\\gh.exe" : "gh";
const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { cwd: root, encoding: "utf8", ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed:\n${r.stderr || r.stdout}`);
  return (r.stdout || "").trim();
};

// A stale latest.yml from an earlier build must never be uploaded.
fs.rmSync(path.join(root, "dist", "latest.yml"), { force: true });

if (spawnSync(gh, ["release", "view", tag, "-R", repo], { encoding: "utf8" }).status !== 0) {
  run(gh, ["release", "create", tag, "-R", repo, "--title", `토도독 룸 ${version}`, "--notes", `토도독 룸 ${version}`, "--target", "main"]);
}
const env = { ...process.env, GH_TOKEN: run(gh, ["auth", "token"]) };
delete env.ELECTRON_RUN_AS_NODE;
run("npx", ["electron-builder", "--win", "--publish", "always"], { env, shell: true, stdio: "inherit" });

// Check what's on GitHub now.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "todok-release-"));
run(gh, ["release", "download", tag, "-R", repo, "-D", dir, "-p", "latest.yml", "-p", exe]);
const yml = fs.readFileSync(path.join(dir, "latest.yml"), "utf8");
const hash = crypto.createHash("sha512").update(fs.readFileSync(path.join(dir, exe))).digest("base64");
fs.rmSync(dir, { recursive: true, force: true });
if (!yml.includes(`version: ${version}`) || yml.match(/^sha512: (.*)$/m)[1] !== hash) {
  throw new Error("latest.yml on GitHub doesn't match the uploaded installer: installed apps would fail to update.");
}
console.log(`\n${tag} released: https://github.com/${repo}/releases/tag/${tag}`);
