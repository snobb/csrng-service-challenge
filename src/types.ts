export enum CsrngErrorCode {
    TooManyRequests = 5,
    ServiceUnavailable = 7,
    BadRequest = 6,
}

export type CsrngErrorResponse = {
    status: 'error';
    code: number;
    reason?: string;
};

export type CsrngSuccessResponse = {
    status: 'success';
    min?: number;
    max?: number;
    random: number;
};

export type CsrngResponse = CsrngSuccessResponse | CsrngErrorResponse;

export interface FetchFn<T> {
    (url: string): Promise<T>;
}
