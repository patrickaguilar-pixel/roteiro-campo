# Roteiro de Campo: como funciona

Aplicativo de planejamento e acompanhamento das viagens de campo às estações do Igam (saída e retorno em Belo Horizonte).
Endereço: https://patrickaguilar-pixel.github.io/roteiro-campo/

## O que tem no repositório
- `index.html`, `sw.js`, `manifest.webmanifest` e ícones: o site publicado pelo GitHub Pages. **Não edite à mão**: são gerados pelo `build.py`.
- `src/`: as partes do app.
  - `head.html` (estilos), `body.html` (tela), `dados.html` (estações do Igam, limites e sedes municipais do IBGE, projetos iniciais), `libs.html` (Leaflet, SortableJS, piexifjs, fflate).
  - `app.js`: o planejador (o mesmo código da página HTML v29).
  - `campo.js`: barra de navegação do celular, telas Em campo / Registros / Menu e gravação das rotas percorridas.
  - `nuvem.js`: login com Google, controle de acesso da equipe e sincronização com o Firebase.
  - `pwa.css`: visual do aplicativo; `sw.js`: funcionamento sem internet; `firebase.json`: configuração pública do projeto Firebase.
- `build.py`: junta tudo. Uso: `python3 build.py .` na raiz do repositório.

## Onde ficam os dados
- **No aparelho**: tudo fica guardado no navegador/app (localStorage e IndexedDB). O app funciona sem internet.
- **Na nuvem (Firebase, projeto "Roteiro de Campo", plano gratuito Spark)**:
  - `equipe/roteiro/projetos/{id}`: cada projeto (etapas, visitas, anotações, hospedagens, gastos).
  - `equipe/roteiro/fotos/{id}` e `fotoPartes/{id}_{n}`: fotos (em partes de até 900 mil caracteres).
  - `equipe/roteiro/trajetos/{id}`: rotas percorridas gravadas pelo GPS.
  - `acesso/{email}`: quem pode usar (papel `admin` ou `equipe`, `ativo` true/false).
  - `pedidos/{email}`: pedidos de acesso pendentes.
- Alterações feitas ao mesmo tempo em aparelhos diferentes são juntadas por estação e por registro: vale a versão alterada por último em cada estação, e as fotos se somam.

## Acesso
- O administrador libera, bloqueia ou remove pessoas em **Menu → Equipe e acesso**.
- E-mails do domínio da equipe entram sozinhos como "Equipe" (definido nas Regras do Firestore).
- Quem é bloqueado tem os roteiros apagados do aparelho assim que se conecta.
- As Regras do Firestore ficam só no console do Firebase (não neste repositório).

## Limites conhecidos
- A gravação da rota precisa do app aberto e da tela ligada (o app mantém a tela acesa enquanto o GPS está ligado). Com o app fechado, o celular não entrega a posição.
- Mapas de fundo: ficam guardados no aparelho os pedaços já vistos com internet (até 60 dias).
- Firebase Spark: 1 GiB de dados, 50 mil leituras e 20 mil gravações por dia; se passar, pausa até o dia seguinte, sem cobrança.
