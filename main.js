/**
 * 2126® — 100 YEARS LATER ARCHIVE
 * Inspired by Unseen Studio® (unseen.co)
 * Complete interactive system: WebGL Three.js, Web Audio Synthesizer,
 * Fluid Cursor, Lenis Smooth Scroll, Video Modal, Filter Bar & Simulators.
 */

(() => {
  'use strict';

  /* ==========================================================================
     1. WEB AUDIO SYNTHESIZER (AMBIENT DRONE & UI FX)
     ========================================================================== */
  class AudioSystem {
    constructor() {
      this.ctx = null;
      this.isPlaying = false;
      this.masterGain = null;
      this.droneOscillators = [];
      this.isMuted = true;
    }

    init() {
      if (this.ctx) return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.ctx = new AudioContext();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }

    startAmbient() {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      this.isMuted = false;
      this.isPlaying = true;
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 2.5);

      if (this.droneOscillators.length === 0) {
        // Multi-oscillator ethereal chord: A minor / futuristic space chord (55Hz, 110Hz, 164.81Hz, 220Hz, 329.63Hz)
        const freqs = [55, 110, 164.81, 220, 329.63];
        freqs.forEach((f, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const filter = this.ctx.createBiquadFilter();

          osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(f, this.ctx.currentTime);

          // Low-pass filter for smooth, non-fatiguing warm drone
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(450 + idx * 80, this.ctx.currentTime);

          // Subtle LFO modulation for organic breath
          const lfo = this.ctx.createOscillator();
          const lfoGain = this.ctx.createGain();
          lfo.frequency.setValueAtTime(0.1 + idx * 0.05, this.ctx.currentTime);
          lfoGain.gain.setValueAtTime(4, this.ctx.currentTime);
          lfo.connect(osc.frequency);
          lfo.start();

          gain.gain.setValueAtTime(0.04 / (idx + 1), this.ctx.currentTime);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.masterGain);

          osc.start();
          this.droneOscillators.push(osc);
        });
      }
      this.updateUI();
    }

    toggleMute() {
      if (!this.ctx) {
        this.startAmbient();
        return;
      }
      if (this.isMuted) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        this.isMuted = false;
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 0.8);
      } else {
        this.isMuted = true;
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
      }
      this.updateUI();
    }

    playRatchetTick() {
      if (this.isMuted || !this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.03);
        gain.gain.setValueAtTime(0.015, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.03);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.035);
      } catch (e) {}
    }

    playWhoosh() {
      if (this.isMuted || !this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(90, this.ctx.currentTime);
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(300, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.25);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.26);
      } catch (e) {}
    }

    updateUI() {
      const muteBtn = document.getElementById('globalMuteBtn');
      const muteIcon = document.getElementById('muteIcon');
      if (!muteBtn || !muteIcon) return;
      if (this.isMuted) {
        muteBtn.classList.remove('is-playing');
        muteIcon.textContent = '🔇';
      } else {
        muteBtn.classList.add('is-playing');
        muteIcon.textContent = '🔊';
      }
    }
  }

  const audio = new AudioSystem();

  /* ==========================================================================
     2. FLUID TRAILING CURSOR (UNSEEN STUDIO ARCHITECTURE)
     ========================================================================== */
  class CustomCursor {
    constructor() {
      this.cursorEl = document.getElementById('customCursor');
      this.pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      this.lerpSpeed = 0.16;
      this.isActive = false;

      if (!this.cursorEl) return;
      this.initEvents();
      this.render();
    }

    initEvents() {
      window.addEventListener('mousemove', (e) => {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
        if (!this.isActive) {
          this.isActive = true;
          this.pos.x = e.clientX;
          this.pos.y = e.clientY;
        }
      });

      // Hover element bindings
      document.querySelectorAll('[data-cursor="hover"], a, button, .timeline-card, .matrix-row').forEach(el => {
        el.addEventListener('mouseenter', () => {
          this.cursorEl.classList.add('is-hovering');
          audio.playRatchetTick();
        });
        el.addEventListener('mouseleave', () => {
          this.cursorEl.classList.remove('is-hovering');
        });
      });

      // Drag badge bindings
      document.querySelectorAll('[data-cursor="drag"], .timeline__track').forEach(el => {
        el.addEventListener('mouseenter', () => this.cursorEl.classList.add('is-dragging'));
        el.addEventListener('mouseleave', () => this.cursorEl.classList.remove('is-dragging'));
      });

      // Video card bindings
      document.querySelectorAll('[data-cursor="video"], .topic-card').forEach(el => {
        el.addEventListener('mouseenter', () => this.cursorEl.classList.add('is-video'));
        el.addEventListener('mouseleave', () => this.cursorEl.classList.remove('is-video'));
      });
    }

    render() {
      this.pos.x += (this.mouse.x - this.pos.x) * this.lerpSpeed;
      this.pos.y += (this.mouse.y - this.pos.y) * this.lerpSpeed;

      if (this.cursorEl) {
        this.cursorEl.style.transform = `translate3d(${this.pos.x}px, ${this.pos.y}px, 0)`;
      }

      requestAnimationFrame(() => this.render());
    }
  }

  /* ==========================================================================
     3. WEBGL 3D INTERACTIVE CANVAS (THREE.JS PARTICLES & CYBER RINGS)
     ========================================================================== */
  class WebGLScene {
    constructor() {
      this.canvas = document.getElementById('gl');
      if (!this.canvas || typeof THREE === 'undefined') return;

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
      this.camera.position.z = 250;

      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: true
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
      this.scrollVelocity = 0;
      this.lastScrollY = window.scrollY;

      this.initObjects();
      this.initListeners();
      this.animate();
    }

    initObjects() {
      // 1. Particle Cloud (Stars / Neural Network)
      const particleCount = 1200;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);

      const color1 = new THREE.Color(0x00f0ff);
      const color2 = new THREE.Color(0xff4d6d);
      const color3 = new THREE.Color(0xffffff);

      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 800;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 800;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 600;

        const mixedColor = i % 3 === 0 ? color1 : (i % 3 === 1 ? color2 : color3);
        colors[i * 3] = mixedColor.r;
        colors[i * 3 + 1] = mixedColor.g;
        colors[i * 3 + 2] = mixedColor.b;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: 2.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending
      });

      this.particles = new THREE.Points(geometry, material);
      this.scene.add(this.particles);

      // 2. Holographic Futuristic Ring (Quantum Coordinate Torus)
      const ringGeo = new THREE.TorusGeometry(85, 0.4, 16, 120);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        wireframe: true,
        transparent: true,
        opacity: 0.25
      });
      this.ring = new THREE.Mesh(ringGeo, ringMat);
      this.ring.rotation.x = Math.PI / 3;
      this.scene.add(this.ring);

      // 3. Secondary Outer Ring
      const outerRingGeo = new THREE.TorusGeometry(120, 0.2, 16, 160);
      const outerRingMat = new THREE.MeshBasicMaterial({
        color: 0xefded9,
        wireframe: true,
        transparent: true,
        opacity: 0.15
      });
      this.outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
      this.outerRing.rotation.y = Math.PI / 4;
      this.scene.add(this.outerRing);
    }

    initListeners() {
      window.addEventListener('resize', () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      });

      window.addEventListener('mousemove', (e) => {
        this.mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
        this.mouse.targetY = -(e.clientY / window.innerHeight - 0.5) * 2;
      });

      window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        this.scrollVelocity = Math.abs(currentScrollY - this.lastScrollY);
        this.lastScrollY = currentScrollY;
      }, { passive: true });
    }

    animate() {
      requestAnimationFrame(() => this.animate());

      // Mouse smoothing
      this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
      this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;

      // Particle rotation & warping
      if (this.particles) {
        this.particles.rotation.y += 0.0008;
        this.particles.rotation.x += 0.0004;

        // Reactive mouse shift
        this.particles.position.x = this.mouse.x * 25;
        this.particles.position.y = this.mouse.y * 25;

        // Fast scroll warp stretch
        const targetZ = this.scrollVelocity > 5 ? Math.min(this.scrollVelocity * 0.8, 40) : 0;
        this.camera.position.z += (250 - targetZ - this.camera.position.z) * 0.1;
      }

      if (this.ring) {
        this.ring.rotation.z += 0.002;
        this.ring.rotation.x += 0.001;
      }

      if (this.outerRing) {
        this.outerRing.rotation.z -= 0.0015;
      }

      this.scrollVelocity *= 0.92;
      this.renderer.render(this.scene, this.camera);
    }
  }

  /* ==========================================================================
     4. INTRO LOADER ANIMATION & PROGRESS
     ========================================================================== */
  function initLoader() {
    const loader = document.getElementById('loader');
    const progressBar = document.getElementById('loaderProgressBar');
    const percentText = document.getElementById('loaderPercent');
    const buttonsWrap = document.querySelector('.loader__buttons');
    const btnSound = document.getElementById('btnEnterSound');
    const btnNoSound = document.getElementById('btnEnterNoSound');

    let currentPercent = 0;
    const targetPercent = 100;
    const interval = setInterval(() => {
      currentPercent += Math.floor(Math.random() * 8) + 2;
      if (currentPercent >= targetPercent) {
        currentPercent = 100;
        clearInterval(interval);

        if (progressBar) progressBar.style.width = '100%';
        if (percentText) percentText.textContent = '100%';
        if (buttonsWrap) buttonsWrap.classList.add('is-ready');
      } else {
        if (progressBar) progressBar.style.width = `${currentPercent}%`;
        if (percentText) percentText.textContent = `${currentPercent.toString().padStart(2, '0')}%`;
      }
    }, 40);

    const closeLoader = (enableAudio) => {
      if (enableAudio) {
        audio.startAmbient();
      }
      if (loader) {
        loader.classList.add('is-hidden');
      }
      document.body.classList.remove('is-loading');
    };

    if (btnSound) btnSound.addEventListener('click', () => closeLoader(true));
    if (btnNoSound) btnNoSound.addEventListener('click', () => closeLoader(false));
  }

  /* ==========================================================================
     5. REAL-TIME 2126 WORLD CLOCK
     ========================================================================== */
  function initFutureClock() {
    const clockEl = document.getElementById('futureClock');
    if (!clockEl) return;

    function update() {
      const now = new Date();
      // Year 2126 (100 years into the future)
      const year = now.getFullYear() + 100;
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');

      clockEl.textContent = `${year}.${month}.${day} ${hours}:${minutes}:${seconds} JST`;
    }

    update();
    setInterval(update, 1000);
  }

  /* ==========================================================================
     6. TOPIC CARDS: HOVER VIDEO & CINEMATIC MODAL
     ========================================================================== */
  function initTopicCardsAndModal() {
    const cards = document.querySelectorAll('.topic-card');
    const modal = document.getElementById('videoModal');
    const modalVideo = document.getElementById('modalVideo');
    const modalTag = document.getElementById('modalTag');
    const modalTitle = document.getElementById('modalTitle');
    const modalLead = document.getElementById('modalLead');
    const modalStatNum = document.getElementById('modalStatNum');
    const modalStatLabel = document.getElementById('modalStatLabel');
    const modalFact1 = document.getElementById('modalFact1');
    const modalFact2 = document.getElementById('modalFact2');
    const modalFact3 = document.getElementById('modalFact3');
    const closeBtns = document.querySelectorAll('.js-close-modal');

    // Hover autoplay on cards
    cards.forEach(card => {
      const video = card.querySelector('.topic-card__video');
      if (video) {
        card.addEventListener('mouseenter', () => {
          video.play().catch(() => {});
        });
        card.addEventListener('mouseleave', () => {
          video.pause();
        });
      }

      // Card click opens modal
      card.addEventListener('click', () => {
        audio.playWhoosh();
        const videoSrc = card.getAttribute('data-video');
        const tag = card.getAttribute('data-tag');
        const title = card.getAttribute('data-title');
        const lead = card.getAttribute('data-lead');
        const stat = card.getAttribute('data-stat');
        const statLabel = card.getAttribute('data-stat-label');
        const fact1 = card.getAttribute('data-fact-1');
        const fact2 = card.getAttribute('data-fact-2');
        const fact3 = card.getAttribute('data-fact-3');

        if (modalVideo) {
          modalVideo.src = videoSrc;
          modalVideo.play().catch(() => {});
        }
        if (modalTag) modalTag.textContent = tag;
        if (modalTitle) modalTitle.textContent = title;
        if (modalLead) modalLead.textContent = lead;
        if (modalStatNum) modalStatNum.textContent = stat;
        if (modalStatLabel) modalStatLabel.textContent = statLabel;
        if (modalFact1) modalFact1.textContent = `• ${fact1}`;
        if (modalFact2) modalFact2.textContent = `• ${fact2}`;
        if (modalFact3) modalFact3.textContent = `• ${fact3}`;

        if (modal) modal.classList.add('is-open');
      });
    });

    // Close modal
    closeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (modal) modal.classList.remove('is-open');
        if (modalVideo) {
          modalVideo.pause();
          modalVideo.src = '';
        }
      });
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && modal.classList.contains('is-open')) {
        modal.classList.remove('is-open');
        if (modalVideo) {
          modalVideo.pause();
          modalVideo.src = '';
        }
      }
    });
  }

  /* ==========================================================================
     7. TOPIC FILTER TABS
     ========================================================================== */
  function initFilterBar() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const cards = document.querySelectorAll('.topic-card');

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        audio.playWhoosh();
        filterBtns.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');

        const filter = btn.getAttribute('data-filter');
        cards.forEach(card => {
          const category = card.getAttribute('data-category');
          if (filter === 'all' || category === filter) {
            card.style.display = 'flex';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }

  /* ==========================================================================
     8. 100-YEAR AGE & FUTURE SIMULATOR
     ========================================================================== */
  function initSimulator() {
    const input = document.getElementById('userAgeInput');
    const btn = document.getElementById('simulateBtn');
    const resFutureAge = document.getElementById('resFutureAge');
    const resBodyAge = document.getElementById('resBodyAge');

    if (!btn || !input) return;

    btn.addEventListener('click', () => {
      audio.playWhoosh();
      const currentAge = parseInt(input.value, 10) || 25;
      const futureAge = currentAge + 100;
      // In 2126, biological age is maintained around late 20s / early 30s
      const bodyAge = Math.min(34, Math.max(26, 26 + (currentAge % 8)));

      if (resFutureAge) resFutureAge.textContent = futureAge;
      if (resBodyAge) resBodyAge.textContent = bodyAge;
    });
  }

  /* ==========================================================================
     9. MENU DRAWER & NAVIGATION
     ========================================================================== */
  function initMenuDrawer() {
    const toggleBtn = document.getElementById('menuToggleBtn');
    const drawer = document.getElementById('menuDrawer');
    const menuLinks = document.querySelectorAll('.js-menu-link');

    if (!toggleBtn || !drawer) return;

    toggleBtn.addEventListener('click', () => {
      audio.playWhoosh();
      drawer.classList.toggle('is-open');
    });

    menuLinks.forEach(link => {
      link.addEventListener('click', () => {
        drawer.classList.remove('is-open');
      });
    });
  }

  /* ==========================================================================
     10. GLOBAL MUTE TOGGLE
     ========================================================================== */
  function initSoundToggle() {
    const muteBtn = document.getElementById('globalMuteBtn');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        audio.toggleMute();
      });
    }
  }

  /* ==========================================================================
     11. LENIS SMOOTH SCROLL INITIALIZATION
     ========================================================================== */
  function initSmoothScroll() {
    if (typeof Lenis !== 'undefined') {
      const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        smoothWheel: true
      });

      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    }
  }

  /* ==========================================================================
     INIT ALL MODULES ON DOM READY
     ========================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    initLoader();
    new CustomCursor();
    new WebGLScene();
    initFutureClock();
    initTopicCardsAndModal();
    initFilterBar();
    initSimulator();
    initMenuDrawer();
    initSoundToggle();
    initSmoothScroll();
  });

})();
