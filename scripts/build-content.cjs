const fs = require('node:fs');
const path = require('node:path');
const MarkdownIt = require('markdown-it');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'content', 'godfather-trilogy-notes-v4.md');
const outputPath = path.join(root, 'assets', 'data', 'archive.js');
const source = fs.readFileSync(sourcePath, 'utf8').replace(/\r\n/g, '\n');

function toAssetPath(markdown) {
  return markdown.replace(/\]\((scenes|portraits)\/([^\)]+)\)/g, ']($1/$2)');
}

function cleanTitle(title) {
  return title.trim().replace(/^\d+[.、]\s*/, '');
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
  const match = markdown.match(/!\[[^\]]*\]\((scenes|portraits)\/([^\)]+)\)/);
  return match ? `assets/${match[1]}/${match[2]}` : '';
}

function extractSearchBlocks(html) {
  const matcher = /<(p|blockquote|table)\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/gi;
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
  md.renderer.rules.image = (tokens, index, options, env, self) => {
    const token = tokens[index];
    const sourceUrl = token.attrGet('src') || '';
    if (sourceUrl.startsWith('scenes/') || sourceUrl.startsWith('portraits/')) {
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
  return makeMarkdownRenderer(prefix).render(toAssetPath(markdown));
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
  return matches
    .filter((match) => match[1].length === 4)
    .map((match, index) => {
      const next = matches.find((candidate) => candidate.index > match.index);
      const bodyStart = match.index + match[0].length;
      const body = markdown.slice(bodyStart, next ? next.index : markdown.length).trim();
      const html = render(body, `person-${String(index + 1).padStart(2, '0')}`);
      const actor = body.match(/\*\s+\*\*演员\*\*：([^\n]+)/)?.[1]?.trim() || '';
      return {
        id: `person-${String(index + 1).padStart(2, '0')}`,
        title: cleanTitle(match[2]),
        actor,
        image: imagePath(body),
        html,
        text: plainText(html),
        blocks: extractSearchBlocks(html)
      };
    });
}

function parseTimeline(section) {
  const rows = [...section.markdown.matchAll(/^\|\s*\*\*([^|]+)\*\*\s*\|\s*([^|]+)\|\s*([^|]+)\|$/gm)];
  return rows.map((row, index) => ({
    id: `timeline-${String(index + 1).padStart(2, '0')}`,
    era: row[1].trim(),
    work: row[2].trim(),
    event: row[3].trim()
  }));
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
    blocks: extractSearchBlocks(html),
    headings: extractHeadingList(section.markdown, id),
    order: isDirectory ? 0 : chapterNumber
  };
});

const prelude = sections.find((section) => section.id === 'prelude');
const directory = sections.find((section) => section.id === 'directory');
const timelineSection = rawSections.find((section) => section.title.startsWith('七、'));
const motifsSection = rawSections.find((section) => section.title.startsWith('十、'));
const motifBlocks = motifsSection ? headingBlocks(motifsSection.markdown, 3) : [];
const motifs = motifBlocks.map((block, index) => {
  const html = render(block.body, `motif-${String(index + 1).padStart(2, '0')}`);
  return {
    id: `motif-${String(index + 1).padStart(2, '0')}`,
    title: cleanTitle(block.title),
    html,
    text: plainText(html),
    blocks: extractSearchBlocks(html)
  };
});

const people = parsePeople(source);
const chapters = sections.filter((section) => section.id.startsWith('chapter-'));
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
  title: `${item.title} · 正文`,
  text: block.text
})));
const search = [
  ...chapters.map((item) => ({ kind: 'chapter', id: item.id, target: `${item.id}-heading`, title: item.title, text: item.text })),
  ...people.map((item) => ({ kind: 'person', id: item.id, target: item.target, title: item.title, text: item.text })),
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
    imageCount: (source.match(/!\[[^\]]*\]\([^\)]+\)/g) || []).length
  },
  prelude: prelude ? { html: prelude.html, text: prelude.text } : null,
  directory: directory ? { html: directory.html, text: directory.text } : null,
  sections,
  chapters,
  people,
  timeline,
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
