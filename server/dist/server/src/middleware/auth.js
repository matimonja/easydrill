"use strict";
/**
 * Auth Middleware — Verify Cognito JWT tokens.
 *
 * Reads Authorization: Bearer <token> header, verifies against Cognito JWKS,
 * and attaches user info to req.user.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.optionalAuth = optionalAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwks_rsa_1 = __importDefault(require("jwks-rsa"));
// ─── JWKS Client ─────────────────────────────────────────────────
const region = process.env.COGNITO_REGION || 'us-east-1';
const userPoolId = process.env.COGNITO_USER_POOL_ID || '';
const jwksUri = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
const client = (0, jwks_rsa_1.default)({
    jwksUri,
    cache: true,
    cacheMaxAge: 600000, // 10 minutes
    rateLimit: true,
});
function getKey(header, callback) {
    if (!header.kid) {
        callback(new Error('No kid in token header'));
        return;
    }
    client.getSigningKey(header.kid, (err, key) => {
        if (err) {
            callback(err);
            return;
        }
        const signingKey = key === null || key === void 0 ? void 0 : key.getPublicKey();
        callback(null, signingKey);
    });
}
// ─── Verify Token ────────────────────────────────────────────────
function verifyToken(token) {
    return new Promise((resolve, reject) => {
        // If no Cognito configured (dev mode), try to decode without verification
        if (!userPoolId) {
            try {
                const decoded = jsonwebtoken_1.default.decode(token);
                if (decoded && decoded.sub) {
                    resolve({
                        sub: decoded.sub,
                        email: decoded.email || decoded['cognito:username'] || '',
                        name: decoded.name || decoded.given_name || '',
                        picture: decoded.picture || '',
                    });
                    return;
                }
            }
            catch ( /* fall through */_a) { /* fall through */ }
            reject(new Error('No Cognito User Pool configured and token is invalid'));
            return;
        }
        const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
        jsonwebtoken_1.default.verify(token, getKey, {
            issuer,
            algorithms: ['RS256'],
        }, (err, decoded) => {
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
function requireAuth(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'No authorization token provided' });
            return;
        }
        const token = authHeader.slice(7);
        try {
            req.user = yield verifyToken(token);
            next();
        }
        catch (err) {
            res.status(401).json({ error: 'Invalid or expired token', details: err.message });
        }
    });
}
/**
 * Optional auth middleware — doesn't fail if no token,
 * but attaches user info if valid token present.
 */
function optionalAuth(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            next();
            return;
        }
        const token = authHeader.slice(7);
        try {
            req.user = yield verifyToken(token);
        }
        catch (_a) {
            // Token invalid, but optional — continue without user
        }
        next();
    });
}
