import { useEffect, useState } from "react";
import { useMutation, useReactiveVar } from "@apollo/client/react";
import { LOGIN, REGISTER } from "../../graphql/operations";
import type {
	LoginMutation,
	LoginMutationVariables,
	RegisterPatientMutation,
	RegisterPatientMutationVariables,
} from "../../graphql/generated";

type UserError = LoginMutation["login"]["errors"][number];
import { setToken } from "../../lib/session";
import { client } from "../../apollo/client";
import { ErrorList } from "../../components/Alert";
import { Cross } from "../../components/icons";
import { authModalVar, closeAuth, type AuthMode } from "./authState";

function Form({ modo }: { modo: AuthMode }) {
	const [errors, setErrors] = useState<UserError[]>([]);
	const [form, setForm] = useState({ email: "", password: "", fullName: "" });

	const [login, { loading: entrando }] =
		useMutation<LoginMutation, LoginMutationVariables>(LOGIN);
	const [registrar, { loading: registrando }] =
		useMutation<RegisterPatientMutation, RegisterPatientMutationVariables>(REGISTER);

	const loading = entrando || registrando;
	const esRegistro = modo === "registro";

	// Al cambiar de pestaña, los errores de la anterior dejan de aplicar.
	useEffect(() => setErrors([]), [modo]);

	async function enviar(e: React.FormEvent) {
		e.preventDefault();
		setErrors([]);

		const payload = esRegistro
			? (await registrar({ variables: { input: form } })).data?.registerPatient
			: (
					await login({
						variables: { input: { email: form.email, password: form.password } },
					})
				).data?.login;

		if (!payload) return;

		// Errores de negocio: llegan como datos tipados dentro del payload.
		if (payload.errors.length > 0) {
			setErrors(payload.errors);
			return;
		}

		setToken(payload.token);
		closeAuth();
		// La caché se vuelve a llenar ya autenticada.
		await client.resetStore();
	}

	return (
		<form onSubmit={enviar}>
			<ErrorList errors={errors} />

			{esRegistro && (
				<div className="field">
					<label htmlFor="af-nombre">Nombre completo</label>
					<input
						id="af-nombre"
						required
						autoFocus
						value={form.fullName}
						onChange={(e) => setForm({ ...form, fullName: e.target.value })}
						placeholder="Ana Gómez"
					/>
				</div>
			)}

			<div className="field">
				<label htmlFor="af-email">Correo electrónico</label>
				<input
					id="af-email"
					type="email"
					required
					autoFocus={!esRegistro}
					value={form.email}
					onChange={(e) => setForm({ ...form, email: e.target.value })}
					placeholder="paciente@correo.com"
				/>
			</div>

			<div className="field">
				<label htmlFor="af-pass">Contraseña</label>
				<input
					id="af-pass"
					type="password"
					required
					value={form.password}
					onChange={(e) => setForm({ ...form, password: e.target.value })}
					placeholder="Mínimo 8 caracteres"
				/>
				{esRegistro && <span className="hint">Al menos 8 caracteres.</span>}
			</div>

			<button className="btn btn-primary btn-block" disabled={loading} type="submit">
				{loading ? "Enviando…" : esRegistro ? "Crear cuenta" : "Ingresar"}
			</button>
		</form>
	);
}

export function AuthModal() {
	const modo = useReactiveVar(authModalVar);

	// Cerrar con Escape y bloquear el scroll del fondo mientras está abierto.
	useEffect(() => {
		if (!modo) return;

		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") closeAuth();
		};
		document.addEventListener("keydown", onKey);

		const previo = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		return () => {
			document.removeEventListener("keydown", onKey);
			document.body.style.overflow = previo;
		};
	}, [modo]);

	if (!modo) return null;

	const esRegistro = modo === "registro";

	return (
		<>
			<div className="overlay" onClick={closeAuth} />

			<div className="modal-shell">
				<div
					className="modal"
					role="dialog"
					aria-modal="true"
					aria-labelledby="af-titulo"
				>
					<button className="modal-close" onClick={closeAuth} aria-label="Cerrar">
						<Cross />
					</button>

					<h2 id="af-titulo" style={{ fontSize: 21, margin: "0 0 6px" }}>
						{esRegistro ? "Crear cuenta" : "Ingresar"}
					</h2>
					<p style={{ fontSize: 13.5, color: "var(--ink-faint)", margin: "0 0 20px" }}>
						{esRegistro
							? "Regístrate para emitir pedidos y hacerles seguimiento."
							: "Accede a tu cuenta para ver y emitir pedidos."}
					</p>

					<div className="modal-tabs" role="tablist">
						<button
							role="tab"
							aria-selected={!esRegistro}
							data-active={!esRegistro}
							onClick={() => authModalVar("login")}
						>
							Ingresar
						</button>
						<button
							role="tab"
							aria-selected={esRegistro}
							data-active={esRegistro}
							onClick={() => authModalVar("registro")}
						>
							Crear cuenta
						</button>
					</div>

					{/* La `key` fuerza un formulario nuevo al cambiar de pestaña,
					    así no quedan campos de la otra vista. */}
					<Form key={modo} modo={modo} />
				</div>
			</div>
		</>
	);
}
