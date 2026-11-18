# ⏳ Chronos RPG — Gerenciador Dinâmico de Tempo para RPG Contemporâneo

Aplicativo utilitário local projetado para mesas de RPG de investigação, horror urbano e sci-fi (*Ordem Paranormal*, *Call of Cthulhu*, *Delta Green*, *Cyberpunk*, etc.). Resolve o atrito narrativo da passagem de tempo elástica com duas interfaces sincronizadas em tempo real:

1. **Módulo 1 — Painel de Controle do Mestre (`src/master.html`)**: Centro de comando administrativo completo com Master Clock, presets de cenas e ratios de tempo elásticos, controles de simulação e chaves de visibilidade ambiental dos jogadores.
2. **Módulo 2 — Overlay Flutuante da Mesa (`src/overlay.html`)**: Janela transparente *always-on-top* invocada ou ocultada instantaneamente pelo atalho global **`Ctrl + Shift + T`**, exibindo o Semicírculo Celeste (Sol/Lua em órbita de 360° sincronizada com 24h) e o relógio condicional dos personagens (Digital, Analógico por ponteiros ou Oculto).

---

## 🚀 Como Executar

### Opção 1: Aplicativo Desktop Completo via Electron (Recomendado)
Garante janela flutuante transparente sobre qualquer VTT/Discord e o atalho global de sistema **`Ctrl + Shift + T`** mesmo quando o aplicativo está em segundo plano:

```bash
npm start
```

### Opção 2: Modo Servidor Web Local (Navegador)
Caso deseje abrir diretamente no navegador em duas abas/janelas sincronizadas via `BroadcastChannel` e `localStorage`:

```bash
npm run web
```
- **Painel do Mestre**: `http://localhost:3456/master.html`
- **Overlay da Mesa**: `http://localhost:3456/overlay.html`

---

## ⌨️ Atalhos Globais (Modo Electron)

| Atalho | Função |
| :--- | :--- |
| **`Ctrl + Shift + T`** | Exibe ou oculta instantaneamente o **Overlay Flutuante da Mesa** sem roubar o foco da janela ativa. |
| **`Ctrl + Shift + Y`** | Alterna o modo *Click-Through* (ignorar cliques do mouse no Overlay para clicar através dele). |

