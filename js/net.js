// Monomythos Network & Online Multiplayer Layer (WebSocket + PeerJS WebRTC Fallback)
class MultiplayerNetwork {
  constructor() {
    this.mode = 'solo'; // 'solo', 'websocket', 'peerjs'
    this.roomCode = null;
    this.isHost = false;
    this.localPlayerId = null;
    this.players = [];
    this.ws = null;
    this.peer = null;
    this.connections = [];
    this.callbacks = {};
  }

  on(event, cb) {
    if (!this.callbacks[event]) this.callbacks[event] = [];
    this.callbacks[event].push(cb);
  }

  emit(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(cb => cb(data));
    }
  }

  // Generate random 4-char room code
  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Initialize Room as Host
  createRoom(playerName, heroName) {
    this.roomCode = this.generateRoomCode();
    this.isHost = true;
    this.localPlayerId = 'p_0';
    this.players = [{
      id: this.localPlayerId,
      name: playerName || 'Host',
      hero: heroName || 'Iron Aegis',
      ready: true,
      isHost: true
    }];

    this.connectTransport();
    return this.roomCode;
  }

  // Join Existing Room
  joinRoom(code, playerName, heroName) {
    this.roomCode = code.toUpperCase().trim();
    this.isHost = false;
    this.localPlayerId = `p_${Date.now() % 1000}`;
    this.connectTransport(playerName, heroName);
  }

  connectTransport(playerName, heroName) {
    let targetHost = window.location.host;
    let isSecure = window.location.protocol === 'https:';

    // If loaded from local APK shell or host is empty, use configured remote server
    if (!targetHost || window.location.protocol === 'file:') {
      let serverUrl = '';
      if (window.AndroidBridge && typeof window.AndroidBridge.getServerUrl === 'function') {
        serverUrl = window.AndroidBridge.getServerUrl();
      } else {
        serverUrl = localStorage.getItem('monomythos_server_url') || '';
      }
      if (serverUrl) {
        try {
          const parsed = new URL(serverUrl);
          targetHost = parsed.host;
          isSecure = parsed.protocol === 'https:';
        } catch(e) {}
      }
    }

    const protocol = isSecure ? 'wss:' : 'ws:';
    const wsUrl = targetHost ? `${protocol}//${targetHost}/ws` : null;
    if (!wsUrl) {
      this.initWebRTCFallback(playerName, heroName);
      return;
    }

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('Connected to WebSocket server');
        this.mode = 'websocket';
        this.ws.send(JSON.stringify({
          type: this.isHost ? 'CREATE_ROOM' : 'JOIN_ROOM',
          room: this.roomCode,
          player: {
            id: this.localPlayerId,
            name: playerName || 'Ospite',
            hero: heroName || 'Neon Phantom',
            isHost: this.isHost
          }
        }));
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleIncomingMessage(msg);
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      this.ws.onerror = () => {
        console.log('WebSocket not available, falling back to WebRTC / Local');
        this.initWebRTCFallback(playerName, heroName);
      };
    } catch (e) {
      this.initWebRTCFallback(playerName, heroName);
    }
  }

  initWebRTCFallback(playerName, heroName) {
    // If PeerJS is available in global scope, use serverless WebRTC
    if (typeof Peer !== 'undefined') {
      this.mode = 'peerjs';
      const peerId = this.isHost ? `monomyth_${this.roomCode}` : undefined;
      
      this.peer = new Peer(peerId, {
        debug: 1
      });

      this.peer.on('open', (id) => {
        console.log('PeerJS ready with ID:', id);
        if (!this.isHost) {
          // Connect to host
          const hostId = `monomyth_${this.roomCode}`;
          const conn = this.peer.connect(hostId);
          conn.on('open', () => {
            this.connections.push(conn);
            conn.send({
              type: 'JOIN_ROOM',
              player: {
                id: this.localPlayerId,
                name: playerName || 'Ospite',
                hero: heroName || 'Neon Phantom'
              }
            });
          });
          conn.on('data', (data) => this.handleIncomingMessage(data));
        }
      });

      this.peer.on('connection', (conn) => {
        this.connections.push(conn);
        conn.on('data', (data) => this.handleIncomingMessage(data));
      });
    } else {
      this.initHttpPollingFallback(playerName, heroName);
    }
  }

  initHttpPollingFallback(playerName, heroName) {
    console.log('Using Altervista/HTTP Polling multiplayer relay');
    this.mode = 'http_polling';
    let targetUrl = window.location.origin;
    if (window.AndroidBridge && typeof window.AndroidBridge.getServerUrl === 'function') {
      targetUrl = window.AndroidBridge.getServerUrl();
    } else if (localStorage.getItem('monomythos_server_url')) {
      targetUrl = localStorage.getItem('monomythos_server_url');
    }

    const payload = {
      type: this.isHost ? 'CREATE_ROOM' : 'JOIN_ROOM',
      room: this.roomCode,
      player: {
        id: this.localPlayerId,
        name: playerName || (this.isHost ? 'Host' : 'Ospite'),
        hero: heroName || 'Neon Phantom',
        isHost: this.isHost
      }
    };

    fetch(`${targetUrl}/api/rooms.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});

    if (this._pollTimer) clearInterval(this._pollTimer);
    this._pollTimer = setInterval(() => {
      if (!this.roomCode) return;
      fetch(`${targetUrl}/api/rooms.php?room=${this.roomCode}`)
        .then(r => r.json())
        .then(res => {
          if (res.ok && res.room) {
            this.handleIncomingMessage({
              type: 'ROOM_UPDATED',
              room: this.roomCode,
              players: res.room.players
            });
            if (res.room.events && res.room.events.length > 0) {
              const lastEvt = res.room.events[res.room.events.length - 1];
              if (lastEvt.id !== this._lastProcessedEvtId && lastEvt.sender !== this.localPlayerId) {
                this._lastProcessedEvtId = lastEvt.id;
                this.handleIncomingMessage(lastEvt.data);
              }
            }
          }
        }).catch(() => {});
    }, 1500);
  }

  // Broadcast message to all room participants
  broadcast(type, payload = {}) {
    const msg = { type, room: this.roomCode, sender: this.localPlayerId, payload };

    if (this.mode === 'websocket' && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else if (this.mode === 'peerjs') {
      this.connections.forEach(conn => {
        if (conn.open) conn.send(msg);
      });
    } else if (this.mode === 'http_polling') {
      let targetUrl = window.location.origin;
      if (window.AndroidBridge && typeof window.AndroidBridge.getServerUrl === 'function') {
        targetUrl = window.AndroidBridge.getServerUrl();
      } else if (localStorage.getItem('monomythos_server_url')) {
        targetUrl = localStorage.getItem('monomythos_server_url');
      }
      fetch(`${targetUrl}/api/rooms.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'GAME_EVENT',
          room: this.roomCode,
          sender: this.localPlayerId,
          data: msg
        })
      }).catch(() => {});
    }

    // Always deliver to local engine
    this.handleIncomingMessage(msg);
  }

  handleIncomingMessage(msg) {
    console.log('Net Msg:', msg.type, msg);

    switch (msg.type) {
      case 'ROOM_UPDATED':
        this.players = msg.players || [];
        this.emit('lobby_updated', this.players);
        break;

      case 'GAME_START':
        this.emit('remote_game_start', msg.payload);
        break;

      case 'ACTION_PLAY':
        this.emit('remote_card_play', msg.payload);
        break;

      case 'ACTION_SACRIFICE':
        this.emit('remote_sacrifice', msg.payload);
        break;

      case 'ACTION_PB':
        this.emit('remote_pb', msg.payload);
        break;

      case 'ACTION_ENDTURN':
        this.emit('remote_endturn', msg.payload);
        break;

      case 'SYNC_STATE':
        this.emit('remote_sync', msg.payload);
        break;

      case 'CHAT_PING':
        this.emit('remote_chat_ping', msg.payload);
        break;
    }
  }
}

window.NetEngine = new MultiplayerNetwork();
