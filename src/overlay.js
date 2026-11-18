/**
 * Chronos RPG — Módulo 2: Lógica do Overlay Flutuante Imersivo da Mesa
 * Sem textos funcionais ou de sistema — apenas o Semicírculo Celeste e o Relógio.
 */

document.addEventListener('DOMContentLoaded', () => {
  const engine = new window.ChronosSyncEngine('overlay');

  const overlayWidgetRoot = document.getElementById('overlayWidgetRoot');
  const overlayCelestialStage = document.getElementById('overlayCelestialStage');
  const overlayOrbitWheel = document.getElementById('overlayOrbitWheel');
  const overlaySkyBlocked = document.getElementById('overlaySkyBlocked');

  const overlayClockMount = document.getElementById('overlayClockMount');
  const overlayDigitalBox = document.getElementById('overlayDigitalBox');
  const overlayPlayerDigital = document.getElementById('overlayPlayerDigital');

  const overlayAnalogBox = document.getElementById('overlayAnalogBox');
  const overlayAnalogFace = document.getElementById('overlayAnalogFace');
  const overlayHourHand = document.getElementById('overlayHourHand');
  const overlayMinuteHand = document.getElementById('overlayMinuteHand');
  const overlaySecondHand = document.getElementById('overlaySecondHand');

  // Cria os 12 marcadores de hora no mostrador do relógio analógico
  for (let i = 0; i < 12; i++) {
    const tick = document.createElement('div');
    tick.className = `watch-tick ${i % 3 === 0 ? 'major' : ''}`;
    tick.style.transform = `rotate(${i * 30}deg)`;
    overlayAnalogFace.appendChild(tick);
  }

  engine.onChange((state) => {
    // Visibilidade no navegador (quando usado sem Electron)
    if (!window.chronosElectron || !window.chronosElectron.isElectron) {
      if (state.overlayHudHidden) {
        overlayWidgetRoot.classList.add('hud-hidden');
      } else {
        overlayWidgetRoot.classList.remove('hud-hidden');
      }
    }

    // Condição 1: Visão do Céu
    if (state.skyVision) {
      overlaySkyBlocked.classList.remove('active');
    } else {
      overlaySkyBlocked.classList.add('active');
    }

    // Condição 2: Acesso a Relógio Físico (Digital vs Analógico vs Oculto)
    if (!state.clockAccess) {
      overlayClockMount.classList.add('hidden');
      overlayDigitalBox.classList.add('hidden');
      overlayAnalogBox.classList.add('hidden');
    } else if (state.clockType === 'analog') {
      overlayClockMount.classList.remove('hidden');
      overlayDigitalBox.classList.add('hidden');
      overlayAnalogBox.classList.remove('hidden');
    } else {
      overlayClockMount.classList.remove('hidden');
      overlayDigitalBox.classList.remove('hidden');
      overlayAnalogBox.classList.add('hidden');
    }

    updateOverlayFrame();
  });

  function updateOverlayFrame() {
    const t = engine.getFormattedTimeData();

    // Se a visão do céu estiver ativa, aplica o fading contínuo de cores e a órbita
    if (engine.state.skyVision) {
      overlayCelestialStage.style.background = t.skyAtmosphere.gradient;
      const starfieldEl = overlayCelestialStage.querySelector('.starfield');
      if (starfieldEl) {
        starfieldEl.style.opacity = t.skyAtmosphere.starOpacity;
      }
      overlayOrbitWheel.style.transform = `rotate(${t.sunAngleDeg}deg)`;
    }

    // Atualiza relógio digital
    overlayPlayerDigital.textContent = t.timeString;

    // Atualiza ponteiros do relógio analógico
    const secAngle = (t.secondsInDay % 60) * 6;
    const minAngle = ((t.secondsInDay / 60) % 60) * 6;
    const hourAngle = ((t.secondsInDay / 3600) % 12) * 30;

    overlayHourHand.style.transform = `rotate(${hourAngle}deg)`;
    overlayMinuteHand.style.transform = `rotate(${minAngle}deg)`;
    overlaySecondHand.style.transform = `rotate(${secAngle}deg)`;
  }

  function animate() {
    updateOverlayFrame();
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);

  // Atalho de teclado na própria janela caso esteja no navegador
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 't') {
      e.preventDefault();
      if (!window.chronosElectron || !window.chronosElectron.isElectron) {
        engine.toggleOverlayHud();
      }
    }
  });
});
