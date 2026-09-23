import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useReactiveVar } from "@apollo/client/react";
import { CATEGORIES } from "../graphql/operations";
import type { CategoriesQuery } from "../graphql/generated";
import { cartVar, cartCount } from "../features/cart/cartVar";
import { CartDrawer } from "../features/cart/CartDrawer";
import { AuthModal } from "../features/auth/AuthModal";
import { UserMenu } from "./UserMenu";
import {
	Truck, Shield, Lock, Phone, FileText,
	Search, Cart, PharmaCross,
} from "./icons";

function TopBar() {
	return (
		<div className="topbar">
			<div className="wrap">
				<span><Truck /> Envío gratis en pedidos sobre $80.000</span>
				<span><Shield /> 100 % medicamentos originales</span>
				<span><Lock /> Pagos seguros</span>
				<span><Phone /> Soporte 24/7</span>
				<span><FileText /> Compra con fórmula médica</span>
			</div>
		</div>
	);
}

function Header({ onOpenCart }: { onOpenCart: () => void }) {
	const [params, setParams] = useSearchParams();
	const [texto, setTexto] = useState(params.get("q") ?? "");
	const navigate = useNavigate();
	const lines = useReactiveVar(cartVar);
	const count = cartCount(lines);

	// Rebote del contador cuando entra algo nuevo al carrito: refuerza la
	// confirmación del botón sin robarle el foco al usuario.
	const [bump, setBump] = useState(false);
	const previo = useRef(count);

	useEffect(() => {
		if (count > previo.current) {
			setBump(true);
			const t = setTimeout(() => setBump(false), 460);
			previo.current = count;
			return () => clearTimeout(t);
		}
		previo.current = count;
	}, [count]);

	function buscar(e: React.FormEvent) {
		e.preventDefault();
		const next = new URLSearchParams(params);
		if (texto.trim()) next.set("q", texto.trim());
		else next.delete("q");
		next.delete("cat");
		setParams(next);
		navigate({ pathname: "/", search: next.toString() });
	}

	return (
		<header className="header">
			<div className="wrap">
				<Link to="/" className="logo">
					<span className="logo-mark"><PharmaCross /></span>
					<span className="logo-text">
						<strong>Afirmative Pill</strong>
						<small>FARMACIA</small>
					</span>
				</Link>

				<form className="search" onSubmit={buscar} role="search">
					<input
						value={texto}
						onChange={(e) => setTexto(e.target.value)}
						placeholder="Buscar por nombre, principio activo o categoría…"
						aria-label="Buscar medicamentos"
					/>
					<button type="submit" aria-label="Buscar"><Search /></button>
				</form>

				<div className="header-actions">
					<UserMenu />

					<button className="header-action cart-btn" onClick={onOpenCart} aria-label="Abrir carrito">
						<Cart />
						<span className="txt">
							<small>Carrito</small>
							<strong>{count} {count === 1 ? "ítem" : "ítems"}</strong>
						</span>
						{count > 0 && <span className="cart-badge" data-bump={bump}>{count}</span>}
					</button>
				</div>
			</div>
		</header>
	);
}

function CategoryNav() {
	const { data } = useQuery<CategoriesQuery>(CATEGORIES);
	const [params, setParams] = useSearchParams();
	const navigate = useNavigate();
	const activa = params.get("cat");

	function elegir(id: string | null) {
		const next = new URLSearchParams(params);
		if (id) next.set("cat", id);
		else next.delete("cat");
		next.delete("q");
		setParams(next);
		navigate({ pathname: "/", search: next.toString() });
	}

	return (
		<nav className="catnav">
			<div className="wrap">
				<button data-active={!activa} onClick={() => elegir(null)}>Todas</button>
				{data?.categories.map((c) => (
					<button key={c.id} data-active={activa === c.id} onClick={() => elegir(c.id)}>
						{c.name}
					</button>
				))}
			</div>
		</nav>
	);
}

function Footer() {
	return (
		<>
			<footer className="footer">
				<div className="wrap">
					<div>
						<Link to="/" className="logo">
							<span className="logo-mark"><PharmaCross /></span>
							<span className="logo-text">
								<strong style={{ color: "#fff" }}>Afirmative Pill</strong>
								<small>FARMACIA</small>
							</span>
						</Link>
						<p>
							Plataforma de distribución y venta minorista de medicamentos en línea.
							Conectamos pacientes, farmacias aliadas y entidades promotoras de salud.
						</p>
					</div>

					<div>
						<h4>Enlaces</h4>
						<ul>
							<li><Link to="/">Catálogo</Link></li>
							<li><Link to="/pedidos">Mis pedidos</Link></li>
							<li><a href="#">Sobre nosotros</a></li>
							<li><a href="#">Preguntas frecuentes</a></li>
						</ul>
					</div>

					<div>
						<h4>Atención al cliente</h4>
						<ul>
							<li><a href="#">Mi cuenta</a></li>
							<li><a href="#">Historial de pedidos</a></li>
							<li><a href="#">Devoluciones</a></li>
							<li><a href="#">Política de envíos</a></li>
						</ul>
					</div>

					<div>
						<h4>¿Necesitas ayuda?</h4>
						<ul>
							<li>+57 (601) 123 4567</li>
							<li>soporte@afirmativepill.co</li>
							<li>Atención 24/7</li>
						</ul>
					</div>
				</div>
			</footer>

			<div className="footer footer-bottom" style={{ marginTop: 0 }}>
				<div className="wrap">
					<span>© 2026 Afirmative Pill. Taller académico.</span>
					<span>Todas las operaciones viajan por GraphQL · Zero-REST</span>
				</div>
			</div>
		</>
	);
}

export function Layout({ children }: { children: React.ReactNode }) {
	const [cartAbierto, setCartAbierto] = useState(false);
	const { pathname } = useLocation();

	// Las categorías son una herramienta de exploración del catálogo. En el
	// checkout o en los pedidos no tienen nada que filtrar y solo añaden ruido.
	const esCatalogo = pathname === "/";

	return (
		<>
			<TopBar />
			<Header onOpenCart={() => setCartAbierto(true)} />
			{esCatalogo && <CategoryNav />}
			<main>{children}</main>
			<Footer />
			{cartAbierto && <CartDrawer onClose={() => setCartAbierto(false)} />}
			<AuthModal />
		</>
	);
}
