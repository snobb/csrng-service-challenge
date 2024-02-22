import { FetchFn } from '../types';

export function makeFakeFetchFn<T>(input: T[]): FetchFn<T> {
    return () =>
        new Promise((resolve, reject) => {
            const cur = input.shift();
            if (!cur) {
                return reject(new Error('no fake input'));
            }

            return resolve(<T>cur);
        });
}
