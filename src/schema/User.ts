import { objectType } from "nexus";

export const User = objectType({
	name: "User",
	definition(t) {
		t.nonNull.id("id");
		t.nonNull.string("name");
		t.int("score");
		t.id("groupId");
		t.boolean("ready");
	},
});
