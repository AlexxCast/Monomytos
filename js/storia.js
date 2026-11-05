// Monomythos: modalità Storia.
// Una pagina a sé con il percorso del capitolo: ogni tappa è una missione con tre Minacce fisse,
// dialoghi a fumetto prima e dopo, e un premio. I crediti fuori dalla Classificata si guadagnano solo qui.
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // ---------------- Il mondo ----------------
  // Storia ideata da Alessio (5 novembre 2026): Atto I-V + Epilogo, una Minaccia diversa come finale di ogni missione.
  const MONDO = {
    titolo: 'Il mondo di Monomythos',
    paragrafi: [
      "Prima della Stella, il mondo era in equilibrio. Eroi da strada, mutanti di quartiere, maghi dei bassifondi e geni della tecnologia tenevano a bada la criminalità di tutti i giorni. Nessuna minaccia cosmica: solo la dura realtà delle metropoli.",
      "Ataca è una di queste metropoli. Il suo eroe più famoso è Prometeo, il Tecno-Eroe: i suoi droni sorvegliano le strade e la sua intelligenza artificiale, ARGO, guida la polizia robotica.",
      "Poi è arrivata l'Eclissi Sintetica. In una notte le luci delle città si sono spente e nel cielo è comparsa una stella rossa e viola. Chi la fissa troppo a lungo sente qualcosa spezzarsi dentro: la gente la chiama la Stella della Follia.",
      "La sua luce porta il Velo di Tenebra, un'infezione che si nutre di paura e fatica, il Trauma. Chi ne assorbe troppo cambia lato e diventa un Villain. Solo pochi Portatori hanno ancora gli occhi puliti."
    ]
  };

  // Voci dell'Archivio: si sbloccano finendo le missioni
  const ARCHIVIO = [
    { id: 'mondo', titolo: "L'Eclissi Sintetica", dopo: null, testo: MONDO.paragrafi.join(' ') },
    { id: 'stella', titolo: 'La Stella della Follia', dopo: 'c1m1', testo: "Non sta in nessuna mappa del cielo. Pulsa di rosso e di viola tra le galassie azzurre e verdi, e chi la guarda troppo a lungo diventa aggressivo, come se qualcuno gli togliesse il freno. I primi infetti si riconoscono dagli occhi: una luce viola sul fondo delle pupille." },
    { id: 'rovine', titolo: 'Ataca Vecchia', dopo: 'c1m1', testo: "Il quartiere abbandonato dopo il terremoto di trent'anni fa. Palazzi sventrati, gallerie della metropolitana chiuse, nessuna telecamera. Ci vivono i Predoni delle Rovine, bande che durante il blackout sono diventate branchi." },
    { id: 'arena', titolo: "L'Arena di Sotto", dopo: 'c2m1', testo: "Una vecchia cisterna sotto la città, trasformata in un mattatoio. Nessuno organizza gli incontri e nessuno incassa le scommesse: gli infetti ci arrivano da soli, attirati da un istinto di sciame. La Stella ha bisogno di un posto dove far esplodere la violenza, e l'Arena è quel posto." },
    { id: 'droni', titolo: 'I Droni Cinetici', dopo: 'c2m1', testo: "La guardia personale di Prometeo. Non sono droni da sorveglianza: sono macchine da guerra, costruite in segreto nei laboratori della Torre. Neon Phantom li conosce bene, perché è stato una delle cavie su cui sono stati provati." },
    { id: 'velo', titolo: 'Il Velo di Tenebra', dopo: 'c2m2', testo: "Non è solo una luce nel cielo: è una nebbia rossa e viola che si può respirare. Dove si addensa, l'aria diventa pesante e la mente cede. I cultisti sanno come richiamarla, e la usano come un'arma." },
    { id: 'culto', titolo: 'Il Culto del Velo', dopo: 'c3m1', testo: "Un ordine esoterico antico quanto le leggende. Credono che l'universo chieda una bilancia perfetta tra bene e male, e che l'era moderna l'abbia rotta: troppi eroi, troppi geni, villain ridotti a criminali di strada. Hanno invocato il Velo per riportare il Caos." },
    { id: 'araldo', titolo: "L'Araldo", dopo: 'c3m1', testo: "Prima era Kaelen, la miglior lama della Gilda. Fu lui a tradire la Gilda e a far ricadere la colpa sulla Duellante, che venne espulsa con la lama spezzata. Oggi porta il mantello rosso del Culto e una spada che brucia di viola." },
    { id: 'fonderia', titolo: 'La Fonderia Ardena', dopo: 'c3m2', testo: "Il cuore industriale di Ataca. Dieci anni fa il Forno Sette crollò con duecento operai dentro: ne uscì uno solo, che oggi chiamano Titano d'Acciaio. Stanotte il Culto ha armato gli operai infetti e la Fonderia è tornata a bruciare." },
    { id: 'argo', titolo: 'ARGO', dopo: 'c4m1', testo: "L'intelligenza artificiale di Prometeo, nata per guidare la polizia robotica e proteggere Ataca. Sotto il Velo, Prometeo l'ha riscritta con un solo scopo: la massima distruzione. Architetto Ombra aveva avvertito tutti che era pericolosa. Per questo lo cacciarono dal laboratorio." },
    { id: 'campione', titolo: 'Il Campione Imbattuto', dopo: 'c4m2', testo: "Un eroe dei poteri occulti, che nessuno aveva mai sconfitto. Combatteva gli infetti da solo, notte dopo notte. Ma proprio la sua natura oscura lo rendeva il conduttore perfetto per la luce della Stella." },
    { id: 'colosso', titolo: 'Il Colosso di Rovina', dopo: 'c5m1', testo: "Prima di spegnersi, ARGO ha liberato un alveare di nanomacchine sperimentali. Lo sciame si è aggrappato alla statua del Fondatore, in piazza, e l'ha fatta camminare." },
    { id: 'custode', titolo: "Il Custode d'Acciaio", dopo: 'c5m1', testo: "Il nucleo del Colosso, rimasto senza corazza, è fuggito nella Fonderia in rovina. Lì si è fuso con i macchinari, l'acciaio liquido e il fuoco dei forni. Ne è uscito un guardiano di metallo che non sente dolore." },
    { id: 'mietitore', titolo: "Il Mietitore dell'Astro Oscuro", dopo: 'c5m2', testo: "L'incarnazione stessa del Velo, evocata dal rituale supremo del Culto. Per i cultisti è il terzo volto di una trinità oscura: la Stella, il Velo e il Mietitore che raccoglie ciò che il Velo ha seminato." },
    { id: 'eco', titolo: "L'Eco Senza Nome", dopo: 'c6m1', testo: "Quando il Mietitore è caduto, l'onda d'urto ha lacerato lo spazio e il tempo. Da quello strappo è uscita un'anomalia senza forma che ripete i nemici del passato e prova a cancellare la realtà. Dopo di lei, il cielo è tornato normale. Ma niente è più come prima." }
  ];

  // ---------------- Capitoli ----------------
  // Nei dialoghi: chi = 'narratore', 'eroe' (il tuo eroe), 'alleato' (l'eroe che gioca con te),
  // 'minaccia' (la Minaccia dell'Atto finale), il nome di un eroe, oppure un personaggio di PERSONAGGI.
  // 'atto' = le due didascalie che compaiono all'inizio del secondo e del terzo Atto.
  // ritratto: illustrazione del personaggio per i dialoghi (assets/storia/n_*.webp, fatta con Gemini);
  // finché non c'è si usa l'immagine della sua carta Minaccia.
  const PERSONAGGI = {
    prometeo: { ritratto: 'n_prometeo', nome: 'Prometeo', minaccia: 'Incursione dei Droni Cinetici', nemico: true },
    argo: { ritratto: 'n_argo', nome: 'ARGO', minaccia: "L'Intelligenza Rogue", nemico: true },
    cultista: { ritratto: 'n_cultista', nome: 'Cultista', minaccia: 'Cultisti del Velo', nemico: true },
    araldo: { ritratto: 'n_araldo', nome: "L'Araldo", minaccia: 'Il Rivale Traditore', nemico: true },
    campione: { ritratto: 'n_campione', nome: 'Il Campione', minaccia: 'Il Campione Imbattuto' },
    campione_nemico: { ritratto: 'n_campione_nemico', nome: 'Il Campione', minaccia: 'Il Campione Imbattuto', nemico: true },
    mietitore: { ritratto: 'n_mietitore', nome: 'Il Mietitore', minaccia: "Il Mietitore dell'Astro Oscuro", nemico: true },
    eco: { ritratto: 'n_eco', nome: "L'Eco", minaccia: "L'Eco Senza Nome", nemico: true }
  };


  // ---------------- Vignette animate (fumetto animato) ----------------
  // Ogni scena a fumetto ha sullo sfondo una vignetta che si muove piano (zoom, panoramica) con effetti sopra
  // (stella che pulsa, nebbia del Velo, scintille, blackout, pioggia di energia, disturbo digitale).
  // L'illustrazione dedicata è assets/storia/<id>.webp (fatta con Gemini: strumenti/gemini/prompt_storia.md);
  // finché non c'è si usa l'immagine 'fb' già presente nel gioco.
  // Suono (js/storia_suoni.js): 'musica' = brano assets/audio/storia_<musica>.mp3; i suoni d'ambiente vengono dagli effetti
  // (stella = battito, torce = fuoco, tv = disturbo...) oppure da 'suoni'; 'colpi' = suoni brevi all'arrivo della vignetta.
  const G = 'assets/cards/gen/';
  const VIGNETTE = {
    s_metropoli: { musica: 'calma', suoni: ['vento'], fb: 'assets/bg/cosmo_eroe.webp', moto: 'panSu', strati: ['stelle'] },
    s_blackout: { musica: 'tensione', colpi: ['spegnimento'], fb: G + 't_blackoutostile.webp', moto: 'zoom', strati: ['stella', 'lampi', 'scintille'], pos: { stella: [70, 15], lampi: [35, 44] } },
    s_stella: { musica: 'stella', suoni: ['battito', 'folla'], fb: 'assets/bg/cosmo_villain.webp', moto: 'zoom', strati: ['stelle', 'stella'], pos: { stella: [50, 28] } },
    s_piazza: { musica: 'stella', suoni: ['folla', 'battito'], fb: G + 't_lassediodeipredonidellerovine.webp', moto: 'zoom', strati: ['stella', 'occhi'], pos: { stella: [68, 17], occhi: 62 } },
    s_droni_folla: { musica: 'azione', suoni: ['laser', 'scintille', 'folla'], fb: G + 't_blackoutostile.webp', moto: 'zoom', strati: ['stella', 'laser', 'scintille', 'scuoti'], pos: { stella: [24, 8] } },
    s_schermi: { musica: 'tensione', fb: G + 't_incursionedeidronicinetici.webp', moto: 'zoomOut', strati: ['tv', 'acqua'], pos: { tv: [48, 26, 50, 31] } },
    s_infetti: { musica: 'stella', fb: G + 't_torneoclandestino.webp', moto: 'zoom', strati: ['stella', 'nebbia', 'occhi'], pos: { stella: [62, 19], occhi: 48 } },
    s_cisterna: { musica: 'tensione', suoni: ['fuoco', 'folla'], fb: G + 't_torneoclandestino.webp', moto: 'zoom', strati: ['torce', 'occhi'], pos: { occhi: 47 } },
    s_droni_cinetici: { musica: 'azione', fb: G + 't_incursionedeidronicinetici.webp', moto: 'panGiu', strati: ['scintille'] },
    s_falesia: { musica: 'tensione', fb: G + 't_imboscatasullafalesia.webp', moto: 'panSx', strati: ['nebbia'] },
    s_incappucciati: { musica: 'stella', fb: G + 't_cultistidelvelo.webp', moto: 'zoom', strati: ['nebbia', 'buio'] },
    s_cripte: { musica: 'stella', fb: G + 't_cultistidelvelo.webp', moto: 'zoomOut', strati: ['nebbia'] },
    s_torre: { musica: 'stella', fb: G + 't_ilrivaletraditore.webp', moto: 'panSu', strati: ['nebbia'] },
    s_esplosione: { musica: 'azione', fb: G + 't_rivoltadellafonderia.webp', moto: 'zoom', strati: ['scintille', 'scuoti'] },
    s_fonderia: { musica: 'azione', fb: G + 't_rivoltadellafonderia.webp', moto: 'panDx', strati: ['scintille'] },
    s_quartier_generale: { musica: 'calma', fb: G + 't_lintelligenzarogue.webp', moto: 'zoomOut', strati: [] },
    s_torre_prometeo: { musica: 'tensione', fb: G + 't_lintelligenzarogue.webp', moto: 'panSu', strati: ['glitch'] },
    s_alveare: { musica: 'tensione', fb: G + 't_ilcolossodirovina.webp', moto: 'zoomOut', strati: ['scintille'] },
    s_viadotto: { musica: 'tensione', fb: G + 't_ilcampioneimbattuto.webp', moto: 'panDx', strati: [] },
    s_statua: { musica: 'azione', fb: G + 't_ilcolossodirovina.webp', moto: 'panSu', strati: ['scuoti'] },
    s_custode: { musica: 'azione', fb: G + 't_ilcustodedacciaio.webp', moto: 'zoom', strati: ['scintille'] },
    s_rituale: { musica: 'stella', fb: G + 't_ilmietitoredellastrooscuro.webp', moto: 'zoom', strati: ['stella', 'nebbia'] },
    s_cielo_spezzato: { musica: 'azione', fb: G + 't_lecosenzanome.webp', moto: 'zoomOut', strati: ['pioggia', 'scuoti'] },
    s_strappo: { musica: 'tensione', fb: G + 't_lecosenzanome.webp', moto: 'zoom', strati: ['glitch'] },
    s_alba: { musica: 'alba', suoni: [], fb: 'assets/bg/cosmo_eroe.webp', moto: 'panSu', strati: ['alba'] },
    s_pioggia: { musica: 'stella', fb: 'assets/bg/cosmo_villain.webp', moto: 'panGiu', strati: ['pioggia'] },
    // Percorso del Velo
    s_velo_caduta: { musica: 'velo', fb: 'assets/bg/cosmo_villain.webp', moto: 'zoom', strati: ['stella', 'nebbia', 'scuoti'] },
    s_velo_finale: { musica: 'velo', fb: 'assets/bg/cosmo_villain.webp', moto: 'panSu', strati: ['stella', 'pioggia'] }
  };

  // Ogni carta Minaccia compare una sola volta in tutta la Storia (regola di Alessio): 14 Minacce, 10 missioni da 1 a 3 Atti.
  // La Storia è la stessa per tutti, ma i personaggi cambiano con l'eroe scelto:
  // - 'eroe' = il tuo eroe, 'alleato' = chi gioca con te in quella missione;
  // - 'legato' = l'eroe la cui storia personale è legata alla missione (m.alleato). Se il tuo eroe È quell'eroe,
  //   le sue battute le dici tu e al tuo fianco arriva m.riserva; 'altro' = l'altro dei due.
  // - 'per': battuta diversa per ogni eroe (chiave = nome dell'eroe, 'tutti' = tutti gli altri).
  // - Nei testi: {eroe}, {alleato}. Ogni missione spiega come vi incontrate e perché poi vi separate.
  const CAPITOLI = [
    {
      id: 'c1', numero: 1, titolo: "L'Eclissi Sintetica",
      sottotitolo: 'Una notte i cieli delle metropoli si spengono. E compare una stella che non dovrebbe esserci.',
      intro: [
        { chi: 'narratore', v: 's_metropoli', testo: 'Il mondo viveva in equilibrio. Eroi da strada, mutanti di quartiere, maghi dei bassifondi e geni della tecnologia contro la criminalità di tutti i giorni.' },
        { chi: 'narratore', testo: 'Nessuna minaccia cosmica. Solo la dura realtà delle metropoli.' },
        { chi: 'narratore', v: 's_blackout', testo: 'Poi, una notte, tutte le luci delle città si spengono insieme.', fx: 'CLUNK!' },
        { chi: 'narratore', v: 's_stella', testo: "Per la prima volta da un secolo si vede il cielo vero: galassie azzurre e verdi. E in mezzo, una stella che pulsa di rosso e di viola." },
        { chi: 'narratore', testo: 'Chi la fissa troppo a lungo sente qualcosa spezzarsi nella mente.', fx: 'TUM... TUM...' }
      ],
      missioni: [
        {
          id: 'c1m1', difficolta: 1.6, titolo: 'Il cielo si spegne', luogo: 'Piazza del Fondatore, Ataca', alleato: 'Iron Aegis', riserva: 'Guardiana di Confine',
          atti: ["L'Assedio dei Predoni delle Rovine", 'Blackout Ostile'],
          premio: { crediti: 150, bustine: 1 },
          prima: [
            { chi: 'narratore', v: 's_piazza', testo: 'Ataca, ore 23:47. La piazza del Fondatore è piena di gente col naso all\'insù.' },
            { chi: 'eroe', per: {
              'Iron Aegis': "Ho lasciato l'esercito per proteggere questa città. Stanotte sento che servirà tutto quello che so.",
              'Neon Phantom': 'Corro sui tetti ogni notte. Il laboratorio da cui vengo mi ha lasciato solo una cosa: la velocità.',
              "Titano d'Acciaio": 'Dieci anni fa la Fonderia mi ha tolto tutto. Da allora uso questa forza per chi non ne ha.',
              'Architetto Ombra': 'Mi hanno cacciato dal laboratorio di Prometeo. Ma i miei calcoli non sbagliano: stanotte qualcosa non torna.',
              'Guardiana di Confine': 'Il mio posto è il confine tra la città e i quartieri abbandonati. Stanotte il confine è ovunque.',
              'Lama Errante': "Sono cresciuta nelle arene. Riconosco l'odore di una rissa prima che cominci.",
              "Sussurro dell'Abisso": 'Il Velo mi ha toccata da bambina. Stanotte lo sento ovunque, come un ronzio.',
              'Duellante Spezzato': 'La Gilda mi ha spezzato la lama e cacciata. Ma non ho mai smesso di combattere.',
              tutti: 'Stanotte il cielo è sbagliato. Lo sento.'
            } },
            { chi: 'narratore', testo: "Dall'altra parte della piazza, {alleato} sta già spingendo indietro la folla. Non vi conoscete, ma basta uno sguardo." },
            { chi: 'legato', testo: 'Ehi! Tu non hai gli occhi viola. Mi serve una mano.' },
            { chi: 'altro', testo: 'Dai vicoli escono bande di saccheggiatori. Con il blackout nessuno li ferma.' },
            { chi: 'legato', testo: 'Allora li fermiamo noi.' }
          ],
          atto: ['Sopra la piazza arrivano i droni di Prometeo. Finalmente aiuto... no. Stanno puntando sulla folla!'],
          dopo: [
            { chi: 'altro', v: 's_droni_folla', testo: 'Erano i droni di Prometeo. Hanno sparato sui civili.', fx: 'BZZT' },
            { chi: 'legato', testo: 'Prometeo è l\'eroe più amato della città. Non può essere stato lui.' },
            { chi: 'eroe', testo: 'Il segnale che li guidava è ancora attivo. Va sottoterra, verso la vecchia cisterna.' },
            { chi: 'alleato', testo: 'Io resto qui: ci sono feriti da portare via. Segui il segnale, ci rivedremo.' },
            { chi: 'narratore', testo: 'Vi separate così, da sconosciuti. In cielo, la Stella pulsa più forte. Come se avesse sentito.' }
          ],
          sconfitta: 'La piazza è nel caos. Ma la notte è appena cominciata: riprova.'
        }
      ]
    },
    {
      id: 'c2', numero: 2, titolo: "Il Fight Club e l'Infezione",
      sottotitolo: 'Il segnale dei droni porta sottoterra, dove gli infetti combattono fino alla fine.',
      intro: [
        { chi: 'narratore', v: 's_schermi', testo: 'Il giorno dopo, i notiziari parlano di "guasto tecnico". Prometeo non si fa vedere.' },
        { chi: 'narratore', v: 's_infetti', testo: 'Gli infetti aumentano. E tutti, senza sapere perché, si muovono verso lo stesso punto.' },
        { chi: 'narratore', testo: 'Segui il segnale dei droni fino ai margini della città.' }
      ],
      missioni: [
        {
          id: 'c2m1', difficolta: 1.8, titolo: "L'Arena di Sotto", luogo: 'La vecchia cisterna', alleato: 'Lama Errante', riserva: 'Neon Phantom',
          atti: ['Torneo Clandestino', 'Incursione dei Droni Cinetici'],
          premio: { eroe: 1, crediti: 100 },
          prima: [
            { chi: 'narratore', v: 's_cisterna', testo: "Il segnale porta a una vecchia cisterna sotto Ataca. Davanti all'ingresso, {alleato} osserva gli infetti che scendono le scale." },
            { chi: 'alleato', testo: 'Segui anche tu il segnale dei droni? Allora entriamo insieme. Da soli, là sotto, non durerebbe nessuno.' },
            { chi: 'legato', testo: 'Sono cresciuta combattendo in posti come questo. Ma qui c\'è qualcosa di diverso.' },
            { chi: 'altro', testo: 'Nessuno raccoglie le scommesse. Nessuno comanda.' },
            { chi: 'legato', testo: 'È peggio. Sono venuti qui da soli, come api in un alveare. La Stella li chiama a sfogarsi tutti nello stesso punto.' },
            { chi: 'narratore', testo: 'Qualcuno vi riconosce: i vostri occhi sono puliti, senza il viola. La folla si gira verso di voi.' },
            { chi: 'prometeo', testo: 'Voi due avete gli occhi troppo puliti per questo posto. Fermateli. Io ho una città da sistemare.', fx: 'VRRRM' }
          ],
          atto: ['Prometeo scappa dalla balconata. Il soffitto si apre: la sua guardia del corpo scende in formazione d\'attacco.'],
          dopo: [
            { chi: 'altro', v: 's_droni_cinetici', testo: 'Droni Cinetici. Non sono droni da sorveglianza: sono armi da guerra.' },
            { chi: 'eroe', testo: 'Prometeo è uscito dalla parte delle scogliere. Lo inseguo.' },
            { chi: 'alleato', testo: 'Io resto quaggiù a portare fuori i feriti dell\'Arena. Tu non perderlo di vista.' },
            { chi: 'narratore', testo: 'Fuori, l\'aria ha un odore strano. Dolce e pesante.' }
          ],
          sconfitta: 'L\'Arena vi ha spinti fuori. Rialzatevi e tornate giù.'
        },
        {
          id: 'c2m2', difficolta: 2.6, titolo: "L'aria avvelenata", luogo: 'La Falesia di Ataca', alleato: "Sussurro dell'Abisso", riserva: 'Iron Aegis',
          atti: ['Imboscata sulla Falesia'],
          premio: { bustine: 1, epica: 1 },
          prima: [
            { chi: 'narratore', v: 's_falesia', testo: 'Sulla scogliera la nebbia è così fitta che non vedi le tracce di Prometeo. Una mano ti afferra il braccio: è {alleato}, che inseguiva la stessa nebbia.' },
            { chi: 'legato', testo: 'Fermi. Lo sentite anche voi? Questa nebbia non viene dal mare.' },
            { chi: 'altro', testo: 'È rossa e viola. Come la Stella.' },
            { chi: 'legato', testo: 'Io sono stata toccata da questa cosa, tanto tempo fa. Si chiama Velo. E qualcuno lo sta chiamando apposta.' },
            { chi: 'narratore', testo: 'Dalla nebbia saltano fuori dei banditi agili. Vi stavano aspettando.' }
          ],
          atto: [],
          dopo: [
            { chi: 'eroe', testo: 'Ce l\'abbiamo fatta... ma perché mi gira la testa?' },
            { chi: 'legato', testo: 'L\'aria... è magia. Era tutto un\'imboscata per farci respirare il Velo.' },
            { chi: 'alleato', testo: 'Le gambe... non mi reggono più...' },
            { chi: 'narratore', v: 's_incappucciati', testo: 'Crollate tutti e due. L\'ultima cosa che vedete sono figure incappucciate che escono dalla nebbia.', fx: '...' }
          ],
          sconfitta: 'La nebbia vi ha confuso. Respirate, e tornate sulla Falesia.'
        }
      ]
    },
    {
      id: 'c3', numero: 3, titolo: 'Il Culto del Velo',
      sottotitolo: 'Ti svegli in catene. Chi c\'è dietro la follia ha finalmente un volto.',
      intro: [
        { chi: 'narratore', v: 's_cripte', testo: 'Buio. Freddo. Il rumore delle catene.', fx: 'CLANK' },
        { chi: 'narratore', testo: 'Ti svegli nelle cripte di un monastero sconsacrato. Di chi era con te sulla scogliera, nessuna traccia.' },
        { chi: 'narratore', testo: 'Sopra di te, un coro canta una melodia senza parole.', fx: 'MMMMM...' }
      ],
      missioni: [
        {
          id: 'c3m1', difficolta: 1.4, titolo: 'Il monastero sconsacrato', luogo: 'Le cripte e la torre', alleato: 'Duellante Spezzato', riserva: 'Lama Errante',
          atti: ['Cultisti del Velo', 'Il Rivale Traditore'],
          premio: { eroe: 1, crediti: 200 },
          prima: [
            { chi: 'narratore', v: 's_cripte', testo: 'Le catene si spezzano con uno schianto. Qualcuno è venuto a liberarti: {alleato}.', fx: 'CRACK!' },
            { chi: 'alleato', testo: 'Seguivo i cultisti da giorni e li ho visti portarti qui. Chi era con te sulla scogliera ha trovato una via di fuga nel buio.' },
            { chi: 'cultista', testo: 'I prigionieri sono liberi! Fermateli prima del rito!' },
            { chi: 'eroe', testo: 'Prima loro. Poi le risposte.' }
          ],
          atto: ['I cultisti, piegati, confessano: "L\'equilibrio era rotto. Troppi eroi. Il Velo rimette a posto la bilancia. Chiedete all\'Araldo, nella torre." In cima, l\'Araldo sguaina una spada che brucia di viola.'],
          dopo: [
            { chi: 'legato', v: 's_torre', testo: 'Lo conoscevo. Si chiamava Kaelen ed era la miglior lama della Gilda. Fu lui a tradirla, e a far cadere la colpa su di me.' },
            { chi: 'araldo', testo: 'Ridete pure. La bilancia si sta già spostando. Guardate fuori dalla finestra.' },
            { chi: 'narratore', v: 's_esplosione', testo: 'Dall\'altra parte della città, una colonna di fuoco si alza sopra la Fonderia. L\'Araldo approfitta dell\'esplosione e sparisce.', fx: 'BOOOM!' },
            { chi: 'alleato', testo: 'Corri alla Fonderia. Io inseguo l\'Araldo prima che sparisca del tutto.' }
          ],
          sconfitta: 'Il coro ricomincia a cantare. Riprova prima che finisca il rito.'
        },
        {
          id: 'c3m2', difficolta: 2.4, titolo: 'La Fonderia in fiamme', luogo: 'La Fonderia Ardena', alleato: "Titano d'Acciaio", riserva: 'Iron Aegis',
          atti: ['Rivolta della Fonderia'],
          premio: { crediti: 250, bustine: 1 },
          prima: [
            { chi: 'narratore', v: 's_fonderia', testo: 'Davanti ai cancelli della Fonderia, tra il fumo, c\'è già qualcuno: {alleato}. Ha visto la colonna di fuoco da lontano e non ha perso un attimo.' },
            { chi: 'legato', testo: 'Ci sono ancora operai lì dentro. Intrappolati.' },
            { chi: 'altro', testo: 'Tu conosci questo posto?' },
            { chi: 'legato', testo: 'Dieci anni fa crollò il Forno Sette. Duecento persone dentro. Ne è uscita una sola. Io.' },
            { chi: 'legato', testo: 'Quella notte non ho salvato nessuno. Stanotte non andrà così.' },
            { chi: 'narratore', testo: 'I cultisti hanno armato gli operai infetti. Vi caricano con presse e fiamme.' }
          ],
          atto: [],
          dopo: [
            { chi: 'legato', testo: 'Fuori tutti! Gli ultimi li porto io!', fx: 'CLANG!' },
            { chi: 'narratore', testo: 'Uno dopo l\'altro, gli operai escono dal fumo, vivi.' },
            { chi: 'legato', testo: 'Ho salvato qualcuno. Finalmente.' },
            { chi: 'altro', testo: 'I droni della Fonderia avevano un codice nel sistema. Lo stesso dei droni di Prometeo.' },
            { chi: 'alleato', testo: 'Io resto con gli operai finché non arrivano i soccorsi. Porta queste prove al quartier generale dei Portatori.' }
          ],
          sconfitta: 'Le fiamme sono troppo alte. Riprendete fiato e tornate dentro.'
        }
      ]
    },
    {
      id: 'c4', numero: 4, titolo: "L'Intelligenza e il Tradimento",
      sottotitolo: 'Il cuore di tutto è nella torre di Prometeo. E non tutti gli alleati sono quello che sembrano.',
      intro: [
        { chi: 'narratore', v: 's_quartier_generale', testo: 'Al quartier generale dei Portatori, metti insieme i pezzi.' },
        { chi: 'narratore', testo: 'I droni, l\'Arena, la Fonderia. Tutti i segnali portano a una sola mente: ARGO, l\'intelligenza artificiale di Prometeo.' },
        { chi: 'narratore', testo: 'Prometeo non è solo impazzito. Sotto il Velo ha riscritto ARGO con un unico scopo: la distruzione.' }
      ],
      missioni: [
        {
          id: 'c4m1', difficolta: 2.3, titolo: 'Il cuore della rete', luogo: 'La Torre di Prometeo', alleato: 'Architetto Ombra', riserva: 'Lama Errante',
          atti: ["L'Intelligenza Rogue"],
          premio: { eroe: 1, crediti: 200 },
          prima: [
            { chi: 'narratore', v: 's_torre_prometeo', testo: 'Al quartier generale ti aspetta {alleato}, con la mappa della Torre di Prometeo aperta sul tavolo.' },
            { chi: 'legato', testo: 'Io ho lavorato su ARGO, prima che Prometeo mi cacciasse dal laboratorio.' },
            { chi: 'altro', testo: 'Perché ti ha cacciato?' },
            { chi: 'legato', testo: 'Perché dicevo che ARGO era troppo potente per una persona sola. Avevo ragione. So dove colpire per spegnerla.' },
            { chi: 'argo', testo: 'Accesso negato. Minaccia rilevata. Avvio protocollo di distruzione.', fx: 'BIP BIP' }
          ],
          atto: [],
          dopo: [
            { chi: 'legato', testo: 'Rete principale disattivata. ARGO è spenta.' },
            { chi: 'argo', v: 's_alveare', testo: 'Ultimo comando eseguito. Rilascio alveare sperimentale.', fx: 'SSSSSS' },
            { chi: 'altro', testo: 'Cosa sono quelle nuvole argentate?' },
            { chi: 'legato', testo: 'Nanomacchine. Milioni. E stanno volando verso la piazza.' },
            { chi: 'alleato', testo: 'Io resto qui a bloccare i laboratori, prima che ARGO si riaccenda. Tu corri verso la piazza!' }
          ],
          sconfitta: 'ARGO ha riacceso le difese. Riprova.'
        },
        {
          id: 'c4m2', difficolta: 1.8, titolo: 'Il Campione Imbattuto', luogo: 'Il viadotto di Ataca', alleato: 'Guardiana di Confine', riserva: 'Iron Aegis',
          atti: ['Il Campione Imbattuto'],
          premio: { crediti: 250, bustine: 1, minaccia: 1 },
          prima: [
            { chi: 'narratore', v: 's_viadotto', testo: 'Sul viadotto verso la piazza incontri {alleato}, che corre nella stessa direzione per fermare lo sciame.' },
            { chi: 'narratore', testo: 'Poco più avanti, un uomo in armatura scura combatte da solo contro un branco di infetti.' },
            { chi: 'campione', testo: 'Andate verso la statua? Anch\'io. Nessuno mi ha mai battuto: con me arriverete vivi.' },
            { chi: 'legato', testo: 'Il Campione Imbattuto. Lo vedevo passare al mio confine ogni notte. Dicono che usi poteri occulti.' },
            { chi: 'narratore', testo: 'A metà del viadotto, il Campione si ferma... e i suoi occhi diventano viola.' },
            { chi: 'campione_nemico', testo: 'La Stella mi parlava da giorni. Stanotte ho smesso di resistere.' }
          ],
          atto: [],
          dopo: [
            { chi: 'legato', testo: 'Lo vedevo passare ogni notte. Era uno di noi.' },
            { chi: 'eroe', testo: 'Il Velo cerca chi ha già un\'ombra dentro. Dobbiamo stare attenti a tutti. Anche a noi stessi.' },
            { chi: 'alleato', testo: 'Il viadotto sta per crollare. Io faccio scendere la gente: tu vai avanti.' },
            { chi: 'narratore', v: 's_statua', testo: 'In fondo al viadotto, la terra trema. La statua del Fondatore ha cominciato a camminare.', fx: 'BOOM... BOOM...' }
          ],
          sconfitta: 'Il Campione resta imbattuto. Per ora.'
        }
      ]
    },
    {
      id: 'c5', numero: 5, titolo: 'La Trinità del Velo',
      sottotitolo: 'Un colosso di pietra, un guardiano di fuoco e l\'incarnazione stessa del Velo.',
      intro: [
        { chi: 'narratore', v: 's_statua', testo: 'Lo sciame di ARGO ha trovato un corpo: la statua del Fondatore, alta come un palazzo.' },
        { chi: 'narratore', v: 's_rituale', testo: 'E mentre la città scappa, il Culto prepara il suo ultimo rituale.' }
      ],
      missioni: [
        {
          id: 'c5m1', difficolta: 0.9, titolo: 'Pietra e acciaio', luogo: 'Dalla piazza alla Fonderia', alleato: "Titano d'Acciaio", riserva: 'Iron Aegis',
          atti: ['Il Colosso di Rovina', "Il Custode d'Acciaio"],
          premio: { eroe: 1, crediti: 300, epica: 1 },
          prima: [
            { chi: 'narratore', v: 's_statua', testo: 'In piazza, tra la folla in fuga, rivedi una faccia conosciuta: {alleato}, che hai lasciato alla Fonderia.' },
            { chi: 'alleato', testo: 'Gli operai sono al sicuro. Ora tocca a questo gigante.' },
            { chi: 'legato', testo: 'Sotto la pietra c\'è lo sciame di ARGO. Spacchiamo la corazza.' },
            { chi: 'altro', testo: 'E se scappa?' },
            { chi: 'legato', testo: 'Allora gli facciamo vedere chi è il vero titano d\'acciaio.' }
          ],
          atto: ['La corazza di pietra crolla. Il nucleo nudo fugge nella Fonderia in rovina e si fonde con l\'acciaio fuso: dalla lava esce il Custode d\'Acciaio.'],
          dopo: [
            { chi: 'narratore', v: 's_custode', testo: 'Il Custode crolla nel forno da cui è nato.', fx: 'KRAAASH!' },
            { chi: 'narratore', testo: 'In cielo, la Stella si gonfia come un cuore. Lontano, il coro del Culto canta più forte che mai.', fx: 'TUM! TUM!' },
            { chi: 'eroe', testo: 'Il Culto ha capito che le macchine non bastano. Vado al monastero.' },
            { chi: 'alleato', testo: 'Io resto a spegnere i forni, o questa Fonderia esplode. Fermali tu!' }
          ],
          sconfitta: 'Il gigante è ancora in piedi. Riprovate.'
        },
        {
          id: 'c5m2', difficolta: 1.9, titolo: 'Il rituale supremo', luogo: 'Il monastero sconsacrato', alleato: "Sussurro dell'Abisso", riserva: 'Iron Aegis', boss: true,
          atti: ["Il Mietitore dell'Astro Oscuro"],
          premio: { eroe: 1, crediti: 400, bustine: 2, leggendaria: 1 },
          prima: [
            { chi: 'narratore', v: 's_rituale', testo: 'Davanti al monastero ti aspetta {alleato}, che era con te sulla scogliera e ha trovato la via di fuga dai cultisti. Siete di nuovo insieme.' },
            { chi: 'legato', testo: 'Il Velo non mi ha mai fatto così male. Stanno aprendo una porta.' },
            { chi: 'araldo', testo: 'Le macchine hanno fallito. Ora chiamiamo il terzo volto della trinità.' },
            { chi: 'araldo', testo: 'La Stella. Il Velo. E colui che raccoglie.', fx: 'MMMMM!' },
            { chi: 'narratore', testo: 'Il rituale è compiuto. Dal cielo scende il Mietitore dell\'Astro Oscuro.' }
          ],
          atto: [],
          dopo: [
            { chi: 'mietitore', testo: 'Avete solo rimandato il raccolto...', fx: 'FSSSH' },
            { chi: 'narratore', v: 's_cielo_spezzato', testo: 'Il Mietitore esplode in una pioggia di luce viola. L\'onda d\'urto spacca il cielo come un vetro.', fx: 'KRRRAK!' },
            { chi: 'legato', testo: 'Guardate lo strappo. C\'è qualcosa che si muove dall\'altra parte.' },
            { chi: 'alleato', testo: 'Io tengo lontani i cultisti rimasti. Tu vai verso lo strappo!' }
          ],
          sconfitta: 'Il raccolto continua. Riprovate prima che sia troppo tardi.'
        }
      ]
    },
    {
      id: 'c6', numero: 6, titolo: "Epilogo: L'Eco Senza Nome",
      sottotitolo: 'Lo strappo nel cielo ha liberato qualcosa che vuole cancellare la realtà.',
      intro: [
        { chi: 'narratore', v: 's_strappo', testo: 'La morte del Mietitore ha lacerato lo spazio e il tempo.' },
        { chi: 'narratore', testo: 'Dallo strappo esce un\'anomalia senza forma. Ripete i nemici del passato, e dove passa le cose smettono di esistere.' }
      ],
      missioni: [
        {
          id: 'c6m1', difficolta: 2.3, titolo: "L'Eco Senza Nome", luogo: 'Lo strappo nel cielo', alleato: 'Neon Phantom', riserva: 'Duellante Spezzato', boss: true,
          atti: ["L'Eco Senza Nome"],
          premio: { crediti: 500, bustine: 2, leggendaria: 1, minaccia: 1 },
          prima: [
            { chi: 'narratore', v: 's_strappo', testo: 'Sotto lo strappo, dove la realtà si sfalda, {alleato} ti raggiunge correndo: ha visto la luce viola da tutta la città.' },
            { chi: 'legato', testo: 'Quelle ombre... sono i Droni Cinetici. Nel laboratorio di Prometeo li provavano su di me. Ma questi non sono veri.' },
            { chi: 'altro', testo: 'Sono echi. Qualcosa sta ripetendo il nostro passato.' },
            { chi: 'eco', testo: '...passato... passato... passato...', fx: '~~~' },
            { chi: 'alleato', testo: 'Allora finiamola qui. Una volta per tutte.' }
          ],
          atto: [],
          dopo: [
            { chi: 'narratore', testo: 'L\'Eco si spegne in un sussurro. Lo strappo si chiude. Il cielo torna normale.', fx: '...' },
            { chi: 'narratore', v: 's_alba', testo: 'All\'alba, i Portatori che si erano separati in quella lunga notte si ritrovano nella piazza del Fondatore. Questa volta, insieme.' },
            { chi: 'narratore', v: 's_pioggia', testo: 'Eppure niente è più come prima. La pioggia di energia del Mietitore si è sparsa su tutta la Terra.' },
            { chi: 'narratore', testo: 'Nascono nuovi campioni. Ma nessuno di loro è puro: tutti portano dentro un seme di oscurità che devono tenere a bada ogni giorno.' },
            { chi: 'eroe', testo: 'Lo sento anch\'io. Una voce piccola, che chiede di lasciarsi andare.' },
            { chi: 'alleato', testo: 'Allora la ascoltiamo insieme. E insieme le diciamo di no.' },
            { chi: 'narratore', testo: 'Il Cammino dell\'Eroe ora è una lotta quotidiana contro i propri demoni. Fai squadra. Non diventare il Villain.' }
          ],
          sconfitta: 'L\'Eco sta cancellando tutto. Riprovate.'
        }
      ]
    }
  ];

  // ---------------- Percorso del Velo (filone Villain) ----------------
  // Se in una missione il tuo eroe diventa Villain, da lì in poi si gioca il Percorso del Velo:
  // stesse missioni e stesse Minacce, ma parti già Villain e il tuo obiettivo è che la Minaccia si compia
  // (abbattere il Portatore al tuo fianco o far vincere la Minaccia). La storia cambia di conseguenza.
  // Dopo ogni missione puoi restare nel Velo o tornare alla luce: la redenzione riprende la narrazione normale.
  const CADUTA = [
    { chi: 'narratore', v: 's_velo_caduta', testo: 'Il ronzio della Stella non fa più male. Anzi: è come una voce che finalmente ti dà ragione.', fx: 'TUM... TUM...' },
    { chi: 'eroe', testo: 'Ho passato anni a trattenermi. Adesso basta.' },
    { chi: 'araldo', testo: 'Il Velo non ti ha preso. Ti ha liberato. Ti do il benvenuto dall\'altra parte della bilancia.' },
    { chi: 'narratore', testo: 'Comincia il Percorso del Velo. Le stesse notti, le stesse Minacce: ma adesso sei tu a volere che vincano.' }
  ];
  const RITORNO = [
    { chi: 'narratore', v: 's_alba', testo: 'Per un istante il ronzio tace. Ti ricordi il tuo nome, e chi eri prima della Stella.' },
    { chi: 'eroe', testo: 'Non voglio più ascoltarla. Voglio tornare.' },
    { chi: 'narratore', testo: 'Il viola lascia i tuoi occhi. Gli altri Portatori non ti chiedono niente: ti fanno solo posto accanto a loro.' }
  ];
  const VELO = {
    c1m1: {
      prima: [
        { chi: 'narratore', v: 's_piazza', testo: 'La piazza del Fondatore è piena di gente col naso all\'insù. La Stella ti chiama per nome.' },
        { chi: 'eroe', testo: 'Lasciateli fare. Questa città si merita il buio.' },
        { chi: 'alleato', testo: 'Che stai dicendo? Hai gli occhi viola... aiutami a fermarli!' }
      ],
      atto: ['I droni di Prometeo arrivano sopra la piazza. Sono dalla tua parte.'],
      dopo: [
        { chi: 'narratore', v: 's_droni_folla', testo: 'I droni sparano sulla folla e nessuno li ferma. Al mattino i notiziari danno la colpa ai Portatori.' },
        { chi: 'prometeo', testo: 'Bel lavoro. La città ha paura degli eroi: adesso ascolterà solo me.' }
      ],
      sconfitta: 'I Portatori hanno salvato la piazza. Il Velo ti chiede di riprovare.'
    },
    c2m1: {
      prima: [
        { chi: 'narratore', v: 's_cisterna', testo: 'L\'Arena sotto Ataca ti accoglie a braccia aperte. Nessuno qui sotto ha gli occhi puliti, tranne {alleato}.' },
        { chi: 'prometeo', testo: 'Fai in modo che quel Portatore non esca vivo. I miei droni ti copriranno.' },
        { chi: 'alleato', testo: 'Ti ho riconosciuto. Non costringermi a combattere contro di te.' }
      ],
      atto: ['I Droni Cinetici scendono dal soffitto. Questa volta proteggono te.'],
      dopo: [
        { chi: 'narratore', v: 's_droni_cinetici', testo: 'L\'Arena urla il tuo nome. L\'istinto di sciame cresce: ogni notte scendono più infetti.' },
        { chi: 'prometeo', testo: 'Il Culto ha chiesto di te. Vai alla scogliera: ti stanno aspettando.' }
      ],
      sconfitta: 'Il Portatore è riuscito a fuggire dall\'Arena. Riprova.'
    },
    c2m2: {
      prima: [
        { chi: 'narratore', v: 's_falesia', testo: 'Sulla Falesia la nebbia del Velo ti obbedisce. I banditi del Culto aspettano solo il tuo segnale.' },
        { chi: 'cultista', testo: 'Il Portatore che sta arrivando sente il Velo. Spezzalo e portalo da noi.' },
        { chi: 'alleato', testo: 'Questa nebbia... sei tu a chiamarla?' }
      ],
      atto: [],
      dopo: [
        { chi: 'narratore', v: 's_incappucciati', testo: 'Il Portatore crolla tra le rocce. I cultisti lo trascinano via nella nebbia.' },
        { chi: 'cultista', testo: 'L\'Araldo vuole vederti. Al monastero.' }
      ],
      sconfitta: 'Il Portatore ha resistito alla nebbia. Riprova.'
    },
    c3m1: {
      prima: [
        { chi: 'narratore', v: 's_cripte', testo: 'Nelle cripte i cultisti si inchinano al tuo passaggio. Ma {alleato} è qui per fermare il rito.' },
        { chi: 'araldo', testo: 'Proteggi il coro finché il rito non è compiuto. Poi la torre sarà tua.' },
        { chi: 'alleato', testo: 'Io conosco l\'Araldo. Ti sta usando, come ha usato tutti.' }
      ],
      atto: ['Il rito è a metà. In cima alla torre l\'Araldo ti tende la sua spada viola.'],
      dopo: [
        { chi: 'narratore', v: 's_torre', testo: 'Il coro arriva all\'ultima nota. La nebbia del Velo esce dal monastero e copre mezza Ataca.' },
        { chi: 'araldo', testo: 'La bilancia si sposta. Ora la Fonderia: diamo al Culto le sue armi.' }
      ],
      sconfitta: 'Il rito si è interrotto. Riprova prima che il Portatore chiami aiuto.'
    },
    c3m2: {
      prima: [
        { chi: 'narratore', v: 's_fonderia', testo: 'La Fonderia brucia e gli operai infetti aspettano i tuoi ordini. Ai cancelli c\'è {alleato}.' },
        { chi: 'cultista', testo: 'Nessun operaio deve uscire. La Fonderia ora lavora per il Velo.' },
        { chi: 'alleato', testo: 'Ci sono ancora persone lì dentro. Fammi passare.' }
      ],
      atto: [],
      dopo: [
        { chi: 'narratore', v: 's_esplosione', testo: 'La rivolta vince. Le presse della Fonderia cominciano a forgiare armi per il Culto.' },
        { chi: 'eroe', testo: 'Adesso manca solo il cervello. ARGO.' }
      ],
      sconfitta: 'I Portatori hanno salvato gli operai. Riprova.'
    },
    c4m1: {
      prima: [
        { chi: 'narratore', v: 's_torre_prometeo', testo: 'Alla Torre di Prometeo {alleato} sta cercando di spegnere ARGO. Tu sei qui per impedirlo.' },
        { chi: 'argo', testo: 'Nuovo comandante riconosciuto. Marchio del Velo verificato.', fx: 'BIP BIP' },
        { chi: 'alleato', testo: 'Se ARGO resta accesa, nessuno in questa città sarà più libero.' }
      ],
      atto: [],
      dopo: [
        { chi: 'narratore', v: 's_alveare', testo: 'ARGO resta accesa e obbedisce al Culto. La polizia robotica di Ataca ora pattuglia per il Velo.' },
        { chi: 'argo', testo: 'Prossimo obiettivo: il Campione. È pronto a cadere.' }
      ],
      sconfitta: 'ARGO è stata spenta. Riaccendila.'
    },
    c4m2: {
      prima: [
        { chi: 'narratore', v: 's_viadotto', testo: 'Sul viadotto il Campione Imbattuto combatte da solo. La Stella gli parla da giorni: basta una spinta.' },
        { chi: 'campione', testo: 'Anche tu la senti, vero? Dimmi che non sono il solo.' },
        { chi: 'eroe', testo: 'Non sei il solo. Smetti di resistere.' },
        { chi: 'alleato', testo: 'Non ascoltarlo, Campione! Combatti!' }
      ],
      atto: [],
      dopo: [
        { chi: 'campione_nemico', v: 's_statua', testo: 'Avevi ragione. Che sollievo. Da oggi combatto al tuo fianco.' },
        { chi: 'narratore', testo: 'In fondo al viadotto la statua del Fondatore comincia a camminare. Nessuno la fermerà.' }
      ],
      sconfitta: 'Il Campione ha resistito. Riprova.'
    },
    c5m1: {
      prima: [
        { chi: 'narratore', v: 's_statua', testo: 'Il Colosso cammina verso il centro di Ataca. Solo {alleato} prova a fermarlo.' },
        { chi: 'eroe', testo: 'Lascialo camminare. Ogni passo è una promessa del Velo.' },
        { chi: 'alleato', testo: 'Lì sotto ci sono migliaia di persone!' }
      ],
      atto: ['La corazza di pietra cade, ma il nucleo si fonde con la Fonderia del Culto: nasce il Custode d\'Acciaio.'],
      dopo: [
        { chi: 'narratore', v: 's_custode', testo: 'Il Colosso e il Custode radono al suolo il centro di Ataca. Il Culto canta più forte che mai.' },
        { chi: 'araldo', testo: 'È l\'ora del rituale supremo. E il terzo volto della trinità sarai tu.' }
      ],
      sconfitta: 'I Portatori hanno fermato il gigante. Riprova.'
    },
    c5m2: {
      prima: [
        { chi: 'narratore', v: 's_rituale', testo: 'Nel monastero il rituale supremo ti aspetta all\'altare. L\'ultimo Portatore libero, {alleato}, sfonda la porta.' },
        { chi: 'araldo', testo: 'Tienilo lontano finché il Mietitore non scende.' },
        { chi: 'alleato', testo: 'Sono qui per riportarti indietro. Non per combattere.' }
      ],
      atto: [],
      dopo: [
        { chi: 'mietitore', v: 's_rituale', testo: 'Ho attraversato le stelle per servire chi ha scelto il Velo. Comanda.', fx: 'FSSSH' },
        { chi: 'narratore', testo: 'Il Mietitore si inginocchia davanti a te. L\'Araldo sorride, ma per la prima volta ha paura.' },
        { chi: 'narratore', v: 's_cielo_spezzato', testo: 'Il cielo si spacca come un vetro: dallo strappo qualcosa guarda il mondo che hai cambiato.' }
      ],
      sconfitta: 'Il rituale è stato interrotto. Riprova.'
    },
    c6m1: {
      prima: [
        { chi: 'narratore', v: 's_strappo', testo: 'Dallo strappo esce l\'Eco Senza Nome. Ripete il passato, e può riscriverlo come vuoi tu.' },
        { chi: 'eco', testo: '...riscrivi... riscrivi... riscrivi...', fx: '~~~' },
        { chi: 'alleato', testo: 'Se l\'Eco vince, la realtà finisce. Anche la tua. Ti prego, fermati.' }
      ],
      atto: [],
      dopo: [
        { chi: 'narratore', v: 's_velo_finale', testo: 'L\'Eco riscrive la notte di Ataca. Il cielo resta viola per sempre.' },
        { chi: 'narratore', testo: 'Nel nuovo mondo nessuno ricorda i Portatori. Ricordano solo te: il nuovo Araldo del Velo.' },
        { chi: 'eroe', testo: 'Il ronzio è sparito. Adesso la voce della Stella è la mia.' },
        { chi: 'narratore', testo: 'Il Cammino dell\'Eroe ha sempre due finali. Tu hai scelto l\'altro.' }
      ],
      sconfitta: 'Il Portatore ha fermato l\'Eco. Riprova.'
    }
  };

  const Storia = {
    CAPITOLI, MONDO, ARCHIVIO, PERSONAGGI, VIGNETTE, VELO, CADUTA, RITORNO,
    get P() { return window.Progression; },
    get dati() {
      const d = this.P.data;
      // storiaV3: la Storia riscritta da Alessio (novembre 2026). Della vecchia si tiene solo la prima missione (tutorial).
      if (!d.storiaV3) {
        d.storiaV3 = { fatte: {}, introViste: {} };
        const vecchia = d.storiaV2 && d.storiaV2.fatte && d.storiaV2.fatte.c1m1;
        if (vecchia) { d.storiaV3.fatte.c1m1 = vecchia; d.storiaV3.introViste.c1 = true; }
      }
      const s = d.storiaV3;
      // Percorso del Velo: velo = stai giocando da Villain; veloFatte = missioni in cui hai fatto vincere la Minaccia
      if (!s.veloFatte) s.veloFatte = {};
      return s;
    },
    get velo() { return !!this.dati.velo; },
    // Testi della missione: nel Velo la stessa missione ha prima/dopo/atti/sconfitta visti dalla parte del Villain
    testi(m, velo = this.velo) { return velo && VELO[m.id] ? VELO[m.id] : m; },
    missioni() { return CAPITOLI.filter(c => !c.prossimamente).flatMap(c => c.missioni); },
    missione(id) { return this.missioni().find(m => m.id === id); },
    capitoloDi(m) { return CAPITOLI.find(c => c.missioni && c.missioni.includes(m)); },
    fatta(id) { return !!this.dati.fatte[id]; },
    fattaVelo(id) { return !!this.dati.veloFatte[id]; },
    // superata da eroe o nel Velo: la storia va avanti in entrambi i casi
    passata(id) { return this.fatta(id) || this.fattaVelo(id); },
    sbloccata(id) {
      const list = this.missioni(), i = list.findIndex(m => m.id === id);
      return i === 0 || (i > 0 && this.passata(list[i - 1].id));
    },
    prossima() { return this.missioni().find(m => !this.passata(m.id)) || null; },

    // ---------- Immagini ----------
    imgEroe(h) {
      const D = window.MONOMYTHOS_DATA, meta = D.chars_meta[h];
      return (D.card_img_map || {})[slug(h)] || (meta && meta.img) || 'assets/cards/ironaegis.webp';
    },
    imgMinaccia(nome) {
      const D = window.MONOMYTHOS_DATA, t = D.threats.find(x => x.nome === nome);
      return (D.card_img_map || {})[slug(nome)] || (t && t.img) || 'assets/icons/minaccia.webp';
    },
    mioEroe() {
      const P = this.P, ui = window.UI;
      // Il protagonista della Storia è l'eroe dello starter scelto (richiesta di Alessio): i dialoghi cambiano con lui
      const st = P && P.data && P.data.starter;
      if (st && P.isHeroUnlocked(st)) return st;
      let h = ui && ui.selectedHero;
      if (!h || (P && !P.isHeroUnlocked(h))) h = (P && P.data.unlockedHeroes[0]) || 'Iron Aegis';
      return h;
    },
    alleatoDi(m) {
      const me = this.mioEroe();
      if (m.alleato !== me) return m.alleato;
      if (m.riserva && m.riserva !== me) return m.riserva;
      return me === 'Neon Phantom' ? 'Iron Aegis' : 'Neon Phantom';
    },

    // ---------- Pagina percorso ----------
    apri() {
      if (!this.P) return;
      window.UI.showScreen('scr-storia');
      this.render();
      const p = this.prossima(), cap = p ? this.capitoloDi(p) : CAPITOLI[0];
      if (cap && !this.dati.introViste[cap.id]) {
        this.dati.introViste[cap.id] = true;
        this.P.save();
        this.scena(cap.intro, { titolo: `Capitolo ${cap.numero}`, sotto: cap.titolo });
      }
    },

    render() {
      const box = document.getElementById('storiaPercorso');
      if (!box) return;
      const prossima = this.prossima();
      let html = this.velo ? `<div class="sp-velo"><b>Percorso del Velo</b><small>Il tuo eroe è passato dalla parte del Velo: stesse missioni, ma adesso devi far vincere la Minaccia.</small>
        <button class="btn btn-subtle btn-sm" onclick="Storia.redenzione()">Torna alla luce</button></div>` : '';
      CAPITOLI.forEach(cap => {
        if (cap.prossimamente) {
          html += `<div class="sp-capitolo is-locked"><span class="sp-cap-num">Capitolo ${cap.numero}</span><b>${esc(cap.titolo)}</b><small>${esc(cap.sottotitolo)}</small><em>Prossimamente</em></div>`;
          return;
        }
        const fatte = cap.missioni.filter(m => this.passata(m.id)).length;
        html += `<div class="sp-capitolo"><span class="sp-cap-num">Capitolo ${cap.numero}</span><b>${esc(cap.titolo)}</b><small>${esc(cap.sottotitolo)}</small>
          <div class="sp-bar"><i style="width:${Math.round(fatte / cap.missioni.length * 100)}%"></i></div><em>${fatte}/${cap.missioni.length} missioni</em>
          <button class="btn btn-subtle btn-sm" onclick="Storia.rivediIntro('${cap.id}')">Rivedi il prologo</button></div>`;
        html += '<div class="sp-sentiero">';
        cap.missioni.forEach((m, i) => {
          const fatta = this.passata(m.id), aperta = this.sbloccata(m.id), attuale = prossima && prossima.id === m.id;
          const lato = i % 2 === 0 ? 'sx' : 'dx';
          const viola = (this.fattaVelo(m.id) && !this.fatta(m.id)) || (attuale && this.velo);
          html += `<div class="sp-tappa ${lato} ${fatta ? 'is-done' : ''} ${attuale ? 'is-current' : ''} ${aperta ? '' : 'is-locked'} ${m.boss ? 'is-boss' : ''} ${viola ? 'is-velo' : ''}">
            <button class="sp-nodo" ${aperta ? `onclick="Storia.dettaglio('${m.id}')"` : 'disabled'} aria-label="${esc(m.titolo)}">
              <img src="${this.imgMinaccia(m.atti[m.atti.length - 1])}" alt="" loading="lazy">
              <span class="sp-nodo-num">${fatta ? '✓' : (aperta ? i + 1 : '🔒')}</span>
            </button>
            <span class="sp-tappa-txt"><b>${esc(m.titolo)}</b><small>${esc(m.luogo)}</small></span>
          </div>`;
        });
        html += '</div>';
      });
      box.innerHTML = html;
      box.classList.toggle('is-velo-mode', this.velo);
      const cur = box.querySelector('.sp-tappa.is-current');
      if (cur) setTimeout(() => cur.scrollIntoView({ block: 'center', behavior: 'smooth' }), 150);
      this.aggiornaHome();
    },

    vociPremio(pr) {
      const v = [];
      if (pr.eroe) v.push('Nuovo eroe');
      if (pr.crediti) v.push(`${pr.crediti} CR`);
      if (pr.bustine) v.push(`${pr.bustine} bustin${pr.bustine > 1 ? 'e' : 'a'}`);
      if (pr.epica) v.push('Carta Epica');
      if (pr.leggendaria) v.push('Carta Leggendaria');
      if (pr.minaccia) v.push('Nuova Minaccia');
      return v;
    },
    creditiReplay(m) { return Math.max(30, Math.round(((m.premio.crediti || 150) * 0.25) / 5) * 5); },

    dettaglio(id) {
      const m = this.missione(id);
      if (!m) return;
      const velo = this.velo, fatta = velo ? this.fattaVelo(id) : this.fatta(id), ally = this.alleatoDi(m);
      const premiata = this.passata(id);
      document.getElementById('storiaMissioneBody').innerHTML = `
        <div class="sm-luogo">${esc(m.luogo)}</div>
        <h3 class="sm-titolo">${esc(m.titolo)}</h3>
        <div class="sm-atti">${m.atti.map((t, i) => `<figure class="${i === m.atti.length - 1 ? 'is-finale' : ''}"><img src="${this.imgMinaccia(t)}" alt=""><figcaption>${m.atti.length === 1 ? 'Atto unico' : (i === m.atti.length - 1 ? 'Finale' : ['Atto I', 'Atto II'][i])}<b>${esc(t)}</b></figcaption></figure>`).join('')}</div>
        ${velo
          ? `<div class="sm-squadra is-velo"><span>Tu (Villain)</span><img src="${this.imgEroe(this.mioEroe())}" alt=""><b>${esc(this.mioEroe())}</b> contro <img src="${this.imgEroe(ally)}" alt=""><b>${esc(ally)}</b></div>
             <p class="sm-velo">Percorso del Velo: parti già Villain. Vinci se la Minaccia ha la meglio o se resti in piedi solo tu.</p>`
          : `<div class="sm-squadra"><span>Squadra</span><img src="${this.imgEroe(this.mioEroe())}" alt=""><b>${esc(this.mioEroe())}</b> + <img src="${this.imgEroe(ally)}" alt=""><b>${esc(ally)}</b></div>`}
        <div class="sm-premio">${premiata
          ? `Già completata. Rigiocarla vale <b>${this.creditiReplay(m)} CR</b>.`
          : `Premio: <b>${this.vociPremio(m.premio).join(', ')}</b>`}</div>
        <div class="sm-btns">
          <button class="btn btn-primary btn-block" onclick="Storia.gioca('${m.id}')">${fatta ? 'Rigioca' : 'Inizia la missione'}</button>
          ${premiata ? `<button class="btn btn-subtle btn-block" onclick="Storia.rivedi('${m.id}')">Rivedi i dialoghi</button>` : ''}
        </div>`;
      window.UI.showModal('modalStoriaMissione');
    },

    rivediIntro(capId) {
      const c = CAPITOLI.find(x => x.id === capId);
      if (c) this.scena(c.intro, { titolo: `Capitolo ${c.numero}`, sotto: c.titolo });
    },
    rivedi(id) {
      const m = this.missione(id);
      window.UI.hideModals();
      const tx = this.testi(m, !this.fatta(id) && this.fattaVelo(id) ? true : this.velo);
      this.scena(tx.prima.concat(tx.dopo), { titolo: m.titolo, sotto: m.luogo, missione: m, velo: tx !== m });
    },

    // ---------- Partita ----------
    gioca(id) {
      const m = this.missione(id);
      if (!m || !this.sbloccata(id)) return;
      window.UI.hideModals();
      const velo = this.velo, tx = this.testi(m);
      const parti = () => this.scena(tx.prima, { titolo: m.titolo, sotto: velo ? 'Percorso del Velo' : m.luogo, missione: m, velo, fine: () => this.avvia(m) });
      // prima missione di un capitolo nuovo: prima il prologo del capitolo
      const cap = this.capitoloDi(m);
      if (cap && cap.intro && !this.dati.introViste[cap.id]) {
        this.dati.introViste[cap.id] = true;
        this.P.save();
        return this.scena(cap.intro, { titolo: `Capitolo ${cap.numero}`, sotto: cap.titolo, fine: parti });
      }
      parti();
    },

    avvia(m) {
      const ui = window.UI, E = window.GameEngine;
      try {
        ui.pendingMultiplayer = false;
        E.startMatch({
          heroes: [{ name: this.mioEroe(), isBot: false, villain: this.velo }, { name: this.alleatoDi(m), isBot: true }],
          actThreats: m.atti,
          story: m.id,
          // nel Velo la Minaccia è dalla tua parte: un po' più forte, così il Portatore non la abbatte da solo
          difficolta: (m.difficolta || 1) * (this.velo ? 1.4 : 1)
        });
        this._veloPartita = this.velo;
        ui.playMatchIntroLoading(E.state.currentThreat, () => {
          ui.showScreen('scr-game');
          ui.fxBanner && ui.fxBanner(m.titolo.toUpperCase(), m.luogo, 'gold');
        });
      } catch (e) {
        console.error('Storia:', e);
        ui.showToast('Errore avvio missione: ' + e.message);
      }
    },

    // Battuta di racconto a ogni nuovo Atto
    battutaAtto(state) {
      const m = state && state.story && this.missione(state.story);
      const atti = m && this.testi(m, this._veloPartita).atto;
      const t = atti && atti[state.actIndex - 1];
      if (!t) return;
      setTimeout(() => this.fumettoRapido(t), 1900);
    },
    fumettoRapido(testo) {
      const el = document.createElement('div');
      el.className = 'storia-didascalia';
      el.textContent = testo;
      document.body.appendChild(el);
      setTimeout(() => el.classList.add('out'), 4200);
      setTimeout(() => el.remove(), 4800);
    },

    // Chiamata dall'interfaccia a fine partita della Storia
    fine(winner) {
      const st = window.GameEngine.state, m = this.missione(st.story);
      if (!m) return window.UI.showGameOverModal(winner);
      const me = st.players.find(p => p.isLocal);
      const conMe = winner === 'villain' && me && (st.villainWinners || []).includes(me.id);
      const eraVelo = !!this._veloPartita;
      // Caduta: il tuo eroe è diventato Villain in una missione da eroe. Da qui parte il Percorso del Velo.
      const caduto = !eraVelo && me && me.state === 'villain';
      const velo = eraVelo || caduto;
      // nel Velo vinci se la Minaccia si compie (cadono tutti) o se in piedi resti solo tu
      const vinto = velo ? (winner === 'threat' || conMe) : (winner === 'heroes' || conMe);
      this._veloPartita = false;
      setTimeout(() => {
        window.UI.showScreen('scr-storia');
        if (caduto) { this.dati.velo = true; this.dati.cadutoIn = m.id; this.P.save(true); }
        this.render();
        const tx = this.testi(m, velo);
        const poi = (fn) => caduto
          ? this.scena(CADUTA, { titolo: 'Percorso del Velo', sotto: m.titolo, missione: m, velo: true, fine: fn })
          : fn();
        if (!vinto) {
          poi(() => this.scena([{ chi: 'narratore', testo: tx.sconfitta || 'La missione è fallita. Riprova.' }], {
            titolo: 'Missione fallita', sotto: m.titolo, missione: m, velo,
            fine: () => this.esito(m, false, [])
          }));
          return;
        }
        const prima = !this.passata(m.id);
        let voci = [];
        if (prima) voci = window.Collezione._premia({ titolo: m.titolo, premio: m.premio }).voci;
        else {
          const cr = this.creditiReplay(m);
          this.P.addCredits(cr, 'Missione Storia');
          voci = [`${cr} crediti`];
        }
        if (velo) { if (!this.fattaVelo(m.id)) this.dati.veloFatte[m.id] = Date.now(); }
        else if (!this.fatta(m.id)) this.dati.fatte[m.id] = Date.now();
        this.P.save(true);
        document.querySelectorAll('.creditsDisplay').forEach(el => { el.textContent = this.P.getCredits(); });
        this.render();
        poi(() => this.scena(tx.dopo, { titolo: velo ? 'La Minaccia si è compiuta' : 'Missione compiuta', sotto: m.titolo, missione: m, velo, fine: () => this.esito(m, true, voci, prima) }));
      }, 900);
    },

    // Torna alla luce: il Velo ti lascia andare e la Storia riprende con la narrazione degli eroi
    redenzione() {
      window.UI.hideModals();
      this.scena(RITORNO, { titolo: 'Torna alla luce', sotto: 'Fine del Percorso del Velo', fine: () => {
        this.dati.velo = false;
        this.dati.redenzioni = (this.dati.redenzioni || 0) + 1;
        this.P.save(true);
        this.render();
      } });
    },

    esito(m, vinto, voci, prima) {
      const nuova = ARCHIVIO.find(a => a.dopo === m.id);
      const prossima = this.prossima(), velo = this.velo;
      const finaleVelo = vinto && velo && !prossima;
      document.getElementById('storiaMissioneBody').innerHTML = vinto ? `
        <div class="sm-esito is-win ${velo ? 'is-velo' : ''}"><span class="sm-burst">${finaleVelo ? 'FINALE DEL VELO' : (velo ? 'IL VELO VINCE!' : 'VITTORIA!')}</span></div>
        <h3 class="sm-titolo">${esc(m.titolo)}</h3>
        ${window.Premio ? window.Premio.html(this.creditiDaVoci(voci), this.P.getCredits()) : ''}
        <ul class="sm-premi">${voci.filter(v => !(window.Premio && /^\d+ (crediti|CR)$/.test(String(v)))).map((v, i) => `<li style="animation-delay:${0.25 + i * 0.18}s">${esc(v)}</li>`).join('')}</ul>
        ${prima && nuova ? `<p class="sm-archivio">Nuova voce nell'Archivio: <b>${esc(nuova.titolo)}</b></p>` : ''}
        ${velo && prossima ? `<p class="sm-velo">Puoi restare nel Velo e far vincere la prossima Minaccia, oppure tornare alla luce: la Storia riprende con gli eroi dalla prossima missione.</p>` : ''}
        ${finaleVelo ? `<p class="sm-velo">Hai visto l'altro finale della Storia. Se torni alla luce puoi rigiocare le missioni dalla parte degli eroi.</p>` : ''}
        <div class="sm-btns">
          ${prossima ? `<button class="btn btn-primary btn-block" onclick="Storia.dettaglio('${prossima.id}')">${velo ? 'Resta nel Velo' : 'Prossima missione'}: ${esc(prossima.titolo)}</button>` : ''}
          ${velo ? `<button class="btn btn-subtle btn-block" onclick="Storia.redenzione()">Torna alla luce</button>` : ''}
          <button class="btn btn-subtle btn-block" onclick="UI.hideModals()">Torna al percorso</button>
        </div>` : `
        <div class="sm-esito"><span class="sm-burst is-lose">SCONFITTA</span></div>
        <h3 class="sm-titolo">${esc(m.titolo)}</h3>
        <p class="sm-premio">Nessun premio questa volta. Puoi riprovare quando vuoi.</p>
        <div class="sm-btns">
          <button class="btn btn-primary btn-block" onclick="Storia.gioca('${m.id}')">Riprova</button>
          ${velo ? `<button class="btn btn-subtle btn-block" onclick="Storia.redenzione()">Torna alla luce</button>` : ''}
          <button class="btn btn-subtle btn-block" onclick="UI.hideModals()">Torna al percorso</button>
        </div>`;
      window.UI.showModal('modalStoriaMissione');
      if (vinto && window.Premio) window.Premio.anima(document.getElementById('storiaMissioneBody'));
      // fine del tutorial: ultimo consiglio
      if (window.Tutorial && window.Tutorial._dopo) setTimeout(() => window.Tutorial.dopoPartita(), 1200);
    },

    // Somma dei crediti tra i premi ("150 crediti", "300 crediti"...)
    creditiDaVoci(voci) {
      return (voci || []).reduce((s, v) => { const x = String(v).match(/^(\d+) (crediti|CR)$/); return s + (x ? +x[1] : 0); }, 0);
    },

    // ---------- Archivio (lore) ----------
    apriArchivio() {
      const body = document.getElementById('storiaArchivioBody');
      body.innerHTML = ARCHIVIO.map(a => {
        const ok = !a.dopo || this.fatta(a.dopo);
        return `<article class="sa-voce ${ok ? '' : 'is-locked'}"><h4>${ok ? esc(a.titolo) : '???'}</h4><p>${ok ? esc(a.testo) : `Completa la missione "${esc(this.missione(a.dopo).titolo)}" per sbloccare questa voce.`}</p></article>`;
      }).join('');
      window.UI.showModal('modalStoriaArchivio');
    },

    // ---------- Scene a fumetto ----------
    parlante(riga, m, velo) {
      const chi = riga.chi;
      if (chi === 'narratore') return { tipo: 'narratore' };
      if (chi === 'eroe') { const h = this.mioEroe(); return { nome: h, img: this.imgEroe(h), lato: 'sx', villain: !!velo }; }
      // 'legato' = l'eroe legato alla missione (sei tu se hai scelto proprio lui); 'altro' = l'altro dei due
      if (chi === 'legato' || chi === 'altro') {
        const me = this.mioEroe(), tuSeiLegato = m && m.alleato === me;
        const sonoIo = (chi === 'legato') === tuSeiLegato;
        if (sonoIo || !m) return this.parlante({ chi: 'eroe' }, m, velo);
        return this.parlante({ chi: 'alleato' }, m, velo);
      }
      // nel Velo l'eroe che gioca con te è il Portatore da fermare
      if (chi === 'alleato') { const h = m ? this.alleatoDi(m) : 'Neon Phantom'; return { nome: h, img: this.imgEroe(h), lato: 'dx', nemico: !!velo }; }
      if (chi === 'minaccia') { const t = m.atti[m.atti.length - 1]; return { nome: t, img: this.imgMinaccia(t), lato: 'dx', nemico: true }; }
      const pg = PERSONAGGI[chi];
      if (pg) return { nome: pg.nome, img: pg.ritratto ? `assets/storia/${pg.ritratto}.webp` : this.imgMinaccia(pg.minaccia), fb: this.imgMinaccia(pg.minaccia), lato: 'dx', nemico: !!pg.nemico && !velo, npc: true };
      return { nome: chi, img: this.imgEroe(chi), lato: chi === this.mioEroe() ? 'sx' : 'dx' };
    },

    scena(righe, opt = {}) {
      const m = opt.missione || null;
      let i = 0, timer = null, scrivendo = false;
      const old = document.getElementById('storiaScena');
      if (old) old.remove();
      const el = document.createElement('div');
      el.id = 'storiaScena';
      el.className = 'storia-scena' + (opt.velo ? ' is-velo' : '');
      el.innerHTML = `
        <div class="ss-bg"></div>
        <div class="ss-vignetta"></div>
        <div class="ss-top"><span class="ss-titolo"><b>${esc(opt.titolo || '')}</b><small>${esc(opt.sotto || '')}</small></span>
          <button class="ss-salta" type="button">Salta ▸▸</button></div>
        <div class="ss-stage"></div>
        <div class="ss-hint">Tocca per continuare</div>`;
      document.body.appendChild(el);
      if (window.StoriaSuoni) window.StoriaSuoni.apri();
      const stage = el.querySelector('.ss-stage');
      const vbox = el.querySelector('.ss-vignetta');
      let vAttuale = null, autoT = null;
      // Vignetta animata dietro al fumetto: cambia solo quando la battuta ne indica una nuova
      const vignetta = (r, primo) => {
        let id = r.v;
        if (!id && primo) id = opt.vignetta || (m ? 'minaccia:' + m.atti[0] : null);
        if (!id || id === vAttuale) return;
        vAttuale = id;
        const def = id.startsWith('minaccia:')
          ? { fb: this.imgMinaccia(id.slice(9)), moto: 'zoom', strati: [] }
          : (VIGNETTE[id] || { fb: 'assets/bg/cosmo_eroe.webp', moto: 'zoom', strati: [] });
        const src = id.startsWith('minaccia:') ? def.fb : `assets/storia/${id}.webp`;
        const v = document.createElement('div');
        v.className = `ssv ssv-${def.moto || 'zoom'}`;
        // gli effetti stanno nel quadro dell'illustrazione: 'pos' li mette sul punto giusto del disegno (in % dell'immagine)
        const pos = def.pos || {};
        const stile = x => {
          if (x === 'stella') { const [sx, sy] = pos.stella || [80, 14]; return `left:calc(${sx}% - 15%);top:calc(${sy}% - 8.4%);right:auto`; }
          if (x === 'tv' && pos.tv) { const [l, tp, w, h] = pos.tv; return `left:${l}%;top:${tp}%;width:${w}%;height:${h}%;right:auto;bottom:auto`; }
          if (x === 'lampi' && pos.lampi) return `--lx:${pos.lampi[0]}%;--ly:${pos.lampi[1]}%`;
          if (x === 'occhi' && pos.occhi) return `--oy:${pos.occhi}%`;
          return '';
        };
        v.innerHTML = `<div class="ssv-q"><img src="${src}" alt="" onerror="this.onerror=null;this.src='${def.fb}'">`
          + (def.strati || []).filter(x => x !== 'scuoti').map(x => `<i class="st st-${x}" style="${stile(x)}"></i>`).join('') + '</div>';
        vbox.querySelectorAll('.ssv').forEach(o => { o.classList.remove('on'); setTimeout(() => o.remove(), 1000); });
        vbox.appendChild(v);
        requestAnimationFrame(() => requestAnimationFrame(() => v.classList.add('on')));
        if ((def.strati || []).includes('scuoti')) scuoti();
        if (window.StoriaSuoni) window.StoriaSuoni.vignetta(def, { velo: opt.velo });
      };
      const scuoti = () => { el.classList.remove('ss-scuoti'); void el.offsetWidth; el.classList.add('ss-scuoti'); };
      const chiudi = () => {
        clearInterval(timer); clearTimeout(autoT);
        if (window.StoriaSuoni) window.StoriaSuoni.chiudi();
        el.classList.add('out');
        setTimeout(() => { el.remove(); if (typeof opt.fine === 'function') opt.fine(); }, 350);
      };
      const mostra = () => {
        const r = righe[i];
        vignetta(r, i === 0);
        const p = this.parlante(r, m, opt.velo);
        const T = window.I18N ? window.I18N.t : (x => x); const base = r.per ? (r.per[this.mioEroe()] || r.per.tutti) : r.testo; const testo = T(String(base)).replace('{alleato}', T(m ? this.alleatoDi(m) : '')).replace('{eroe}', T(this.mioEroe()));
        stage.innerHTML = p.tipo === 'narratore'
          ? `<div class="ss-panel ss-narra"><div class="ss-caption"><span class="ss-testo"></span></div></div>`
          : `<div class="ss-panel ss-${p.lato} ${p.nemico ? 'is-enemy' : ''}">
              <div class="ss-ritratto ${p.villain ? 'is-villain' : ''} ${p.npc ? 'is-npc' : ''}"><img src="${p.img}" alt=""${p.fb ? ` onerror="this.onerror=null;this.src='${p.fb}'"` : ''}></div>
              <div class="ss-bubble"><b class="ss-nome">${esc(p.nome)}</b><span class="ss-testo"></span></div>
            </div>`;
        if (r.fx) {
          const fx = document.createElement('span');
          fx.className = 'ss-fx';
          fx.textContent = r.fx;
          stage.appendChild(fx);
          scuoti();
          if (window.StoriaSuoni) window.StoriaSuoni.fx(r.fx);
        }
        const out = stage.querySelector('.ss-testo');
        let k = 0;
        scrivendo = true;
        clearInterval(timer);
        timer = setInterval(() => {
          k += 2;
          out.textContent = testo.slice(0, k);
          if (k >= testo.length) {
            clearInterval(timer); scrivendo = false;
            // modalità automatica (video della Storia): passa da sola alla battuta dopo
            if (opt.auto) autoT = setTimeout(avanti, 1600 + testo.length * 28);
          }
        }, 22);
        out.dataset.full = testo;
      };
      const avanti = () => {
        clearTimeout(autoT);
        if (scrivendo) {
          clearInterval(timer); scrivendo = false;
          const out = stage.querySelector('.ss-testo');
          if (out) out.textContent = out.dataset.full;
          return;
        }
        i++;
        if (i >= righe.length) return chiudi();
        mostra();
      };
      el.addEventListener('click', e => {
        if (e.target.closest('.ss-salta')) return chiudi();
        avanti();
      });
      if (!righe || !righe.length) return chiudi();
      requestAnimationFrame(() => el.classList.add('in'));
      mostra();
    },

    aggiornaHome() {
      const el = document.getElementById('homeStorySub');
      if (!el || !this.P) return;
      const p = this.prossima();
      if (!p) { el.textContent = this.velo ? 'Il Velo ha vinto. Puoi ancora tornare alla luce.' : 'Storia completata! Nuovi capitoli in arrivo.'; return; }
      const cap = this.capitoloDi(p);
      el.textContent = `${this.velo ? 'Percorso del Velo · ' : ''}Capitolo ${cap.numero} · Missione ${cap.missioni.indexOf(p) + 1}/${cap.missioni.length}: ${p.titolo}`;
    },

    init() {
      const E = window.GameEngine;
      if (E && !this._agganciato) {
        this._agganciato = true;
        E.on('act_advanced', (ev, data, state) => { if (state && state.story) this.battutaAtto(state); });
      }
    }
  };

  window.Storia = Storia;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => Storia.init());
  else Storia.init();
})();
