import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useSubscription } from "@apollo/client/react";
import {
	ORDER, ORDER_STATUS_CHANGED, VALIDATE_PRESCRIPTION, DISPATCH_ORDER, CANCEL_ORDER, MY_ORDERS,
} from "../../graphql/operations";
import type {
	OrderQuery,
	OrderQueryVariables,
	OrderStatusChangedSubscription,
	OrderStatusChangedSubscriptionVariables,
	ValidatePrescriptionMutation,
	ValidatePrescriptionMutationVariables,
	DispatchOrderMutation,
	DispatchOrderMutationVariables,
	CancelOrderMutation,
	CancelOrderMutationVariables,
} from "../../graphql/generated";

type UserError = ValidatePrescriptionMutation["validatePrescription"]["errors"][number];
type OrderStatusPayload = ValidatePrescriptionMutation["validatePrescription"];
import { money, fecha, iniciales } from "../../lib/format";
import { StatusChip } from "../../components/StatusChip";
import { ErrorList } from "../../components/Alert";
import { useState } from "react";

export function OrderDetailPage() {
	const { id = "" } = useParams();
	const [errors, setErrors] = useState<UserError[]>([]);

	const { data, loading } = useQuery<OrderQuery, OrderQueryVariables>(ORDER, {
		variables: { id },
		// La proyección puede no existir todavía cuando se llega aquí recién
		// emitido el pedido: se consulta a la red, no solo a la caché.
		fetchPolicy: "cache-and-network",
	});

	/**
	 * Aquí se cierra el círculo de la consistencia eventual.
	 *
	 * El servidor emite por WebSocket la proyección ya reconstruida. Como
	 * `Order` está normalizada por `id` en la caché, Apollo actualiza sola
	 * esta vista y la lista de pedidos: no hace falta refetch ni setState.
	 */
	const { data: live } = useSubscription<
		OrderStatusChangedSubscription,
		OrderStatusChangedSubscriptionVariables
	>(ORDER_STATUS_CHANGED, { variables: { orderId: id }, skip: !id });

	const order = live?.orderStatusChanged ?? data?.order ?? null;

	const opciones = {
		refetchQueries: [{ query: MY_ORDERS, variables: { limit: 20, offset: 0 } }],
	};
	const [validar, { loading: validando }] = useMutation<
		ValidatePrescriptionMutation,
		ValidatePrescriptionMutationVariables
	>(VALIDATE_PRESCRIPTION, opciones);
	const [despachar, { loading: despachando }] = useMutation<
		DispatchOrderMutation,
		DispatchOrderMutationVariables
	>(DISPATCH_ORDER, opciones);
	const [cancelar, { loading: cancelando }] = useMutation<
		CancelOrderMutation,
		CancelOrderMutationVariables
	>(CANCEL_ORDER, opciones);

	const ocupado = validando || despachando || cancelando;

	async function ejecutar(fn: typeof validar, clave: keyof {
		validatePrescription: unknown; dispatchOrder: unknown; cancelOrder: unknown;
	}) {
		setErrors([]);
		const { data } = await fn({ variables: { orderId: id } });
		const payload = (data as Record<string, OrderStatusPayload> | undefined)?.[clave];
		if (payload?.errors.length) setErrors(payload.errors);
	}

	if (loading && !order) {
		return (
			<div className="wrap" style={{ paddingTop: 30 }}>
				<div className="panel"><div className="skel" style={{ height: 180 }} /></div>
			</div>
		);
	}

	// La proyección aún no existe: es el desfase de la consistencia eventual,
	// no un error. El pedido YA fue aceptado por el modelo de escritura.
	if (!order) {
		return (
			<div className="wrap" style={{ maxWidth: 620, paddingTop: 40 }}>
				<div className="panel empty">
					<h3 className="pulse">Preparando tu pedido…</h3>
					<p>
						El comando fue aceptado y el inventario ya está reservado. La vista de
						consulta se está reconstruyendo y aparecerá aquí en un instante.
					</p>
					<Link to="/pedidos" className="btn btn-ghost">Ver mis pedidos</Link>
				</div>
			</div>
		);
	}

	const desfase = new Date(order.projectedAt).getTime() - new Date(order.placedAt).getTime();

	return (
		<div className="wrap" style={{ paddingTop: 30, maxWidth: 900 }}>
			<div className="crumbs">
				<Link to="/pedidos">Mis pedidos</Link> › {order.id.slice(0, 8)}
			</div>

			<ErrorList errors={errors} />

			<div className="panel" style={{ marginBottom: 16 }}>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
					<div>
						<StatusChip status={order.status} pulse={order.status === "PENDING_APPROVAL"} />
						<h1 style={{ fontSize: 22, margin: "12px 0 4px" }}>Pedido {order.id.slice(0, 8)}</h1>
						<div style={{ fontSize: 13, color: "var(--ink-faint)" }}>
							Emitido el {fecha(order.placedAt)} · {order.itemCount}{" "}
							{order.itemCount === 1 ? "ítem" : "ítems"}
						</div>
					</div>
					<div style={{ textAlign: "right" }}>
						<div style={{ fontSize: 12, color: "var(--ink-faint)" }}>Total</div>
						<div style={{ fontSize: 26, fontWeight: 800, color: "var(--green-800)" }}>
							{money(order.total)}
						</div>
					</div>
				</div>

				{order.pendingPrescriptions && (
					<div className="alert alert-warn" style={{ marginTop: 16, marginBottom: 0 }}>
						Hay fórmulas médicas esperando revisión farmacéutica. El pedido no avanza
						hasta que sean validadas.
					</div>
				)}
			</div>

			<div className="panel" style={{ marginBottom: 16 }}>
				<h3 style={{ margin: "0 0 12px", fontSize: 16 }}>Detalle</h3>
				{order.items.map((it) => (
					<div className="line-item" key={it.medicationId}>
						<span className="thumb">{iniciales(it.name)}</span>
						<div className="grow">
							<h4>{it.name}</h4>
							<div className="meta">
								{it.presentation} · {it.quantity} × {money(it.unitPrice)}
							</div>
						</div>
						<strong style={{ fontSize: 14 }}>{money(it.lineTotal)}</strong>
					</div>
				))}
			</div>

			<div className="panel" style={{ marginBottom: 16 }}>
				<h3 style={{ margin: "0 0 12px", fontSize: 16 }}>Acciones</h3>
				<div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
					<button
						className="btn btn-primary btn-sm"
						disabled={ocupado || order.status !== "PENDING_APPROVAL"}
						onClick={() => ejecutar(validar, "validatePrescription")}
					>
						Validar fórmula y aprobar
					</button>
					<button
						className="btn btn-ghost btn-sm"
						disabled={ocupado || order.status !== "APPROVED"}
						onClick={() => ejecutar(despachar as typeof validar, "dispatchOrder")}
					>
						Marcar como despachada
					</button>
					<button
						className="btn btn-danger btn-sm"
						disabled={ocupado || order.status === "DISPATCHED" || order.status === "CANCELLED"}
						onClick={() => ejecutar(cancelar as typeof validar, "cancelOrder")}
					>
						Cancelar pedido
					</button>
				</div>
				<p style={{ fontSize: 12, color: "var(--ink-faint)", margin: "12px 0 0" }}>
					Los botones se habilitan según la máquina de estados del servidor. Intentar una
					transición ilegal devuelve un <code>UserError</code> con código <code>CONFLICT</code>.
				</p>
			</div>

			<div className="alert alert-info">
				<strong>Consistencia eventual.</strong> Esta vista se sirve desde{" "}
				<code>read_model.order_projections</code>, no desde las tablas transaccionales.
				Proyectada el {fecha(order.projectedAt)}, {desfase} ms después de emitirse el
				comando. Los cambios de estado llegan por GraphQL Subscription.
			</div>
		</div>
	);
}
