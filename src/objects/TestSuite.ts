import {
    ReceiveTestEntry,
    NopTestEntry,
    SendTestEntry,
    TestEntry,
    WaitTestEntry,
    AdvanceTestEntry,
    CustomTestEntry,
} from './TestEntry';
import { TestContext } from './TestContext';
import { WebSocketTester } from '../../index';

export class TestSuite {
    constructor(ctx: TestContext) {
        this.ctx = ctx;
    }

    public append(entry: TestEntry): this {
        this.entries.push(entry);
        return this;
    }

    public nop(): this {
        this.entries.push(new NopTestEntry(this.ctx));
        return this;
    }

    public wait(ms: number): this {
        this.entries.push(new WaitTestEntry(this.ctx, ms));
        return this;
    }

    public receive(msg: string | RegExp): this {
        this.entries.push(new ReceiveTestEntry(this.ctx, msg));
        return this;
    }

    public send(msg: string | Buffer): this {
        this.entries.push(new SendTestEntry(this.ctx, msg));
        return this;
    }

    public pipe(filter: (msg: string, ctx: TestContext) => boolean,
                test: (msg: string, ctx: TestContext) => boolean): this {
        this.entries.push(new AdvanceTestEntry(this.ctx, filter, test));
        return this;
    }

    public modifyContext(f: (ctx: TestContext) => void): this {
        this.entries.push(new CustomTestEntry(this.ctx, () => {
            f(this.ctx);
            return Promise.resolve(true);
        }));
        return this;
    }

    public finally(f: (this: TestSuite) => unknown): this {
        this.finalizer = f;
        return this;
    }

    public run() {
        if (this.ctx.has('__tester')) {
            const tester = this.ctx.get<WebSocketTester>('__tester');
            return tester.run(this);
        } else {
            throw new Error('No tester specified');
        }
    }

    public async prepare() {
        await this.ctx.connection.wait();
    }

    public close() {
        this.ctx.connection.close();
    }

    public async stepNext(): Promise<boolean | undefined> {
        const entry = this.entries[this.step];
        if (entry == null) {
            if (this.finalizer) {
                const out = this.finalizer();
                if (out instanceof Promise) {
                    await out;
                }
            }
            return undefined;
        }
        ++this.step;
        return entry.execute();
    }

    public get currentStep() {
        return this.step;
    }

    public get currentEntry() {
        return this.entries[this.step - 1];
    }

    private readonly entries: TestEntry[] = [];
    private step = 0;
    private readonly ctx: TestContext;
    private finalizer?: (this: TestSuite) => unknown;
}
