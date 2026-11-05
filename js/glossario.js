// Glossario delle parole chiave: nella scheda di una carta, sotto il testo, si spiegano in breve
// le parole del regolamento che compaiono nell'effetto (Reazione, Travolgere, Stordito...).
(function () {
  const VOCI = [
    [/\[Eroe\]|\[Villain\]/i, '[Eroe] / [Villain]', 'La carta fa la parte [Eroe] finché sei un eroe; se il Trauma ti trasforma in Villain, vale la parte [Villain].'],
    [/Reazione/i, 'Reazione', 'Si può giocare anche fuori dal tuo turno, quando un nemico attacca: compare nella finestra di difesa.'],
    [/Travolgere/i, 'Travolgere', 'La parte del danno che supera la Resistenza passa sempre, anche se pari scartando carte.'],
    [/Parata Dinamica|assorbi.*scartando|scartando carte/i, 'Parata Dinamica', 'Quando ti attaccano puoi scartare carte: il loro Valore assorbe i danni.'],
    [/Stordit/i, 'Stordito', 'Il bersaglio salta la sua prossima azione.'],
    [/Sfiancat/i, 'Sfiancato', 'Al prossimo round il bersaglio pesca una sola carta.'],
    [/Ferit/i, 'Ferito', 'Un nemico che ha già perso Vita.'],
    [/\bPE\b|Punti Eroe|\bHP\b(?![^.]*Vita)/, 'Punti Eroe (PE/HP)', 'Si guadagnano con le azioni altruiste e completando un binario. Si spendono sulle carte con [Costo: HP] o per usare il Potere Base una seconda volta nel turno (3 PE); a fine partita ognuno vale 5 crediti. Non sono la Vita.'],
    [/\bVP\b|Punti Vittoria/, 'VP', 'Punti del Villain: si guadagnano con le azioni egoiste. Si spendono sulle carte con [Costo: VP] o per usare il Potere Base una seconda volta nel turno (3 VP); a fine partita ognuno vale 5 crediti.'],
    [/\bTRM\b|Trauma/i, 'Trauma (TRM)', 'A 5 Trauma l\'eroe diventa Villain e gioca contro la squadra.'],
    [/Azione Morale|Spesa Morale/i, 'Azione Morale', 'Carta che fa guadagnare o spendere Punti Eroe (o VP se sei Villain).'],
    [/DISCIPLINA D'ASSALTO/i, 'Disciplina d\'Assalto (N)', '+1 danno se dopo averla giocata hai ancora almeno N carte in mano.'],
    [/RITENZIONE TATTICA/i, 'Ritenzione Tattica (N)', 'Se dopo averla giocata hai meno di N carte, a fine round torna in mano.'],
    [/Resistenza/i, 'Resistenza', 'Il danno fino alla Resistenza si può parare scartando carte; quello oltre passa (Travolgere).'],
    [/Scudo/i, 'Scudo', 'Assorbe i danni prima della Vita.'],
    [/ad area|a tutti gli altri nemici|tutti i nemici/i, 'Area', 'Colpisce più nemici insieme.'],
    [/nemico Tattico|Tattic[oa] è obbligat/i, 'Nemico Tattico', 'Un nemico che sceglie i bersagli con astuzia; la Provocazione lo costringe ad attaccare te.'],
    [/Aggressiv/i, 'Nemico Aggressivo', 'Un nemico che attacca chi ha meno carte in mano.'],
    [/Disinnesco|binario|Multi-Path/i, 'Disinnesco (binari)', 'Completare un binario risolve la Minaccia: è più difficile che abbattere gli sgherri, ma dà un bottino a ogni eroe (+3 Vita, -1 Trauma, +1 PE, 1 carta).'],
    [/Minaccia/i, 'Minaccia', 'La sua Vita è la somma della Vita dei suoi sgherri: per abbatterla colpisci gli sgherri.'],
    [/Mazzo Minaccia/i, 'Mazzo Minaccia', 'Le Minacce dei prossimi Atti: guardarle ti dice cosa arriverà.']
  ];

  function voci(testo) {
    const t = String(testo || '');
    return VOCI.filter(([re]) => re.test(t)).map(([, nome, spiega]) => ({ nome, spiega }));
  }

  function html(testo) {
    const v = voci(testo);
    if (!v.length) return '';
    const T = window.I18N ? window.I18N.t : (x => x);
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    return `<div class="glossario"><div class="glossario-titolo">${esc(T('Parole chiave'))}</div>${v.map(x => `<div class="glossario-voce"><b>${esc(T(x.nome))}</b> ${esc(T(x.spiega))}</div>`).join('')}</div>`;
  }

  window.Glossario = { voci, html, VOCI };
})();
