import{initAuth as c,onAuthStateChange as u,isLoggedIn as m,getProfile as v,logout as d}from"./user-58edc8be.js";async function p(){u(l),await c(),l()}function l(f){const n=document.querySelector(".home-nav-login");if(n)if(m()){const e=v(),r=(e==null?void 0:e.displayName)||(e==null?void 0:e.email)||"Mi cuenta";if(!n.parentElement)return;const i=document.getElementById("nav-user-info");if(i){const a=i.querySelector(".nav-user-name");a&&(a.textContent=r);return}const t=document.createElement("div");t.id="nav-user-info",t.className="nav-user-info",t.innerHTML=`
      ${e!=null&&e.avatarUrl?`<img src="${e.avatarUrl}" alt="Avatar" class="nav-user-avatar" />`:'<i class="fa-solid fa-user-circle nav-user-icon"></i>'}
      <a href="perfil.html" class="nav-user-name">${r}</a>
      <a href="#" class="nav-logout-link" title="Cerrar sesión">
        <i class="fa-solid fa-right-from-bracket"></i>
      </a>
    `,t.style.cssText="display:flex;align-items:center;gap:8px;";const s=document.createElement("style");s.textContent=`
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
    `,document.head.appendChild(s),n.replaceWith(t);const o=t.querySelector(".nav-logout-link");o==null||o.addEventListener("click",a=>{a.preventDefault(),d(),window.location.reload()})}else n.setAttribute("href",`login.html?returnUrl=${encodeURIComponent(window.location.pathname)}`)}export{p as i};
