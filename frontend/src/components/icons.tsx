interface Props {
	size?: number;
	strokeWidth?: number;
}

const base = (size: number, strokeWidth: number) => ({
	width: size,
	height: size,
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	strokeWidth,
	strokeLinecap: "round" as const,
	strokeLinejoin: "round" as const,
	"aria-hidden": true,
});

export const Truck = ({ size = 15, strokeWidth = 2 }: Props) => (
	<svg {...base(size, strokeWidth)}>
		<path d="M14 18V6H3v12h11Zm0-9h4l3 3v6h-7" />
		<circle cx="7" cy="18" r="2" />
		<circle cx="17" cy="18" r="2" />
	</svg>
);

export const Shield = ({ size = 15, strokeWidth = 2 }: Props) => (
	<svg {...base(size, strokeWidth)}>
		<path d="M12 3 4 6v6c0 4.5 3.2 8.3 8 9 4.8-.7 8-4.5 8-9V6l-8-3Z" />
		<path d="m9 12 2 2 4-4" />
	</svg>
);

export const Lock = ({ size = 15, strokeWidth = 2 }: Props) => (
	<svg {...base(size, strokeWidth)}>
		<rect x="4" y="10" width="16" height="11" rx="2" />
		<path d="M8 10V7a4 4 0 0 1 8 0v3" />
	</svg>
);

export const Phone = ({ size = 15, strokeWidth = 2 }: Props) => (
	<svg {...base(size, strokeWidth)}>
		<path d="M5 3h4l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2Z" />
	</svg>
);

export const FileText = ({ size = 15, strokeWidth = 2 }: Props) => (
	<svg {...base(size, strokeWidth)}>
		<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
		<path d="M14 3v5h5M9 13h6M9 17h6" />
	</svg>
);

export const Search = ({ size = 18, strokeWidth = 2 }: Props) => (
	<svg {...base(size, strokeWidth)}>
		<circle cx="11" cy="11" r="7" />
		<path d="m20 20-3.5-3.5" />
	</svg>
);

export const User = ({ size = 21, strokeWidth = 1.8 }: Props) => (
	<svg {...base(size, strokeWidth)}>
		<circle cx="12" cy="8" r="4" />
		<path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
	</svg>
);

export const Cart = ({ size = 21, strokeWidth = 1.8 }: Props) => (
	<svg {...base(size, strokeWidth)}>
		<path d="M3 4h2l2.5 11h10L20 7H6" />
		<circle cx="9" cy="19" r="1.6" />
		<circle cx="17" cy="19" r="1.6" />
	</svg>
);

export const Cross = ({ size = 19, strokeWidth = 2 }: Props) => (
	<svg {...base(size, strokeWidth)}>
		<path d="M6 6l12 12M18 6 6 18" />
	</svg>
);

export const Plus = ({ size = 15, strokeWidth = 2.2 }: Props) => (
	<svg {...base(size, strokeWidth)}>
		<path d="M12 5v14M5 12h14" />
	</svg>
);

export const Minus = ({ size = 15, strokeWidth = 2.2 }: Props) => (
	<svg {...base(size, strokeWidth)}>
		<path d="M5 12h14" />
	</svg>
);

export const Arrow = ({ size = 15, strokeWidth = 2 }: Props) => (
	<svg {...base(size, strokeWidth)}>
		<path d="M5 12h14M13 6l6 6-6 6" />
	</svg>
);

export const Trash = ({ size = 15, strokeWidth = 2 }: Props) => (
	<svg {...base(size, strokeWidth)}>
		<path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
	</svg>
);

/** Cruz farmacéutica del logotipo. */
export const PharmaCross = ({ size = 22, strokeWidth = 0 }: Props) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" strokeWidth={strokeWidth} aria-hidden>
		<path d="M9.5 3h5v6.5H21v5h-6.5V21h-5v-6.5H3v-5h6.5V3Z" />
	</svg>
);

export const Check = ({ size = 15, strokeWidth = 2.6 }: Props) => (
	<svg {...base(size, strokeWidth)}>
		<path d="m5 12.5 4.5 4.5L19 7" />
	</svg>
);

export const ChevronDown = ({ size = 15, strokeWidth = 2 }: Props) => (
	<svg {...base(size, strokeWidth)}>
		<path d="m6 9 6 6 6-6" />
	</svg>
);

export const Box = ({ size = 16, strokeWidth = 1.9 }: Props) => (
	<svg {...base(size, strokeWidth)}>
		<path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
		<path d="M3 8l9 5 9-5M12 13v8" />
	</svg>
);

export const SignOut = ({ size = 16, strokeWidth = 1.9 }: Props) => (
	<svg {...base(size, strokeWidth)}>
		<path d="M10 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
		<path d="M17 16l4-4-4-4M21 12H10" />
	</svg>
);
