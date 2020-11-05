import { WebSocketTester } from '../index';
import { TestSuite } from '../src/objects/TestSuite';

function ensureMessageParts(msg: string, count: number): string[] | undefined {
    const out = msg.split(/ /g);
    if (out.length < count) {
        return undefined;
    } else {
        return out;
    }
}

function setupLogin(t: TestSuite): TestSuite {
    return t.send('sREFRESH')
        .pipe(msg => msg.startsWith('REFRESH!'), (msg, ctx) => {
            const parts = msg.split(/ /g);
            if (parts.length !== 2) {
                return false;
            }
            ctx.set('token', parts[1]);
            return true;
        })
        .send('aLOGIN %{token} %{user} %{pass}')
        .pipe(msg => msg.startsWith('LOGIN!'), msg => {
            const parts = ensureMessageParts(msg, 2);
            return parts != null && /^[0-9a-f]+/.test(parts[1]);
        });
}

function setupLogout(t: TestSuite): TestSuite {
    return t.send('aLOGOUT %{token}')
        .pipe(msg => msg.startsWith('LOGOUT'), () => true)
        .send('sDISPOSE %{token}')
        .pipe(msg => msg.startsWith('DISPOSE'), () => true);
}

(async () => {
    const endpoint = process.env['ADDR']!;
    const client1 = new WebSocketTester(endpoint);
    const client2 = new WebSocketTester(endpoint);

    let roomId: string;

    const suite1 = client1.buildTest()
        .modifyContext(ctx => {
            ctx.set('user', process.env['USER1']!);
            ctx.set('pass', process.env['PASS1']!);
        });
    const suite2 = client2.buildTest()
        .modifyContext(ctx => {
            ctx.set('user', process.env['USER2']!);
            ctx.set('pass', process.env['PASS2']!);
        });
    setupLogin(suite1);
    setupLogin(suite2);

    suite1.send('lCREATE %{token} test_room_babe 2')
        .pipe(msg => msg.startsWith('CREATE!'), (msg, ctx) => {
            const parts = ensureMessageParts(msg, 2);
            if (parts != null) {
                roomId = parts[1];
                return true;
            }
            return false;
        })
        .wait(10_000) // wait for client 2
        .send('lREADY %{token} 1')
        .pipe(msg => msg.startsWith('READY!'), () => true)
        .wait(3000)
        .send('lPART %{token}')
        .pipe(msg => msg.startsWith('PART!'), () => true);
    suite2.wait(10_000) // wait for client 1
        .modifyContext(ctx => {
            ctx.set('room', roomId!);
        })
        .send('lJOIN %{token} %{room}')
        .pipe(msg => msg.startsWith('JOIN!'), msg => {
            const parts = ensureMessageParts(msg, 2);
            return parts != null && Number(parts[1]) === 0;
        })
        .pipe(msg => msg.startsWith('READY'), () => true)
        .pipe(msg => msg.startsWith('PART'), () => true)
        .send('lPART %{token}')
        .pipe(msg => msg.startsWith('PART!'), () => true);

    setupLogout(suite1);
    setupLogout(suite2);

    await Promise.all([suite1.run(), suite2.run()]);
})();
