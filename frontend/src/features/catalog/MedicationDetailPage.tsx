import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { MEDICATION_DETAIL } from "../../graphql/operations";
import type {
	MedicationDetailQuery,
	MedicationDetailQueryVariables,
} from "../../graphql/generated";
import { money, iniciales } from "../../lib/format";
import { useAddFeedback } from "../cart/useAddFeedback";
import { Cart, Check, Minus, Plus, FileText } from "../../components/icons";

export function MedicationDetailPage() {
	const { id = "" } = useParams();
	const [cantidad, setCantidad] = useState(1);
	const { agregado, agregar } = useAddFeedback();

	/**
	 * Esta query pide TODOS los campos clínicos; la del listado pide cuatro.
	 * Mismo tipo `Medication` en el schema, dos formas distintas en la red:
	 * eso es la selección selectiva de campos contra el over-fetching.
	 */
	const { data, loading, error } = useQuery<
		MedicationDetailQuery,
		MedicationDetailQueryVariables
	>(MEDICATION_DETAIL, { variables: { id } });

	if (loading) {
		return (
			<div className="wrap" style={{ paddingTop: 30 }}>
				<div className="detail">
					<div className="skel" style={{ height: 330, borderRadius: 14 }} />
					<div>
						<div className="skel" style={{ height: 30, width: "70%", marginBottom: 14 }} />
						<div className="skel" style={{ height: 16, width: "40%", marginBottom: 26 }} />
						<div className="skel" style={{ height: 120 }} />
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return <div className="wrap"><div className="alert alert-error">{error.message}</div></div>;
	}

	// `medication` es nulable en el schema a propósito: un id inexistente no
	// es un error, es una respuesta legítima.
	if (!data?.medication) {
		return (
			<div className="wrap">
				<div className="empty">
					<h3>Medicamento no encontrado</h3>
					<p>El producto que buscas no existe en el catálogo.</p>
					<Link to="/" className="btn btn-primary">Volver al catálogo</Link>
				</div>
			</div>
		);
	}

	const med = data.medication;
	const agotado = med.stock <= 0;

	return (
		<div className="wrap">
			<div className="crumbs">
				<Link to="/">Catálogo</Link> › <Link to={`/?cat=${med.category.id}`}>{med.category.name}</Link> › {med.name}
			</div>

			<div className="detail">
				<div className="detail-art">{iniciales(med.name)}</div>

				<div>
					{med.requiresPrescription ? (
						<span className="tag tag-rx" style={{ position: "static" }}>Requiere fórmula médica</span>
					) : (
						<span className="tag tag-otc" style={{ position: "static" }}>Venta libre</span>
					)}

					<h1>{med.name}</h1>
					<p style={{ color: "var(--ink-soft)", margin: "0 0 18px", lineHeight: 1.65 }}>
						{med.description ?? "Sin descripción disponible."}
					</p>

					<div style={{ fontSize: 30, fontWeight: 800, color: "var(--green-800)" }}>
						{money(med.price)}
					</div>

					<dl className="spec">
						<dt>Principio activo</dt><dd>{med.activeIngredient}</dd>
						<dt>Concentración</dt><dd>{med.dosage}</dd>
						<dt>Presentación</dt><dd>{med.presentation}</dd>
						<dt>Laboratorio</dt><dd>{med.laboratory?.name}</dd>
						<dt>Categoría</dt><dd>{med.category.name}</dd>
						<dt>SKU</dt><dd>{med.sku}</dd>
						<dt>Disponibilidad</dt>
						<dd>{agotado ? "Agotado" : `${med.stock} unidades`}</dd>
					</dl>

					{med.requiresPrescription && (
						<div className="alert alert-warn">
							<FileText /> <strong>Venta bajo fórmula médica.</strong> Deberás adjuntar
							los datos de la prescripción al confirmar el pedido; sin ese soporte el
							comando de compra será rechazado por el servidor.
						</div>
					)}

					<div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 20 }}>
						<div className="qty">
							<button onClick={() => setCantidad((q) => Math.max(1, q - 1))} disabled={cantidad <= 1}>
								<Minus />
							</button>
							<span>{cantidad}</span>
							<button onClick={() => setCantidad((q) => Math.min(med.stock, q + 1))} disabled={cantidad >= med.stock}>
								<Plus />
							</button>
						</div>

						<button
							className={`btn ${agregado ? "btn-added" : "btn-primary"}`}
							disabled={agotado}
							onClick={() => agregar(med, cantidad)}
						>
							{agregado ? (
								<><Check size={16} /> Agregado al carrito</>
							) : (
								<><Cart size={16} /> {agotado ? "Sin stock" : "Agregar al carrito"}</>
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
