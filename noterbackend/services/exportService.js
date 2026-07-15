const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Handles exporting notes to various formats (markdown, html).
 */
async function exportNotes(videoId, format) {
  const notesRecord = await prisma.notes.findUnique({
    where: { videoId }
  });

  if (!notesRecord) {
    throw new Error('Notes not found for this video.');
  }

  const video = await prisma.video.findUnique({
    where: { id: videoId }
  });
  const title = video ? video.title : 'Study Notes';

  if (format === 'markdown') {
    return {
      filename: `Notes_${videoId}.md`,
      mimeType: 'text/markdown',
      content: notesRecord.markdownContent
    };
  } else if (format === 'html') {
    // Recompile clean HTML from jsonStructure
    const { compileHtml } = require('./notesEngine');
    const html = compileHtml(title, notesRecord.jsonStructure);
    return {
      filename: `Notes_${videoId}.html`,
      mimeType: 'text/html',
      content: html
    };
  }

  throw new Error(`Unsupported export format: ${format}`);
}

module.exports = {
  exportNotes
};
