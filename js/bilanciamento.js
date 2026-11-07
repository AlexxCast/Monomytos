// Monomythos: manopole di bilanciamento (lette da engine.js). Prova le modifiche con
//   node strumenti/simulazione_bilanciamento.js . 200 3
// Valori scelti il 2026-11-03 per Atti più corti (circa 4-7 round) e meno Villain.
window.MONOMYTHOS_BILANCIAMENTO = Object.assign({
  scalaVita: 0.5,       // moltiplica la Vita dei nemici (1 = formula del manuale)
  scalaSoglie: 0.45,    // moltiplica le soglie di Disinnesco Primario e Bruto
  pesoEroi: 2,          // quanto conta ogni eroe in più nella formula (Livello + Eroi × peso)
  pesoEroiOltre2: 3,    // peso in più per ogni eroe oltre il secondo: squadre da 3-4 meno facili (2026-11-03; 3 dal 2026-11-07)
  scalaGruppo: 1.6,     // con 2+ eroi Vita e soglie ×1,6: giocando bene in gruppo si vinceva il 95% in 7 round (test del 2026-11-07)
  forzaPerEroe: 0.7,    // Forza in più dei nemici per ogni eroe oltre il primo (arrotondato per difetto)
  crisiComposita: true, // Atti I e II di Livello ≤ 3 si fondono con una seconda Minaccia
  sogliaVillain: 5,     // Trauma che fa diventare Villain
  pescaMax: 4           // carte pescate al massimo a inizio round (manuale §8.5 diceva 5; 4 dal 2026-11-05: Neon Phantom troppo forte)
}, window.MONOMYTHOS_BILANCIAMENTO || {});
