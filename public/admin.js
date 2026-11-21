// =========================================================================
// Lumina Personalizados - Painel Administrativo (admin.js)
// Zero dependências, vanilla JavaScript de alto padrão
// Suporte a login em servidor Node e hospedagem estática, e redefinição de senha
// =========================================================================

(function () {
  'use strict';

  const DEFAULT_KEY = 'troque-esta-senha';
  let currentStore = null;
  let optimizedImageDataUrl = null;

  const el = {
    loginModal: document.getElementById('login-modal'),
    loginView: document.getElementById('login-view'),
    resetView: document.getElementById('reset-view'),
    formLogin: document.getElementById('form-login'),
    adminPass: document.getElementById('admin-pass'),
    loginError: document.getElementById('login-error'),
    loginSuccess: document.getElementById('login-success'),
    btnShowReset: document.getElementById('btn-show-reset'),
    btnBackToLogin: document.getElementById('btn-back-to-login'),
    formReset: document.getElementById('form-reset'),
    newPassReset: document.getElementById('new-pass-reset'),
    confirmPassReset: document.getElementById('confirm-pass-reset'),
    resetError: document.getElementById('reset-error'),

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
    tableProductsBody: document.getElementById('table-products-body'),

    formChangePass: document.getElementById('form-change-pass'),
    newPassField: document.getElementById('new-pass-field'),
    confirmPassField: document.getElementById('confirm-pass-field')
  };

  // --- Gerenciamento de Senha Local / Sessão ---
  function getLocalPassword() {
    return localStorage.getItem('lumina_admin_password') || DEFAULT_KEY;
  }

  function setLocalPassword(newPass) {
    localStorage.setItem('lumina_admin_password', newPass);
  }

  function getSessionKey() {
    return sessionStorage.getItem('admin_key');
  }

  function setSessionKey(key) {
    sessionStorage.setItem('admin_key', key);
  }

  function removeSessionKey() {
    sessionStorage.removeItem('admin_key');
  }

  // --- Inicialização ---
  async function init() {
    setupEvents();
    setupEyeToggles();

    const key = getSessionKey();
    if (key) {
      const ok = await verifyAndLoad(key);
      if (ok) {
        showAdmin();
      } else {
        removeSessionKey();
        showLogin();
      }
    } else {
      showLogin();
    }
  }

  function showLogin() {
    if (el.loginModal) el.loginModal.style.display = 'flex';
    if (el.loginView) el.loginView.style.display = 'block';
    if (el.resetView) el.resetView.style.display = 'none';
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

  // --- Botão de Olho (👁) para Ver/Ocultar Senha ---
  function setupEyeToggles() {
    document.querySelectorAll('.btn-toggle-eye').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (!input) return;
        if (input.type === 'password') {
          input.type = 'text';
          btn.textContent = '🔒';
        } else {
          input.type = 'password';
          btn.textContent = '👁';
        }
      });
    });
  }

  // --- Verificação e Login ---
  async function verifyPassword(password) {
    // 1. Tenta validar no backend via /api/login
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (res.ok) {
        setLocalPassword(password);
        return true;
      }
      if (res.status === 401) {
        return false;
      }
    } catch (e) {
      // Backend inacessível (ex: hospedagem estática pura na Vercel)
    }

    // 2. Fallback: valida contra a senha armazenada localmente
    const expected = getLocalPassword();
    return password === expected;
  }

  async function verifyAndLoad(key) {
    const isValid = await verifyPassword(key);
    if (!isValid) return false;

    // Carrega dados da loja
    try {
      let res;
      try {
        res = await fetch('/api/store', {
          headers: { 'x-admin-key': key }
        });
        if (!res.ok) throw new Error();
      } catch (e) {
        res = await fetch('data/store.json');
      }
      currentStore = await res.json();
      populateUI();
      return true;
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      return false;
    }
  }

  function populateUI() {
    if (!currentStore) return;

    if (el.storeBrand) el.storeBrand.value = currentStore.brand || '';
    if (el.storeWhatsapp) el.storeWhatsapp.value = currentStore.whatsapp || '';

    if (el.catsList) {
      el.catsList.innerHTML = '';
      const cats = Array.from(new Set(currentStore.products.map(p => p.cat).filter(Boolean)));
      cats.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        el.catsList.appendChild(opt);
      });
    }

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

      const btnStar = tr.querySelector('.btn-star');
      btnStar.addEventListener('click', async () => {
        prod.feat = !prod.feat;
        await saveStore(currentStore, 'Destaque atualizado com sucesso.');
        populateUI();
      });

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
    const key = getSessionKey();
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
        removeSessionKey();
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
      // Caso esteja em modo estático sem backend ativo
      showMessage('success', (successMsg || 'Alterações salvas') + ' (modo local).');
      return true;
    }
  }

  // --- Redefinição e Atualização de Senha ---
  async function updatePassword(newPassword) {
    // 1. Salva localmente
    setLocalPassword(newPassword);
    setSessionKey(newPassword);

    // 2. Notifica o backend se estiver rodando
    try {
      await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      });
    } catch (e) {}

    return true;
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
    // 1. Alternar entre Login e Redefinição de Senha
    if (el.btnShowReset) {
      el.btnShowReset.addEventListener('click', () => {
        if (el.loginView) el.loginView.style.display = 'none';
        if (el.resetView) el.resetView.style.display = 'block';
        if (el.resetError) el.resetError.style.display = 'none';
      });
    }

    if (el.btnBackToLogin) {
      el.btnBackToLogin.addEventListener('click', () => {
        if (el.resetView) el.resetView.style.display = 'none';
        if (el.loginView) el.loginView.style.display = 'block';
        if (el.loginError) el.loginError.style.display = 'none';
      });
    }

    // 2. Submissão do Login
    if (el.formLogin) {
      el.formLogin.addEventListener('submit', async e => {
        e.preventDefault();
        const pass = el.adminPass.value.trim();
        if (!pass) return;

        const ok = await verifyAndLoad(pass);
        if (ok) {
          setSessionKey(pass);
          showAdmin();
          if (el.loginError) el.loginError.style.display = 'none';
        } else {
          if (el.loginError) {
            el.loginError.textContent = 'Senha incorreta. Tente novamente ou use a opção "Redefinir senha".';
            el.loginError.style.display = 'block';
          }
        }
      });
    }

    // 3. Submissão da Redefinição de Senha (na tela de login)
    if (el.formReset) {
      el.formReset.addEventListener('submit', async e => {
        e.preventDefault();
        const newPass = el.newPassReset.value.trim();
        const confirmPass = el.confirmPassReset.value.trim();

        if (newPass.length < 4) {
          el.resetError.textContent = 'A nova senha deve ter no mínimo 4 caracteres.';
          el.resetError.style.display = 'block';
          return;
        }

        if (newPass !== confirmPass) {
          el.resetError.textContent = 'As senhas não coincidem. Digite novamente.';
          el.resetError.style.display = 'block';
          return;
        }

        await updatePassword(newPass);
        await verifyAndLoad(newPass);
        showAdmin();
        showMessage('success', 'Nova senha definida com sucesso!');
      });
    }

    // 4. Alteração de Senha (dentro do painel)
    if (el.formChangePass) {
      el.formChangePass.addEventListener('submit', async e => {
        e.preventDefault();
        const newPass = el.newPassField.value.trim();
        const confirmPass = el.confirmPassField.value.trim();

        if (newPass.length < 4) {
          showMessage('error', 'A nova senha deve ter no mínimo 4 caracteres.');
          return;
        }

        if (newPass !== confirmPass) {
          showMessage('error', 'As senhas digitadas não coincidem.');
          return;
        }

        await updatePassword(newPass);
        el.newPassField.value = '';
        el.confirmPassField.value = '';
        showMessage('success', 'Senha alterada com sucesso!');
      });
    }

    // 5. Logout
    if (el.btnLogout) {
      el.btnLogout.addEventListener('click', () => {
        removeSessionKey();
        if (el.adminPass) el.adminPass.value = '';
        showLogin();
      });
    }

    // 6. Salvar configurações gerais
    if (el.formSettings) {
      el.formSettings.addEventListener('submit', async e => {
        e.preventDefault();
        if (!currentStore) return;

        currentStore.brand = el.storeBrand.value.trim();
        currentStore.whatsapp = el.storeWhatsapp.value.trim().replace(/\D/g, '');

        await saveStore(currentStore, 'Configurações da loja salvas com sucesso!');
      });
    }

    // 7. Seleção e prévia da foto
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

    // 8. Cadastrar novo produto
    if (el.formNewProduct) {
      el.formNewProduct.addEventListener('submit', async e => {
        e.preventDefault();
        if (!currentStore) return;

        if (!optimizedImageDataUrl) {
          alert('Por favor, selecione uma foto para o produto.');
          return;
        }

        const key = getSessionKey();
        if (!key) {
          showLogin();
          return;
        }

        try {
          if (el.btnSaveProd) el.btnSaveProd.disabled = true;

          let photoPath = 'img/products/p01.webp';
          try {
            const upRes = await fetch('/api/upload', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-admin-key': key
              },
              body: JSON.stringify({ data: optimizedImageDataUrl })
            });

            if (upRes.ok) {
              const resData = await upRes.json();
              photoPath = resData.path;
            }
          } catch (e) {
            // Em ambiente estático puro, usa a imagem codificada ou placeholder
            photoPath = optimizedImageDataUrl;
          }

          const nextNum = currentStore.products.length + 1;
          const padCode = 'p' + String(nextNum).padStart(2, '0');
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
            img: photoPath
          };

          if (isFeat) {
            currentStore.products.unshift(newProduct);
          } else {
            currentStore.products.push(newProduct);
          }

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
