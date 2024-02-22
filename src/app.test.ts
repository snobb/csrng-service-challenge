import { build } from './build';
import { HttpRequest, HttpResponse, startServer } from './test-helpers/http-server';
import { sleep } from './test-helpers/utils';

let app = build();

describe('app e2e tests', () => {
    describe('healthcheck endpont', () => {
        beforeAll(async () => {
            app = build();
            await app.ready();
        });

        afterAll(() => app.close());

        it('should respond to healthcheck', async () => {
            const resp = await app.inject().get('/healthcheck');
            expect(resp.headers['content-type']).toEqual('application/json; charset=utf-8');
            expect(resp.body).toEqual(JSON.stringify({ status: 'ok' }));
        });
    });

    describe('random endpoint accessing mock Csrng server', () => {
        const host = '127.0.0.1';
        const port = 10001;

        let handler: (req: HttpRequest, res: HttpResponse) => void;
        const shutdown = startServer(host, port, (req, res) => {
            handler(req, res);
        });
        process.env.CSRNG_URL = 'http://localhost:10001/api/random';

        beforeEach(async () => {
            app = build();
            await app.ready();
        });

        afterEach(async () => app.close());

        afterAll(async () => {
            delete process.env.CSRNG_URL;
            shutdown();
        });

        it('should return random number', async () => {
            handler = (_req, res: HttpResponse) => res.end('[{"status":"success","min":0,"max":100,"random":42}]');
            const resp = await app.inject().get('/api/random');
            expect(resp.headers['content-type']).toEqual('application/json; charset=utf-8');
            expect(resp.body).toEqual(JSON.stringify({ random_average: 42 }));
        });

        it('should return random number after hitting the rate-limit', async () => {
            const data = [
                '[{"status":"error","code":"5"}]',
                '[{"status":"error","code":"5"}]',
                '[{"status":"success","min":0,"max":100,"random":42}]',
            ];
            handler = (_req, res: HttpResponse) => res.end(data.shift());

            const resp = await app.inject().get('/api/random');
            expect(resp.headers['content-type']).toEqual('application/json; charset=utf-8');
            expect(resp.body).toEqual(JSON.stringify({ random_average: 42 }));
        });

        it('should return random number after hitting the rate-limit multiple times and return aggregate test', async () => {
            const data = [
                '[{"status":"error","code":"5"}]',
                '[{"status":"error","code":"5"}]',
                '[{"status":"success","min":0,"max":100,"random":42}]',
                '[{"status":"error","code":"5"}]',
                '[{"status":"error","code":"5"}]',
                '[{"status":"success","min":0,"max":100,"random":21}]',
            ];
            handler = (_req, res: HttpResponse) => res.end(data.shift());

            const resp1 = await app.inject().get('/api/random');
            expect(resp1.headers['content-type']).toEqual('application/json; charset=utf-8');
            expect(resp1.body).toEqual(JSON.stringify({ random_average: 42 }));

            const resp2 = await app.inject().get('/api/random');
            expect(resp2.headers['content-type']).toEqual('application/json; charset=utf-8');
            expect(resp2.body).toEqual(JSON.stringify({ random_average: 31.5 }));
        });

        it('should return random number to two concurrent connection after hitting the rate-limit', async () => {
            const data = [
                '[{"status":"error","code":"5"}]',
                '[{"status":"error","code":"5"}]',
                '[{"status":"error","code":"5"}]',
                '[{"status":"error","code":"5"}]',
                '[{"status":"error","code":"5"}]',
                '[{"status":"success","min":0,"max":100,"random":21}]',
            ];
            handler = (_req, res: HttpResponse) => res.end(data.shift());

            const pr1 = app.inject().get('/api/random');
            await sleep(100);
            const pr2 = app.inject().get('/api/random');

            const [resp1, resp2] = await Promise.all([pr1, pr2]);

            expect(resp1.headers['content-type']).toEqual('application/json; charset=utf-8');
            expect(resp1.body).toEqual(JSON.stringify({ random_average: 21 }));

            expect(resp2.headers['content-type']).toEqual('application/json; charset=utf-8');
            expect(resp2.body).toEqual(JSON.stringify({ random_average: 21 }));
        });
    });
});
