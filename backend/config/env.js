/**
 * Centralised environment config, validated with zod.
 * Load vars via `node --env-file=.env` (local) or the process environment (CI / prod).
 */
const { z } = require("zod");

const NODE_ENVS = ["development", "test", "production"];

// "" is treated as "not set" (same as requireEnv / the `||` fallback in the original)
const emptyAsUndefined = (schema) =>
    z.preprocess((v) => (v === "" ? undefined : v), schema);

const requiredString = z.string({ error: "is required" }).min(1, "is required");

const optionalString = emptyAsUndefined(z.string().optional());

// String -> integer in [1, 65535]
const port = z
    .string({ error: "is required" })
    .min(1, "is required")
    .pipe(z.coerce.number().int().min(1).max(65535));

const portWithDefault = (fallback) =>
    z.preprocess((v) => (v === undefined || v === "" ? fallback : v), port);

// Same semantics as parseBool: unset/"" -> false, otherwise value === "true"
const bool = z
    .string()
    .optional()
    .transform((v) => v === "true");

const schema = z
    .object({
        NODE_ENV: z.enum(NODE_ENVS, {
            error: "is required and must be one of: development | test | production",
        }),
        TOKENSECRET: requiredString,
        PORT: port,

        // Production only
        DATABASE_URL: optionalString,

        // Non-production only
        DB_HOST: optionalString,
        DB_PORT: portWithDefault("5432"),
        DB_USER: optionalString,
        DB_PASSWORD: optionalString,
        DB_NAME: optionalString,

        DB_LOG: bool,
        DB_SSL: bool,
        DB_RESET: bool,
        DB_SEED: bool,
    })
    .superRefine((e, ctx) => {
        const fail = (key, message) =>
            ctx.addIssue({ code: "custom", path: [key], message });

        if (e.NODE_ENV === "production") {
            if (!e.DATABASE_URL) {
                fail("DATABASE_URL", "is required in production");
            }
        } else {
            if (e.DATABASE_URL) {
                fail(
                    "DATABASE_URL",
                    "must not be set outside production (use DB_HOST / DB_USER / DB_PASSWORD / DB_NAME)",
                );
            }
            for (const key of [
                "DB_HOST",
                "DB_USER",
                "DB_PASSWORD",
                "DB_NAME",
            ]) {
                if (!e[key]) fail(key, "is required outside production");
            }
        }
    })
    .transform((e) => {
        const isProduction = e.NODE_ENV === "production";
        return {
            NODE_ENV: e.NODE_ENV,
            isProduction,
            isDevelopment: e.NODE_ENV === "development",
            isTest: e.NODE_ENV === "test",
            TOKENSECRET: e.TOKENSECRET,
            PORT: e.PORT,
            DATABASE_URL: isProduction ? e.DATABASE_URL : undefined,
            db: isProduction
                ? undefined
                : {
                      host: e.DB_HOST,
                      port: e.DB_PORT,
                      user: e.DB_USER,
                      password: e.DB_PASSWORD,
                      name: e.DB_NAME,
                  },
            DB_LOG: e.DB_LOG,
            DB_SSL: e.DB_SSL,
            DB_RESET: e.DB_RESET,
            DB_SEED: e.DB_SEED,
        };
    });

const result = schema.safeParse(process.env);

if (!result.success) {
    const lines = result.error.issues.map(
        (i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`,
    );
    throw new Error(`Invalid environment configuration:\n${lines.join("\n")}`);
}

module.exports = Object.freeze(result.data);
