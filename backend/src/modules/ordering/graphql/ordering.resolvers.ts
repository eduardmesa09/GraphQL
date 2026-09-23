import { GraphQLError } from "graphql";
import type { GraphQLContext } from "../../../shared/graphql/context.js";
import type { Result } from "../../../shared/result/Result.js";
import { pubsub, orderTopic } from "../../../shared/events/pubsub.js";
import { placeOrder } from "../commands/placeOrder/PlaceOrder.handler.js";
import type { PlaceOrderResult } from "../commands/placeOrder/PlaceOrder.handler.js";
import { cancelOrder } from "../commands/cancelOrder/CancelOrder.handler.js";
import { validatePrescription } from "../commands/validatePrescription/ValidatePrescription.handler.js";
import { dispatchOrder } from "../commands/dispatchOrder/DispatchOrder.handler.js";
import type { StatusChangeResult } from "../commands/ChangeStatus.shared.js";
import type { PrescriptionSupport } from "../domain/rules/PrescriptionPolicy.js";
import { getOrderForPatient, listOrdersForPatient } from "../queries/orderProjection.query.js";
import { findOrderOwner } from "../infra/OrderRepository.js";

const LIMITE_MAXIMO = 50;

/** La falta de sesión sí es excepción: no es una regla de negocio incumplida. */
function requireUser(ctx: GraphQLContext) {
	if (!ctx.user) {
		throw new GraphQLError("Se requiere autenticación", {
			extensions: { code: "UNAUTHENTICATED", http: { status: 401 } },
		});
	}
	return ctx.user;
}

async function toStatusPayload(
	result: Result<StatusChangeResult>,
	patientId: string,
) {
	if (!result.ok) {
		return { orderId: null, status: null, order: null, errors: result.errors };
	}
	return {
		orderId: result.value.orderId,
		status: result.value.status,
		// Puede venir null: la proyección todavía no corrió.
		order: await getOrderForPatient(result.value.orderId, patientId),
		errors: [],
	};
}

export const orderingResolvers = {
	Query: {
		myOrders: (
			_p: unknown,
			args: { limit?: number | null; offset?: number | null },
			ctx: GraphQLContext,
		) => {
			const user = requireUser(ctx);
			const limit = Math.min(Math.max(args.limit ?? 20, 1), LIMITE_MAXIMO);
			const offset = Math.max(args.offset ?? 0, 0);
			return listOrdersForPatient(user.id, limit, offset);
		},

		order: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
			const user = requireUser(ctx);
			return getOrderForPatient(args.id, user.id);
		},
	},

	Mutation: {
		placeOrder: async (
			_p: unknown,
			args: { input: { items: { medicationId: string; quantity: number }[]; prescriptions?: PrescriptionSupport[] | null } },
			ctx: GraphQLContext,
		) => {
			const user = requireUser(ctx);

			const result: Result<PlaceOrderResult> = await placeOrder({
				patientId: user.id,
				items: args.input.items,
				prescriptions: args.input.prescriptions ?? [],
			});

			if (!result.ok) {
				return { orderId: null, status: null, total: null, order: null, errors: result.errors };
			}

			return {
				orderId: result.value.orderId,
				status: result.value.status,
				total: result.value.total,
				order: await getOrderForPatient(result.value.orderId, user.id),
				errors: [],
			};
		},

		validatePrescription: async (_p: unknown, args: { orderId: string }, ctx: GraphQLContext) => {
			const user = requireUser(ctx);
			return toStatusPayload(
				await validatePrescription({ orderId: args.orderId, patientId: user.id }),
				user.id,
			);
		},

		dispatchOrder: async (_p: unknown, args: { orderId: string }, ctx: GraphQLContext) => {
			const user = requireUser(ctx);
			return toStatusPayload(
				await dispatchOrder({ orderId: args.orderId, patientId: user.id }),
				user.id,
			);
		},

		cancelOrder: async (_p: unknown, args: { orderId: string }, ctx: GraphQLContext) => {
			const user = requireUser(ctx);
			return toStatusPayload(
				await cancelOrder({ orderId: args.orderId, patientId: user.id }),
				user.id,
			);
		},
	},

	Subscription: {
		orderStatusChanged: {
			subscribe: async (_p: unknown, args: { orderId: string }, ctx: GraphQLContext) => {
				const user = requireUser(ctx);

				// La autorización se comprueba al suscribirse, una sola vez.
				const owner = await findOrderOwner(args.orderId);
				if (owner !== user.id) {
					throw new GraphQLError("Esta orden pertenece a otro paciente", {
						extensions: { code: "FORBIDDEN" },
					});
				}

				return pubsub.asyncIterableIterator(orderTopic(args.orderId));
			},

			// El evento solo lleva el id; la proyección se lee fresca al emitir.
			resolve: async (payload: { orderId: string }, _a: unknown, ctx: GraphQLContext) => {
				const user = requireUser(ctx);
				return getOrderForPatient(payload.orderId, user.id);
			},
		},
	},
};
