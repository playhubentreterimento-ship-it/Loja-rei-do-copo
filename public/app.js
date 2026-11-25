// =========================================================================
// Lumina Personalizados - Frontend Principal (app.js)
// Zero dependências, vanilla JavaScript de alto desempenho
// =========================================================================

(function () {
  'use strict';

  // --- Estado da Aplicação ---
  const state = {
    store: null,
    framesData: null,
    images: [],
    imagesLoadedCount: 0,
    currentModelIndex: 0,
    currentRestFrame: 0,
    cart: [], // { id, name, code, img, qty }
    selectedCategory: 'Todos',

    // Máquina de estados da vitrine 360°
    isTransitioning: false,
    isAligning: false,
    transitionStartTime: 0,
    transitionDuration: 1000,
    transitionSequence: [],
    transitionDirection: 1, // 1 para avançar, -1 para voltar
    transitionEndTime: 0,
    lastWheelTime: 0,
    restStartTime: 0,

    // Toque (Touch)
    touchStartY: 0,
    touchStartX: 0,
    touchActive: false
  };

  // --- Elementos do DOM ---
  const el = {
    navBrandName: document.getElementById('nav-brand-name'),
    footerBrandName: document.getElementById('footer-brand-name'),
    heroFeaturedImg: document.getElementById('hero-featured-img'),
    heroImgWrap: document.getElementById('hero-img-wrap'),
    reel: document.getElementById('reel'),
    cv: document.getElementById('cv'),
    reelTextBlock: document.getElementById('reel-text-block'),
    reelCounter: document.getElementById('reel-counter'),
    reelTitle: document.getElementById('reel-title'),
    reelDesc: document.getElementById('reel-desc'),
    btnReelAdd: document.getElementById('btn-reel-add'),
    reelDots: document.getElementById('reel-dots'),
    catalogFilters: document.getElementById('catalog-filters'),
    productsGrid: document.getElementById('products-grid'),
    btnOpenCart: document.getElementById('btn-open-cart'),
    cartCount: document.getElementById('cart-count'),
    cartDrawer: document.getElementById('cart-drawer'),
    cartDrawerOverlay: document.getElementById('cart-drawer-overlay'),
    btnCloseDrawer: document.getElementById('btn-close-drawer'),
    btnContinueShopping: document.getElementById('btn-continue-shopping'),
    drawerItems: document.getElementById('drawer-items'),
    btnSendWhatsapp: document.getElementById('btn-send-whatsapp')
  };

  const ctx = el.cv ? el.cv.getContext('2d', { alpha: false }) : null;

  // --- Função Easing Cúbico In-Out ---
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // --- Inicialização ---
  async function init() {
    loadCartFromSession();
    await loadData();
    setupCanvas();
    setupReelDots();
    updateReelText(0);
    renderCatalog();
    hero();
    setupScrollControl();
    setupCartUI();
    requestAnimationFrame(renderLoop);
  }

  // --- Carregamento de Dados (com fallback para arquivo estático) ---
  async function loadData() {
    try {
      let storeRes;
      try {
        storeRes = await fetch('/api/store');
        if (!storeRes.ok) throw new Error('API não disponível');
      } catch (e) {
        storeRes = await fetch('data/store.json');
      }
      state.store = await storeRes.json();

      // Sincroniza com alterações salvas no navegador pelo painel administrativo
      try {
        const localData = localStorage.getItem('reidocopo_store_data');
        if (localData) {
          const parsed = JSON.parse(localData);
          if (parsed && typeof parsed === 'object') {
            if (parsed.brand) state.store.brand = parsed.brand;
            if (parsed.whatsapp) state.store.whatsapp = parsed.whatsapp;
            if (Array.isArray(parsed.products) && parsed.products.length > 0) {
              state.store.products = parsed.products;
            }
          }
        }
      } catch (e) {}

      const framesRes = await fetch('data/frames.json');
      state.framesData = await framesRes.json();

      // Atualiza nome da loja
      if (state.store.brand) {
        if (el.navBrandName) {
          el.navBrandName.innerHTML = `<img src="img/logo-rei-do-copo.png" alt="${escapeHtml(state.store.brand)}" class="nav-brand-logo">`;
        }
        if (el.footerBrandName) {
          el.footerBrandName.innerHTML = `<img src="img/logo-rei-do-copo.png" alt="${escapeHtml(state.store.brand)}" class="footer-brand-logo">`;
        }
        document.title = `${state.store.brand} | Vitrine 360° e Catálogo`;
      }

      // Pré-carregamento imediato de todas as imagens da vitrine (decodificação sob demanda)
      if (state.framesData && Array.isArray(state.framesData.f)) {
        state.images = state.framesData.f.map(src => {
          const img = new Image();
          img.src = src;
          return img;
        });
      }

      state.restStartTime = performance.now();
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    }
  }

  function setupCanvas() {
    if (!el.cv) return;
    el.cv.width = 576;
    el.cv.height = 1024;
  }

  // --- Vitrine 360°: Renderização e Animação ---
  function renderLoop(now) {
    if (ctx && state.framesData && state.images.length > 0) {
      const models = state.framesData.m;
      const currentModel = models[state.currentModelIndex];

      if (state.isTransitioning) {
        // Modo de Transição
        const elapsed = now - state.transitionStartTime;
        const progress = Math.min(1, Math.max(0, elapsed / state.transitionDuration));
        const eased = easeInOutCubic(progress);

        const seq = state.transitionSequence;
        const pos = eased * (seq.length - 1);
        const i0 = Math.floor(pos);
        const i1 = Math.min(seq.length - 1, i0 + 1);
        const frac = pos - i0;

        const frameIndex0 = seq[i0];
        const frameIndex1 = seq[i1];

        drawBlendedFrames(frameIndex0, frameIndex1, frac);

        if (progress >= 1) {
          // Finalizou a transição
          state.isTransitioning = false;
          state.transitionEndTime = now;

          if (state.transitionDirection === 1) {
            // Avançou: recomeça o vaivém do primeiro frame (u = 0)
            state.restStartTime = now;
          } else {
            // Voltou: terminou no último frame de repouso (u = 4)
            // Para u = 4, definimos restStartTime com offset de 3500ms
            state.restStartTime = now - 3500;
          }
        }
      } else if (currentModel) {
        // Modo de Repouso: vaivém suave em 5 frames
        // u = (1 − cos(tempo / 3500 · π)) / 2 · (n − 1)
        const n = currentModel.i.length;
        const time = now - state.restStartTime;
        const u = ((1 - Math.cos((time / 3500) * Math.PI)) / 2) * (n - 1);

        const i0 = Math.floor(u);
        const i1 = Math.min(n - 1, i0 + 1);
        const frac = u - i0;

        const frameIndex0 = currentModel.i[i0];
        const frameIndex1 = currentModel.i[i1];

        state.currentRestFrame = frac > 0.5 ? frameIndex1 : frameIndex0;

        drawBlendedFrames(frameIndex0, frameIndex1, frac);
      }
    }

    requestAnimationFrame(renderLoop);
  }

  function drawBlendedFrames(idxA, idxB, fracB) {
    const imgA = state.images[idxA];
    const imgB = state.images[idxB];

    // Fundo limpo escuro (palco)
    ctx.fillStyle = '#17151C';
    ctx.fillRect(0, 0, 576, 1024);

    if (imgA && imgA.complete && imgA.naturalWidth > 0) {
      ctx.globalAlpha = 1;
      ctx.drawImage(imgA, 0, 0, 576, 1024);
    }

    if (fracB > 0.001 && imgB && imgB.complete && imgB.naturalWidth > 0) {
      ctx.globalAlpha = fracB;
      ctx.drawImage(imgB, 0, 0, 576, 1024);
    }

    ctx.globalAlpha = 1;
  }

  // --- Máquina de Estados da Vitrine 360° (Regra Principal: 1 Rolagem = 1 Modelo) ---
  let busy = false;
  let hardEnd = 0;
  let lastWheelTime = 0;
  let touchStartY = 0;
  let touchHandled = false;

  function snap(y) {
    busy = true;
    hardEnd = Date.now() + 1600;
    window.scrollTo({ top: y, behavior: 'smooth' });
    setTimeout(release, 900);
  }

  function release() {
    const now = Date.now();
    if (now < hardEnd && (now - lastWheelTime < 150)) {
      setTimeout(release, 60);
    } else {
      busy = false;
    }
  }

  function go(k) {
    if (state.isTransitioning || !state.framesData) return;
    const models = state.framesData.m;
    const transitions = state.framesData.t;

    if (k < 0 || k >= models.length) return;
    if (k === state.currentModelIndex) return;

    const fromIndex = state.currentModelIndex;
    const direction = k > fromIndex ? 1 : -1;
    state.transitionDirection = direction;

    let seq = [];
    const startFrame = state.currentRestFrame;

    if (direction === 1) {
      // Avançar: fromIndex -> k
      const transFrames = transitions[fromIndex] || [];
      const endFrame = models[k].i[0];
      seq = [startFrame, ...transFrames, endFrame];
    } else {
      // Voltar: toca ao contrário e termina no último frame de repouso do modelo anterior
      const transFrames = transitions[k] || [];
      const reversedTrans = [...transFrames].reverse();
      const endFrame = models[k].i[models[k].i.length - 1];
      seq = [startFrame, ...reversedTrans, endFrame];
    }

    state.transitionSequence = seq;
    state.transitionDuration = Math.min(1400, Math.max(950, seq.length * 75));
    state.transitionStartTime = performance.now();
    state.isTransitioning = true;
    state.currentModelIndex = k;

    // Trava durante a transição
    busy = true;
    hardEnd = Date.now() + state.transitionDuration + 700;
    setTimeout(release, state.transitionDuration + 120);

    animateReelTextChange(k);
    updateReelDots(k);
  }

  function getReelOffset() {
    return window.innerWidth <= 760 ? 16 : 24;
  }

  function can(d) {
    const reel = el.reel;
    if (!reel) return false;
    const r = reel.getBoundingClientRect();
    const winHeight = window.innerHeight;
    const offset = getReelOffset();

    // false se a vitrine está longe da tela (r.bottom <= -6 ou r.top >= innerHeight * 1.15)
    if (r.bottom <= -6 || r.top >= winHeight * 1.15) return false;

    // true se busy
    if (busy) return true;

    // Se não estiver alinhada com o palco, true só na direção do palco
    const diff = r.top - offset;
    if (Math.abs(diff) >= 4) {
      return (d > 0 && diff > 0) || (d < 0 && diff < 0);
    }

    return true;
  }

  function handle(d, e) {
    if (!can(d)) return false;
    if (e && e.preventDefault) e.preventDefault();
    if (busy) return true;

    const reel = el.reel;
    if (!reel) return false;
    const r = reel.getBoundingClientRect();
    const offset = getReelOffset();
    const diff = r.top - offset;

    // Se |diff| >= 4, snap para alinhar perfeitamente com a margem do palco
    if (Math.abs(diff) >= 4) {
      snap(window.scrollY + diff);
      return true;
    }

    // Alinhada
    const N = state.framesData ? state.framesData.m.length : 11;
    const k = state.currentModelIndex + d;
    const catalogoEl = document.getElementById('catalogo');
    const heroEl = document.getElementById('hero') || document.getElementById('topo');

    if (k >= N) {
      // Saída em UMA rolagem para o catálogo
      const targetY = catalogoEl ? catalogoEl.offsetTop : window.scrollY + window.innerHeight;
      snap(targetY);
    } else if (k < 0) {
      // Saída em UMA rolagem para o hero
      const targetY = heroEl ? heroEl.offsetTop : 0;
      snap(targetY);
    } else {
      go(k);
    }

    return true;
  }

  // --- Indicadores Pontos Verticais (11) ---
  function setupReelDots() {
    if (!el.reelDots || !state.framesData) return;
    el.reelDots.innerHTML = '';
    const total = state.framesData.m.length;
    for (let k = 0; k < total; k++) {
      const dot = document.createElement('div');
      dot.className = `reel-dot ${k === 0 ? 'active' : ''}`;
      el.reelDots.appendChild(dot);
    }
  }

  function updateReelDots(activeIndex) {
    if (!el.reelDots) return;
    const dots = el.reelDots.querySelectorAll('.reel-dot');
    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === activeIndex);
    });
  }

  // --- Transição Suave do Bloco de Texto (380 ms) ---
  function animateReelTextChange(modelIndex) {
    if (!el.reelTextBlock) return;
    el.reelTextBlock.classList.add('fade-out');
    setTimeout(() => {
      updateReelText(modelIndex);
      el.reelTextBlock.classList.remove('fade-out');
    }, 380);
  }

  function updateReelText(modelIndex) {
    if (!state.framesData || !state.store) return;
    const model = state.framesData.m[modelIndex];
    if (!model) return;

    const total = state.framesData.m.length;
    const padIndex = String(modelIndex + 1).padStart(2, '0');
    const padTotal = String(total).padStart(2, '0');

    if (el.reelCounter) {
      el.reelCounter.textContent = `${padIndex} / ${padTotal}`;
    }

    const prod = state.store.products.find(p => p.id === model.p);
    if (prod) {
      if (el.reelTitle) el.reelTitle.textContent = prod.name;
      if (el.reelDesc) el.reelDesc.textContent = prod.desc || 'Acabamento premium e design exclusivo.';
    }

    if (el.btnReelAdd) {
      el.btnReelAdd.textContent = 'Quero este modelo';
      el.btnReelAdd.classList.remove('added');
    }
  }

  // --- Controle de Eventos de Rolagem, Toque e Teclado ---
  function setupScrollControl() {
    // Evento de Roda do Mouse / Trackpad
    window.addEventListener(
      'wheel',
      function (e) {
        if (Math.abs(e.deltaY) <= 3) return;
        lastWheelTime = Date.now();
        const d = e.deltaY > 0 ? 1 : -1;
        handle(d, e);
      },
      { passive: false }
    );

    // Eventos de Toque (Touch para celular)
    window.addEventListener(
      'touchstart',
      function (e) {
        if (e.touches.length === 1) {
          touchStartY = e.touches[0].clientY;
          touchHandled = false;
        }
      },
      { passive: true }
    );

    window.addEventListener(
      'touchmove',
      function (e) {
        if (e.touches.length !== 1) return;
        const diff = touchStartY - e.touches[0].clientY;
        if (Math.abs(diff) < 5) return;
        const d = diff > 0 ? 1 : -1;

        if (can(d)) {
          if (e.cancelable) e.preventDefault();
        }

        if (!touchHandled && Math.abs(diff) >= 40) {
          touchHandled = true;
          handle(d, e);
        }
      },
      { passive: false }
    );

    window.addEventListener(
      'touchend',
      function () {
        touchHandled = false;
      },
      { passive: true }
    );

    // Eventos de Teclado (Setas, PageUp, PageDown, Espaço)
    window.addEventListener('keydown', function (e) {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (['input', 'textarea', 'select'].includes(activeTag)) return;

      if (['ArrowDown', 'PageDown', ' '].includes(e.key)) {
        handle(1, e);
      } else if (['ArrowUp', 'PageUp'].includes(e.key)) {
        handle(-1, e);
      }
    });

    // Botão "Quero este modelo" da Vitrine
    if (el.btnReelAdd) {
      el.btnReelAdd.addEventListener('click', function () {
        if (!state.framesData || !state.store) return;
        const model = state.framesData.m[state.currentModelIndex];
        if (!model) return;
        const prod = state.store.products.find(p => p.id === model.p);
        if (!prod) return;

        addToCart(prod, 12);
        el.btnReelAdd.textContent = 'Adicionado ao pedido ✓';
        el.btnReelAdd.classList.add('added');
      });
    }
  }

  // --- Vídeo em loop no Topo (substitui a taça estática) ---
  function hero() {
    const heroSection = document.getElementById('hero') || document.getElementById('topo');
    if (!heroSection) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let v = heroSection.querySelector('.hv');

    if (!v) {
      v = document.createElement('video');
      v.className = 'hv';
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.preload = 'auto';
      v.poster = 'video/hero-poster.jpg';
      v.setAttribute('aria-hidden', 'true');
      v.setAttribute('tabindex', '-1');
      if (!reduce) v.autoplay = true;

      v.innerHTML = `
        <source src="video/hero.webm" type="video/webm">
        <source src="video/hero.mp4" type="video/mp4">
      `;
      heroSection.appendChild(v);
    }

    v.muted = true;
    if (!reduce) {
      v.play().catch(() => {});
    } else {
      v.removeAttribute('autoplay');
      v.pause();
    }

    // Economiza bateria: pausa quando o topo sai da tela e reproduz ao voltar
    if (window.IntersectionObserver) {
      new IntersectionObserver(([entry]) => {
        if (reduce) return;
        if (entry.isIntersecting) {
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      }, { threshold: 0.05 }).observe(heroSection);
    }
  }

  // --- Catálogo e Filtros ---
  function renderCatalog() {
    if (!state.store || !Array.isArray(state.store.products)) return;
    renderFilters();
    renderProducts();
  }

  function renderFilters() {
    if (!el.catalogFilters || !state.store) return;
    const categories = ['Todos'];
    state.store.products.forEach(p => {
      if (p.cat && !categories.includes(p.cat)) {
        categories.push(p.cat);
      }
    });

    el.catalogFilters.innerHTML = '';
    categories.forEach(cat => {
      const slug = cat.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `filter-btn chip-${slug} ${state.selectedCategory === cat ? 'active' : ''}`;
      btn.textContent = cat;
      btn.addEventListener('click', () => {
        state.selectedCategory = cat;
        renderFilters();
        renderProducts();
      });
      el.catalogFilters.appendChild(btn);
    });
  }

  function renderProducts() {
    if (!el.productsGrid || !state.store) return;
    const filtered = state.store.products.filter(p => {
      return state.selectedCategory === 'Todos' || p.cat === state.selectedCategory;
    });

    el.productsGrid.innerHTML = '';

    filtered.forEach(prod => {
      const catSlug = (prod.cat || 'outros').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      const card = document.createElement('article');
      card.className = `product-card cat-${catSlug}`;

      card.innerHTML = `
        <div class="product-thumb-wrap thumb-cat-${catSlug}">
          <img src="${prod.img}" alt="${escapeHtml(prod.name)}" class="product-thumb" loading="lazy">
        </div>
        <div class="product-cat cat-tag-${catSlug}">${escapeHtml(prod.cat || 'Personalizado')}</div>
        <h3 class="product-name">${escapeHtml(prod.name)}</h3>
        <p class="product-desc">${escapeHtml(prod.desc || '')}</p>
        <div class="product-actions">
          <div class="qty-control" role="group" aria-label="Quantidade">
            <button type="button" class="qty-btn btn-minus" aria-label="Diminuir quantidade">−</button>
            <input type="number" class="qty-input" value="12" min="1" step="6" aria-label="Quantidade em unidades">
            <button type="button" class="qty-btn btn-plus" aria-label="Aumentar quantidade">+</button>
          </div>
          <button type="button" class="btn-add">
            <span>Adicionar</span>
          </button>
        </div>
      `;

      const input = card.querySelector('.qty-input');
      const btnMinus = card.querySelector('.btn-minus');
      const btnPlus = card.querySelector('.btn-plus');
      const btnAdd = card.querySelector('.btn-add');

      btnMinus.addEventListener('click', () => {
        let val = parseInt(input.value, 10) || 12;
        val = Math.max(1, val - 6);
        input.value = val;
      });

      btnPlus.addEventListener('click', () => {
        let val = parseInt(input.value, 10) || 12;
        val += 6;
        input.value = val;
      });

      input.addEventListener('change', () => {
        let val = parseInt(input.value, 10);
        if (isNaN(val) || val < 1) val = 1;
        input.value = val;
      });

      btnAdd.addEventListener('click', () => {
        const qty = parseInt(input.value, 10) || 12;
        addToCart(prod, qty);

        // Feedback de botão "Adicionado" por 1,2 s
        btnAdd.innerHTML = '<span>Adicionado ✓</span>';
        btnAdd.classList.add('added');
        setTimeout(() => {
          btnAdd.innerHTML = '<span>Adicionar</span>';
          btnAdd.classList.remove('added');
        }, 1200);
      });

      el.productsGrid.appendChild(card);
    });
  }

  // --- Gaveta do Pedido (Cart Drawer) ---
  function setupCartUI() {
    if (el.btnOpenCart) {
      el.btnOpenCart.addEventListener('click', openCartDrawer);
    }
    if (el.btnCloseDrawer) {
      el.btnCloseDrawer.addEventListener('click', closeCartDrawer);
    }
    if (el.btnContinueShopping) {
      el.btnContinueShopping.addEventListener('click', closeCartDrawer);
    }
    if (el.cartDrawerOverlay) {
      el.cartDrawerOverlay.addEventListener('click', closeCartDrawer);
    }
    if (el.btnSendWhatsapp) {
      el.btnSendWhatsapp.addEventListener('click', sendOrderViaWhatsapp);
    }
    updateCartDisplay();
  }

  function openCartDrawer() {
    if (el.cartDrawer) el.cartDrawer.classList.add('open');
    if (el.cartDrawerOverlay) el.cartDrawerOverlay.classList.add('open');
  }

  function closeCartDrawer() {
    if (el.cartDrawer) el.cartDrawer.classList.remove('open');
    if (el.cartDrawerOverlay) el.cartDrawerOverlay.classList.remove('open');
  }

  function addToCart(prod, qty) {
    const existing = state.cart.find(item => item.id === prod.id);
    if (existing) {
      existing.qty += qty;
    } else {
      state.cart.push({
        id: prod.id,
        name: prod.name,
        code: prod.id,
        img: prod.img,
        qty: qty
      });
    }
    saveCartToSession();
    updateCartDisplay();
  }

  function updateCartDisplay() {
    const totalItems = state.cart.reduce((sum, i) => sum + i.qty, 0);
    if (el.cartCount) el.cartCount.textContent = totalItems;

    if (!el.drawerItems) return;

    if (state.cart.length === 0) {
      el.drawerItems.innerHTML = `
        <div class="drawer-empty">
          <p>Seu pedido está vazio.</p>
          <p style="margin-top: 8px; font-size: 0.85rem; opacity: 0.7;">
            Navegue pelo catálogo ou pela vitrine 360° para escolher seus modelos prediletos!
          </p>
        </div>
      `;
      if (el.btnSendWhatsapp) el.btnSendWhatsapp.disabled = true;
      return;
    }

    if (el.btnSendWhatsapp) el.btnSendWhatsapp.disabled = false;
    el.drawerItems.innerHTML = '';

    state.cart.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'cart-item';
      itemEl.innerHTML = `
        <img src="${item.img}" alt="${escapeHtml(item.name)}" class="cart-item-img">
        <div class="cart-item-info">
          <span class="cart-item-name">${escapeHtml(item.name)}</span>
          <span class="cart-item-code">Cód. ${escapeHtml(item.code)}</span>
          <div class="cart-item-qty">
            <button type="button" class="btn-item-minus" aria-label="Diminuir">−</button>
            <span>${item.qty} un.</span>
            <button type="button" class="btn-item-plus" aria-label="Aumentar">+</button>
          </div>
        </div>
        <button type="button" class="btn-remove-item" title="Remover item" aria-label="Remover">✕</button>
      `;

      itemEl.querySelector('.btn-item-minus').addEventListener('click', () => {
        item.qty = Math.max(1, item.qty - 6);
        saveCartToSession();
        updateCartDisplay();
      });

      itemEl.querySelector('.btn-item-plus').addEventListener('click', () => {
        item.qty += 6;
        saveCartToSession();
        updateCartDisplay();
      });

      itemEl.querySelector('.btn-remove-item').addEventListener('click', () => {
        state.cart = state.cart.filter(i => i.id !== item.id);
        saveCartToSession();
        updateCartDisplay();
      });

      el.drawerItems.appendChild(itemEl);
    });
  }

  // --- Envio do Pedido via WhatsApp ---
  function sendOrderViaWhatsapp() {
    if (state.cart.length === 0 || !state.store) return;

    const whatsappDigits = (state.store.whatsapp || '').replace(/\D/g, '');
    if (!whatsappDigits) {
      alert('Número de WhatsApp da loja não configurado.');
      return;
    }

    let text = 'Olá! Quero fazer um orçamento destes itens:\n\n';
    state.cart.forEach(item => {
      text += `• ${item.name} (cód. ${item.code}): ${item.qty} un.\n`;
    });
    text += '\nPode me enviar a foto e os valores?';

    const url = `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // --- Persistência de Sessão do Carrinho ---
  function saveCartToSession() {
    try {
      sessionStorage.setItem('lumina_cart', JSON.stringify(state.cart));
    } catch (e) {}
  }

  function loadCartFromSession() {
    try {
      const saved = sessionStorage.getItem('lumina_cart');
      if (saved) {
        state.cart = JSON.parse(saved);
      }
    } catch (e) {}
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Inicia tudo no carregamento do DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
