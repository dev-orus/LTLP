import socket
import json
from threading import Thread
import traceback
import builtins
import psutil
import sys

def kill_processes_on_port(port):
    for proc in psutil.process_iter(['pid', 'connections']):
        try:
            if proc.info['connections'] is not None:
                for conn in proc.info['connections']:
                    if conn.laddr and conn.laddr.port == int(port):
                        proc.kill()
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass

class ltlpTest:
    def testFuncArg(fn):
        return fn(1, 1)

HOST = '127.0.0.1'
PORT = 35569
KEY = 'mykey'
OBJECTS = {'builtins': builtins, 'ltlpTest': ltlpTest}
PROCESSES = []

kill_processes_on_port(PORT)

def createFunction(c: socket.socket, fnid):
    def wrapper(*args):
        procid = f'py*{len(PROCESSES)}'
        PROCESSES.append(procid)
        d = json.dumps({
            'type': 'call',
            'module': '',
            'attr': [fnid],
            'args': list(args),
            'process': procid
        }).encode()
        c.sendall(d)
        data = json.loads(c.recv(1024))
        while data['process'] != procid:
            data = json.loads(c.recv(1024))
        
        try:PROCESSES.remove(procid)
        except:pass
        
        if data['error']:
            raise BufferError(data['value'])
        else:
            return data['value']
    return wrapper

server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

server_socket.bind((HOST, PORT))

server_socket.listen(5)

def handle_client(c: socket.socket, addr):
    while True:
        try:
            rawData = c.recv(1024).decode()
            if rawData:
                data = json.loads(rawData)
                try:
                    out = 0
                    if data['type']=='call':
                        attr=OBJECTS[data['moduleName']]
                        for i in data['attr']:
                            attr = getattr(attr, i)
                        rawArgs = data['args']
                        args = []
                        for arg in rawArgs:
                            if str(arg).startswith('fn_ADDR&<') and str(arg).endswith('>'):
                                args.append(createFunction(c, int(str(arg).removeprefix('fn_ADDR&<').removesuffix('>'))))
                            else:
                                args.append(arg)
                        out = attr(*args)
                    elif data['type']=='import':
                        OBJECTS[data['moduleName']] = __import__(data['moduleName'])
                    c.sendall(json.dumps({
                        'process': data['process'],
                        'error': False,
                        'value': out
                    }).encode())
                    # c.send('\n'.encode())
                    # c.sendall('{"type": "call"}'.encode())
                except Exception as e:
                    c.sendall(json.dumps({
                        'process': data['process'],
                        'error': True,
                        'value': traceback.format_exc()
                    }).encode())
        except:
            c.close()
            break
while True:
    cs, addr = server_socket.accept()
    try:
        data = json.loads(cs.recv(1024).decode())
        if data['key']==KEY:
            cs.sendall(json.dumps({
                    'type': 'handshake',
                    'id': 'python'
            }).encode())
            Thread(target=handle_client, args=(cs, addr), daemon=True).start()
        else:
            print(f'unauthorized client {addr[0]}:{addr[1]}')
            cs.close()
    except Exception as e:
        print(e)
        cs.close()

server_socket.close()