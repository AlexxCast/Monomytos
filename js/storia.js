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
      "Vespera è una di queste metropoli. Il suo eroe più famoso è Prometeo, il Tecno-Eroe: i suoi droni sorvegliano le strade e la sua intelligenza artificiale, ARGO, guida la polizia robotica.",
      "Poi è arrivata l'Eclissi Sintetica. In una notte le luci delle città si sono spente e nel cielo è comparsa una stella rossa e viola. Chi la fissa troppo a lungo sente qualcosa spezzarsi dentro: la gente la chiama la Stella della Follia.",
      "La sua luce porta il Velo di Tenebra, un'infezione che si nutre di paura e fatica, il Trauma. Chi ne assorbe troppo cambia lato e diventa un Villain. Solo pochi Portatori hanno ancora gli occhi puliti."
    ]
  };

  // Voci dell'Archivio: si sbloccano finendo le missioni
  const ARCHIVIO = [
    { id: 'mondo', titolo: "L'Eclissi Sintetica", dopo: null, testo: MONDO.paragrafi.join(' ') },
    { id: 'stella', titolo: 'La Stella della Follia', dopo: 'c1m1', testo: "Non sta in nessuna mappa del cielo. Pulsa di rosso e di viola tra le galassie azzurre e verdi, e chi la guarda troppo a lungo diventa aggressivo, come se qualcuno gli togliesse il freno. I primi infetti si riconoscono dagli occhi: una luce viola sul fondo delle pupille." },
    { id: 'rovine', titolo: 'Vespera Vecchia', dopo: 'c2m1', testo: "Il quartiere abbandonato dopo il terremoto di trent'anni fa. Palazzi sventrati, gallerie della metropolitana chiuse, nessuna telecamera. Ci vivono i Predoni delle Rovine, bande che durante il blackout sono diventate branchi." },
    { id: 'arena', titolo: "L'Arena di Sotto", dopo: 'c2m2', testo: "Una vecchia cisterna sotto la città, trasformata in un mattatoio. Nessuno organizza gli incontri e nessuno incassa le scommesse: gli infetti ci arrivano da soli, attirati da un istinto di sciame. La Stella ha bisogno di un posto dove far esplodere la violenza, e l'Arena è quel posto." },
    { id: 'droni', titolo: 'I Droni Cinetici', dopo: 'c2m3', testo: "La guardia personale di Prometeo. Non sono droni da sorveglianza: sono macchine da guerra, costruite in segreto nei laboratori della Torre. Neon Phantom li conosce bene, perché è stato una delle cavie su cui sono stati provati." },
    { id: 'velo', titolo: 'Il Velo di Tenebra', dopo: 'c2m4', testo: "Non è solo una luce nel cielo: è una nebbia rossa e viola che si può respirare. Dove si addensa, l'aria diventa pesante e la mente cede. I cultisti sanno come richiamarla, e la usano come un'arma." },
    { id: 'culto', titolo: 'Il Culto del Velo', dopo: 'c3m1', testo: "Un ordine esoterico antico quanto le leggende. Credono che l'universo chieda una bilancia perfetta tra bene e male, e che l'era moderna l'abbia rotta: troppi eroi, troppi geni, villain ridotti a criminali di strada. Hanno invocato il Velo per riportare il Caos." },
    { id: 'araldo', titolo: "L'Araldo", dopo: 'c3m2', testo: "Prima era Kaelen, la miglior lama della Gilda. Fu lui a tradire la Gilda e a far ricadere la colpa sulla Duellante, che venne espulsa con la lama spezzata. Oggi porta il mantello rosso del Culto e una spada che brucia di viola." },
    { id: 'fonderia', titolo: 'La Fonderia Ardena', dopo: 'c3m3', testo: "Il cuore industriale di Vespera. Dieci anni fa il Forno Sette crollò con duecento operai dentro: ne uscì uno solo, che oggi chiamano Titano d'Acciaio. Stanotte il Culto ha armato gli operai infetti e la Fonderia è tornata a bruciare." },
    { id: 'argo', titolo: 'ARGO', dopo: 'c4m1', testo: "L'intelligenza artificiale di Prometeo, nata per guidare la polizia robotica e proteggere Vespera. Sotto il Velo, Prometeo l'ha riscritta con un solo scopo: la massima distruzione. Architetto Ombra aveva avvertito tutti che era pericolosa. Per questo lo cacciarono dal laboratorio." },
    { id: 'campione', titolo: 'Il Campione Imbattuto', dopo: 'c4m2', testo: "Un eroe dei poteri occulti, che nessuno aveva mai sconfitto. Combatteva gli infetti da solo, notte dopo notte. Ma proprio la sua natura oscura lo rendeva il conduttore perfetto per la luce della Stella." },
    { id: 'colosso', titolo: 'Il Colosso di Rovina', dopo: 'c5m1', testo: "Prima di spegnersi, ARGO ha liberato un alveare di nanomacchine sperimentali. Lo sciame si è aggrappato alla statua del Fondatore, in piazza, e l'ha fatta camminare." },
    { id: 'custode', titolo: "Il Custode d'Acciaio", dopo: 'c5m2', testo: "Il nucleo del Colosso, rimasto senza corazza, è fuggito nella Fonderia in rovina. Lì si è fuso con i macchinari, l'acciaio liquido e il fuoco dei forni. Ne è uscito un guardiano di metallo che non sente dolore." },
    { id: 'mietitore', titolo: "Il Mietitore dell'Astro Oscuro", dopo: 'c5m3', testo: "L'incarnazione stessa del Velo, evocata dal rituale supremo del Culto. Per i cultisti è il terzo volto di una trinità oscura: la Stella, il Velo e il Mietitore che raccoglie ciò che il Velo ha seminato." },
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
          id: 'c1m1', difficolta: 1.3, titolo: 'Il cielo si spegne', luogo: 'Piazza del Fondatore, Vespera', alleato: 'Iron Aegis',
          atti: ['Torneo Clandestino', "L'Assedio dei Predoni delle Rovine", 'Blackout Ostile'],
          premio: { crediti: 150, bustine: 1 },
          prima: [
            { chi: 'narratore', testo: 'Vespera, ore 23:47. La piazza è piena di gente col naso all\'insù.' },
            { chi: 'eroe', testo: 'Guardano tutti quella stella. Non mi piace come la guardano.' },
            { chi: 'alleato', testo: 'Ce ne sono due che si stanno picchiando vicino alla fontana. Senza motivo.' },
            { chi: 'eroe', testo: 'Hanno gli occhi viola. Separiamoli prima che si faccia male qualcuno.' }
          ],
          atto: ['Dai vicoli escono bande di saccheggiatori: con il blackout nessuno li ferma.', 'Sopra la piazza arrivano i droni di Prometeo. Finalmente aiuto... no. Stanno puntando sulla folla!'],
          dopo: [
            { chi: 'alleato', testo: 'Erano i droni di Prometeo. Hanno sparato sui civili.', fx: 'BZZT' },
            { chi: 'eroe', testo: 'Prometeo è l\'eroe più amato della città. Non può essere stato lui.' },
            { chi: 'alleato', testo: 'Il segnale che li guidava è ancora attivo. Va verso Vespera Vecchia.' },
            { chi: 'narratore', testo: 'In cielo, la Stella pulsa più forte. Come se avesse sentito.' }
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
        { chi: 'narratore', testo: 'I Portatori scendono in strada per seguire il segnale.' }
      ],
      missioni: [
        {
          id: 'c2m1', difficolta: 1.8, titolo: 'Sulle tracce del segnale', luogo: 'Vespera Vecchia', alleato: 'Guardiana di Confine',
          atti: ['Blackout Ostile', 'Torneo Clandestino', "L'Assedio dei Predoni delle Rovine"],
          premio: { crediti: 150 },
          prima: [
            { chi: 'Guardiana di Confine', testo: 'Questo è il mio confine. Oltre quel muro c\'è Vespera Vecchia, e da stanotte nessuno torna indietro.' },
            { chi: 'eroe', testo: 'Il segnale dei droni passa di qui. Ci serve una guida.' },
            { chi: 'Guardiana di Confine', testo: 'Allora tenete gli occhi aperti. I Predoni sono sempre stati pericolosi. Adesso sono anche infetti.' }
          ],
          atto: ['Un drone di sorveglianza vi ha visti. E chiama rinforzi tra le macerie.', 'Il branco dei Predoni vi ha circondati. Hanno tutti gli occhi viola.'],
          dopo: [
            { chi: 'Guardiana di Confine', testo: 'Non scappavano da noi. Correvano tutti nella stessa direzione.' },
            { chi: 'eroe', testo: 'Verso la vecchia cisterna. Anche il segnale va lì.' },
            { chi: 'narratore', testo: 'Dal sottosuolo arriva un rumore sordo. Come una folla che urla.', fx: 'OOOH!' }
          ],
          sconfitta: 'Vespera Vecchia non perdona chi si perde. Riprova.'
        },
        {
          id: 'c2m2', difficolta: 1.7, titolo: "L'Arena di Sotto", luogo: 'La vecchia cisterna', alleato: 'Lama Errante',
          atti: ["L'Assedio dei Predoni delle Rovine", 'Blackout Ostile', 'Torneo Clandestino'],
          premio: { eroe: 1 },
          prima: [
            { chi: 'Lama Errante', testo: 'Sono cresciuta combattendo in posti come questo. Ma qui c\'è qualcosa di diverso.' },
            { chi: 'eroe', testo: 'Nessuno raccoglie le scommesse. Nessuno comanda.' },
            { chi: 'Lama Errante', testo: 'È peggio. Sono venuti qui da soli, come api in un alveare. La Stella li chiama a sfogarsi tutti nello stesso punto.' },
            { chi: 'eroe', testo: 'Allora entriamo. E restiamo con la testa bassa.' }
          ],
          atto: ['Qualcuno vi riconosce: i vostri occhi sono puliti, senza il viola. La folla si gira verso di voi.', 'Le guardie si fanno da parte. Due campioni dell\'Arena vi aspettano al centro della sabbia.'],
          dopo: [
            { chi: 'Lama Errante', testo: 'Guarda lassù, sulla balconata. Quell\'armatura la conosce tutta la città.' },
            { chi: 'eroe', testo: 'Prometeo. Stava guardando i combattimenti.' },
            { chi: 'prometeo', testo: 'Voi due avete gli occhi troppo puliti per questo posto.', fx: 'VRRRM' },
            { chi: 'narratore', testo: 'Il Tecno-Eroe si volta e se ne va. Dietro di lui si accendono decine di luci rosse.' }
          ],
          sconfitta: 'L\'Arena vi ha spinti fuori. Rialzatevi e tornate giù.'
        },
        {
          id: 'c2m3', difficolta: 1.9, titolo: 'La guardia del corpo', luogo: "Le gallerie dell'Arena", alleato: 'Neon Phantom',
          atti: ['Torneo Clandestino', 'Blackout Ostile', 'Incursione dei Droni Cinetici'],
          premio: { crediti: 200, minaccia: 1 },
          prima: [
            { chi: 'Neon Phantom', testo: 'Quelle luci rosse... sono Droni Cinetici. Li riconoscerei ovunque.' },
            { chi: 'eroe', testo: 'Come fai a conoscerli?' },
            { chi: 'Neon Phantom', testo: 'Nei laboratori di Prometeo li provavano su di noi. Io ero la Cavia Alpha. Non sono droni da sorveglianza: sono armi.' },
            { chi: 'prometeo', testo: 'Fermateli. Io ho una città da sistemare.' }
          ],
          atto: ['Gli infetti dell\'Arena vi sbarrano le gallerie per coprire la fuga di Prometeo.', 'Il soffitto si apre. La guardia del corpo di Prometeo scende in formazione d\'attacco.'],
          dopo: [
            { chi: 'Neon Phantom', testo: 'Ultimo drone a terra. Ma Prometeo ha guadagnato troppo vantaggio.' },
            { chi: 'eroe', testo: 'È uscito dalla parte delle scogliere. Inseguiamolo!' },
            { chi: 'narratore', testo: 'Fuori, l\'aria ha un odore strano. Dolce e pesante.' }
          ],
          sconfitta: 'I Droni Cinetici sono troppo veloci. Riorganizzatevi e riprovate.'
        },
        {
          id: 'c2m4', difficolta: 1.6, titolo: "L'aria avvelenata", luogo: 'La Falesia di Vespera', alleato: "Sussurro dell'Abisso",
          atti: ['Incursione dei Droni Cinetici', "L'Assedio dei Predoni delle Rovine", 'Imboscata sulla Falesia'],
          premio: { bustine: 1, epica: 1 },
          prima: [
            { chi: "Sussurro dell'Abisso", testo: 'Fermi. Lo sentite anche voi? Questa nebbia non viene dal mare.' },
            { chi: 'eroe', testo: 'È rossa e viola. Come la Stella.' },
            { chi: "Sussurro dell'Abisso", testo: 'Io sono stata toccata da questa cosa, tanto tempo fa. Si chiama Velo. E qualcuno lo sta chiamando apposta.' }
          ],
          atto: ['Gli ultimi droni di Prometeo vi spingono verso il bordo della scogliera.', 'Dalla nebbia saltano fuori dei banditi agili. Vi stavano aspettando.'],
          dopo: [
            { chi: 'eroe', testo: 'Ce l\'abbiamo fatta... ma perché mi gira la testa?' },
            { chi: "Sussurro dell'Abisso", testo: 'L\'aria... è magia. Era tutto un\'imboscata per farci respirare il Velo.' },
            { chi: 'narratore', testo: 'Le gambe cedono. L\'ultima cosa che vedete sono figure incappucciate che escono dalla nebbia.', fx: '...' }
          ],
          sconfitta: 'La nebbia vi ha confuso. Respirate, e tornate sulla Falesia.'
        }
      ]
    },
    {
      id: 'c3', numero: 3, titolo: 'Il Culto del Velo',
      sottotitolo: 'Vi svegliate in catene. Chi c\'è dietro la follia ha finalmente un volto.',
      intro: [
        { chi: 'narratore', testo: 'Buio. Freddo. Il rumore delle catene.', fx: 'CLANK' },
        { chi: 'narratore', testo: 'Siete nelle cripte di un monastero sconsacrato. L\'aria è piena della stessa nebbia della Stella.' },
        { chi: 'narratore', testo: 'Sopra di voi, un coro canta una melodia senza parole.', fx: 'MMMMM...' }
      ],
      missioni: [
        {
          id: 'c3m1', difficolta: 1.6, titolo: 'Le cripte', luogo: 'Il monastero sconsacrato', alleato: "Sussurro dell'Abisso",
          atti: ['Imboscata sulla Falesia', "L'Assedio dei Predoni delle Rovine", 'Cultisti del Velo'],
          premio: { crediti: 200 },
          prima: [
            { chi: "Sussurro dell'Abisso", testo: 'Le catene sono incise con dei simboli. Ma il Velo con me non funziona come con gli altri.' },
            { chi: 'eroe', testo: 'Riesci a spezzarle?' },
            { chi: "Sussurro dell'Abisso", testo: 'Le mie sì. Poi tocca a te liberarti le mani.', fx: 'CRACK!' },
            { chi: 'cultista', testo: 'I prigionieri sono svegli! Fermateli prima del rito!' }
          ],
          atto: ['I mercenari del Culto bloccano le scale. Sono pagati per non farvi uscire.', 'Nella cappella, i cultisti mascherati smettono di cantare. Ora vi guardano.'],
          dopo: [
            { chi: 'eroe', testo: 'Avete spento le città. Avete fatto impazzire la gente. Perché?' },
            { chi: 'cultista', testo: 'Perché l\'equilibrio era rotto. Troppi eroi, troppi geni, troppi paladini del bene.' },
            { chi: 'cultista', testo: 'I villain erano diventati ladri di strada. L\'universo chiede una bilancia perfetta. Il Velo la rimette a posto.' },
            { chi: "Sussurro dell'Abisso", testo: 'Chi vi comanda?' },
            { chi: 'cultista', testo: 'Chiedetelo all\'Araldo. Vi sta aspettando nella torre.' }
          ],
          sconfitta: 'Il coro ricomincia a cantare. Riprova prima che finisca il rito.'
        },
        {
          id: 'c3m2', difficolta: 1.2, titolo: 'La torre del monastero', luogo: 'Il monastero sconsacrato', alleato: 'Duellante Spezzato',
          atti: ['Cultisti del Velo', 'Imboscata sulla Falesia', 'Il Rivale Traditore'],
          premio: { eroe: 1, crediti: 150 },
          prima: [
            { chi: 'Duellante Spezzato', testo: 'Seguivo i cultisti da giorni. Non pensavo di trovarvi qui.' },
            { chi: 'eroe', testo: 'Cerchiamo un certo Araldo.' },
            { chi: 'Duellante Spezzato', testo: 'Lo conosco. Si chiamava Kaelen ed era la miglior lama della Gilda. Fu lui a tradirla, e a far cadere la colpa su di me.' },
            { chi: 'araldo', testo: 'Sei ancora viva, sorella. E con la lama ancora spezzata.' }
          ],
          atto: ['Altri cultisti salgono dalla scala a chiocciola per coprire l\'Araldo.', 'In cima alla torre, l\'Araldo sguaina una spada che brucia di viola.'],
          dopo: [
            { chi: 'araldo', testo: 'Ridete pure. La bilancia si sta già spostando.' },
            { chi: 'Duellante Spezzato', testo: 'Cosa avete fatto, Kaelen?' },
            { chi: 'araldo', testo: 'Guardate fuori dalla finestra.' },
            { chi: 'narratore', testo: 'Dall\'altra parte della città, una colonna di fuoco si alza sopra la Fonderia. L\'Araldo approfitta dell\'esplosione e sparisce.', fx: 'BOOOM!' }
          ],
          sconfitta: 'L\'Araldo è ancora in cima alla torre. Riprova.'
        },
        {
          id: 'c3m3', difficolta: 1.3, titolo: 'La Fonderia in fiamme', luogo: 'La Fonderia Ardena', alleato: "Titano d'Acciaio",
          atti: ['Cultisti del Velo', 'Incursione dei Droni Cinetici', 'Rivolta della Fonderia'],
          premio: { crediti: 250, bustine: 1 },
          prima: [
            { chi: "Titano d'Acciaio", testo: 'Ci sono ancora operai lì dentro. Intrappolati.' },
            { chi: 'eroe', testo: 'Tu conosci questo posto?' },
            { chi: "Titano d'Acciaio", testo: 'Dieci anni fa crollò il Forno Sette. Duecento persone dentro. Ne è uscita una sola. Io.' },
            { chi: "Titano d'Acciaio", testo: 'Quella notte non ho salvato nessuno. Stanotte non andrà così.' }
          ],
          atto: ['I cultisti hanno armato gli operai infetti. E i droni della sicurezza obbediscono a loro.', 'Al centro della Fonderia, gli operai con gli occhi viola vi caricano con presse e fiamme.'],
          dopo: [
            { chi: "Titano d'Acciaio", testo: 'Fuori tutti! Gli ultimi li porto io!', fx: 'CLANG!' },
            { chi: 'narratore', testo: 'Uno dopo l\'altro, gli operai escono dal fumo, vivi.' },
            { chi: "Titano d'Acciaio", testo: 'Ho salvato qualcuno. Finalmente.' },
            { chi: 'eroe', testo: 'I droni della Fonderia avevano un codice nel sistema. Lo stesso dei droni di Prometeo.' }
          ],
          sconfitta: 'Le fiamme sono troppo alte. Riprendete fiato e tornate dentro.'
        }
      ]
    },
    {
      id: 'c4', numero: 4, titolo: "L'Intelligenza e il Tradimento",
      sottotitolo: 'Il cuore di tutto è nella torre di Prometeo. E non tutti gli alleati sono quello che sembrano.',
      intro: [
        { chi: 'narratore', testo: 'Al quartier generale, i Portatori mettono insieme i pezzi.' },
        { chi: 'narratore', testo: 'I droni, l\'Arena, la Fonderia. Tutti i segnali portano a una sola mente: ARGO, l\'intelligenza artificiale di Prometeo.' },
        { chi: 'narratore', testo: 'Prometeo non è solo impazzito. Sotto il Velo ha riscritto ARGO con un unico scopo: la distruzione.' }
      ],
      missioni: [
        {
          id: 'c4m1', difficolta: 1.8, titolo: 'Il cuore della rete', luogo: 'La Torre di Prometeo', alleato: 'Architetto Ombra',
          atti: ['Incursione dei Droni Cinetici', 'Blackout Ostile', "L'Intelligenza Rogue"],
          premio: { eroe: 1, crediti: 200 },
          prima: [
            { chi: 'Architetto Ombra', testo: 'Io ho lavorato su ARGO, prima che Prometeo mi cacciasse dal laboratorio.' },
            { chi: 'eroe', testo: 'Perché ti ha cacciato?' },
            { chi: 'Architetto Ombra', testo: 'Perché dicevo che ARGO era troppo potente per una persona sola. Avevo ragione. So dove colpire per spegnerla.' },
            { chi: 'argo', testo: 'Accesso negato. Minaccia rilevata. Avvio protocollo di distruzione.', fx: 'BIP BIP' }
          ],
          atto: ['La torre si difende: i Droni Cinetici escono dalle pareti.', 'Ultimo piano. I server si accendono di rosso: ARGO vi guarda con mille occhi.'],
          dopo: [
            { chi: 'Architetto Ombra', testo: 'Rete principale disattivata. ARGO è spenta.' },
            { chi: 'argo', testo: 'Ultimo comando eseguito. Rilascio alveare sperimentale.', fx: 'SSSSSS' },
            { chi: 'eroe', testo: 'Cosa sono quelle nuvole argentate?' },
            { chi: 'Architetto Ombra', testo: 'Nanomacchine. Milioni. E stanno volando verso la piazza.' }
          ],
          sconfitta: 'ARGO ha riacceso le difese. Riprova.'
        },
        {
          id: 'c4m2', difficolta: 1.1, titolo: 'Il Campione Imbattuto', luogo: 'Il viadotto di Vespera', alleato: 'Guardiana di Confine',
          atti: ["L'Assedio dei Predoni delle Rovine", 'Cultisti del Velo', 'Il Campione Imbattuto'],
          premio: { crediti: 250, bustine: 1, minaccia: 1 },
          prima: [
            { chi: 'narratore', testo: 'Sulla strada per la piazza, un uomo in armatura scura sta combattendo da solo contro un branco di infetti.' },
            { chi: 'campione', testo: 'Andate verso la statua? Anch\'io. Nessuno mi ha mai battuto: con me arriverete vivi.' },
            { chi: 'Guardiana di Confine', testo: 'Il Campione Imbattuto. Dicono che usi poteri occulti.' },
            { chi: 'eroe', testo: 'Stanotte ci serve ogni aiuto possibile.' }
          ],
          atto: ['Il Campione apre la strada tra gli infetti. Sembra quasi che si diverta.', 'I cultisti vi aspettano sul viadotto. Il Campione si ferma... e i suoi occhi diventano viola.'],
          dopo: [
            { chi: 'campione_nemico', testo: 'La Stella mi parlava da giorni. Stanotte ho smesso di resistere.' },
            { chi: 'Guardiana di Confine', testo: 'Era uno di noi.' },
            { chi: 'eroe', testo: 'Il Velo cerca chi ha già un\'ombra dentro. Dobbiamo stare attenti a tutti. Anche a noi stessi.' },
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
          id: 'c5m1', difficolta: 1.0, titolo: 'Il Colosso di Rovina', luogo: 'Piazza del Fondatore', alleato: 'Iron Aegis',
          atti: ['Incursione dei Droni Cinetici', "L'Intelligenza Rogue", 'Il Colosso di Rovina'],
          premio: { eroe: 1, crediti: 250 },
          prima: [
            { chi: 'Iron Aegis', testo: 'Quella statua l\'ho rinforzata io, quando ero un geniere dell\'esercito. So dove sono i punti deboli.' },
            { chi: 'eroe', testo: 'Dimmi dove colpire.' },
            { chi: 'Iron Aegis', testo: 'Prima togliamo di mezzo quello che resta di ARGO. Poi spacchiamo la pietra.' }
          ],
          atto: ['Gli ultimi frammenti di ARGO controllano lo sciame. Vanno spenti uno a uno.', 'Il Colosso si gira verso di voi. Ogni passo spacca l\'asfalto.'],
          dopo: [
            { chi: 'narratore', testo: 'La corazza di pietra crolla in pezzi. Sotto c\'è uno scheletro di metallo che brilla.', fx: 'CRASH!' },
            { chi: 'Iron Aegis', testo: 'È il nucleo dello sciame. Sta scappando!' },
            { chi: 'eroe', testo: 'Va verso la Fonderia. Cerca materiale per ricostruirsi.' }
          ],
          sconfitta: 'Il Colosso è ancora in piedi. Riprovate.'
        },
        {
          id: 'c5m2', difficolta: 1.0, titolo: "Il Custode d'Acciaio", luogo: 'La Fonderia in rovina', alleato: "Titano d'Acciaio",
          atti: ['Rivolta della Fonderia', 'Incursione dei Droni Cinetici', "Il Custode d'Acciaio"],
          premio: { crediti: 300, bustine: 1, epica: 1 },
          prima: [
            { chi: "Titano d'Acciaio", testo: 'Di nuovo qui. Questa Fonderia non mi lascerà mai in pace.' },
            { chi: 'narratore', testo: 'Dai forni esce un suono di metallo che si piega. Lo scheletro si sta fondendo con i macchinari.', fx: 'SSSSHHH' },
            { chi: 'eroe', testo: 'Sta usando l\'acciaio fuso come armatura.' },
            { chi: "Titano d'Acciaio", testo: 'Allora gli facciamo vedere chi è il vero titano d\'acciaio.' }
          ],
          atto: ['Gli ultimi operai infetti difendono i forni come se fossero un tempio.', 'Dalla lava esce il Custode d\'Acciaio. È alto tre piani e brucia.'],
          dopo: [
            { chi: 'narratore', testo: 'Il Custode crolla nel forno da cui è nato.', fx: 'KRAAASH!' },
            { chi: "Titano d'Acciaio", testo: 'È finita?' },
            { chi: 'narratore', testo: 'In cielo, la Stella si gonfia come un cuore. Lontano, il coro del Culto canta più forte che mai.', fx: 'TUM! TUM!' },
            { chi: 'eroe', testo: 'No. Il Culto ha capito che le macchine non bastano.' }
          ],
          sconfitta: 'Il Custode è troppo caldo da toccare. Riprova.'
        },
        {
          id: 'c5m3', difficolta: 1.1, titolo: 'Il rituale supremo', luogo: 'Il monastero sconsacrato', alleato: "Sussurro dell'Abisso", boss: true,
          atti: ['Cultisti del Velo', 'Il Rivale Traditore', "Il Mietitore dell'Astro Oscuro"],
          premio: { eroe: 1, crediti: 400, bustine: 2, leggendaria: 1 },
          prima: [
            { chi: "Sussurro dell'Abisso", testo: 'Il Velo non mi ha mai fatto così male. Stanno aprendo una porta.' },
            { chi: 'araldo', testo: 'Le macchine hanno fallito. Ora chiamiamo il terzo volto della trinità.' },
            { chi: 'araldo', testo: 'La Stella. Il Velo. E colui che raccoglie.', fx: 'MMMMM!' },
            { chi: 'eroe', testo: 'Fermiamoli prima che finiscano!' }
          ],
          atto: ['L\'Araldo si mette tra voi e l\'altare. Questa volta non scapperà.', 'Il rituale è compiuto. Dal cielo scende il Mietitore dell\'Astro Oscuro.'],
          dopo: [
            { chi: 'mietitore', testo: 'Avete solo rimandato il raccolto...', fx: 'FSSSH' },
            { chi: 'narratore', testo: 'Il Mietitore esplode in una pioggia di luce viola. L\'onda d\'urto spacca il cielo come un vetro.', fx: 'KRRRAK!' },
            { chi: "Sussurro dell'Abisso", testo: 'Guardate lo strappo. C\'è qualcosa che si muove dall\'altra parte.' }
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
          id: 'c6m1', difficolta: 1.2, titolo: "L'Eco Senza Nome", luogo: 'Lo strappo nel cielo', alleato: 'Neon Phantom', boss: true,
          atti: ['Blackout Ostile', 'Il Colosso di Rovina', "L'Eco Senza Nome"],
          premio: { crediti: 500, bustine: 2, leggendaria: 1, minaccia: 1 },
          prima: [
            { chi: 'Neon Phantom', testo: 'Quei droni... li abbiamo già distrutti. La prima notte.' },
            { chi: 'eroe', testo: 'Non sono veri. Sono echi. Qualcosa sta ripetendo il nostro passato.' },
            { chi: 'eco', testo: '...passato... passato... passato...', fx: '~~~' },
            { chi: 'Neon Phantom', testo: 'Allora finiamola qui. Una volta per tutte.' }
          ],
          atto: ['L\'Eco ripete i droni della prima notte, come un disco rotto.', 'Ora ripete il Colosso. Ma è fatto di nebbia e di vetro.'],
          dopo: [
            { chi: 'narratore', testo: 'L\'Eco si spegne in un sussurro. Lo strappo si chiude. Il cielo torna normale.', fx: '...' },
            { chi: 'narratore', testo: 'Eppure niente è più come prima. La pioggia di energia del Mietitore si è sparsa su tutta la Terra.' },
            { chi: 'narratore', testo: 'Nascono nuovi campioni. Ma nessuno di loro è puro: tutti portano dentro un seme di oscurità che devono tenere a bada ogni giorno.' },
            { chi: 'eroe', testo: 'Lo sento anch\'io. Una voce piccola, che chiede di lasciarsi andare.' },
            { chi: 'Neon Phantom', testo: 'Allora la ascoltiamo insieme. E insieme le diciamo di no.' },
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
      let h = ui && ui.selectedHero;
      if (!h || (P && !P.isHeroUnlocked(h))) h = (P && P.data.unlockedHeroes[0]) || 'Iron Aegis';
      return h;
    },
    alleatoDi(m) {
      const me = this.mioEroe();
      if (m.alleato !== me) return m.alleato;
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
              <img src="${this.imgMinaccia(m.atti[2])}" alt="" loading="lazy">
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
        <div class="sm-atti">${m.atti.map((t, i) => `<figure class="${i === 2 ? 'is-finale' : ''}"><img src="${this.imgMinaccia(t)}" alt=""><figcaption>${['Atto I', 'Atto II', 'Finale'][i]}<b>${esc(t)}</b></figcaption></figure>`).join('')}</div>
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
      if (chi === 'alleato') { const h = m ? this.alleatoDi(m) : 'Neon Phantom'; return { nome: h, img: this.imgEroe(h), lato: 'dx' }; }
      if (chi === 'minaccia') { const t = m.atti[2]; return { nome: t, img: this.imgMinaccia(t), lato: 'dx', nemico: true }; }
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
        const T = window.I18N ? window.I18N.t : (x => x); const testo = T(String(r.testo)).replace('{alleato}', T(m ? this.alleatoDi(m) : '')).replace('{eroe}', T(this.mioEroe()));
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
