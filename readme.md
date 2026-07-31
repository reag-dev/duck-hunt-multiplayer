# 🦆 Duck Hunt Multiplayer

Uma versão multiplayer do clássico **Duck Hunt**, onde jogadores utilizam seus **celulares como controles** para mirar e atirar no jogo principal exibido no host.

O projeto foi desenvolvido como um **MVP**, com foco em jogos em tempo real, WebSockets e integração com sensores de dispositivos móveis.

🔗 **Live:** https://duck-hunt-multiplayer-gamma.vercel.app

---

## 🎯 Visão Geral

- 🎮 **Host**: roda o jogo principal no navegador (desktop / TV).
- 📱 **Controller**: jogadores acessam pelo celular e usam giroscópio e botões.
- 🔌 Comunicação em tempo real via **WebSocket**.
- 🔁 Suporte a **reconexão (rejoin)** para evitar perda de player em quedas de rede.

---

## 🚀 Como rodar localmente

### 1. Clone o repositório

```bash
git clone https://github.com/reag-dev/duck-hunt-multiplayer.git
cd duck-hunt-multiplayer
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Inicie o projeto

```bash
npm run dev
```

### 4. Inicie o servidor Web Socket

```bash
Siga as intruções do repositorio para inciar o servidor: https://github.com/reag-dev/duck-hunt-multiplayer-server
```

### 5. Define a URL do servidor (WebSocket) na ".env" como demonstrado no ".env.example"

```bash
VITE_WS_URL=wss://your-server.up.railway.app
```

Acesse:

- **Host:** http://localhost:5173
- **Controller:** http://localhost:5173/controller.html

---

## 📱 Nota importante para iOS (Safari)

Dispositivos iOS **não permitem acesso ao giroscópio** quando a aplicação está rodando em:

- `http://localhost`
- IPs locais (`192.168.x.x`)

Para que o **giroscópio funcione corretamente no iPhone**, é necessário expor o projeto usando **HTTPS**.

Em **produção** (deploy no Vercel) isso já é resolvido automaticamente — o domínio do Vercel serve tudo em HTTPS.

### Testando localmente em iOS antes do deploy

```bash
cloudflared tunnel --url http://localhost:5173
```

Após isso:

- Acesse o **link HTTPS gerado** no iPhone
- O Safari solicitará permissão de movimento
- O giroscópio funcionará corretamente

> Essa etapa só é necessária para testes locais em dispositivos iOS, não em produção.

---

## 🚀 Deploy em produção

- **Frontend:** Vercel detecta o projeto Vite automaticamente (`npm run build`, saída em `dist/`, dois entry points: `index.html` e `controller.html`). Configure a env var `VITE_WS_URL` no painel do projeto apontando para a URL `wss://` do servidor implantado.
  - Deploy atual: https://duck-hunt-multiplayer-gamma.vercel.app
- **Servidor WebSocket:** ver deploy no Railway em [duck-hunt-multiplayer-server](https://github.com/reag-dev/duck-hunt-multiplayer-server).
  - Deploy atual: `wss://duck-hunt-multiplayer-server-production.up.railway.app`

---

## 🧠 Funcionalidades

- Criação de salas (host)
- Entrada de múltiplos controllers
- Limite de jogadores por sala
- Controle por giroscópio
- Rejoin simples (reconexão mantendo o mesmo player)
- Proteção contra duplicação de player
- Notificações de conexão e desconexão

---

## 📦 Stack

- HTML
- CSS
- TypeScript
- WebSocket (`ws`)
- Vite
- Kaplay (old name Kaboom.js game engine)

---

## ⚠️ Observações

- O estado do jogo é mantido apenas em memória
- Não utiliza banco de dados ou persistência externa
- Não possui autenticação
- Ideal para MVPs e protótipos multiplayer

---

## 📄 Licença

Projeto pessoal e educacional.
