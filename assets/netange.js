// Meubles Nétange — vitrine en fondu, plan du canapé sur mesure, bon de visite. Rien n'est envoyé à un serveur :
// les demandes partent de la messagerie du visiteur (mailto) ou par téléphone.
(() => {
  const calme = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EMAIL = 'meubles-netange@aliceadsl.fr';
  document.documentElement.classList.add('js');

  /* ---------- 1. La vitrine : une photo toutes les 6 s, arrêtable (WCAG 2.2.2) ---------- */
  const vitrine = document.querySelector('.vitrine');
  if (vitrine && !calme) {
    const photos = [...vitrine.querySelectorAll('.vitrine-photos img')];
    const LEGENDES = ['Salons et relaxation', 'Canapés relax', 'Séjours et salles à manger', 'Salons d’angle', 'Literie et chambres'];
    const n = vitrine.querySelector('.vl-n'), t = vitrine.querySelector('.vl-t');
    const pause = vitrine.querySelector('.vitrine-pause');
    let i = 0, minuterie = null, arrete = false;
    const montrer = (k) => {
      photos[i].classList.remove('actif');
      i = k;
      photos[i].loading = 'eager';
      if (photos[i + 1]) photos[i + 1].loading = 'eager';
      photos[i].classList.add('actif');
      n.textContent = String(i + 1).padStart(2, '0');
      t.textContent = LEGENDES[i] || '';
    };
    const tourner = () => { if (!document.hidden && !arrete) montrer((i + 1) % photos.length); };
    const lancer = () => { clearInterval(minuterie); minuterie = setInterval(tourner, 6000); };
    pause.hidden = false;
    pause.addEventListener('click', () => {
      arrete = !arrete;
      pause.textContent = arrete ? 'Reprendre le défilé des photos' : 'Arrêter le défilé des photos';
      if (!arrete) lancer();
    });
    // la photo suivante se précharge pendant que la précédente s'affiche
    photos[1].loading = 'eager';
    lancer();
  }

  /* ---------- 2. Le canapé sur mesure : plan à l'échelle, cotes, mur ---------- */
  const form = document.querySelector('.sm-form');
  if (form) {
    const svg = document.querySelector('.plan');
    const NS = 'http://www.w3.org/2000/svg';
    const g = (sel) => svg.querySelector(sel);
    const el = (nom, attrs, parent) => {
      const e = document.createElementNS(NS, nom);
      for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
      if (parent) parent.appendChild(e);
      return e;
    };
    const TEINTES = { 'cognac': '#9a5a2c', 'ébène': '#2b2622', 'gris perle': '#b9b4ac', 'sable': '#d6c6a6', 'bleu nuit': '#2e3d55', 'vert sauge': '#6f7d64' };
    const FORMES = { 'droit': 'droit', 'angle-gauche': 'angle à gauche', 'angle-droite': 'angle à droite', 'u': 'en U' };
    const RELAX = ['sans relax', 'une place électrique', 'deux places électriques'];
    const DOSSIER = 20, ACCOUDOIR = 15, REPOSE_PIEDS = 45; // cm, indicatifs
    const etatMur = form.querySelector('#sm-mur-etat');
    let derniers = {};

    const curseurFacade = form.querySelector('[name="facade"]');
    // une façade trop courte pour sa forme donnerait un meuble impossible : on relève le minimum du curseur
    const borner = () => {
      const forme = form.querySelector('[name="forme"]:checked').value;
      const P = +form.querySelector('[name="profondeur"]').value;
      const retours = forme === 'droit' ? 0 : forme === 'u' ? 2 : 1;
      const brut = retours === 2 ? 2 * P + 80 : retours === 1 ? P + ACCOUDOIR + 70 : 160;
      const mini = Math.max(160, Math.ceil(brut / 20) * 20);
      curseurFacade.min = mini;
      if (+curseurFacade.value < mini) curseurFacade.value = mini;
    };

    const lire = () => {
      borner();
      const f = new FormData(form);
      const forme = f.get('forme');
      const mur = parseInt(f.get('mur'), 10);
      return {
        forme,
        facade: +f.get('facade'), retour: +f.get('retour'), profondeur: +f.get('profondeur'),
        relax: +f.get('relax'), matiere: f.get('matiere'), teinte: f.get('teinte'),
        mur: Number.isFinite(mur) && mur >= 100 && mur <= 1000 ? mur : 0,
        retours: forme === 'droit' ? 0 : forme === 'u' ? 2 : 1
      };
    };

    const dessiner = (v) => {
      for (const s of ['.plan-quadrillage', '.plan-mur', '.plan-canape', '.plan-cotes']) g(s).replaceChildren();
      const P = v.profondeur, F = v.facade, R = v.retours ? v.retour : P;
      const largeur = Math.max(F, v.mur || 0), hauteur = Math.max(R, P) + (v.relax ? REPOSE_PIEDS : 0);
      const s = Math.min(440 / largeur, 320 / hauteur);
      const ox = (600 - F * s) / 2, oy = 90;
      const X = (cm) => ox + cm * s, Y = (cm) => oy + cm * s;

      // quadrillage de 20 cm, comme une feuille de plan
      for (let c = -200; c <= largeur + 200; c += 20) el('line', { x1: X(c), y1: 0, x2: X(c), y2: 460 }, g('.plan-quadrillage'));
      for (let c = -200; c <= 600; c += 20) el('line', { x1: 0, y1: Y(c), x2: 600, y2: Y(c) }, g('.plan-quadrillage'));

      // le mur, derrière le dossier
      if (v.mur) {
        const debut = (F - v.mur) / 2;
        el('rect', { x: X(debut), y: Y(-14), width: v.mur * s, height: 14 * s }, g('.plan-mur'));
        el('text', { x: X(debut), y: Y(-14) - 6 }, g('.plan-mur')).textContent = `votre mur · ${v.mur} cm`;
      }

      // blocs d'assise : la façade, puis les retours
      const blocs = [{ x: 0, y: 0, w: F, h: P, sens: 'h' }];
      if (v.forme === 'angle-gauche' || v.forme === 'u') blocs.push({ x: 0, y: P, w: P, h: R - P, sens: 'v' });
      if (v.forme === 'angle-droite' || v.forme === 'u') blocs.push({ x: F - P, y: P, w: P, h: R - P, sens: 'v' });
      const fond = TEINTES[v.teinte] || '#9a5a2c';
      const canape = g('.plan-canape');
      for (const b of blocs) el('rect', { class: 'assise', x: X(b.x), y: Y(b.y), width: b.w * s, height: b.h * s, rx: 6, fill: fond }, canape);
      // dossier le long du mur, puis le long des retours
      el('rect', { class: 'dossier', x: X(0), y: Y(0), width: F * s, height: DOSSIER * s }, canape);
      if (v.forme === 'angle-gauche' || v.forme === 'u') el('rect', { class: 'dossier', x: X(0), y: Y(0), width: DOSSIER * s, height: R * s }, canape);
      if (v.forme === 'angle-droite' || v.forme === 'u') el('rect', { class: 'dossier', x: X(F - DOSSIER), y: Y(0), width: DOSSIER * s, height: R * s }, canape);

      // places de la façade, entre les angles et les accoudoirs
      const gaucheLibre = !(v.forme === 'angle-gauche' || v.forme === 'u');
      const droiteLibre = !(v.forme === 'angle-droite' || v.forme === 'u');
      const debut = gaucheLibre ? ACCOUDOIR : P, fin = droiteLibre ? F - ACCOUDOIR : F - P;
      if (gaucheLibre) el('rect', { class: 'dossier', x: X(0), y: Y(0), width: ACCOUDOIR * s, height: P * s }, canape);
      if (droiteLibre) el('rect', { class: 'dossier', x: X(F - ACCOUDOIR), y: Y(0), width: ACCOUDOIR * s, height: P * s }, canape);
      const libre = Math.max(0, fin - debut);
      const places = Math.max(1, Math.min(5, Math.round(libre / 62)));
      v.relax = Math.min(v.relax, places);
      const lp = libre / places;
      for (let k = 1; k < places; k++) el('line', { class: 'couture', x1: X(debut + k * lp), y1: Y(DOSSIER), x2: X(debut + k * lp), y2: Y(P) }, canape);
      // places relax : à partir du côté opposé à l'angle, repose-pieds ouvert en pointillés devant
      const ordre = [...Array(places).keys()];
      if (v.forme === 'angle-gauche') ordre.reverse();
      if (lp - 12 > 0) ordre.slice(0, v.relax).forEach((k, rang) => {
        const x0 = debut + k * lp;
        el('rect', { class: 'relax-ouvert', x: X(x0 + 6), y: Y(P), width: (lp - 12) * s, height: REPOSE_PIEDS * s, rx: 4, 'stroke-dasharray': '5 4' }, canape);
        el('path', { class: 'relax-signe', d: `M${X(x0 + lp / 2) - 9} ${Y(P - 22)} l9 7 l9 -7` }, canape);
        if (rang === 0) el('text', { class: 'relax-mot', x: X(x0 + lp / 2), y: Y(P + REPOSE_PIEDS) + 14, 'text-anchor': 'middle' }, canape).textContent = v.relax > 1 ? 'relax ouverts' : 'relax ouvert';
      });

      // cotes : façade en haut (graduée tous les 20 cm), retour sur le côté, profondeur à l'autre bout
      const cotes = g('.plan-cotes');
      const yc = v.mur ? Y(-14) - 24 : Y(0) - 22;
      el('line', { x1: X(0), y1: yc, x2: X(F), y2: yc }, cotes);
      for (let c = 0; c <= F; c += 20) el('line', { class: 'graduation', x1: X(c), y1: yc - (c % 100 ? 3 : 6), x2: X(c), y2: yc + (c % 100 ? 3 : 6) }, cotes);
      const tf = el('text', { x: X(F / 2), y: yc - 10, 'text-anchor': 'middle' }, cotes); tf.textContent = `${F} cm`;
      if (derniers.facade !== F) tf.classList.add('vient');
      if (v.retours) {
        const xr = v.forme === 'angle-droite' ? X(F) + 22 : X(0) - 22;
        el('line', { x1: xr, y1: Y(0), x2: xr, y2: Y(R) }, cotes);
        for (let c = 0; c <= R; c += 20) el('line', { class: 'graduation', x1: xr - (c % 100 ? 3 : 6), y1: Y(c), x2: xr + (c % 100 ? 3 : 6), y2: Y(c) }, cotes);
        const tr = el('text', { x: xr, y: Y(R / 2), 'text-anchor': 'middle', transform: `rotate(-90 ${xr} ${Y(R / 2)}) translate(0 -8)` }, cotes); tr.textContent = `${R} cm`;
        if (derniers.retour !== R) tr.classList.add('vient');
      }
      const xp = v.forme === 'angle-droite' ? X(0) - 22 : X(F) + 22;
      el('line', { x1: xp, y1: Y(0), x2: xp, y2: Y(P) }, cotes);
      el('text', { x: xp, y: Y(P / 2), 'text-anchor': 'middle', transform: `rotate(-90 ${xp} ${Y(P / 2)}) translate(0 -8)` }, cotes).textContent = `${P} cm`;
      derniers = v;
      return places;
    };

    const fiche = (cle, texte) => {
      const dd = document.querySelector(`[data-fiche="${cle}"]`);
      if (dd && dd.textContent !== texte) dd.textContent = texte;
    };

    const maj = () => {
      const v = lire();
      form.querySelector('[data-cote="retour"]').hidden = !v.retours;
      for (const k of ['facade', 'retour', 'profondeur']) form.querySelector(`#v-${k}`).textContent = `${v[k]} cm`;
      const cotes = v.retours ? `${v.facade} × ${v.retour} cm, profondeur ${v.profondeur} cm` : `${v.facade} cm, profondeur ${v.profondeur} cm`;
      const places = dessiner(v);
      // on ne propose pas plus de places relax que le plan n'a de places
      for (const r of form.querySelectorAll('[name="relax"]')) r.disabled = +r.value > places;
      const coche = form.querySelector('[name="relax"]:checked');
      if (coche && +coche.value > places) form.querySelector(`[name="relax"][value="${places}"]`).checked = true;
      fiche('forme', FORMES[v.forme]);
      fiche('cotes', cotes);
      fiche('relax', RELAX[v.relax]);
      fiche('matiere', `${v.matiere}, ${v.teinte}`);
      svg.querySelector('desc').textContent = `${FORMES[v.forme]}, ${cotes}, ${RELAX[v.relax]}${v.mur ? `, devant un mur de ${v.mur} cm` : ''}.`;

      // le mur : un constat arithmétique, rien de plus
      etatMur.classList.remove('ok', 'trop');
      const saisi = form.querySelector('[name="mur"]').value.trim();
      if (!v.mur) etatMur.textContent = saisi ? 'Indiquez une longueur entre 100 et 1000 cm.' : '';
      else if (v.mur >= v.facade) { etatMur.textContent = `Il reste ${v.mur - v.facade} cm de mur à côté du canapé.`; etatMur.classList.add('ok'); }
      else { etatMur.textContent = `Le canapé dépasse votre mur de ${v.facade - v.mur} cm.`; etatMur.classList.add('trop'); }


      const corps = `Bonjour,\n\nJe souhaiterais un devis pour un canapé sur mesure :\n- forme : ${FORMES[v.forme]}\n- cotes : ${cotes}\n- relax : ${RELAX[v.relax]}\n- revêtement : ${v.matiere}, teinte souhaitée ${v.teinte} (selon disponibilité)${v.mur ? `\n- longueur de mon mur : ${v.mur} cm` : ''}\n\nMerci de m’envoyer le devis.`;
      document.querySelector('[data-devis="mail"]').href = `mailto:${EMAIL}?subject=${encodeURIComponent('Demande de devis — canapé sur mesure')}&body=${encodeURIComponent(corps)}`;
    };
    form.addEventListener('input', maj);
    form.addEventListener('change', maj);
    form.addEventListener('submit', (e) => e.preventDefault());
    maj();
  }

  /* ---------- 3. Le bon de visite ---------- */
  const rdv = document.querySelector('.rdv-form');
  if (rdv) {
    const jour = rdv.querySelector('[name="jour"]');
    const erreur = rdv.querySelector('#jour-erreur');
    const auj = new Date(); auj.setMinutes(auj.getMinutes() - auj.getTimezoneOffset());
    jour.min = auj.toISOString().slice(0, 10);
    const fmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const ecrire = (cle, texte) => { const dd = document.querySelector(`[data-bon="${cle}"]`); if (dd.textContent !== texte) dd.textContent = texte; };
    const maj = () => {
      const f = new FormData(rdv);
      const j = f.get('jour') && f.get('jour') >= jour.min ? fmt.format(new Date(f.get('jour') + 'T12:00')) : '';
      const prenom = String(f.get('prenom') || '').trim().slice(0, 40);
      const tel = String(f.get('tel') || '').replace(/[^\d +]/g, '').slice(0, 20);
      ecrire('sujet', f.get('sujet'));
      ecrire('jour', j || 'à convenir');
      ecrire('moment', f.get('moment') || 'peu importe');
      ecrire('prenom', prenom || '…');
      let m = `Bonjour,\n\nJe souhaiterais passer au magasin pour voir ${f.get('sujet')}`;
      m += j ? `, le ${j}` : ', à la date qui vous convient';
      if (f.get('moment')) m += `, plutôt ${f.get('moment')}`;
      m += '.';
      if (tel) m += `\nVous pouvez me rappeler au ${tel}.`;
      if (prenom) m += `\n\nMerci, ${prenom}`;
      document.querySelector('[data-envoi="mail"]').href = `mailto:${EMAIL}?subject=${encodeURIComponent('Rendez-vous au magasin')}&body=${encodeURIComponent(m)}`;
    };
    jour.addEventListener('change', () => {
      const passee = Boolean(jour.value && jour.value < jour.min);
      const ferme = jour.value && [0, 1].includes(new Date(jour.value + 'T12:00').getDay());
      jour.setAttribute('aria-invalid', String(passee || Boolean(ferme)));
      erreur.textContent = passee ? 'Cette date est passée : choisissez un autre jour.' : ferme ? 'Le magasin est fermé le dimanche et le lundi : choisissez un autre jour.' : '';
    });
    rdv.addEventListener('input', maj);
    rdv.addEventListener('change', maj);
    rdv.addEventListener('submit', (e) => e.preventDefault());
    maj();
  }

  /* ---------- Le mur : ses vignettes se chargent quand on approche (les colonnes en mouvement trompent le
     chargement différé du navigateur, cf. Pièges de la couche) ---------- */
  const murSec = document.querySelector('.c-mur-catalogue');
  if (murSec && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => {
      if (!es.some((e) => e.isIntersecting)) return;
      murSec.querySelectorAll('img[loading="lazy"]').forEach((im) => { im.loading = 'eager'; });
      io.disconnect();
    }, { rootMargin: '600px 0px' });
    io.observe(murSec);
  }

  /* ---------- Apparitions au défilement ---------- */
  const aReveler = document.querySelectorAll('.tete, .univers-liste .u, .sm-corps, .magasins-photo, .magasins-texte, .maison-texte, .rdv-corps, .avis-liste li');
  if (!calme && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('vu'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
    aReveler.forEach((x) => { x.classList.add('revele'); io.observe(x); });
  }
})();
