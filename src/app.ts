import Fastify, { FastifyReply, FastifyRequest, FastifyServerOptions } from 'fastify';
import { CsrngResponse, FetchFn } from './types';
import { RandomAverage } from './random-average';
import Logger from 'pino';

export type BuildOptions<T> = FastifyServerOptions & {
    client?: FetchFn<T>;
    randomAverage?: RandomAverage;
};

export async function buildApp(opts: BuildOptions<CsrngResponse> = {}) {
    const log = Logger();
    const app = Fastify({ logger: log, ...opts });

    // Provided there is only one endpoint, I'm going to initialise everything
    // inline. In a bigger application I'd probably lifted routes and controllers
    // to designated packages and register as follows:
    // app.register(randomRoutes, { prefix: "/api/random" })

    const randomAverage = opts.randomAverage ? opts.randomAverage : new RandomAverage({ log, client: opts.client });

    app.get('/api/random', {}, async (_request: FastifyRequest, reply: FastifyReply) => {
        reply.code(200).send({ random_average: randomAverage.getAverage() });
    });

    // Add healthcheck endpoint
    app.get('/healthcheck', async () => ({ status: 'ok' }));

    return app;
}
