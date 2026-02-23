/**
 * Cognito Auth Client
 *
 * Wraps amazon-cognito-identity-js to provide:
 *   - Email/password registration, login, confirmation
 *   - Google OAuth via Cognito Hosted UI
 *   - Password recovery
 *   - Session management
 */

import {
    CognitoUserPool,
    CognitoUser,
    AuthenticationDetails,
    CognitoUserAttribute,
    CognitoUserSession,
} from 'amazon-cognito-identity-js';

// ─── Configuration ───────────────────────────────────────────────

const USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID || '';
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || '';
const COGNITO_DOMAIN = import.meta.env.VITE_COGNITO_DOMAIN || '';
const REGION = import.meta.env.VITE_COGNITO_REGION || 'us-east-1';

const REDIRECT_URI = `${window.location.origin}/login.html`;

let userPool: CognitoUserPool | null = null;

function getPool(): CognitoUserPool {
    if (!userPool) {
        if (!USER_POOL_ID || !CLIENT_ID) {
            throw new Error('Cognito not configured. Set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID.');
        }
        userPool = new CognitoUserPool({
            UserPoolId: USER_POOL_ID,
            ClientId: CLIENT_ID,
        });
    }
    return userPool;
}

// ─── Sign Up ─────────────────────────────────────────────────────

export function signUp(
    email: string,
    password: string,
    name?: string
): Promise<void> {
    return new Promise((resolve, reject) => {
        const attributes: CognitoUserAttribute[] = [
            new CognitoUserAttribute({ Name: 'email', Value: email }),
        ];
        if (name) {
            attributes.push(new CognitoUserAttribute({ Name: 'name', Value: name }));
        }

        getPool().signUp(email, password, attributes, [], (err, result) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
}

// ─── Confirm Sign Up ─────────────────────────────────────────────

export function confirmSignUp(email: string, code: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const user = new CognitoUser({ Username: email, Pool: getPool() });
        user.confirmRegistration(code, true, (err, result) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
}

// ─── Resend Confirmation Code ────────────────────────────────────

export function resendConfirmationCode(email: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const user = new CognitoUser({ Username: email, Pool: getPool() });
        user.resendConfirmationCode((err, result) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
}

// ─── Sign In (Email/Password) ────────────────────────────────────

export function signIn(
    email: string,
    password: string
): Promise<CognitoUserSession> {
    return new Promise((resolve, reject) => {
        const user = new CognitoUser({ Username: email, Pool: getPool() });
        const authDetails = new AuthenticationDetails({
            Username: email,
            Password: password,
        });

        user.authenticateUser(authDetails, {
            onSuccess: (session) => resolve(session),
            onFailure: (err) => reject(err),
        });
    });
}

// ─── Sign In With Google (Hosted UI redirect) ────────────────────

export function signInWithGoogle(): void {
    if (!COGNITO_DOMAIN) {
        throw new Error('Cognito domain not configured for Google sign-in.');
    }

    const url = `https://${COGNITO_DOMAIN}/oauth2/authorize`
        + `?response_type=code`
        + `&client_id=${CLIENT_ID}`
        + `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`
        + `&identity_provider=Google`
        + `&scope=openid+email+profile`;

    window.location.href = url;
}

// ─── Exchange OAuth Code for Tokens ──────────────────────────────

export async function exchangeCodeForTokens(code: string): Promise<{
    id_token: string;
    access_token: string;
    refresh_token: string;
}> {
    if (!COGNITO_DOMAIN) {
        throw new Error('Cognito domain not configured.');
    }

    const response = await fetch(`https://${COGNITO_DOMAIN}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: CLIENT_ID,
            code,
            redirect_uri: REDIRECT_URI,
        }),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Token exchange failed: ${text}`);
    }

    return response.json();
}

// ─── Sign Out ────────────────────────────────────────────────────

export function signOut(): void {
    const user = getPool().getCurrentUser();
    if (user) {
        user.signOut();
    }
    // Clear any stored tokens
    localStorage.removeItem('easydrill-auth-tokens');
}

// ─── Forgot Password ────────────────────────────────────────────

export function forgotPassword(email: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const user = new CognitoUser({ Username: email, Pool: getPool() });
        user.forgotPassword({
            onSuccess: () => resolve(),
            onFailure: (err) => reject(err),
        });
    });
}

// ─── Confirm Forgot Password ─────────────────────────────────────

export function confirmForgotPassword(
    email: string,
    code: string,
    newPassword: string
): Promise<void> {
    return new Promise((resolve, reject) => {
        const user = new CognitoUser({ Username: email, Pool: getPool() });
        user.confirmPassword(code, newPassword, {
            onSuccess: () => resolve(),
            onFailure: (err) => reject(err),
        });
    });
}

// ─── Get Current Session ─────────────────────────────────────────

export function getCurrentSession(): Promise<CognitoUserSession | null> {
    return new Promise((resolve) => {
        const user = getPool().getCurrentUser();
        if (!user) {
            // Check for OAuth tokens stored manually
            const stored = localStorage.getItem('easydrill-auth-tokens');
            if (stored) {
                try {
                    const tokens = JSON.parse(stored);
                    // Return a minimal mock session with the id_token
                    resolve(tokens);
                } catch {
                    resolve(null);
                }
            } else {
                resolve(null);
            }
            return;
        }

        user.getSession((err: Error | null, session: CognitoUserSession | null) => {
            if (err || !session) {
                resolve(null);
                return;
            }
            resolve(session);
        });
    });
}

// ─── Get ID Token ────────────────────────────────────────────────

export async function getIdToken(): Promise<string | null> {
    // Check for OAuth tokens first
    const stored = localStorage.getItem('easydrill-auth-tokens');
    if (stored) {
        try {
            const tokens = JSON.parse(stored);
            if (tokens.id_token) return tokens.id_token;
        } catch { /* fall through */ }
    }

    // Try Cognito SDK session
    const session = await getCurrentSession();
    if (!session) return null;

    if (session instanceof Object && 'getIdToken' in session) {
        return (session as CognitoUserSession).getIdToken().getJwtToken();
    }

    return null;
}

// ─── Store OAuth Tokens ──────────────────────────────────────────

export function storeOAuthTokens(tokens: {
    id_token: string;
    access_token: string;
    refresh_token?: string;
}): void {
    localStorage.setItem('easydrill-auth-tokens', JSON.stringify(tokens));
}

// ─── Check if Cognito is configured ─────────────────────────────

export function isCognitoConfigured(): boolean {
    return !!(USER_POOL_ID && CLIENT_ID);
}
