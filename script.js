/* ============================================================
   GATHERED AT THE TABLE — Main JavaScript
   Cookbook interactive features
   ============================================================ */

/* ============================================================
   STATE
   ============================================================ */
const STATE = {
  recipes: [],
  categories: [],
  currentRecipe: null,
  currentCategory: 'all',
  servingMultiplier: 1,
  baseServings: 1,
  checkedIngredients: {},   // { recipeId: Set of indices }
  favourites: new Set(),
  fontSizes: ['small', 'medium', 'large'],
  currentFont: 'medium',
};


/* ============================================================
   UTILITIES
   ============================================================ */

/** Debounce a function call */
function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

/** Convert fraction strings to numbers for scaling */
function parseFraction(str) {
  if (!str) return null;
  const fractionMap = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 0.333, '⅔': 0.667, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 };
  let s = str.trim();
  // Replace unicode fractions
  for (const [frac, val] of Object.entries(fractionMap)) { s = s.replace(frac, val); }
  // Match: "1.5 tbsp", "2 cloves", "3-4 tbsp"
  const match = s.match(/^([\d.]+)/);
  if (match) return parseFloat(match[1]);
  return null;
}

/** Scale an amount string by a multiplier */
function scaleAmount(amountStr, multiplier) {
  if (!amountStr || multiplier === 1) return amountStr;
  const fractionMap = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 0.333, '⅔': 0.667, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 };
  let s = amountStr;
  for (const [frac, val] of Object.entries(fractionMap)) { s = s.replace(frac, String(val)); }
  // Find numeric prefix
  const numMatch = s.match(/^([\d.]+)\s*(.*)/);
  if (!numMatch) return amountStr;
  const base = parseFloat(numMatch[1]);
  const unit = numMatch[2];
  const scaled = base * multiplier;
  // Pretty-print the result
  const pretty = scaled % 1 === 0 ? scaled : Math.round(scaled * 10) / 10;
  return `${pretty}${unit ? ' ' + unit : ''}`;
}

/** Capitalize first letter */
function cap(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

/** Category ID to display name */
function categoryName(id) {
  const cat = STATE.categories.find(c => c.id === id);
  return cat ? cat.name : cap(id);
}

/** Save data to localStorage */
function lsSave(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) {}
}

/** Load data from localStorage */
function lsLoad(key, fallback) {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? JSON.parse(val) : fallback;
  } catch(e) { return fallback; }
}

/** Persist checked ingredients state */
function persistChecked() {
  const toSave = {};
  for (const [id, set] of Object.entries(STATE.checkedIngredients)) {
    toSave[id] = [...set];
  }
  lsSave('gatt_checked', toSave);
}

/** Load checked ingredients state */
function loadChecked() {
  const saved = lsLoad('gatt_checked', {});
  for (const [id, arr] of Object.entries(saved)) {
    STATE.checkedIngredients[id] = new Set(arr);
  }
}

/** Persist favourites */
function persistFavourites() {
  lsSave('gatt_favourites', [...STATE.favourites]);
}

/** Load favourites */
function loadFavourites() {
  const saved = lsLoad('gatt_favourites', []);
  STATE.favourites = new Set(saved);
}


/* ============================================================
   BOTANICAL SVG ILLUSTRATIONS
   Monochrome line drawings in the palette
   ============================================================ */
const ILLUSTRATIONS = {
  steam: `<svg viewBox="0 0 40 60" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round">
    <path d="M10 50 Q12 40 8 30 Q4 20 10 10"/>
    <path d="M20 50 Q22 38 18 28 Q14 18 20 8"/>
    <path d="M30 50 Q32 40 28 30 Q24 20 30 10"/>
  </svg>`,

  granola: `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.2">
    <ellipse cx="25" cy="35" rx="18" ry="10" stroke-width="1.5"/>
    <ellipse cx="15" cy="22" rx="5" ry="3" transform="rotate(-20 15 22)"/>
    <ellipse cx="28" cy="20" rx="4" ry="2.5" transform="rotate(10 28 20)"/>
    <ellipse cx="22" cy="16" rx="3" ry="2" transform="rotate(-5 22 16)"/>
    <circle cx="32" cy="25" r="2"/>
    <circle cx="18" cy="28" r="1.5"/>
  </svg>`,

  bread: `<svg viewBox="0 0 60 45" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.2">
    <path d="M8 32 Q8 14 30 12 Q52 14 52 32 L52 38 Q52 42 48 42 L12 42 Q8 42 8 38 Z"/>
    <path d="M12 42 L12 35"/>
    <path d="M20 42 L20 35"/>
    <path d="M28 42 L28 35"/>
    <path d="M36 42 L36 35"/>
    <path d="M44 42 L44 35"/>
    <path d="M15 20 Q25 17 35 20" stroke-linecap="round"/>
  </svg>`,

  'mixing-bowl': `<svg viewBox="0 0 60 50" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.2">
    <path d="M8 20 Q8 42 30 42 Q52 42 52 20"/>
    <line x1="5" y1="20" x2="55" y2="20"/>
    <path d="M48 20 Q52 14 54 8" stroke-linecap="round"/>
    <ellipse cx="30" cy="20" rx="22" ry="4"/>
  </svg>`,

  parsley: `<svg viewBox="0 0 50 60" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.2">
    <path d="M25 55 Q24 40 25 25 Q26 12 25 5" stroke-width="1.5"/>
    <path d="M25 40 Q15 35 10 25 Q18 22 25 28"/>
    <path d="M25 30 Q35 25 40 15 Q32 12 25 20"/>
    <path d="M25 48 Q16 44 12 36 Q20 34 25 40"/>
  </svg>`,

  jar: `<svg viewBox="0 0 45 60" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.2">
    <rect x="12" y="8" width="21" height="5" rx="2"/>
    <path d="M10 13 Q8 15 8 20 L8 50 Q8 54 12 54 L33 54 Q37 54 37 50 L37 20 Q37 15 35 13 Z"/>
    <line x1="8" y1="24" x2="37" y2="24"/>
    <path d="M16 35 Q22 31 29 35" stroke-linecap="round"/>
  </svg>`,

  lemon: `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.2">
    <ellipse cx="25" cy="26" rx="16" ry="18" transform="rotate(-15 25 26)"/>
    <path d="M22 10 Q24 6 27 8" stroke-linecap="round"/>
    <path d="M25 14 L25 38 M14 26 L36 26 M17 17 L33 35 M17 35 L33 17" opacity="0.4"/>
  </svg>`,

  carrot: `<svg viewBox="0 0 40 65" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.2">
    <path d="M20 55 Q12 50 10 35 Q8 20 20 10 Q32 20 30 35 Q28 50 20 55 Z"/>
    <path d="M18 10 Q16 4 12 2"/><path d="M20 8 Q20 2 20 0"/>
    <path d="M22 10 Q25 4 28 2"/>
    <path d="M12 28 Q8 26 6 24" stroke-linecap="round"/>
    <path d="M12 35 Q8 35 6 36" stroke-linecap="round"/>
  </svg>`,

  'olive-branch': `<svg viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.2">
    <path d="M50 145 Q48 120 45 100 Q42 80 50 60 Q58 40 52 10" stroke-width="1.8"/>
    <ellipse cx="35" cy="115" rx="11" ry="7" transform="rotate(-30 35 115)"/>
    <ellipse cx="62" cy="95" rx="11" ry="7" transform="rotate(25 62 95)"/>
    <ellipse cx="34" cy="78" rx="11" ry="7" transform="rotate(-35 34 78)"/>
    <ellipse cx="60" cy="60" rx="11" ry="7" transform="rotate(20 60 60)"/>
    <ellipse cx="38" cy="45" rx="9" ry="5" transform="rotate(-30 38 45)"/>
    <ellipse cx="55" cy="30" rx="9" ry="5" transform="rotate(30 55 30)"/>
    <line x1="50" y1="115" x2="35" y2="115"/>
    <line x1="50" y1="95" x2="62" y2="95"/>
    <line x1="48" y1="78" x2="34" y2="78"/>
    <line x1="49" y1="60" x2="60" y2="60"/>
    <line x1="46" y1="45" x2="38" y2="45"/>
    <line x1="48" y1="30" x2="55" y2="30"/>
  </svg>`,

  mushroom: `<svg viewBox="0 0 50 55" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.2">
    <path d="M20 55 L20 32 Q25 28 30 32 L30 55"/>
    <path d="M18 55 L32 55"/>
    <path d="M8 32 Q8 12 25 10 Q42 12 42 32 Q38 38 25 38 Q12 38 8 32 Z"/>
    <path d="M15 20 Q20 16 25 20" stroke-linecap="round" opacity="0.5"/>
    <path d="M28 18 Q33 14 36 18" stroke-linecap="round" opacity="0.5"/>
  </svg>`,

  tomato: `<svg viewBox="0 0 50 55" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.2">
    <circle cx="25" cy="32" r="18"/>
    <path d="M20 14 Q22 8 25 6"/><path d="M25 6 Q28 8 30 14"/>
    <path d="M25 6 L25 14"/>
    <path d="M19 20 Q25 16 31 20" stroke-linecap="round" opacity="0.5"/>
  </svg>`,

  whisk: `<svg viewBox="0 0 35 65" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.2">
    <line x1="17" y1="5" x2="17" y2="28"/>
    <path d="M10 28 Q6 20 8 14 Q12 8 17 14 Q22 8 26 14 Q28 20 24 28 Z"/>
    <path d="M10 28 Q17 32 24 28"/>
    <path d="M17 32 L17 60" stroke-width="1.5"/>
  </svg>`,

  'wooden-spoon': `<svg viewBox="0 0 30 70" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.2">
    <path d="M15 65 L15 28"/>
    <ellipse cx="15" cy="18" rx="9" ry="14"/>
    <ellipse cx="15" cy="20" rx="5" ry="8" opacity="0.3"/>
  </svg>`,

  garlic: `<svg viewBox="0 0 45 55" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.2">
    <path d="M22 48 Q14 46 12 36 Q10 26 17 20 Q16 14 22 12 Q28 14 28 20 Q35 26 33 36 Q31 46 22 48 Z"/>
    <path d="M22 12 L22 5"/>
    <path d="M18 8 Q20 4 22 5 Q24 4 26 8"/>
    <path d="M17 32 Q15 28 16 24" stroke-linecap="round" opacity="0.5"/>
  </svg>`,

  onion: `<svg viewBox="0 0 50 55" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.2">
    <path d="M25 50 Q12 48 10 35 Q8 22 18 16 Q22 14 25 16 Q28 14 32 16 Q42 22 40 35 Q38 48 25 50 Z"/>
    <path d="M25 16 L24 8 Q25 4 26 8 L25 16"/>
    <path d="M18 28 Q14 24 14 20" stroke-linecap="round" opacity="0.4"/>
    <path d="M20 35 Q16 32 16 28" stroke-linecap="round" opacity="0.4"/>
    <path d="M32 28 Q36 24 36 20" stroke-linecap="round" opacity="0.4"/>
  </svg>`,

  beetroot: `<svg viewBox="0 0 48 65" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.2">
    <ellipse cx="24" cy="40" rx="17" ry="20"/>
    <path d="M24 20 L24 8"/>
    <path d="M18 12 Q22 6 24 8 Q26 6 30 12"/>
    <path d="M24 58 Q28 62 26 65" stroke-linecap="round"/>
    <path d="M15 34 Q12 30 13 26" stroke-linecap="round" opacity="0.4"/>
  </svg>`,
};


/* ============================================================
   DATA LOADING
   ============================================================ */

async function loadData() {
  try {
    const resp = await fetch('recipes.json');
    const data = await resp.json();
    STATE.recipes = data.recipes;
    STATE.categories = data.categories;
    return data;
  } catch (err) {
    console.error('Failed to load recipes.json:', err);
    return null;
  }
}


/* ============================================================
   RENDER: CATEGORIES GRID
   ============================================================ */
function renderCategoriesGrid() {
  const grid = document.getElementById('categoriesGrid');
  if (!grid) return;

  const allBtn = document.createElement('button');
  allBtn.className = 'category-card' + (STATE.currentCategory === 'all' ? ' active' : '');
  allBtn.setAttribute('aria-pressed', STATE.currentCategory === 'all');
  allBtn.innerHTML = `
    <div class="category-icon" aria-hidden="true">${ILLUSTRATIONS['olive-branch'] || ''}</div>
    <span class="category-name">All Recipes</span>
    <span class="category-desc">${STATE.recipes.length} recipes</span>`;
  allBtn.addEventListener('click', () => filterByCategory('all'));
  grid.appendChild(allBtn);

  STATE.categories.forEach(cat => {
    const count = STATE.recipes.filter(r => r.category === cat.id).length;
    if (count === 0) return;
    const btn = document.createElement('button');
    btn.className = 'category-card' + (STATE.currentCategory === cat.id ? ' active' : '');
    btn.setAttribute('aria-pressed', STATE.currentCategory === cat.id);
    const illKey = cat.illustration || 'parsley';
    btn.innerHTML = `
      <div class="category-icon" aria-hidden="true">${ILLUSTRATIONS[illKey] || ''}</div>
      <span class="category-name">${cat.name}</span>
      <span class="category-desc">${count} recipe${count > 1 ? 's' : ''}</span>`;
    btn.addEventListener('click', () => filterByCategory(cat.id));
    grid.appendChild(btn);
  });
}

function filterByCategory(catId) {
  STATE.currentCategory = catId;
  // Update active states
  document.querySelectorAll('.category-card').forEach((btn, i) => {
    const isAll = i === 0;
    const matches = isAll ? catId === 'all' : btn.querySelector('.category-name').textContent !== 'All Recipes' &&
      STATE.categories.find(c => c.name === btn.querySelector('.category-name').textContent)?.id === catId;
    btn.classList.toggle('active', isAll ? catId === 'all' : matches);
    btn.setAttribute('aria-pressed', isAll ? catId === 'all' : matches);
  });
  renderRecipesIndex();
}


/* ============================================================
   RENDER: RECIPES INDEX
   ============================================================ */
function renderRecipesIndex() {
  const container = document.getElementById('recipesIndex');
  if (!container) return;
  container.innerHTML = '';

  const filtered = STATE.currentCategory === 'all'
    ? STATE.recipes
    : STATE.recipes.filter(r => r.category === STATE.currentCategory);

  if (filtered.length === 0) {
    container.innerHTML = `<p style="text-align:center; color: var(--color-text-muted); padding: 3rem 0;">No recipes found in this category.</p>`;
    return;
  }

  // Group by category
  const groups = {};
  filtered.forEach(r => {
    if (!groups[r.category]) groups[r.category] = [];
    groups[r.category].push(r);
  });

  Object.entries(groups).forEach(([catId, recipes]) => {
    const group = document.createElement('div');
    group.className = 'category-group fade-in';

    const catNameText = categoryName(catId);
    group.innerHTML = `
      <div class="category-group-header">
        <h3 class="category-group-title">${catNameText}</h3>
        <div class="category-group-line" aria-hidden="true"></div>
      </div>
      <div class="recipes-grid" id="grid-${catId}"></div>`;
    container.appendChild(group);

    const gridEl = group.querySelector('.recipes-grid');
    recipes.forEach(recipe => {
      const card = buildRecipeCard(recipe);
      gridEl.appendChild(card);
    });

    // Observe for fade-in
    observeFadeIn(group);
  });
}

/** Build a recipe card element */
function buildRecipeCard(recipe) {
  const isFav = STATE.favourites.has(recipe.id);
  const card = document.createElement('article');
  card.className = 'recipe-card fade-in';
  card.setAttribute('tabindex', '0');
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `View recipe: ${recipe.title}`);

  const tagsList = (recipe.tags || [])
    .filter(t => ['vegan', 'vegetarian', 'gluten-free'].includes(t))
    .map(t => `<span class="diet-tag ${t}">${t === 'gluten-free' ? 'GF' : cap(t)}</span>`)
    .join('');

  card.innerHTML = `
    <div class="recipe-card-img-wrap">
      <img class="recipe-card-img" src="${recipe.image || ''}" alt="${recipe.title}" loading="lazy"
           onerror="this.style.display='none'" />
      <button class="fav-btn${isFav ? ' active' : ''}" data-id="${recipe.id}" aria-label="${isFav ? 'Remove from' : 'Add to'} favourites" aria-pressed="${isFav}">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" stroke-width="1.5"/>
        </svg>
      </button>
    </div>
    <div class="recipe-card-body">
      <p class="recipe-card-category">${categoryName(recipe.category)}</p>
      <h3 class="recipe-card-title">${recipe.title}</h3>
      <p class="recipe-card-description">${recipe.description}</p>
      <div class="diet-tags">${tagsList}</div>
      <div class="recipe-card-meta">
        <span class="recipe-card-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
          ${recipe.totalTime || recipe.prepTime}
        </span>
        <span class="recipe-card-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          Serves ${recipe.serves}
        </span>
      </div>
    </div>`;

  // Click to open recipe
  card.addEventListener('click', (e) => {
    if (e.target.closest('.fav-btn')) return; // Don't open recipe when clicking fav
    openRecipe(recipe.id);
  });

  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openRecipe(recipe.id);
    }
  });

  // Favourite button
  card.querySelector('.fav-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFavourite(recipe.id, e.currentTarget);
  });

  return card;
}


/* ============================================================
   RENDER: RECIPE DETAIL
   ============================================================ */
function openRecipe(id) {
  const recipe = STATE.recipes.find(r => r.id === id);
  if (!recipe) return;
  STATE.currentRecipe = recipe;
  STATE.servingMultiplier = 1;
  STATE.baseServings = recipe.serves;

  // Hide home, show recipe
  const homeSection = document.querySelector('.hero');
  const contentsSection = document.getElementById('contents');
  const recipeSection = document.getElementById('recipeSection');
  const favSection = document.getElementById('favouritesSection');

  if (homeSection) homeSection.hidden = true;
  if (contentsSection) contentsSection.hidden = true;
  if (favSection) favSection.hidden = true;
  recipeSection.hidden = false;

  // Build and inject recipe HTML
  const container = document.getElementById('recipeContainer');
  container.innerHTML = '';
  container.appendChild(buildRecipeDetail(recipe));

  // Restore checked state
  restoreChecked(recipe.id);

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Update browser history
  history.pushState({ page: 'recipe', id }, '', `#recipe/${id}`);
}

function buildRecipeDetail(recipe) {
  const isFav = STATE.favourites.has(recipe.id);
  const frag = document.createDocumentFragment();

  const wrapper = document.createElement('div');
  wrapper.className = 'recipe-detail';

  // ---- BACK BUTTON ----
  const backBtn = document.createElement('a');
  backBtn.href = '#';
  backBtn.className = 'recipe-back';
  backBtn.setAttribute('aria-label', 'Back to all recipes');
  backBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><polyline points="15,18 9,12 15,6"/></svg> All recipes`;
  backBtn.addEventListener('click', (e) => { e.preventDefault(); closePage(); });
  wrapper.appendChild(backBtn);

  // ---- RECIPE HERO ----
  const hero = document.createElement('div');
  hero.className = 'recipe-hero';

  // Meta bar
  const tags = (recipe.tags || []).filter(t => ['vegan','vegetarian','gluten-free'].includes(t));
  const tagsHtml = tags.map(t => `<span class="diet-tag ${t}">${t === 'gluten-free' ? 'Gluten Free' : cap(t)}</span>`).join('');

  hero.innerHTML = `
    <div class="recipe-meta-bar">
      <span class="recipe-category-label">${categoryName(recipe.category)}</span>
      ${tagsHtml ? `<span aria-hidden="true">·</span> ${tagsHtml}` : ''}
    </div>
    <h1 class="recipe-title">${recipe.title}</h1>
    <p class="recipe-description-large">${recipe.description}</p>`;

  // Actions bar
  const actionsBar = document.createElement('div');
  actionsBar.className = 'recipe-actions';

  // Fav button
  const favBtn = document.createElement('button');
  favBtn.className = `fav-btn-large${isFav ? ' active' : ''}`;
  favBtn.setAttribute('aria-pressed', isFav);
  favBtn.setAttribute('aria-label', isFav ? 'Remove from favourites' : 'Save to favourites');
  favBtn.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" stroke-width="1.5"/></svg>${isFav ? 'Saved' : 'Save recipe'}`;
  favBtn.addEventListener('click', () => toggleFavourite(recipe.id, favBtn));
  actionsBar.appendChild(favBtn);

  // Print button
  const printBtn = document.createElement('button');
  printBtn.className = 'print-btn';
  printBtn.setAttribute('aria-label', 'Print this recipe');
  printBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><polyline points="6,9 6,2 18,2 18,9"/><path d="M6 18H4a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> Print recipe`;
  printBtn.addEventListener('click', () => printRecipe(recipe));
  actionsBar.appendChild(printBtn);

  hero.appendChild(actionsBar);

  // Prep cards
  const prepGrid = document.createElement('div');
  prepGrid.className = 'recipe-prep-grid';
  const prepItems = [
    { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>`, label: 'Prep', value: recipe.prepTime },
    { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 2v4M16 2v4M3 10h18M21 8H3a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1Z"/></svg>`, label: 'Cook', value: recipe.cookTime || '—' },
    { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`, label: 'Serves', value: recipe.serves },
    { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>`, label: 'Difficulty', value: recipe.difficulty },
  ];
  prepItems.forEach(item => {
    const card = document.createElement('div');
    card.className = 'prep-card';
    card.innerHTML = `
      <div class="prep-card-icon" aria-hidden="true">${item.icon}</div>
      <div class="prep-card-value">${item.value}</div>
      <div class="prep-card-label">${item.label}</div>`;
    prepGrid.appendChild(card);
  });
  hero.appendChild(prepGrid);
  wrapper.appendChild(hero);

  // Hero image
  if (recipe.image) {
    const img = document.createElement('img');
    img.src = recipe.image;
    img.alt = recipe.title;
    img.className = 'recipe-hero-img';
    img.loading = 'lazy';
    img.onerror = () => img.remove();
    wrapper.appendChild(img);
  }

  // ---- RECIPE BODY ----
  const body = document.createElement('div');
  body.className = 'recipe-body';

  // ---- INGREDIENTS COLUMN ----
  const ingredientsCol = document.createElement('div');
  ingredientsCol.className = 'ingredients-column';
  const ingredientsSticky = document.createElement('div');
  ingredientsSticky.className = 'ingredients-sticky';

  const ingTitle = document.createElement('h2');
  ingTitle.className = 'column-title';
  ingTitle.textContent = 'Ingredients';
  ingredientsSticky.appendChild(ingTitle);

  // Serving scaler
  const scaler = document.createElement('div');
  scaler.className = 'serving-scaler';
  scaler.setAttribute('role', 'group');
  scaler.setAttribute('aria-label', 'Adjust servings');
  scaler.innerHTML = `<span class="scaler-label">Serves</span>
    <div class="scaler-btns">
      <button class="scaler-btn${recipe.serves <= 2 ? '' : ''} active" data-multiplier="1" aria-pressed="true">${recipe.serves}</button>
      <button class="scaler-btn" data-multiplier="1.5" aria-pressed="false">${Math.round(recipe.serves * 1.5)}</button>
      <button class="scaler-btn" data-multiplier="2" aria-pressed="false">${recipe.serves * 2}</button>
      <button class="scaler-btn" data-multiplier="3" aria-pressed="false">${recipe.serves * 3}</button>
    </div>`;
  scaler.querySelectorAll('.scaler-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mult = parseFloat(btn.dataset.multiplier);
      STATE.servingMultiplier = mult;
      scaler.querySelectorAll('.scaler-btn').forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-pressed', b === btn);
      });
      refreshIngredientAmounts(recipe);
    });
  });
  ingredientsSticky.appendChild(scaler);

  // Completion bar
  const completionWrap = document.createElement('div');
  completionWrap.className = 'completion-bar-wrap';
  completionWrap.innerHTML = `
    <div class="completion-label">
      <span>Ingredients ticked</span>
      <span id="completionPct">0%</span>
    </div>
    <div class="completion-track">
      <div class="completion-fill" id="completionFill" style="width: 0%"></div>
    </div>`;
  ingredientsSticky.appendChild(completionWrap);

  // Main ingredients
  const ingList = document.createElement('div');
  ingList.id = 'ingredientList';
  (recipe.ingredients || []).forEach((ing, i) => {
    ingList.appendChild(buildIngredientItem(recipe.id, i, ing, 'main'));
  });

  // Extra ingredient groups
  if (recipe.ingredientGroups) {
    recipe.ingredientGroups.forEach(group => {
      const groupTitle = document.createElement('p');
      groupTitle.className = 'ingredient-group-title';
      groupTitle.textContent = group.title;
      ingList.appendChild(groupTitle);
      group.items.forEach((ing, i) => {
        ingList.appendChild(buildIngredientItem(recipe.id, `group-${group.title}-${i}`, ing, group.title));
      });
    });
  }

  ingredientsSticky.appendChild(ingList);

  // Clear checked
  const clearBtn = document.createElement('button');
  clearBtn.className = 'clear-checked-btn';
  clearBtn.textContent = 'Clear all ticked';
  clearBtn.addEventListener('click', () => clearChecked(recipe.id));
  ingredientsSticky.appendChild(clearBtn);

  ingredientsCol.appendChild(ingredientsSticky);
  body.appendChild(ingredientsCol);

  // ---- METHOD COLUMN ----
  const methodCol = document.createElement('div');
  methodCol.className = 'method-column';

  const methodTitle = document.createElement('h2');
  methodTitle.className = 'column-title';
  methodTitle.textContent = 'Method';
  methodCol.appendChild(methodTitle);

  // Chef's notes
  if (recipe.chefNotes) {
    const notes = document.createElement('div');
    notes.className = 'chefs-notes';
    notes.innerHTML = `<p class="chefs-notes-label">Chef's Note</p><p class="chefs-notes-text">${recipe.chefNotes}</p>`;
    methodCol.appendChild(notes);
  }

  // Method steps
  (recipe.method || []).forEach((step, i) => {
    const stepEl = document.createElement('div');
    stepEl.className = 'method-step';
    stepEl.style.animationDelay = `${i * 0.06}s`;
    stepEl.innerHTML = `
      <div class="step-number" aria-hidden="true">${i + 1}</div>
      <p class="step-text">${step}</p>`;
    methodCol.appendChild(stepEl);
  });

  // Pull quote
  if (recipe.pullQuote) {
    const pq = document.createElement('blockquote');
    pq.className = 'pull-quote';
    pq.innerHTML = `<p class="pull-quote-text">${recipe.pullQuote}</p>`;
    methodCol.appendChild(pq);
  }

  body.appendChild(methodCol);
  wrapper.appendChild(body);

  // ---- NOTES SECTION ----
  const notesData = [
    { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`, title: 'Tips', text: recipe.tips },
    { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>`, title: 'Storage', text: recipe.storage },
    { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 12 C2 12 6 4 12 4 S22 12 22 12"/><path d="M2 12 C2 12 6 20 12 20 S22 12 22 12"/><circle cx="12" cy="12" r="3"/></svg>`, title: 'Freezing', text: recipe.freezing },
    { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`, title: 'Variations', text: recipe.variations },
  ].filter(n => n.text);

  if (notesData.length) {
    const notesSection = document.createElement('div');
    notesSection.className = 'recipe-notes';

    const notesTitle = document.createElement('h2');
    notesTitle.className = 'column-title';
    notesTitle.textContent = 'Notes & Tips';
    notesSection.appendChild(notesTitle);

    const notesGrid = document.createElement('div');
    notesGrid.className = 'notes-grid';
    notesData.forEach(n => {
      const card = document.createElement('div');
      card.className = 'note-card';
      card.innerHTML = `
        <div class="note-card-icon" aria-hidden="true">${n.icon}</div>
        <p class="note-card-title">${n.title}</p>
        <p class="note-card-text">${n.text}</p>`;
      notesGrid.appendChild(card);
    });
    notesSection.appendChild(notesGrid);

    // Nutrition if available
    if (recipe.nutritionNote) {
      const nutNote = document.createElement('div');
      nutNote.className = 'chefs-notes';
      nutNote.style.marginTop = 'var(--space-lg)';
      nutNote.innerHTML = `<p class="chefs-notes-label">Nutritional Notes</p><p class="chefs-notes-text">${recipe.nutritionNote}</p>`;
      notesSection.appendChild(nutNote);
    }

    wrapper.appendChild(notesSection);
  }

  frag.appendChild(wrapper);
  return frag;
}

/** Build a single ingredient item element */
function buildIngredientItem(recipeId, index, ing, group) {
  if (!STATE.checkedIngredients[recipeId]) STATE.checkedIngredients[recipeId] = new Set();
  const key = `${group}-${index}`;
  const isChecked = STATE.checkedIngredients[recipeId].has(key);

  const item = document.createElement('div');
  item.className = `ingredient-item${isChecked ? ' checked' : ''}`;
  item.dataset.key = key;
  item.dataset.baseAmount = ing.amount;
  item.setAttribute('role', 'checkbox');
  item.setAttribute('aria-checked', isChecked);
  item.setAttribute('tabindex', '0');

  item.innerHTML = `
    <div class="ingredient-checkbox" aria-hidden="true">
      <svg class="ingredient-checkbox-tick" viewBox="0 0 12 12" fill="none" stroke="white" stroke-width="2" aria-hidden="true">
        <polyline points="2,6 5,9 10,3"/>
      </svg>
    </div>
    <span class="ingredient-amount" aria-label="amount">${ing.amount ? scaleAmount(ing.amount, STATE.servingMultiplier) : ''}</span>
    <span class="ingredient-name">${ing.item}</span>`;

  item.addEventListener('click', () => toggleIngredient(recipeId, key, item));
  item.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleIngredient(recipeId, key, item);
    }
  });

  return item;
}

/** Toggle an ingredient's checked state */
function toggleIngredient(recipeId, key, el) {
  if (!STATE.checkedIngredients[recipeId]) STATE.checkedIngredients[recipeId] = new Set();
  const set = STATE.checkedIngredients[recipeId];
  if (set.has(key)) {
    set.delete(key);
    el.classList.remove('checked');
    el.setAttribute('aria-checked', 'false');
  } else {
    set.add(key);
    el.classList.add('checked');
    el.setAttribute('aria-checked', 'true');
  }
  persistChecked();
  updateCompletionBar(recipeId);
}

/** Clear all checked ingredients for a recipe */
function clearChecked(recipeId) {
  STATE.checkedIngredients[recipeId] = new Set();
  document.querySelectorAll('.ingredient-item.checked').forEach(el => {
    el.classList.remove('checked');
    el.setAttribute('aria-checked', 'false');
  });
  persistChecked();
  updateCompletionBar(recipeId);
}

/** Restore checked state visually */
function restoreChecked(recipeId) {
  const set = STATE.checkedIngredients[recipeId];
  if (!set) return;
  document.querySelectorAll('.ingredient-item').forEach(el => {
    if (set.has(el.dataset.key)) {
      el.classList.add('checked');
      el.setAttribute('aria-checked', 'true');
    }
  });
  updateCompletionBar(recipeId);
}

/** Update completion progress bar */
function updateCompletionBar(recipeId) {
  const all = document.querySelectorAll('.ingredient-item');
  const checked = document.querySelectorAll('.ingredient-item.checked');
  const pct = all.length ? Math.round((checked.length / all.length) * 100) : 0;
  const fill = document.getElementById('completionFill');
  const label = document.getElementById('completionPct');
  if (fill) fill.style.width = pct + '%';
  if (label) label.textContent = pct + '%';
}

/** Refresh ingredient amounts when serving multiplier changes */
function refreshIngredientAmounts(recipe) {
  document.querySelectorAll('.ingredient-item').forEach(item => {
    const baseAmount = item.dataset.baseAmount;
    const amountEl = item.querySelector('.ingredient-amount');
    if (amountEl && baseAmount) {
      amountEl.textContent = scaleAmount(baseAmount, STATE.servingMultiplier);
    }
  });
}


/* ============================================================
   FAVOURITES
   ============================================================ */
function toggleFavourite(id, btnEl) {
  if (STATE.favourites.has(id)) {
    STATE.favourites.delete(id);
    btnEl.classList.remove('active');
    btnEl.setAttribute('aria-pressed', 'false');
    if (btnEl.classList.contains('fav-btn-large')) {
      btnEl.childNodes[1].textContent = 'Save recipe';
      btnEl.setAttribute('aria-label', 'Save to favourites');
    }
  } else {
    STATE.favourites.add(id);
    btnEl.classList.add('active');
    btnEl.setAttribute('aria-pressed', 'true');
    if (btnEl.classList.contains('fav-btn-large')) {
      btnEl.childNodes[1].textContent = 'Saved';
      btnEl.setAttribute('aria-label', 'Remove from favourites');
    }
  }
  persistFavourites();

  // Update any matching fav buttons in the grid
  document.querySelectorAll(`.fav-btn[data-id="${id}"]`).forEach(b => {
    b.classList.toggle('active', STATE.favourites.has(id));
  });
}

function renderFavourites() {
  const grid = document.getElementById('favouritesGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const favRecipes = STATE.recipes.filter(r => STATE.favourites.has(r.id));
  if (favRecipes.length === 0) {
    grid.innerHTML = `
      <div class="empty-favourites">
        <div class="empty-favourites-icon">♡</div>
        <h3 class="empty-favourites-title">No favourites saved yet</h3>
        <p>Tap the heart on any recipe to save it here.</p>
      </div>`;
    return;
  }

  favRecipes.forEach(recipe => {
    const card = buildRecipeCard(recipe);
    grid.appendChild(card);
  });
}


/* ============================================================
   NAVIGATION / PAGE ROUTING
   ============================================================ */
function closePage() {
  const homeSection = document.querySelector('.hero');
  const contentsSection = document.getElementById('contents');
  const recipeSection = document.getElementById('recipeSection');
  const favSection = document.getElementById('favouritesSection');

  recipeSection.hidden = true;
  if (favSection) favSection.hidden = true;
  if (homeSection) homeSection.hidden = false;
  if (contentsSection) contentsSection.hidden = false;

  STATE.currentRecipe = null;
  history.pushState({ page: 'home' }, '', '#');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showFavouritesPage() {
  const homeSection = document.querySelector('.hero');
  const contentsSection = document.getElementById('contents');
  const recipeSection = document.getElementById('recipeSection');
  const favSection = document.getElementById('favouritesSection');

  recipeSection.hidden = true;
  if (homeSection) homeSection.hidden = true;
  if (contentsSection) contentsSection.hidden = true;
  if (favSection) {
    favSection.hidden = false;
    renderFavourites();
  }

  history.pushState({ page: 'favourites' }, '', '#favourites');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Handle browser back/forward
window.addEventListener('popstate', (e) => {
  if (e.state?.page === 'recipe') {
    openRecipe(e.state.id);
  } else if (e.state?.page === 'favourites') {
    showFavouritesPage();
  } else {
    closePage();
  }
});

// Handle hash on load
function handleInitialHash() {
  const hash = location.hash;
  if (hash.startsWith('#recipe/')) {
    const id = hash.slice('#recipe/'.length);
    if (STATE.recipes.find(r => r.id === id)) {
      openRecipe(id);
    }
  } else if (hash === '#favourites') {
    showFavouritesPage();
  }
}


/* ============================================================
   SEARCH
   ============================================================ */
function setupSearch() {
  const toggle = document.getElementById('searchToggle');
  const overlay = document.getElementById('searchOverlay');
  const closeBtn = document.getElementById('searchClose');
  const input = document.getElementById('searchInput');

  if (!toggle || !overlay) return;

  const openSearch = () => {
    overlay.classList.add('open');
    overlay.removeAttribute('aria-hidden');
    toggle.setAttribute('aria-expanded', 'true');
    input.focus();
    renderSearchResults('', 'all');
  };

  const closeSearch = () => {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus();
  };

  toggle.addEventListener('click', openSearch);
  closeBtn.addEventListener('click', closeSearch);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSearch(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.classList.contains('open')) closeSearch(); });

  input.addEventListener('input', debounce(() => {
    const activeFilter = document.querySelector('.pill.active')?.dataset.filter || 'all';
    renderSearchResults(input.value, activeFilter);
  }, 180));

  // Filter pills
  document.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.pill').forEach(p => {
        p.classList.remove('active');
        p.setAttribute('aria-pressed', 'false');
      });
      pill.classList.add('active');
      pill.setAttribute('aria-pressed', 'true');
      renderSearchResults(input.value, pill.dataset.filter);
    });
  });
}

function renderSearchResults(query, filter) {
  const container = document.getElementById('searchResults');
  if (!container) return;
  container.innerHTML = '';

  const q = query.trim().toLowerCase();
  let results = STATE.recipes.filter(r => {
    const matchQuery = !q ||
      r.title.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      (r.ingredients || []).some(i => i.item.toLowerCase().includes(q)) ||
      r.category.toLowerCase().includes(q) ||
      (r.tags || []).some(t => t.toLowerCase().includes(q));

    const matchFilter = filter === 'all' ||
      (r.tags || []).includes(filter) ||
      r.category === filter;

    return matchQuery && matchFilter;
  });

  if (!q && filter === 'all') results = STATE.recipes;

  if (results.length === 0) {
    container.innerHTML = `<p style="text-align:center; color: var(--color-text-muted); padding: 2rem 0;">No recipes found for "${query}".</p>`;
    return;
  }

  results.forEach(recipe => {
    const card = document.createElement('div');
    card.className = 'search-result-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Open recipe: ${recipe.title}`);
    card.innerHTML = `
      <img class="search-result-img" src="${recipe.image || ''}" alt="" loading="lazy" onerror="this.style.display='none'"/>
      <div class="search-result-info">
        <p class="search-result-title">${recipe.title}</p>
        <p class="search-result-meta">${categoryName(recipe.category)} · ${recipe.totalTime || recipe.prepTime}</p>
      </div>`;
    card.addEventListener('click', () => {
      document.getElementById('searchOverlay').classList.remove('open');
      openRecipe(recipe.id);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { document.getElementById('searchOverlay').classList.remove('open'); openRecipe(recipe.id); }
    });
    container.appendChild(card);
  });
}


/* ============================================================
   PRINT
   ============================================================ */
function printRecipe(recipe) {
  const printEl = document.getElementById('printContent');

  // Build all ingredients into a flat list for print
  const allIngredients = [...(recipe.ingredients || [])];
  if (recipe.ingredientGroups) {
    recipe.ingredientGroups.forEach(g => allIngredients.push(...g.items));
  }

  const ingHtml = allIngredients.map(ing => `
    <div class="print-ingredient-item">
      <span class="print-ingredient-amount">${ing.amount || ''}</span>
      <span>${ing.item}</span>
    </div>`).join('');

  const stepsHtml = (recipe.method || []).map((step, i) => `
    <div class="print-step">
      <span class="print-step-num">${i + 1}</span>
      <p>${step}</p>
    </div>`).join('');

  const notesHtml = [
    recipe.chefNotes ? `<p class="print-note-title">Chef's Note</p><p class="print-note-text">${recipe.chefNotes}</p>` : '',
    recipe.tips ? `<p class="print-note-title">Tips</p><p class="print-note-text">${recipe.tips}</p>` : '',
    recipe.storage ? `<p class="print-note-title">Storage</p><p class="print-note-text">${recipe.storage}</p>` : '',
    recipe.variations ? `<p class="print-note-title">Variations</p><p class="print-note-text">${recipe.variations}</p>` : '',
  ].filter(Boolean).join('');

  printEl.innerHTML = `
    <div class="print-page">
      <div class="print-header">
        <span class="print-cookbook-name">Bray to Belly</span>
      </div>

      <h1 class="print-title">${recipe.title}</h1>
      <p class="print-description">${recipe.description}</p>

      <div class="print-prep-row">
        <div class="print-prep-item">
          <div class="print-prep-label">Prep Time</div>
          <div class="print-prep-value">${recipe.prepTime}</div>
        </div>
        ${recipe.cookTime ? `<div class="print-prep-item">
          <div class="print-prep-label">Cook Time</div>
          <div class="print-prep-value">${recipe.cookTime}</div>
        </div>` : ''}
        <div class="print-prep-item">
          <div class="print-prep-label">Serves</div>
          <div class="print-prep-value">${recipe.serves}</div>
        </div>
        <div class="print-prep-item">
          <div class="print-prep-label">Difficulty</div>
          <div class="print-prep-value">${recipe.difficulty}</div>
        </div>
      </div>

      ${recipe.pullQuote ? `<div class="print-pull-quote">"${recipe.pullQuote}"</div>` : ''}

      <div class="print-columns">
        <div class="print-ingredients">
          <h2 class="print-section-title">Ingredients</h2>
          <div class="print-ingredient-list">${ingHtml}</div>
        </div>
        <div class="print-method">
          <h2 class="print-section-title">Method</h2>
          ${stepsHtml}
        </div>
      </div>

      ${notesHtml ? `<div class="print-notes-section">${notesHtml}</div>` : ''}

      <div class="print-footer">
        <span>Bray to Belly</span>
        <span>${recipe.title}</span>
      </div>
    </div>`;

  window.print();
}


/* ============================================================
   SETTINGS: DARK MODE, FONT SIZE
   ============================================================ */
function setupSettings() {
  // Dark mode
  const savedTheme = lsLoad('gatt_theme', 'light');
  document.body.setAttribute('data-theme', savedTheme);

  document.getElementById('darkModeToggle')?.addEventListener('click', () => {
    const current = document.body.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', next);
    lsSave('gatt_theme', next);
  });

  // Font size controls removed
}


/* ============================================================
   READING PROGRESS BAR
   ============================================================ */
function setupProgressBar() {
  const bar = document.getElementById('progressBar');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    bar.style.width = progress + '%';
  }, { passive: true });
}


/* ============================================================
   HEADER SCROLL EFFECT
   ============================================================ */
function setupHeaderScroll() {
  const header = document.getElementById('siteHeader');
  if (!header) return;

  let lastScrollY = window.scrollY;
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;

        // Add blur/background when scrolled at all
        header.classList.toggle('scrolled', currentScrollY > 20);

        // Only hide/show when on a recipe page and scrolled past the header
        if (STATE.currentRecipe && currentScrollY > 80) {
          if (currentScrollY > lastScrollY) {
            // Scrolling down — hide header
            header.classList.add('header-hidden');
          } else {
            // Scrolling up — show header
            header.classList.remove('header-hidden');
          }
        } else {
          // On home page or near top — always show
          header.classList.remove('header-hidden');
        }

        lastScrollY = currentScrollY;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}


/* ============================================================
   MOBILE MENU
   ============================================================ */
function setupMobileMenu() {
  const toggle = document.getElementById('mobileMenuToggle');
  const nav = document.getElementById('mobileNav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.contains('open');
    nav.classList.toggle('open', !isOpen);
    toggle.setAttribute('aria-expanded', !isOpen);
    nav.setAttribute('aria-hidden', isOpen);
  });

  // Close on link click
  nav.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      nav.setAttribute('aria-hidden', 'true');
    });
  });
}


/* ============================================================
   FAVOURITES PAGE NAVIGATION
   ============================================================ */
function setupFavNavigation() {
  document.querySelectorAll('a[href="favourites.html"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      showFavouritesPage();
    });
  });
}


/* ============================================================
   INTERSECTION OBSERVER — FADE IN
   ============================================================ */
function setupFadeInObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
  return observer;
}

// Re-observe newly added elements
function observeFadeIn(el) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05 });
  observer.observe(el);
}


/* ============================================================
   SMOOTH SCROLL FOR ANCHOR LINKS
   ============================================================ */
function setupSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href === '#' || href.startsWith('#recipe/') || href === '#favourites') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}


/* ============================================================
   PARALLAX FOR BOTANICAL ILLUSTRATIONS
   ============================================================ */
function setupParallax() {
  const botanicals = document.querySelectorAll('.hero-botanical');
  if (!botanicals.length) return;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    botanicals.forEach((el, i) => {
      const dir = i % 2 === 0 ? 1 : -1;
      el.style.transform = `translateY(calc(-50% + ${y * dir * 0.08}px))`;
    });
  }, { passive: true });
}


/* ============================================================
   INIT
   ============================================================ */
async function init() {
  // Load persisted state
  loadFavourites();
  loadChecked();

  // Setup UI elements that don't depend on data
  setupSettings();
  setupProgressBar();
  setupHeaderScroll();
  setupMobileMenu();
  setupSearch();
  setupSmoothScroll();
  setupParallax();
  setupFavNavigation();

  // Load recipe data
  const data = await loadData();
  if (!data) {
    document.getElementById('recipesIndex').innerHTML = '<p style="text-align:center;color:var(--color-text-muted);padding:3rem 0;">Unable to load recipes. Please try refreshing the page.</p>';
    return;
  }

  // Render initial views
  renderCategoriesGrid();
  renderRecipesIndex();

  // Setup observer after initial render
  setTimeout(() => {
    setupFadeInObserver();
  }, 100);

  // Handle URL hash routing
  handleInitialHash();
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
