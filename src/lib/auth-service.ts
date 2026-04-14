import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  GlobalSignOutCommand,
  ConfirmSignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { Agent } from "https";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { AWS_REGION, COGNITO_CLIENT_ID } from "./config";

export const cognitoClient = new CognitoIdentityProviderClient({
  region: AWS_REGION,
  requestHandler: new NodeHttpHandler({
    // Force IPv4 to avoid intermittent IPv6 routing timeouts on some networks.
    httpsAgent: new Agent({ keepAlive: true, family: 4 }),
    connectionTimeout: 10_000,
    requestTimeout: 15_000,
  }),
});

function getClientId(): string {
  if (COGNITO_CLIENT_ID) return COGNITO_CLIENT_ID;

  const envPath = join(process.cwd(), ".env");
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf-8");
    const match = content.match(/^COGNITO_CLIENT_ID=(.*)$/m);
    if (match?.[1]) {
      return match[1].trim().replace(/^['"]|['"]$/g, "");
    }
  }

  throw new Error(
    "COGNITO_CLIENT_ID is missing. Set it in .env and restart `npm run dev`."
  );
}

/**
 * Registers a new user with Cognito via Email and Password.
 */
export async function registerUser(email: string, password: string) {
  const clientId = getClientId();
  const command = new SignUpCommand({
    ClientId: clientId,
    Username: email,
    Password: password,
    UserAttributes: [
      {
        Name: "email",
        Value: email,
      },
    ],
  });

  return cognitoClient.send(command);
}

/**
 * Confirms a newly registered user with the code sent to their email.
 */
export async function confirmUser(email: string, code: string) {
  const clientId = getClientId();
  const command = new ConfirmSignUpCommand({
    ClientId: clientId,
    Username: email,
    ConfirmationCode: code,
  });
  return cognitoClient.send(command);
}

/**
 * Logs in a user utilizing Cognito, returning the Access Token.
 */
export async function loginUser(email: string, password: string) {
  const clientId = getClientId();
  const command = new InitiateAuthCommand({
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: clientId,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  });

  const response = await cognitoClient.send(command);
  return response.AuthenticationResult;
}

/**
 * Logs a user out across all devices using their Access Token.
 */
export async function logoutUser(accessToken: string) {
  const command = new GlobalSignOutCommand({
    AccessToken: accessToken,
  });

  return cognitoClient.send(command);
}
