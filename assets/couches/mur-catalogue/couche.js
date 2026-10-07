// Le mur du catalogue — le script MONTE le mur, il ne le décore pas.
//
// Le HTML contient chaque pièce UNE SEULE FOIS, dans une colonne source. Au repos
// (sans script, en mouvement réduit), c'est une grille complète et lisible. Le
// script répartit les pièces en 6, 4 ou 2 colonnes selon la largeur, répète chaque
// colonne trois fois pour la boucle, et pose `data-pret` : alors seulement le mur
// se met à descendre.
//
// C'est cette façon de faire qui évite trois défauts de la version figée dans le
// HTML : des colonnes qui n'étaient jamais visibles sous 1 100 px, chaque pièce lue
// trois fois par un lecteur d'écran, et un mouvement réduit qui montrait le triple
// du catalogue réel sous un compteur qui disait vingt.
(() => {
  const calme = matchMedia('(prefers-reduced-motion: reduce)');
  const PALIERS = [[matchMedia('(min-width:1100px)'), 6], [matchMedia('(min-width:860px)'), 4]];
  const DUREES = [46, 53, 61, 67, 73, 79];   // premières entre elles à l'œil : le mur ne « bat » jamais
  const COPIES = 3;                           // va avec le -66,6667 % du CSS

  document.querySelectorAll('.c-mur-catalogue').forEach((racine) => {
    // chargé deux fois (balise dupliquée, assemblage de couches), le script
    // doublerait ses écouteurs : le bouton basculerait deux fois par clic
    if (racine.dataset.monte) return;
    racine.dataset.monte = '1';

    const scene = racine.querySelector('.mc-scene');
    const source = racine.querySelector('.mc-source');
    if (!scene || !source) return;
    const pieces = [...source.children];
    if (pieces.length < 4) return;            // trop peu : la grille au repos suffit

    const commande = racine.querySelector('.mc-commande');
    const bouton = commande?.querySelector('button');
    let colonnes = 0;

    const combien = () => (PALIERS.find(([m]) => m.matches) || [null, 2])[1];

    const monter = () => {
      const n = combien();
      if (n === colonnes) return;
      colonnes = n;
      scene.style.setProperty('--n', n); // relecture 06/10 (démo Maison Lore) : sans elle, la grille restait à 6 colonnes sur téléphone
      const cols = Array.from({ length: n }, (_, c) => {
        const part = pieces.filter((_, i) => i % n === c);
        const col = document.createElement('div');
        col.className = 'mc-col';
        col.style.setProperty('--d', `${DUREES[c % DUREES.length]}s`);
        for (let k = 0; k < COPIES; k++) {
          const g = document.createElement('div');
          g.className = 'mc-groupe';
          // ⚠️ Les copies ne sont là que pour la boucle. Sans `inert` + `aria-hidden`,
          // un lecteur d'écran lit chaque pièce trois fois et la tabulation s'arrête
          // trois fois sur le même lien.
          if (k) { g.setAttribute('aria-hidden', 'true'); g.toggleAttribute('inert', true); }
          part.forEach((p) => g.appendChild(k ? p.cloneNode(true) : p));
          col.appendChild(g);
        }
        return col;
      });
      scene.replaceChildren(...cols);
      racine.setAttribute('data-pret', '');
      if (commande) commande.hidden = false;
    };

    const demonter = () => {
      colonnes = 0;
      source.replaceChildren(...pieces);      // les originaux, jamais les copies
      scene.replaceChildren(source);
      racine.removeAttribute('data-pret');
      racine.removeAttribute('data-arret');
      if (commande) commande.hidden = true;
    };

    // Mouvement réduit : on ne monte pas le mur, et on le démonte si la préférence
    // change en cours de route (un réglage système peut basculer sans recharger).
    const decider = () => (calme.matches ? demonter() : monter());
    calme.addEventListener('change', decider);
    PALIERS.forEach(([m]) => m.addEventListener('change', decider));
    addEventListener('resize', () => { if (!calme.matches) monter(); }, { passive: true });
    decider();

    // ── L'inclinaison vers le curseur ──────────────────────────────────────
    let attente = 0;
    scene.addEventListener('pointermove', (e) => {
      if (calme.matches || attente) return;
      attente = requestAnimationFrame(() => {
        attente = 0;
        const r = scene.getBoundingClientRect();
        // −1 … +1 depuis le centre, borné : au-delà l'inclinaison devient un défaut
        const x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
        const y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
        racine.style.setProperty('--mx', x.toFixed(3));
        racine.style.setProperty('--my', y.toFixed(3));
      });
    }, { passive: true });
    scene.addEventListener('pointerleave', () => {
      // sans cette annulation, une image en attente repose une inclinaison de bord
      // APRÈS la remise à zéro, et le mur reste penché
      if (attente) { cancelAnimationFrame(attente); attente = 0; }
      racine.style.setProperty('--mx', '0');
      racine.style.setProperty('--my', '0');
    });

    // ── L'arrêt ────────────────────────────────────────────────────────────
    // WCAG 2.2.2 : tout mouvement de plus de cinq secondes doit pouvoir être arrêté.
    // ⚠️ Pas d'`aria-pressed` ICI : avec un libellé qui change aussi, un lecteur
    // annonce « Remettre le mur en mouvement, bouton à bascule, activé » — le
    // libellé dit alors l'inverse de l'état. On garde le libellé, rien d'autre.
    bouton?.addEventListener('click', () => {
      racine.toggleAttribute('data-arret');
      bouton.textContent = racine.hasAttribute('data-arret')
        ? 'Remettre le mur en mouvement' : 'Arrêter le mur';
    });
  });
})();
