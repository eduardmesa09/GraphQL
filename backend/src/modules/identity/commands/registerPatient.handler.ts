import bcrypt from "bcryptjs";
import { fail, ok, type Result } from "../../../shared/result/Result.js";
import { findPatientByEmail, insertPatient, type PatientRow } from "../infra/PatientRepository.js";
import { signToken } from "../auth/token.js";

export interface RegisterPatientCommand {
    email: string;
    fullName: string;
    password: string;
}

export interface AuthResult {
    token: string;
    patient: PatientRow;
}

export async function registerPatient(
    cmd: RegisterPatientCommand,
): Promise<Result<AuthResult>> {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cmd.email)) {
        return fail({ field: "email", message: "Correo electrónico inválido", code: "VALIDATION" });
    }
    if (cmd.password.length < 8) {
        return fail({
        field: "password",
        message: "La contraseña debe tener al menos 8 caracteres",
        code: "VALIDATION",
        });
    }
    if (!cmd.fullName.trim()) {
        return fail({ field: "fullName", message: "El nombre es obligatorio", code: "VALIDATION" });
    }

    if (await findPatientByEmail(cmd.email)) {
        return fail({ field: "email", message: "Ya existe una cuenta con ese correo", code: "CONFLICT" });
    }

    const passwordHash = await bcrypt.hash(cmd.password, 10);
    const patient = await insertPatient(cmd.email, cmd.fullName.trim(), passwordHash);

    return ok({ token: signToken({ sub: patient.id, email: patient.email }), patient });
}
