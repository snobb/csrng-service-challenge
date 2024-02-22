import { fetch as undiFetch } from 'undici';

// client using experimental stdlib fetch.
export async function nodeFetchClient<T>(url: string) {
    const raw = await fetch(url);
    const json = (await raw.json()) as T[];
    const resp = json[0];
    if (!resp) {
        throw new Error('invalid server response');
    }
    return resp;
}

export async function undiciFetchClient<T>(url: string) {
    const raw = await undiFetch(url);
    const json = (await raw.json()) as T[];
    const resp = json[0];
    if (!resp) {
        throw new Error('invalid server response');
    }
    return resp;
}
