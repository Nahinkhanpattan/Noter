const { z } = require('zod');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Helper to format seconds to MM:SS or HH:MM:SS
function formatTime(seconds) {
  if (isNaN(seconds) || seconds === null) return '00:00';
  const secs = Math.floor(seconds);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  
  const mStr = String(m).padStart(2, '0');
  const sStr = String(s).padStart(2, '0');
  
  if (h > 0) {
    return `${h}:${mStr}:${sStr}`;
  }
  return `${mStr}:${sStr}`;
}

// Zod schemas to validate incoming Gemini data
const ChapterSchema = z.object({
  title: z.string(),
  start: z.number(),
  end: z.number(),
  description: z.string()
});

const ConceptNoteSchema = z.object({
  timestamp: z.number(),
  concept: z.string(),
  details: z.string()
});

const GlossaryItemSchema = z.object({
  term: z.string(),
  definition: z.string()
});

const CombinedNotesSchema = z.object({
  summary: z.string(),
  chapters: z.array(ChapterSchema),
  notes: z.array(ConceptNoteSchema),
  glossary: z.array(GlossaryItemSchema),
  keywords: z.array(z.string())
});

/**
 * Validates and compiles AI outputs into markdown, html, and editor states.
 */
async function processAndSaveNotes(videoId, rawNotesData) {
  // Validate with Zod
  const validated = CombinedNotesSchema.parse(rawNotesData);

  // Fetch video information for header compiling
  const video = await prisma.video.findUnique({
    where: { id: videoId }
  });
  const videoTitle = video ? video.title : 'Study Notes';

  // Generate Markdown
  const markdown = compileMarkdown(videoTitle, validated);

  // Generate HTML (for editor loading)
  const html = compileHtml(videoTitle, validated);

  // Clear and update notes record in database
  const notesRecord = await prisma.notes.upsert({
    where: { videoId },
    update: {
      summaryText: validated.summary,
      studyNotesText: JSON.stringify(validated.notes),
      markdownContent: markdown,
      jsonStructure: validated
    },
    create: {
      videoId,
      summaryText: validated.summary,
      studyNotesText: JSON.stringify(validated.notes),
      markdownContent: markdown,
      jsonStructure: validated
    }
  });

  return {
    notes: notesRecord,
    html
  };
}

/**
 * Compiles notes to a neat Markdown document.
 */
function compileMarkdown(title, data) {
  const keywordsSection = data.keywords.map(k => `\`${k}\``).join(', ');
  
  const chaptersSection = data.chapters
    .map(c => `- **${formatTime(c.start)} - ${formatTime(c.end)}**: ${c.title}\n  *${c.description}*`)
    .join('\n');
    
  const notesSection = data.notes
    .map(n => `### [[${formatTime(n.timestamp)}]] ${n.concept}\n\n${n.details}`)
    .join('\n\n');
    
  const glossarySection = data.glossary
    .map(g => `| **${g.term}** | ${g.definition} |`)
    .join('\n');

  return `# ${title}

## Summary
${data.summary}

**Keywords:** ${keywordsSection}

---

## Chapters
${chaptersSection}

---

## Study Notes
${notesSection}

---

## Glossary
| Term | Definition |
| --- | --- |
${glossarySection}
`;
}

/**
 * Compiles notes to pure, semantic HTML.
 */
function compileHtml(title, data) {
  const keywordsHtml = data.keywords.map(k => `<span class="tag">${k}</span>`).join(' ');

  const chaptersHtml = data.chapters
    .map(c => `
      <li>
        <strong><a href="#" class="time-link" data-time="${c.start}">${formatTime(c.start)}</a> - ${formatTime(c.end)}</strong>: ${c.title}
        <p class="description">${c.description}</p>
      </li>
    `).join('');

  const notesHtml = data.notes
    .map(n => `
      <section class="note-block">
        <h3><a href="#" class="time-link" data-time="${n.timestamp}">[[${formatTime(n.timestamp)}]]</a> ${n.concept}</h3>
        <div class="note-details">${n.details}</div>
      </section>
    `).join('');

  const glossaryHtml = data.glossary
    .map(g => `
      <tr>
        <td><strong>${g.term}</strong></td>
        <td>${g.definition}</td>
      </tr>
    `).join('');

  return `
    <h1>${title}</h1>
    <h2>Summary</h2>
    <p>${data.summary}</p>
    <div class="keywords-list">${keywordsHtml}</div>
    <hr />
    <h2>Chapters</h2>
    <ul>${chaptersHtml}</ul>
    <hr />
    <h2>Study Notes</h2>
    <div>${notesHtml}</div>
    <hr />
    <h2>Glossary</h2>
    <table>
      <thead>
        <tr>
          <th>Term</th>
          <th>Definition</th>
        </tr>
      </thead>
      <tbody>
        ${glossaryHtml}
      </tbody>
    </table>
  `;
}

module.exports = {
  processAndSaveNotes,
  formatTime
};
