import { constrainedMemory } from "process";
import { Language } from "./index.js";
import { spawn } from "child_process";

const pythonExec = spawn("./servers/.venv/bin/python3", ["servers/server.py"], {
  stdio: [process.stdin, process.stdout, process.stderr],
});

pythonExec.on("close", (code) => {});

function waitUntilStart() {
  return new Promise((resolve) => {
    pythonExec.once("spawn", () => {
      setTimeout(() => {
        resolve(true);
      }, 300);
    });
  });
}

await waitUntilStart();

const py = await Language("127.0.0.1", 35569, "mykey");

pythonExec.emit("close");

process.exit();
