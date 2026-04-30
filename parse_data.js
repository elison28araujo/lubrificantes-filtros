// Script para extrair dados dos HTMLs exportados da planilha e gerar data.js.
const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, 'FORM_117 (1).xlsx~1');
const EMPTY = '-';

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function cleanText(value) {
  return decodeEntities(String(value || ''))
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeValue(value) {
  const text = cleanText(value);
  if (!text || text === '-' || text === '--') return EMPTY;
  return text;
}

function parseTable(html) {
  const rows = [];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;

  while ((trMatch = trRegex.exec(html)) !== null) {
    const cells = [];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let tdMatch;

    while ((tdMatch = tdRegex.exec(trMatch[1])) !== null) {
      cells.push(cleanText(tdMatch[1]));
    }

    if (cells.length > 0) rows.push(cells);
  }

  return rows;
}

function shouldSkipRow(category, model) {
  const cat = String(category || '').trim().toUpperCase();
  const mdl = String(model || '').trim().toUpperCase();

  return (
    !cat ||
    !mdl ||
    cat === 'CATEGORIA' ||
    mdl === 'MODELO' ||
    cat.includes('FORM') ||
    cat.includes('APENAS') ||
    cat.includes('QUANTIDADE') ||
    cat.includes('* A QUANTIDADE')
  );
}

function readRows(fileName) {
  const filePath = path.join(SOURCE_DIR, fileName);
  const html = fs.readFileSync(filePath, 'utf8');
  return parseTable(html);
}

function parseFiltros() {
  const rows = readRows('FILTROS.html');
  const filtros = [];

  for (const row of rows) {
    // Colunas: Categoria, Modelo, Sistema, Descricao SAP, Aplicacao, Qtd., Original, Fleetguard, SAP
    if (row.length < 9 || shouldSkipRow(row[0], row[1])) continue;

    filtros.push({
      categoria: normalizeValue(row[0]).toUpperCase(),
      modelo: normalizeValue(row[1]),
      sistema: normalizeValue(row[2]),
      descricaoSap: normalizeValue(row[3]),
      aplicacao: normalizeValue(row[4]),
      qtd: normalizeValue(row[5]),
      original: normalizeValue(row[6]),
      fleetguard: normalizeValue(row[7]),
      sap: normalizeValue(row[8]),
    });
  }

  return filtros;
}

function parseLubrificantes() {
  const rows = readRows('LUBRIFICANTES.html');
  const lubrificantes = [];

  for (const row of rows) {
    // Colunas: Categoria, Modelo, Compartimento, Quantidade, Periodicidade, Viscosidade, Petronas
    if (row.length < 7 || shouldSkipRow(row[0], row[1])) continue;

    lubrificantes.push({
      categoria: normalizeValue(row[0]).toUpperCase(),
      modelo: normalizeValue(row[1]),
      compartimento: normalizeValue(row[2]),
      quantidade: normalizeValue(row[3]),
      periodicidade: normalizeValue(row[4]),
      viscosidade: normalizeValue(row[5]),
      petronas: normalizeValue(row[6]),
    });
  }

  return lubrificantes;
}

function titleCase(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/(^|\s|\/|-)([a-z\u00c0-\u017f])/g, (_, prefix, letter) => prefix + letter.toUpperCase());
}

function getIcon(category) {
  const cat = String(category || '').toUpperCase();
  if (cat.includes('TRUCK')) return '🚚';
  if (cat.includes('EXCAVATOR')) return '🏗️';
  if (cat.includes('GRADER')) return '🚜';
  if (cat.includes('DOZER')) return '🚜';
  if (cat.includes('VEHICLE')) return '🚗';
  if (cat.includes('GENERATOR')) return '⚡';
  return '⚙️';
}

function colorFromText(text) {
  const colors = ['blue', 'gold', 'green', 'purple', 'orange', 'red'];
  let hash = 0;
  for (const char of String(text || '')) hash = (hash + char.charCodeAt(0)) % colors.length;
  return colors[hash];
}

function buildFilterLabel(item) {
  const parts = [];
  if (item.fleetguard !== EMPTY) parts.push(`Fleetguard: ${item.fleetguard}`);
  if (item.original !== EMPTY) parts.push(`Original: ${item.original}`);
  if (item.sap !== EMPTY) parts.push(`SAP: ${item.sap}`);
  if (item.qtd !== EMPTY) parts.push(`Qtd.: ${item.qtd}`);
  return parts.length ? parts.join(' | ') : item.descricaoSap;
}

function addEquipment(map, category, model) {
  const key = `${category}::${model}`;

  if (!map.has(key)) {
    map.set(key, {
      id: map.size + 1,
      nome: model,
      modelo: titleCase(category),
      categoria: category,
      icone: getIcon(category),
      cor: colorFromText(category),
      compartimentos: [],
    });
  }

  return map.get(key);
}

function buildEquipamentos(filtros, lubrificantes) {
  const map = new Map();

  for (const item of filtros) {
    const equip = addEquipment(map, item.categoria, item.modelo);
    const nameParts = [item.sistema, item.aplicacao].filter(part => part && part !== EMPTY);

    equip.compartimentos.push({
      nome: nameParts.join(' - ') || item.descricaoSap || 'Filtro',
      cor: colorFromText(item.sistema),
      filtro: buildFilterLabel(item),
      fluido: EMPTY,
      capacidade: item.qtd !== EMPTY ? `Qtd.: ${item.qtd}` : EMPTY,
      viscosidade: EMPTY,
      descricao: item.descricaoSap,
    });
  }

  for (const item of lubrificantes) {
    const equip = addEquipment(map, item.categoria, item.modelo);

    equip.compartimentos.push({
      nome: item.compartimento,
      cor: colorFromText(item.compartimento),
      filtro: EMPTY,
      fluido: item.petronas,
      capacidade: item.quantidade !== EMPTY ? `${item.quantidade} L` : EMPTY,
      viscosidade: item.viscosidade,
      periodicidade: item.periodicidade,
    });
  }

  return [...map.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

function writeDataFile({ filtros, lubrificantes, equipamentos }) {
  const categoriasFiltros = [...new Set(filtros.map(item => item.categoria))].sort();
  const categoriasLubrificantes = [...new Set(lubrificantes.map(item => item.categoria))].sort();
  const modelosFiltros = [...new Set(filtros.map(item => item.modelo))].sort();
  const modelosLubrificantes = [...new Set(lubrificantes.map(item => item.modelo))].sort();
  const todosModelos = [...new Set([...modelosFiltros, ...modelosLubrificantes])].sort();
  const todasCategorias = [...new Set([...categoriasFiltros, ...categoriasLubrificantes])].sort();

  const output = `// =============================================
// DADOS - LUBRIFICANTES E FILTROS
// Gerado automaticamente a partir dos arquivos HTML da planilha
// Fonte: FORM_117 (1).xlsx~1/FILTROS.html e LUBRIFICANTES.html
// =============================================

const DADOS_FILTROS = ${JSON.stringify(filtros, null, 2)};

const DADOS_LUBRIFICANTES = ${JSON.stringify(lubrificantes, null, 2)};

const EQUIPAMENTOS = ${JSON.stringify(equipamentos, null, 2)};

const CATEGORIAS_FILTROS = ${JSON.stringify(categoriasFiltros, null, 2)};
const CATEGORIAS_LUBRIFICANTES = ${JSON.stringify(categoriasLubrificantes, null, 2)};
const MODELOS_FILTROS = ${JSON.stringify(modelosFiltros, null, 2)};
const MODELOS_LUBRIFICANTES = ${JSON.stringify(modelosLubrificantes, null, 2)};
const TODOS_MODELOS = ${JSON.stringify(todosModelos, null, 2)};
const TODAS_CATEGORIAS = ${JSON.stringify(todasCategorias, null, 2)};

const COR_BADGE = {
  blue:   { bg: "rgba(37,99,235,0.15)",   border: "rgba(37,99,235,0.3)",   text: "#93c5fd" },
  gold:   { bg: "rgba(245,158,11,0.15)",  border: "rgba(245,158,11,0.3)",  text: "#fcd34d" },
  green:  { bg: "rgba(16,185,129,0.15)",  border: "rgba(16,185,129,0.3)",  text: "#86efac" },
  purple: { bg: "rgba(139,92,246,0.15)",  border: "rgba(139,92,246,0.3)",  text: "#c4b5fd" },
  orange: { bg: "rgba(249,115,22,0.15)",  border: "rgba(249,115,22,0.3)",  text: "#fdba74" },
  red:    { bg: "rgba(239,68,68,0.15)",   border: "rgba(239,68,68,0.3)",   text: "#fca5a5" }
};
`;

  fs.writeFileSync(path.join(__dirname, 'data.js'), output, 'utf8');

  return {
    categoriasFiltros,
    categoriasLubrificantes,
    modelosFiltros,
    modelosLubrificantes,
    todosModelos,
    todasCategorias,
  };
}

const filtros = parseFiltros();
const lubrificantes = parseLubrificantes();
const equipamentos = buildEquipamentos(filtros, lubrificantes);
const stats = writeDataFile({ filtros, lubrificantes, equipamentos });

console.log('=== DADOS EXTRAIDOS ===');
console.log(`Filtros: ${filtros.length} registros`);
console.log(`Lubrificantes: ${lubrificantes.length} registros`);
console.log(`Equipamentos: ${equipamentos.length}`);
console.log(`Categorias filtros: ${stats.categoriasFiltros.length}`);
console.log(`Categorias lubrificantes: ${stats.categoriasLubrificantes.length}`);
console.log(`Modelos filtros: ${stats.modelosFiltros.length}`);
console.log(`Modelos lubrificantes: ${stats.modelosLubrificantes.length}`);
console.log('');
console.log('Arquivo data.js gerado com sucesso!');
