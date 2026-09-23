import { useSearchParams } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { SEARCH_MEDICATIONS } from "../../graphql/operations";
import type {
	SearchMedicationsQuery,
	SearchMedicationsQueryVariables,
} from "../../graphql/generated";
import { MedicationCard } from "./MedicationCard";
import { GridSkeleton } from "../../components/Skeleton";
import { Truck, Shield, Lock, Phone, FileText, Arrow } from "../../components/icons";

const PAGINA = 12;

function Hero() {
	return (
		<section className="hero">
			<div className="wrap">
				<div>
					<h1>
						Más salud,
						<em>mejor vida.</em>
					</h1>
					<p>
						Medicamentos originales, atención confiable y productos de bienestar
						entregados de forma segura en la puerta de tu casa.
					</p>

					<div className="hero-badges">
						<div className="hero-badge">
							<Shield size={17} />
							<span><strong>100 % originales</strong><small>Laboratorios verificados</small></span>
						</div>
						<div className="hero-badge">
							<Truck size={17} />
							<span><strong>Entrega rápida</strong><small>En tu domicilio</small></span>
						</div>
						<div className="hero-badge">
							<Lock size={17} />
							<span><strong>Pagos seguros</strong><small>Transacciones cifradas</small></span>
						</div>
					</div>

					<div className="hero-cta">
						<a href="#catalogo" className="btn btn-primary">
							Ver medicamentos <Arrow />
						</a>
					</div>
				</div>

				<div className="hero-art">
					<div className="hero-disc">
						<span>
							HASTA<b>20%</b>DCTO
						</span>
					</div>
					<div style={{ fontSize: 88, color: "var(--green-700)", opacity: .22 }}>
						<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
							<path d="M9.5 3h5v6.5H21v5h-6.5V21h-5v-6.5H3v-5h6.5V3Z" />
						</svg>
					</div>
				</div>
			</div>
		</section>
	);
}

function Perks() {
	const items = [
		{ icon: <Truck size={18} />, t: "Envío gratis", s: "En pedidos sobre $80.000" },
		{ icon: <Shield size={18} />, t: "Originales", s: "100 % verificados" },
		{ icon: <Lock size={18} />, t: "Pago seguro", s: "Transacciones cifradas" },
		{ icon: <FileText size={18} />, t: "Fórmula médica", s: "Validación en línea" },
		{ icon: <Phone size={18} />, t: "Soporte 24/7", s: "Siempre disponibles" },
	];

	return (
		<div className="perks">
			{items.map((p) => (
				<div className="perk" key={p.t}>
					<span className="perk-icon">{p.icon}</span>
					<span><strong>{p.t}</strong><small>{p.s}</small></span>
				</div>
			))}
		</div>
	);
}

export function CatalogPage() {
	const [params] = useSearchParams();
	const search = params.get("q");
	const categoryId = params.get("cat");

	const filter = {
		...(search ? { search } : {}),
		...(categoryId ? { categoryId } : {}),
	};

	/**
	 * `loading`, `error` y `data` son los tres estados que expone useQuery.
	 * `fetchMore` reutiliza la misma query con otro offset; el `merge` de
	 * typePolicies concatena las páginas en la caché.
	 */
	const { data, loading, error, fetchMore } = useQuery<
		SearchMedicationsQuery,
		SearchMedicationsQueryVariables
	>(SEARCH_MEDICATIONS, { variables: { filter, limit: PAGINA, offset: 0 } });

	const page = data?.medications;
	const filtrando = Boolean(search || categoryId);

	return (
		<>
			{!filtrando && <Hero />}

			<div className="wrap">
				{!filtrando && <Perks />}

				<div className="section-head" id="catalogo">
					<div>
						<h2>{filtrando ? "Resultados de búsqueda" : "Catálogo de medicamentos"}</h2>
						<p>
							{loading && !page
								? "Consultando el catálogo…"
								: `${page?.totalCount ?? 0} medicamentos${search ? ` para "${search}"` : ""}`}
						</p>
					</div>
				</div>

				{error && (
					<div className="alert alert-error">
						No se pudo cargar el catálogo: {error.message}
					</div>
				)}

				{loading && !page ? (
					<GridSkeleton count={PAGINA} />
				) : page && page.items.length > 0 ? (
					<>
						<div className="grid">
							{page.items.map((m) => <MedicationCard key={m.id} med={m} />)}
						</div>

						{page.hasMore && (
							<div style={{ textAlign: "center", margin: "26px 0" }}>
								<button
									className="btn btn-ghost"
									disabled={loading}
									onClick={() =>
										fetchMore({ variables: { offset: page.items.length } })
									}
								>
									{loading ? "Cargando…" : "Cargar más medicamentos"}
								</button>
							</div>
						)}
					</>
				) : (
					<div className="empty">
						<h3>Sin resultados</h3>
						<p>No encontramos medicamentos que coincidan con la búsqueda.</p>
					</div>
				)}
			</div>
		</>
	);
}
