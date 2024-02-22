import { HttpRequest, HttpResponse, startServer } from '../test-helpers/http-server';
import { nodeFetchClient, undiciFetchClient } from './fetch-client';

const host = '127.0.0.1';
const port = 10001;
const url = `http://${host}:${port}/`;

describe('fetch clients tests', () => {
    let handler: (req: HttpRequest, res: HttpResponse) => void;
    const shutdown = startServer(host, port, (req, res) => {
        handler(req, res);
    });

    afterAll(() => shutdown());

    it('should fetch data with the node client', async () => {
        handler = (_req, res: HttpResponse) => res.end('[{"status":"success","random":42}]');
        const data = await nodeFetchClient<{ status: string; random: number }>(url);
        expect(data).toEqual({ status: 'success', random: 42 });
    });

    it('should fetch data with the undici client', async () => {
        handler = (_req, res: HttpResponse) => res.end('[{"status":"success","random":42}]');
        const data = await undiciFetchClient<{ status: string; random: number }>(url);
        expect(data).toEqual({ status: 'success', random: 42 });
    });
});
