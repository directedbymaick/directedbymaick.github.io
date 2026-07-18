import fs from 'node:fs/promises';
import path from 'node:path';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';

const workbook = Workbook.create();

const palette = {
  ink: '#1F1A17',
  paper: '#F7F2EA',
  gold: '#B8873A',
  dark: '#211814',
  muted: '#E9DED0',
  vasar: '#D7B66A',
  exar: '#B33A34',
  eshar: '#8C6BB1',
  morar: '#7EA7BD',
  velar: '#E2A93B',
  header: '#33231C',
  input: '#FFF8DC',
  formula: '#EAF3F8',
};

const factions = {
  Vasar: { role: 'Majeure', color: palette.vasar, kit: 'Sacré', promptRef: '[SACRED_REFS]' },
  Exar: { role: 'Majeure', color: palette.exar, kit: 'Menace', promptRef: '[MENACE_REFS]' },
  Eshar: { role: 'Mineure', color: palette.eshar, kit: 'Spectre', promptRef: '[SPECTRE_REFS]' },
  Morar: { role: 'Mineure', color: palette.morar, kit: 'Exil', promptRef: '[EXIL_REFS]' },
  Velar: { role: 'Mineure', color: palette.velar, kit: 'Soleil', promptRef: '[SOLEIL_REFS]' },
};

const rarityPlans = [
  ['Vasar', 9, 6, 4, 2, 1],
  ['Exar', 9, 6, 4, 2, 1],
  ['Eshar', 3, 1, 1, 1, 0],
  ['Morar', 3, 1, 1, 0, 0],
  ['Velar', 2, 2, 0, 1, 0],
];

const rarityLabels = [
  ['Commune', 'C'],
  ['Rare', 'R'],
  ['Épique', 'E'],
  ['Légendaire', 'L'],
  ['Prismatique', 'P'],
];

const roleByFaction = {
  Vasar: ['Serment / protection', 'Buff de masse', 'Récitation / tempo lent', 'Punition Prononcer', 'Stabilisation'],
  Exar: ['Rupture / sacrifice', 'Destruction ciblée', 'Prononcer fort', 'Auto-dégâts', 'Finisher'],
  Eshar: ['Mémoire / pioche', 'Information', 'Exil contrôlé', 'Écho de défausse'],
  Morar: ['Mutation', 'Réduction de coût', 'Adaptation défensive', 'Mode flexible'],
  Velar: ['Élan', 'Dégâts directs', 'Pression rapide', 'Pic de Volonté'],
};

const haloByRarity = {
  Commune: 'Halo simple',
  Rare: 'Halo + symbole',
  Épique: 'Halo complexe',
  Légendaire: 'Halo mythique',
  Prismatique: 'Halo ultime / éclipse',
};

const ornamentByRarity = {
  Commune: 'Faible',
  Rare: 'Moyenne',
  Épique: 'Forte',
  Légendaire: 'Très forte',
  Prismatique: 'Ultime',
};

function defaultKind(index, rarity) {
  if (rarity === 'Prismatique' || rarity === 'Légendaire') return 'Être';
  return index % 4 === 0 ? 'Verbe' : 'Être';
}

function suggestedCost(index, rarity, kind) {
  if (kind === 'Verbe') return Math.max(1, (index % 5) + 1);
  const base = { Commune: 2, Rare: 3, Épique: 4, Légendaire: 5, Prismatique: 7 }[rarity];
  return Math.min(10, base + (index % 3));
}

function suggestedStats(cost, rarity, kind) {
  if (kind === 'Verbe') return ['', ''];
  const bonus = { Commune: 0, Rare: 1, Épique: 1, Légendaire: 2, Prismatique: 2 }[rarity];
  const total = cost * 2 + bonus;
  const atk = Math.max(1, Math.floor(total / 2));
  const integrity = total - atk;
  return [atk, integrity];
}

function promptSeed(faction, rarity) {
  const base = {
    Vasar: 'sacred guardian, ivory ceremonial robe, golden halo, thin gold chains, warm ivory palette',
    Exar: 'fallen war-priest, cracked halo, bone crown, black ritual marks, deep crimson palette',
    Eshar: 'masked ghost oracle, pale moon halo, white moths, translucent veil, muted violet palette',
    Morar: 'fallen street angel, oversized bomber jacket, tarnished halo, black wings, pastel blue palette',
    Velar: 'radiant rebel angel, glass wings, sun halo, gold jewelry, hard daylight palette',
  }[faction];
  if (rarity === 'Prismatique') {
    return `iconic ${base}, symmetrical frontal pose, massive eclipse halo, floating gold fragments, ornate sacred geometry, radiant prism light accents, mythic stillness, high ornament density, clean graphic illustration, flat background, premium collector trading card art --sref ${factions[faction].promptRef} --sw 200 --no text, logo, watermark`;
  }
  return `${base}, calm pose, clean graphic illustration, flat background, generous negative space, full-art trading card composition --sref ${factions[faction].promptRef} --sw 200 --no text, logo, watermark`;
}

const rows = [];
for (const [faction, common, rare, epic, legendary, prism] of rarityPlans) {
  const counts = [common, rare, epic, legendary, prism];
  let factionIndex = 1;
  for (let r = 0; r < counts.length; r++) {
    const [rarity, code] = rarityLabels[r];
    for (let i = 0; i < counts[r]; i++) {
      const slotPrefix = faction === 'Exar' ? 'X' : faction === 'Velar' ? 'S' : faction[0];
      const slot = `${slotPrefix}${String(factionIndex).padStart(2, '0')}`;
      const kind = defaultKind(factionIndex, rarity);
      const cost = suggestedCost(factionIndex, rarity, kind);
      const [attack, integrity] = suggestedStats(cost, rarity, kind);
      const roleList = roleByFaction[faction];
      const role = roleList[(factionIndex - 1) % roleList.length];
      rows.push([
        slot,
        faction,
        factions[faction].role,
        factions[faction].kit,
        rarity,
        code,
        kind,
        cost,
        attack,
        integrity,
        '',
        '',
        role,
        haloByRarity[rarity],
        ornamentByRarity[rarity],
        'À nommer',
        '',
        promptSeed(faction, rarity),
        'À concevoir',
        '',
      ]);
      factionIndex++;
    }
  }
}

const headers = [
  'Slot',
  'Peuple',
  'Camp',
  'Kit visuel',
  'Rareté',
  'Code',
  'Type',
  'Coût',
  'ATQ',
  'Intégrité',
  'Mot-clé',
  'Prononcer',
  'Rôle gameplay',
  'Halo',
  'Densité',
  'Nom carte',
  'Texte règle',
  'Prompt MJ',
  'Statut',
  'Notes',
];

const dashboard = workbook.worksheets.add('Dashboard');
const setSheet = workbook.worksheets.add('Set 01');
const lists = workbook.worksheets.add('Listes');
const balance = workbook.worksheets.add('Balance');
const promptSheet = workbook.worksheets.add('Prompts');

for (const sheet of [dashboard, setSheet, lists, balance, promptSheet]) {
  sheet.showGridLines = false;
}

// Set 01 main table
setSheet.getRange('A1:T1').values = [headers];
setSheet.getRangeByIndexes(1, 0, rows.length, headers.length).values = rows;
const tableRange = `A1:T${rows.length + 1}`;
const setTable = setSheet.tables.add(tableRange, true, 'Set01Table');
setTable.showFilterButton = true;
setTable.showBandedRows = true;
setSheet.freezePanes.freezeRows(1);
setSheet.getRange('A1:T1').format = {
  fill: palette.header,
  font: { bold: true, color: '#FFFFFF' },
  wrapText: true,
};
setSheet.getRange('A2:T61').format = {
  font: { color: palette.ink },
  wrapText: true,
  verticalAlignment: 'top',
};
setSheet.getRange('H2:J61').format.numberFormat = '0';
setSheet.getRange('H2:L61').format.fill = palette.input;
setSheet.getRange('P2:T61').format.fill = '#FFFDF6';
setSheet.getRange('R2:R61').format.columnWidthPx = 420;
setSheet.getRange('Q2:Q61').format.columnWidthPx = 260;
setSheet.getRange('T2:T61').format.columnWidthPx = 220;
setSheet.getRange('A:A').format.columnWidthPx = 58;
setSheet.getRange('B:E').format.columnWidthPx = 94;
setSheet.getRange('F:J').format.columnWidthPx = 70;
setSheet.getRange('K:O').format.columnWidthPx = 120;
setSheet.getRange('P:P').format.columnWidthPx = 140;
setSheet.getRange('1:61').format.rowHeightPx = 42;

// Lists and validation
lists.getRange('A1:H1').values = [['Peuples', 'Raretés', 'Types', 'Mots-clés', 'Statuts', 'Halos', 'Densités', 'Kits']];
const listRows = [
  ['Vasar', 'Commune', 'Être', 'Serment', 'À concevoir', 'Halo simple', 'Faible', 'Sacré'],
  ['Exar', 'Rare', 'Verbe', 'Élan', 'Prompt prêt', 'Halo + symbole', 'Moyenne', 'Menace'],
  ['Eshar', 'Épique', '', 'Mémoire', 'Généré', 'Halo complexe', 'Forte', 'Spectre'],
  ['Morar', 'Légendaire', '', 'Rupture', 'Intégré', 'Halo mythique', 'Très forte', 'Exil'],
  ['Velar', 'Prismatique', '', 'Mutation', 'Testé', 'Halo ultime / éclipse', 'Ultime', 'Soleil'],
  ['', '', '', 'Aucun', 'Rework', '', '', ''],
];
lists.getRange('A2:H7').values = listRows;
lists.getRange('A1:H1').format = { fill: palette.header, font: { bold: true, color: '#FFFFFF' } };
lists.getRange('A:H').format.columnWidthPx = 130;
lists.freezePanes.freezeRows(1);

setSheet.getRange('B2:B61').dataValidation = { rule: { type: 'list', formula1: "'Listes'!$A$2:$A$6" } };
setSheet.getRange('E2:E61').dataValidation = { rule: { type: 'list', formula1: "'Listes'!$B$2:$B$6" } };
setSheet.getRange('G2:G61').dataValidation = { rule: { type: 'list', formula1: "'Listes'!$C$2:$C$3" } };
setSheet.getRange('K2:K61').dataValidation = { rule: { type: 'list', formula1: "'Listes'!$D$2:$D$7" } };
setSheet.getRange('M2:M61').dataValidation = { rule: { type: 'list', values: [...new Set(Object.values(roleByFaction).flat())] } };
setSheet.getRange('S2:S61').dataValidation = { rule: { type: 'list', formula1: "'Listes'!$E$2:$E$7" } };

// Balance sheet
balance.getRange('A1').values = [['Répartition du set']];
balance.getRange('A1:H1').merge();
balance.getRange('A1:H1').format = { fill: palette.dark, font: { bold: true, color: '#FFFFFF', size: 16 } };
balance.getRange('A3:G3').values = [['Peuple', 'Total', 'Commune', 'Rare', 'Épique', 'Légendaire', 'Prismatique']];
balance.getRange('A4:A8').values = Object.keys(factions).map((f) => [f]);
balance.getRange('A9').values = [['TOTAL']];
balance.getRange('B4').formulas = [["=COUNTIF('Set 01'!$B$2:$B$61,A4)"]];
balance.getRange('B4:B8').fillDown();
balance.getRange('C4').formulas = [["=COUNTIFS('Set 01'!$B$2:$B$61,$A4,'Set 01'!$E$2:$E$61,C$3)"]];
balance.getRange('C4:G8').fillDown();
balance.getRange('C4:G8').fillRight();
balance.getRange('B9').formulas = [['=SUM(B4:B8)']];
balance.getRange('B9:G9').fillRight();
balance.getRange('A3:G9').format = { borders: { preset: 'all', style: 'thin', color: '#D7C7B5' } };
balance.getRange('A3:G3').format = { fill: palette.header, font: { bold: true, color: '#FFFFFF' } };
balance.getRange('A9:G9').format = { fill: palette.muted, font: { bold: true } };
balance.getRange('A:G').format.columnWidthPx = 120;

// Prompt sheet
promptSheet.getRange('A1').values = [['Logique prompts Midjourney']];
promptSheet.getRange('A1:F1').merge();
promptSheet.getRange('A1:F1').format = { fill: palette.dark, font: { bold: true, color: '#FFFFFF', size: 16 } };
promptSheet.getRange('A3:F3').values = [['Rareté', 'Composition', 'Halo', 'Ornement', 'Mots utiles', 'À éviter']];
promptSheet.getRange('A4:F8').values = [
  ['Commune', 'Pose simple', 'Halo clair', 'Faible', 'single character, flat background, generous negative space', 'overdetailed background'],
  ['Rare', 'Pose simple + objet', 'Halo + symbole', 'Moyenne', 'ritual object, subtle gold ornament', 'cinematic environment'],
  ['Épique', 'Figure plus dense', 'Halo complexe', 'Forte', 'floating fragments, gold chains, ritual markings', 'splash art'],
  ['Légendaire', 'Figure iconique', 'Grand halo', 'Très forte', 'ceremonial symmetry, mythic stillness', 'battle scene'],
  ['Prismatique', 'Composition frontale symétrique', 'Éclipse massive', 'Ultime', 'radiant prism light, sacred geometry, high ornament density', 'rainbow everywhere'],
];
promptSheet.getRange('A3:F3').format = { fill: palette.header, font: { bold: true, color: '#FFFFFF' } };
promptSheet.getRange('A4:F8').format = { wrapText: true, verticalAlignment: 'top' };
promptSheet.getRange('A:F').format.columnWidthPx = 160;
promptSheet.getRange('E:F').format.columnWidthPx = 280;

// Dashboard
dashboard.getRange('A1').values = [['EXPELLED — Set 01 : Le Silence']];
dashboard.getRange('A1:H1').merge();
dashboard.getRange('A1:H1').format = { fill: palette.dark, font: { bold: true, color: '#FFFFFF', size: 18 } };
dashboard.getRange('A3:B8').values = [
  ['Total slots', ''],
  ['Cartes nommées', ''],
  ['Prompts prêts', ''],
  ['Cartes générées', ''],
  ['Cartes intégrées', ''],
  ['Cartes testées', ''],
];
dashboard.getRange('B3').formulas = [["=COUNTA('Set 01'!$A$2:$A$61)"]];
dashboard.getRange('B4').formulas = [["=COUNTIF('Set 01'!$P$2:$P$61,\"<>À nommer\")"]];
dashboard.getRange('B5').formulas = [["=COUNTIF('Set 01'!$S$2:$S$61,\"Prompt prêt\")"]];
dashboard.getRange('B6').formulas = [["=COUNTIF('Set 01'!$S$2:$S$61,\"Généré\")"]];
dashboard.getRange('B7').formulas = [["=COUNTIF('Set 01'!$S$2:$S$61,\"Intégré\")"]];
dashboard.getRange('B8').formulas = [["=COUNTIF('Set 01'!$S$2:$S$61,\"Testé\")"]];
dashboard.getRange('A3:B8').format = { fill: '#FFFDF6', borders: { preset: 'outside', style: 'thin', color: '#D7C7B5' } };
dashboard.getRange('A3:A8').format.font = { bold: true, color: palette.ink };
dashboard.getRange('B3:B8').format = { fill: palette.formula, font: { bold: true }, numberFormat: '0' };

dashboard.getRange('D3:H3').values = [['Peuple', 'Total', 'Commune', 'Rare', 'Prismatique']];
dashboard.getRange('D4:D8').values = Object.keys(factions).map((f) => [f]);
dashboard.getRange('E4').formulas = [["=COUNTIF('Set 01'!$B$2:$B$61,D4)"]];
dashboard.getRange('E4:E8').fillDown();
dashboard.getRange('F4').formulas = [["=COUNTIFS('Set 01'!$B$2:$B$61,$D4,'Set 01'!$E$2:$E$61,F$3)"]];
dashboard.getRange('F4:H8').fillDown();
dashboard.getRange('F4:H8').fillRight();
dashboard.getRange('D3:H3').format = { fill: palette.header, font: { bold: true, color: '#FFFFFF' } };
dashboard.getRange('D4:H8').format = { fill: '#FFFDF6', borders: { preset: 'all', style: 'thin', color: '#E1D2C2' } };
dashboard.getRange('A:H').format.columnWidthPx = 130;
dashboard.getRange('A1:H1').format.rowHeightPx = 34;

// Light conditional formatting on status
setSheet.getRange('S2:S61').conditionalFormats.add('containsText', { text: 'À concevoir', format: { fill: '#F7E7D4' } });
setSheet.getRange('S2:S61').conditionalFormats.add('containsText', { text: 'Prompt prêt', format: { fill: '#F8F1C8' } });
setSheet.getRange('S2:S61').conditionalFormats.add('containsText', { text: 'Généré', format: { fill: '#DDF0F2' } });
setSheet.getRange('S2:S61').conditionalFormats.add('containsText', { text: 'Intégré', format: { fill: '#DCEEDB' } });
setSheet.getRange('S2:S61').conditionalFormats.add('containsText', { text: 'Testé', format: { fill: '#CFE8D2' } });
setSheet.getRange('E2:E61').conditionalFormats.add('containsText', { text: 'Prismatique', format: { fill: '#EFE4FF', font: { bold: true, color: '#4D2B7A' } } });
setSheet.getRange('E2:E61').conditionalFormats.add('containsText', { text: 'Légendaire', format: { fill: '#F8E5B7', font: { bold: true, color: '#5C3B00' } } });

// Verify and export
const outputDir = path.resolve('outputs', 'set01');
await fs.mkdir(outputDir, { recursive: true });

const summary = await workbook.inspect({
  kind: 'table',
  sheetId: 'Dashboard',
  range: 'A1:H10',
  include: 'values,formulas',
  tableMaxRows: 10,
  tableMaxCols: 8,
});
console.log(summary.ndjson);

const errors = await workbook.inspect({
  kind: 'match',
  searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',
  options: { useRegex: true, maxResults: 300 },
  summary: 'final formula error scan',
});
console.log(errors.ndjson);

for (const sheetName of ['Dashboard', 'Set 01', 'Balance', 'Prompts']) {
  const preview = await workbook.render({ sheetName, autoCrop: 'all', scale: 1, format: 'png' });
  await fs.writeFile(path.join(outputDir, `${sheetName.replace(/ /g, '_')}.png`), new Uint8Array(await preview.arrayBuffer()));
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(path.join(outputDir, 'Expelled_Set01_Le_Silence.xlsx'));
console.log(path.join(outputDir, 'Expelled_Set01_Le_Silence.xlsx'));
