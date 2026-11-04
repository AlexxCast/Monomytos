# Prova: genera alcune immagini con Pollinations.ai (gratis) per confrontarle con Cloudflare
import sys, os, urllib.parse, urllib.request, time
sys.path.insert(0, os.path.dirname(__file__))
import genera_immagini_carte as g
SCENE = {
    'colosso': 'an enormous stone and metal colossus rising from city ruins, dust clouds, tiny silhouettes fleeing at its feet',
    'schiacciata': 'a heavy two-handed smash creating an orange shockwave ring on the ground',
    'ironaegis': 'an original armored hero in heavy blue and silver exo-armor seen from behind, standing guard with a hexagonal energy shield, helmet covering the head',
}
os.makedirs('prova', exist_ok=True)
for k, s in SCENE.items():
    p = f'{s}. {g.STYLE}. {g.RULES}'
    for model in ('flux', 'turbo'):
        url = 'https://image.pollinations.ai/prompt/' + urllib.parse.quote(p) + f'?width=640&height=896&model={model}&nologo=true&seed=7'
        for t in range(3):
            try:
                d = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'monomythos-prova'}), timeout=180).read()
                open(f'prova/{k}_{model}.jpg', 'wb').write(d); print(k, model, len(d)); break
            except Exception as e:
                print(k, model, 'errore', e); time.sleep(10)
