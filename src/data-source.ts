import { CsrngResponse, FetchFn } from './types';
import { CsrngError } from './error';
import { nodeFetchClient } from './clients';

const timeout = 200;
const nAttempts = 1000 / timeout + 1;

const sleep = (wait: number) => new Promise((resolve) => setTimeout(resolve, wait));

type ResolveFn = (n: number | PromiseLike<number>) => void;
type RejectFn = (err: Error) => void;
type PromiseTuple = [ResolveFn, RejectFn];

/**
 * DataSource fetches a random number from the backend server.
 * In case of the rate-limit, the clients are put into the backlog and a retry
 * loop is started.
 * This has a potential security DoS risk, so ideally the backlog should be
 * capped to some reasonable size.
 */
export class DataSource {
    private inProgress = false;
    private backlog: PromiseTuple[] = [];
    private targetUrl: string = process.env['CSRNG_URL'] || 'https://csrng.net/csrng/csrng.php?min=0&max=100';

    // using experimental stdlib fetch, but there is a undici client available as well.
    constructor(private client: FetchFn<CsrngResponse> = nodeFetchClient) {}

    /**
     * getRandom fetches a new random number from the backend server.
     * If rate-limiting threshold is triggered, it will start a retry loop and
     * will update all waiting parties upon completion.
     *
     * @returns a promise that resolves with the received random number or with
     * an error.
     */
    getRandom(): Promise<number> {
        return new Promise((resolve, reject) => {
            this.backlog.push([resolve, reject]);
            this.poke();
        });
    }

    private updateSuccess(n: number) {
        for (const [resolve] of this.backlog) {
            resolve(n);
        }
    }

    private updateError(err: CsrngError | Error) {
        for (const [, reject] of this.backlog) {
            reject(err);
        }
    }

    private async poke() {
        if (this.inProgress) {
            return;
        }

        try {
            this.inProgress = true;

            for (let i = 0; i < nAttempts; i += 1) {
                try {
                    const resp = await this.fetchOnce();
                    return this.updateSuccess(resp.random);
                } catch (err) {
                    if (err instanceof CsrngError && err.code !== 429) {
                        return this.updateError(<CsrngError>err);
                    }
                }

                await sleep(timeout);
            }
        } finally {
            this.backlog.splice(0);
            this.inProgress = false;
        }

        throw new CsrngError(`failed to fetch after ${nAttempts} attempts`);
    }

    private async fetchOnce() {
        const resp = await this.client(this.targetUrl);
        this.validate(resp);

        if (resp.status === 'success') {
            return resp;
        } else {
            throw CsrngError.fromResponse(resp);
        }
    }

    private validate(resp: CsrngResponse) {
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
}
