const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const apkSource = path.join(__dirname, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const capConfigPath = path.join(__dirname, 'capacitor.config.json');
const buildGradlePath = path.join(__dirname, 'android', 'app', 'build.gradle');
const manifestPath = path.join(__dirname, 'manifest.json');
const wwwDir = path.join(__dirname, 'www');

console.log("=========================================");
console.log("🤖 INICIANDO GERAÇÃO DOS APKs U&M");
console.log("=========================================\n");

try {
  // Salvar os arquivos originais para restaurar depois
  const originalConfig = fs.readFileSync(capConfigPath, 'utf8');
  const originalBuildGradle = fs.readFileSync(buildGradlePath, 'utf8');
  const originalManifest = fs.readFileSync(manifestPath, 'utf8');

  let config = JSON.parse(originalConfig);
  let manifest = JSON.parse(originalManifest);

  // Helper para atualizar o manifest no www/ também
  function writeManifest(name, shortName, startUrl) {
    const m = { ...manifest, name, short_name: shortName, start_url: startUrl };
    const content = JSON.stringify(m, null, 2);
    fs.writeFileSync(manifestPath, content);
    // Garantir que o www/ também seja atualizado APÓS o build:web
  }

  // Helper para compilar e copiar APK
  function buildAndCopyApk(destName) {
    execSync('npm run build:web', { stdio: 'inherit' });
    execSync('npx cap sync android', { stdio: 'inherit' });
    console.log(`⏳ Compilando Android (${destName})...`);
    execSync('cd android && gradlew.bat assembleDebug', { stdio: 'inherit', shell: true });
    const destPath = path.join(__dirname, destName);
    fs.copyFileSync(apkSource, destPath);
    console.log(`✅ SUCESSO: '${destName}' gerado!\n`);
  }

  // ---------------------------------------------------------
  // 1. APK DE CAMPO - "U&M Campo"
  // ---------------------------------------------------------
  console.log("📌 ETAPA 1: Gerando APK do App de Campo...");

  config.appName = "U&M Campo";
  config.appId = "br.com.elisonaraujo.umcampo";
  fs.writeFileSync(capConfigPath, JSON.stringify(config, null, 2));

  let campoGradle = originalBuildGradle.replace(
    /applicationId ".*"/,
    'applicationId "br.com.elisonaraujo.umcampo"'
  );
  fs.writeFileSync(buildGradlePath, campoGradle);

  writeManifest("U&M Campo", "U&M Campo", "./index.html");

  // Garantir que index.html é o entry point
  const wwwIndex = path.join(wwwDir, 'index.html');
  buildAndCopyApk('U&M_Campo.apk');

  // ---------------------------------------------------------
  // 2. APK DO PCM - "U&M PCM"
  // ---------------------------------------------------------
  console.log("📌 ETAPA 2: Gerando APK do Painel PCM...");

  config.appName = "U&M PCM";
  config.appId = "br.com.elisonaraujo.umpcm";
  fs.writeFileSync(capConfigPath, JSON.stringify(config, null, 2));

  let pcmGradle = originalBuildGradle.replace(
    /applicationId ".*"/,
    'applicationId "br.com.elisonaraujo.umpcm"'
  );
  fs.writeFileSync(buildGradlePath, pcmGradle);

  writeManifest("U&M PCM", "U&M PCM", "./pcm.html");

  // Primeiro faz o build:web normal, depois substitui o index.html pelo pcm.html
  execSync('npm run build:web', { stdio: 'inherit' });
  fs.copyFileSync(path.join(__dirname, 'pcm.html'), path.join(wwwDir, 'index.html'));
  // Atualizar manifest.json no www também
  const pcmManifest = { ...manifest, name: "U&M PCM", short_name: "U&M PCM", start_url: "./index.html" };
  fs.writeFileSync(path.join(wwwDir, 'manifest.json'), JSON.stringify(pcmManifest, null, 2));

  execSync('npx cap sync android', { stdio: 'inherit' });
  console.log("⏳ Compilando Android (U&M PCM)...");
  execSync('cd android && gradlew.bat assembleDebug', { stdio: 'inherit', shell: true });
  fs.copyFileSync(apkSource, path.join(__dirname, 'U&M_PCM.apk'));
  console.log("✅ SUCESSO: 'U&M_PCM.apk' gerado!\n");

  // ---------------------------------------------------------
  // 3. APK DO ALMOXARIFADO - "U&M Almoxarifado"
  // ---------------------------------------------------------
  console.log("📌 ETAPA 3: Gerando APK do Almoxarifado...");

  config.appName = "U&M Almoxarifado";
  config.appId = "br.com.elisonaraujo.umalmoxarifado";
  fs.writeFileSync(capConfigPath, JSON.stringify(config, null, 2));

  let almoxGradle = originalBuildGradle.replace(
    /applicationId ".*"/,
    'applicationId "br.com.elisonaraujo.umalmoxarifado"'
  );
  fs.writeFileSync(buildGradlePath, almoxGradle);

  writeManifest("U&M Almoxarifado", "U&M Almox", "./almoxarifado.html");

  execSync('npm run build:web', { stdio: 'inherit' });
  fs.copyFileSync(path.join(__dirname, 'almoxarifado.html'), path.join(wwwDir, 'index.html'));
  const almoxManifest = { ...manifest, name: "U&M Almoxarifado", short_name: "U&M Almox", start_url: "./index.html" };
  fs.writeFileSync(path.join(wwwDir, 'manifest.json'), JSON.stringify(almoxManifest, null, 2));

  execSync('npx cap sync android', { stdio: 'inherit' });
  console.log("⏳ Compilando Android (U&M Almoxarifado)...");
  execSync('cd android && gradlew.bat assembleDebug', { stdio: 'inherit', shell: true });
  fs.copyFileSync(apkSource, path.join(__dirname, 'U&M_Almoxarifado.apk'));
  console.log("✅ SUCESSO: 'U&M_Almoxarifado.apk' gerado!\n");

  // ---------------------------------------------------------
  // RESTAURAÇÃO DOS ORIGINAIS
  // ---------------------------------------------------------
  fs.writeFileSync(capConfigPath, originalConfig);
  fs.writeFileSync(buildGradlePath, originalBuildGradle);
  fs.writeFileSync(manifestPath, originalManifest);
  execSync('npm run build:web', { stdio: 'ignore' });

  console.log("==============================================");
  console.log("🎉 TODOS OS APKs GERADOS COM SUCESSO!");
  console.log("   📱 U&M_Campo.apk         → App para os operadores");
  console.log("   📊 U&M_PCM.apk           → Painel Administrativo");
  console.log("   🏭 U&M_Almoxarifado.apk  → Almoxarifado");
  console.log("==============================================");

} catch (error) {
  console.error("❌ Erro na geração dos APKs:");
  console.error(error.message);
}
