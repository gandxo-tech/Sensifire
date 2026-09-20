/**
 * Module de détection et de mesure des caractéristiques d'affichage de l'appareil.
 */

/**
 * Récupère la résolution de l'écran en pixels réels et logiques.
 * @returns {{ width: number, height: number, dpr: number }}
 */
export function obtenirResolution() {
  try {
    const dpr = window.devicePixelRatio || 1;
    const width = Math.round((window.screen?.width || window.innerWidth || 1080) * dpr);
    const height = Math.round((window.screen?.height || window.innerHeight || 1920) * dpr);
    return { width, height, dpr };
  } catch {
    return { width: 1080, height: 2400, dpr: 1 };
  }
}

/**
 * Calcule la densité de pixels (PPI) à partir de la résolution et de la diagonale en pouces.
 * Formule : PPI = sqrt(w² + h²) / diagonale
 * @param {number} width - Largeur en pixels
 * @param {number} height - Hauteur en pixels
 * @param {number} diagonale - Diagonale en pouces
 * @returns {number}
 */
export function calculerPPI(width, height, diagonale) {
  if (!diagonale || diagonale <= 0) return 400;
  const w = Number(width);
  const h = Number(height);
  const diag = Number(diagonale);
  const ppi = Math.sqrt(w * w + h * h) / diag;
  return Math.round(ppi);
}

/**
 * Normalise un taux de rafraîchissement mesuré vers les fréquences standards mobiles.
 * Cibles : 60, 90, 120 ou 144 Hz.
 * @param {number} hz - Fréquence brute mesurée
 * @returns {number}
 */
export function normaliserTaux(hz) {
  if (!hz || hz <= 0) return 60;
  if (hz <= 74) return 60;
  if (hz <= 104) return 90;
  if (hz <= 132) return 120;
  return 144;
}

/**
 * Mesure le taux de rafraîchissement réel de l'écran à l'aide de requestAnimationFrame.
 * Analyse la durée d'environ 60 images sans bloquer le fil d'exécution principal.
 * @returns {Promise<{ hz: number, brut: number, succes: boolean, message: string }>}
 */
export function mesurerTauxRafraichissement() {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.requestAnimationFrame) {
      resolve({
        hz: 60,
        brut: 60,
        succes: false,
        message: "Mesure du taux de rafraîchissement impossible. 60 Hz est utilisé comme valeur de repli."
      });
      return;
    }

    const totalFrames = 60;
    let framesCount = 0;
    let startTime = 0;

    // Sécurité contre les onglets en arrière-plan ou gels d'affichage (timeout 2500ms)
    const timeoutId = setTimeout(() => {
      resolve({
        hz: 60,
        brut: 60,
        succes: false,
        message: "Mesure du taux de rafraîchissement impossible. 60 Hz est utilisé comme valeur de repli."
      });
    }, 2500);

    function onFrame(timestamp) {
      if (framesCount === 0) {
        startTime = timestamp;
        framesCount++;
        window.requestAnimationFrame(onFrame);
        return;
      }

      framesCount++;

      if (framesCount >= totalFrames) {
        clearTimeout(timeoutId);
        const elapsed = timestamp - startTime;
        if (elapsed <= 0) {
          resolve({
            hz: 60,
            brut: 60,
            succes: false,
            message: "Mesure du taux de rafraîchissement impossible. 60 Hz est utilisé comme valeur de repli."
          });
          return;
        }

        const rawFps = (framesCount * 1000) / elapsed;
        const normalized = normaliserTaux(rawFps);

        resolve({
          hz: normalized,
          brut: Math.round(rawFps),
          succes: true,
          message: "Si le mode économie de batterie est actif, le taux de rafraîchissement mesuré peut être faussé."
        });
        return;
      }

      window.requestAnimationFrame(onFrame);
    }

    try {
      window.requestAnimationFrame(onFrame);
    } catch {
      clearTimeout(timeoutId);
      resolve({
        hz: 60,
        brut: 60,
        succes: false,
        message: "Mesure du taux de rafraîchissement impossible. 60 Hz est utilisé comme valeur de repli."
      });
    }
  });
}
