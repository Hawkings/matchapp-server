import { randomBytes } from "crypto";
import * as jwt from "jsonwebtoken";

const KEY = randomBytes(32);
const ALGO = "HS256";

export function createToken(userId: string) {
	return jwt.sign(userId, KEY, { algorithm: ALGO });
}

export function getUserIdFromToken(token: string): string | undefined {
	try {
		const userId = jwt.verify(token, KEY, { algorithms: [ALGO] });
		if (typeof userId === "string" && !Number.isNaN(parseInt(userId))) {
			return userId;
		}
	} catch {
		if (token) {
			console.log(`Bad token received "${token}"`);
		}
		return undefined;
	}
}
