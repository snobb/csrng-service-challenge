import { CsrngErrorCode } from './types';
import { CsrngError } from './error';

describe('CsrngError tests', () => {
    [
        { code: CsrngErrorCode.ServiceUnavailable, httpCode: 503, msg: 'spanner' },
        { code: CsrngErrorCode.BadRequest, httpCode: 400, msg: 'spanner' },
        { code: CsrngErrorCode.TooManyRequests, httpCode: 429, msg: 'spanner' },
        { code: 42, httpCode: 500, msg: 'invalid server response: {"status":"error","code":42,"reason":"spanner"}' },
    ].forEach(({ code, httpCode, msg }) => {
        it(`should create ${CsrngErrorCode[code]} from response`, () => {
            const err = CsrngError.fromResponse({
                status: 'error',
                code,
                reason: 'spanner',
            });

            expect(err).toBeInstanceOf(CsrngError);
            expect(err.code).toEqual(httpCode);
            expect(err.message).toEqual(msg);
        });
    });

    it('should create "too many request" error from response when the code is a string', () => {
        const err = CsrngError.fromResponse({
            status: 'error',
            code: <any>'5', // eslint-disable-line @typescript-eslint/no-explicit-any
            reason: 'spanner',
        });

        expect(err).toBeInstanceOf(CsrngError);
        expect(err.code).toEqual(429);
        expect(err.message).toEqual('spanner');
    });

    it('should create "internal server error" from a bad response', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err = CsrngError.fromResponse({} as any);

        expect(err).toBeInstanceOf(CsrngError);
        expect(err.code).toEqual(500);
        expect(err.message).toEqual('invalid server response: {}');
    });
});
