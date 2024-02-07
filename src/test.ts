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

// await py.ImportMod("os");

const os = {
  system: async (command: any) => {
    return await py.callFunc("os", ["system"], [command]);
  },
  exists: async (command: string) => {
    return await py.callFunc("os", ["path", "exists"], [command]);
  },
};

const ltlpTest = {
  testFuncArg: async (fn: Function) => {
    return await py.callFunc("ltlpTest", ["testFuncArg"], [fn]);
  },
};

function test(x: number, y: number) {
  return x + y;
}

console.log(await ltlpTest.testFuncArg(test));

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(0);
    }, ms);
  });
}

pythonExec.emit("close");

process.exit();
