import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  GlobalSignOutCommand,
  ConfirmSignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { AWS_REGION, COGNITO_CLIENT_ID } from "./config";

export const cognitoClient = new CognitoIdentityProviderClient({
  region: AWS_REGION,
});

/**
 * Registers a new user with Cognito via Email and Password.
 */
export async function registerUser(email: string, password: string) {
  const command = new SignUpCommand({
    ClientId: COGNITO_CLIENT_ID,
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
  const command = new ConfirmSignUpCommand({
    ClientId: COGNITO_CLIENT_ID,
    Username: email,
    ConfirmationCode: code,
  });
  return cognitoClient.send(command);
}

/**
 * Logs in a user utilizing Cognito, returning the Access Token.
 */
export async function loginUser(email: string, password: string) {
  const command = new InitiateAuthCommand({
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: COGNITO_CLIENT_ID,
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
