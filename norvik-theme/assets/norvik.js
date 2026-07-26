/* ==========================================================================
   NORVIK — theme behaviour
   Vanilla JS only, no dependencies. Everything is progressive: if this file
   fails to load the store still works, links still navigate and forms still
   submit. Loaded with `defer`.
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------
     Wishlist — persisted in localStorage, no app required.
     Stored as an array of product handles under a single key.
     ------------------------------------------------------------------ */

  var WISHLIST_KEY = 'norvik:wishlist';

  function readWishlist() {
    try {
      var raw = localStorage.getItem(WISHLIST_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      // Private browsing or corrupted value — degrade to an empty list.
      return [];
    }
  }

  function writeWishlist(list) {
    try {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
    } catch (e) {
      /* Storage unavailable: the heart still toggles for this page view. */
    }
  }

  function wishlistHas(handle) {
    return readWishlist().indexOf(handle) !== -1;
  }

  function toggleWishlist(handle) {
    var list = readWishlist();
    var index = list.indexOf(handle);
    if (index === -1) {
      list.push(handle);
    } else {
      list.splice(index, 1);
    }
    writeWishlist(list);
    document.dispatchEvent(new CustomEvent('norvik:wishlist:change', { detail: { handle: handle, list: list } }));
    return index === -1;
  }

  function syncWishlistButtons(root) {
    (root || document).querySelectorAll('[data-nv-wish]').forEach(function (button) {
      var saved = wishlistHas(button.dataset.nvWish);
      button.setAttribute('aria-pressed', saved ? 'true' : 'false');
      var label = button.querySelector('[data-nv-wish-label]');
      if (label) label.textContent = saved ? button.dataset.nvLabelOn : button.dataset.nvLabelOff;
      var a11y = button.querySelector('.nv-visually-hidden');
      if (a11y) a11y.textContent = saved ? button.dataset.nvLabelOn : button.dataset.nvLabelOff;
    });
  }

  function updateWishlistCount() {
    var count = readWishlist().length;
    document.querySelectorAll('[data-nv-wish-count]').forEach(function (node) {
      node.textContent = count > 0 ? count : '';
      node.hidden = count === 0;
    });
  }

  document.addEventListener('click', function (event) {
    var button = event.target.closest('[data-nv-wish]');
    if (!button) return;
    event.preventDefault();
    toggleWishlist(button.dataset.nvWish);
    syncWishlistButtons();
    updateWishlistCount();
  });

  document.addEventListener('norvik:wishlist:change', updateWishlistCount);

  /* Wishlist page: reveal only the cards whose handle is saved. */
  function renderWishlistPage() {
    var page = document.querySelector('[data-nv-wishlist-page]');
    if (!page) return;
    var saved = readWishlist();
    var shown = 0;
    page.querySelectorAll('[data-nv-wishlist-item]').forEach(function (item) {
      var isSaved = saved.indexOf(item.dataset.nvWishlistItem) !== -1;
      item.hidden = !isSaved;
      if (isSaved) shown++;
    });
    var empty = page.querySelector('[data-nv-wishlist-empty]');
    if (empty) empty.hidden = shown > 0;
    var grid = page.querySelector('[data-nv-wishlist-grid]');
    if (grid) grid.hidden = shown === 0;
  }

  /* ------------------------------------------------------------------
     Quick add — adds a variant to the cart and opens Dawn's cart drawer.
     ------------------------------------------------------------------ */

  function getCartDrawer() {
    return document.querySelector('cart-drawer');
  }

  function addToCart(variantId, trigger) {
    var drawer = getCartDrawer();
    var sections = [];
    if (drawer && typeof drawer.getSectionsToRender === 'function') {
      sections = drawer.getSectionsToRender().map(function (section) {
        return section.id;
      });
    }

    var original = trigger ? trigger.textContent : null;
    if (trigger) {
      trigger.setAttribute('disabled', 'disabled');
      trigger.dataset.nvBusy = 'true';
    }

    return fetch((window.routes && window.routes.cart_add_url ? window.routes.cart_add_url : '/cart/add') + '.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/javascript' },
      body: JSON.stringify({
        items: [{ id: Number(variantId), quantity: 1 }],
        sections: sections,
        sections_url: window.location.pathname,
      }),
    })
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        if (data.status) throw new Error(data.description || data.message);
        if (drawer && typeof drawer.renderContents === 'function') {
          drawer.renderContents(data);
        } else {
          window.location.href = (window.routes && window.routes.cart_url) || '/cart';
        }
        document.dispatchEvent(new CustomEvent('norvik:cart:added'));
      })
      .catch(function (error) {
        console.error('[norvik] add to cart failed', error);
        window.location.href = (window.routes && window.routes.cart_url) || '/cart';
      })
      .finally(function () {
        if (trigger) {
          trigger.removeAttribute('disabled');
          delete trigger.dataset.nvBusy;
          if (original !== null) trigger.textContent = original;
        }
      });
  }

  document.addEventListener('click', function (event) {
    /* Open the size picker */
    var toggle = event.target.closest('[data-nv-quick-toggle]');
    if (toggle) {
      event.preventDefault();
      var wrapper = toggle.closest('[data-nv-quick]');
      /* Close any other open picker so only one is active at a time. */
      document.querySelectorAll('[data-nv-quick].is-open').forEach(function (open) {
        if (open !== wrapper) open.classList.remove('is-open');
      });
      if (wrapper) wrapper.classList.add('is-open');
      return;
    }

    /* Pick a size → add straight to the cart */
    var size = event.target.closest('[data-nv-variant]');
    if (size && !size.hasAttribute('disabled')) {
      event.preventDefault();
      addToCart(size.dataset.nvVariant, size);
      var openWrapper = size.closest('[data-nv-quick]');
      if (openWrapper) openWrapper.classList.remove('is-open');
      return;
    }

    /* Single-variant card: straight add, no size step */
    var single = event.target.closest('[data-nv-quick-single]');
    if (single) {
      event.preventDefault();
      addToCart(single.dataset.nvQuickSingle, single);
      return;
    }

    /* Click outside closes any open picker */
    if (!event.target.closest('[data-nv-quick]')) {
      document.querySelectorAll('[data-nv-quick].is-open').forEach(function (open) {
        open.classList.remove('is-open');
      });
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('[data-nv-quick].is-open').forEach(function (open) {
      open.classList.remove('is-open');
    });
  });

  /* ------------------------------------------------------------------
     Horizontal rails — arrow buttons scroll by one viewport of the rail.
     ------------------------------------------------------------------ */

  function setupRail(nav) {
    var rail = document.getElementById(nav.dataset.nvRailNav);
    if (!rail) return;
    var prev = nav.querySelector('[data-nv-rail-prev]');
    var next = nav.querySelector('[data-nv-rail-next]');

    function refresh() {
      var max = rail.scrollWidth - rail.clientWidth - 2;
      if (prev) prev.disabled = rail.scrollLeft <= 2;
      if (next) next.disabled = rail.scrollLeft >= max;
    }

    function scrollBy(direction) {
      rail.scrollBy({ left: direction * rail.clientWidth * 0.9, behavior: 'smooth' });
    }

    if (prev) prev.addEventListener('click', function () { scrollBy(-1); });
    if (next) next.addEventListener('click', function () { scrollBy(1); });
    rail.addEventListener('scroll', refresh, { passive: true });
    window.addEventListener('resize', refresh);
    refresh();
  }

  /* ------------------------------------------------------------------
     Customer videos — click-to-play facade.
     External embeds (YouTube/Vimeo) are only injected on click so their
     scripts never affect the initial page load.
     ------------------------------------------------------------------ */

  document.addEventListener('click', function (event) {
    var facade = event.target.closest('[data-nv-video-play]');
    if (!facade) return;
    event.preventDefault();

    var holder = facade.closest('[data-nv-video]');
    if (!holder) return;

    var embed = facade.dataset.nvVideoPlay;
    if (embed) {
      var iframe = document.createElement('iframe');
      iframe.src = embed;
      iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('title', facade.getAttribute('aria-label') || 'Customer video');
      holder.innerHTML = '';
      holder.appendChild(iframe);
      return;
    }

    /* Native Shopify-hosted video already in the DOM behind the poster. */
    var video = holder.querySelector('video');
    if (video) {
      facade.hidden = true;
      video.setAttribute('controls', 'controls');
      var playing = video.play();
      if (playing && typeof playing.catch === 'function') {
        playing.catch(function () {
          /* Autoplay blocked: the native controls are visible, so the
             shopper can still start it manually. */
          facade.hidden = false;
        });
      }
    }
  });

  /* ------------------------------------------------------------------
     Collection column toggle — remembered across pages via localStorage.
     ------------------------------------------------------------------ */

  var COLS_KEY = 'norvik:cols';

  function applyColumns(value) {
    document.querySelectorAll('[data-nv-grid]').forEach(function (grid) {
      grid.dataset.cols = value;
    });
    document.querySelectorAll('[data-nv-cols]').forEach(function (button) {
      button.setAttribute('aria-pressed', button.dataset.nvCols === value ? 'true' : 'false');
    });
  }

  function setupColumns() {
    var buttons = document.querySelectorAll('[data-nv-cols]');
    if (!buttons.length) return;
    var grid = document.querySelector('[data-nv-grid]');
    var stored = null;
    try {
      stored = localStorage.getItem(COLS_KEY);
    } catch (e) {
      stored = null;
    }
    applyColumns(stored || (grid ? grid.dataset.cols : '3'));

    /* Dawn's facets replace the grid markup over AJAX when a filter changes,
       which would drop the chosen column count. Re-apply it after each swap. */
    var container = document.getElementById('ProductGridContainer');
    if (container && !container.dataset.nvColsObserved) {
      container.dataset.nvColsObserved = 'true';
      new MutationObserver(function () {
        var current = null;
        try {
          current = localStorage.getItem(COLS_KEY);
        } catch (e) {
          current = null;
        }
        if (current) applyColumns(current);
        syncWishlistButtons(container);
      }).observe(container, { childList: true, subtree: true });
    }
  }

  document.addEventListener('click', function (event) {
    var button = event.target.closest('[data-nv-cols]');
    if (!button) return;
    var value = button.dataset.nvCols;
    applyColumns(value);
    try {
      localStorage.setItem(COLS_KEY, value);
    } catch (e) {
      /* ignore */
    }
  });

  /* ------------------------------------------------------------------
     Email popup — 15s or 50% scroll, whichever comes first, once a session.
     ------------------------------------------------------------------ */

  function setupPopup() {
    var popup = document.querySelector('[data-nv-popup]');
    if (!popup) return;

    var storageKey = 'norvik:popup:' + (popup.dataset.nvPopupVersion || '1');
    var delay = parseInt(popup.dataset.nvPopupDelay, 10);
    var scrollPercent = parseInt(popup.dataset.nvPopupScroll, 10);
    if (isNaN(delay)) delay = 15;
    if (isNaN(scrollPercent)) scrollPercent = 50;

    var seen = false;
    try {
      seen = sessionStorage.getItem(storageKey) === '1';
    } catch (e) {
      seen = false;
    }
    /* Never interrupt a customer who is mid-checkout or already subscribed. */
    if (seen || document.body.classList.contains('template-cart')) return;

    var timer = null;
    var opened = false;

    function markSeen() {
      try {
        sessionStorage.setItem(storageKey, '1');
      } catch (e) {
        /* ignore */
      }
    }

    function open() {
      if (opened) return;
      opened = true;
      popup.classList.add('is-open');
      popup.removeAttribute('hidden');
      markSeen();
      window.clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
      var field = popup.querySelector('input[type="email"]');
      if (field) field.focus({ preventScroll: true });
      document.addEventListener('keydown', onKeydown);
    }

    function close() {
      popup.classList.remove('is-open');
      popup.setAttribute('hidden', '');
      document.removeEventListener('keydown', onKeydown);
    }

    function onKeydown(event) {
      if (event.key === 'Escape') close();
    }

    function onScroll() {
      var height = document.documentElement.scrollHeight - window.innerHeight;
      if (height <= 0) return;
      if ((window.scrollY / height) * 100 >= scrollPercent) open();
    }

    timer = window.setTimeout(open, delay * 1000);
    window.addEventListener('scroll', onScroll, { passive: true });

    popup.addEventListener('click', function (event) {
      if (event.target.closest('[data-nv-popup-close]') || event.target === popup) close();
    });

    /* If Shopify redirects back after a successful signup, don't reopen. */
    if (window.location.search.indexOf('customer_posted=true') !== -1) {
      markSeen();
      window.clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    }
  }

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */

  function init() {
    syncWishlistButtons();
    updateWishlistCount();
    renderWishlistPage();
    document.querySelectorAll('[data-nv-rail-nav]').forEach(setupRail);
    setupColumns();
    setupPopup();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* The theme editor re-renders sections without a page reload. */
  document.addEventListener('shopify:section:load', function (event) {
    syncWishlistButtons(event.target);
    updateWishlistCount();
    renderWishlistPage();
    event.target.querySelectorAll('[data-nv-rail-nav]').forEach(setupRail);
    setupPopup();
  });

  window.NorvikWishlist = { read: readWishlist, has: wishlistHas, toggle: toggleWishlist };
})();
