import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import cors from "cors";
import { json } from "body-parser";
import express from "express";
import { schema } from "./schema/schema";
import http from "http";
import { getUserIdFromToken } from "./auth";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/lib/use/ws";
import { leaveGroup, removeUser } from "./impl";

const PORT = 7777;

const disconnectTimeouts = new Map<string, NodeJS.Timeout>();
const DISCONNECT_DELAY_MS = 15 * 60 * 1000; // 15 minutes

interface ApolloContext {
	userId?: string;
}

(async () => {
	const app = express();
	const httpServer = http.createServer(app);
	const wsServer = new WebSocketServer({
		server: httpServer,
		path: "/subscriptions",
	});
	const serverCleanup = useServer(
		{
			schema,
			context: async ctx => {
				if (ctx.connectionParams?.authToken) {
					return { userId: getUserIdFromToken(ctx.connectionParams.authToken as string) };
				} else {
					return { userId: undefined };
				}
			},
			onDisconnect(ctx) {
				console.log("Disconnected");
				if (ctx.connectionParams?.authToken) {
					const userId = getUserIdFromToken(ctx.connectionParams.authToken as string);
					if (userId) {
						const timeoutId = setTimeout(() => {
							leaveGroup(userId!);
							removeUser(userId!);
						}, DISCONNECT_DELAY_MS);
						disconnectTimeouts.set(userId, timeoutId);
					}
				}
			},
			onConnect(ctx) {
				console.log("New connection");
				if (ctx.connectionParams?.authToken) {
					const userId = getUserIdFromToken(ctx.connectionParams.authToken as string);
					if (userId && disconnectTimeouts.has(userId)) {
						clearTimeout(disconnectTimeouts.get(userId));
						disconnectTimeouts.delete(userId);
					}
					if (userId === undefined) {
						console.log("bad token received");
						return { error: "Invalid token" };
					}
				}
			},
		},
		wsServer,
	);
	const server = new ApolloServer<ApolloContext>({
		schema,
		csrfPrevention: true,
		cache: "bounded",
		plugins: [
			ApolloServerPluginDrainHttpServer({ httpServer }),
			{
				async serverWillStart() {
					return {
						async drainServer() {
							await serverCleanup.dispose();
						},
					};
				},
			},
		],
	});
	await server.start();
	app.use(
		"/graphql",
		cors<cors.CorsRequest>(),
		json(),
		expressMiddleware(server, {
			context: async ({ req }) => {
				const token = req.headers.authorization || "";
				const userId = getUserIdFromToken(token);
				return { userId };
			},
		}),
	);
	await new Promise<void>(resolve => httpServer.listen({ port: PORT }, resolve));
	console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
})();
