import { TestContext } from './TestContext';

export enum TestEntryType {
    NOP,
    WAIT,
    RECEIVE,
    SEND,
    ADVANCED,
    CUSTOM
}

export abstract class TestEntry {
    protected constructor(type: TestEntryType, ctx: TestContext) {
        this.type = type;
        this.ctx = ctx;
    }

    public abstract execute(): Promise<boolean>;

    protected readonly type: TestEntryType;
    protected readonly ctx: TestContext;
}

export class NopTestEntry extends TestEntry {
    constructor(ctx: TestContext) {
        super(TestEntryType.NOP, ctx);
    }

    public execute(): Promise<boolean> {
        return Promise.resolve(true);
    }
}

export class WaitTestEntry extends TestEntry {
    constructor(ctx: TestContext, time: number) {
        super(TestEntryType.WAIT, ctx);
        this.time = time;
    }

    public execute(): Promise<boolean> {
        return new Promise(resolve => {
            setTimeout(() => resolve(true), this.time);
        });
    }

    private readonly time: number;
}

export class ReceiveTestEntry extends TestEntry {
    constructor(ctx: TestContext, regex: string | RegExp) {
        super(TestEntryType.RECEIVE, ctx);
        if (typeof regex === 'string') {
            this.matcher = new RegExp(regex);
        } else {
            this.matcher = regex;
        }
    }

    public execute(): Promise<boolean> {
        return this.ctx.connection.nextMessage().then(msg => {
            const result = this.matcher.test(msg);
            if (!result) {
                console.debug(`?? Expected: ${this.matcher}; Actual: ${msg}`);
            }
            return result;
        })
    }

    private readonly matcher: RegExp;
}

export class SendTestEntry extends TestEntry {
    constructor(ctx: TestContext, msg: string | Buffer) {
        super(TestEntryType.SEND, ctx);
        if (typeof msg === 'string') {
            this.templateMsg = msg;
        } else {
            this.msg = msg;
        }
    }

    public execute(): Promise<boolean> {
        if (this.templateMsg) {
            return this.ctx.connection.sendMessage(this.compile(this.templateMsg)).then(() => true);
        } else if (this.msg) {
            return this.ctx.connection.sendMessage(this.msg).then(() => true);
        } else {
            return Promise.reject('Impossible construct');
        }
    }

    private compile(msg: string): Buffer {
        return Buffer.from(msg.replace(/%{(.*?)}/g, (_, g) => this.ctx.get<any>(g).toString()));
    }

    private readonly msg?: Buffer;
    private readonly templateMsg?: string;
}

export class AdvanceTestEntry extends TestEntry {
    constructor(ctx: TestContext, filter: (msg: string, ctx: TestContext) => boolean, test: (msg: string, ctx: TestContext) => boolean) {
        super(TestEntryType.ADVANCED, ctx);
        this.filter = filter;
        this.test = test;
    }

    public async execute(): Promise<boolean> {
        let msg;
        do {
            msg = await this.ctx.connection.nextMessage();
        } while(!this.filter(msg, this.ctx));
        return this.test(msg, this.ctx);
    }

    private readonly filter: (msg: string, ctx: TestContext) => boolean;
    private readonly test: (msg: string, ctx: TestContext) => boolean;
}

export class CustomTestEntry extends TestEntry {
    constructor(ctx: TestContext, impl: (this: CustomTestEntry) => Promise<boolean>) {
        super(TestEntryType.CUSTOM, ctx);
        this.impl = impl;
    }

    public execute(): Promise<boolean> {
        return this.impl();
    }

    private readonly impl: (this: CustomTestEntry) => Promise<boolean>;
}
