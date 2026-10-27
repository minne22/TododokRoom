// Self-check: runs the app with a made-up save, simulates a busy room (turned seats and beds, pets,
// toys, typing on and off, day and night) and lists anything that ends up where it shouldn't.
// `npm run check`; exits non-zero if there were problems.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const electron = require("electron");   // the path to the Electron binary, when required from Node
const env = { ...process.env, TODOK_DEMO: "1", TODOK_DELAY: "1500",
  TODOK_SNAPSHOT: path.join(os.tmpdir(), "todok-check.png"),
  TODOK_EVAL: fs.readFileSync(path.join(__dirname, "check-room.eval.js"), "utf8") };
delete env.ELECTRON_RUN_AS_NODE;
const out = spawnSync(electron, ["."], { cwd: path.join(__dirname, ".."), env, encoding: "utf8" }).stdout || "";
const line = out.split("\n").find(l => l.startsWith("[eval]"));
if (!line) { console.error("The check didn't run:\n" + out); process.exit(2); }
const { steps, problems } = JSON.parse(line.slice(7));
console.log(problems.length ? `Problems in ${steps} steps:\n- ${problems.join("\n- ")}` : `No problems in ${steps} steps.`);
process.exitCode = problems.filter(p => !/resting under/.test(p)).length ? 1 : 0;   // toys under user-placed pieces are allowed
