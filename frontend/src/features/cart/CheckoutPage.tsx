import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { openAuth } from "../auth/authState";
import { useMutation, useReactiveVar } from "@apollo/client/react";
import { PLACE_ORDER, MY_ORDERS } from "../../graphql/operations";
import type {
	PlaceOrderMutation,
	PlaceOrderMutationVariables,
} from "../../graphql/generated";

type UserError = PlaceOrderMutation["placeOrder"]["errors"][number];
import { cartVar, cartTotal, clearCart, requiresRx } from "./cartVar";
import { money, iniciales } from "../../lib/format";
import { useAuth } from "../auth/useAuth";
import { ErrorList } from "../../components/Alert";
import { FileText, Arrow } from "../../components/icons";

interface RxForm {
	doctorName: string;
	doctorLicense: string;
	issuedAt: string;
	documentUrl: string;
}

const vacio: RxForm = { doctorName: "", doctorLicense: "", issuedAt: "", documentUrl: "" };

export function CheckoutPage() {
	const lines = useReactiveVar(cartVar);
	const { patient } = useAuth();
	const navigate = useNavigate();

	const conReceta = requiresRx(lines);
	const [rx, setRx] = useState<Record<string, RxForm>>({});
	const [errors, setErrors] = useState<UserError[]>([]);

	const [enviar, { loading }] = useMutation<
		PlaceOrderMutation,
		PlaceOrderMutationVariables
	>(PLACE_ORDER, {
		// La lista de pedidos vive en el modelo de lectura y acaba de quedar
		// obsoleta. Apollo la vuelve a pedir tras la mutación.
		refetchQueries: [{ query: MY_ORDERS, variables: { limit: 20, offset: 0 } }],
	});

	function campo(id: string, key: keyof RxForm, value: string) {
		setRx((prev) => ({ ...prev, [id]: { ...(prev[id] ?? vacio), [key]: value } }));
	}

	async function confirmar() {
		setErrors([]);

		const { data } = await enviar({
			variables: {
				input: {
					items: lines.map((l) => ({ medicationId: l.medicationId, quantity: l.quantity })),
					prescriptions: conReceta.map((l) => ({
						medicationId: l.medicationId,
						doctorName: rx[l.medicationId]?.doctorName ?? "",
						doctorLicense: rx[l.medicationId]?.doctorLicense ?? "",
						issuedAt: rx[l.medicationId]?.issuedAt ?? "",
						documentUrl: rx[l.medicationId]?.documentUrl || null,
					})),
				},
			},
		});

		const payload = data?.placeOrder;
		if (!payload) return;

		// Errores de negocio: llegan como DATOS tipados dentro del payload,
		// no como excepción. `data` viene poblado igualmente.
		if (payload.errors.length > 0) {
			setErrors(payload.errors);
			return;
		}

		clearCart();
		navigate(`/pedido/${payload.orderId}`);
	}

	if (!patient) {
		return (
			<div className="wrap" style={{ maxWidth: 560, paddingTop: 40 }}>
				<div className="panel empty">
					<h3>Inicia sesión para continuar</h3>
					<p>Necesitas una cuenta para emitir un pedido.</p>
					<button className="btn btn-primary" onClick={() => openAuth("login")}>Ingresar</button>
				</div>
			</div>
		);
	}

	if (lines.length === 0) {
		return (
			<div className="wrap" style={{ maxWidth: 560, paddingTop: 40 }}>
				<div className="panel empty">
					<h3>El carrito está vacío</h3>
					<p>Agrega medicamentos antes de confirmar un pedido.</p>
					<Link to="/" className="btn btn-primary">Ir al catálogo</Link>
				</div>
			</div>
		);
	}

	const total = cartTotal(lines);
	const rxCompletas = conReceta.every((l) => {
		const f = rx[l.medicationId];
		return f?.doctorName.trim() && f?.doctorLicense.trim() && f?.issuedAt;
	});

	return (
		<div className="wrap" style={{ paddingTop: 30 }}>
			<div className="section-head">
				<div>
					<h2>Confirmar pedido</h2>
					<p>Revisa los ítems y completa las fórmulas médicas requeridas.</p>
				</div>
			</div>

			<div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 26, alignItems: "start" }}>
				<div style={{ display: "grid", gap: 16 }}>
					<ErrorList errors={errors} />

					<div className="panel">
						<h3 style={{ margin: "0 0 14px", fontSize: 16 }}>Medicamentos</h3>
						{lines.map((l) => (
							<div className="line-item" key={l.medicationId}>
								<span className="thumb">{iniciales(l.name)}</span>
								<div className="grow">
									<h4>{l.name}</h4>
									<div className="meta">
										{l.presentation} · {l.quantity} × {money(l.price)}
									</div>
								</div>
								<strong style={{ fontSize: 14 }}>{money(l.price * l.quantity)}</strong>
							</div>
						))}
					</div>

					{conReceta.length > 0 && (
						<div className="panel">
							<h3 style={{ margin: "0 0 6px", fontSize: 16 }}>
								<FileText /> Fórmulas médicas
							</h3>
							<p style={{ fontSize: 13, color: "var(--ink-faint)", margin: "0 0 18px" }}>
								Estos medicamentos son de venta bajo prescripción. Sin estos datos el
								servidor rechaza el pedido con el código <code>PRESCRIPTION_REQUIRED</code>.
							</p>

							{conReceta.map((l) => (
								<div key={l.medicationId} style={{ borderTop: "1px solid var(--line)", paddingTop: 16, marginTop: 16 }}>
									<strong style={{ fontSize: 14 }}>{l.name}</strong>
									<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
										<div className="field">
											<label>Médico que prescribe</label>
											<input
												value={rx[l.medicationId]?.doctorName ?? ""}
												onChange={(e) => campo(l.medicationId, "doctorName", e.target.value)}
												placeholder="Dra. Ana Ruiz"
											/>
										</div>
										<div className="field">
											<label>Registro médico</label>
											<input
												value={rx[l.medicationId]?.doctorLicense ?? ""}
												onChange={(e) => campo(l.medicationId, "doctorLicense", e.target.value)}
												placeholder="RM-12345"
											/>
										</div>
										<div className="field">
											<label>Fecha de expedición</label>
											<input
												type="date"
												max={new Date().toISOString().slice(0, 10)}
												value={rx[l.medicationId]?.issuedAt ?? ""}
												onChange={(e) => campo(l.medicationId, "issuedAt", e.target.value)}
											/>
										</div>
										<div className="field">
											<label>Enlace del soporte <span style={{ fontWeight: 400 }}>(opcional)</span></label>
											<input
												value={rx[l.medicationId]?.documentUrl ?? ""}
												onChange={(e) => campo(l.medicationId, "documentUrl", e.target.value)}
												placeholder="https://…"
											/>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				<div className="panel" style={{ position: "sticky", top: 20 }}>
					<h3 style={{ margin: "0 0 16px", fontSize: 16 }}>Resumen</h3>
					<div style={{ display: "grid", gap: 9, marginBottom: 16 }}>
						<div className="total-row"><span>Subtotal</span><span>{money(total)}</span></div>
						<div className="total-row"><span>Envío</span><span>{total >= 80000 ? "Gratis" : money(8000)}</span></div>
						<div className="total-row big" style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
							<span>Total</span><span>{money(total >= 80000 ? total : total + 8000)}</span>
						</div>
					</div>

					<button
						className="btn btn-primary btn-block"
						disabled={loading || !rxCompletas}
						onClick={confirmar}
					>
						{loading ? "Procesando…" : <>Emitir pedido <Arrow /></>}
					</button>

					{!rxCompletas && (
						<p style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 10, textAlign: "center" }}>
							Completa las fórmulas médicas para continuar.
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
