export function timePromise<T>(p: Promise<T>): Promise<T & { time: number }> {
    const when = Date.now();
    return p.then(v => Object.assign(v, { time: Date.now() - when }));
}

export function timeout<T>(p: Promise<T>, timeout: number): Promise<T> {
    let resolved = false;
    return new Promise((resolve, reject) => {
        p.then(v => {
            resolved = true;
            resolve(v);
        }).catch(e => {
            reject(e);
        });
        setTimeout(() => {
            if (!resolved) {
                reject('Timed out');
            }
        }, timeout);
    });
}

export function delay(ms: number): Promise<void> {
    return new Promise(resolve => {
        setTimeout(() => resolve(), ms);
    });
}
