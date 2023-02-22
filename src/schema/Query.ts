import { nonNull, queryType, stringArg } from "nexus";
import { getGroup } from "../impl";
import { Group } from "./Group";

export const Query = queryType({
	definition(t) {
		t.field("groupById", {
			type: Group,
			args: {
				id: nonNull(stringArg()),
			},
			resolve(_, { id }) {
				return getGroup(id) ?? null;
			},
		});
	},
});
