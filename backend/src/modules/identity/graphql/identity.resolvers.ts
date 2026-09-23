import { registerPatient, type RegisterPatientCommand } from "../commands/registerPatient.handler.js";
import { login, type LoginCommand } from "../commands/login.handler.js";
import { findPatientById } from "../infra/PatientRepository.js";
import type { GraphQLContext } from "../../../shared/graphql/context.js";
import type { Result } from "../../../shared/result/Result.js";
import type { AuthResult } from "../commands/registerPatient.handler.js";

function toAuthPayload(result: Result<AuthResult>) {
    return result.ok
        ? { token: result.value.token, patient: result.value.patient, errors: [] }
        : { token: null, patient: null, errors: result.errors };
}

export const identityResolvers = {
    Query: {
        me: (_p: unknown, _a: unknown, ctx: GraphQLContext) =>
        ctx.user ? findPatientById(ctx.user.id) : null,
    },

    Mutation: {
        registerPatient: async (_p: unknown, args: { input: RegisterPatientCommand }) =>
        toAuthPayload(await registerPatient(args.input)),

        login: async (_p: unknown, args: { input: LoginCommand }) =>
        toAuthPayload(await login(args.input)),
    },
};
