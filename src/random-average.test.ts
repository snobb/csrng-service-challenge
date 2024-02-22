import { CsrngErrorCode, CsrngResponse } from './types';
import { makeFakeFetchFn } from './test-helpers/fake-client';
import { CsrngError } from './error';
import { DataSource } from './data-source';
import { RandomAverage } from './random-average';

describe('RandomAverage tests', () => {
    describe('update average', () => {
        const fetchWorker = new DataSource(makeFakeFetchFn<CsrngResponse>([]));
        const random = new RandomAverage(fetchWorker);

        it('should update the moving average', () => {
            let rand = random.updateAverage(5);
            expect(rand).toEqual(5);
            rand = random.updateAverage(2);
            expect(rand).toEqual(3.5);
            random.updateAverage(4);
            rand = random.updateAverage(15);
            expect(rand).toEqual(6.5);
        });
    });

    describe('getRandom', () => {
        it('should update average', async () => {
            const fetchWorker = new DataSource(
                makeFakeFetchFn<CsrngResponse>([
                    {
                        status: 'success',
                        random: 42,
                    },
                    {
                        status: 'success',
                        random: 21,
                    },
                ]),
            );
            const random = new RandomAverage(fetchWorker);

            const avg1 = await random.getAverage();
            expect(avg1).toEqual(42);

            const avg2 = await random.getAverage();
            expect(avg2).toEqual(31.5);
        });

        it('should update average', async () => {
            const fetchWorker = new DataSource(
                makeFakeFetchFn<CsrngResponse>([
                    {
                        status: 'error',
                        code: CsrngErrorCode.TooManyRequests,
                    },
                    {
                        status: 'success',
                        random: 42,
                    },
                    {
                        status: 'error',
                        code: CsrngErrorCode.TooManyRequests,
                    },
                    {
                        status: 'error',
                        code: CsrngErrorCode.TooManyRequests,
                    },
                    {
                        status: 'success',
                        random: 21,
                    },
                ]),
            );
            const random = new RandomAverage(fetchWorker);

            const avg1 = await random.getAverage();
            expect(avg1).toEqual(42);

            const avg2 = await random.getAverage();
            expect(avg2).toEqual(31.5);
        });
    });

    [CsrngErrorCode.ServiceUnavailable, CsrngErrorCode.BadRequest, 42].forEach((code) => {
        it(`should throw on ${CsrngErrorCode[code]}`, async () => {
            const resp: CsrngResponse = {
                status: 'error',
                code: code,
                reason: 'spanner',
            };

            const fetchWorker = new DataSource(makeFakeFetchFn<CsrngResponse>([resp]));
            const random = new RandomAverage(fetchWorker);

            expect(() => random.getAverage()).rejects.toEqual(CsrngError.fromResponse(resp));
        });
    });

    [
        { code: CsrngErrorCode.ServiceUnavailable, message: 'service unavailable' },
        { code: CsrngErrorCode.BadRequest, message: 'bad request' },
        { code: 42 },
    ].forEach(({ code, message }) => {
        it(`should throw on ${CsrngErrorCode[code]} and show default message if no reason provided`, async () => {
            const resp: CsrngResponse = {
                status: 'error',
                code: code,
                reason: message,
            };
            const fetchWorker = new DataSource(makeFakeFetchFn<CsrngResponse>([resp]));
            const random = new RandomAverage(fetchWorker);

            expect(() => random.getAverage()).rejects.toEqual(CsrngError.fromResponse(resp));
        });
    });
});
