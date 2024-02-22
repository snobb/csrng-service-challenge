import { CsrngErrorCode, CsrngErrorResponse, CsrngResponse } from './types';
import { makeFakeFetchFn } from './test-helpers/fake-client';
import { CsrngError } from './error';
import { DataSource } from './data-source';
import { sleep } from './test-helpers/utils';

describe('DataSource tests', () => {
    it('should return the correct response', async () => {
        const input: CsrngResponse[] = [
            {
                status: 'success',
                random: 42,
            },
            {
                status: 'success',
                random: 21,
            },
        ];

        const fw = new DataSource(makeFakeFetchFn(input));

        const r1 = await fw.getRandom();
        expect(r1).toEqual(42);
        const r2 = await fw.getRandom();
        expect(r2).toEqual(21);
    });

    it('should wait for a value if rate limiting is triggered', async () => {
        const input: CsrngResponse[] = [
            {
                status: 'error',
                code: CsrngErrorCode.TooManyRequests,
            },
            {
                status: 'success',
                random: 21,
            },
        ];

        const fw = new DataSource(makeFakeFetchFn(input));
        const r1 = await fw.getRandom();
        await sleep(100);
        expect(r1).toEqual(21);
    });

    it('should raise an error if error is returned from the server.', async () => {
        const err: CsrngErrorResponse = {
            status: 'error',
            code: CsrngErrorCode.ServiceUnavailable,
        };

        const fw = new DataSource(makeFakeFetchFn([err]));
        expect(() => fw.getRandom()).rejects.toEqual(CsrngError.fromResponse(err));
    });

    describe('response validation', () => {
        it('should throw an error if the response status is neither "success" not "error"', () => {
            const err = { status: 'spanner' };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fw = new DataSource(makeFakeFetchFn([<any>err]));
            expect(() => fw.getRandom()).rejects.toBeInstanceOf(Error);
        });

        it('should throw an error if response has status = "success", but no random', () => {
            const err = { status: 'success' };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fw = new DataSource(makeFakeFetchFn([<any>err]));
            expect(() => fw.getRandom()).rejects.toBeInstanceOf(Error);
        });

        it('should throw an error if response has status = "error", but no code', () => {
            const err = { status: 'error' };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fw = new DataSource(makeFakeFetchFn([<any>err]));
            expect(() => fw.getRandom()).rejects.toBeInstanceOf(Error);
        });
    });
});
