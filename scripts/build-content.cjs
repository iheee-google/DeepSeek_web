const fs = require('node:fs');
const path = require('node:path');
const MarkdownIt = require('markdown-it');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'content', 'godfather-trilogy-notes-v4.md');
const outputPath = path.join(root, 'assets', 'data', 'archive.js');
const source = fs.readFileSync(sourcePath, 'utf8').replace(/\r\n/g, '\n');

function toAssetPath(markdown) {
  return markdown.replace(/\]\((scenes|portraits|posters)\/([^\)]+)\)/g, ']($1/$2)');
}

function cleanTitle(title) {
  return title.trim().replace(/[—–]/g, '-').replace(/^\d+[.、]\s*/, '');
}

function plainText(html) {
  return html
    .replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '\"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function imagePath(markdown) {
  const match = markdown.match(/!\[[^\]]*\]\((scenes|portraits|posters)\/([^\)]+)\)/);
  return match ? `assets/${match[1]}/${match[2]}` : '';
}

function extractSearchBlocks(html) {
  const matcher = /<(p|blockquote|table|li)\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/gi;
  return [...html.matchAll(matcher)]
    .map((match) => ({ id: match[2], text: plainText(match[0]) }))
    .filter((block) => block.text.length > 12);
}

function makeMarkdownRenderer(prefix) {
  let headingCounter = 0;
  let blockCounter = 0;
  const md = new MarkdownIt({ html: false, breaks: false, linkify: false });
  md.renderer.rules.heading_open = (tokens, index, options, env, self) => {
    const token = tokens[index];
    const inline = tokens[index + 1];
    const depth = Number(token.tag.slice(1));
    const id = depth === 2 ? `${prefix}-heading` : `${prefix}-part-${String(++headingCounter).padStart(2, '0')}`;
    token.attrSet('id', id);
    token.attrSet('data-note-heading', 'true');
    return self.renderToken(tokens, index, options);
  };
  const addBlockId = (tokens, index, options, env, self) => {
    const token = tokens[index];
    token.attrSet('id', `${prefix}-block-${String(++blockCounter).padStart(3, '0')}`);
    token.attrSet('data-note-block', 'true');
    return self.renderToken(tokens, index, options);
  };
  md.renderer.rules.paragraph_open = addBlockId;
  md.renderer.rules.blockquote_open = addBlockId;
  md.renderer.rules.table_open = addBlockId;
  md.renderer.rules.list_item_open = addBlockId;
  md.renderer.rules.image = (tokens, index, options, env, self) => {
    const token = tokens[index];
    const sourceUrl = token.attrGet('src') || '';
    if (sourceUrl.startsWith('scenes/') || sourceUrl.startsWith('portraits/') || sourceUrl.startsWith('posters/')) {
      token.attrSet('src', `assets/${sourceUrl}`);
    }
    token.attrSet('loading', 'lazy');
    token.attrSet('decoding', 'async');
    token.attrSet('data-note-image', 'true');
    return self.renderToken(tokens, index, options);
  };
  return md;
}

function render(markdown, prefix) {
  return makeMarkdownRenderer(prefix).render(toAssetPath(markdown)).replace(/[—–]/g, '-');
}

function topLevelSections(markdown) {
  const lines = markdown.split('\n');
  const sections = [];
  let current = { title: '序章', markdown: '' };
  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      if (current.markdown.trim()) sections.push(current);
      current = { title: heading[1].trim(), markdown: `${line}\n` };
    } else {
      current.markdown += `${line}\n`;
    }
  }
  if (current.markdown.trim()) sections.push(current);
  return sections;
}

function headingBlocks(markdown, targetLevel) {
  const matcher = /^(#{1,4})\s+(.+)$/gm;
  const matches = [...markdown.matchAll(matcher)];
  return matches
    .filter((match) => match[1].length === targetLevel)
    .map((match, index) => {
      const start = match.index + match[0].length;
      const next = matches.find((candidate) => candidate.index > match.index && candidate[1].length <= targetLevel);
      const body = markdown.slice(start, next ? next.index : markdown.length).trim();
      return { title: match[2].trim(), body, index };
    });
}

function extractHeadingList(markdown, prefix) {
  const matcher = /^(#{2,4})\s+(.+)$/gm;
  let count = 0;
  return [...markdown.matchAll(matcher)].map((match) => {
    const depth = match[1].length;
    const id = depth === 2 ? `${prefix}-heading` : `${prefix}-part-${String(++count).padStart(2, '0')}`;
    return { id, depth, title: cleanTitle(match[2]) };
  });
}

function parsePeople(markdown) {
  const matcher = /^(#{1,4})\s+(.+)$/gm;
  const matches = [...markdown.matchAll(matcher)];
  let group = '';
  let groupIndex = 0;
  let personIndex = 0;
  const people = [];
  for (const match of matches) {
    if (match[1].length === 3) {
      group = cleanTitle(match[2]);
      groupIndex += 1;
      continue;
    }
    if (match[1].length !== 4) continue;
    const next = matches.find((candidate) => candidate.index > match.index);
    const bodyStart = match.index + match[0].length;
    const body = markdown.slice(bodyStart, next ? next.index : markdown.length).trim();
    const id = `person-${String(++personIndex).padStart(2, '0')}`;
    const html = render(body, id);
    const actor = body.match(/\*\s+\*\*演员\*\*：([^\n]+)/)?.[1]?.trim() || '';
    people.push({
      id,
      title: cleanTitle(match[2]),
      actor,
      group,
      groupIndex,
      image: imagePath(body),
      html,
      text: plainText(html),
      blocks: extractSearchBlocks(html)
    });
  }
  return people;
}

function parseTimeline(section) {
  const rows = [...section.markdown.matchAll(/^\|\s*\*\*([^|]+)\*\*\s*\|\s*([^|]+)\|\s*([^|]+)\|$/gm)];
  return rows.map((row, index) => ({
    id: `timeline-${String(index + 1).padStart(2, '0')}`,
    era: row[1].trim().replace(/[—–]/g, '-'),
    work: row[2].trim().replace(/[—–]/g, '-'),
    event: row[3].trim().replace(/[—–]/g, '-')
  }));
}

function parseQuotes(section) {
  if (!section) return [];
  const groups = headingBlocks(section.markdown, 3);
  let index = 0;
  return groups.flatMap((group, groupIndex) => [...group.body.matchAll(/^\*\s+\*"([^\"]+)"\*\s+[—–-]{1,2}\s*(.+)$/gm)].map((match) => {
    const following = group.body.slice(match.index + match[0].length).match(/^\s*（([^）]+)）/m)?.[1] || '';
    const explanation = group.body.slice(match.index, match.index + 900).match(/\*\*解读\*\*：([^\n]+)/)?.[1]?.trim() || '';
    return {
      id: `quote-${String(++index).padStart(2, '0')}`,
      group: cleanTitle(group.title),
      groupIndex,
      original: match[1].trim(),
      translation: following.trim(),
      source: match[2].trim().replace(/[—–]/g, '-'),
      explanation: explanation.replace(/[—–]/g, '-')
    };
  }));
}

function firstImage(html, fallback = '') {
  return html.match(/<img[^>]+src="([^"]+)"/)?.[1] || fallback;
}

const rawSections = topLevelSections(source);
let chapterNumber = 0;
const sections = rawSections.map((section) => {
  const isPrelude = section.title === '序章';
  const isDirectory = section.title === '目录';
  const id = isPrelude ? 'prelude' : isDirectory ? 'directory' : `chapter-${String(++chapterNumber).padStart(2, '0')}`;
  const html = render(section.markdown, id);
  return {
    id,
    title: cleanTitle(section.title),
    originalTitle: section.title,
    html,
    text: plainText(html),
    cover: firstImage(html),
    blocks: extractSearchBlocks(html),
    headings: extractHeadingList(section.markdown, id),
    order: isDirectory ? 0 : chapterNumber
  };
});

const prelude = sections.find((section) => section.id === 'prelude');
const directory = sections.find((section) => section.id === 'directory');
const timelineSection = rawSections.find((section) => section.title.startsWith('七、'));
const quoteSection = rawSections.find((section) => section.title.startsWith('八、'));
const historySection = rawSections.find((section) => section.title.startsWith('九、'));
const motifsSection = rawSections.find((section) => section.title.startsWith('十、'));
const ruleSections = rawSections.filter((section) => section.title.startsWith('一、') || section.title.startsWith('二、'));
const rules = ruleSections.flatMap((section, sectionIndex) => headingBlocks(section.markdown, 3).map((block, index) => {
  const id = `rule-${String(sectionIndex * 10 + index + 1).padStart(2, '0')}`;
  const html = render(block.body, id);
  return {
    id,
    group: cleanTitle(section.title),
    title: cleanTitle(block.title),
    html,
    text: plainText(html),
    blocks: extractSearchBlocks(html)
  };
}));
const history = (historySection ? headingBlocks(historySection.markdown, 3) : []).map((block, index) => {
  const id = `history-${String(index + 1).padStart(2, '0')}`;
  const html = render(block.body, id);
  return {
    id,
    title: cleanTitle(block.title),
    html,
    text: plainText(html),
    blocks: extractSearchBlocks(html)
  };
});
const quotes = parseQuotes(quoteSection);
const motifBlocks = motifsSection ? headingBlocks(motifsSection.markdown, 3) : [];
const motifCovers = [
  'assets/scenes/oranges.jpg',
  'assets/scenes/baptism.jpg',
  'assets/scenes/door-kay.jpg',
  'assets/scenes/fish.jpg',
  'assets/scenes/sicily-wedding.jpg',
  'assets/scenes/hospital.jpg',
  'assets/scenes/office-vito.jpg',
  'assets/scenes/michael-chair.jpg',
  'assets/scenes/restaurant.jpg',
  'assets/scenes/confession.jpg',
  'assets/scenes/mary-steps.jpg',
  'assets/scenes/michael-alone.jpg'
];
const motifs = motifBlocks.map((block, index) => {
  const id = `motif-${String(index + 1).padStart(2, '0')}`;
  const html = render(block.body, id);
  return {
    id,
    title: cleanTitle(block.title),
    html,
    text: plainText(html),
    cover: firstImage(html, motifCovers[index]),
    blocks: extractSearchBlocks(html)
  };
});

const people = parsePeople(source);
const chapters = sections.filter((section) => section.id.startsWith('chapter-'));
if (directory) {
  let directoryIndex = 0;
  directory.html = directory.html.replace(/<a\s+href="#[^"]+">/g, (anchor) => {
    const chapter = chapters[directoryIndex++];
    return chapter ? `<a href="#${chapter.id}-heading">` : anchor;
  });
}
const characterSection = sections.find((section) => section.originalTitle.startsWith('六、'));
const motifChapter = sections.find((section) => section.originalTitle.startsWith('十、'));
const normalizeKey = (value) => String(value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
const findHeadingTarget = (section, title, depth) => {
  if (!section) return '';
  const key = normalizeKey(title);
  const heading = section.headings.find((item) => item.depth === depth && (normalizeKey(item.title).includes(key.slice(0, 16)) || key.includes(normalizeKey(item.title).slice(0, 16))));
  return heading?.id || '';
};
people.forEach((person) => {
  person.target = findHeadingTarget(characterSection, person.title, 4) || characterSection?.id || '';
});
motifs.forEach((motif) => {
  motif.target = findHeadingTarget(motifChapter, motif.title, 3) || motifChapter?.id || '';
});
const timeline = timelineSection ? parseTimeline(timelineSection) : [];
const passageSearch = chapters.flatMap((item) => item.blocks.map((block) => ({
  kind: 'passage',
  id: block.id,
  target: block.id,
  title: `${item.title} / 正文`,
  text: block.text
})));
const search = [
  ...chapters.map((item) => ({ kind: 'chapter', id: item.id, target: `${item.id}-heading`, title: item.title, text: item.text })),
  ...rules.map((item) => ({ kind: 'rule', id: item.id, target: item.id, title: item.title, text: item.text })),
  ...people.map((item) => ({ kind: 'person', id: item.id, target: item.target, title: item.title, text: item.text })),
  ...timeline.map((item) => ({ kind: 'timeline', id: item.id, target: item.id, title: item.era, text: `${item.work} ${item.event}` })),
  ...quotes.map((item) => ({ kind: 'quote', id: item.id, target: item.id, title: item.original, text: `${item.translation} ${item.source} ${item.explanation}` })),
  ...history.map((item) => ({ kind: 'history', id: item.id, target: item.id, title: item.title, text: item.text })),
  ...motifs.map((item) => ({ kind: 'motif', id: item.id, target: item.target, title: item.title, text: item.text })),
  ...passageSearch
];

const archive = {
  meta: {
    title: '《教父》三部曲全景笔记',
    chapterCount: chapters.length,
    peopleCount: people.length,
    timelineCount: timeline.length,
    motifCount: motifs.length,
    ruleCount: rules.length,
    quoteCount: quotes.length,
    historyCount: history.length,
    imageCount: (source.match(/!\[[^\]]*\]\([^\)]+\)/g) || []).length
  },
  prelude: prelude ? { html: prelude.html, text: prelude.text } : null,
  directory: directory ? { html: directory.html, text: directory.text } : null,
  sections,
  chapters,
  rules,
  people,
  timeline,
  quotes,
  history,
  motifs,
  search
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  `/* Generated by scripts/build-content.cjs. Do not edit by hand. */\nwindow.CORLEONE_ARCHIVE = ${JSON.stringify(archive)};\n`,
  'utf8'
);

console.log(JSON.stringify({
  output: path.relative(root, outputPath),
  chapters: chapters.length,
  people: people.length,
  timeline: timeline.length,
  motifs: motifs.length,
  images: archive.meta.imageCount
}, null, 2));
