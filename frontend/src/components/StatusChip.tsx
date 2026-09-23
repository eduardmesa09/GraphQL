import { ESTADOS } from "../lib/format";

export function StatusChip({ status, pulse }: { status: string; pulse?: boolean }) {
	return (
		<span className={`chip chip-${status} ${pulse ? "pulse" : ""}`}>
			{ESTADOS[status] ?? status}
		</span>
	);
}
