/**
 * Auth Middleware — Verify Cognito JWT tokens.
 *
 * Reads Authorization: Bearer <token> header, verifies against Cognito JWKS,
 * and attaches user info to req.user.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// ─── Types ───────────────────────────────────────────────────────

export interface AuthUser {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

// ─── JWKS Client ─────────────────────────────────────────────────

const region = process.env.COGNITO_REGION || 'us-east-1';
const userPoolId = process.env.COGNITO_USER_POOL_ID || '';
const jwksUri = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;

const client = jwksClient({
    jwksUri,
    cache: true,
    cacheMaxAge: 600000, // 10 minutes
    rateLimit: true,
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback): void {
    if (!header.kid) {
        callback(new Error('No kid in token header'));
        return;
    }
    client.getSigningKey(header.kid, (err, key) => {
        if (err) {
            callback(err);
            return;
        }
        const signingKey = key?.getPublicKey();
        callback(null, signingKey);
    });
}

// ─── Verify Token ────────────────────────────────────────────────

function verifyToken(token: string): Promise<AuthUser> {
    return new Promise((resolve, reject) => {
        // If no Cognito configured (dev mode), try to decode without verification
        if (!userPoolId) {
            try {
                const decoded = jwt.decode(token) as any;
                if (decoded && decoded.sub) {
                    resolve({
                        sub: decoded.sub,
                        email: decoded.email || decoded['cognito:username'] || '',
                        name: decoded.name || decoded.given_name || '',
                        picture: decoded.picture || '',
                    });
                    return;
                }
            } catch { /* fall through */ }
            reject(new Error('No Cognito User Pool configured and token is invalid'));
            return;
        }

        const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

        jwt.verify(token, getKey, {
            issuer,
            algorithms: ['RS256'],
        }, (err, decoded: any) => {
            if (err) {
                reject(err);
                return;
            }
            resolve({
                sub: decoded.sub,
                email: decoded.email || decoded['cognito:username'] || '',
                name: decoded.name || decoded.given_name || '',
                picture: decoded.picture || '',
            });
        });
    });
}

// ─── Middleware ───────────────────────────────────────────────────

/**
 * Middleware that requires a valid JWT token.
 * Attaches user info to req.user.
 * Returns 401 if no token or invalid token.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'No authorization token provided' });
        return;
    }

    const token = authHeader.slice(7);

    try {
        req.user = await verifyToken(token);
        next();
    } catch (err: any) {
        res.status(401).json({ error: 'Invalid or expired token', details: err.message });
    }
}

/**
 * Optional auth middleware — doesn't fail if no token,
 * but attaches user info if valid token present.
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        next();
        return;
    }

    const token = authHeader.slice(7);

    try {
        req.user = await verifyToken(token);
    } catch {
        // Token invalid, but optional — continue without user
    }

    next();
}
