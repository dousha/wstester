import { delay } from '../utils/PromiseUtil';
import WebSocket from 'ws';

export class Connection {
    constructor(uri: string) {
        console.debug(`|> Opening connection: ${uri}`)
        this.ws = new WebSocket(uri);
        this.ws.on('message', msg => {
            if (typeof msg === 'string') {
                this.queue.push(msg);
                console.debug(`|< ${this.queue[this.queue.length - 1]}`);
            } else if (msg instanceof Buffer) {
                this.queue.push(msg.toString('utf8'));
                console.debug(`|< ${this.queue[this.queue.length - 1]}`);
            } else if (msg instanceof Array) {
                this.queue.push(msg.map(it => it.toString('utf8')).join());
                console.debug(`|< ${this.queue[this.queue.length - 1]}`);
            } else {
                console.warn('!< Unsupported message type ArrayBuffer');
            }
        });
        this.ws.on('open', () => {
            this.ready = true;
        });
    }

    public async nextMessage(timeout?: number): Promise<string> {
        const then = Date.now();
        while(this.queue.length < 1) {
            if (timeout) {
                const now = Date.now();
                if (now - then >= timeout) {
                    throw new Error('timeout');
                }
            }
            await delay(100); // busy waiting is ... well, perilous
        }
        return this.queue.shift()!;
    }

    public async wait() {
        while (!this.ready) {
            await delay(100);
        }
    }

    public sendMessage(str: Buffer) {
        console.debug(`|> ${str.toString('utf8')}`);
        return new Promise((resolve, reject) => {
            this.ws.send(str, err => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    public close() {
        this.ws.close();
    }

    private readonly ws: WebSocket;
    private readonly queue: string[] = [];
    private ready = false;
}
