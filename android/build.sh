#!/bin/bash
# Monta o APK do Roteiro de Campo sem Android Studio: aapt2 (recursos) + javac + d8 (dex) + zipalign + assinatura.
set -euo pipefail
cd "$(dirname "$0")"
T=/home/claude/apk/tools
VC=${1:-1}; VN=${2:-1.0}
rm -rf out && mkdir -p out/classes out/stubs
$T/aapt2 compile --dir res -o out/res.zip
$T/aapt2 link -o out/base.apk -I $T/android-framework-34.jar --manifest AndroidManifest.xml \
   --min-sdk-version 24 --target-sdk-version 34 --version-code $VC --version-name "$VN" out/res.zip
javac -nowarn -Xlint:none --release 8 -d out/stubs $(find stubs -name '*.java') 2>&1 | grep -v 'JAVA_TOOL\|obsolete\|warning' || true
javac -nowarn -Xlint:none --release 8 -cp out/stubs -d out/classes $(find src -name '*.java') 2>&1 | grep -v 'JAVA_TOOL\|obsolete\|warnings\|options' || true
test -f out/classes/br/roteiro/campo/MainActivity.class
python3 $T/stripmp.py $(find out/classes -name "*.class")
(cd out/stubs && jar cf ../stubs.jar .)
$(cat /home/claude/apk/d8cmd) --release --min-api 24 --lib out/stubs.jar --output out $(find out/classes -name '*.class') 2>&1 | grep -v JAVA_TOOL || true
test -f out/classes.dex
cp out/base.apk out/semassinatura.apk
(cd out && zip -q -0 semassinatura.apk classes.dex)
repro-apk zipalign out/semassinatura.apk out/alinhado.apk
node $T/sign.mjs out/alinhado.apk out/RoteiroCampo.apk
echo OK
