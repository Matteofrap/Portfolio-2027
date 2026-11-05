/* V8 — « A creative mind. » : deux balayages gauche → droite, puis blanc plein.
   Pas de clignotement ; boucle toutes les 4 secondes.
   ?animation=off conserve la landing statique. */
(() => {
  const motionDisabled = new URLSearchParams(window.location.search).get('animation') === 'off';
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const title = document.querySelector('#hero-title[data-animate-letters]');
  const hero = document.querySelector('.hero');
  if (motionDisabled || prefersReducedMotion || !hero || !title) return;

  const originalTitle = title.textContent;
  const fragment = document.createDocumentFragment();
  let index = 0;
  originalTitle.split(' ').forEach((word, wordIndex) => {
    if (wordIndex) fragment.append(document.createTextNode(' '));
    const wordSpan = document.createElement('span');
    wordSpan.className = 'hero-word';
    wordSpan.setAttribute('aria-hidden','true');
    for (const char of word) {
      const glyph = document.createElement('span');
      glyph.className = 'hero-char';
      glyph.style.setProperty('--char-index', String(index++));
      glyph.textContent = char;
      wordSpan.append(glyph);
    }
    fragment.append(wordSpan);
  });
  title.replaceChildren(fragment);
  title.setAttribute('aria-label',originalTitle);
  hero.classList.add('hero--animated');
})();

/* Révélation mot par mot identique sur la Home et la description Nikon.
   Préserve les retours à la ligne, les paragraphes et le <strong>Mattéo</strong>.
   Timing, progression, gris et noir de la V17 strictement conservés. */
const revealGroups = [];
function prepareWordReveal(root, sections) {
  if (!root) return;
  const words = [];
  // Chaque unité de texte conserve son accessibilité, même une fois les mots décorés.
  root.setAttribute('aria-label', sections.map(el => el.textContent.trim()).join(' '));
  for (const section of sections) {
    if (section.tagName === 'P') section.setAttribute('aria-label', section.textContent.trim());
    const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const fragment = document.createDocumentFragment();
      for (const token of node.textContent.match(/\s+|\S+/g) || []) {
        if (/^\s+$/.test(token)) {
          fragment.append(document.createTextNode(token));
        } else {
          const span = document.createElement('span');
          span.className = 'intro-word';
          span.textContent = token;
          span.setAttribute('aria-hidden', 'true');
          fragment.append(span);
          words.push(span);
        }
      }
      node.replaceWith(fragment);
    }
  }
  revealGroups.push({root, words});
}
const intro = document.querySelector('.intro-copy');
if (intro) prepareWordReveal(intro, [...intro.querySelectorAll('.intro-line')]);
const projectCopy = document.querySelector('.project-overview-body');
if (projectCopy) prepareWordReveal(projectCopy, [...projectCopy.querySelectorAll('p')]);

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let scrollFrame = 0;
function updateWordReveal() {
  scrollFrame = 0;
  if (!revealGroups.length) return;
  for (const {root, words} of revealGroups) {
    if (reducedMotion.matches) {
      words.forEach(word => word.style.color = '#101010');
      continue;
    }
    const rect = root.getBoundingClientRect();
    const height = window.innerHeight || document.documentElement.clientHeight;
    // Calcul inchangé de la Home V17 : entrée dans le champ → hauteur du regard.
    const start = height * .86;
    const finish = height * .35;
    const progress = Math.max(0, Math.min(1, (start - rect.top) / (start - finish)));
    const count = words.length;
    words.forEach((word, index) => {
      const amount = Math.max(0, Math.min(1, progress * (count + .65) - index));
      const eased = amount * amount * (3 - 2 * amount);
      const gray = Math.round(174 + (16 - 174) * eased);
      word.style.color = `rgb(${gray}, ${gray}, ${gray})`;
    });
  }
}
function scheduleReveal() {
  if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateWordReveal);
}
window.addEventListener('scroll', scheduleReveal, {passive:true});
window.addEventListener('resize', scheduleReveal, {passive:true});
reducedMotion.addEventListener?.('change', scheduleReveal);
updateWordReveal();

/* V11 — chaque carré est indépendant et reste affiché 0,35 seconde
   après la sortie du pointeur.
   Les survols successifs peuvent donc afficher plusieurs carrés.
   Chaque carré a une position et une rotation fixes : uniquement un fondu. */
const names = document.querySelector('.work-names');
const previews = document.querySelectorAll('.work-preview[data-preview]');
if (names && previews.length) {
  const previewMap = new Map([...previews].map(el => [el.dataset.preview, el]));
  const hideTimers = new Map();
  const lingerMs = 350;

  function show(link) {
    const key = link.dataset.preview;
    const preview = previewMap.get(key);
    if (!preview) return;
    window.clearTimeout(hideTimers.get(key));
    hideTimers.delete(key);
    preview.classList.add('is-visible');
  }

  function hideLater(link) {
    const key = link.dataset.preview;
    const preview = previewMap.get(key);
    if (!preview) return;
    window.clearTimeout(hideTimers.get(key));
    const timer = window.setTimeout(() => {
      preview.classList.remove('is-visible');
      hideTimers.delete(key);
    }, lingerMs);
    hideTimers.set(key, timer);
  }

  for (const link of names.querySelectorAll('[data-preview]')) {
    link.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'touch') show(link);
    });
    link.addEventListener('pointerleave', event => {
      if (event.pointerType !== 'touch') hideLater(link);
    });
    link.addEventListener('focus', () => show(link));
    link.addEventListener('blur', () => hideLater(link));
  }
}


/* V25 — zoom léger au survol + ouverture en grand des images de galerie */
(() => {
  const galleryImages = document.querySelectorAll('.project-gallery .gallery-media img:not([data-no-lightbox="true"])');
  if (!galleryImages.length) return;

  const overlay = document.createElement('div');
  overlay.className = 'gallery-lightbox';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = `
    <div class="gallery-lightbox__inner" role="dialog" aria-modal="true" aria-label="Aperçu agrandi de l'image">
      <button class="gallery-lightbox__close" type="button" aria-label="Fermer l’image">×</button>
      <img class="gallery-lightbox__image" alt="">
    </div>`;
  document.body.appendChild(overlay);

  const stage = overlay.querySelector('.gallery-lightbox__inner');
  const preview = overlay.querySelector('.gallery-lightbox__image');
  const closeBtn = overlay.querySelector('.gallery-lightbox__close');
  let lastFocused = null;

  function openLightbox(img) {
    lastFocused = document.activeElement;
    preview.src = img.currentSrc || img.src;
    preview.alt = img.alt || '';
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
    closeBtn.focus();
  }

  function closeLightbox() {
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
    preview.removeAttribute('src');
    preview.alt = '';
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  galleryImages.forEach((img) => {
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', (img.alt || 'Image de la galerie') + ' — ouvrir en grand');
    img.addEventListener('click', () => openLightbox(img));
    img.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openLightbox(img);
      }
    });
  });

  closeBtn.addEventListener('click', closeLightbox);
  overlay.addEventListener('click', (event) => {
    if (!stage.contains(event.target)) closeLightbox();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && overlay.classList.contains('is-open')) closeLightbox();
  });
})();


/* V39 — Afficher un visuel local si une miniature YouTube externe est indisponible. */
document.querySelectorAll('img[data-video-thumb-fallback]').forEach(img => {
  img.addEventListener('error', () => {
    const fallback = img.getAttribute('data-video-thumb-fallback');
    if (fallback && img.getAttribute('src') !== fallback) img.src = fallback;
  });
});
