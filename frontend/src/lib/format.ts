const COP = new Intl.NumberFormat("es-CO", {
	style: "currency",
	currency: "COP",
	maximumFractionDigits: 0,
});

export const money = (value: number | string) => COP.format(Number(value));

export const fecha = (iso: string) =>
	new Intl.DateTimeFormat("es-CO", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(iso));

export const iniciales = (nombre: string) =>
	nombre
		.split(" ")
		.slice(0, 2)
		.map((p) => p[0])
		.join("")
		.toUpperCase();

export const ESTADOS: Record<string, string> = {
	PENDING_APPROVAL: "Pendiente de aprobación",
	APPROVED: "Aprobada",
	DISPATCHED: "Despachada",
	CANCELLED: "Cancelada",
};
