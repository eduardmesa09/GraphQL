import { Link } from "react-router-dom";
import type { MedicationCardFragment } from "../../graphql/generated";
import { money, iniciales } from "../../lib/format";
import { useAddFeedback } from "../cart/useAddFeedback";
import { Cart, Check } from "../../components/icons";

export function MedicationCard({ med }: { med: MedicationCardFragment }) {
	const agotado = med.stock <= 0;
	const { agregado, agregar } = useAddFeedback();

	return (
		<article className="card">
			<Link to={`/medicamento/${med.id}`} className="card-art">
				{med.requiresPrescription ? (
					<span className="tag tag-rx">Con fórmula</span>
				) : (
					<span className="tag tag-otc">Venta libre</span>
				)}
				{iniciales(med.name)}
			</Link>

			<Link to={`/medicamento/${med.id}`}>
				<h3>{med.name}</h3>
			</Link>

			<div className="meta">
				{med.category.name}
				<br />
				{med.presentation}
			</div>

			<div className="card-foot">
				<div className="price">
					{money(med.price)}{" "}
					<small>{agotado ? "· agotado" : `· ${med.stock} disp.`}</small>
				</div>

				<button
					className={`btn btn-sm btn-block ${agregado ? "btn-added" : "btn-primary"}`}
					disabled={agotado}
					onClick={() => agregar(med)}
				>
					{agregado ? (
						<><Check size={15} /> Agregado</>
					) : (
						<><Cart size={15} /> {agotado ? "Sin stock" : "Agregar"}</>
					)}
				</button>
			</div>
		</article>
	);
}
