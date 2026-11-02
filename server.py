import os
import sys
import json
import socket
from aiohttp import web

sys.stdout.reconfigure(encoding='utf-8')

# Rooms dictionary: room_code -> { 'clients': set(), 'players': list() }
ROOMS = {}

async def ws_handler(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)

    current_room = None
    player_id = None

    try:
        async for msg in ws:
            if msg.type == web.WSMsgType.TEXT:
                try:
                    data = json.loads(msg.data)
                    mtype = data.get('type')
                    room_code = data.get('room')

                    if mtype in ['CREATE_ROOM', 'JOIN_ROOM']:
                        current_room = room_code
                        player_info = data.get('player', {})
                        player_id = player_info.get('id')

                        if room_code not in ROOMS:
                            ROOMS[room_code] = {'clients': set(), 'players': []}

                        ROOMS[room_code]['clients'].add(ws)
                        # Add or update player info
                        existing = [p for p in ROOMS[room_code]['players'] if p.get('id') == player_id]
                        if not existing:
                            ROOMS[room_code]['players'].append(player_info)

                        # Broadcast updated room state
                        update_msg = json.dumps({
                            'type': 'ROOM_UPDATED',
                            'room': room_code,
                            'players': ROOMS[room_code]['players']
                        })
                        for client in list(ROOMS[room_code]['clients']):
                            if not client.closed:
                                await client.send_str(update_msg)

                    elif current_room and current_room in ROOMS:
                        # Forward game actions to all peers in the room
                        raw_str = msg.data
                        for client in list(ROOMS[current_room]['clients']):
                            if client != ws and not client.closed:
                                await client.send_str(raw_str)

                except Exception as e:
                    print(f"Error handling message: {e}", flush=True)

    finally:
        if current_room and current_room in ROOMS:
            ROOMS[current_room]['clients'].discard(ws)
            if player_id:
                ROOMS[current_room]['players'] = [
                    p for p in ROOMS[current_room]['players'] if p.get('id') != player_id
                ]
            if len(ROOMS[current_room]['clients']) == 0:
                del ROOMS[current_room]
            else:
                # Notify remaining clients
                update_msg = json.dumps({
                    'type': 'ROOM_UPDATED',
                    'room': current_room,
                    'players': ROOMS[current_room]['players']
                })
                for client in list(ROOMS[current_room]['clients']):
                    if not client.closed:
                        await client.send_str(update_msg)

    return ws

def get_local_ips():
    ips = []
    try:
        hostname = socket.gethostname()
        for ip in socket.gethostbyname_ex(hostname)[2]:
            if not ip.startswith('127.'):
                ips.append(ip)
    except:
        pass
    return ips or ['127.0.0.1']

PLAYER_PROFILES = {}

@web.middleware
async def cors_and_cache_middleware(request, handler):
    if request.method == 'OPTIONS':
        resp = web.Response(status=204)
    else:
        resp = await handler(request)

    resp.headers['Access-Control-Allow-Origin'] = '*'
    resp.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, PUT, DELETE'
    resp.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'

    # Ensure dynamic scripts, CSS, and HTML are always fresh on mobile
    path = request.path.lower()
    if path.endswith(('.js', '.css', '.html', '.json')) or path in ['/', '/index.html']:
        resp.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        resp.headers['Pragma'] = 'no-cache'
        resp.headers['Expires'] = '0'
    else:
        resp.headers['Cache-Control'] = 'public, max-age=86400'

    return resp

def create_app():
    app = web.Application(middlewares=[cors_and_cache_middleware])
    current_dir = os.path.dirname(os.path.abspath(__file__))

    async def index_handler(request):
        return web.FileResponse(os.path.join(current_dir, 'index.html'))

    async def status_handler(request):
        return web.json_response({
            'status': 'online',
            'version': '1.0.1',
            'name': 'Monomythos Server',
            'rooms_active': len(ROOMS)
        })

    async def player_sync_handler(request):
        if request.method == 'POST':
            try:
                data = await request.json()
                pid = data.get('playerId', 'default')
                PLAYER_PROFILES[pid] = data
                return web.json_response({'ok': True, 'saved': True})
            except Exception as e:
                return web.json_response({'ok': False, 'error': str(e)}, status=400)
        else:
            pid = request.query.get('playerId', 'default')
            return web.json_response({'ok': True, 'profile': PLAYER_PROFILES.get(pid, {})})

    app.router.add_get('/', index_handler)
    app.router.add_get('/index.html', index_handler)
    app.router.add_get('/api/status', status_handler)
    app.router.add_get('/api/player_sync', player_sync_handler)
    app.router.add_post('/api/player_sync', player_sync_handler)
    app.router.add_get('/ws', ws_handler)

    # Static file routes
    app.router.add_static('/', current_dir, show_index=True)
    return app

if __name__ == '__main__':
    port = 8000
    ips = get_local_ips()
    app = create_app()

    print("\n" + "="*60)
    print("🔥 MONOMYTHOS MOBILE APP & MULTIPLAYER SERVER ATTIVO 🔥")
    print("="*60)
    print(f"• Locale PC:        http://localhost:{port}")
    for ip in ips:
        print(f"• Sul tuo Telefono: http://{ip}:{port}")
    print("="*60)
    print("Apri il link dal browser del telefono per giocare!")
    print("Le dinamiche di gioco e la grafica si aggiornano in tempo reale lato server!\n", flush=True)

    web.run_app(app, host='0.0.0.0', port=port)
