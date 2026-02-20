/**
 * Página Tu perfil: datos desde localStorage (tipo de perfil) y placeholders para stats.
 * Cuando exista auth/backend, se cargarán nombre, foto, bio y estadísticas reales.
 */

const PROFILE_STORAGE_KEY = 'easydrill-profile';
const ROLE_LABELS: Record<string, string> = {
  entrenador: 'Entrenador',
  club: 'Coordinador / Club',
};

function initPerfil(): void {
  const nameEl = document.getElementById('perfil-name');
  const roleEl = document.getElementById('perfil-role');
  const bioEl = document.getElementById('perfil-bio');
  const statEjercicios = document.getElementById('stat-ejercicios');
  const statForos = document.getElementById('stat-foros');
  const statForks = document.getElementById('stat-forks');

  try {
    const profile = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (profile === 'entrenador' || profile === 'club') {
      if (roleEl) roleEl.textContent = ROLE_LABELS[profile];
    }
  } catch {
    /* ignore */
  }

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

if (document.body.classList.contains('perfil-page')) {
  initPerfil();
}
