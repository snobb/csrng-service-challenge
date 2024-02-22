import http, { IncomingMessage, ServerResponse } from 'node:http';

export type HttpRequest = IncomingMessage;
export type HttpResponse = ServerResponse;

export function startServer(host: string, port: number, handler: (req: HttpRequest, res: HttpResponse) => void) {
    const server = http.createServer((req, res) => {
        res.setHeader('Content-Type', 'application/json');
        handler(req, res);

        if (!res.closed) {
            res.end();
        }
    });

    server.listen(port, host);

    return () => {
        server.closeAllConnections();
        server.close();
    };
}
