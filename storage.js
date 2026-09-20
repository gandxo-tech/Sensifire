/**
 * Module de gestion de la persistance locale via localStorage.
 */

const STORAGE_KEY = "freefire_sensi_settings_v1";

/**
 * Vérifie si localStorage est disponible et utilisable.
 * @returns {boolean}
 */
export function isStorageAvailable() {
  try {
    const testKey = "__storage_test__";
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sauvegarde les réglages complets dans localStorage.
 * @param {Object} appareil - Données du téléphone et de l'écran
 * @param {Object} profil - Profil et options de jeu
 * @param {Object} valeurs - Cinq valeurs de sensibilité finales
 * @returns {{ succes: boolean, message: string }}
 */
export function sauvegarderReglages(appareil, profil, valeurs) {
  try {
    if (!isStorageAvailable()) {
      return {
        succes: false,
        message: "La sauvegarde locale n'est pas disponible sur cet appareil. Tu peux continuer normalement."
      };
    }

    const payload = {
      version: 1,
      savedAt: new Date().toISOString(),
      appareil: {
        modele: appareil?.modele || "Manuel",
        diag: Number(appareil?.diag) || 6.5,
        res_w: Number(appareil?.res_w) || 1080,
        res_h: Number(appareil?.res_h) || 2400,
        ppi: Number(appareil?.ppi) || 400,
        hz: Number(appareil?.hz) || 60,
        touch: Number(appareil?.touch) || 180
      },
      profil: {
        style: profil?.style || "Polyvalent",
        doigts: Number(profil?.doigts) || 2,
        fps: Number(profil?.fps) || 60,
        verreTrempe: Boolean(profil?.verreTrempe),
        mainsMoites: Boolean(profil?.mainsMoites)
      },
      valeurs: {
        general: Number(valeurs?.general) || 85,
        pointRouge: Number(valeurs?.pointRouge) || 81,
        lunette2x: Number(valeurs?.lunette2x) || 77,
        lunette4x: Number(valeurs?.lunette4x) || 72,
        lunetteAWM: Number(valeurs?.lunetteAWM) || 64
      }
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    return {
      succes: true,
      message: "Tes réglages ont été sauvegardés sur cet appareil."
    };
  } catch {
    return {
      succes: false,
      message: "Impossible d'effectuer la sauvegarde sur cet appareil."
    };
  }
}

/**
 * Charge les réglages précédemment sauvegardés s'ils sont valides.
 * Ignore proprement les sauvegardes corrompues ou incompatibles.
 * @returns {Object|null} Les réglages restaurés ou null
 */
export function chargerReglages() {
  try {
    if (!isStorageAvailable()) return null;

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);

    // Validation structurelle stricte de la sauvegarde
    if (
      !data ||
      typeof data !== "object" ||
      data.version !== 1 ||
      !data.appareil ||
      !data.profil ||
      !data.valeurs
    ) {
      return null;
    }

    // Vérification des champs requis
    const { appareil, profil, valeurs } = data;
    if (
      typeof valeurs.general !== "number" ||
      typeof valeurs.pointRouge !== "number" ||
      typeof valeurs.lunette2x !== "number" ||
      typeof valeurs.lunette4x !== "number" ||
      typeof valeurs.lunetteAWM !== "number"
    ) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Efface les données sauvegardées.
 * @returns {boolean}
 */
export function effacerReglages() {
  try {
    if (!isStorageAvailable()) return false;
    window.localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
