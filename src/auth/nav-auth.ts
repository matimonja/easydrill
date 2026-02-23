/**
 * Nav Auth Module
 *
 * Updates the navigation header on every page:
 * - If logged in: shows user name/avatar + "Cerrar sesión" link
 * - If not logged in: shows "Iniciar sesión" link to login.html
 *
 * Import this module in every page entry to enable auth-aware nav.
 */

import { initAuth, onAuthStateChange, getProfile, isLoggedIn, logout, type UserState } from './user';

// ─── Init ────────────────────────────────────────────────────────

export async function initNavAuth(): Promise<void> {
    // Listen to state changes
    onAuthStateChange(updateNav);

    // Try to restore existing session
    await initAuth();

    // Also update immediately with current state
    updateNav(null);
}

// ─── Update Nav ──────────────────────────────────────────────────

function updateNav(_state: UserState | null): void {
    const loginLink = document.querySelector('.home-nav-login') as HTMLElement;
    if (!loginLink) return;

    if (isLoggedIn()) {
        const profile = getProfile();
        const displayName = profile?.displayName || profile?.email || 'Mi cuenta';

        // Replace login link with user info
        const parent = loginLink.parentElement;
        if (!parent) return;

        // Check if we already inserted the user nav
        const existing = document.getElementById('nav-user-info');
        if (existing) {
            // Update text
            const nameEl = existing.querySelector('.nav-user-name');
            if (nameEl) nameEl.textContent = displayName;
            return;
        }

        // Create user nav element
        const userNav = document.createElement('div');
        userNav.id = 'nav-user-info';
        userNav.className = 'nav-user-info';
        userNav.innerHTML = `
      ${profile?.avatarUrl
                ? `<img src="${profile.avatarUrl}" alt="Avatar" class="nav-user-avatar" />`
                : `<i class="fa-solid fa-user-circle nav-user-icon"></i>`
            }
      <a href="perfil.html" class="nav-user-name">${displayName}</a>
      <a href="#" class="nav-logout-link" title="Cerrar sesión">
        <i class="fa-solid fa-right-from-bracket"></i>
      </a>
    `;

        // Add styles inline (they'll work on any page without needing page-specific CSS)
        userNav.style.cssText = 'display:flex;align-items:center;gap:8px;';
        const style = document.createElement('style');
        style.textContent = `
      .nav-user-info {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .nav-user-avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        object-fit: cover;
      }
      .nav-user-icon {
        font-size: 1.3rem;
        color: #94a3b8;
      }
      .nav-user-name {
        color: #e2e8f0;
        text-decoration: none;
        font-size: 0.88rem;
        font-weight: 500;
      }
      .nav-user-name:hover {
        color: #3b82f6;
      }
      .nav-logout-link {
        color: #64748b;
        font-size: 0.9rem;
        text-decoration: none;
        margin-left: 4px;
        transition: color 0.2s;
      }
      .nav-logout-link:hover {
        color: #ef4444;
      }
    `;
        document.head.appendChild(style);

        // Replace the login link
        loginLink.replaceWith(userNav);

        // Attach logout handler
        const logoutLink = userNav.querySelector('.nav-logout-link');
        logoutLink?.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
            window.location.reload();
        });

    } else {
        // Ensure login link points to login.html with returnUrl
        loginLink.setAttribute('href', `login.html?returnUrl=${encodeURIComponent(window.location.pathname)}`);
    }
}
