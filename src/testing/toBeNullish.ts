import { expect } from "@jest/globals";
import type { MatcherFunction } from "expect";

const toBeNullish: MatcherFunction = function (actual) {
	return {
		message: () => `expected ${this.utils.printReceived(actual)} to be null or undefined`,
		pass: actual == null,
	};
};

expect.extend({ toBeNullish });

declare global {
	namespace jest {
		interface Matchers<R> {
			toBeNullish(): R;
		}
	}
}
