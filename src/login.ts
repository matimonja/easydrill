/**
 * Login Page — Entry Point
 *
 * Manages 5 views: signin, signup, verify email, forgot password (2 steps).
 * Integrates with Cognito auth client and user state module.
 *
 * Auth modules are imported lazily (dynamic import) to avoid blocking
 * the UI initialization if the Cognito SDK fails to load.
 */

// ─── State ───────────────────────────────────────────────────────

let pendingEmail = '';
let pendingPassword = '';

// ─── DOM helpers ─────────────────────────────────────────────────

function $(id: string): HTMLElement | null {
    return document.getElementById(id);
}

function showView(viewId: string): void {
    document.querySelectorAll('.login-view').forEach(v => v.classList.remove('active'));
    const view = $(viewId);
    if (view) {
        view.classList.add('active');
        // Re-trigger animation
        view.style.animation = 'none';
        view.offsetHeight; // force reflow
        view.style.animation = '';
    }
    hideGlobalMessages();
}

function setLoading(btnId: string, loading: boolean): void {
    const btn = $(btnId) as HTMLButtonElement;
    if (!btn) return;
    btn.disabled = loading;
    const text = btn.querySelector('.btn-text') as HTMLElement;
    const spinner = btn.querySelector('.btn-spinner') as HTMLElement;
    if (text) text.style.opacity = loading ? '0.6' : '1';
    if (spinner) spinner.hidden = !loading;
}

function showFieldError(id: string, message: string): void {
    const el = $(id);
    if (el) el.textContent = message;
    const input = document.querySelector(`#${id.replace('-error', '')}`) as HTMLInputElement;
    if (input) input.classList.toggle('error', !!message);
}

function clearFieldErrors(...ids: string[]): void {
    ids.forEach(id => showFieldError(id, ''));
}

function showGlobalError(message: string): void {
    const el = $('global-error');
    if (el) { el.textContent = message; el.hidden = false; }
    const success = $('global-success');
    if (success) success.hidden = true;
}

function showGlobalSuccess(message: string): void {
    const el = $('global-success');
    if (el) { el.textContent = message; el.hidden = false; }
    const error = $('global-error');
    if (error) error.hidden = true;
}

function hideGlobalMessages(): void {
    const error = $('global-error');
    const success = $('global-success');
    if (error) error.hidden = true;
    if (success) success.hidden = true;
}

function getReturnUrl(): string {
    const params = new URLSearchParams(window.location.search);
    return params.get('returnUrl') || '/';
}

// ─── Validation ──────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password: string): {
    valid: boolean; length: boolean; upper: boolean; lower: boolean; number: boolean;
} {
    return {
        length: password.length >= 8,
        upper: /[A-Z]/.test(password),
        lower: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        valid: password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password),
    };
}

function updatePasswordRules(password: string): void {
    const rules = validatePassword(password);
    const toggle = (id: string, valid: boolean) => {
        const el = $(id);
        if (el) el.classList.toggle('valid', valid);
    };
    toggle('rule-length', rules.length);
    toggle('rule-upper', rules.upper);
    toggle('rule-lower', rules.lower);
    toggle('rule-number', rules.number);
}

// ─── Cognito Error Mapping ───────────────────────────────────────

function mapCognitoError(err: any): string {
    const code = err?.code || err?.name || '';
    switch (code) {
        case 'UserNotFoundException': return 'No existe una cuenta con ese email.';
        case 'NotAuthorizedException': return 'Email o contraseña incorrectos.';
        case 'UsernameExistsException': return 'Ya existe una cuenta con ese email.';
        case 'CodeMismatchException': return 'Código de verificación incorrecto.';
        case 'ExpiredCodeException': return 'El código ha expirado. Solicitá uno nuevo.';
        case 'InvalidPasswordException': return 'La contraseña no cumple los requisitos mínimos.';
        case 'UserNotConfirmedException': return 'Tu cuenta no está verificada. Revisá tu email.';
        case 'LimitExceededException': return 'Demasiados intentos. Esperá un momento.';
        default: return err?.message || 'Error inesperado. Intentá de nuevo.';
    }
}

// ─── Post-login flow ─────────────────────────────────────────────

async function postLoginFlow(): Promise<void> {
    try {
        const { syncProfile } = await import('./auth/user');
        await syncProfile();
    } catch (err) {
        console.warn('Failed to sync profile after login:', err);
    }
    window.location.href = getReturnUrl();
}

// ─── Init ────────────────────────────────────────────────────────

function init(): void {
    // Check for Google OAuth callback
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
        handleOAuthCallback(code);
        return;
    }

    // View navigation
    $('link-to-signup')?.addEventListener('click', e => { e.preventDefault(); showView('view-signup'); });
    $('link-to-signin')?.addEventListener('click', e => { e.preventDefault(); showView('view-signin'); });
    $('link-back-signin')?.addEventListener('click', e => { e.preventDefault(); showView('view-signin'); });
    $('link-back-signin2')?.addEventListener('click', e => { e.preventDefault(); showView('view-signin'); });
    $('link-back-signin3')?.addEventListener('click', e => { e.preventDefault(); showView('view-signin'); });
    $('link-forgot')?.addEventListener('click', e => { e.preventDefault(); showView('view-forgot1'); });

    // Password rules live update
    $('signup-password')?.addEventListener('input', (e) => {
        updatePasswordRules((e.target as HTMLInputElement).value);
    });

    // Google buttons
    $('btn-google-signin')?.addEventListener('click', handleGoogleSignIn);
    $('btn-google-signup')?.addEventListener('click', handleGoogleSignIn);

    // Forms
    $('form-signin')?.addEventListener('submit', handleSignIn);
    $('form-signup')?.addEventListener('submit', handleSignUp);
    $('form-verify')?.addEventListener('submit', handleVerify);
    $('form-forgot1')?.addEventListener('submit', handleForgotStep1);
    $('form-forgot2')?.addEventListener('submit', handleForgotStep2);
    $('link-resend')?.addEventListener('click', handleResend);
}

// ─── Handlers ────────────────────────────────────────────────────

async function handleSignIn(e: Event): Promise<void> {
    e.preventDefault();
    clearFieldErrors('signin-email-error', 'signin-password-error');

    const email = (($('signin-email') as HTMLInputElement)?.value || '').trim();
    const password = ($('signin-password') as HTMLInputElement)?.value || '';

    if (!email || !isValidEmail(email)) {
        showFieldError('signin-email-error', 'Ingresá un email válido.');
        return;
    }
    if (!password) {
        showFieldError('signin-password-error', 'Ingresá tu contraseña.');
        return;
    }

    setLoading('btn-signin', true);
    try {
        const { signIn } = await import('./auth/client');
        await signIn(email, password);
        await postLoginFlow();
    } catch (err: any) {
        if (err?.code === 'UserNotConfirmedException') {
            pendingEmail = email;
            pendingPassword = password;
            const display = $('verify-email-display');
            if (display) display.textContent = email;
            showView('view-verify');
        } else {
            showGlobalError(mapCognitoError(err));
        }
    } finally {
        setLoading('btn-signin', false);
    }
}

async function handleSignUp(e: Event): Promise<void> {
    e.preventDefault();
    clearFieldErrors('signup-email-error', 'signup-password-error', 'signup-confirm-error');

    const name = (($('signup-name') as HTMLInputElement)?.value || '').trim();
    const email = (($('signup-email') as HTMLInputElement)?.value || '').trim();
    const password = ($('signup-password') as HTMLInputElement)?.value || '';
    const confirm = ($('signup-confirm') as HTMLInputElement)?.value || '';

    let hasError = false;

    if (!email || !isValidEmail(email)) {
        showFieldError('signup-email-error', 'Ingresá un email válido.');
        hasError = true;
    }

    const pwRules = validatePassword(password);
    if (!pwRules.valid) {
        showFieldError('signup-password-error', 'La contraseña no cumple los requisitos.');
        hasError = true;
    }

    if (password !== confirm) {
        showFieldError('signup-confirm-error', 'Las contraseñas no coinciden.');
        hasError = true;
    }

    if (hasError) return;

    setLoading('btn-signup', true);
    try {
        const { signUp } = await import('./auth/client');
        await signUp(email, password, name || undefined);
        pendingEmail = email;
        pendingPassword = password;
        const display = $('verify-email-display');
        if (display) display.textContent = email;
        showView('view-verify');
    } catch (err: any) {
        console.error('[signup] Raw Cognito error:', err?.code || err?.name, err?.message, err);
        showGlobalError(mapCognitoError(err));
    } finally {
        setLoading('btn-signup', false);
    }
}

async function handleVerify(e: Event): Promise<void> {
    e.preventDefault();
    clearFieldErrors('verify-code-error');

    const code = (($('verify-code') as HTMLInputElement)?.value || '').trim();
    if (!code) {
        showFieldError('verify-code-error', 'Ingresá el código.');
        return;
    }

    setLoading('btn-verify', true);
    try {
        const { confirmSignUp, signIn } = await import('./auth/client');
        await confirmSignUp(pendingEmail, code);
        if (pendingPassword) {
            await signIn(pendingEmail, pendingPassword);
            await postLoginFlow();
        } else {
            showGlobalSuccess('¡Cuenta verificada! Ya podés iniciar sesión.');
            showView('view-signin');
        }
    } catch (err: any) {
        showGlobalError(mapCognitoError(err));
    } finally {
        setLoading('btn-verify', false);
    }
}

async function handleResend(e: Event): Promise<void> {
    e.preventDefault();
    if (!pendingEmail) return;

    try {
        const { resendConfirmationCode } = await import('./auth/client');
        await resendConfirmationCode(pendingEmail);
        showGlobalSuccess('Código reenviado. Revisá tu email.');
    } catch (err: any) {
        showGlobalError(mapCognitoError(err));
    }
}

async function handleForgotStep1(e: Event): Promise<void> {
    e.preventDefault();
    clearFieldErrors('forgot-email-error');

    const email = (($('forgot-email') as HTMLInputElement)?.value || '').trim();
    if (!email || !isValidEmail(email)) {
        showFieldError('forgot-email-error', 'Ingresá un email válido.');
        return;
    }

    setLoading('btn-forgot-send', true);
    try {
        const { forgotPassword } = await import('./auth/client');
        await forgotPassword(email);
        pendingEmail = email;
        const display = $('forgot-email-display');
        if (display) display.textContent = email;
        showView('view-forgot2');
    } catch (err: any) {
        showGlobalError(mapCognitoError(err));
    } finally {
        setLoading('btn-forgot-send', false);
    }
}

async function handleForgotStep2(e: Event): Promise<void> {
    e.preventDefault();
    clearFieldErrors('forgot-code-error', 'forgot-newpass-error', 'forgot-confirm-error');

    const code = (($('forgot-code') as HTMLInputElement)?.value || '').trim();
    const newPass = ($('forgot-newpass') as HTMLInputElement)?.value || '';
    const confirm = ($('forgot-confirm') as HTMLInputElement)?.value || '';

    let hasError = false;

    if (!code) { showFieldError('forgot-code-error', 'Ingresá el código.'); hasError = true; }
    const pwRules = validatePassword(newPass);
    if (!pwRules.valid) { showFieldError('forgot-newpass-error', 'La contraseña no cumple los requisitos.'); hasError = true; }
    if (newPass !== confirm) { showFieldError('forgot-confirm-error', 'Las contraseñas no coinciden.'); hasError = true; }
    if (hasError) return;

    setLoading('btn-forgot-confirm', true);
    try {
        const { confirmForgotPassword } = await import('./auth/client');
        await confirmForgotPassword(pendingEmail, code, newPass);
        showGlobalSuccess('¡Contraseña cambiada! Ya podés iniciar sesión.');
        showView('view-signin');
    } catch (err: any) {
        showGlobalError(mapCognitoError(err));
    } finally {
        setLoading('btn-forgot-confirm', false);
    }
}

async function handleGoogleSignIn(): Promise<void> {
    try {
        const { isCognitoConfigured, signInWithGoogle } = await import('./auth/client');
        if (!isCognitoConfigured()) {
            showGlobalError('Google Sign-In no está configurado todavía. Configurá las variables de Cognito en .env');
            return;
        }
        sessionStorage.setItem('easydrill-returnUrl', getReturnUrl());
        signInWithGoogle();
    } catch (err: any) {
        showGlobalError('Error al cargar el módulo de autenticación: ' + (err.message || ''));
    }
}

async function handleOAuthCallback(code: string): Promise<void> {
    showView('view-signin');
    setLoading('btn-signin', true);

    try {
        const { exchangeCodeForTokens, storeOAuthTokens } = await import('./auth/client');
        const { syncProfile } = await import('./auth/user');

        const tokens = await exchangeCodeForTokens(code);
        storeOAuthTokens(tokens);

        const returnUrl = sessionStorage.getItem('easydrill-returnUrl') || '/';
        sessionStorage.removeItem('easydrill-returnUrl');

        await syncProfile();
        window.history.replaceState({}, '', window.location.pathname);
        window.location.href = returnUrl;
    } catch (err: any) {
        showGlobalError('Error al iniciar sesión con Google: ' + (err.message || ''));
        setLoading('btn-signin', false);
    }
}

// ─── Start ───────────────────────────────────────────────────────
// ES modules (type="module") are deferred — DOM is ready when this runs
init();
