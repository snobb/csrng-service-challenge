import Logger from 'pino';
import { nodeFetchClient } from './clients';
import { CsrngError } from './error';
import { FetchFn, CsrngResponse } from './types';

export type RandomAvergeOptions = {
    log?: Logger.Logger;
    client?: FetchFn<CsrngResponse>;
};

export const sleep = (wait: number) => new Promise((resolve) => setTimeout(resolve, wait));

export class RandomAverage {
    private average = 0;
    private n = 0;

    private config = {
        targetUrl: process.env['CSRNG_URL'] || 'https://csrng.net/csrng/csrng.php?min=0&max=100',
        stopped: Boolean(process.env.DEBUG_LOOP_STOPPED),
        pollInterval: parseInt(process.env.DEBUG_POLL_INTERVAL || '1000'), // 1 second
        retryInterval: 200,
    };
    private log = Logger();
    // using experimental stdlib fetch here, but undici implementation is also available.
    private client: FetchFn<CsrngResponse> = nodeFetchClient;
    private running = false;

    constructor(opts?: RandomAvergeOptions) {
        if (opts?.log) {
            this.log = opts.log;
        }

        if (opts?.client) {
            this.client = opts.client;
        }

        if (!this.config.stopped) {
            this.start();
        }
    }

    /**
     * updateAverage updates the current average without the need to keep the historical data.
     */
    updateAverage(value: number) {
        this.average = (this.average * this.n + value) / (this.n + 1);
        this.n += 1;
        return this.average;
    }

    /**
     * getAverage returns the current average random value.
     *
     * @returns the current average.
     */
    getAverage() {
        return this.average;
    }

    private async updateRandom(): Promise<number> {
        const resp = await this.client(this.config.targetUrl);
        this.validate(resp);

        if (resp.status === 'success') {
            return resp.random;
        } else {
            throw CsrngError.fromResponse(resp);
        }
    }

    validate(resp: CsrngResponse) {
        if (resp.status !== 'success' && resp.status !== 'error') {
            throw new CsrngError('invalid message - invalid status');
        }

        if (resp.status === 'success' && resp.random === undefined) {
            throw new CsrngError('invalid message - missing random field');
        }

        if (resp.status === 'error' && resp.code === undefined) {
            throw new CsrngError('invalid error message - missing code field');
        }
    }

    /**
     * start the internal loop that fetches the random numbers.
     *
     * XXX: Not sure how sensitive it is to stick to one second interval and if
     * we should include latency and the spec does not provide the details, so I
     * am taking the simplest way forward, which is sticking to 1s interval
     * between successfull polls without considering latency.
     *
     * Otherwise the line of thinking could be like below:
     * eg. A poll takes 200ms, should be adjust the interval to 800ms?
     *     What happens if the request takes 1500ms?
     *       - Should we use the formula below to stay on the second boundary:
     *           pollInterval - (elapsed % 1000)?
     */
    async start() {
        this.running = true;
        while (this.running) {
            let interval = this.config.pollInterval;

            try {
                await this.loopTick();
            } catch (err) {
                if (err instanceof CsrngError && err.code === 429) {
                    // retry sooner on 429 (aka error type 5 in Csrng)
                    interval = this.config.retryInterval;
                    this.log.warn({ interval }, 'retrying');
                } else {
                    this.log.error(err);
                }
            } finally {
                await sleep(interval);
            }
        }
    }

    /**
     * stop the update loop that fetches the random numbers.
     */
    stop() {
        this.running = false;
    }

    /**
     * single tick in the update loop.
     */
    async loopTick() {
        const n = await this.updateRandom();
        this.updateAverage(n);
    }
}
