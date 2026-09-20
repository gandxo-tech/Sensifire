# SensiLab — Générateur de Sensibilités Free Fire

Application web statique moderne permettant aux joueurs de **Free Fire** d'estimer, de tester en salle d'entraînement et d'affiner leurs sensibilités de visée en fonction des caractéristiques matérielles de leur smartphone et de leur profil de jeu.

> **Avertissement légal :** Ce projet n'est pas affilié à Garena ni à Free Fire. Les valeurs calculées sont des estimations de départ à tester et ajuster en conditions réelles de jeu. Aucune sensibilité n'est miraculeuse ou universelle.

---

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Architecture & Stack technique](#architecture--stack-technique)
- [Arborescence des fichiers](#arborescence-des-fichiers)
- [Modèle mathématique](#modèle-mathématique)
- [Installation & Démarrage](#installation--démarrage)
- [Protocole de test & Affinage](#protocole-de-test--affinage)
- [Accessibilité & Ergonomie](#accessibilité--ergonomie)
- [Confidentialité](#confidentialité)

---

## Fonctionnalités

1. **Sélection & Détection du smartphone :**
   - Autocomplétion parmi 38 smartphones courants (Tecno, Infinix, Samsung Galaxy A/S, Xiaomi Redmi/Note, Poco, itel, Realme, iPhone).
   - Remplissage automatique des caractéristiques : diagonale (pouces), résolution, densité (PPI), taux de rafraîchissement (Hz) et fréquence d'échantillonnage tactile.
   - Outil de détection automatique via les API du navigateur (`window.devicePixelRatio`, `requestAnimationFrame` sur 60 frames pour estimer les Hz réels).
   - Saisie manuelle libre avec contrôles de cohérence et recalcul dynamique du PPI selon la diagonale.

2. **Personnalisation du profil de jeu :**
   - Nombre de doigts : 2 doigts (pouces), 3 doigts (semi-claw), 4 doigts (claw).
   - Style de jeu : Rush (agressif / réactif), Polyvalent (équilibre), Sniper (précision longue portée).
   - Fluidité en jeu : 60 FPS, 90 FPS, 120 FPS ou plus.
   - Facteurs physiques (section repliable) : présence d'un film/verre trempé, mains moites / transpiration.

3. **Restitution visuelle des 5 sensibilités :**
   - Général (déplacement libre et demi-tour 180°).
   - Point rouge (visée réflexe sans grossissement).
   - Lunette 2x (combats à moyenne portée).
   - Lunette 4x (suivi et tirs à longue distance).
   - Lunette AWM (micro-ajustements aux fusils de précision).
   - Jauges de niveau interactives avec bornage garanti entre 0 et 100.

4. **Protocole de test et affinage immédiat :**
   - Écran dédié avec consignes spécifiques par type d'optique pour la salle d'entraînement.
   - Boutons de correction rapide par paliers de 4 points : **Trop lent (+4)**, **Bon (0)**, **Trop rapide (-4)**.

5. **Sauvegarde locale & Restauration :**
   - Enregistrement des réglages dans le `localStorage` de l'appareil.
   - Détection automatique au rechargement de la page avec bandeau de restauration en un clic.

6. **Génération & Partage d'une carte image (1080×1080) :**
   - Rendu haute résolution via Canvas 2D natif reprenant le modèle de téléphone, le profil et les 5 sensibilités.
   - Utilisation de l'API Web Share (`navigator.share`) pour un partage direct sur WhatsApp, Discord, etc.
   - Téléchargement automatique au format PNG en cas d'absence de support de partage natif.

---

## Architecture & Stack technique

L'application est construite selon une architecture **100 % statique, modulaire et sans dépendance externe** :

- **HTML5 sémantique** : balises `<header>`, `<main>`, `<section>`, `<article>`, `<fieldset>`, `<legend>`, `<nav>`.
- **CSS3 moderne** : variables CSS (thème sombre gaming), Flexbox, CSS Grid, support `prefers-reduced-motion`.
- **JavaScript Vanilla (ES Modules)** : code découpé en responsabilités uniques sans framework (React, Vue, etc.) ni bundler obligatoire.
- **Zéro CDN & Zéro tracker** : tout le code et les polices s'exécutent en local.
- **Support PWA** : fichier `manifest.json` pour installation sur écran d'accueil smartphone.

---

## Arborescence des fichiers

```text
├── index.html       # Structure complète des 4 écrans et de la navigation
├── style.css        # Styles, thème sombre, grille responsive et composants
├── devices.json     # Base de données locale de 38 smartphones
├── config.js        # Constantes, seuils, multiplicateurs et coefficients
├── detect.js        # Détection d'écran, résolution DPR, calcul PPI et mesure Hz
├── calc.js          # Moteur de calcul déterministe et cas de référence
├── storage.js       # Gestion de la persistance locale (localStorage)
├── share.js         # Rendu Canvas 1080x1080 et partage Web Share / PNG
├── app.js           # Orchestrateur central (état global, événements, DOM)
├── manifest.json    # Manifeste d'application web progressive (PWA)
└── README.md        # Documentation du projet
```

---

## Modèle mathématique

### 1. Formule de la sensibilité Générale

$$\text{General} = \text{borne}\Big(\text{Base}_{\text{style}} \times M_{\text{ppi}} \times M_{\text{touch}} \times M_{\text{fps}} \times M_{\text{doigts}} \times M_{\text{options}}\Big)$$

- **Base style :** Rush = 95, Polyvalent = 85, Sniper = 75.
- **Modificateur PPI ($M_{\text{ppi}}$) :**
  $$M_{\text{ppi}} = 1 - \frac{0{,}10 \times (\text{PPI} - 400)}{100}$$
  *(Un écran à densité élevée demande une sensibilité légèrement accrue pour parcourir la même distance angulaire).*
- **Modificateur tactile ($M_{\text{touch}}$) :**
  - $\ge 240\text{ Hz}$ : $1{,}00$
  - $120 \text{ à } 239\text{ Hz}$ : $0{,}97$
  - $< 120\text{ Hz}$ : $0{,}95$
- **Modificateur FPS ($M_{\text{fps}}$) :**
  - $\ge 120\text{ FPS}$ : $1{,}00$
  - $90\text{ FPS}$ : $0{,}98$
  - $60\text{ FPS}$ : $0{,}95$
- **Modificateur doigts ($M_{\text{doigts}}$) :**
  - 2 doigts : $0{,}90$
  - 3 doigts : $1{,}00$
  - 4 doigts : $1{,}05$
- **Options physiques ($M_{\text{options}}$) :**
  - Verre trempé : $\times 1{,}02$
  - Mains moites : $\times 0{,}98$

### 2. Multiplicateurs d'optiques

- **Point rouge :** $\text{General} \times 0{,}95$
- **Lunette 2x :** $\text{General} \times 0{,}90$
- **Lunette 4x :** $\text{General} \times 0{,}85$
- **Lunette AWM :** $\text{General} \times 0{,}70$ (style Sniper) ou $\text{General} \times 0{,}75$ (autres styles)

### 3. Cas de référence validé

Un cas de test est intégré dans `calc.js` (`verifierCasReference()`) :
- **Appareil :** PPI = 400, Touch = 240 Hz, Diagonale = 6.5", Hz = 90.
- **Profil :** Style Rush, 3 doigts, 90 FPS, sans options.
- **Résultat attendu :** $95 \times 1{,}00 \times 1{,}00 \times 0{,}98 \times 1{,}00 \times 1{,}00 = 93{,}1 \to$ **93**.
- Le test est exécutable à tout moment dans la console du navigateur via `window.verifierCasReference()`.

---

## Installation & Démarrage

Comme le projet est purement statique et basé sur les **ES Modules**, il nécessite un simple serveur HTTP local pour éviter les restrictions de sécurité CORS (`file://`).

### Option 1 : Avec Node.js (`serve` ou `http-server`)
```bash
npx serve .
# ou
npx http-server -p 3000
```

### Option 2 : Avec Python 3
```bash
python3 -m http.server 3000
```

### Option 3 : Avec VS Code
Ouvrir le dossier dans Visual Studio Code et cliquer sur **"Go Live"** via l'extension *Live Server*.

Ouvrez ensuite votre navigateur sur `http://localhost:3000`.

---

## Protocole de test & Affinage

Après avoir généré vos valeurs, rendez-vous dans la **salle d'entraînement** de Free Fire :

1. **Général :** Effectuez un balayage rapide du pouce depuis le centre de l'écran pour réaliser un demi-tour à 180°.
   - Si la vue dépasse 180° : cliquez sur **Trop rapide (-4)**.
   - Si le demi-tour est incomplet : cliquez sur **Trop lent (+4)**.
2. **Point rouge & Mire :** Visez un mannequin fixe puis entraînez-vous au tir réflexe sur cible mobile.
3. **Lunettes 2x et 4x :** Entraînez-vous au suivi continu d'un joueur en mouvement à moyenne et longue distance.
4. **Lunette AWM :** Testez la stabilité du viseur pour les micro-corrections sans à-coups.

---

## Accessibilité & Ergonomie

- **Contraste des couleurs :** Conforme aux recommandations WCAG AA (cyan `#00e5ff` sur fond sombre `#090c10`, ratio supérieur à 7:1).
- **Navigation au clavier :** Focus visible distinctif (`outline: 2px solid var(--accent-cyan)`), gestion de l'ordre séquentiel et gestion des touches `Flèche Haut/Bas`, `Entrée`, `Échap` pour l'autocomplétion.
- **Lecteurs d'écran :** Utilisation d'un conteneur `aria-live="polite"` pour vocaliser les changements d'étape, les erreurs de formulaire et les ajustements de sensibilité.
- **Cibles tactiles :** Tous les boutons et champs interactifs respectent une hauteur minimale de 48 px.
- **Sensibilité au mouvement :** Prise en compte de la directive `@media (prefers-reduced-motion: reduce)`.

---

## Confidentialité

- Aucune donnée n'est collectée, analysée ou transmise à un serveur distant.
- Toutes les opérations (mesure de l'écran, calculs, stockage `localStorage`, génération d'image Canvas) s'effectuent exclusivement en local sur le terminal de l'utilisateur.

---

## Licence

Projet libre sous licence **MIT**.
Ce projet est développé à des fins éducatives et communautaires, sans affiliation avec Garena ni la marque Free Fire.
