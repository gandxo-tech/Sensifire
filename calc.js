/**
 * Module de calcul des sensibilités Free Fire personnalisées.
 */

import { CONFIG } from "./config.js";

/**
 * Borne une valeur numérique entre les limites autorisées.
 * @param {number} val - Valeur à borner
 * @returns {number}
 */
function borner(val) {
  return Math.max(CONFIG.bornes.min, Math.min(CONFIG.bornes.max, Math.round(val)));
}

/**
 * Calcule le jeu complet de sensibilités personnalisées selon l'appareil et le profil.
 * @param {Object} appareil - Données de l'écran ({ ppi, touch, diag, hz })
 * @param {Object} profil - Profil du joueur ({ style, doigts, fps, verreTrempe, mainsMoites })
 * @returns {{
 *   general: number,
 *   pointRouge: number,
 *   lunette2x: number,
 *   lunette4x: number,
 *   lunetteAWM: number
 * }}
 */
export function calculerSensi(appareil, profil) {
  // 1. Sensibilité de base selon le style de jeu
  const style = profil?.style || "Polyvalent";
  const baseStyle = CONFIG.baseStyle[style] ?? CONFIG.baseStyle.Polyvalent;

  // 2. Multiplicateur PPI : 1 - 0.10 * (PPI - 400) / 100
  const ppiVal = Number(appareil?.ppi) || CONFIG.ppi.reference;
  const m_ppi = 1 - (CONFIG.ppi.slope * (ppiVal - CONFIG.ppi.reference)) / CONFIG.ppi.divisor;

  // 3. Multiplicateur d'échantillonnage tactile (Touch sampling rate)
  const touchHz = Number(appareil?.touch) || 180;
  let m_touch = CONFIG.touch.medium.coef;
  if (touchHz >= CONFIG.touch.high.min) {
    m_touch = CONFIG.touch.high.coef;
  } else if (touchHz >= CONFIG.touch.medium.min) {
    m_touch = CONFIG.touch.medium.coef;
  } else {
    m_touch = CONFIG.touch.low.coef;
  }

  // 4. Multiplicateur de fréquence de rafraîchissement / FPS cible
  const fpsCible = Number(profil?.fps) || 60;
  let m_fps = CONFIG.fps[60];
  if (fpsCible >= 120) {
    m_fps = CONFIG.fps[120];
  } else if (fpsCible >= 90) {
    m_fps = CONFIG.fps[90];
  }

  // 5. Multiplicateur du nombre de doigts
  const nbDoigts = Number(profil?.doigts) || 2;
  const m_doigts = CONFIG.doigts[nbDoigts] ?? CONFIG.doigts[2];

  // 6. Multiplicateur des options physiques facultatives
  let m_options = 1.0;
  if (profil?.verreTrempe) {
    m_options *= CONFIG.options.verreTrempe;
  }
  if (profil?.mainsMoites) {
    m_options *= CONFIG.options.mainsMoites;
  }

  // 7. Calcul de la sensibilité Générale
  const generalBrut = baseStyle * m_ppi * m_touch * m_fps * m_doigts * m_options;
  const general = borner(generalBrut);

  // 8. Calcul des sensibilités optiques dérivées
  const pointRouge = borner(general * CONFIG.multiplicateursOptiques.pointRouge);
  const lunette2x = borner(general * CONFIG.multiplicateursOptiques.lunette2x);
  const lunette4x = borner(general * CONFIG.multiplicateursOptiques.lunette4x);

  // Pour la lunette AWM, coefficient spécifique si style Sniper
  const coefAWM = style === "Sniper"
    ? CONFIG.multiplicateursOptiques.lunetteAWMSniper
    : CONFIG.multiplicateursOptiques.lunetteAWMStandard;
  const lunetteAWM = borner(general * coefAWM);

  return {
    general,
    pointRouge,
    lunette2x,
    lunette4x,
    lunetteAWM
  };
}

/**
 * Calcule une taille recommandée pour le bouton de tir (HUD) adaptée au one-tap.
 * Un écran plus grand ou plus de doigts permet un bouton légèrement plus grand (50-54%),
 * tandis qu'un écran compact demande un bouton plus petit (44-48%) pour préserver
 * l'espace vertical indispensable au geste de tir relevé (drag headshot).
 * @param {number} diag - Diagonale de l'écran en pouces
 * @param {number} doigts - Nombre de doigts
 * @returns {number} Taille en pourcentage (ex. 48)
 */
export function calculerTailleBoutonTir(diag, doigts) {
  const d = Number(diag) || 6.5;
  const n = Number(doigts) || 2;
  let taille = 48;

  if (d < 6.4) {
    taille -= 4;
  } else if (d >= 6.7) {
    taille += 3;
  }

  if (n === 2) {
    taille -= 2;
  } else if (n >= 4) {
    taille += 2;
  }

  return Math.max(40, Math.min(58, Math.round(taille)));
}

/**
 * Vérifie le cas de référence obligatoire spécifié par le cahier des charges :
 * PPI = 400, Touch >= 240, FPS = 90, Doigts = 3, Style = Rush, aucune option.
 * La sensibilité Générale doit être strictement égale à 93.
 * Peut être appelé depuis la console du navigateur.
 * @returns {{ reussi: boolean, obtenu: number, attendu: number, message: string }}
 */
export function verifierCasReference() {
  const appareilRef = {
    ppi: 400,
    touch: 240,
    diag: 6.5,
    hz: 90
  };

  const profilRef = {
    style: "Rush",
    doigts: 3,
    fps: 90,
    verreTrempe: false,
    mainsMoites: false
  };

  const resultat = calculerSensi(appareilRef, profilRef);
  const attendu = 93;
  const reussi = resultat.general === attendu;

  const bilan = {
    reussi,
    obtenu: resultat.general,
    attendu,
    message: reussi
      ? "Cas de référence validé : Général = 93."
      : `Échec du cas de référence : Général = ${resultat.general} (attendu : ${attendu}).`
  };

  return bilan;
}
