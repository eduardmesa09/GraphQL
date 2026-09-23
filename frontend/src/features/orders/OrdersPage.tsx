import { Link } from "react-router-dom";
import { openAuth } from "../auth/authState";
import { useQuery } from "@apollo/client/react";
import { MY_ORDERS } from "../../graphql/operations";
import type { MyOrdersQuery, MyOrdersQueryVariables } from "../../graphql/generated";
import { money, fecha } from "../../lib/format";
import { StatusChip } from "../../components/StatusChip";
import { useAuth } from "../auth/useAuth";
import { Arrow } from "../../components/icons";

export function OrdersPage() {
	const { patient } = useAuth();

	const { data, loading, error } = useQuery<MyOrdersQuery, MyOrdersQueryVariables>(MY_ORDERS, {
		variables: { limit: 20, offset: 0 },
		skip: !patient,
	});

	if (!patient) {
		return (
			<div className="wrap" style={{ maxWidth: 560, paddingTop: 40 }}>
				<div className="panel empty">
					<h3>Inicia sesión</h3>
					<p>Necesitas una cuenta para ver tus pedidos.</p>
					<button className="btn btn-primary" onClick={() => openAuth("login")}>Ingresar</button>
				</div>
			</div>
		);
	}

	const page = data?.myOrders;

	return (
		<div className="wrap" style={{ paddingTop: 30, maxWidth: 900 }}>
			<div className="section-head">
				<div>
					<h2>Mis pedidos</h2>
					<p>
						{loading && !page
							? "Consultando el modelo de lectura…"
							: `${page?.totalCount ?? 0} pedidos registrados`}
					</p>
				</div>
			</div>

			{error && <div className="alert alert-error">{error.message}</div>}

			{loading && !page ? (
				<>
					<div className="skel" style={{ height: 74, borderRadius: 14, marginBottom: 11 }} />
					<div className="skel" style={{ height: 74, borderRadius: 14 }} />
				</>
			) : page && page.items.length > 0 ? (
				page.items.map((o) => (
					<Link to={`/pedido/${o.id}`} key={o.id} className="order-row">
						<StatusChip status={o.status} pulse={o.status === "PENDING_APPROVAL"} />
						<div style={{ flex: 1, minWidth: 180 }}>
							<div className="id">{o.id.slice(0, 8)}</div>
							<div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
								{fecha(o.placedAt)} · {o.itemCount} {o.itemCount === 1 ? "ítem" : "ítems"}
							</div>
						</div>
						<strong style={{ fontSize: 16 }}>{money(o.total)}</strong>
						<Arrow />
					</Link>
				))
			) : (
				<div className="empty">
					<h3>Todavía no tienes pedidos</h3>
					<p>Cuando emitas uno aparecerá aquí.</p>
					<Link to="/" className="btn btn-primary">Ir al catálogo</Link>
				</div>
			)}
		</div>
	);
}
