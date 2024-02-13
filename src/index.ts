/* 

---------------
LTLP protocol @ 2024 v0.1.0
---------------
This is the client
---------------

*/

import * as net from "net";

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
    Kwargs: { [key: string]: any } = {}
  ) {
    args = args.map((i) => {
      if (isClass(i)) {
        this.ptrVars["class_" + Object.keys(this.ptrVars).length.toString()] =
          i;
        return `class_ADDR&<${Object.keys(this.ptrVars).length - 1}>`;
      }
      if (typeof i === "function") {
        this.ptrVars[Object.keys(this.ptrVars).length] = i;
        return `fn_ADDR&<${Object.keys(this.ptrVars).length - 1}>`;
      } else {
        return i;
      }
    });
    var kwargs: { [key: string]: any } = {};
    Object.keys(Kwargs).map((i) => {
      if (isClass(Kwargs[i])) {
        this.ptrVars["class_" + Object.keys(this.ptrVars).length.toString()] =
          Kwargs[i];
        kwargs[i] = `class_ADDR&<${Object.keys(this.ptrVars).length - 1}>`;
      }
      if (typeof Kwargs[i] === "function") {
        this.ptrVars[Object.keys(this.ptrVars).length] = Kwargs[i];
        kwargs[i] = `fn_ADDR&<${Object.keys(this.ptrVars).length - 1}>`;
      } else {
        kwargs[i] = Kwargs[i];
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
    this.socket.write(JSON.stringify(data) + '\n');
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
    this.socket.write(JSON.stringify(data)+'\n');
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
  lng.socket.write(JSON.stringify(lng.thisHandshake)+'\n');
  lng.handshake = JSON.parse(await lng.read());
  lng.socket.on("data", (dataRaw) => {
    let data: RequestData2 = JSON.parse(dataRaw.toString());
    if (data.type === "call") {
      lng.socket.write(
        JSON.stringify({
          error: false,
          value: lng.ptrVars[data.attr[0].toString()](...data.args),
          process: data.process,
        }) + "\n"
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
