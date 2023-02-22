export function sleep(ms: number): Promise<void> {
	return new Promise(resolve => {
		setTimeout(resolve, ms);
	});
}

export class PromiseResolver<T> {
	private resolver!: (value: T | PromiseLike<T>) => void;
	readonly promise: Promise<T>;

	constructor() {
		this.promise = new Promise(res => {
			this.resolver = res;
		});
	}

	resolve(value: T | PromiseLike<T>) {
		this.resolver(value);
	}
}
