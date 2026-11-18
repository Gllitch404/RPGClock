/**
 * Chronos RPG — Core Engine & Real-Time State Synchronization
 * Gerencia o tempo elástico da sessão, presets de cena, condições ambientais
 * e sincronização em tempo real entre Painel do Mestre e Overlay Flutuante.
 */

const STORAGE_KEY = 'chronos_rpg_state_v1';
const CHANNEL_NAME = 'chronos_rpg_sync_channel';

const SCENE_PRESETS = [
  {
    id: 'investigacao-real',
    name: 'Investigação Urbana (1:1)',
    subtitle: '1s Real = 1s Jogo • Diálogos e cenas em tempo real',
    ratio: 1,
    badge: '1x',
    icon: '🔍'
  },
  {
    id: 'infiltracao-tatica',
    name: 'Infiltração Tática',
    subtitle: '1s Real = 5s Jogo • Exploração cautelosa e furtividade',
    ratio: 5,
    badge: '5x',
    icon: '🕶️'
  },
  {
    id: 'combate-intenso',
    name: 'Combate Intenso',
    subtitle: '1s Real = 10s Jogo • Confrontos dinâmicos e perseguições',
    ratio: 10,
    badge: '10x',
    icon: '⚡'
  },
  {
    id: 'deslocamento-veiculo',
    name: 'Deslocamento /Investigação Rápida',
    subtitle: '1s Real = 60s Jogo (1s : 1m) • Trânsito urbano e buscas longas',
    ratio: 60,
    badge: '60x',
    icon: '🚘'
  },
  {
    id: 'descanso-vigilia',
    name: 'Vigília / Pesquisa de Arquivo',
    subtitle: '1s Real = 300s Jogo (1s : 5m) • Análise forense ou espera',
    ratio: 300,
    badge: '300x',
    icon: '📂'
  }
];

const DEFAULT_STATE = {
  // Tempo acumulado em segundos desde o Dia 1 às 00:00:00
  // Padrão inicial: Dia 1, 21:30:00 (noite urbana investigativa)
  gameSeconds: 21 * 3600 + 30 * 60,
  // Horário padrão de reset do dia (em segundos do dia, ex: 08:00 = 28800)
  resetDaySeconds: 8 * 3600,
  // Simulação ativa ou pausada
  isRunning: false,
  // Proporção (1 segundo real = X segundos no jogo)
  ratio: 1,
  activePresetId: 'investigacao-real',
  // Condições ambientais e visibilidade dos jogadores
  skyVision: true,           // Visão do Céu (Semicírculo Sol/Lua)
  clockAccess: true,         // Acesso a Relógio Físico (Pulso, Smartphone, Painel)
  clockType: 'digital',      // 'digital' | 'analog'
  // Nível de opacidade/transparência do HUD do Overlay (0.15 a 1.0)
  overlayOpacity: 0.65,
  // Visibilidade do HUD no modo navegador ou compartilhado
  overlayHudHidden: false,
  // Timestamp real da última atualização para cálculo contínuo sem drift
  lastSyncRealMs: Date.now()
};

class ChronosSyncEngine {
  constructor(role = 'viewer') {
    this.role = role; // 'master' | 'overlay' | 'viewer'
    this.listeners = new Set();
    this.overlayStatusListeners = new Set();
    this.channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;
    this.state = this.loadState();
    this.setupListeners();
  }

  loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_STATE, ...parsed };
      }
    } catch (err) {
      console.warn('Falha ao ler localStorage:', err);
    }
    return { ...DEFAULT_STATE, lastSyncRealMs: Date.now() };
  }

  saveAndBroadcast(partialState) {
    // Antes de mudar ratio ou pausar, consolida os segundos decorridos até o instante atual
    const currentTotalSeconds = this.getCurrentGameSeconds();

    this.state = {
      ...this.state,
      gameSeconds: currentTotalSeconds,
      ...partialState,
      lastSyncRealMs: Date.now()
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (err) {
      console.warn('Erro ao salvar estado no localStorage:', err);
    }

    if (this.channel) {
      this.channel.postMessage({ type: 'STATE_UPDATE', state: this.state });
    }

    if (window.chronosElectron && window.chronosElectron.isElectron) {
      window.chronosElectron.sendStateUpdate(this.state);
    }

    this.notifyListeners();
  }

  setupListeners() {
    if (this.channel) {
      this.channel.onmessage = (event) => {
        if (event.data && event.data.type === 'STATE_UPDATE') {
          this.state = { ...this.state, ...event.data.state };
          this.notifyListeners();
        }
      };
    }

    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          this.state = { ...this.state, ...JSON.parse(event.newValue) };
          this.notifyListeners();
        } catch (e) {
          // Ignora JSON inválido
        }
      }
    });

    if (window.chronosElectron && window.chronosElectron.isElectron) {
      window.chronosElectron.onStateUpdate((newState) => {
        this.state = { ...this.state, ...newState };
        this.notifyListeners();
      });

      window.chronosElectron.onOverlayStatus((status) => {
        this.overlayStatusListeners.forEach((cb) => cb(status));
      });
    }
  }

  onChange(callback) {
    this.listeners.add(callback);
    callback(this.state);
    return () => this.listeners.delete(callback);
  }

  onOverlayStatusChange(callback) {
    this.overlayStatusListeners.add(callback);
    if (window.chronosElectron && window.chronosElectron.isElectron) {
      window.chronosElectron.getOverlayStatus().then(callback).catch(() => {});
    }
    return () => this.overlayStatusListeners.delete(callback);
  }

  notifyListeners() {
    this.listeners.forEach((cb) => cb(this.state));
  }

  /**
   * Calcula o total exato de segundos no mundo do jogo neste exato frame (com fração decimal)
   */
  getCurrentGameSeconds(nowMs = Date.now()) {
    if (!this.state.isRunning) {
      return this.state.gameSeconds;
    }
    const elapsedRealSeconds = Math.max(0, (nowMs - this.state.lastSyncRealMs) / 1000);
    return this.state.gameSeconds + elapsedRealSeconds * Number(this.state.ratio || 0);
  }

  /**
   * Decompõe os segundos totais em Dia, Hora, Minuto, Segundo, Período do Dia e Ângulo Orbital
   */
  getFormattedTimeData(nowMs = Date.now()) {
    const totalSec = Math.max(0, this.getCurrentGameSeconds(nowMs));
    const dayIndex = Math.floor(totalSec / 86400) + 1;
    const secondsInDay = ((totalSec % 86400) + 86400) % 86400;

    const hours = Math.floor(secondsInDay / 3600);
    const minutes = Math.floor((secondsInDay % 3600) / 60);
    const seconds = Math.floor(secondsInDay % 60);
    const fractionalHours = secondsInDay / 3600; // 0.0 a 24.0

    const pad = (n) => String(n).padStart(2, '0');
    const timeString = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    const shortTimeString = `${pad(hours)}:${pad(minutes)}`;

    // Período atmosférico do dia
    let period = {
      id: 'night',
      label: 'Madrugada / Noite Profunda',
      shortLabel: 'Noite',
      accent: '#a855f7',
      isDaylight: false
    };

    if (fractionalHours >= 5 && fractionalHours < 7.5) {
      period = {
        id: 'dawn',
        label: 'Amanhecer / Crepúsculo Matutino',
        shortLabel: 'Amanhecer',
        accent: '#f97316',
        isDaylight: true
      };
    } else if (fractionalHours >= 7.5 && fractionalHours < 11.5) {
      period = {
        id: 'morning',
        label: 'Manhã Urbana',
        shortLabel: 'Manhã',
        accent: '#38bdf8',
        isDaylight: true
      };
    } else if (fractionalHours >= 11.5 && fractionalHours < 14) {
      period = {
        id: 'noon',
        label: 'Meio-Dia / Sol a Pino',
        shortLabel: 'Meio-Dia',
        accent: '#facc15',
        isDaylight: true
      };
    } else if (fractionalHours >= 14 && fractionalHours < 17.5) {
      period = {
        id: 'afternoon',
        label: 'Tarde',
        shortLabel: 'Tarde',
        accent: '#fb923c',
        isDaylight: true
      };
    } else if (fractionalHours >= 17.5 && fractionalHours < 19.5) {
      period = {
        id: 'dusk',
        label: 'Entardecer / Pôr do Sol',
        shortLabel: 'Entardecer',
        accent: '#ec4899',
        isDaylight: false
      };
    } else {
      period = {
        id: 'night',
        label: 'Noite Urbana',
        shortLabel: 'Noite',
        accent: '#a855f7',
        isDaylight: false
      };
    }

    /**
     * Cálculo de Rotação Orbital (24 horas = 360 graus contínuos):
     * Queremos que às 12:00 (meio-dia) o Sol esteja no topo do semicírculo (0 deg),
     * às 06:00 o Sol esteja nascendo à esquerda (-90 deg / 270 deg),
     * às 18:00 o Sol esteja se pondo à direita (+90 deg),
     * e à 00:00 (meia-noite) a Lua esteja no topo do semicírculo (Sol a 180 deg).
     */
    const sunAngleDeg = ((fractionalHours - 12) / 24) * 360;
    const moonAngleDeg = sunAngleDeg + 180;

    // Gradiente contínuo interpolado (fading suave segundo a segundo entre as cores do dia)
    const skyAtmosphere = this.computeContinuousSky(fractionalHours);

    return {
      totalSec,
      dayIndex,
      secondsInDay,
      hours,
      minutes,
      seconds,
      fractionalHours,
      timeString,
      shortTimeString,
      period,
      sunAngleDeg,
      moonAngleDeg,
      skyAtmosphere
    };
  }

  /**
   * Interpola suavemente (fading contínuo) as cores do topo, meio, horizonte e opacidade das estrelas
   * de acordo com a hora fracionária exata do dia (0.0 a 24.0).
   */
  computeContinuousSky(fractionalHours) {
    const keyframes = [
      { hour: 0.0,  top: [7, 7, 15],     mid: [24, 12, 58],   bot: [46, 16, 101],  stars: 0.92 }, // Meia-noite
      { hour: 4.5,  top: [9, 9, 22],     mid: [30, 18, 68],   bot: [58, 22, 110],  stars: 0.85 }, // Madrugada
      { hour: 5.8,  top: [30, 27, 75],   mid: [124, 45, 18],  bot: [249, 115, 22], stars: 0.35 }, // Amanhecer
      { hour: 7.5,  top: [12, 74, 110],  mid: [2, 132, 199],  bot: [186, 230, 253],stars: 0.05 }, // Manhã cedo
      { hour: 12.0, top: [3, 105, 161],  mid: [56, 189, 248], bot: [254, 240, 138],stars: 0.00 }, // Meio-dia
      { hour: 15.5, top: [20, 68, 148],  mid: [42, 138, 210], bot: [253, 210, 140],stars: 0.02 }, // Tarde
      { hour: 17.5, top: [30, 42, 110],  mid: [194, 65, 12],  bot: [251, 146, 60], stars: 0.20 }, // Fim de tarde
      { hour: 18.8, top: [15, 23, 42],   mid: [112, 26, 117], bot: [219, 39, 119], stars: 0.55 }, // Pôr do sol / Crepúsculo
      { hour: 20.5, top: [9, 9, 19],     mid: [34, 14, 78],   bot: [58, 20, 118],  stars: 0.88 }, // Anoitecer
      { hour: 24.0, top: [7, 7, 15],     mid: [24, 12, 58],   bot: [46, 16, 101],  stars: 0.92 }  // Meia-noite (loop)
    ];

    const h = ((fractionalHours % 24) + 24) % 24;
    let k1 = keyframes[0];
    let k2 = keyframes[keyframes.length - 1];

    for (let i = 0; i < keyframes.length - 1; i++) {
      if (h >= keyframes[i].hour && h <= keyframes[i + 1].hour) {
        k1 = keyframes[i];
        k2 = keyframes[i + 1];
        break;
      }
    }

    const span = k2.hour - k1.hour;
    const rawT = span > 0 ? (h - k1.hour) / span : 0;
    // Smoothstep (suaviza as entradas e saídas de cada transição de cor)
    const t = rawT * rawT * (3 - 2 * rawT);

    const lerp = (a, b) => Math.round(a + (b - a) * t);
    const lerpColor = (c1, c2) => `rgb(${lerp(c1[0], c2[0])}, ${lerp(c1[1], c2[1])}, ${lerp(c1[2], c2[2])})`;

    const topColor = lerpColor(k1.top, k2.top);
    const midColor = lerpColor(k1.mid, k2.mid);
    const botColor = lerpColor(k1.bot, k2.bot);
    const starOpacity = Number((k1.stars + (k2.stars - k1.stars) * t).toFixed(3));

    return {
      gradient: `linear-gradient(180deg, ${topColor} 0%, ${midColor} 58%, ${botColor} 100%)`,
      starOpacity
    };
  }

  // Ações de Controle do Mestre
  togglePlayPause() {
    this.saveAndBroadcast({ isRunning: !this.state.isRunning });
  }

  setRatio(ratioValue, presetId = 'custom') {
    const cleanRatio = Math.max(0.1, Math.min(86400, Number(ratioValue) || 1));
    this.saveAndBroadcast({
      ratio: cleanRatio,
      activePresetId: presetId
    });
  }

  advanceTime(deltaSeconds) {
    const current = this.getCurrentGameSeconds();
    const next = Math.max(0, current + deltaSeconds);
    this.saveAndBroadcast({ gameSeconds: next });
  }

  setExactDayAndTime(dayIndex, hours, minutes, seconds = 0) {
    const cleanDay = Math.max(1, parseInt(dayIndex, 10) || 1);
    const cleanH = Math.max(0, Math.min(23, parseInt(hours, 10) || 0));
    const cleanM = Math.max(0, Math.min(59, parseInt(minutes, 10) || 0));
    const cleanS = Math.max(0, Math.min(59, parseInt(seconds, 10) || 0));

    const total = (cleanDay - 1) * 86400 + cleanH * 3600 + cleanM * 60 + cleanS;
    this.saveAndBroadcast({ gameSeconds: total });
  }

  resetToDayStart() {
    const current = this.getCurrentGameSeconds();
    const currentDayZero = Math.floor(current / 86400) * 86400;
    const resetTarget = currentDayZero + (this.state.resetDaySeconds || 8 * 3600);
    this.saveAndBroadcast({
      gameSeconds: resetTarget,
      isRunning: false
    });
  }

  setResetHour(hours, minutes = 0) {
    const cleanH = Math.max(0, Math.min(23, parseInt(hours, 10) || 0));
    const cleanM = Math.max(0, Math.min(59, parseInt(minutes, 10) || 0));
    this.saveAndBroadcast({
      resetDaySeconds: cleanH * 3600 + cleanM * 60
    });
  }

  setSkyVision(enabled) {
    this.saveAndBroadcast({ skyVision: Boolean(enabled) });
  }

  setClockAccess(enabled) {
    this.saveAndBroadcast({ clockAccess: Boolean(enabled) });
  }

  setClockType(type) {
    if (type === 'digital' || type === 'analog') {
      this.saveAndBroadcast({ clockType: type });
    }
  }

  setOverlayOpacity(opacityValue) {
    const cleanOpacity = Math.max(0.15, Math.min(1, parseFloat(opacityValue) || 0.65));
    this.saveAndBroadcast({ overlayOpacity: cleanOpacity });
  }

  toggleOverlayHud() {
    if (window.chronosElectron && window.chronosElectron.isElectron) {
      window.chronosElectron.toggleOverlay();
    } else {
      this.saveAndBroadcast({ overlayHudHidden: !this.state.overlayHudHidden });
    }
  }
}

window.ChronosSyncEngine = ChronosSyncEngine;
window.CHRONOS_PRESETS = SCENE_PRESETS;

