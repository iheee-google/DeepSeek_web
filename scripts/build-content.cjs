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

const PERSON_MENTION_RULES = [
  ['person-01', '维托·柯里昂 (Vito Corleone / Don Vito)', ['维托·柯里昂', 'Vito Corleone', 'Don Vito'], [], [{ name: '老维托' }, { name: '维托' }, { name: 'Vito' }]],
  ['person-02', '麦克·柯里昂 (Michael Corleone / Don Michael)', ['麦克·柯里昂', 'Michael Corleone', 'Don Michael'], [], [{ name: '麦克', protect: ['麦克拉斯基', '麦克莱伦', '麦克白'] }, { name: 'Mike' }]],
  ['person-03', '桑尼·柯里昂 (Santino "Sonny" Corleone)', ['桑尼·柯里昂', '桑尼', 'Santino "Sonny" Corleone']],
  ['person-04', '弗雷多·柯里昂 (Fredo Corleone)', ['弗雷多·柯里昂', 'Fredo Corleone'], [], [{ name: '弗雷多' }]],
  ['person-05', '汤姆·哈根 (Tom Hagen)', ['汤姆·哈根', 'Tom Hagen'], [], [{ name: '汤姆', protect: ['汤姆逊', '汤姆·罗奎尔'] }]],
  ['person-06', '康妮·柯里昂 (Connie Corleone)', ['康妮·柯里昂', 'Connie Corleone'], [], [{ name: '康妮' }]],
  ['person-07', '文森特·曼奇尼 / 柯里昂 (Vincent Mancini / Vincent Corleone)', ['文森特·曼奇尼', 'Vincent Mancini', 'Vincent Corleone'], [], [{ name: '文森特' }]],
  ['person-08', '玛丽·柯里昂 (Mary Corleone)', ['玛丽·柯里昂', 'Mary Corleone'], [], [{ name: '玛丽' }]],
  ['person-09', '安东尼·柯里昂 (Anthony Corleone)', ['安东尼·柯里昂', 'Anthony Corleone'], [], [{ name: '安东尼' }]],
  ['person-10', '卡梅拉·柯里昂 / 柯里昂太太 (Carmella Corleone)', ['卡梅拉·柯里昂', '柯里昂太太', 'Carmella Corleone'], [], [{ name: '卡梅拉' }]],
  ['person-11', '彼得·克莱门扎 (Peter Clemenza)', ['彼得·克莱门扎', 'Peter Clemenza'], [], [{ name: '彼得' }, { name: '克莱门扎' }]],
  ['person-12', '萨尔瓦托雷·泰西欧 (Salvatore Tessio)', ['萨尔瓦托雷·泰西欧', 'Salvatore Tessio'], [], [{ name: '泰西欧' }]],
  ['person-13', '卢卡·布拉西 (Luca Brasi)', ['卢卡·布拉西', 'Luca Brasi'], [], [{ name: '卢卡' }]],
  ['person-14', '阿尔·内里 (Al Neri)', ['阿尔·内里', 'Al Neri'], [], [{ name: '内里' }]],
  ['person-15', '罗科·兰波内 (Rocco Lampone)', ['罗科·兰波内', 'Rocco Lampone'], [{ blockId: 'chapter-04-block-008', text: '罗科' }, { blockId: 'chapter-06-block-329', text: '罗科' }], [{ name: '罗科' }]],
  ['person-16', '弗兰克·潘坦捷利 / 弗兰基 (Frank Pentangeli)', ['弗兰克·潘坦捷利', '弗兰基', 'Frank Pentangeli'], [], [{ name: '潘坦捷利' }]],
  ['person-17', '凯·亚当斯 (Kay Adams-Corleone)', ['凯·亚当斯', 'Kay Adams-Corleone'], [], [{ name: '凯', protect: ['凯恩斯齐格', '吕凯西'] }]],
  ['person-18', '阿波洛尼亚·维特利 (Apollonia Vitelli-Corleone)', ['阿波洛尼亚·维特利', 'Apollonia Vitelli-Corleone'], [], [{ name: '阿波洛尼亚' }]],
  ['person-19', '卡洛·里齐 (Carlo Rizzi)', ['卡洛·里齐', 'Carlo Rizzi'], [{ blockId: 'chapter-05-block-027', text: '卡洛' }, { blockId: 'chapter-06-block-392', text: '卡洛' }], [{ name: '卡洛', protect: ['卡洛·甘比诺'] }]],
  ['person-20', '约翰尼·芳丹 (Johnny Fontane)', ['约翰尼·芳丹', 'Johnny Fontane']],
  ['person-21', '露西·曼奇尼 (Lucy Mancini)', ['露西·曼奇尼', 'Lucy Mancini'], [], [{ name: '露西' }]],
  ['person-22', '阿梅里戈·本纳瑟拉 (Amerigo Bonasera)', ['阿梅里戈·本纳瑟拉', 'Amerigo Bonasera'], [], [{ name: '阿梅里戈' }]],
  ['person-23', '维吉尔·索洛佐 / “土耳其人” (Virgil "The Turk" Sollozzo)', ['维吉尔·索洛佐', '土耳其人', 'Virgil "The Turk" Sollozzo'], [], [{ name: '索洛佐' }]],
  ['person-24', '马克·麦克拉斯基警长 (Captain Mark McCluskey)', ['马克·麦克拉斯基警长', '马克·麦克拉斯基', 'Captain Mark McCluskey'], [], [{ name: '麦克拉斯基' }]],
  ['person-25', '埃米利奥·巴西尼 (Emilio Barzini)', ['埃米利奥·巴西尼', 'Emilio Barzini'], [], [{ name: '埃米利奥' }, { name: '巴西尼' }]],
  ['person-26', '菲利普·塔塔基利亚 (Philip Tattaglia)', ['菲利普·塔塔基利亚', 'Philip Tattaglia'], [], [{ name: '菲利普' }, { name: '塔塔基利亚' }]],
  ['person-27', '维克多·斯特拉奇 (Victor Stracci) 与 卡迈恩·库尼奥 (Carmine Cuneo)', ['维克多·斯特拉奇', 'Victor Stracci', '卡迈恩·库尼奥', 'Carmine Cuneo'], [], [{ name: '卡迈恩' }, { name: '斯特拉奇' }, { name: '库尼奥' }]],
  ['person-28', '杰克·沃尔茨 (Jack Woltz)', ['杰克·沃尔茨', 'Jack Woltz'], [], [{ name: '杰克' }, { name: '沃尔茨' }]],
  ['person-29', '保利·加托 (Paulie Gatto)', ['保利·加托', 'Paulie Gatto'], [], [{ name: '保利' }]],
  ['person-30', '莫·格林 (Moe Greene)', ['莫·格林', 'Moe Greene']],
  ['person-31', '海曼·罗斯 (Hyman Roth)', ['海曼·罗斯', 'Hyman Roth'], [], [{ name: '海曼' }]],
  ['person-32', '强尼·欧拉 (Johnny Ola)', ['强尼·欧拉', 'Johnny Ola'], [], [{ name: '强尼' }]],
  ['person-33', '范努奇 (Don Fanucci)', ['范努奇', 'Don Fanucci']],
  ['person-34', '奇乔老教父 (Don Ciccio)', ['奇乔老教父', '奇乔', 'Don Ciccio']],
  ['person-35', '法布里奇奥 (Fabrizio)', ['法布里奇奥', 'Fabrizio']],
  ['person-36', '唐·托马西诺 (Don Tommasino)', ['唐·托马西诺', 'Don Tommasino'], [], [{ name: '托马西诺' }]],
  ['person-37', '帕特·吉尔里参议员 (Senator Pat Geary)', ['帕特·吉尔里参议员', '帕特·吉尔里', 'Senator Pat Geary'], [], [{ name: '帕特', protect: ['帕特里克'] }]],
  ['person-38', '乔伊·扎萨 (Joey Zasa)', ['乔伊·扎萨', 'Joey Zasa'], [], [{ name: '乔伊' }, { name: '扎萨' }]],
  ['person-39', '多尼·阿托贝洛 (Don Altobello)', ['多尼·阿托贝洛', 'Don Altobello'], [], [{ name: '多尼' }, { name: '阿托贝洛' }]],
  ['person-40', '莉乔·吕凯西 (Don Licio Lucchesi)', ['莉乔·吕凯西', 'Don Licio Lucchesi'], [{ blockId: 'chapter-06-block-394', text: '莉乔' }], [{ name: '莉乔' }]],
  ['person-41', '吉尔代大主教 (Archbishop Gilday)', ['吉尔代大主教', 'Archbishop Gilday']],
  ['person-42', '弗雷德里克·凯恩斯齐格 (Frederick Keinszig)', ['弗雷德里克·凯恩斯齐格', 'Frederick Keinszig'], [], [{ name: '凯恩斯齐格' }]],
  ['person-43', '兰贝托枢机 / 教皇若望·保禄一世 (Cardinal Lamberto)', ['兰贝托枢机', '教皇若望·保禄一世', 'Cardinal Lamberto'], [{ blockId: 'chapter-09-block-008', text: '教皇若望·保禄一世' }], [{ name: '兰贝托' }]],
  ['person-44', '蒙泰莱普雷的莫斯卡 (Mosca of Montelepre)', ['蒙泰莱普雷的莫斯卡', 'Mosca of Montelepre'], [], [{ name: '莫斯卡' }]]
].map(([id, title, names, exclusions = [], aliases = []]) => ({ id, title, names, exclusions, aliases }));

function validatePersonMentionRules(people) {
  if (people.length !== PERSON_MENTION_RULES.length) {
    throw new Error(`人物名称映射数量不匹配：规则 ${PERSON_MENTION_RULES.length}，数据 ${people.length}`);
  }
  const rulesById = new Map(PERSON_MENTION_RULES.map((rule) => [rule.id, rule]));
  const aliases = new Map();
  const aliasEntries = [];
  people.forEach((person) => {
    const rule = rulesById.get(person.id);
    if (!rule || rule.title !== person.title) {
      throw new Error(`人物名称映射与标题不匹配：${person.id} / ${person.title}`);
    }
    const specsByName = new Map();
    [...rule.names.map((name) => ({ name })), ...(rule.aliases || [])].forEach((rawSpec) => {
      const name = String(rawSpec.name || rawSpec).trim();
      if (!name) return;
      const protect = [...new Set((rawSpec.protect || []).map((value) => String(value).trim()))].filter(Boolean);
      const existingSpec = specsByName.get(name);
      specsByName.set(name, {
        name,
        protect: [...new Set([...(existingSpec?.protect || []), ...protect])]
      });
    });
    const specs = [...specsByName.values()];
    if (!specs.length) throw new Error(`人物名称映射为空：${person.id}`);
    specs.forEach((spec) => {
      const existing = aliases.get(spec.name);
      if (existing && existing !== person.id) throw new Error(`人物名称别名冲突：${spec.name} / ${existing} / ${person.id}`);
      if (['教父', 'Godfather', 'Don'].includes(spec.name)) throw new Error(`人物名称别名过于宽泛：${person.id} / ${spec.name}`);
      if (person.actor && spec.name === person.actor) throw new Error(`人物名称与演员名重合：${person.id} / ${spec.name}`);
      aliases.set(spec.name, person.id);
      aliasEntries.push({ ...spec, personId: person.id });
    });
    person.mentions = specs.map((spec) => spec.name).sort((a, b) => b.length - a.length || a.localeCompare(b));
    person.mentionAliases = specs.map(({ name, protect }) => ({ name, protect }));
    person.mentionExclusions = rule.exclusions;
  });
  aliasEntries.forEach((entry, index) => {
    aliasEntries.slice(index + 1).forEach((otherEntry) => {
      if (entry.personId === otherEntry.personId || !(entry.name.includes(otherEntry.name) || otherEntry.name.includes(entry.name))) return;
      const shorter = entry.name.length <= otherEntry.name.length ? entry : otherEntry;
      const longer = shorter === entry ? otherEntry : entry;
      if (!shorter.protect.some((protectedName) => longer.name.includes(protectedName))) {
        throw new Error(`人物名称别名重叠且缺少保护词：${shorter.name} / ${longer.name}`);
      }
    });
  });
  const configuredIds = new Set(PERSON_MENTION_RULES.map((rule) => rule.id));
  if (configuredIds.size !== people.length || people.some((person) => !configuredIds.has(person.id))) {
    throw new Error('人物名称映射存在未知或缺失的 person ID');
  }
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
  validatePersonMentionRules(people);
  return people;
}

function validatePersonMentionExclusions(people, sections) {
  const blocks = new Map(sections.flatMap((section) => section.blocks.map((block) => [block.id, block.text])));
  people.forEach((person) => {
    (person.mentionExclusions || []).forEach((exclusion) => {
      const text = blocks.get(exclusion.blockId);
      if (!text || !text.includes(exclusion.text)) {
        throw new Error(`人物名称排除语境失效：${person.id} / ${exclusion.blockId}`);
      }
    });
  });
}

function timelineLabel(event) {
  const normalized = String(event).replace(/\s+/g, ' ').trim();
  const delimiter = normalized.indexOf('：');
  const candidate = delimiter > 0 ? normalized.slice(0, delimiter).trim() : '';
  if (candidate && candidate.length < normalized.length && candidate.length <= 24) return candidate;
  return normalized.length > 24 ? `${normalized.slice(0, 24)}…` : normalized;
}

function parseTimeline(section) {
  const rows = [...section.markdown.matchAll(/^\|\s*\*\*([^|]+)\*\*\s*\|\s*([^|]+)\|\s*([^|]+)\|$/gm)];
  return rows.map((row, index) => {
    const event = row[3].trim().replace(/[—–]/g, '-');
    return {
      id: `timeline-${String(index + 1).padStart(2, '0')}`,
      era: row[1].trim().replace(/[—–]/g, '-'),
      work: row[2].trim().replace(/[—–]/g, '-'),
      event,
      label: timelineLabel(event)
    };
  });
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
validatePersonMentionExclusions(people, sections);
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
