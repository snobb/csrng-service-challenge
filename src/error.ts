import { CsrngErrorCode, CsrngErrorResponse } from './types';

export class CsrngError extends Error {
    constructor(
        message: string,
        public code: number = 500,
        public resp?: CsrngErrorResponse,
    ) {
        super(message);
    }

    static fromResponse(resp: CsrngErrorResponse) {
        switch (Number(resp.code)) {
            case CsrngErrorCode.ServiceUnavailable:
                return new CsrngError(resp.reason || 'service unavailable', 503, resp);
            case CsrngErrorCode.BadRequest:
                return new CsrngError(resp.reason || 'bad request', 400, resp);
            case CsrngErrorCode.TooManyRequests:
                return new CsrngError(resp.reason || 'too many requests', 429, resp);
            default:
                return new CsrngError(`invalid server response: ${JSON.stringify(resp)}`, 500, resp);
        }
    }
}
