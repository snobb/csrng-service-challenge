import Fastify, { FastifyReply, FastifyRequest, FastifyServerOptions } from 'fastify';
import { CsrngResponse, FetchFn } from './types';
import { DataSource } from './data-source';
import { RandomAverage } from './random-average';
import { CsrngError } from './error';

export type BuildOptions<T> = FastifyServerOptions & {
    client?: FetchFn<T>;
};

export function build(opts: BuildOptions<CsrngResponse> = {}) {
    const app = Fastify({ logger: true, ...opts });

    // Provided there is only one endpoint, I'm going to initialise everything
    // inline. In a bigger application I'd probably lifted routes and packages
    // to designated packages and register as follows:
    // app.register(randomRoutes, { prefix: "/api/random" })

    const ds = new DataSource(opts.client);
    const randomAverage = new RandomAverage(ds);

    // TODO: add schema and use validation typebox/zod?
    app.get('/api/random', {}, async (_request: FastifyRequest, reply: FastifyReply) => {
        try {
            const avg = await randomAverage.getAverage();
            reply.code(200).send({ random_average: avg });
        } catch (err) {
            if (err instanceof CsrngError) {
                reply.log.error(err);
                // XXX: we do not necessarily want to expose the BE error. We
                // could probably go with generic per return code.
                reply.code(err.code).send(err.message);
            } else {
                reply.log.error(err);
                reply.code(500).send({ error: (<Error>err).message });
            }
        }
    });

    // Add healthcheck endpoint
    app.get('/healthcheck', async () => ({ status: 'ok' }));

    return app;
}
