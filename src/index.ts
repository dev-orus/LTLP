/* 

---------------
LTLP protocol @ 2024 v0.1.0
---------------
This is the client
---------------

*/

import { randomInt } from "crypto";
import * as net from "net";
import { constrainedMemory } from "process";
import { ElementFlags } from "typescript";

const ID = "node";

type HandShake = {
  type: "handshake" | any;
  id: string;
  key?: string;
};

type RequestData = {
  type: "call" | "import";
  args?: Array<any>;
  kwargs?: Object;
  attr?: Array<string>;
  moduleName: string;
  process: number;
};

type RequestData2 = {
  type: "call" | "import";
  args: Array<any>;
  kwargs?: Object;
  attr: Array<string>;
  moduleName: string;
  process: number;
};

type ReturnData = {
  value: any;
  error: true | false;
  process: number;
};

type FunctionData = {
  attr: string;
  args: Array<any>;
  kwargs: Object;
};

type ModuleData = { name: "" };

function isClass(obj: any): boolean {
  return (
    typeof obj === "function" &&
    /^class\s/.test(Function.prototype.toString.call(obj))
  );
}

class Language_setup {
  socket: net.Socket;
  handshake: HandShake = { type: null, id: "", key: "" };
  thisHandshake: HandShake = { type: null, id: "", key: "" };
  host: string;
  key: string;
  processes: Array<number> = [];
  ptrVars: { [key: string]: any } = {};
  constructor(HOST: string, PORT: number, KEY: string) {
    this.socket = new net.Socket();
    this.socket.connect(PORT, HOST, () => {});
    this.host = HOST;
    this.key = KEY;
  }
  read(): Promise<string> {
    return new Promise((resolve) => {
      this.socket.once("data", (data) => {
        resolve(data.toString());
      });
    });
  }
  async callFunc(
    moduleName: string,
    attr: Array<string>,
    args: Array<any> = [],
    kwargs: Object = {}
  ) {
    args = args.map((i) => {
      if (isClass(i)) {
        this.ptrVars["class_" + Object.keys(this.ptrVars).length.toString()] =
          i;
        return `class_ADDR&<${Object.keys(this.ptrVars).length}>`;
      }
      if (typeof i === "function") {
        this.ptrVars[Object.keys(this.ptrVars).length] = i;
        return `fn_ADDR&<${Object.keys(this.ptrVars).length - 1}>`;
      } else {
        return i;
      }
    });
    const procId = this.processes.length;
    const data: RequestData = {
      type: "call",
      attr: attr,
      moduleName: moduleName,
      args: args,
      kwargs: kwargs,
      process: procId,
    };
    this.socket.write(JSON.stringify(data));
    this.processes.push(procId);
    let returnData: ReturnData = JSON.parse(await this.read());
    while (returnData.process !== procId) {
      returnData = JSON.parse(await this.read());
    }
    this.processes.splice(this.processes.indexOf(procId), 1);
    if (returnData.error === true) {
      throw returnData.value;
    } else {
      return returnData.value;
    }
  }
  async ImportMod(moduleName: string) {
    const procId = this.processes.length;
    const data: RequestData = {
      type: "import",
      moduleName: moduleName,
      process: procId,
    };
    this.socket.write(JSON.stringify(data));
    let returnData: ReturnData = JSON.parse(await this.read());
    while (returnData.process !== procId) {
      returnData = JSON.parse(await this.read());
    }
    this.processes.splice(this.processes.indexOf(procId), 1);
    if (returnData.error === true) {
      throw returnData.value;
    } else {
      return returnData.value;
    }
  }
}

async function Language(
  HOST: string,
  PORT: number,
  KEY: string
): Promise<Language_setup> {
  const lng = new Language_setup(HOST, PORT, KEY);
  lng.thisHandshake = {
    type: "handshake",
    id: ID,
    key: KEY,
  };
  lng.socket.setMaxListeners(3000);
  lng.socket.write(JSON.stringify(lng.thisHandshake));
  lng.handshake = JSON.parse(await lng.read());
  lng.socket.on("data", (dataRaw) => {
    let data: RequestData2 = JSON.parse(dataRaw.toString());
    if (data.type === "call") {
      lng.socket.write(
        JSON.stringify({
          error: false,
          value: lng.ptrVars[data.attr[0].toString()](...data.args),
          process: data.process,
        })
      );
      delete lng.ptrVars[data.attr[0].toString()];
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
  RequestData2,
  FunctionData,
  ModuleData,
  HandShake,
};
