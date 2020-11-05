import { WebSocketTester } from '../index';

(async () => {
    const tester = new WebSocketTester(process.env['ADDR']!);
    await tester.buildTest()
        .modifyContext(ctx => {
            ctx.set('user', process.env['USER']!);
            ctx.set('pass', process.env['PASS']!);
        })
        .send('sREFRESH')
        .pipe(msg => {
            return msg.startsWith('REFRESH!');
        }, (msg, ctx) => {
            const parts = msg.split(/ /g);
            if (parts.length !== 2) {
                return false;
            }
            ctx.set('token', parts[1]);
            return true;
        })
        .send('aLOGIN %{token} %{user} %{pass}')
        .pipe(msg => msg.startsWith('LOGIN!'), msg => {
            const parts = msg.split(/ /g);
            if (parts.length !== 2) {
                return false;
            }
            return parts[1] !== 'FAILED';
        })
        .send('aLOGOUT %{token}')
        .pipe(msg => msg.startsWith('LOGOUT!'), () => true)
        .send('sDISPOSE %{token}')
        .pipe(msg => msg.startsWith('DISPOSE!'), () => true)
        .run();
})();
