import { existsSync, readFileSync } from "fs";
import { join } from "path";

function parseDotEnvFile(): Record<string, string> {
  const envPath = join(process.cwd(), ".env");
  if (!existsSync(envPath)) return {};

  const content = readFileSync(envPath, "utf-8");
  const result: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    // Strip wrapping quotes if present.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

const DOT_ENV_FALLBACK = parseDotEnvFile();

function readEnv(name: string): string {
  const runtimeValue = (process.env[name] || "").trim();
  if (runtimeValue) return runtimeValue;
  return (DOT_ENV_FALLBACK[name] || "").trim();
}

export const AWS_REGION = readEnv("AWS_REGION") || "us-east-1";
export const DYNAMO_TABLE_NAME =
  readEnv("DYNAMO_TABLE_NAME") || "AuraQuizPlatform";

// User pool ID is not required for the current sign-up/sign-in API flow.
export const COGNITO_USER_POOL_ID = readEnv("COGNITO_USER_POOL_ID");
export const COGNITO_CLIENT_ID = readEnv("COGNITO_CLIENT_ID");

export const S3_BUCKET_NAME = readEnv("S3_BUCKET_NAME") || "aura-quiz-assets";
