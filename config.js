/**
 * Configuration centralisée de calcul des sensibilités Free Fire.
 * Tous les coefficients, constantes de calcul et limites sont définis ici.
 */

export const CONFIG = {
  // Sensibilité de base selon le style de jeu principal
  baseStyle: {
    Rush: 95,
    Polyvalent: 85,
    Sniper: 75
  },

  // Paramètres du multiplicateur PPI (densité de pixels de l'écran)
  // Formule stricte : 1 - 0.10 * (PPI - 400) / 100
  ppi: {
    reference: 400,
    slope: 0.10,
    divisor: 100
  },

  // Multiplicateurs selon le taux d'échantillonnage tactile de l'écran (Hz)
  touch: {
    high: { min: 240, coef: 1.00 },
    medium: { min: 120, max: 239, coef: 0.97 },
    low: { max: 119, coef: 0.95 }
  },

  // Multiplicateurs selon le taux de rafraîchissement / fluidité visuelle (FPS)
  fps: {
    60: 0.95,
    90: 0.98,
    120: 1.00
  },

  // Multiplicateurs selon le nombre de doigts utilisés pour jouer
  doigts: {
    2: 0.90,
    3: 1.00,
    4: 1.05
  },

  /**
   * Options physiques facultatives d'ajustement.
   * NOTE : Ces deux coefficients (verre trempé et mains moites) sont des
   * hypothèses empiriques destinées à être affinées ultérieurement en jeu.
   */
  options: {
    verreTrempe: 1.02,
    mainsMoites: 0.98
  },

  // Multiplicateurs appliqués à la sensibilité Générale pour chaque optique
  multiplicateursOptiques: {
    pointRouge: 0.95,
    lunette2x: 0.90,
    lunette4x: 0.85,
    lunetteAWMStandard: 0.75,
    lunetteAWMSniper: 0.70
  },

  // Bornes absolues des valeurs de sensibilité dans Free Fire
  bornes: {
    min: 0,
    max: 100
  },

  // Limites de validation pour la saisie matérielle
  validation: {
    diagMin: 4.0,
    diagMax: 8.0,
    ppiMin: 150,
    ppiMax: 800
  },

  // Pas de réglage pour les boutons d'affinage rapide
  affinageStep: 4
};
