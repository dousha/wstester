import { Connection } from './Connection';

export interface ContextDictionary {
    [key: string]: unknown;
}

export class TestContext {
    constructor(conn: Connection, contextBase?: { [key: string]: unknown }) {
        this.ctx = {};
        Object.assign(this.ctx, contextBase);
        this.conn = conn;
    }

    public set(key: string, value: string) {
        this.ctx[key] = value;
    }

    public get<T>(key: string): T {
        if (key in this.ctx) {
            return <T> this.ctx[key];
        } else {
            throw new Error(`${key} does not present in current context`);
        }
    }

    public getOrDefault<T>(key: string, def: T): T {
        if (key in this.ctx) {
            return <T> this.ctx[key];
        } else {
            return def;
        }
    }

    public has(key: string) {
        return key in this.ctx;
    }

    public get connection(): Connection {
        return this.conn;
    }

    private readonly conn: Connection;
    private readonly ctx: ContextDictionary;
}
