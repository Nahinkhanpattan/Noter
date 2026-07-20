const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get all course playlists with video count and preview thumbnails.
 */
async function getCourses() {
  const courses = await prisma.course.findMany({
    include: {
      videos: {
        select: {
          id: true,
          title: true,
          thumbnail: true,
          duration: true
        },
        orderBy: { createdAt: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return courses;
}

/**
 * Get a specific course folder and its full video playlist.
 */
async function getCourseById(courseId) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      videos: {
        include: {
          notes: { select: { id: true, summaryText: true } },
          chapters: { select: { id: true } }
        },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!course) {
    throw new Error('Course folder not found.');
  }

  return course;
}

/**
 * Create a new course playlist folder.
 */
async function createCourse(title, description = '', color = 'violet') {
  if (!title || !title.trim()) {
    throw new Error('Course title is required.');
  }

  const course = await prisma.course.create({
    data: {
      title: title.trim(),
      description: description ? description.trim() : '',
      color: color || 'violet'
    }
  });

  return course;
}

/**
 * Delete a course folder.
 */
async function deleteCourse(courseId) {
  // Unlink videos from this course before deleting
  await prisma.video.updateMany({
    where: { courseId },
    data: { courseId: null }
  });

  await prisma.course.delete({
    where: { id: courseId }
  });

  return { success: true };
}

/**
 * Add a video to a course folder.
 */
async function addVideoToCourse(courseId, videoId) {
  const video = await prisma.video.update({
    where: { id: videoId },
    data: { courseId }
  });

  return video;
}

/**
 * Get all recent videos (library view).
 */
async function getRecentVideos() {
  const videos = await prisma.video.findMany({
    include: {
      course: { select: { id: true, title: true, color: true } },
      notes: { select: { id: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 30
  });

  return videos;
}

module.exports = {
  getCourses,
  getCourseById,
  createCourse,
  deleteCourse,
  addVideoToCourse,
  getRecentVideos
};
