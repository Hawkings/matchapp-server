import { objectType } from "nexus";
import { Answer } from "./Answer";
import { QuestionType } from "./QuestionType";

export const Question = objectType({
	name: "Question",
	definition(t) {
		t.nonNull.id("id");
		t.nonNull.id("groupId");
		t.nonNull.int("round");
		t.nonNull.field("type", { type: QuestionType });
		t.nonNull.list.nonNull.field("answers", { type: Answer });
		t.nonNull.string("end");
	},
});
