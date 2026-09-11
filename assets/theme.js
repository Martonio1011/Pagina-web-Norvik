document.addEventListener('DOMContentLoaded', function () {
  initMobileNav();
  initCartDrawer();
  initAccountDrawer();
  initSearchToggle();
  initFilterDropdowns();
  initProductVariantPicker();
});

function initAccountDrawer() {
  var drawer = document.querySelector('[data-account-drawer]');
  var overlay = document.querySelector('[data-account-drawer-overlay]');
  var heading = document.querySelector('[data-account-drawer-heading]');
  if (!drawer) return;

  function open() {
    drawer.classList.add('is-open');
    document.body.classList.add('no-scroll');
  }
  function close() {
    drawer.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
  }
  function showView(name) {
    var views = drawer.querySelectorAll('[data-account-view]');
    views.forEach(function (view) {
      var isMatch = view.getAttribute('data-account-view') === name;
      view.classList.toggle('is-active', isMatch);
      if (isMatch && heading) heading.textContent = view.getAttribute('data-account-heading');
    });
  }

  document.querySelectorAll('[data-account-drawer-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var mobileNavPanel = document.querySelector('[data-mobile-nav-panel]');
      if (mobileNavPanel) {
        mobileNavPanel.classList.remove('is-open');
        var mobileNavToggle = document.querySelector('[data-mobile-nav-toggle]');
        if (mobileNavToggle) mobileNavToggle.setAttribute('aria-expanded', 'false');
      }
      showView('login');
      open();
    });
  });
  document.querySelectorAll('[data-account-drawer-close]').forEach(function (btn) {
    btn.addEventListener('click', close);
  });
  if (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });
  }

  drawer.querySelectorAll('[data-account-view-trigger]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      showView(btn.getAttribute('data-account-view-trigger'));
    });
  });

  var postedTrigger = drawer.querySelector('.account-drawer__error, .account-drawer__success');
  if (postedTrigger) {
    var postedView = postedTrigger.closest('[data-account-view]');
    if (postedView) showView(postedView.getAttribute('data-account-view'));
    open();
  }
}

function initProductVariantPicker() {
  document.querySelectorAll('[data-product-form]').forEach(function (form) {
    var variantsScript = form.querySelector('[data-product-variants]');
    var idInput = form.querySelector('[data-product-variant-id]');
    var submitBtn = form.querySelector('[type="submit"]');
    if (!variantsScript || !idInput) return;
    var variants = JSON.parse(variantsScript.textContent);

    function selectedOptions() {
      var selected = [];
      form.querySelectorAll('.product__option').forEach(function (group) {
        var checked = group.querySelector('input:checked');
        if (checked) selected.push(checked.value);
      });
      return selected;
    }

    function updateVariant() {
      var selected = selectedOptions();
      if (selected.length === 0) return;
      var match = variants.find(function (v) {
        return [v.option1, v.option2, v.option3].filter(Boolean).join('|') === selected.join('|');
      });
      if (match) {
        idInput.value = match.id;
        if (submitBtn) submitBtn.removeAttribute('disabled');
      } else if (submitBtn) {
        submitBtn.setAttribute('disabled', 'disabled');
      }
    }

    form.querySelectorAll('.product__option-values input').forEach(function (input) {
      input.addEventListener('change', updateVariant);
    });
  });
}

function initMobileNav() {
  var toggle = document.querySelector('[data-mobile-nav-toggle]');
  var panel = document.querySelector('[data-mobile-nav-panel]');
  var closeBtn = document.querySelector('[data-mobile-nav-close]');
  if (!toggle || !panel) return;

  function open() {
    panel.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('no-scroll');
  }
  function close() {
    panel.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('no-scroll');
  }
  toggle.addEventListener('click', function () {
    panel.classList.contains('is-open') ? close() : open();
  });
  if (closeBtn) closeBtn.addEventListener('click', close);
  panel.addEventListener('click', function (e) {
    if (e.target === panel) close();
  });
}

function initSearchToggle() {
  var toggle = document.querySelector('[data-search-toggle]');
  var panel = document.querySelector('[data-search-panel]');
  if (!toggle || !panel) return;
  toggle.addEventListener('click', function () {
    panel.classList.toggle('is-open');
    if (panel.classList.contains('is-open')) {
      var input = panel.querySelector('input[type="search"]');
      if (input) input.focus();
    }
  });
}

function initFilterDropdowns() {
  document.querySelectorAll('[data-filter-dropdown-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = document.getElementById(btn.getAttribute('data-filter-dropdown-toggle'));
      if (!target) return;
      var isOpen = target.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  });
}

function initCartDrawer() {
  var drawer = document.querySelector('[data-cart-drawer]');
  var overlay = document.querySelector('[data-cart-drawer-overlay]');
  if (!drawer) return;

  function open() {
    drawer.classList.add('is-open');
    document.body.classList.add('no-scroll');
  }
  function close() {
    drawer.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
  }

  document.querySelectorAll('[data-cart-drawer-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      open();
    });
  });
  document.querySelectorAll('[data-cart-drawer-close]').forEach(function (btn) {
    btn.addEventListener('click', close);
  });
  if (overlay) overlay.addEventListener('click', close);

  document.body.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form.matches('[data-product-form]')) return;
    e.preventDefault();
    var formData = new FormData(form);
    var submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.setAttribute('disabled', 'disabled');

    fetch(window.Shopify.routes.root + 'cart/add.js', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: formData
    })
      .then(function (res) { return res.json(); })
      .then(function () { return refreshCartDrawer(); })
      .then(function () {
        if (submitBtn) submitBtn.removeAttribute('disabled');
        open();
      })
      .catch(function () {
        if (submitBtn) submitBtn.removeAttribute('disabled');
      });
  });

  document.body.addEventListener('click', function (e) {
    var removeBtn = e.target.closest('[data-cart-remove]');
    if (!removeBtn) return;
    e.preventDefault();
    updateCartLine(removeBtn.getAttribute('data-cart-remove'), 0);
  });

  document.body.addEventListener('change', function (e) {
    var qtyInput = e.target.closest('[data-cart-quantity]');
    if (!qtyInput) return;
    updateCartLine(qtyInput.getAttribute('data-cart-quantity'), qtyInput.value);
  });

  function updateCartLine(key, quantity) {
    fetch(window.Shopify.routes.root + 'cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id: key, quantity: quantity })
    })
      .then(function (res) { return res.json(); })
      .then(function () { return refreshCartDrawer(); });
  }

  function refreshCartDrawer() {
    return fetch(window.Shopify.routes.root + '?section_id=cart-drawer')
      .then(function (res) { return res.text(); })
      .then(function (html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        var newDrawer = doc.querySelector('[data-cart-drawer]');
        if (newDrawer) drawer.innerHTML = newDrawer.innerHTML;
        var newCount = doc.querySelector('[data-cart-count]');
        document.querySelectorAll('[data-cart-count]').forEach(function (el) {
          if (newCount) el.textContent = newCount.textContent;
        });
      });
  }
}
