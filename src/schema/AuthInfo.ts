import { objectType } from "nexus";
import { User } from "./User";

export const AuthInfo = objectType({
	name: "AuthInfo",
	definition(t) {
		t.nonNull.field("user", { type: User });
		t.nonNull.string("token");
	},
});
