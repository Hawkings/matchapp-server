import { makeSchema } from "nexus";
import { join } from "path";
import { Mutation } from "./Mutation";
import { Query } from "./Query";
import { Subscription } from "./Subscription";

export const schema = makeSchema({
	types: [Query, Mutation, Subscription],
	outputs: {
		schema: join(__dirname, "schema.graphql"),
		typegen: join(__dirname, "nexus-typegen.ts"),
	},
	contextType: {
		module: join(__dirname, "..", "..", "src", "context.ts"),
		export: "Context",
	},
});
