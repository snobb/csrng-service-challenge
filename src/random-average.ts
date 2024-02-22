import { DataSource } from './data-source';

export class RandomAverage {
    private average = 0;
    private n = 0;

    constructor(private worker: DataSource) {}

    /**
     * updateAverage updates the current average without the need to keep the historical data.
     */
    updateAverage(value: number) {
        this.average = (this.average * this.n + value) / (this.n + 1);
        this.n += 1;
        return this.average;
    }

    /**
     * Call to the backend for the next random, update and return the historical average.
     * The worker is handling the rate-limiting and will return the value
     * eventuall unless there is a sever error, in which case it will throw.
     *
     * @returns historical average for the runtime period
     */
    async getAverage(): Promise<number> {
        const n = await this.worker.getRandom();
        return this.updateAverage(n);
    }
}
