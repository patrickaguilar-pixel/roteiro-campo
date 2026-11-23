"""Gera o site do Roteiro de Campo (index.html, sw.js, manifest e ícones) a partir de src/.
Uso: python3 build.py [pasta_de_saida]   (padrão: a raiz do repositório)"""
import json, os, sys, time, shutil
R = os.path.dirname(os.path.abspath(__file__)); S = os.path.join(R, 'src')
OUT = sys.argv[1] if len(sys.argv) > 1 else R
os.makedirs(OUT, exist_ok=True)
ler = lambda n: open(os.path.join(S, n), encoding='utf-8').read()
VERSAO = '42'
DATA = time.strftime('%d/%m/%Y')
cfg_path = os.path.join(S, 'firebase.json')
cfg = json.load(open(cfg_path)) if os.path.exists(cfg_path) else None

gm_path = os.path.join(S, 'google.txt')   # chave da Maps JavaScript API (restrita ao site); vazio = sem mapa do Google
gmk = open(gm_path).read().strip() if os.path.exists(gm_path) else ''
drv_path = os.path.join(S, 'drive.txt')  # endereço do Apps Script que salva no Drive; vazio = desligado
drv = open(drv_path).read().strip() if os.path.exists(drv_path) else ''
head, body = ler('head.html'), ler('body.html')
def rep(s, a, b):
    assert a in s, 'trecho não encontrado: ' + a[:80]
    return s.replace(a, b, 1)
meta = '''<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<link rel="manifest" href="manifest.webmanifest">
<meta name="theme-color" content="#0B6B45">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Roteiro">
<meta name="description" content="Roteiro de campo das estações do Igam: planejamento, GPS, visitas, fotos e rotas percorridas.">
<link rel="apple-touch-icon" href="apple-touch-icon.png">'''
head = rep(head, '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">', meta)
head = rep(head, '<title>Roteiro das estações pluviométricas e fluviométricas</title>', '<title>Roteiro de Campo</title>')
import re as _re
head = _re.sub(r'<link rel="icon" href="data:image/svg\+xml,[^"]*">', '<link rel="icon" type="image/png" sizes="64x64" href="favicon.png"><link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">', head, count=1)
assert 'href="favicon.png"' in head
i = head.rfind('</style>'); head = head[:i] + ler('pwa.css') + ler('celular.css') + head[i:]
body = rep(body, 'Versão 29 · 09/10/2026', f'Versão {VERSAO} · app · {DATA}')
body = rep(body, 'Alterações ficam salvas neste navegador.', 'Alterações ficam salvas no aparelho e, com a conta da equipe, na nuvem.')
app = ler('app.js') + ler('campo.js') + ler('celular.js')
assert '</script' not in app.lower().replace('<\\/script', ''), 'o código do app não pode conter </script>'
html = (head + body + ler('dados.html') + ler('libs.html') +
        f'<script>window.RC_FIREBASE={json.dumps(cfg)};window.RC_GMAPS={json.dumps(gmk)};window.RC_DRIVE={json.dumps(drv)};</script>\n' +
        '<script>' + ler('nuvem.js') + '</script>\n' +
        '<script type="text/plain" id="app-js">' + app + '</script>\n</body>\n</html>\n')
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(html)
open(os.path.join(OUT, 'sw.js'), 'w', encoding='utf-8').write(ler('sw.js').replace('__VERSAO__', VERSAO + '-' + str(int(time.time()))))
json.dump({"name":"Roteiro de Campo","short_name":"Roteiro","description":"Roteiro de campo das estações do Igam",
  "start_url":"./","scope":"./","display":"standalone","orientation":"any","background_color":"#F3F6F4","theme_color":"#0B6B45","lang":"pt-BR",
  "icons":[{"src":"icon-192.png","sizes":"192x192","type":"image/png","purpose":"any"},{"src":"icon-512.png","sizes":"512x512","type":"image/png","purpose":"any"},
           {"src":"icon-maskable-512.png","sizes":"512x512","type":"image/png","purpose":"maskable"}]},
  open(os.path.join(OUT, 'manifest.webmanifest'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
lg = ler('login-app.html').replace('<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"></script>', f'<script>window.RC_FIREBASE={json.dumps(cfg)};</script>\n<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"></script>', 1)
open(os.path.join(OUT, 'login-app.html'), 'w', encoding='utf-8').write(lg)
for f in ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'favicon.png']:
    if os.path.exists(os.path.join(S, 'icones', f)): shutil.copy(os.path.join(S, 'icones', f), OUT)
print('ok', OUT, len(html), 'bytes', 'firebase' if cfg else 'sem firebase (modo local)')
