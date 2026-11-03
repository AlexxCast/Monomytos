// Monomythos Progression, Deck Builder & Economy System
class ProgressionSystem {
  constructor() {
    this.storageKey = 'monomythos_progression_v2';
    this.data = this.load();
  }

  getDefaultData() {
    const allHeroes = [
      'Iron Aegis', 'Neon Phantom', 'Guardiana di Confine', 'Lama Errante',
      "Titano d'Acciaio", 'Architetto Ombra', "Sussurro dell'Abisso", 'Duellante Spezzato'
    ];
    return {
      credits: 500, // Starting currency
      unlockedHeroes: allHeroes,
      unlockedCards: {}, // card_id -> quantity owned
      customDecks: {},
      activeDeckName: 'Predefinito'
    };
  }

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...this.getDefaultData(), ...parsed };
      }
    } catch (e) {
      console.error('Error loading progression:', e);
    }

    const initial = this.getDefaultData();
    // Initialize starter copies for all heroes
    if (window.MONOMYTHOS_DATA && window.MONOMYTHOS_DATA.action_cards) {
      Object.keys(window.MONOMYTHOS_DATA.action_cards).forEach(h => {
        const cards = window.MONOMYTHOS_DATA.action_cards[h] || [];
        cards.forEach(c => {
          initial.unlockedCards[c.id] = 2; // 2 starter copies for all 152 cards
        });
      });
    }
    return initial;
  }

  save(localOnly = false) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (e) {
      console.error('Error saving progression:', e);
    }
    // Con l'account attivo, il profilo si salva anche sul server
    if (!localOnly && window.Account) window.Account.queueSave();
  }

  getCredits() {
    return this.data.credits;
  }

  addCredits(amount, reason = '') {
    this.data.credits = Math.max(0, this.data.credits + amount);
    this.save();
    return this.data.credits;
  }

  isHeroUnlocked(heroName) {
    return this.data.unlockedHeroes.includes(heroName);
  }

  unlockHero(heroName, cost = 0) {
    if (this.isHeroUnlocked(heroName)) return { ok: false, msg: 'Eroe già sbloccato' };
    if (this.data.credits < cost) return { ok: false, msg: 'Crediti insufficienti' };

    this.data.credits -= cost;
    this.data.unlockedHeroes.push(heroName);

    // Give 2 copies of each card of this hero
    if (window.MONOMYTHOS_DATA && window.MONOMYTHOS_DATA.action_cards) {
      const cards = window.MONOMYTHOS_DATA.action_cards[heroName] || [];
      cards.forEach(c => {
        this.data.unlockedCards[c.id] = (this.data.unlockedCards[c.id] || 0) + 2;
      });
    }

    this.save();
    return { ok: true, credits: this.data.credits };
  }

  getCardOwnedCount(cardId) {
    if (this.data.unlockedCards[cardId] !== undefined) {
      return this.data.unlockedCards[cardId];
    }
    this.data.unlockedCards[cardId] = 2;
    return 2;
  }

  addCardCopies(cardId, count = 1) {
    this.data.unlockedCards[cardId] = (this.data.unlockedCards[cardId] || 0) + count;
    this.save();
  }

  // Open Booster Pack (contains 3 cards)
  openBoosterPack(packType = 'standard', cost = 100) {
    if (this.data.credits < cost) return { ok: false, msg: 'Crediti insufficienti per acquistare il pacchetto' };

    const data = window.MONOMYTHOS_DATA;
    if (!data) return { ok: false, msg: 'Dati gioco non caricati' };

    this.data.credits -= cost;

    // Gather eligible cards pool
    let pool = [];
    Object.keys(data.action_cards).forEach(h => {
      const cards = data.action_cards[h];
      if (packType === 'kinetic') {
        pool.push(...cards.filter(c => c.cat === 'Agilità' || c.cat === 'Potenza'));
      } else if (packType === 'techno') {
        pool.push(...cards.filter(c => c.cat === 'Intelligenza' || c.osc));
      } else {
        pool.push(...cards);
      }
    });

    if (pool.length === 0) pool = data.action_cards['Iron Aegis'];

    // Pick 3 random cards
    const pulled = [];
    for (let i = 0; i < 3; i++) {
      const card = pool[Math.floor(Math.random() * pool.length)];
      this.addCardCopies(card.id, 1);
      pulled.push(card);
    }

    this.save();
    return { ok: true, cards: pulled, credits: this.data.credits };
  }

  // Custom Decks management
  saveCustomDeck(deckName, heroName, deckCardsMap, heroCreation) {
    this.data.customDecks[deckName] = {
      hero: heroName,
      cards: { ...deckCardsMap },
      creation: heroCreation || null
    };
    this.data.activeDeckName = deckName;
    this.save();
    return true;
  }

  getCustomDeck(deckName) {
    return this.data.customDecks[deckName] || null;
  }

  getCustomDecksList() {
    return Object.keys(this.data.customDecks).map(name => ({
      name,
      ...this.data.customDecks[name]
    }));
  }

  getActiveDeckForHero(heroName) {
    if (this.data.activeDeckName && this.data.customDecks[this.data.activeDeckName]) {
      const active = this.data.customDecks[this.data.activeDeckName];
      if (active.hero === heroName) return active;
    }
    for (const name in this.data.customDecks) {
      if (this.data.customDecks[name].hero === heroName) {
        return this.data.customDecks[name];
      }
    }
    return null;
  }

  deleteCustomDeck(deckName) {
    delete this.data.customDecks[deckName];
    this.save();
  }
}

window.Progression = new ProgressionSystem();
