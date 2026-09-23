import bcrypt from "bcryptjs";
import { fail, ok, type Result } from "../../../shared/result/Result.js";
import { findPatientByEmail } from "../infra/PatientRepository.js";
import { signToken } from "../auth/token.js";
import type { AuthResult } from "./registerPatient.handler.js";

export interface LoginCommand {
    email: string;
    password: string;
}

export async function login(cmd: LoginCommand): Promise<Result<AuthResult>> {
    const patient = await findPatientByEmail(cmd.email);

    // Mismo mensaje exista o no la cuenta: no revelamos qué correos están registrados.
    const credencialesInvalidas = fail<AuthResult>({
        message: "Correo o contraseña incorrectos",
        code: "UNAUTHORIZED",
    });

    if (!patient) return credencialesInvalidas;
    if (!(await bcrypt.compare(cmd.password, patient.passwordHash))) return credencialesInvalidas;

    return ok({ token: signToken({ sub: patient.id, email: patient.email }), patient });
}
