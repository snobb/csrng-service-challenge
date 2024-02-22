export const sleep = (wait: number) => new Promise((resolve) => setTimeout(resolve, wait));

export const breakLoop = () => new Promise((resolve) => setImmediate(resolve));
