# Loja de Copos Personalizados com Vitrine 360°

Site elegante e tecnológico para apresentação e venda de copos, taças, squeezes e canecas personalizados com vitrine 360° interativa em tela cheia e fechamento de pedidos direto no WhatsApp.

Construído em **Node.js nativo puro (sem dependências e sem npm install)** e front-end com HTML, CSS e JavaScript puros.

---

## 🚀 Como Rodar o Projeto

1. Certifique-se de ter o **Node.js 18+** instalado.
2. No diretório do projeto, inicie o servidor:
   ```bash
   node server.js
   ```
   *Ou utilizando o npm:*
   ```bash
   npm start
   ```
3. Abra seu navegador em:
   ```
   http://localhost:3000
   ```
4. Para acessar o painel administrativo:
   ```
   http://localhost:3000/admin
   ```

---

## 🔐 Como Trocar a Senha do Painel

A senha padrão do painel é `troque-esta-senha`.

Para definir sua própria senha em produção, inicie o servidor com a variável de ambiente `ADMIN_PASSWORD`:

- **Linux / macOS:**
  ```bash
  ADMIN_PASSWORD="sua-senha-super-secreta" node server.js
  ```

- **Windows (PowerShell):**
  ```powershell
  $env:ADMIN_PASSWORD="sua-senha-super-secreta"; node server.js
  ```

- **Windows (CMD):**
  ```cmd
  set ADMIN_PASSWORD=sua-senha-super-secreta && node server.js
  ```

---

## 📱 Como Trocar o WhatsApp da Loja

Você pode alterar o WhatsApp e o Nome da Loja de duas formas simples:

1. **Pelo Painel Administrativo:** Acesse `/admin`, faça login com sua senha e altere o campo **WhatsApp** (formato: DDI + DDD + número, somente dígitos, ex: `5511999998888`) e clique em **Salvar alterações da loja**.
2. **Direto no arquivo de dados:** Edite o campo `"whatsapp"` no arquivo `public/data/store.json`.

---

## 🔄 Como Trocar ou Adicionar Frames na Vitrine 360°

A vitrine 360° lê a sequência de imagens mapeadas em `public/data/frames.json`:
- **Imagens dos frames:** colocadas em `public/frames/` no formato WebP (resolução recomendada: 576×1024).
- **Mapeamento (`public/data/frames.json`):**
  - `f`: lista dos caminhos de todas as imagens.
  - `m`: lista dos modelos da vitrine, onde cada modelo possui `p` (código do produto no catálogo) e `i` (índices dos 5 frames de repouso).
  - `t`: lista de transições entre os modelos consecutivos.

Ao editar um produto no painel administrativo com o mesmo código `p`, seu título e descrição são atualizados automaticamente na vitrine 360°.

---

## 🌐 Como Publicar (Deploy)

O projeto foi projetado com máxima portabilidade:

- **Hospedagem Node.js (Render, Railway, Fly.io, VPS):**
  - Basta clonar o repositório e executar `node server.js`. Nenhuma etapa de build ou `npm install` é necessária.
  - Configure a variável `ADMIN_PASSWORD` no painel da sua hospedagem.
  - Porta configurável via variável de ambiente `PORT` (padrão 3000).

- **Hospedagem Estática (GitHub Pages, Vercel, Netlify):**
  - Caso utilize como catálogo estático, todos os arquivos de `public/` podem ser hospedados diretamente. O site possui fallback automático para ler `data/store.json` caso a API Node.js não esteja presente.
