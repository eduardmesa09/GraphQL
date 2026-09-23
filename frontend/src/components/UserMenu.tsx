import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/useAuth";
import { openAuth } from "../features/auth/authState";
import { User, ChevronDown, Box, SignOut } from "./icons";

export function UserMenu() {
	const { patient, signOut } = useAuth();
	const [abierto, setAbierto] = useState(false);
	const caja = useRef<HTMLDivElement>(null);

	// Cerrar al pulsar fuera o con Escape.
	useEffect(() => {
		if (!abierto) return;

		const fuera = (e: MouseEvent) => {
			if (!caja.current?.contains(e.target as Node)) setAbierto(false);
		};
		const tecla = (e: KeyboardEvent) => {
			if (e.key === "Escape") setAbierto(false);
		};

		document.addEventListener("mousedown", fuera);
		document.addEventListener("keydown", tecla);
		return () => {
			document.removeEventListener("mousedown", fuera);
			document.removeEventListener("keydown", tecla);
		};
	}, [abierto]);

	if (!patient) {
		return (
			<button className="header-action" onClick={() => openAuth("login")}>
				<User />
				<span className="txt">
					<small>Ingresar</small>
					<strong>Mi cuenta</strong>
				</span>
			</button>
		);
	}

	return (
		<div className="user-menu" ref={caja}>
			<button
				className="header-action"
				onClick={() => setAbierto((v) => !v)}
				aria-haspopup="menu"
				aria-expanded={abierto}
			>
				<User />
				<span className="txt">
					<small>Hola,</small>
					<strong>{patient.fullName.split(" ")[0]}</strong>
				</span>
				<ChevronDown size={14} />
			</button>

			{abierto && (
				<div className="menu" role="menu">
					<div className="menu-head">
						<strong>{patient.fullName}</strong>
						<small>{patient.email}</small>
					</div>

					<Link to="/pedidos" role="menuitem" onClick={() => setAbierto(false)}>
						<Box /> Mis pedidos
					</Link>

					<hr />

					<button
						role="menuitem"
						className="danger"
						onClick={() => {
							setAbierto(false);
							// Limpia el token y vacía la caché de Apollo: si no, los
							// pedidos del usuario anterior seguirían visibles.
							void signOut();
						}}
					>
						<SignOut /> Cerrar sesión
					</button>
				</div>
			)}
		</div>
	);
}
