/**
 * Application principale et chef d'orchestre du générateur de sensibilité Free Fire.
 */

import { CONFIG } from "./config.js";
import { obtenirResolution, calculerPPI, mesurerTauxRafraichissement } from "./detect.js";
import { calculerSensi, verifierCasReference } from "./calc.js";
import { sauvegarderReglages, chargerReglages } from "./storage.js";
import { partagerReglages } from "./share.js";

// Exposition de la fonction de test pour contrôle en console
if (typeof window !== "undefined") {
  window.verifierCasReference = verifierCasReference;
}

// État central réactif de l'application
const state = {
  ecranActif: 1, // 1: Appareil, 2: Profil, 3: Résultat, 4: Test & Affinage
  listeAppareils: [],
  appareilsDisponibles: true,
  appareil: {
    modele: "Appareil personnalisé",
    diag: 6.5,
    res_w: 1080,
    res_h: 2400,
    ppi: 405,
    hz: 60,
    touch: 180,
    touchCategorie: "Je ne sais pas"
  },
  profil: {
    doigts: 2,
    style: "Polyvalent",
    fps: 60,
    verreTrempe: false,
    mainsMoites: false
  },
  sensibilites: {
    general: 85,
    pointRouge: 81,
    lunette2x: 77,
    lunette4x: 72,
    lunetteAWM: 64
  }
};

/**
 * Diffuse une annonce vocale / lecteur d'écran via aria-live.
 * @param {string} message
 */
function annoncer(message) {
  const statusEl = document.getElementById("aria-status");
  if (statusEl) {
    statusEl.textContent = "";
    setTimeout(() => {
      statusEl.textContent = message;
    }, 50);
  }
}

/**
 * Affiche un message d'alerte ou de notification visuel.
 * @param {string} message
 * @param {'info'|'succes'|'erreur'} type
 */
function afficherNotification(message, type = "info") {
  const toast = document.getElementById("app-toast");
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast toast-${type} visible`;
  annoncer(message);

  if (toast._timer) clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.className = "toast";
  }, 4500);
}

/**
 * Change l'écran visible et synchronise la barre de progression.
 * @param {number} nouvelEcran
 */
function naviguerVers(nouvelEcran) {
  if (nouvelEcran < 1 || nouvelEcran > 4) return;

  state.ecranActif = nouvelEcran;

  for (let i = 1; i <= 4; i++) {
    const screenEl = document.getElementById(`screen-${i}`);
    const stepTab = document.getElementById(`step-${i}`);

    if (screenEl) {
      if (i === nouvelEcran) {
        screenEl.classList.remove("hidden");
        screenEl.setAttribute("aria-hidden", "false");
        // Focus accessible sur le titre de l'écran affiché
        const titleEl = screenEl.querySelector("h2");
        if (titleEl) {
          titleEl.setAttribute("tabindex", "-1");
          titleEl.focus();
        }
      } else {
        screenEl.classList.add("hidden");
        screenEl.setAttribute("aria-hidden", "true");
      }
    }

    if (stepTab) {
      if (i === nouvelEcran) {
        stepTab.classList.add("active");
        stepTab.setAttribute("aria-current", "step");
      } else if (i < nouvelEcran) {
        stepTab.classList.add("completed");
        stepTab.classList.remove("active");
        stepTab.removeAttribute("aria-current");
      } else {
        stepTab.classList.remove("active", "completed");
        stepTab.removeAttribute("aria-current");
      }
    }
  }

  // Barre de progression visuelle globale
  const progressFill = document.getElementById("progress-fill");
  if (progressFill) {
    const pourcentage = ((nouvelEcran - 1) / 3) * 100;
    progressFill.style.width = `${pourcentage}%`;
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * Valide les champs de l'écran 1 (Appareil).
 * @returns {boolean}
 */
function validerEcranAppareil() {
  const errDiag = document.getElementById("err-diag");
  const errPpi = document.getElementById("err-ppi");
  const diagInput = document.getElementById("input-diag");
  const ppiInput = document.getElementById("input-ppi");

  let valide = true;

  if (errDiag) errDiag.textContent = "";
  if (errPpi) errPpi.textContent = "";

  const diag = parseFloat(diagInput?.value);
  if (isNaN(diag) || diag < CONFIG.validation.diagMin || diag > CONFIG.validation.diagMax) {
    if (errDiag) {
      errDiag.textContent = `La diagonale doit être comprise entre ${CONFIG.validation.diagMin} et ${CONFIG.validation.diagMax} pouces.`;
    }
    diagInput?.focus();
    valide = false;
  }

  const ppi = parseInt(ppiInput?.value, 10);
  if (isNaN(ppi) || ppi < CONFIG.validation.ppiMin || ppi > CONFIG.validation.ppiMax) {
    if (errPpi) {
      errPpi.textContent = `Le PPI doit être compris entre ${CONFIG.validation.ppiMin} et ${CONFIG.validation.ppiMax}.`;
    }
    if (valide) ppiInput?.focus();
    valide = false;
  }

  if (valide) {
    state.appareil.diag = diag;
    state.appareil.ppi = ppi;
    const hzInput = document.getElementById("input-hz");
    if (hzInput && !isNaN(parseInt(hzInput.value, 10))) {
      state.appareil.hz = parseInt(hzInput.value, 10);
    }
  }

  return valide;
}

/**
 * Applique les caractéristiques d'un appareil sélectionné aux formulaires.
 * @param {Object} item
 */
function appliquerAppareil(item) {
  state.appareil.modele = item.modele;
  state.appareil.diag = item.diag;
  state.appareil.res_w = item.res_w;
  state.appareil.res_h = item.res_h;
  state.appareil.ppi = item.ppi;
  state.appareil.hz = item.hz;
  state.appareil.touch = item.touch;

  const diagInput = document.getElementById("input-diag");
  const ppiInput = document.getElementById("input-ppi");
  const hzInput = document.getElementById("input-hz");
  const touchSelect = document.getElementById("select-touch");
  const modelBadge = document.getElementById("selected-model-badge");
  const searchInput = document.getElementById("device-search-input");

  if (diagInput) diagInput.value = item.diag;
  if (ppiInput) ppiInput.value = item.ppi;
  if (hzInput) hzInput.value = item.hz;
  if (searchInput) searchInput.value = item.modele;

  // Catégorisation tactile
  let touchCat = "120 à 240 Hz";
  if (item.touch >= 240) touchCat = "240 Hz ou plus";
  else if (item.touch < 120) touchCat = "Moins de 120 Hz";
  state.appareil.touchCategorie = touchCat;

  if (touchSelect) touchSelect.value = touchCat;

  if (modelBadge) {
    modelBadge.textContent = `Appareil actif : ${item.modele}`;
    modelBadge.classList.remove("hidden");
  }

  const errDiag = document.getElementById("err-diag");
  const errPpi = document.getElementById("err-ppi");
  if (errDiag) errDiag.textContent = "";
  if (errPpi) errPpi.textContent = "";

  afficherNotification(`${item.modele} configuré. Caractéristiques chargées.`, "succes");
}

/**
 * Initialise le champ de recherche avec autocomplétion accessible.
 */
function initialiserAutocompletion() {
  const searchInput = document.getElementById("device-search-input");
  const listbox = document.getElementById("device-listbox");
  const noResultEl = document.getElementById("device-no-result");

  if (!searchInput || !listbox) return;

  let activeIndex = -1;
  let itemsFiltres = [];

  function fermerSuggestions() {
    listbox.classList.add("hidden");
    searchInput.setAttribute("aria-expanded", "false");
    searchInput.removeAttribute("aria-activedescendant");
    activeIndex = -1;
  }

  function ouvrirSuggestions() {
    if (itemsFiltres.length > 0 || searchInput.value.trim().length > 0) {
      listbox.classList.remove("hidden");
      searchInput.setAttribute("aria-expanded", "true");
    }
  }

  function surbrillanceOption(index) {
    const options = listbox.querySelectorAll("[role='option']");
    options.forEach((opt, idx) => {
      if (idx === index) {
        opt.classList.add("selected");
        opt.setAttribute("aria-selected", "true");
        searchInput.setAttribute("aria-activedescendant", opt.id);
        opt.scrollIntoView({ block: "nearest" });
      } else {
        opt.classList.remove("selected");
        opt.setAttribute("aria-selected", "false");
      }
    });
  }

  function filtrer() {
    const q = searchInput.value.trim().toLowerCase();
    listbox.innerHTML = "";

    if (!q) {
      fermerSuggestions();
      if (noResultEl) noResultEl.classList.add("hidden");
      return;
    }

    itemsFiltres = state.listeAppareils.filter((app) =>
      app.modele.toLowerCase().includes(q)
    );

    if (itemsFiltres.length === 0) {
      listbox.classList.add("hidden");
      searchInput.setAttribute("aria-expanded", "false");
      if (noResultEl) {
        noResultEl.textContent = "Modèle introuvable. Tu peux renseigner les caractéristiques ci-dessous.";
        noResultEl.classList.remove("hidden");
      }
      return;
    }

    if (noResultEl) noResultEl.classList.add("hidden");
    activeIndex = -1;

    itemsFiltres.slice(0, 10).forEach((item, idx) => {
      const li = document.createElement("li");
      li.id = `device-opt-${idx}`;
      li.role = "option";
      li.setAttribute("aria-selected", "false");
      li.className = "listbox-option";
      li.textContent = `${item.modele} (${item.diag}" • ${item.hz} Hz)`;

      li.addEventListener("click", () => {
        appliquerAppareil(item);
        fermerSuggestions();
      });

      listbox.appendChild(li);
    });

    ouvrirSuggestions();
  }

  searchInput.addEventListener("input", filtrer);

  searchInput.addEventListener("keydown", (e) => {
    const options = listbox.querySelectorAll("[role='option']");
    if (listbox.classList.contains("hidden") || options.length === 0) {
      if (e.key === "ArrowDown" && searchInput.value.trim().length > 0) {
        filtrer();
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % options.length;
      surbrillanceOption(activeIndex);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + options.length) % options.length;
      surbrillanceOption(activeIndex);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && itemsFiltres[activeIndex]) {
        appliquerAppareil(itemsFiltres[activeIndex]);
        fermerSuggestions();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      fermerSuggestions();
    }
  });

  // Ferme la liste lors d'un clic en dehors
  document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !listbox.contains(e.target)) {
      fermerSuggestions();
    }
  });
}

/**
 * Lance la détection automatique des paramètres de l'écran actuel.
 */
async function detecterEcranAutomatique() {
  const detectBtn = document.getElementById("btn-detect-screen");
  const detectMsg = document.getElementById("detect-feedback-msg");

  if (detectBtn) detectBtn.disabled = true;
  if (detectMsg) {
    detectMsg.textContent = "Mesure du taux de rafraîchissement en cours (~60 frames)...";
    detectMsg.className = "detect-feedback info";
  }

  try {
    const res = obtenirResolution();
    state.appareil.res_w = res.width;
    state.appareil.res_h = res.height;

    // Mesure du taux de rafraîchissement réel
    const hzResult = await mesurerTauxRafraichissement();
    state.appareil.hz = hzResult.hz;

    const hzInput = document.getElementById("input-hz");
    if (hzInput) hzInput.value = hzResult.hz;

    // Calcul du PPI avec la diagonale actuelle
    const diagInput = document.getElementById("input-diag");
    const ppiInput = document.getElementById("input-ppi");
    const diag = parseFloat(diagInput?.value) || 6.5;

    const ppiCalcule = calculerPPI(res.width, res.height, diag);
    state.appareil.ppi = ppiCalcule;
    state.appareil.diag = diag;

    if (ppiInput) ppiInput.value = ppiCalcule;

    state.appareil.modele = "Mon écran (détecté)";
    const modelBadge = document.getElementById("selected-model-badge");
    if (modelBadge) {
      modelBadge.textContent = `Écran détecté : ${res.width}×${res.height} • ${hzResult.hz} Hz`;
      modelBadge.classList.remove("hidden");
    }

    if (detectMsg) {
      detectMsg.textContent = hzResult.message;
      detectMsg.className = "detect-feedback warning";
    }

    afficherNotification("Caractéristiques d'affichage mesurées avec succès.", "succes");
  } catch {
    if (detectMsg) {
      detectMsg.textContent = "Mesure du taux de rafraîchissement impossible. 60 Hz est utilisé comme valeur de repli.";
      detectMsg.className = "detect-feedback warning";
    }
  } finally {
    if (detectBtn) detectBtn.disabled = false;
  }
}

/**
 * Recalcule le PPI dynamique si la diagonale change manuellement.
 */
function synchroniserDiagonalePpi() {
  const diagInput = document.getElementById("input-diag");
  const ppiInput = document.getElementById("input-ppi");

  if (!diagInput || !ppiInput) return;

  diagInput.addEventListener("input", () => {
    const diag = parseFloat(diagInput.value);
    if (diag >= CONFIG.validation.diagMin && diag <= CONFIG.validation.diagMax) {
      const ppi = calculerPPI(state.appareil.res_w, state.appareil.res_h, diag);
      ppiInput.value = ppi;
      state.appareil.diag = diag;
      state.appareil.ppi = ppi;
    }
  });

  ppiInput.addEventListener("input", () => {
    const ppi = parseInt(ppiInput.value, 10);
    if (!isNaN(ppi)) {
      state.appareil.ppi = ppi;
    }
  });

  const hzInput = document.getElementById("input-hz");
  if (hzInput) {
    hzInput.addEventListener("input", () => {
      const hz = parseInt(hzInput.value, 10);
      if (!isNaN(hz)) {
        state.appareil.hz = hz;
      }
    });
  }

  const touchSelect = document.getElementById("select-touch");
  if (touchSelect) {
    touchSelect.addEventListener("change", () => {
      const cat = touchSelect.value;
      state.appareil.touchCategorie = cat;
      if (cat === "Moins de 120 Hz") {
        state.appareil.touch = 90;
      } else if (cat === "120 à 240 Hz") {
        state.appareil.touch = 180;
      } else if (cat === "240 Hz ou plus") {
        state.appareil.touch = 240;
      } else {
        // « Je ne sais pas » utilise 180 comme valeur interne
        state.appareil.touch = 180;
      }
    });
  }
}

/**
 * Met en place les groupes de boutons exclusifs de l'écran Profil (Écran 2).
 */
function initialiserEcranProfil() {
  // 1. Boutons Doigts : 2, 3, 4
  const boutonsDoigts = document.querySelectorAll("[data-group='doigts']");
  boutonsDoigts.forEach((btn) => {
    btn.addEventListener("click", () => {
      boutonsDoigts.forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
      state.profil.doigts = parseInt(btn.dataset.value, 10);
    });
  });

  // 2. Boutons Style : Rush, Polyvalent, Sniper
  const boutonsStyle = document.querySelectorAll("[data-group='style']");
  boutonsStyle.forEach((btn) => {
    btn.addEventListener("click", () => {
      boutonsStyle.forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
      state.profil.style = btn.dataset.value;
    });
  });

  // 3. Boutons FPS : 60, 90, 120
  const boutonsFps = document.querySelectorAll("[data-group='fps']");
  boutonsFps.forEach((btn) => {
    btn.addEventListener("click", () => {
      boutonsFps.forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
      state.profil.fps = parseInt(btn.dataset.value, 10);
    });
  });

  // 4. Section repliable « Affiner »
  const toggleBtn = document.getElementById("toggle-refine");
  const refineContent = document.getElementById("refine-content");
  if (toggleBtn && refineContent) {
    toggleBtn.addEventListener("click", () => {
      const isExpanded = toggleBtn.getAttribute("aria-expanded") === "true";
      const nextState = !isExpanded;
      toggleBtn.setAttribute("aria-expanded", String(nextState));
      if (nextState) {
        refineContent.classList.remove("hidden");
      } else {
        refineContent.classList.add("hidden");
      }
    });
  }

  // Options : Verre trempé & Mains moites
  const chkVerre = document.getElementById("opt-verre");
  const chkMoites = document.getElementById("opt-moites");

  if (chkVerre) {
    chkVerre.addEventListener("change", () => {
      state.profil.verreTrempe = chkVerre.checked;
    });
  }
  if (chkMoites) {
    chkMoites.addEventListener("change", () => {
      state.profil.mainsMoites = chkMoites.checked;
    });
  }
}

/**
 * Met à jour l'affichage des 5 cartes sur l'écran 3 (Résultats).
 */
function mettreAJourEcranResultats() {
  const summaryEl = document.getElementById("result-summary-text");
  if (summaryEl) {
    summaryEl.textContent = `Optimisé pour ton ${state.appareil.modele}, ${state.profil.doigts} doigts, style ${state.profil.style}.`;
  }

  const cles = [
    { cle: "general", valId: "val-general", barId: "bar-general" },
    { cle: "pointRouge", valId: "val-point-rouge", barId: "bar-point-rouge" },
    { cle: "lunette2x", valId: "val-2x", barId: "bar-2x" },
    { cle: "lunette4x", valId: "val-4x", barId: "bar-4x" },
    { cle: "lunetteAWM", valId: "val-awm", barId: "bar-awm" }
  ];

  cles.forEach(({ cle, valId, barId }) => {
    const val = state.sensibilites[cle];
    const valEl = document.getElementById(valId);
    const barEl = document.getElementById(barId);

    if (valEl) valEl.textContent = String(val);
    if (barEl) {
      barEl.style.width = `${Math.min(100, Math.max(0, val))}%`;
      barEl.setAttribute("aria-valuenow", String(val));
    }
  });
}

/**
 * Met à jour les valeurs visuelles sur l'écran 4 (Test et affinage).
 */
function mettreAJourEcranAffinage() {
  const cles = [
    { cle: "general", id: "tune-val-general", barId: "tune-bar-general" },
    { cle: "pointRouge", id: "tune-val-pointRouge", barId: "tune-bar-pointRouge" },
    { cle: "lunette2x", id: "tune-val-lunette2x", barId: "tune-bar-lunette2x" },
    { cle: "lunette4x", id: "tune-val-lunette4x", barId: "tune-bar-lunette4x" },
    { cle: "lunetteAWM", id: "tune-val-lunetteAWM", barId: "tune-bar-lunetteAWM" }
  ];

  cles.forEach(({ cle, id, barId }) => {
    const val = state.sensibilites[cle];
    const el = document.getElementById(id);
    const bar = document.getElementById(barId);
    if (el) el.textContent = String(val);
    if (bar) {
      bar.style.width = `${val}%`;
      bar.setAttribute("aria-valuenow", String(val));
    }
  });
}

/**
 * Logique générique d'affinage (+4 / 0 / -4).
 * @param {string} cle - Clé de la sensibilité
 * @param {number} delta - Variation (+4, 0, -4)
 */
function ajusterSensibilite(cle, delta) {
  if (delta === 0) return;

  const actuelle = state.sensibilites[cle] ?? 80;
  const nouvelle = Math.max(CONFIG.bornes.min, Math.min(CONFIG.bornes.max, actuelle + delta));

  state.sensibilites[cle] = nouvelle;
  mettreAJourEcranAffinage();
  mettreAJourEcranResultats();

  const labelAction = delta > 0 ? "+4" : "-4";
  annoncer(`${cle} ajusté à ${nouvelle} (${labelAction})`);
}

/**
 * Configure les boutons d'affinage pour chaque sensibilité de manière générique.
 */
function initialiserBoutonsAffinage() {
  const boutons = document.querySelectorAll("[data-action='tune']");
  boutons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const cible = btn.dataset.target;
      const type = btn.dataset.tuneType; // 'lent' (+4), 'bon' (0), 'rapide' (-4)

      if (type === "lent") {
        ajusterSensibilite(cible, CONFIG.affinageStep);
      } else if (type === "rapide") {
        ajusterSensibilite(cible, -CONFIG.affinageStep);
      } else {
        afficherNotification("Valeur confirmée pour cette optique.", "succes");
      }
    });
  });

  // Bouton de sauvegarde locale
  const btnSave = document.getElementById("btn-save-settings");
  if (btnSave) {
    btnSave.addEventListener("click", () => {
      const res = sauvegarderReglages(state.appareil, state.profil, state.sensibilites);
      afficherNotification(res.message, res.succes ? "succes" : "erreur");
    });
  }

  // Bouton de partage / téléchargement carte graphique
  const btnShare = document.getElementById("btn-share-settings");
  if (btnShare) {
    btnShare.addEventListener("click", async () => {
      btnShare.disabled = true;
      btnShare.textContent = "Génération de l'image...";
      try {
        const res = await partagerReglages(state.appareil, state.profil, state.sensibilites);
        afficherNotification(res.message, res.succes ? "succes" : "erreur");
      } finally {
        btnShare.disabled = false;
        btnShare.textContent = "Partager mes réglages";
      }
    });
  }
}

/**
 * Configure tous les boutons de navigation entre les écrans.
 */
function initialiserNavigation() {
  // Écran 1 -> Écran 2
  const btnStep1Next = document.getElementById("btn-step1-next");
  if (btnStep1Next) {
    btnStep1Next.addEventListener("click", () => {
      if (validerEcranAppareil()) {
        naviguerVers(2);
      }
    });
  }

  // Écran 2 -> Écran 1
  const btnStep2Prev = document.getElementById("btn-step2-prev");
  if (btnStep2Prev) {
    btnStep2Prev.addEventListener("click", () => {
      naviguerVers(1);
    });
  }

  // Écran 2 -> Écran 3 (Calcul des sensibilités)
  const btnStep2Next = document.getElementById("btn-step2-next");
  if (btnStep2Next) {
    btnStep2Next.addEventListener("click", () => {
      state.sensibilites = calculerSensi(state.appareil, state.profil);
      mettreAJourEcranResultats();
      mettreAJourEcranAffinage();
      naviguerVers(3);
    });
  }

  // Écran 3 -> Écran 2
  const btnStep3Prev = document.getElementById("btn-step3-prev");
  if (btnStep3Prev) {
    btnStep3Prev.addEventListener("click", () => {
      naviguerVers(2);
    });
  }

  // Écran 3 -> Écran 4
  const btnStep3Next = document.getElementById("btn-step3-next");
  if (btnStep3Next) {
    btnStep3Next.addEventListener("click", () => {
      mettreAJourEcranAffinage();
      naviguerVers(4);
    });
  }

  // Écran 4 -> Écran 3
  const btnStep4Prev = document.getElementById("btn-step4-prev");
  if (btnStep4Prev) {
    btnStep4Prev.addEventListener("click", () => {
      naviguerVers(3);
    });
  }

  // Partage direct depuis l'écran 3
  const btnStep3Share = document.getElementById("btn-step3-share");
  if (btnStep3Share) {
    btnStep3Share.addEventListener("click", async () => {
      btnStep3Share.disabled = true;
      btnStep3Share.textContent = "Création...";
      try {
        const res = await partagerReglages(state.appareil, state.profil, state.sensibilites);
        afficherNotification(res.message, res.succes ? "succes" : "erreur");
      } finally {
        btnStep3Share.disabled = false;
        btnStep3Share.textContent = "Partager la carte";
      }
    });
  }
}

/**
 * Restaure une sauvegarde existante dans l'état et l'interface.
 * @param {Object} data
 */
function restaurerDonnees(data) {
  if (!data) return;

  state.appareil = { ...state.appareil, ...data.appareil };
  state.profil = { ...state.profil, ...data.profil };
  state.sensibilites = { ...state.sensibilites, ...data.valeurs };

  // Remplissage écran 1
  const diagInput = document.getElementById("input-diag");
  const ppiInput = document.getElementById("input-ppi");
  const hzInput = document.getElementById("input-hz");
  const touchSelect = document.getElementById("select-touch");
  const searchInput = document.getElementById("device-search-input");
  const modelBadge = document.getElementById("selected-model-badge");

  if (diagInput) diagInput.value = state.appareil.diag;
  if (ppiInput) ppiInput.value = state.appareil.ppi;
  if (hzInput) hzInput.value = state.appareil.hz;
  if (searchInput) searchInput.value = state.appareil.modele;
  if (touchSelect && state.appareil.touchCategorie) {
    touchSelect.value = state.appareil.touchCategorie;
  }
  if (modelBadge) {
    modelBadge.textContent = `Restauré : ${state.appareil.modele}`;
    modelBadge.classList.remove("hidden");
  }

  // Remplissage écran 2
  const boutonsDoigts = document.querySelectorAll("[data-group='doigts']");
  boutonsDoigts.forEach((b) => {
    const actif = parseInt(b.dataset.value, 10) === state.profil.doigts;
    b.classList.toggle("active", actif);
    b.setAttribute("aria-pressed", String(actif));
  });

  const boutonsStyle = document.querySelectorAll("[data-group='style']");
  boutonsStyle.forEach((b) => {
    const actif = b.dataset.value === state.profil.style;
    b.classList.toggle("active", actif);
    b.setAttribute("aria-pressed", String(actif));
  });

  const boutonsFps = document.querySelectorAll("[data-group='fps']");
  boutonsFps.forEach((b) => {
    const actif = parseInt(b.dataset.value, 10) === state.profil.fps;
    b.classList.toggle("active", actif);
    b.setAttribute("aria-pressed", String(actif));
  });

  const chkVerre = document.getElementById("opt-verre");
  const chkMoites = document.getElementById("opt-moites");
  if (chkVerre) chkVerre.checked = Boolean(state.profil.verreTrempe);
  if (chkMoites) chkMoites.checked = Boolean(state.profil.mainsMoites);

  mettreAJourEcranResultats();
  mettreAJourEcranAffinage();

  afficherNotification("Tes réglages précédents ont été restaurés.", "succes");
  naviguerVers(3);
}

/**
 * Vérifie si une sauvegarde existe au démarrage et affiche le bandeau de restauration.
 */
function verifierSauvegardeExistante() {
  const data = chargerReglages();
  const banner = document.getElementById("restore-banner");
  const restoreBtn = document.getElementById("btn-restore");

  if (data && banner && restoreBtn) {
    banner.classList.remove("hidden");
    restoreBtn.addEventListener("click", () => {
      restaurerDonnees(data);
      banner.classList.add("hidden");
    });
  }
}

/**
 * Charge les modèles depuis le fichier ./devices.json.
 */
async function chargerFichierAppareils() {
  try {
    const res = await fetch("./devices.json");
    if (!res.ok) {
      throw new Error(`Erreur HTTP: ${res.status}`);
    }
    const data = await res.json();
    state.listeAppareils = data.appareils || data.devices || (Array.isArray(data) ? data : []);
    state.appareilsDisponibles = true;
  } catch {
    state.appareilsDisponibles = false;
    const errBox = document.getElementById("devices-load-error");
    if (errBox) {
      errBox.textContent = "Impossible de charger la liste des appareils. Tu peux continuer avec une saisie manuelle.";
      errBox.classList.remove("hidden");
    }
  }
}

/**
 * Initialisation globale au chargement du DOM.
 */
document.addEventListener("DOMContentLoaded", async () => {
  await chargerFichierAppareils();
  initialiserAutocompletion();
  synchroniserDiagonalePpi();
  initialiserEcranProfil();
  initialiserBoutonsAffinage();
  initialiserNavigation();
  verifierSauvegardeExistante();

  const detectBtn = document.getElementById("btn-detect-screen");
  if (detectBtn) {
    detectBtn.addEventListener("click", detecterEcranAutomatique);
  }
});
