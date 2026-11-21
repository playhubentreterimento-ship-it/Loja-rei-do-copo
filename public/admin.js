// =========================================================================
// Lumina Personalizados - Painel Administrativo (admin.js)
// Zero dependências, vanilla JavaScript de alto padrão
// =========================================================================

(function () {
  'use strict';

  let currentStore = null;
  let optimizedImageDataUrl = null;

  const el = {
    loginModal: document.getElementById('login-modal'),
    formLogin: document.getElementById('form-login'),
    adminPass: document.getElementById('admin-pass'),
    loginError: document.getElementById('login-error'),
    adminContent: document.getElementById('admin-content'),
    btnLogout: document.getElementById('btn-logout'),
    alertSuccess: document.getElementById('alert-success'),
    alertError: document.getElementById('alert-error'),
    formSettings: document.getElementById('form-settings'),
    storeBrand: document.getElementById('store-brand'),
    storeWhatsapp: document.getElementById('store-whatsapp'),
    formNewProduct: document.getElementById('form-new-product'),
    prodName: document.getElementById('prod-name'),
    prodCat: document.getElementById('prod-cat'),
    catsList: document.getElementById('cats-list'),
    prodDesc: document.getElementById('prod-desc'),
    prodPhoto: document.getElementById('prod-photo'),
    previewImg: document.getElementById('preview-img'),
    dropzoneText: document.getElementById('dropzone-text'),
    prodFeat: document.getElementById('prod-feat'),
    btnSaveProd: document.getElementById('btn-save-prod'),
    totalProds: document.getElementById('total-prods'),
    tableProductsBody: document.getElementById('table-products-body')
  };

  function getStoredKey() {
    return sessionStorage.getItem('admin_key');
  }

  function setStoredKey(key) {
    sessionStorage.setItem('admin_key', key);
  }

  function removeStoredKey() {
    sessionStorage.removeItem('admin_key');
  }

  // --- Inicialização ---
  async function init() {
    setupEvents();
    const key = getStoredKey();
    if (key) {
      const ok = await loadStoreData(key);
      if (ok) {
        showAdmin();
      } else {
        removeStoredKey();
        showLogin();
      }
    } else {
      showLogin();
    }
  }

  function showLogin() {
    if (el.loginModal) el.loginModal.style.display = 'flex';
    if (el.adminContent) el.adminContent.style.display = 'none';
  }

  function showAdmin() {
    if (el.loginModal) el.loginModal.style.display = 'none';
    if (el.adminContent) el.adminContent.style.display = 'block';
  }

  function showMessage(type, text) {
    const box = type === 'success' ? el.alertSuccess : el.alertError;
    if (!box) return;
    box.textContent = text;
    box.style.display = 'block';
    setTimeout(() => {
      box.style.display = 'none';
    }, 4500);
  }

  // --- Carregamento de Dados da Loja ---
  async function loadStoreData(key) {
    try {
      const res = await fetch('/api/store', {
        headers: { 'x-admin-key': key }
      });
      if (res.status === 401) {
        return false;
      }
      if (!res.ok) throw new Error('Falha ao comunicar com o servidor');

      currentStore = await res.json();
      populateUI();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  function populateUI() {
    if (!currentStore) return;

    // Configurações gerais
    if (el.storeBrand) el.storeBrand.value = currentStore.brand || '';
    if (el.storeWhatsapp) el.storeWhatsapp.value = currentStore.whatsapp || '';

    // Sugestões de categorias
    if (el.catsList) {
      el.catsList.innerHTML = '';
      const cats = Array.from(new Set(currentStore.products.map(p => p.cat).filter(Boolean)));
      cats.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        el.catsList.appendChild(opt);
      });
    }

    // Contagem e tabela
    if (el.totalProds) el.totalProds.textContent = currentStore.products.length;
    renderProductsTable();
  }

  function renderProductsTable() {
    if (!el.tableProductsBody || !currentStore) return;
    el.tableProductsBody.innerHTML = '';

    currentStore.products.forEach(prod => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><img src="${prod.img}" alt="${escapeHtml(prod.name)}" class="table-thumb"></td>
        <td><strong>${escapeHtml(prod.name)}</strong></td>
        <td>${escapeHtml(prod.cat || '—')}</td>
        <td><code>${escapeHtml(prod.id)}</code></td>
        <td>
          <button type="button" class="btn-star ${prod.feat ? 'active' : ''}" title="Alternar destaque" aria-label="Destaque">
            ${prod.feat ? '★' : '☆'}
          </button>
        </td>
        <td>
          <button type="button" class="btn-delete" title="Excluir produto">Excluir</button>
        </td>
      `;

      // Alternar destaque
      const btnStar = tr.querySelector('.btn-star');
      btnStar.addEventListener('click', async () => {
        prod.feat = !prod.feat;
        await saveStore(currentStore, 'Destaque atualizado com sucesso.');
        populateUI();
      });

      // Excluir produto com confirmação
      const btnDelete = tr.querySelector('.btn-delete');
      btnDelete.addEventListener('click', async () => {
        const ok = confirm(`Deseja realmente excluir o produto "${prod.name}" (${prod.id})?`);
        if (!ok) return;

        currentStore.products = currentStore.products.filter(p => p.id !== prod.id);
        await saveStore(currentStore, 'Produto excluído com sucesso.');
        populateUI();
      });

      el.tableProductsBody.appendChild(tr);
    });
  }

  // --- Salvar Dados no Servidor ---
  async function saveStore(storeData, successMsg) {
    const key = getStoredKey();
    if (!key) {
      showLogin();
      return false;
    }

    try {
      const res = await fetch('/api/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': key
        },
        body: JSON.stringify(storeData)
      });

      if (res.status === 401) {
        removeStoredKey();
        showLogin();
        showMessage('error', 'Sessão expirada ou senha incorreta.');
        return false;
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.erro || 'Falha ao salvar dados.');
      }

      showMessage('success', successMsg || 'Alterações salvas com sucesso!');
      return true;
    } catch (err) {
      showMessage('error', 'Erro ao salvar: ' + err.message);
      return false;
    }
  }

  // --- Redimensionar Imagem no Navegador (Lado maior 900px, WebP 0.85) ---
  function resizeImageToWebP(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          let w = img.width;
          let h = img.height;
          const maxSide = 900;

          if (w > maxSide || h > maxSide) {
            if (w > h) {
              h = Math.round((h * maxSide) / w);
              w = maxSide;
            } else {
              w = Math.round((w * maxSide) / h);
              h = maxSide;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);

          // Gera data:image/webp com compressão 0.85
          const dataUrl = canvas.toDataURL('image/webp', 0.85);
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error('Falha ao decodificar imagem.'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Falha ao ler arquivo.'));
      reader.readAsDataURL(file);
    });
  }

  // --- Configuração dos Eventos ---
  function setupEvents() {
    // Submissão do login
    if (el.formLogin) {
      el.formLogin.addEventListener('submit', async e => {
        e.preventDefault();
        const pass = el.adminPass.value.trim();
        if (!pass) return;

        const ok = await loadStoreData(pass);
        if (ok) {
          setStoredKey(pass);
          showAdmin();
          if (el.loginError) el.loginError.style.display = 'none';
        } else {
          if (el.loginError) {
            el.loginError.textContent = 'Senha incorreta. Tente novamente.';
            el.loginError.style.display = 'block';
          }
        }
      });
    }

    // Logout
    if (el.btnLogout) {
      el.btnLogout.addEventListener('click', () => {
        removeStoredKey();
        if (el.adminPass) el.adminPass.value = '';
        showLogin();
      });
    }

    // Salvar configurações gerais
    if (el.formSettings) {
      el.formSettings.addEventListener('submit', async e => {
        e.preventDefault();
        if (!currentStore) return;

        currentStore.brand = el.storeBrand.value.trim();
        currentStore.whatsapp = el.storeWhatsapp.value.trim().replace(/\D/g, '');

        await saveStore(currentStore, 'Configurações da loja salvas com sucesso!');
      });
    }

    // Seleção e prévia da foto
    if (el.prodPhoto) {
      el.prodPhoto.addEventListener('change', async () => {
        const file = el.prodPhoto.files[0];
        if (!file) {
          optimizedImageDataUrl = null;
          if (el.previewImg) el.previewImg.style.display = 'none';
          if (el.dropzoneText) el.dropzoneText.textContent = 'Clique ou arraste uma foto aqui';
          return;
        }

        try {
          if (el.dropzoneText) el.dropzoneText.textContent = 'Otimizando imagem…';
          optimizedImageDataUrl = await resizeImageToWebP(file);
          if (el.previewImg) {
            el.previewImg.src = optimizedImageDataUrl;
            el.previewImg.style.display = 'block';
          }
          if (el.dropzoneText) el.dropzoneText.textContent = file.name;
        } catch (err) {
          alert('Erro ao processar imagem: ' + err.message);
          optimizedImageDataUrl = null;
        }
      });
    }

    // Cadastrar novo produto
    if (el.formNewProduct) {
      el.formNewProduct.addEventListener('submit', async e => {
        e.preventDefault();
        if (!currentStore) return;

        if (!optimizedImageDataUrl) {
          alert('Por favor, selecione uma foto para o produto.');
          return;
        }

        const key = getStoredKey();
        if (!key) {
          showLogin();
          return;
        }

        try {
          if (el.btnSaveProd) el.btnSaveProd.disabled = true;

          // 1. Upload da imagem via /api/upload
          const upRes = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-admin-key': key
            },
            body: JSON.stringify({ data: optimizedImageDataUrl })
          });

          if (!upRes.ok) {
            const upErr = await upRes.json().catch(() => ({}));
            throw new Error(upErr.erro || 'Falha no upload da foto.');
          }

          const { path } = await upRes.json();

          // 2. Criação do produto
          const nextNum = currentStore.products.length + 1;
          const padCode = 'p' + String(nextNum).padStart(2, '0');
          // Garante código único
          let uniqueCode = padCode;
          let counter = 1;
          while (currentStore.products.some(p => p.id === uniqueCode)) {
            uniqueCode = 'p' + String(nextNum + counter).padStart(2, '0');
            counter++;
          }

          const isFeat = !!el.prodFeat.checked;
          const newProduct = {
            id: uniqueCode,
            name: el.prodName.value.trim(),
            cat: el.prodCat.value.trim(),
            desc: el.prodDesc.value.trim(),
            feat: isFeat,
            img: path
          };

          if (isFeat) {
            currentStore.products.unshift(newProduct);
          } else {
            currentStore.products.push(newProduct);
          }

          // 3. Salva loja atualizada
          const saved = await saveStore(currentStore, 'Produto cadastrado e publicado com sucesso!');
          if (saved) {
            el.formNewProduct.reset();
            optimizedImageDataUrl = null;
            if (el.previewImg) el.previewImg.style.display = 'none';
            if (el.dropzoneText) el.dropzoneText.textContent = 'Clique ou arraste uma foto aqui';
            populateUI();
          }
        } catch (err) {
          showMessage('error', 'Erro ao cadastrar produto: ' + err.message);
        } finally {
          if (el.btnSaveProd) el.btnSaveProd.disabled = false;
        }
      });
    }
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
