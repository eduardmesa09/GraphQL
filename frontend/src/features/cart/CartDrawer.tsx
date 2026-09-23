import { useNavigate } from "react-router-dom";
import { useReactiveVar } from "@apollo/client/react";
import {
	cartVar, cartTotal, cartCount, setQuantity, removeFromCart, requiresRx,
} from "./cartVar";
import { money, iniciales } from "../../lib/format";
import { Cross, Minus, Plus, Trash, Arrow, FileText } from "../../components/icons";

export function CartDrawer({ onClose }: { onClose: () => void }) {
	const lines = useReactiveVar(cartVar);
	const navigate = useNavigate();
	const total = cartTotal(lines);
	const conReceta = requiresRx(lines);

	function irACheckout() {
		onClose();
		navigate("/checkout");
	}

	return (
		<>
			<div className="overlay" onClick={onClose} />
			<aside className="drawer" role="dialog" aria-label="Carrito de compras">
				<div className="drawer-head">
					<h2>Tu carrito ({cartCount(lines)})</h2>
					<button className="icon-btn" onClick={onClose} aria-label="Cerrar"><Cross /></button>
				</div>

				<div className="drawer-body">
					{lines.length === 0 ? (
						<div className="empty">
							<h3>El carrito está vacío</h3>
							<p>Agrega medicamentos desde el catálogo.</p>
							<button className="btn btn-primary" onClick={onClose}>Seguir comprando</button>
						</div>
					) : (
						<>
							{conReceta.length > 0 && (
								<div className="alert alert-warn">
									<FileText /> {conReceta.length}{" "}
									{conReceta.length === 1 ? "medicamento requiere" : "medicamentos requieren"}{" "}
									fórmula médica. La pedirá el paso siguiente.
								</div>
							)}

							{lines.map((l) => (
								<div className="line-item" key={l.medicationId}>
									<span className="thumb">{iniciales(l.name)}</span>

									<div className="grow">
										<h4>{l.name}</h4>
										<div className="meta">{l.presentation}</div>
										<div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
											<div className="qty">
												<button
													onClick={() => setQuantity(l.medicationId, l.quantity - 1)}
													aria-label="Quitar uno"
												><Minus /></button>
												<span>{l.quantity}</span>
												<button
													onClick={() => setQuantity(l.medicationId, l.quantity + 1)}
													disabled={l.quantity >= l.stock}
													aria-label="Agregar uno"
												><Plus /></button>
											</div>
											<button
												className="icon-btn"
												onClick={() => removeFromCart(l.medicationId)}
												aria-label="Eliminar del carrito"
											><Trash /></button>
										</div>
									</div>

									<strong style={{ fontSize: 14, whiteSpace: "nowrap" }}>
										{money(l.price * l.quantity)}
									</strong>
								</div>
							))}
						</>
					)}
				</div>

				{lines.length > 0 && (
					<div className="drawer-foot">
						<div className="total-row"><span>Subtotal</span><span>{money(total)}</span></div>
						<div className="total-row"><span>Envío</span><span>{total >= 80000 ? "Gratis" : money(8000)}</span></div>
						<div className="total-row big">
							<span>Total</span>
							<span>{money(total >= 80000 ? total : total + 8000)}</span>
						</div>
						<button className="btn btn-primary btn-block" onClick={irACheckout}>
							Continuar al pedido <Arrow />
						</button>
					</div>
				)}
			</aside>
		</>
	);
}
