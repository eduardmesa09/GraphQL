export function CardSkeleton() {
	return (
		<div className="card">
			<div className="skel" style={{ height: 126 }} />
			<div className="skel" style={{ height: 14, width: "85%" }} />
			<div className="skel" style={{ height: 12, width: "60%" }} />
			<div className="skel" style={{ height: 20, width: "45%" }} />
			<div className="skel" style={{ height: 34 }} />
		</div>
	);
}

export function GridSkeleton({ count = 12 }: { count?: number }) {
	return (
		<div className="grid">
			{Array.from({ length: count }, (_, i) => <CardSkeleton key={i} />)}
		</div>
	);
}
