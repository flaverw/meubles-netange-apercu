// Signature Everywhere : le mot EVERYWHERE en lettres-films se joue une fois (arrêt à 4,5 s, critère 2.2.2),
// se rejoue au survol à la souris ; mouvement réduit ou économie de données : image finale fixe, vidéo jamais chargée.
(() => {
  const calme = matchMedia('(prefers-reduced-motion: reduce)').matches || (navigator.connection && navigator.connection.saveData);
  document.querySelectorAll('.c-signature-everywhere .se-v').forEach((v) => {
    if (calme) return;                                   // l'affiche (image finale) reste
    let finie = false;
    const jouer = () => {
      if (document.hidden) return;
      const p = v.play();
      if (p && p.catch) p.catch(() => { finie = true; });
    };
    v.addEventListener('timeupdate', () => { if (v.currentTime >= 4.5) { v.pause(); finie = true; } });
    v.addEventListener('ended', () => { finie = true; });
    document.addEventListener('visibilitychange', () => { if (document.hidden) v.pause(); else if (!finie) jouer(); });
    const lien = v.closest('a');
    if (lien && matchMedia('(pointer: fine)').matches) {
      lien.addEventListener('pointerenter', () => { if (finie) { finie = false; v.currentTime = 0; jouer(); } });
    }
    // chargée seulement ici (rien sans script ni en mouvement réduit) ; preload « none » dans le HTML : il faut
    // passer en « auto » et appeler load(), sinon « canplay » n'arrive jamais et le mot reste figé (constaté le 05/10).
    v.preload = 'auto';
    v.src = v.dataset.src;
    v.load();
    v.addEventListener('canplay', jouer, { once: true });
  });
})();
