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
  const PERSONAGGI = {
    prometeo: { nome: 'Prometeo', minaccia: 'Incursione dei Droni Cinetici', nemico: true },
    argo: { nome: 'ARGO', minaccia: "L'Intelligenza Rogue", nemico: true },
    cultista: { nome: 'Cultista', minaccia: 'Cultisti del Velo', nemico: true },
    araldo: { nome: "L'Araldo", minaccia: 'Il Rivale Traditore', nemico: true },
    campione: { nome: 'Il Campione', minaccia: 'Il Campione Imbattuto' },
    campione_nemico: { nome: 'Il Campione', minaccia: 'Il Campione Imbattuto', nemico: true },
    mietitore: { nome: 'Il Mietitore', minaccia: "Il Mietitore dell'Astro Oscuro", nemico: true },
    eco: { nome: "L'Eco", minaccia: "L'Eco Senza Nome", nemico: true }
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
        { chi: 'narratore', testo: 'Il mondo viveva in equilibrio. Eroi da strada, mutanti di quartiere, maghi dei bassifondi e geni della tecnologia contro la criminalità di tutti i giorni.' },
        { chi: 'narratore', testo: 'Nessuna minaccia cosmica. Solo la dura realtà delle metropoli.' },
        { chi: 'narratore', testo: 'Poi, una notte, tutte le luci delle città si spengono insieme.', fx: 'CLUNK!' },
        { chi: 'narratore', testo: "Per la prima volta da un secolo si vede il cielo vero: galassie azzurre e verdi. E in mezzo, una stella che pulsa di rosso e di viola." },
        { chi: 'narratore', testo: 'Chi la fissa troppo a lungo sente qualcosa spezzarsi nella mente.', fx: 'TUM... TUM...' }
      ],
      missioni: [
        {
          id: 'c1m1', difficolta: 1.6, titolo: 'Il cielo si spegne', luogo: 'Piazza del Fondatore, Ataca', alleato: 'Iron Aegis', riserva: 'Guardiana di Confine',
          atti: ["L'Assedio dei Predoni delle Rovine", 'Blackout Ostile'],
          premio: { crediti: 150, bustine: 1 },
          prima: [
            { chi: 'narratore', testo: 'Ataca, ore 23:47. La piazza del Fondatore è piena di gente col naso all\'insù.' },
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
            { chi: 'altro', testo: 'Erano i droni di Prometeo. Hanno sparato sui civili.', fx: 'BZZT' },
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
        { chi: 'narratore', testo: 'Il giorno dopo, i notiziari parlano di "guasto tecnico". Prometeo non si fa vedere.' },
        { chi: 'narratore', testo: 'Gli infetti aumentano. E tutti, senza sapere perché, si muovono verso lo stesso punto.' },
        { chi: 'narratore', testo: 'Segui il segnale dei droni fino ai margini della città.' }
      ],
      missioni: [
        {
          id: 'c2m1', difficolta: 1.8, titolo: "L'Arena di Sotto", luogo: 'La vecchia cisterna', alleato: 'Lama Errante', riserva: 'Neon Phantom',
          atti: ['Torneo Clandestino', 'Incursione dei Droni Cinetici'],
          premio: { eroe: 1, crediti: 100 },
          prima: [
            { chi: 'narratore', testo: "Il segnale porta a una vecchia cisterna sotto Ataca. Davanti all'ingresso, {alleato} osserva gli infetti che scendono le scale." },
            { chi: 'alleato', testo: 'Segui anche tu il segnale dei droni? Allora entriamo insieme. Da soli, là sotto, non durerebbe nessuno.' },
            { chi: 'legato', testo: 'Sono cresciuta combattendo in posti come questo. Ma qui c\'è qualcosa di diverso.' },
            { chi: 'altro', testo: 'Nessuno raccoglie le scommesse. Nessuno comanda.' },
            { chi: 'legato', testo: 'È peggio. Sono venuti qui da soli, come api in un alveare. La Stella li chiama a sfogarsi tutti nello stesso punto.' },
            { chi: 'narratore', testo: 'Qualcuno vi riconosce: i vostri occhi sono puliti, senza il viola. La folla si gira verso di voi.' },
            { chi: 'prometeo', testo: 'Voi due avete gli occhi troppo puliti per questo posto. Fermateli. Io ho una città da sistemare.', fx: 'VRRRM' }
          ],
          atto: ['Prometeo scappa dalla balconata. Il soffitto si apre: la sua guardia del corpo scende in formazione d\'attacco.'],
          dopo: [
            { chi: 'altro', testo: 'Droni Cinetici. Non sono droni da sorveglianza: sono armi da guerra.' },
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
            { chi: 'narratore', testo: 'Sulla scogliera la nebbia è così fitta che non vedi le tracce di Prometeo. Una mano ti afferra il braccio: è {alleato}, che inseguiva la stessa nebbia.' },
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
            { chi: 'narratore', testo: 'Crollate tutti e due. L\'ultima cosa che vedete sono figure incappucciate che escono dalla nebbia.', fx: '...' }
          ],
          sconfitta: 'La nebbia vi ha confuso. Respirate, e tornate sulla Falesia.'
        }
      ]
    },
    {
      id: 'c3', numero: 3, titolo: 'Il Culto del Velo',
      sottotitolo: 'Ti svegli in catene. Chi c\'è dietro la follia ha finalmente un volto.',
      intro: [
        { chi: 'narratore', testo: 'Buio. Freddo. Il rumore delle catene.', fx: 'CLANK' },
        { chi: 'narratore', testo: 'Ti svegli nelle cripte di un monastero sconsacrato. Di chi era con te sulla scogliera, nessuna traccia.' },
        { chi: 'narratore', testo: 'Sopra di te, un coro canta una melodia senza parole.', fx: 'MMMMM...' }
      ],
      missioni: [
        {
          id: 'c3m1', difficolta: 1.4, titolo: 'Il monastero sconsacrato', luogo: 'Le cripte e la torre', alleato: 'Duellante Spezzato', riserva: 'Lama Errante',
          atti: ['Cultisti del Velo', 'Il Rivale Traditore'],
          premio: { eroe: 1, crediti: 200 },
          prima: [
            { chi: 'narratore', testo: 'Le catene si spezzano con uno schianto. Qualcuno è venuto a liberarti: {alleato}.', fx: 'CRACK!' },
            { chi: 'alleato', testo: 'Seguivo i cultisti da giorni e li ho visti portarti qui. Chi era con te sulla scogliera ha trovato una via di fuga nel buio.' },
            { chi: 'cultista', testo: 'I prigionieri sono liberi! Fermateli prima del rito!' },
            { chi: 'eroe', testo: 'Prima loro. Poi le risposte.' }
          ],
          atto: ['I cultisti, piegati, confessano: "L\'equilibrio era rotto. Troppi eroi. Il Velo rimette a posto la bilancia. Chiedete all\'Araldo, nella torre." In cima, l\'Araldo sguaina una spada che brucia di viola.'],
          dopo: [
            { chi: 'legato', testo: 'Lo conoscevo. Si chiamava Kaelen ed era la miglior lama della Gilda. Fu lui a tradirla, e a far cadere la colpa su di me.' },
            { chi: 'araldo', testo: 'Ridete pure. La bilancia si sta già spostando. Guardate fuori dalla finestra.' },
            { chi: 'narratore', testo: 'Dall\'altra parte della città, una colonna di fuoco si alza sopra la Fonderia. L\'Araldo approfitta dell\'esplosione e sparisce.', fx: 'BOOOM!' },
            { chi: 'alleato', testo: 'Corri alla Fonderia. Io inseguo l\'Araldo prima che sparisca del tutto.' }
          ],
          sconfitta: 'Il coro ricomincia a cantare. Riprova prima che finisca il rito.'
        },
        {
          id: 'c3m2', difficolta: 2.4, titolo: 'La Fonderia in fiamme', luogo: 'La Fonderia Ardena', alleato: "Titano d'Acciaio", riserva: 'Iron Aegis',
          atti: ['Rivolta della Fonderia'],
          premio: { crediti: 250, bustine: 1 },
          prima: [
            { chi: 'narratore', testo: 'Davanti ai cancelli della Fonderia, tra il fumo, c\'è già qualcuno: {alleato}. Ha visto la colonna di fuoco da lontano e non ha perso un attimo.' },
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
        { chi: 'narratore', testo: 'Al quartier generale dei Portatori, metti insieme i pezzi.' },
        { chi: 'narratore', testo: 'I droni, l\'Arena, la Fonderia. Tutti i segnali portano a una sola mente: ARGO, l\'intelligenza artificiale di Prometeo.' },
        { chi: 'narratore', testo: 'Prometeo non è solo impazzito. Sotto il Velo ha riscritto ARGO con un unico scopo: la distruzione.' }
      ],
      missioni: [
        {
          id: 'c4m1', difficolta: 2.3, titolo: 'Il cuore della rete', luogo: 'La Torre di Prometeo', alleato: 'Architetto Ombra', riserva: 'Lama Errante',
          atti: ["L'Intelligenza Rogue"],
          premio: { eroe: 1, crediti: 200 },
          prima: [
            { chi: 'narratore', testo: 'Al quartier generale ti aspetta {alleato}, con la mappa della Torre di Prometeo aperta sul tavolo.' },
            { chi: 'legato', testo: 'Io ho lavorato su ARGO, prima che Prometeo mi cacciasse dal laboratorio.' },
            { chi: 'altro', testo: 'Perché ti ha cacciato?' },
            { chi: 'legato', testo: 'Perché dicevo che ARGO era troppo potente per una persona sola. Avevo ragione. So dove colpire per spegnerla.' },
            { chi: 'argo', testo: 'Accesso negato. Minaccia rilevata. Avvio protocollo di distruzione.', fx: 'BIP BIP' }
          ],
          atto: [],
          dopo: [
            { chi: 'legato', testo: 'Rete principale disattivata. ARGO è spenta.' },
            { chi: 'argo', testo: 'Ultimo comando eseguito. Rilascio alveare sperimentale.', fx: 'SSSSSS' },
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
            { chi: 'narratore', testo: 'Sul viadotto verso la piazza incontri {alleato}, che corre nella stessa direzione per fermare lo sciame.' },
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
            { chi: 'narratore', testo: 'In fondo al viadotto, la terra trema. La statua del Fondatore ha cominciato a camminare.', fx: 'BOOM... BOOM...' }
          ],
          sconfitta: 'Il Campione resta imbattuto. Per ora.'
        }
      ]
    },
    {
      id: 'c5', numero: 5, titolo: 'La Trinità del Velo',
      sottotitolo: 'Un colosso di pietra, un guardiano di fuoco e l\'incarnazione stessa del Velo.',
      intro: [
        { chi: 'narratore', testo: 'Lo sciame di ARGO ha trovato un corpo: la statua del Fondatore, alta come un palazzo.' },
        { chi: 'narratore', testo: 'E mentre la città scappa, il Culto prepara il suo ultimo rituale.' }
      ],
      missioni: [
        {
          id: 'c5m1', difficolta: 0.9, titolo: 'Pietra e acciaio', luogo: 'Dalla piazza alla Fonderia', alleato: "Titano d'Acciaio", riserva: 'Iron Aegis',
          atti: ['Il Colosso di Rovina', "Il Custode d'Acciaio"],
          premio: { eroe: 1, crediti: 300, epica: 1 },
          prima: [
            { chi: 'narratore', testo: 'In piazza, tra la folla in fuga, rivedi una faccia conosciuta: {alleato}, che hai lasciato alla Fonderia.' },
            { chi: 'alleato', testo: 'Gli operai sono al sicuro. Ora tocca a questo gigante.' },
            { chi: 'legato', testo: 'Sotto la pietra c\'è lo sciame di ARGO. Spacchiamo la corazza.' },
            { chi: 'altro', testo: 'E se scappa?' },
            { chi: 'legato', testo: 'Allora gli facciamo vedere chi è il vero titano d\'acciaio.' }
          ],
          atto: ['La corazza di pietra crolla. Il nucleo nudo fugge nella Fonderia in rovina e si fonde con l\'acciaio fuso: dalla lava esce il Custode d\'Acciaio.'],
          dopo: [
            { chi: 'narratore', testo: 'Il Custode crolla nel forno da cui è nato.', fx: 'KRAAASH!' },
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
            { chi: 'narratore', testo: 'Davanti al monastero ti aspetta {alleato}, che era con te sulla scogliera e ha trovato la via di fuga dai cultisti. Siete di nuovo insieme.' },
            { chi: 'legato', testo: 'Il Velo non mi ha mai fatto così male. Stanno aprendo una porta.' },
            { chi: 'araldo', testo: 'Le macchine hanno fallito. Ora chiamiamo il terzo volto della trinità.' },
            { chi: 'araldo', testo: 'La Stella. Il Velo. E colui che raccoglie.', fx: 'MMMMM!' },
            { chi: 'narratore', testo: 'Il rituale è compiuto. Dal cielo scende il Mietitore dell\'Astro Oscuro.' }
          ],
          atto: [],
          dopo: [
            { chi: 'mietitore', testo: 'Avete solo rimandato il raccolto...', fx: 'FSSSH' },
            { chi: 'narratore', testo: 'Il Mietitore esplode in una pioggia di luce viola. L\'onda d\'urto spacca il cielo come un vetro.', fx: 'KRRRAK!' },
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
        { chi: 'narratore', testo: 'La morte del Mietitore ha lacerato lo spazio e il tempo.' },
        { chi: 'narratore', testo: 'Dallo strappo esce un\'anomalia senza forma. Ripete i nemici del passato, e dove passa le cose smettono di esistere.' }
      ],
      missioni: [
        {
          id: 'c6m1', difficolta: 2.3, titolo: "L'Eco Senza Nome", luogo: 'Lo strappo nel cielo', alleato: 'Neon Phantom', riserva: 'Duellante Spezzato', boss: true,
          atti: ["L'Eco Senza Nome"],
          premio: { crediti: 500, bustine: 2, leggendaria: 1, minaccia: 1 },
          prima: [
            { chi: 'narratore', testo: 'Sotto lo strappo, dove la realtà si sfalda, {alleato} ti raggiunge correndo: ha visto la luce viola da tutta la città.' },
            { chi: 'legato', testo: 'Quelle ombre... sono i Droni Cinetici. Nel laboratorio di Prometeo li provavano su di me. Ma questi non sono veri.' },
            { chi: 'altro', testo: 'Sono echi. Qualcosa sta ripetendo il nostro passato.' },
            { chi: 'eco', testo: '...passato... passato... passato...', fx: '~~~' },
            { chi: 'alleato', testo: 'Allora finiamola qui. Una volta per tutte.' }
          ],
          atto: [],
          dopo: [
            { chi: 'narratore', testo: 'L\'Eco si spegne in un sussurro. Lo strappo si chiude. Il cielo torna normale.', fx: '...' },
            { chi: 'narratore', testo: 'All\'alba, i Portatori che si erano separati in quella lunga notte si ritrovano nella piazza del Fondatore. Questa volta, insieme.' },
            { chi: 'narratore', testo: 'Eppure niente è più come prima. La pioggia di energia del Mietitore si è sparsa su tutta la Terra.' },
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

  const Storia = {
    CAPITOLI, MONDO, ARCHIVIO, PERSONAGGI,
    get P() { return window.Progression; },
    get dati() {
      const d = this.P.data;
      // storiaV3: la Storia riscritta da Alessio (novembre 2026). Della vecchia si tiene solo la prima missione (tutorial).
      if (!d.storiaV3) {
        d.storiaV3 = { fatte: {}, introViste: {} };
        const vecchia = d.storiaV2 && d.storiaV2.fatte && d.storiaV2.fatte.c1m1;
        if (vecchia) { d.storiaV3.fatte.c1m1 = vecchia; d.storiaV3.introViste.c1 = true; }
      }
      return d.storiaV3;
    },
    missioni() { return CAPITOLI.filter(c => !c.prossimamente).flatMap(c => c.missioni); },
    missione(id) { return this.missioni().find(m => m.id === id); },
    capitoloDi(m) { return CAPITOLI.find(c => c.missioni && c.missioni.includes(m)); },
    fatta(id) { return !!this.dati.fatte[id]; },
    sbloccata(id) {
      const list = this.missioni(), i = list.findIndex(m => m.id === id);
      return i === 0 || (i > 0 && this.fatta(list[i - 1].id));
    },
    prossima() { return this.missioni().find(m => !this.fatta(m.id)) || null; },

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
      let html = '';
      CAPITOLI.forEach(cap => {
        if (cap.prossimamente) {
          html += `<div class="sp-capitolo is-locked"><span class="sp-cap-num">Capitolo ${cap.numero}</span><b>${esc(cap.titolo)}</b><small>${esc(cap.sottotitolo)}</small><em>Prossimamente</em></div>`;
          return;
        }
        const fatte = cap.missioni.filter(m => this.fatta(m.id)).length;
        html += `<div class="sp-capitolo"><span class="sp-cap-num">Capitolo ${cap.numero}</span><b>${esc(cap.titolo)}</b><small>${esc(cap.sottotitolo)}</small>
          <div class="sp-bar"><i style="width:${Math.round(fatte / cap.missioni.length * 100)}%"></i></div><em>${fatte}/${cap.missioni.length} missioni</em>
          <button class="btn btn-subtle btn-sm" onclick="Storia.rivediIntro('${cap.id}')">Rivedi il prologo</button></div>`;
        html += '<div class="sp-sentiero">';
        cap.missioni.forEach((m, i) => {
          const fatta = this.fatta(m.id), aperta = this.sbloccata(m.id), attuale = prossima && prossima.id === m.id;
          const lato = i % 2 === 0 ? 'sx' : 'dx';
          html += `<div class="sp-tappa ${lato} ${fatta ? 'is-done' : ''} ${attuale ? 'is-current' : ''} ${aperta ? '' : 'is-locked'} ${m.boss ? 'is-boss' : ''}">
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
      const fatta = this.fatta(id), ally = this.alleatoDi(m);
      document.getElementById('storiaMissioneBody').innerHTML = `
        <div class="sm-luogo">${esc(m.luogo)}</div>
        <h3 class="sm-titolo">${esc(m.titolo)}</h3>
        <div class="sm-atti">${m.atti.map((t, i) => `<figure class="${i === m.atti.length - 1 ? 'is-finale' : ''}"><img src="${this.imgMinaccia(t)}" alt=""><figcaption>${m.atti.length === 1 ? 'Atto unico' : (i === m.atti.length - 1 ? 'Finale' : ['Atto I', 'Atto II'][i])}<b>${esc(t)}</b></figcaption></figure>`).join('')}</div>
        <div class="sm-squadra"><span>Squadra</span><img src="${this.imgEroe(this.mioEroe())}" alt=""><b>${esc(this.mioEroe())}</b> + <img src="${this.imgEroe(ally)}" alt=""><b>${esc(ally)}</b></div>
        <div class="sm-premio">${fatta
          ? `Già completata. Rigiocarla vale <b>${this.creditiReplay(m)} CR</b>.`
          : `Premio: <b>${this.vociPremio(m.premio).join(', ')}</b>`}</div>
        <div class="sm-btns">
          <button class="btn btn-primary btn-block" onclick="Storia.gioca('${m.id}')">${fatta ? 'Rigioca' : 'Inizia la missione'}</button>
          ${fatta ? `<button class="btn btn-subtle btn-block" onclick="Storia.rivedi('${m.id}')">Rivedi i dialoghi</button>` : ''}
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
      this.scena(m.prima.concat(m.dopo), { titolo: m.titolo, sotto: m.luogo, missione: m });
    },

    // ---------- Partita ----------
    gioca(id) {
      const m = this.missione(id);
      if (!m || !this.sbloccata(id)) return;
      window.UI.hideModals();
      const parti = () => this.scena(m.prima, { titolo: m.titolo, sotto: m.luogo, missione: m, fine: () => this.avvia(m) });
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
          heroes: [{ name: this.mioEroe(), isBot: false }, { name: this.alleatoDi(m), isBot: true }],
          actThreats: m.atti,
          story: m.id,
          difficolta: m.difficolta || 1
        });
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
      const t = m && m.atto && m.atto[state.actIndex - 1];
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
      const vinto = winner === 'heroes' || (winner === 'villain' && me && (st.villainWinners || []).includes(me.id));
      setTimeout(() => {
        window.UI.showScreen('scr-storia');
        this.render();
        if (!vinto) {
          this.scena([{ chi: 'narratore', testo: m.sconfitta || 'La missione è fallita. Riprova.' }], {
            titolo: 'Missione fallita', sotto: m.titolo, missione: m,
            fine: () => this.esito(m, false, [])
          });
          return;
        }
        const prima = !this.fatta(m.id);
        let voci = [];
        if (prima) {
          voci = window.Collezione._premia({ titolo: m.titolo, premio: m.premio }).voci;
          this.dati.fatte[m.id] = Date.now();
        } else {
          const cr = this.creditiReplay(m);
          this.P.addCredits(cr, 'Missione Storia');
          voci = [`${cr} crediti`];
        }
        this.P.save(true);
        document.querySelectorAll('.creditsDisplay').forEach(el => { el.textContent = this.P.getCredits(); });
        this.render();
        this.scena(m.dopo, { titolo: 'Missione compiuta', sotto: m.titolo, missione: m, fine: () => this.esito(m, true, voci, prima) });
      }, 900);
    },

    esito(m, vinto, voci, prima) {
      const nuova = ARCHIVIO.find(a => a.dopo === m.id);
      const prossima = this.prossima();
      document.getElementById('storiaMissioneBody').innerHTML = vinto ? `
        <div class="sm-esito is-win"><span class="sm-burst">VITTORIA!</span></div>
        <h3 class="sm-titolo">${esc(m.titolo)}</h3>
        ${window.Premio ? window.Premio.html(this.creditiDaVoci(voci), this.P.getCredits()) : ''}
        <ul class="sm-premi">${voci.filter(v => !(window.Premio && /^\d+ (crediti|CR)$/.test(String(v)))).map((v, i) => `<li style="animation-delay:${0.25 + i * 0.18}s">${esc(v)}</li>`).join('')}</ul>
        ${prima && nuova ? `<p class="sm-archivio">Nuova voce nell'Archivio: <b>${esc(nuova.titolo)}</b></p>` : ''}
        <div class="sm-btns">
          ${prossima ? `<button class="btn btn-primary btn-block" onclick="Storia.dettaglio('${prossima.id}')">Prossima missione: ${esc(prossima.titolo)}</button>` : ''}
          <button class="btn btn-subtle btn-block" onclick="UI.hideModals()">Torna al percorso</button>
        </div>` : `
        <div class="sm-esito"><span class="sm-burst is-lose">SCONFITTA</span></div>
        <h3 class="sm-titolo">${esc(m.titolo)}</h3>
        <p class="sm-premio">Nessun premio questa volta. Puoi riprovare quando vuoi.</p>
        <div class="sm-btns">
          <button class="btn btn-primary btn-block" onclick="Storia.gioca('${m.id}')">Riprova</button>
          <button class="btn btn-subtle btn-block" onclick="UI.hideModals()">Torna al percorso</button>
        </div>`;
      window.UI.showModal('modalStoriaMissione');
      if (vinto && window.Premio) window.Premio.anima(document.getElementById('storiaMissioneBody'));
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
    parlante(riga, m) {
      const chi = riga.chi;
      if (chi === 'narratore') return { tipo: 'narratore' };
      if (chi === 'eroe') { const h = this.mioEroe(); return { nome: h, img: this.imgEroe(h), lato: 'sx' }; }
      // 'legato' = l'eroe legato alla missione (sei tu se hai scelto proprio lui); 'altro' = l'altro dei due
      if (chi === 'legato' || chi === 'altro') {
        const me = this.mioEroe(), tuSeiLegato = m && m.alleato === me;
        const sonoIo = (chi === 'legato') === tuSeiLegato;
        if (sonoIo || !m) return this.parlante({ chi: 'eroe' }, m);
        return this.parlante({ chi: 'alleato' }, m);
      }
      if (chi === 'alleato') { const h = m ? this.alleatoDi(m) : 'Neon Phantom'; return { nome: h, img: this.imgEroe(h), lato: 'dx' }; }
      if (chi === 'minaccia') { const t = m.atti[m.atti.length - 1]; return { nome: t, img: this.imgMinaccia(t), lato: 'dx', nemico: true }; }
      const pg = PERSONAGGI[chi];
      if (pg) return { nome: pg.nome, img: this.imgMinaccia(pg.minaccia), lato: 'dx', nemico: !!pg.nemico };
      return { nome: chi, img: this.imgEroe(chi), lato: chi === this.mioEroe() ? 'sx' : 'dx' };
    },

    scena(righe, opt = {}) {
      const m = opt.missione || null;
      let i = 0, timer = null, scrivendo = false;
      const old = document.getElementById('storiaScena');
      if (old) old.remove();
      const el = document.createElement('div');
      el.id = 'storiaScena';
      el.className = 'storia-scena';
      el.innerHTML = `
        <div class="ss-bg"></div>
        <div class="ss-top"><span class="ss-titolo"><b>${esc(opt.titolo || '')}</b><small>${esc(opt.sotto || '')}</small></span>
          <button class="ss-salta" type="button">Salta ▸▸</button></div>
        <div class="ss-stage"></div>
        <div class="ss-hint">Tocca per continuare</div>`;
      document.body.appendChild(el);
      const stage = el.querySelector('.ss-stage');
      const chiudi = () => {
        clearInterval(timer);
        el.classList.add('out');
        setTimeout(() => { el.remove(); if (typeof opt.fine === 'function') opt.fine(); }, 350);
      };
      const mostra = () => {
        const r = righe[i];
        const p = this.parlante(r, m);
        const T = window.I18N ? window.I18N.t : (x => x); const base = r.per ? (r.per[this.mioEroe()] || r.per.tutti) : r.testo; const testo = T(String(base)).replace('{alleato}', T(m ? this.alleatoDi(m) : '')).replace('{eroe}', T(this.mioEroe()));
        stage.innerHTML = p.tipo === 'narratore'
          ? `<div class="ss-panel ss-narra"><div class="ss-caption"><span class="ss-testo"></span></div></div>`
          : `<div class="ss-panel ss-${p.lato} ${p.nemico ? 'is-enemy' : ''}">
              <div class="ss-ritratto"><img src="${p.img}" alt=""></div>
              <div class="ss-bubble"><b class="ss-nome">${esc(p.nome)}</b><span class="ss-testo"></span></div>
            </div>`;
        if (r.fx) {
          const fx = document.createElement('span');
          fx.className = 'ss-fx';
          fx.textContent = r.fx;
          stage.appendChild(fx);
        }
        const out = stage.querySelector('.ss-testo');
        let k = 0;
        scrivendo = true;
        clearInterval(timer);
        timer = setInterval(() => {
          k += 2;
          out.textContent = testo.slice(0, k);
          if (k >= testo.length) { clearInterval(timer); scrivendo = false; }
        }, 22);
        out.dataset.full = testo;
      };
      const avanti = () => {
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
      if (!p) { el.textContent = 'Storia completata! Nuovi capitoli in arrivo.'; return; }
      const cap = this.capitoloDi(p);
      el.textContent = `Capitolo ${cap.numero} · Missione ${cap.missioni.indexOf(p) + 1}/${cap.missioni.length}: ${p.titolo}`;
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
