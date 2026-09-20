/**
 * Module de génération de la carte graphique 1080x1080 et de partage social / téléchargement.
 */

import { calculerTailleBoutonTir } from "./calc.js";

/**
 * Dessine un rectangle avec coins arrondis sur un contexte Canvas.
 */
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Génère la carte d'image 1080x1080 au format Blob PNG.
 * @param {Object} appareil - Informations sur le téléphone
 * @param {Object} profil - Profil du joueur
 * @param {Object} valeurs - Valeurs des 5 sensibilités
 * @returns {Promise<Blob>}
 */
export function genererCarteImage(appareil, profil, valeurs) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Impossible d'initialiser le contexte Canvas 2D."));
        return;
      }

      // 1. Fond sombre gaming avec dégradé subtil
      const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1080);
      bgGrad.addColorStop(0, "#0b0f16");
      bgGrad.addColorStop(0.5, "#080a0e");
      bgGrad.addColorStop(1, "#050608");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1080, 1080);

      // 2. Halos d'ambiance sobres cyan et orange
      const cyanGlow = ctx.createRadialGradient(150, 150, 10, 150, 150, 450);
      cyanGlow.addColorStop(0, "rgba(0, 229, 255, 0.15)");
      cyanGlow.addColorStop(1, "rgba(0, 229, 255, 0)");
      ctx.fillStyle = cyanGlow;
      ctx.fillRect(0, 0, 1080, 1080);

      const orangeGlow = ctx.createRadialGradient(930, 930, 10, 930, 930, 450);
      orangeGlow.addColorStop(0, "rgba(255, 107, 0, 0.15)");
      orangeGlow.addColorStop(1, "rgba(255, 107, 0, 0)");
      ctx.fillStyle = orangeGlow;
      ctx.fillRect(0, 0, 1080, 1080);

      // 3. Cadre géométrique extérieur
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 2;
      roundRect(ctx, 40, 40, 1000, 1000, 28);
      ctx.stroke();

      // Accents d'angles
      ctx.strokeStyle = "#00e5ff";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(60, 120);
      ctx.lineTo(60, 60);
      ctx.lineTo(120, 60);
      ctx.stroke();

      ctx.strokeStyle = "#ff6b00";
      ctx.beginPath();
      ctx.moveTo(960, 1020);
      ctx.lineTo(1020, 1020);
      ctx.lineTo(1020, 960);
      ctx.stroke();

      // 4. En-tête : Badge et Titre
      ctx.fillStyle = "rgba(0, 229, 255, 0.12)";
      roundRect(ctx, 80, 80, 310, 40, 20);
      ctx.fill();
      ctx.strokeStyle = "rgba(0, 229, 255, 0.5)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, 80, 80, 310, 40, 20);
      ctx.stroke();

      ctx.fillStyle = "#00e5ff";
      ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("SENSIBILITÉ PERSONNALISÉE", 235, 106);

      // Titre principal
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 46px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("RÉGLAGES FREE FIRE", 80, 180);

      // Sous-titre matériel et profil
      const modeleNom = appareil?.modele || "Modèle personnalisé";
      const styleNom = profil?.style || "Polyvalent";
      const doigtsNom = profil?.doigts ? `${profil.doigts} doigts` : "Standard";
      const tailleBouton = calculerTailleBoutonTir(appareil?.diag, profil?.doigts);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "500 24px system-ui, -apple-system, sans-serif";
      ctx.fillText(`Appareil : ${modeleNom}`, 80, 222);

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "600 22px system-ui, -apple-system, sans-serif";
      ctx.fillText(`Style : ${styleNom}  •  ${doigtsNom}  •  Bouton de tir : ${tailleBouton}%`, 80, 258);

      // Séparateur fin
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(80, 290);
      ctx.lineTo(1000, 290);
      ctx.stroke();

      // 5. Les 5 rangées de réglages
      const items = [
        { label: "Général", val: valeurs?.general ?? 0, desc: "Tir relevé One-Tap & rotation caméra 180°" },
        { label: "Point rouge", val: valeurs?.pointRouge ?? 0, desc: "One-Tap sans lunette & visée directe" },
        { label: "Lunette 2x", val: valeurs?.lunette2x ?? 0, desc: "Combats moyenne portée" },
        { label: "Lunette 4x", val: valeurs?.lunette4x ?? 0, desc: "Précision longue distance" },
        { label: "Lunette AWM", val: valeurs?.lunetteAWM ?? 0, desc: "Fusils de précision / Snipers" }
      ];

      const startY = 320;
      const rowH = 110;
      const rowGap = 18;

      items.forEach((item, index) => {
        const y = startY + index * (rowH + rowGap);

        // Carte fond
        ctx.fillStyle = "rgba(20, 26, 38, 0.75)";
        roundRect(ctx, 80, y, 920, rowH, 16);
        ctx.fill();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1.5;
        roundRect(ctx, 80, y, 920, rowH, 16);
        ctx.stroke();

        // Libellé de l'optique
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 28px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(item.label, 110, y + 46);

        // Brève description
        ctx.fillStyle = "#64748b";
        ctx.font = "400 18px system-ui, -apple-system, sans-serif";
        ctx.fillText(item.desc, 110, y + 80);

        // Valeur numérique
        ctx.fillStyle = "#00e5ff";
        ctx.font = "900 42px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(String(item.val), 960, y + 62);

        // Jauge de progression
        const gaugeX = 420;
        const gaugeY = y + 42;
        const gaugeW = 400;
        const gaugeH = 12;

        // Fond jauge
        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        roundRect(ctx, gaugeX, gaugeY, gaugeW, gaugeH, 6);
        ctx.fill();

        // Remplissage jauge dégradé cyan -> orange
        const clampedVal = Math.max(0, Math.min(100, item.val));
        const fillW = Math.max(8, Math.round((clampedVal / 100) * gaugeW));
        const barGrad = ctx.createLinearGradient(gaugeX, 0, gaugeX + gaugeW, 0);
        barGrad.addColorStop(0, "#00e5ff");
        barGrad.addColorStop(1, "#ff6b00");

        ctx.fillStyle = barGrad;
        roundRect(ctx, gaugeX, gaugeY, fillW, gaugeH, 6);
        ctx.fill();
      });

      // 6. Pied de page
      ctx.fillStyle = "#94a3b8";
      ctx.font = "600 18px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        "Générateur Sensibilité Free Fire  •  Calibrage One-Tap & Tir relevé",
        540,
        995
      );
      ctx.font = "400 14px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "#64748b";
      ctx.fillText(
        "Site non affilié à Garena ni à Free Fire. Les valeurs sont une estimation de départ à affiner en jeu.",
        540,
        1022
      );

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Échec de l'encodage de l'image en Blob."));
        }
      }, "image/png");
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Télécharge directement un Blob image dans le navigateur.
 * Solution de repli universelle et sûre.
 * @param {Blob} blob - L'image à télécharger
 * @param {string} filename - Nom du fichier de sortie
 */
export function telechargerImage(blob, filename = "sensibilite-freefire.png") {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * Déclenche le partage natif ou télécharge automatiquement l'image si non supporté.
 * @param {Object} appareil
 * @param {Object} profil
 * @param {Object} valeurs
 * @returns {Promise<{ succes: boolean, methode: 'partage'|'telechargement'|'erreur', message: string }>}
 */
export async function partagerReglages(appareil, profil, valeurs) {
  try {
    const blob = await genererCarteImage(appareil, profil, valeurs);
    const filename = `sensi-freefire-${(appareil?.modele || "custom").replace(/\s+/g, "-").toLowerCase()}.png`;

    const file = new File([blob], filename, { type: "image/png" });
    const shareData = {
      title: "Mes réglages de sensibilité Free Fire",
      text: `Sensibilités Free Fire optimisées pour mon ${appareil?.modele || "téléphone"} (Style ${profil?.style || "Polyvalent"}).`,
      files: [file]
    };

    // Vérification stricte du support du partage de fichiers natif
    if (
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share(shareData);
        return {
          succes: true,
          methode: "partage",
          message: "Carte partagée avec succès !"
        };
      } catch (shareErr) {
        // Si l'utilisateur annule le dialogue de partage natif
        if (shareErr.name === "AbortError") {
          return {
            succes: true,
            methode: "partage",
            message: "Partage annulé."
          };
        }
        // Pour les autres erreurs, repli immédiat sur le téléchargement
        telechargerImage(blob, filename);
        return {
          succes: true,
          methode: "telechargement",
          message: "Le partage a échoué. L'image a été téléchargée sur ton appareil."
        };
      }
    } else {
      // Repli immédiat : téléchargement direct
      telechargerImage(blob, filename);
      return {
        succes: true,
        methode: "telechargement",
        message: "Partage natif non supporté. L'image de tes réglages a été téléchargée."
      };
    }
  } catch (error) {
    return {
      succes: false,
      methode: "erreur",
      message: "Impossible de générer l'image des réglages. Tu peux faire une capture d'écran."
    };
  }
}
