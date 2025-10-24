/* main.js
- Pokédex: 100 Pokémon
- Galería, autocompletado, modal con detalles/evoluciones
- Filtro por tipo
- Lazy loading de imágenes
*/

const ENDPOINT_LIST = "https://pokeapi.co/api/v2/pokemon?limit=100&offset=0";
const gallery = document.getElementById("gallery");
const input = document.getElementById("inputPokemon");
const btnBuscar = document.getElementById("btnBuscar");
const autocomplete = document.getElementById("autocomplete");
const btnRecargar = document.getElementById("btnRecargar");
const btnAzar = document.getElementById("btnAzar");
const modal = document.getElementById("modal");
const modalBody = document.getElementById("modalBody");
const modalClose = document.getElementById("modalClose");
const modalBackdrop = document.getElementById("modalBackdrop");
const container = document.querySelector(".container");

let allPokemons = [];
let pokemonTypes = [];
const placeholderImg = "https://via.placeholder.com/120x120?text=?";

// ---------- Utilities ----------
function capitalizar(text){ return String(text).charAt(0).toUpperCase() + String(text).slice(1); }
function obtenerColor(tipo){
  const colores = {
    grass: "#7ac74c", fire: "#ee8130", water: "#6390f0", electric: "#f7d02c",
    ice: "#96d9d6", fighting: "#c22e28", poison: "#a33ea1", ground: "#e2bf65",
    flying: "#a98ff3", psychic: "#f95587", bug: "#a6b91a", rock: "#b6a136",
    ghost: "#735797", dragon: "#6f35fc", dark: "#705746", steel: "#b7b7ce",
    fairy: "#d685ad", normal: "#a8a77a"
  };
  return colores[tipo] || "#6b7280";
}
function hexToRgba(hex, alpha=1){
  if(!hex) return `rgba(128,128,128,${alpha})`;
  const h = hex.replace('#','');
  const bigint = parseInt(h,16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

// ---------- Cargar lista ----------
async function cargarLista(){
  gallery.innerHTML = "";
  allPokemons = [];
  mostrarEstadoCargando(true);
  try{
    const res = await fetch(ENDPOINT_LIST);
    if(!res.ok) throw new Error("Error al obtener lista");
    const json = await res.json();
    allPokemons = json.results;
    const detallesPromises = allPokemons.map(p => fetch(p.url).then(r => r.json()).catch(()=>null));
    const detalles = await Promise.all(detallesPromises);
    allPokemons = allPokemons.map((p,i)=>({...p, details: detalles[i]}));

    // actualizar tipos para filtros
    const tiposSet = new Set();
    allPokemons.forEach(p=>p.details?.types?.forEach(t=>tiposSet.add(t.type.name)));
    pokemonTypes = Array.from(tiposSet).sort();

    renderFiltroTipos();
    renderGaleria();
  }catch(e){
    console.error(e);
    gallery.innerHTML = `<p style="color: #e2e8f0; padding:20px">No se pudo cargar la galería. Intentá recargar.</p>`;
  } finally {
    mostrarEstadoCargando(false);
  }
}

// ---------- Render galería ----------
function renderGaleria(filterType=null){
  gallery.innerHTML = "";
  allPokemons
    .filter(p => !filterType || (p.details?.types?.some(t=>t.type.name===filterType)))
    .forEach(p => {
      const detail = p.details;
      const card = document.createElement("article");
      card.className = "card";
      const tipoPrincipal = detail?.types?.[0]?.type?.name || null;
      const bg = obtenerColor(tipoPrincipal);
      card.style.background = `linear-gradient(180deg, rgba(255,255,255,0.02), ${hexToRgba(bg,0.12)})`;

      const spriteWrap = document.createElement("div");
      spriteWrap.className = "sprite";
      const img = document.createElement("img");
      img.alt = p.name;
      img.dataset.src = detail?.sprites?.other?.['official-artwork']?.front_default
                     || detail?.sprites?.front_default
                     || placeholderImg;
      img.src = placeholderImg;
      spriteWrap.appendChild(img);

      const title = document.createElement("h3");
      title.textContent = capitalizar(p.name);

      const badges = document.createElement("div");
      badges.className = "badges";
      if(detail?.types){
        detail.types.forEach(t=>{
          const b = document.createElement("span");
          b.className = "badge";
          b.textContent = capitalizar(t.type.name);
          b.style.background = hexToRgba(obtenerColor(t.type.name),0.12);
          b.style.color = obtenerColor(t.type.name);
          badges.appendChild(b);
        });
      }

      card.appendChild(spriteWrap);
      card.appendChild(title);
      card.appendChild(badges);

      card.addEventListener("click", ()=> mostrarDetalles(p));

      gallery.appendChild(card);
    });

  initLazyLoad();
}

// ---------- Filtro por tipo ----------
function renderFiltroTipos(){
  let containerFiltros = document.getElementById("tipoFilters");
  if(!containerFiltros){
    containerFiltros = document.createElement("div");
    containerFiltros.id = "tipoFilters";
    containerFiltros.style.display = "flex";
    containerFiltros.style.flexWrap = "wrap";
    containerFiltros.style.gap = "8px";
    container.insertBefore(containerFiltros, gallery);
  }
  containerFiltros.innerHTML = "";
  const btnAll = document.createElement("button");
  btnAll.textContent = "Todos";
  btnAll.onclick = ()=> renderGaleria();
  containerFiltros.appendChild(btnAll);

  pokemonTypes.forEach(t=>{
    const b = document.createElement("button");
    b.textContent = capitalizar(t);
    b.style.background = hexToRgba(obtenerColor(t),0.12);
    b.style.color = obtenerColor(t);
    b.onclick = ()=> renderGaleria(t);
    containerFiltros.appendChild(b);
  });
}

// ---------- Modal detalles ----------
async function mostrarDetalles(pokemonItem){
  const d = pokemonItem.details;
  if(!d){ alert("No hay detalles disponibles."); return; }

  modalBody.innerHTML = "";
  modal.classList.add("show");
  modal.setAttribute("aria-hidden","false");

  const left = document.createElement("div");
  left.className = "modal-left";
  const art = document.createElement("img");
  art.alt = d.name;
  art.src = d.sprites?.other?.['official-artwork']?.front_default || d.sprites.front_default || placeholderImg;
  const nombre = document.createElement("h2");
  nombre.textContent = capitalizar(d.name);
  left.appendChild(art);
  left.appendChild(nombre);

  const right = document.createElement("div");
  right.className = "modal-right";

  // meta
  const meta = document.createElement("div");
  meta.className = "meta";
  meta.innerHTML = `<div>Altura: ${(d.height/10).toFixed(1)} m</div><div>Peso: ${(d.weight/10).toFixed(1)} kg</div><div>ID: ${d.id}</div>`;
  right.appendChild(meta);

  // tipos
  const tipos = document.createElement("div");
  tipos.className = "badges";
  d.types.forEach(t=>{
    const s = document.createElement("span");
    s.className = "badge";
    s.textContent = capitalizar(t.type.name);
    s.style.background = hexToRgba(obtenerColor(t.type.name),0.12);
    s.style.color = obtenerColor(t.type.name);
    tipos.appendChild(s);
  });
  right.appendChild(tipos);

  // habilidades
  const habilidades = document.createElement("p");
  habilidades.innerHTML = `<strong>Habilidades:</strong> ${d.abilities.map(a=>a.ability.name).join(", ")}`;
  right.appendChild(habilidades);

  // stats
  const statsCont = document.createElement("div");
  statsCont.className = "stats";
  d.stats.forEach(s=>{
    const div = document.createElement("div");
    div.className = "stat";
    div.innerHTML = `<span style="text-transform:capitalize">${s.stat.name.replace("-"," ")}</span><strong>${s.base_stat}</strong>`;
    statsCont.appendChild(div);
  });
  right.appendChild(statsCont);

  // Evoluciones
  const evoTitle = document.createElement("h4");
  evoTitle.textContent = "Evoluciones:";
  right.appendChild(evoTitle);

  try{
    const speciesRes = await fetch(d.species.url);
    const species = await speciesRes.json();
    const evoRes = await fetch(species.evolution_chain.url);
    const evoData = await evoRes.json();
    const evoChainDiv = document.createElement("div");
    evoChainDiv.style.display="flex"; evoChainDiv.style.gap="6px"; evoChainDiv.style.flexWrap="wrap";

    let current = evoData.chain;
    do{
      const evoName = current.species.name;
      const imgRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${evoName}`);
      const evoDetail = await imgRes.json();
      const evoImg = document.createElement("img");
      evoImg.src = evoDetail.sprites?.front_default || placeholderImg;
      evoImg.alt = evoName;
      evoImg.style.width="60px"; evoImg.style.height="60px";
      evoImg.title = capitalizar(evoName);
      evoChainDiv.appendChild(evoImg);
      current = current.evolves_to[0];
    }while(current && current.species);
    right.appendChild(evoChainDiv);
  }catch(e){ console.warn("No se pudo cargar evoluciones."); }

  modalBody.appendChild(left);
  modalBody.appendChild(right);
}

// ---------- Cerrar modal ----------
function cerrarModal(){ modal.classList.remove("show"); modal.setAttribute("aria-hidden","true"); modalBody.innerHTML=""; }
modalClose.addEventListener("click", cerrarModal);
modalBackdrop.addEventListener("click", cerrarModal);
document.addEventListener("keydown", e=>{ if(e.key==="Escape") cerrarModal(); });

// ---------- Autocomplete ----------
function actualizarAutocomplete(valor){
  const q = valor.trim().toLowerCase();
  if(!q){ autocomplete.hidden=true; autocomplete.innerHTML=""; return; }
  const matches = allPokemons.filter(p => p.name.includes(q)).slice(0,12);
  autocomplete.innerHTML="";
  matches.forEach(m=>{
    const li = document.createElement("li");
    const img = document.createElement("img");
    img.src = m.details?.sprites?.front_default || placeholderImg;
    img.style.width="24px"; img.style.height="24px"; img.style.marginRight="6px"; img.style.verticalAlign="middle";
    li.appendChild(img);
    li.appendChild(document.createTextNode(capitalizar(m.name)));
    li.addEventListener("click", ()=>{ input.value = m.name; autocomplete.hidden=true; mostrarDetalles(m); });
    autocomplete.appendChild(li);
  });
  autocomplete.hidden = matches.length===0;
}
input.addEventListener("input", e=> actualizarAutocomplete(e.target.value));
input.addEventListener("keydown", e=>{ if(e.key==="Enter"){ e.preventDefault(); buscarYMostrar(input.value.trim()); autocomplete.hidden=true; } });

// ---------- Búsqueda ----------
btnBuscar.addEventListener("click", ()=> buscarYMostrar(input.value.trim()));
async function buscarYMostrar(nombre){
  if(!nombre){ alert("Escribí un nombre o elegí uno de la galería."); return; }
  const match = allPokemons.find(p => p.name.toLowerCase()===nombre.toLowerCase());
  if(match?.details){ mostrarDetalles(match); return; }
  try{
    mostrarEstadoCargando(true);
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${nombre.toLowerCase()}`);
    if(!res.ok) throw new Error("No encontrado");
    const data = await res.json();
    mostrarDetalles({name:data.name,url:`https://pokeapi.co/api/v2/pokemon/${data.id}/`,details:data});
    window.scrollTo({top:0,behavior:"smooth"});
  }catch(e){ alert("Pokémon no encontrado."); }
  finally{ mostrarEstadoCargando(false); }
}

// ---------- Botones auxiliares ----------
btnRecargar.addEventListener("click", cargarLista);
btnAzar.addEventListener("click", ()=>{
  if(allPokemons.length===0) return;
  const idx = Math.floor(Math.random()*allPokemons.length);
  mostrarDetalles(allPokemons[idx]);
});

// ---------- Lazy Loading ----------
const lazyLoad = new IntersectionObserver((entries, observer)=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      const img = entry.target;
      img.src = img.dataset.src;
      observer.unobserve(img);
    }
  });
},{root:null, rootMargin:"50px", threshold:0.1});
function initLazyLoad(){
  const imgs = document.querySelectorAll("#gallery img");
  imgs.forEach(img=>lazyLoad.observe(img));
}

// ---------- Estado de carga ----------
let cargandoOverlay;
function mostrarEstadoCargando(activo){
  if(activo){
    if(!cargandoOverlay){
      cargandoOverlay = document.createElement("div");
      cargandoOverlay.style.position="fixed"; cargandoOverlay.style.inset="12px";
      cargandoOverlay.style.zIndex=1000; cargandoOverlay.style.display="flex";
      cargandoOverlay.style.alignItems="center"; cargandoOverlay.style.justifyContent="center";
      cargandoOverlay.innerHTML = `<div style="background:rgba(0,0,0,0.6);padding:14px;border-radius:12px;color:#fff;font-weight:700">Cargando...</div>`;
      document.body.appendChild(cargandoOverlay);
    }
  } else if(cargandoOverlay){ cargandoOverlay.remove(); cargandoOverlay=null; }
}

// ---------- Inicialización ----------
cargarLista();
