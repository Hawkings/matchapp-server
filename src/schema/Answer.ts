import { objectType } from "nexus";
import { User } from "./User";

export const Answer = objectType({
	name: "Answer",
	definition(t) {
		t.int("index");
		t.nonNull.string("text");
		t.list.field("users", {
			type: User,
		});
		t.int("scoreDelta");
	},
});
