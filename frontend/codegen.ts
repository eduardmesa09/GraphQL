import type { CodegenConfig } from "@graphql-codegen/cli";

/**
 * Genera los tipos de TypeScript a partir del schema del backend.
 *
 * Con esto el contrato deja de estar escrito dos veces: si el servidor
 * renombra un campo, el frontend falla al COMPILAR en vez de fallar en el
 * navegador. La generación además valida cada operación contra el schema, así
 * que pedir un campo inexistente rompe la build.
 */
const config: CodegenConfig = {
	schema: "../backend/schema.graphql",
	documents: ["src/graphql/operations.ts"],

	// Los scalars personalizados no tienen equivalente automático: hay que
	// decirle a codegen a qué tipo de TypeScript corresponde cada uno.
	config: {
		scalars: {
			Money: "number",    // el scalar Money serializa a number
			DateTime: "string", // ISO 8601
			UUID: "string",
		},
		// Uniones de strings en vez de `enum` de TypeScript: permite comparar
		// con literales (`status === "APPROVED"`) sin importar nada.
		enumsAsTypes: true,
		// Sin esto cada campo sería `T | null | undefined` y obligaría a
		// comprobaciones dobles en toda la interfaz.
		avoidOptionals: { field: true },
		skipTypename: true,
		useTypeImports: true,
	},

	generates: {
		// Un solo archivo con el plugin de operaciones: emite los tipos de cada
		// query, mutation y fragmento, más los inputs y enums que necesitan.
		// El plugin `typescript` (tipos de TODO el schema) no se usa: sus
		// definiciones no las consume nadie y duplicaba identificadores.
		"src/graphql/generated.ts": {
			plugins: ["typescript-operations"],
		},
	},
};

export default config;
