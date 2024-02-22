import { CsrngErrorCode, CsrngResponse } from './types';
import { makeFakeFetchFn } from './test-helpers/fake-client';
import { RandomAverage } from './random-average';
import { CsrngError } from './error';

process.env.DEBUG_LOOP_STOPPED = '1';

describe('RandomAverage tests', () => {
    afterAll(() => {
        delete process.env.DEBUG_LOOP_STOPPED;
    });

    describe('update average', () => {
        const random = new RandomAverage({ client: makeFakeFetchFn<CsrngResponse>([]) });

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
        let random: RandomAverage;

        it('should update average', async () => {
            const fakeFetchFn = makeFakeFetchFn<CsrngResponse>([
                {
                    status: 'success',
                    random: 42,
                },
                {
                    status: 'success',
                    random: 21,
                },
                {
                    status: 'error',
                    code: CsrngErrorCode.TooManyRequests,
                },
            ]);

            random = new RandomAverage({ client: fakeFetchFn });
            await random.loopTick();
            const avg1 = await random.getAverage();
            expect(avg1).toEqual(42);

            await random.loopTick();
            const avg2 = await random.getAverage();
            expect(avg2).toEqual(31.5);

            expect(() => random.loopTick()).rejects.toBeInstanceOf(CsrngError);
        });
    });

    describe('response validation', () => {
        it('should throw an error if the response status is neither "success" not "error"', () => {
            const err = { status: 'spanner' };

            const ra = new RandomAverage({});
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect(() => ra.validate(<any>err)).toThrow();
        });

        it('should throw an error if response has status = "success", but no random', () => {
            const err = { status: 'success' };
            const ra = new RandomAverage({});
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect(() => ra.validate(<any>err)).toThrow();
        });

        it('should throw an error if response has status = "error", but no code', () => {
            const err = { status: 'error' };
            const ra = new RandomAverage({});
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect(() => ra.validate(<any>err)).toThrow();
        });
    });
});
