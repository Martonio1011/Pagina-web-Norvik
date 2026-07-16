document.addEventListener('DOMContentLoaded', function () {
  initHeaderScroll();
  initReveal();
  initMobileNav();
  initSearchToggle();
  initCartDrawer();
  initNewsletterForms();
  renderProductGrids();
  initQuickAdd();
  initCollectionControls();
  initPdp();
  initAccordion();
});

/* --------------------------------------------------------------------------
   Header: compacta al hacer scroll
   -------------------------------------------------------------------------- */
function initHeaderScroll() {
  var header = document.querySelector('[data-site-header]');
  if (!header) return;
  var threshold = 40;
  function onScroll() {
    if (window.scrollY > threshold) {
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* --------------------------------------------------------------------------
   Fade-in al entrar en el viewport
   -------------------------------------------------------------------------- */
function initReveal() {
  var items = document.querySelectorAll('[data-reveal]');
  if (!items.length) return;

  if (!('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

  items.forEach(function (el, i) {
    el.style.setProperty('--i', i % 8);
    observer.observe(el);
  });
}

/* --------------------------------------------------------------------------
   Menú móvil
   -------------------------------------------------------------------------- */
function initMobileNav() {
  var toggle = document.querySelector('[data-mobile-nav-toggle]');
  var panel = document.querySelector('[data-mobile-nav]');
  var closeBtn = document.querySelector('[data-mobile-nav-close]');
  if (!toggle || !panel) return;

  function open() { panel.classList.add('is-open'); document.body.classList.add('no-scroll'); }
  function close() { panel.classList.remove('is-open'); document.body.classList.remove('no-scroll'); }

  toggle.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);
  var overlay = panel.querySelector('[data-mobile-nav-overlay]');
  if (overlay) overlay.addEventListener('click', close);
  panel.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', close); });
}

/* --------------------------------------------------------------------------
   Panel de búsqueda
   -------------------------------------------------------------------------- */
function initSearchToggle() {
  var toggle = document.querySelector('[data-search-toggle]');
  var panel = document.querySelector('[data-search-panel]');
  if (!toggle || !panel) return;
  toggle.addEventListener('click', function () {
    panel.classList.toggle('is-open');
    if (panel.classList.contains('is-open')) {
      var input = panel.querySelector('input');
      if (input) setTimeout(function () { input.focus(); }, 150);
    }
  });
}

/* --------------------------------------------------------------------------
   Carrito (persistido en localStorage)
   -------------------------------------------------------------------------- */
var CART_KEY = 'norvik_cart';

function cartRead() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (e) { return []; }
}
function cartWrite(lines) {
  localStorage.setItem(CART_KEY, JSON.stringify(lines));
  renderCart();
}
function cartAdd(productId, size, color, qty) {
  var product = norvikGetProduct(productId);
  if (!product) return;
  var lines = cartRead();
  var key = productId + '__' + size + '__' + color;
  var existing = lines.find(function (l) { return l.key === key; });
  if (existing) {
    existing.qty += qty;
  } else {
    lines.push({ key: key, id: productId, size: size, color: color, qty: qty });
  }
  cartWrite(lines);
}
function cartSetQty(key, qty) {
  var lines = cartRead();
  if (qty <= 0) {
    lines = lines.filter(function (l) { return l.key !== key; });
  } else {
    var line = lines.find(function (l) { return l.key === key; });
    if (line) line.qty = qty;
  }
  cartWrite(lines);
}

function renderCart() {
  var body = document.querySelector('[data-cart-body]');
  var countEls = document.querySelectorAll('[data-cart-count]');
  var subtotalEl = document.querySelector('[data-cart-subtotal]');
  var footer = document.querySelector('[data-cart-footer]');
  if (!body) return;

  var lines = cartRead();
  var count = lines.reduce(function (sum, l) { return sum + l.qty; }, 0);
  countEls.forEach(function (el) { el.textContent = count; });

  if (!lines.length) {
    body.innerHTML = '<p class="cart-drawer__empty">tu carrito está vacío</p>';
    if (footer) footer.style.display = 'none';
    return;
  }
  if (footer) footer.style.display = 'flex';

  var subtotal = 0;
  body.innerHTML = lines.map(function (line) {
    var product = norvikGetProduct(line.id);
    if (!product) return '';
    subtotal += product.price * line.qty;
    return (
      '<div class="cart-line" data-cart-line="' + line.key + '">' +
        '<div class="cart-line__media"><div class="ph-media ph-media--' + product.tone + '"></div></div>' +
        '<div class="cart-line__info">' +
          '<span class="cart-line__title">' + product.name + '</span>' +
          '<span class="cart-line__variant">talla ' + line.size + '</span>' +
          '<div class="cart-line__row">' +
            '<div class="cart-line__qty">' +
              '<button data-cart-decr aria-label="restar">&minus;</button>' +
              '<span>' + line.qty + '</span>' +
              '<button data-cart-incr aria-label="sumar">+</button>' +
            '</div>' +
            '<span class="cart-line__price">' + norvikFormatPrice(product.price * line.qty) + '</span>' +
          '</div>' +
          '<button class="cart-line__remove" data-cart-remove>eliminar</button>' +
        '</div>' +
      '</div>'
    );
  }).join('');

  if (subtotalEl) subtotalEl.textContent = norvikFormatPrice(subtotal);
}

function initCartDrawer() {
  var drawer = document.querySelector('[data-cart-drawer]');
  if (!drawer) return;

  function open() { drawer.classList.add('is-open'); document.body.classList.add('no-scroll'); }
  function close() { drawer.classList.remove('is-open'); document.body.classList.remove('no-scroll'); }

  document.querySelectorAll('[data-cart-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function (e) { e.preventDefault(); open(); });
  });
  document.querySelectorAll('[data-cart-close]').forEach(function (btn) {
    btn.addEventListener('click', close);
  });
  var overlay = drawer.querySelector('[data-cart-overlay]');
  if (overlay) overlay.addEventListener('click', close);

  drawer.addEventListener('click', function (e) {
    var lineEl = e.target.closest('[data-cart-line]');
    if (!lineEl) return;
    var key = lineEl.getAttribute('data-cart-line');
    var lines = cartRead();
    var line = lines.find(function (l) { return l.key === key; });
    if (!line) return;

    if (e.target.closest('[data-cart-incr]')) cartSetQty(key, line.qty + 1);
    if (e.target.closest('[data-cart-decr]')) cartSetQty(key, line.qty - 1);
    if (e.target.closest('[data-cart-remove]')) cartSetQty(key, 0);
  });

  window.norvikOpenCart = open;
  renderCart();
}

/* --------------------------------------------------------------------------
   Newsletter — simulación de envío
   -------------------------------------------------------------------------- */
function initNewsletterForms() {
  document.querySelectorAll('[data-newsletter-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var wrapper = form.closest('[data-newsletter-wrapper]') || form.parentElement;
      if (wrapper) wrapper.classList.add('is-submitted');
      else form.style.display = 'none';
    });
  });
}

/* --------------------------------------------------------------------------
   Render de grids de producto a partir de products.js
   -------------------------------------------------------------------------- */
function productCardHtml(product) {
  var priceHtml = product.compareAt
    ? '<span class="is-sale">' + norvikFormatPrice(product.price) + '</span><span class="was">' + norvikFormatPrice(product.compareAt) + '</span>'
    : norvikFormatPrice(product.price);
  var badgeHtml = product.badge ? '<span class="product-card__badge">' + product.badge + '</span>' : '';
  return (
    '<article class="product-card" data-reveal>' +
      '<a class="product-card__media" href="producto.html?id=' + product.id + '">' +
        badgeHtml +
        '<div class="ph-media ph-media--' + product.tone + '"><span class="ph-media__label">' + product.name + '<br>packshot frontal</span></div>' +
        '<button class="product-card__quickadd" data-quickadd="' + product.id + '">añadir a la cesta</button>' +
      '</a>' +
      '<div class="product-card__info">' +
        '<span class="product-card__category">' + categoryLabel(product.category) + '</span>' +
        '<a class="product-card__title" href="producto.html?id=' + product.id + '">' + product.name + '</a>' +
        '<span class="product-card__price">' + priceHtml + '</span>' +
      '</div>' +
    '</article>'
  );
}

function categoryLabel(cat) {
  return { ropa: 'ropa', bano: 'baño', accesorios: 'accesorios' }[cat] || cat;
}

function renderProductGrids() {
  document.querySelectorAll('[data-product-grid]').forEach(function (grid) {
    var mode = grid.getAttribute('data-product-grid');
    var list = [];
    if (mode === 'bestsellers') {
      list = NORVIK_PRODUCTS.slice(0, 4);
    } else if (mode === 'all') {
      list = NORVIK_PRODUCTS;
    } else if (mode === 'related') {
      var excludeId = grid.getAttribute('data-exclude');
      var category = grid.getAttribute('data-category');
      list = NORVIK_PRODUCTS.filter(function (p) { return p.id !== excludeId && p.category === category; }).slice(0, 4);
      if (list.length < 4) {
        NORVIK_PRODUCTS.forEach(function (p) {
          if (list.length < 4 && p.id !== excludeId && list.indexOf(p) === -1) list.push(p);
        });
      }
    }
    grid.innerHTML = list.map(productCardHtml).join('');
  });
  initReveal();
}

function initQuickAdd() {
  document.body.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-quickadd]');
    if (!btn) return;
    e.preventDefault();
    var id = btn.getAttribute('data-quickadd');
    var product = norvikGetProduct(id);
    if (!product) return;
    cartAdd(id, product.sizes[0], product.colors[0], 1);
    btn.textContent = 'añadido ✓';
    setTimeout(function () { btn.textContent = 'añadir a la cesta'; }, 1400);
    if (window.norvikOpenCart) window.norvikOpenCart();
  });
}

/* --------------------------------------------------------------------------
   Página de colección: filtro por categoría + orden
   -------------------------------------------------------------------------- */
function initCollectionControls() {
  var grid = document.querySelector('[data-product-grid="all"]');
  if (!grid) return;

  var params = new URLSearchParams(window.location.search);
  var activeCategory = params.get('cat') || 'todos';

  var chips = document.querySelectorAll('[data-filter-chip]');
  var sortSelect = document.querySelector('[data-sort-select]');
  var countEl = document.querySelector('[data-result-count]');
  var titleEl = document.querySelector('[data-collection-title]');

  var titles = { todos: 'toda la colección', ropa: 'ropa', bano: 'baño', accesorios: 'accesorios' };

  function apply() {
    var list = NORVIK_PRODUCTS.slice();
    if (activeCategory !== 'todos') {
      list = list.filter(function (p) { return p.category === activeCategory; });
    }
    var sortValue = sortSelect ? sortSelect.value : 'featured';
    if (sortValue === 'price-asc') list.sort(function (a, b) { return a.price - b.price; });
    if (sortValue === 'price-desc') list.sort(function (a, b) { return b.price - a.price; });
    if (sortValue === 'name-asc') list.sort(function (a, b) { return a.name.localeCompare(b.name); });

    grid.innerHTML = list.map(productCardHtml).join('');
    initReveal();
    if (countEl) countEl.textContent = list.length + (list.length === 1 ? ' producto' : ' productos');
    if (titleEl) titleEl.textContent = titles[activeCategory] || activeCategory;

    chips.forEach(function (chip) {
      chip.classList.toggle('is-active', chip.getAttribute('data-filter-chip') === activeCategory);
    });
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      activeCategory = chip.getAttribute('data-filter-chip');
      var url = new URL(window.location.href);
      if (activeCategory === 'todos') url.searchParams.delete('cat');
      else url.searchParams.set('cat', activeCategory);
      window.history.replaceState({}, '', url);
      apply();
    });
  });
  if (sortSelect) sortSelect.addEventListener('change', apply);

  apply();
}

/* --------------------------------------------------------------------------
   Página de producto (PDP)
   -------------------------------------------------------------------------- */
function initPdp() {
  var root = document.querySelector('[data-pdp]');
  if (!root) return;

  var params = new URLSearchParams(window.location.search);
  var product = norvikGetProduct(params.get('id')) || NORVIK_PRODUCTS[0];
  var state = { size: product.sizes[0], color: product.colors[0], qty: 1 };

  document.title = 'norvik — ' + product.name;
  root.querySelector('[data-pdp-category]').textContent = categoryLabel(product.category);
  root.querySelector('[data-pdp-title]').textContent = product.name;
  root.querySelector('[data-pdp-desc]').textContent = product.desc;
  root.querySelector('[data-pdp-main-media]').className = 'ph-media ph-media--' + product.tone;
  root.querySelector('[data-pdp-main-media]').innerHTML = '<span class="ph-media__label">' + product.name + '<br>vista principal</span>';

  var priceEl = root.querySelector('[data-pdp-price]');
  priceEl.innerHTML = product.compareAt
    ? '<span>' + norvikFormatPrice(product.price) + '</span><span class="was">' + norvikFormatPrice(product.compareAt) + '</span>'
    : '<span>' + norvikFormatPrice(product.price) + '</span>';

  var thumbsWrap = root.querySelector('[data-pdp-thumbs]');
  thumbsWrap.innerHTML = ['vista principal', 'detalle tejido', 'perfil completo', 'sobre modelo'].map(function (label, i) {
    return '<div class="pdp__thumb' + (i === 0 ? ' is-active' : '') + '" data-thumb="' + i + '"><div class="ph-media ph-media--' + product.tone + '"><span class="ph-media__label">' + label + '</span></div></div>';
  }).join('');
  thumbsWrap.querySelectorAll('[data-thumb]').forEach(function (thumb) {
    thumb.addEventListener('click', function () {
      thumbsWrap.querySelectorAll('.pdp__thumb').forEach(function (t) { t.classList.remove('is-active'); });
      thumb.classList.add('is-active');
    });
  });

  var sizeWrap = root.querySelector('[data-pdp-sizes]');
  sizeWrap.innerHTML = product.sizes.map(function (size, i) {
    return '<button class="size-swatch' + (i === 0 ? ' is-active' : '') + '" data-size="' + size + '">' + size + '</button>';
  }).join('');
  var sizeSelectedEl = root.querySelector('[data-pdp-size-selected]');
  sizeSelectedEl.textContent = state.size;
  sizeWrap.querySelectorAll('[data-size]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      sizeWrap.querySelectorAll('.size-swatch').forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      state.size = btn.getAttribute('data-size');
      sizeSelectedEl.textContent = state.size;
    });
  });

  var colorWrap = root.querySelector('[data-pdp-colors]');
  colorWrap.innerHTML = product.colors.map(function (color, i) {
    return '<button class="color-swatch' + (i === 0 ? ' is-active' : '') + '" data-color="' + color + '" style="background:' + color + '"></button>';
  }).join('');
  colorWrap.querySelectorAll('[data-color]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      colorWrap.querySelectorAll('.color-swatch').forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      state.color = btn.getAttribute('data-color');
    });
  });

  var qtyEl = root.querySelector('[data-pdp-qty]');
  root.querySelector('[data-pdp-qty-incr]').addEventListener('click', function () {
    state.qty += 1; qtyEl.textContent = state.qty;
  });
  root.querySelector('[data-pdp-qty-decr]').addEventListener('click', function () {
    state.qty = Math.max(1, state.qty - 1); qtyEl.textContent = state.qty;
  });

  root.querySelector('[data-pdp-add]').addEventListener('click', function (e) {
    var btn = e.currentTarget;
    cartAdd(product.id, state.size, state.color, state.qty);
    btn.textContent = 'añadido a la cesta ✓';
    setTimeout(function () { btn.textContent = 'añadir a la cesta'; }, 1600);
    if (window.norvikOpenCart) window.norvikOpenCart();
  });

  var relatedGrid = document.querySelector('[data-product-grid="related"]');
  if (relatedGrid) {
    relatedGrid.setAttribute('data-exclude', product.id);
    relatedGrid.setAttribute('data-category', product.category);
    renderProductGrids();
  }
}

/* --------------------------------------------------------------------------
   Acordeón (info de producto)
   -------------------------------------------------------------------------- */
function initAccordion() {
  document.querySelectorAll('[data-accordion-trigger]').forEach(function (trigger) {
    trigger.addEventListener('click', function () {
      var item = trigger.closest('.accordion__item');
      item.classList.toggle('is-open');
    });
  });
}
