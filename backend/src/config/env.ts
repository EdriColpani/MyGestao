import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

/** Sempre carrega backend/.env, mesmo se o processo foi iniciado com outro cwd (ex.: monorepo, PM2, IDE). */
const envFile = path.resolve(__dirname, "..", "..", ".env");
dotenv.config({ path: envFile });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(10),
  PORT: z.coerce.number().default(3333),
  /** Origens permitidas no CORS, separadas por virgula. Ex: http://54.232.189.111:3000,http://localhost:3000 */
  CORS_ORIGINS: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(`Variaveis de ambiente invalidas: ${parsedEnv.error.message}`);
}

const data = parsedEnv.data;
const dbUrl = data.DATABASE_URL;
const placeholders = ["SEU_REF", "YOUR-PASSWORD", "[YOUR-PASSWORD]"];
const bad = placeholders.find((p) => dbUrl.includes(p));
if (bad) {
  throw new Error(
    `DATABASE_URL ainda contem texto de exemplo (${bad}). Edite o arquivo: ${envFile} com a URI copiada do Supabase (Settings > Database > Connection string).`,
  );
}

export const env = data;
