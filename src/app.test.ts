import { FastifyInstance } from 'fastify';
import { buildApp } from './app';
import { HttpRequest, HttpResponse, startServer } from './test-helpers/http-server';
import { RandomAverage } from './random-average';
import { sleep } from './test-helpers/utils';

let app: FastifyInstance;

const host = '127.0.0.1';
const port = 10001;

describe('app integration/e2e tests', () => {
    afterAll(async () => {
        delete process.env.DEBUG_LOOP_STOPPED;
        delete process.env.CSRNG_URL;
    });

    describe('healthcheck endpont', () => {
        beforeAll(async () => {
            process.env.DEBUG_LOOP_STOPPED = '1';
            process.env.CSRNG_URL = 'http://localhost:10001/';

            app = await buildApp();
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let shutdown: any;
        let handler: (req: HttpRequest, res: HttpResponse) => void = () => {};
        let randomAverage: RandomAverage;

        beforeAll(async () => {
            process.env.DEBUG_LOOP_STOPPED = '1';
            process.env.CSRNG_URL = 'http://localhost:10001/';

            shutdown = await startServer(host, port, (req, res) => {
                handler(req, res);
            });
        });

        afterAll(async () => {
            shutdown();
            app.close();
        });

        beforeEach(async () => {
            randomAverage = new RandomAverage();
            app = await buildApp({ randomAverage });
            await app.ready();
        });

        it('should return random number', async () => {
            handler = (_req, res: HttpResponse) => res.end('[{"status":"success","min":0,"max":100,"random":42}]');
            await randomAverage.loopTick();

            const resp = await app.inject().get('/api/random').end();
            expect(resp.headers['content-type']).toEqual('application/json; charset=utf-8');
            expect(resp.body).toEqual(JSON.stringify({ random_average: 42 }));
        });

        it('should return random number after hitting the rate-limit', async () => {
            const data = [
                '[{"status":"success","min":0,"max":100,"random":42}]',
                '[{"status":"success","min":0,"max":100,"random":21}]',
            ];
            handler = (_req, res: HttpResponse) => res.end(data.shift());

            await randomAverage.loopTick();

            const r1 = await app.inject().get('/api/random');
            expect(r1.headers['content-type']).toEqual('application/json; charset=utf-8');
            expect(r1.body).toEqual(JSON.stringify({ random_average: 42 }));

            await randomAverage.loopTick();

            const r2 = await app.inject().get('/api/random');
            expect(r2.headers['content-type']).toEqual('application/json; charset=utf-8');
            expect(r2.body).toEqual(JSON.stringify({ random_average: 31.5 }));
        });
    });

    describe('working loop tests', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let shutdown: any;
        let handler: (req: HttpRequest, res: HttpResponse) => void = () => {};
        let randomAverage: RandomAverage;

        beforeAll(async () => {
            process.env.DEBUG_LOOP_STOPPED = '1';
            process.env.DEBUG_POLL_INTERVAL = '100';
            process.env.CSRNG_URL = 'http://localhost:10001/';

            shutdown = await startServer(host, port, (req, res) => {
                handler(req, res);
            });
        });

        afterAll(async () => {
            shutdown();
            app.close();
        });

        beforeEach(async () => {
            randomAverage = new RandomAverage();
            app = await buildApp({ randomAverage });
            await app.ready();
        });

        // FIXME:XXX because it's timer based and thus may potentially depend on
        // the system that runs the test, this test is potentially racy and may
        // possibly produce different results on another system.
        it('should run the poll loop and fetch multiple messages', async () => {
            const data = [
                '[{"status":"success","min":0,"max":100,"random":42}]',
                '[{"status":"error","code":"5"}]',
                '[{"status":"success","min":0,"max":100,"random":21}]',
            ];
            handler = (_req, res: HttpResponse) => {
                res.end(data.shift());
            };

            try {
                // do not await - must be running in background.
                randomAverage.start();
                await sleep(500);
            } finally {
                randomAverage.stop();
            }

            const r1 = await app.inject().get('/api/random');
            expect(r1.headers['content-type']).toEqual('application/json; charset=utf-8');
            expect(r1.body).toEqual(JSON.stringify({ random_average: 31.5 }));
            randomAverage.stop();
        });
    });
});
