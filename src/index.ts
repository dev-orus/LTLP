/* 

---------------
LTLP protocol @ 2024 v0.1.0
---------------
This is the client
---------------

*/

import { randomInt } from "crypto";
import { WebSocket } from "ws";

const ID = "node";

type HandShake = {
  type: "handshake" | any;
  id: string;
};

type RequestData = {
  type: "call" | "import";
  args: Array<any> | any;
  name: string;
  proccess: number;
};

type ReturnData = {
  value: any;
  proccess: number;
};

type FunctionData = {
  attr: string;
  args: Array<any>;
};

type ModuleData = { name: "" };

class Language_setup {
  socket: WebSocket;
  handshake: HandShake = { type: null, id: "" };
  thisHandshake: HandShake = { type: null, id: "" };
  host: string;
  processes: Array<number> = [];
  constructor(host: string) {
    this.socket = new WebSocket("ws://localhost:3000");
    this.host = host;
    this;
  }
  read(): Promise<string> {
    return new Promise((resolve) => {
      this.socket.once("message", (data) => {
        resolve(data.toString());
      });
    });
  }
  genProcess() {
    var procId = randomInt(4096);
    while (this.processes.includes(procId)) {
      procId = randomInt(4096);
    }
    return procId;
  }
  async callFunc(attr: string) {
    const procId = this.genProcess();
    const data: RequestData = {
      type: "call",
      name: attr,
      args: {},
      proccess: procId,
    };
    this.socket.send(JSON.stringify(data));
    this.processes.push(procId);
    let returnData: ReturnData = JSON.parse(await this.read());
    if (returnData.proccess === procId) {
      this.processes.splice(this.processes.indexOf(procId), 1);
      return returnData.value;
    }
  }
  ImportMod(moduleName: string) {
    const procId = this.genProcess();
    const data: RequestData = {
      type: "import",
      name: moduleName,
      args: {},
      proccess: procId,
    };
    this.socket.send(JSON.stringify(data));
  }
}

async function Language(host: string): Promise<Language_setup> {
  const lng = new Language_setup(host);
  lng.thisHandshake = {
    type: "handshake",
    id: ID,
  };
  lng.socket.send(JSON.stringify(lng.thisHandshake));
  lng.handshake = JSON.parse(await lng.read());
  lng.socket.on("message", (dataRaw) => {
    const data: RequestData = JSON.parse(dataRaw.toString());
    if (data.type === "call") {
    } else if (data.type === "import") {
      console.error("[LTLP] Cannot import modules as node");
    }
  });
  return lng;
}

export {
  Language,
  Language_setup,
  ID,
  RequestData,
  FunctionData,
  ModuleData,
  HandShake,
};
