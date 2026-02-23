/**
 * Página Tu perfil: datos desde backend (si autenticado) o localStorage (fallback).
 * Permite editar rol y nombre cuando hay sesión activa.
 */

import { initNavAuth } from './auth/nav-auth';
import { initAuth, getProfile, getUserState, isLoggedIn, fetchWithAuth, syncProfile } from './auth/user';
import { getPlanName, type PlanId } from './config/plans';

const ROLE_LABELS: Record<string, string> = {
  entrenador: 'Entrenador',
  club: 'Coordinador / Club',
};

async function initPerfil(): Promise<void> {
  await initAuth();
  initNavAuth();

  const nameEl = document.getElementById('perfil-name');
  const roleEl = document.getElementById('perfil-role');
  const bioEl = document.getElementById('perfil-bio');
  const statEjercicios = document.getElementById('stat-ejercicios');
  const statForos = document.getElementById('stat-foros');
  const statForks = document.getElementById('stat-forks');

  if (isLoggedIn()) {
    const state = getUserState();
    const profile = getProfile();

    if (profile) {
      if (nameEl) nameEl.textContent = profile.displayName || profile.email;
      if (roleEl) roleEl.textContent = ROLE_LABELS[profile.role] || profile.role;
      if (bioEl) bioEl.textContent = profile.bio || 'Sin presentación aún.';
    }

    if (state?.usage) {
      if (statEjercicios) statEjercicios.textContent = String(state.usage.exercises_saved);
    }

    // Show plan badge
    if (state?.planId) {
      const planBadge = document.getElementById('perfil-plan');
      if (planBadge) {
        planBadge.textContent = getPlanName(state.planId);
        planBadge.style.display = 'inline-block';
      }
    }

    // Enable role editing
    const editLink = document.querySelector('.perfil-edit-link');
    if (editLink) {
      editLink.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!profile) return;

        const newRole = profile.role === 'entrenador' ? 'club' : 'entrenador';
        try {
          await fetchWithAuth('/api/me', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole }),
          });
          await syncProfile();
          if (roleEl) roleEl.textContent = ROLE_LABELS[newRole] || newRole;
        } catch (err) {
          console.error('Failed to update role:', err);
        }
      });
    }

  } else {
    // Not logged in — show localStorage data as fallback
    try {
      const profile = localStorage.getItem('easydrill-profile');
      if (profile === 'entrenador' || profile === 'club') {
        if (roleEl) roleEl.textContent = ROLE_LABELS[profile];
      }
    } catch { /* ignore */ }

    if (nameEl) {
      const saved = localStorage.getItem('easydrill-profile-name');
      if (saved) nameEl.textContent = saved;
    }
    if (bioEl) {
      const saved = localStorage.getItem('easydrill-profile-bio');
      if (saved) bioEl.textContent = saved;
    }
    if (statEjercicios) {
      const n = localStorage.getItem('easydrill-stat-ejercicios');
      statEjercicios.textContent = n ?? '0';
    }
    if (statForos) {
      const n = localStorage.getItem('easydrill-stat-foros');
      statForos.textContent = n ?? '0';
    }
    if (statForks) {
      const n = localStorage.getItem('easydrill-stat-forks');
      statForks.textContent = n ?? '0';
    }
  }
}

if (document.body.classList.contains('perfil-page')) {
  initPerfil();
}
