import { WebSocketTester } from '../index';

(async () => {
    const test = new WebSocketTester('wss://echo.websocket.org');
    await test.buildTest()
        .send('hello')
        .receive(/hello/)
        .run();
})();
