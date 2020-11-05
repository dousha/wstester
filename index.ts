import { TestSuite } from './src/objects/TestSuite';
import { TestContext } from './src/objects/TestContext';
import { Connection } from './src/objects/Connection';

export class WebSocketTester {
    constructor(uri: string) {
        this.uri = uri;
    }

    public buildTest(): TestSuite {
        const ctx = new TestContext(new Connection(this.uri), { __tester: this });
        return new TestSuite(ctx);
    }

    public loadTest(test: TestSuite) {
        this.suite = test;
    }

    public run(test?: TestSuite) {
        if (test) {
            this.suite = test;
        }
        return this.runTestSuite();
    }

    private async runTestSuite() {
        if (!this.suite) {
            throw new Error('No test specified');
        } else {
            await this.suite.prepare();
            let current;
            do {
                try {
                    console.debug(`-- Executing step ${this.suite.currentStep + 1}`);
                    current = await this.suite.stepNext();
                    if (current != null) {
                        if (!current) {
                            console.error(`!! Test failed at step ${this.suite.currentStep}`);
                            break;
                        }
                    }
                } catch (e) {
                    console.error(`!! Exception thrown at step ${this.suite.currentStep}`);
                    console.error(e);
                    break;
                }
            } while (current != null);
            if (current == null) {
                console.log('|| Test success');
            }
            this.suite.close();
        }
    }

    private readonly uri: string;
    private suite?: TestSuite;
}
