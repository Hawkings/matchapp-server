import { objectType } from "nexus";
import { GroupState } from "./GroupState";
import { Question } from "./Question";
import { User } from "./User";

export const Group = objectType({
	name: "Group",
	definition(t) {
		t.nonNull.id("id");
		t.nonNull.list.nonNull.field("users", {
			type: User,
		});
		t.field("question", {
			type: Question,
		});
		t.nonNull.field("state", {
			type: GroupState,
		});
	},
});
