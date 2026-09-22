import { GraphQLScalarType, Kind, GraphQLError } from "graphql";

/**
 * Normaliza cualquier entrada a un número de pesos con máximo 2 decimales.
 * pg entrega `numeric` como string ("9500.00"), el cliente envía number.
 */
function toMoney(input: unknown, origen: String): number {
    let n: number;

    if (typeof input === "string") {
        if (input.trim() === "") {
            throw new GraphQLError(`Money (${origen}): cadena vacía`);
        }
        n= Number(input);

    }else {
        throw new GraphQLError(
            `Money (${origen}): se esperaba string o number, llegó ${typeof input}`
        );
    }

    if (!Number.isFinite(n)) {
        throw new GraphQLError(`Money (${origen}): valor no numérico "${String(input)}"`);
    }

    if (n < 0) {
        throw new GraphQLError(`Money (${origen}): no se admiten montos negativos`);
    }

    // Redondeo a centavos y verificación de que no se perdió precisión
    const centavos= Math.round(n * 100);
    if (Math.abs(n * 100 - centavos) > 1e-6) {
        throw new GraphQLError(`Money (${origen}): máximo 2 decimales, llegó ${n}`);
    }

    return centavos / 100;
}

export const MoneyScalar= new GraphQLScalarType({
    name: "Money",
    description: "Monto en pesos colombianos, máximo 2 decimales no negativo." + 
    "pg entrega numeric como string; este escalar es el único punto de conversión",

    //Backend -> cliente
    serialize(value) { 
        return toMoney(value, "serialize");
    },

    //Cliente -> backend (variables)
    parseValue(value) {
        return toMoney(value, "parseValue");
    },

    //Cliente -> backend (literal inline en la query)
    parseLiteral(ast) {
        if (ast.kind === Kind.INT || ast.kind === Kind.FLOAT) {
            return toMoney(Number(ast.value), "parseLiteral");
        }

        if (ast.kind === Kind.STRING) {
            return toMoney(ast.value, "parseLiteral");
        }
        
        throw new GraphQLError(`Money: literal inválido (${ast.kind})`);
    },
});
