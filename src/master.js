/**
 * Chronos RPG — Módulo 1: Lógica do Painel de Controle do Mestre
 */

document.addEventListener('DOMContentLoaded', () => {
  const engine = new window.ChronosSyncEngine('master');

  // Elementos do Header e Status
  const simStatusDot = document.getElementById('simStatusDot');
  const simStatusText = document.getElementById('simStatusText');
  const btnToggleOverlayWindow = document.getElementById('btnToggleOverlayWindow');
  const btnOpenBrowserOverlay = document.getElementById('btnOpenBrowserOverlay');
  const overlayWindowStatusBadge = document.getElementById('overlayWindowStatusBadge');

  // Se estiver rodando no Electron Desktop, oculta o botão de abrir aba web extra
  if (window.chronosElectron && window.chronosElectron.isElectron) {
    btnOpenBrowserOverlay.classList.add('hidden');
  }

  // Elementos do Master Clock
  const masterPeriodBadge = document.getElementById('masterPeriodBadge');
  const masterDayLabel = document.getElementById('masterDayLabel');
  const masterFullPeriodLabel = document.getElementById('masterFullPeriodLabel');
  const masterDigitalClock = document.getElementById('masterDigitalClock');
  const masterRatioBadge = document.getElementById('masterRatioBadge');
  const masterRatioHint = document.getElementById('masterRatioHint');

  // Controles de Simulação
  const btnPlayPause = document.getElementById('btnPlayPause');
  const playPauseIcon = document.getElementById('playPauseIcon');
  const playPauseLabel = document.getElementById('playPauseLabel');
  const btnPlus10Min = document.getElementById('btnPlus10Min');
  const btnPlus1Hour = document.getElementById('btnPlus1Hour');
  const btnPlus1Day = document.getElementById('btnPlus1Day');
  const btnResetDay = document.getElementById('btnResetDay');

  // Inputs Manuais
  const inputSetDay = document.getElementById('inputSetDay');
  const inputSetTime = document.getElementById('inputSetTime');
  const btnApplyExactTime = document.getElementById('btnApplyExactTime');
  const inputResetHour = document.getElementById('inputResetHour');

  // Presets & Ratio Customizado
  const presetsContainer = document.getElementById('presetsContainer');
  const inputCustomRatio = document.getElementById('inputCustomRatio');
  const btnApplyCustomRatio = document.getElementById('btnApplyCustomRatio');

  // Toggles de Visibilidade
  const toggleSkyVision = document.getElementById('toggleSkyVision');
  const toggleClockAccess = document.getElementById('toggleClockAccess');
  const clockTypeGroup = document.getElementById('clockTypeGroup');
  const cardClockDigital = document.getElementById('cardClockDigital');
  const cardClockAnalog = document.getElementById('cardClockAnalog');

  // Elementos do Preview Embutido (Espelho do Overlay Imersivo)
  const previewCelestialStage = document.getElementById('previewCelestialStage');
  const previewOrbitWheel = document.getElementById('previewOrbitWheel');
  const previewSkyBlocked = document.getElementById('previewSkyBlocked');
  const previewClockMount = document.getElementById('previewClockMount');
  const previewDigitalBox = document.getElementById('previewDigitalBox');
  const previewPlayerDigital = document.getElementById('previewPlayerDigital');
  const previewAnalogBox = document.getElementById('previewAnalogBox');
  const previewAnalogFace = document.getElementById('previewAnalogFace');
  const previewHourHand = document.getElementById('previewHourHand');
  const previewMinuteHand = document.getElementById('previewMinuteHand');
  const previewSecondHand = document.getElementById('previewSecondHand');

  // Gera marcações de hora no mostrador analógico de preview
  for (let i = 0; i < 12; i++) {
    const tick = document.createElement('div');
    tick.className = `watch-tick ${i % 3 === 0 ? 'major' : ''}`;
    tick.style.transform = `rotate(${i * 30}deg)`;
    previewAnalogFace.appendChild(tick);
  }

  // Renderiza os botões de Presets de Cena
  function renderPresets(state) {
    presetsContainer.innerHTML = '';
    window.CHRONOS_PRESETS.forEach((preset) => {
      const isSelected =
        state.activePresetId === preset.id ||
        (state.activePresetId !== 'custom' && Number(state.ratio) === preset.ratio);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `preset-btn ${isSelected ? 'active' : ''}`;
      btn.innerHTML = `
        <div class="preset-info">
          <div class="preset-icon">${preset.icon}</div>
          <div>
            <div class="preset-title">${preset.name}</div>
            <div class="preset-desc">${preset.subtitle}</div>
          </div>
        </div>
        <span class="preset-ratio-tag">${preset.badge}</span>
      `;
      btn.addEventListener('click', () => {
        inputCustomRatio.value = preset.ratio;
        engine.setRatio(preset.ratio, preset.id);
      });
      presetsContainer.appendChild(btn);
    });
  }

  // Atualiza a UI de controles sempre que o estado mudar
  engine.onChange((state) => {
    renderPresets(state);

    // Status Play/Pause
    if (state.isRunning) {
      simStatusDot.classList.remove('paused');
      simStatusText.textContent = 'SIMULAÇÃO EM CURSO';
      btnPlayPause.classList.add('running');
      playPauseIcon.textContent = '⏸';
      playPauseLabel.textContent = 'PAUSAR';
    } else {
      simStatusDot.classList.add('paused');
      simStatusText.textContent = 'SIMULAÇÃO PAUSADA';
      btnPlayPause.classList.remove('running');
      playPauseIcon.textContent = '▶';
      playPauseLabel.textContent = 'INICIAR';
    }

    // Ratio info
    const r = Number(state.ratio || 1);
    masterRatioBadge.textContent = `1s Real = ${r}s Jogo`;
    if (r === 1) {
      masterRatioHint.textContent = 'Velocidade Tempo Real (1:1)';
    } else if (r >= 60) {
      const mins = (r / 60).toFixed(1).replace(/\.0$/, '');
      masterRatioHint.textContent = `1s Real = ${mins} min no Jogo (${r}x)`;
    } else {
      masterRatioHint.textContent = `Escala Acelerada (${r}x)`;
    }

    if (document.activeElement !== inputCustomRatio) {
      inputCustomRatio.value = r;
    }

    // Hora de Reset
    const resetSec = state.resetDaySeconds || 8 * 3600;
    const rH = String(Math.floor(resetSec / 3600)).padStart(2, '0');
    const rM = String(Math.floor((resetSec % 3600) / 60)).padStart(2, '0');
    if (document.activeElement !== inputResetHour) {
      inputResetHour.value = `${rH}:${rM}`;
    }

    // Toggles de Visibilidade
    toggleSkyVision.checked = Boolean(state.skyVision);
    toggleClockAccess.checked = Boolean(state.clockAccess);

    if (state.clockAccess) {
      clockTypeGroup.classList.remove('disabled');
    } else {
      clockTypeGroup.classList.add('disabled');
    }

    if (state.clockType === 'analog') {
      cardClockAnalog.classList.add('selected');
      cardClockDigital.classList.remove('selected');
    } else {
      cardClockDigital.classList.add('selected');
      cardClockAnalog.classList.remove('selected');
    }

    // Atualiza visibilidade no Espelho do Overlay
    if (state.skyVision) {
      previewSkyBlocked.classList.remove('active');
    } else {
      previewSkyBlocked.classList.add('active');
    }

    if (!state.clockAccess) {
      previewClockMount.classList.add('hidden');
      previewDigitalBox.classList.add('hidden');
      previewAnalogBox.classList.add('hidden');
    } else if (state.clockType === 'analog') {
      previewClockMount.classList.remove('hidden');
      previewDigitalBox.classList.add('hidden');
      previewAnalogBox.classList.remove('hidden');
    } else {
      previewClockMount.classList.remove('hidden');
      previewDigitalBox.classList.remove('hidden');
      previewAnalogBox.classList.add('hidden');
    }

    // No modo web, atualiza badge de visibilidade
    if (!window.chronosElectron) {
      overlayWindowStatusBadge.textContent = state.overlayHudHidden
        ? 'Overlay Oculto (Ctrl+Shift+T)'
        : 'Overlay Visível';
    }

    updateFrame();
  });

  // Status da janela de Overlay no Electron
  engine.onOverlayStatusChange((status) => {
    if (!status) return;
    if (status.visible) {
      overlayWindowStatusBadge.textContent = 'Overlay Visível na Tela';
      overlayWindowStatusBadge.style.borderColor = 'rgba(16, 185, 129, 0.5)';
      overlayWindowStatusBadge.style.color = '#6ee7b7';
    } else {
      overlayWindowStatusBadge.textContent = 'Overlay Oculto (Ctrl+Shift+T)';
      overlayWindowStatusBadge.style.borderColor = 'rgba(244, 63, 94, 0.5)';
      overlayWindowStatusBadge.style.color = '#fda4af';
    }
  });

  // Loop de alta precisão (60fps) para relógio e rotação suave do Sol/Lua
  function updateFrame() {
    const t = engine.getFormattedTimeData();
    const dayStr = `DIA ${String(t.dayIndex).padStart(2, '0')}`;

    masterDayLabel.textContent = dayStr;
    masterPeriodBadge.textContent = t.period.shortLabel;
    masterFullPeriodLabel.textContent = t.period.label;
    masterDigitalClock.textContent = t.timeString;

    // Atualiza inputs manuais quando não estão em foco
    if (document.activeElement !== inputSetDay) {
      inputSetDay.value = t.dayIndex;
    }
    if (document.activeElement !== inputSetTime && !engine.state.isRunning) {
      inputSetTime.value = t.timeString;
    }

    // Atualiza Preview do Overlay com fading contínuo de cores
    previewCelestialStage.style.background = t.skyAtmosphere.gradient;
    const previewStars = previewCelestialStage.querySelector('.starfield');
    if (previewStars) {
      previewStars.style.opacity = t.skyAtmosphere.starOpacity;
    }
    previewOrbitWheel.style.transform = `rotate(${t.sunAngleDeg}deg)`;

    previewPlayerDigital.textContent = t.timeString;

    // Ponteiros analógicos suaves
    const secAngle = (t.secondsInDay % 60) * 6;
    const minAngle = ((t.secondsInDay / 60) % 60) * 6;
    const hourAngle = ((t.secondsInDay / 3600) % 12) * 30;

    previewHourHand.style.transform = `rotate(${hourAngle}deg)`;
    previewMinuteHand.style.transform = `rotate(${minAngle}deg)`;
    previewSecondHand.style.transform = `rotate(${secAngle}deg)`;
  }

  function tickLoop() {
    updateFrame();
    requestAnimationFrame(tickLoop);
  }
  requestAnimationFrame(tickLoop);

  // Periodic auto-checkpoint no localStorage enquanto rodando
  setInterval(() => {
    if (engine.state.isRunning) {
      engine.saveAndBroadcast({});
    }
  }, 4000);

  // Eventos de Botões de Simulação
  btnPlayPause.addEventListener('click', () => engine.togglePlayPause());
  btnPlus10Min.addEventListener('click', () => engine.advanceTime(600));
  btnPlus1Hour.addEventListener('click', () => engine.advanceTime(3600));
  btnPlus1Day.addEventListener('click', () => engine.advanceTime(86400));
  btnResetDay.addEventListener('click', () => engine.resetToDayStart());

  // Aplicar Horário Manual Exato
  btnApplyExactTime.addEventListener('click', () => {
    const day = parseInt(inputSetDay.value, 10) || 1;
    const parts = (inputSetTime.value || '00:00:00').split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    const s = parseInt(parts[2], 10) || 0;
    engine.setExactDayAndTime(day, h, m, s);
  });

  // Alterar Hora de Reset do Dia
  inputResetHour.addEventListener('change', () => {
    const parts = (inputResetHour.value || '08:00').split(':');
    engine.setResetHour(parts[0], parts[1]);
  });

  // Ratio Personalizado
  btnApplyCustomRatio.addEventListener('click', () => {
    const val = parseFloat(inputCustomRatio.value);
    if (!isNaN(val) && val > 0) {
      engine.setRatio(val, 'custom');
    }
  });

  inputCustomRatio.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      btnApplyCustomRatio.click();
    }
  });

  // Toggles de Visibilidade e Condições Ambientais
  toggleSkyVision.addEventListener('change', (e) => {
    engine.setSkyVision(e.target.checked);
  });

  toggleClockAccess.addEventListener('change', (e) => {
    engine.setClockAccess(e.target.checked);
  });

  cardClockDigital.addEventListener('click', () => {
    engine.setClockType('digital');
  });

  cardClockAnalog.addEventListener('click', () => {
    engine.setClockType('analog');
  });

  // Alternar Overlay pelo botão ou Atalho de Janela (Ctrl + Shift + T)
  btnToggleOverlayWindow.addEventListener('click', () => {
    engine.toggleOverlayHud();
  });

  btnOpenBrowserOverlay.addEventListener('click', () => {
    window.open('overlay.html', 'ChronosOverlayWindow', 'width=480,height=360,menubar=no,toolbar=no,location=no,status=no');
  });

  // Suporte ao atalho Ctrl + Shift + T também quando em navegador web local
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 't') {
      e.preventDefault();
      // Se estiver no Electron, o globalShortcut já cuida disso; no navegador alterna via BroadcastChannel
      if (!window.chronosElectron || !window.chronosElectron.isElectron) {
        engine.toggleOverlayHud();
      }
    }
  });
});

