import { withFilter } from "graphql-subscriptions";
import { subscriptionType } from "nexus";
import { Event, getAsyncIteratorFor, getUser } from "../impl";
import { Group } from "./Group";

export const Subscription = subscriptionType({
	definition(t) {
		t.field("groupUpdated", {
			type: Group,
			subscribe: withFilter(
				() => getAsyncIteratorFor(Event.GROUP_UPDATED),
				(group, _, { userId }) => {
					const user = getUser(userId!);
					return !!(user?.groupId && group.id === user.groupId);
				},
			),
			resolve: g => g,
		});
	},
});
