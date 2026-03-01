import"./modulepreload-polyfill-3cfb730f.js";import{i as w}from"./nav-auth-1aae0094.js";/* empty css                    */import{E as b}from"./ExerciseStorage-321cadc6.js";import{initAuth as $}from"./user-58edc8be.js";import"./client-c375c8af.js";async function k(){await $(),w();const v=new b;let E=[];const i=document.getElementById("cuaderno-grid"),s=document.getElementById("cuaderno-empty"),a=document.getElementById("search-input"),u=document.getElementById("btn-reset-filters"),L=document.getElementById("exercise-count-msg"),t=document.getElementById("delete-modal"),f=document.getElementById("btn-cancel-delete"),g=document.getElementById("btn-confirm-delete");let c=null;async function p(){E=await v.list(),h()}function h(){const d=((a==null?void 0:a.value)||"").toLowerCase().trim(),n=E.filter(e=>{var l;const r=(e.title||"").toLowerCase().includes(d),o=(l=e.tags)==null?void 0:l.some(m=>m.label.toLowerCase().includes(d));return r||o});if(L&&(L.textContent=`${n.length} ejercicio${n.length!==1?"s":""}`),n.length===0){i==null||i.classList.add("hidden"),s==null||s.classList.remove("hidden");return}i==null||i.classList.remove("hidden"),s==null||s.classList.add("hidden"),i&&(i.innerHTML=n.map(e=>{const r=e.thumbnail||'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f0f0f0"/><text x="50" y="50" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20" fill="%23aaa">Sin miniatura</text></svg>',o=new Date(e.updatedAt).toLocaleDateString(),l=(e.tags||[]).map(m=>`<span class="tag tag-${m.color}">${y(m.label)}</span>`).join("");return`
                <div class="marketplace-card" data-id="${e.id}">
                    <div class="carousel-thumb">
                        <img src="${r}" alt="Miniatura">
                    </div>
                    <div class="carousel-body">
                        <h4>${y(e.title)}</h4>
                        <p>Última mod: ${o}</p>
                        ${l?`<div class="carousel-tags" style="margin-bottom: 0.5rem;">${l}</div>`:""}
                        
                        <div class="marketplace-card-actions">
                            <a href="ejercicio.html?id=${e.id}" class="card-action-link" title="Ver Descripción"><i class="fa-solid fa-eye"></i></a>
                            <a href="editor.html?id=${e.id}" class="cuaderno-action-edit" title="Editar Pizarra"><i class="fa-solid fa-pen-ruler"></i></a>
                            <button type="button" class="cuaderno-action-delete" aria-label="Eliminar" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                </div>
                `}).join(""),i.querySelectorAll(".cuaderno-action-delete").forEach(e=>{e.addEventListener("click",r=>{const o=r.currentTarget.closest(".marketplace-card");o&&(c=o.getAttribute("data-id"),t==null||t.classList.remove("hidden"))})}))}function y(d){const n=document.createElement("div");return n.textContent=d,n.innerHTML}a==null||a.addEventListener("input",h),u==null||u.addEventListener("click",()=>{a&&(a.value=""),h()}),f==null||f.addEventListener("click",()=>{c=null,t==null||t.classList.add("hidden")}),g==null||g.addEventListener("click",async()=>{c&&(await v.delete(c),c=null,t==null||t.classList.add("hidden"),await p())}),t==null||t.addEventListener("click",d=>{d.target===t&&(c=null,t.classList.add("hidden"))}),await p()}document.body.classList.contains("cuaderno-page")&&k();
