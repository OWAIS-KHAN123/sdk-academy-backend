const VideoMetadata = require('../models/VideoMetadata');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const {
  uploadToR2,
  generateSignedUrl,
  generatePresignedUploadUrl,
  deleteFromR2,
  getStorageStats,
  getObjectMetadata,
  CDN_URL,
} = require('../config/cloudflare');

// Helper: find VideoMetadata by cloudflareKey (URI-decoded) or MongoDB _id fallback
const findVideoMetadata = async (param) => {
  const key = decodeURIComponent(param);
  let metadata = await VideoMetadata.findOne({ cloudflareKey: key });
  if (!metadata) {
    try { metadata = await VideoMetadata.findById(key); } catch (_) {}
  }
  return metadata;
};

// ─────────────────────────────────────────────
// @desc    Upload video to Cloudflare R2 (legacy — small files only)
// @route   POST /api/v1/videos/upload
// @access  Private/Admin
// ─────────────────────────────────────────────
exports.uploadVideo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No video file provided' });
    }

    const { courseId, moduleIndex, title, description } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const { url, key } = await uploadToR2(req.file, `course-videos/${courseId}`, 'video');

    const metadata = await VideoMetadata.create({
      courseId,
      moduleIndex: moduleIndex || 0,
      cloudflareKey: key,
      cloudflareCdnUrl: url,
      videoSize: req.file.size || 0,
      videoFormat: (req.file.mimetype || '').split('/')[1] || 'unknown',
      uploadedBy: req.user.id,
    });

    if (moduleIndex !== undefined && course.modules[moduleIndex]) {
      course.modules[moduleIndex].videoUrl = url;
      course.modules[moduleIndex].cloudflareKey = key;
      course.cloudflareStorageUsed = (course.cloudflareStorageUsed || 0) + (req.file.size || 0);
      await course.save();
    }

    res.status(201).json({
      success: true,
      message: 'Video uploaded to Cloudflare R2 successfully',
      videoId: metadata._id,
      cloudflareKey: key,
      cdnUrl: url,
      size: req.file.size,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Generate presigned PUT URL for direct-to-R2 upload (bypasses Vercel)
// @route   POST /api/v1/videos/presigned-upload-url
// @access  Private/Admin
// ─────────────────────────────────────────────
exports.getPresignedUploadUrl = async (req, res, next) => {
  try {
    const { folder = 'course-videos', filename = 'video.mp4', contentType = 'video/mp4' } = req.body;

    const { presignedUrl, key } = await generatePresignedUploadUrl(folder, filename, contentType);

    res.status(200).json({ success: true, presignedUrl, key });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Confirm direct upload — register metadata + update course module
// @route   POST /api/v1/videos/confirm-upload
// @access  Private/Admin
// ─────────────────────────────────────────────
exports.confirmVideoUpload = async (req, res, next) => {
  try {
    const { courseId, moduleIndex, key, title, description } = req.body;

    if (!courseId || !key) {
      return res.status(400).json({ success: false, message: 'courseId and key are required' });
    }

    let size = 0;
    let format = 'mp4';
    try {
      const meta = await getObjectMetadata(key, 'video');
      size = meta.size || 0;
      format = (meta.contentType || 'video/mp4').split('/')[1] || 'mp4';
    } catch (_) {}

    const cdnUrl = `${CDN_URL}/${key}`;
    const idx = parseInt(moduleIndex) || 0;

    const videoMeta = await VideoMetadata.create({
      courseId,
      moduleIndex: idx,
      cloudflareKey: key,
      cloudflareCdnUrl: cdnUrl,
      videoSize: size,
      videoFormat: format,
      uploadedBy: req.user.id,
    });

    const course = await Course.findById(courseId);
    if (course) {
      if (course.modules[idx]) {
        course.modules[idx].videoUrl = cdnUrl;
        course.modules[idx].cloudflareKey = key;
        if (title) course.modules[idx].title = title;
        if (description) course.modules[idx].description = description;
      } else {
        course.modules.push({
          title: title || `Module ${idx + 1}`,
          description: description || '',
          videoUrl: cdnUrl,
          cloudflareKey: key,
          order: idx,
        });
      }
      course.cloudflareStorageUsed = (course.cloudflareStorageUsed || 0) + size;
      await course.save();
    }

    res.status(201).json({
      success: true,
      videoId: videoMeta._id,
      key,
      cdnUrl,
      module: course?.modules[idx],
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Get signed streaming URL for enrolled user
// @route   GET /api/v1/videos/:videoId/stream-url
// @access  Private
// ─────────────────────────────────────────────
exports.getStreamUrl = async (req, res, next) => {
  try {
    const metadata = await findVideoMetadata(req.params.videoId);
    if (!metadata) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    let targetCourseId = metadata.courseId;
    if (req.query.courseId && req.query.courseId !== String(metadata.courseId)) {
      const course = await Course.findById(req.query.courseId);
      if (course && course.modules.some(m => m.cloudflareKey === metadata.cloudflareKey)) {
        targetCourseId = req.query.courseId;
      }
    }

    if (req.user.role !== 'admin') {
      const course = await Course.findById(targetCourseId).select('isFree');
      const isFree = course?.isFree === true;
      if (!isFree) {
        const enrollment = await Enrollment.findOne({
          userId: req.user.id,
          courseId: targetCourseId,
          status: { $in: ['active', 'completed'] },
        });
        if (!enrollment) {
          return res.status(403).json({ success: false, message: 'You are not enrolled in this course' });
        }
      }
    }

    const now = new Date();
    const bufferMs = 15 * 60 * 1000;
    if (metadata.cloudflareSignedUrl && metadata.signedUrlExpiry && metadata.signedUrlExpiry - now > bufferMs) {
      return res.status(200).json({
        success: true,
        streamUrl: metadata.cloudflareSignedUrl,
        url: metadata.cloudflareSignedUrl,
        expiresAt: metadata.signedUrlExpiry,
      });
    }

    const expiresIn = parseInt(process.env.CLOUDFLARE_SIGNED_URL_EXPIRY) || 86400;
    const signedUrl = await generateSignedUrl(metadata.cloudflareKey, expiresIn, 'video');
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    metadata.cloudflareSignedUrl = signedUrl;
    metadata.signedUrlExpiry = expiresAt;
    await metadata.save();

    res.status(200).json({ success: true, streamUrl: signedUrl, url: signedUrl, expiresAt });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Get signed download URL for enrolled user
// @route   GET /api/v1/videos/:videoId/download-url
// @access  Private
// ─────────────────────────────────────────────
exports.getDownloadUrl = async (req, res, next) => {
  try {
    const metadata = await findVideoMetadata(req.params.videoId);
    if (!metadata) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    let targetCourseId = metadata.courseId;
    if (req.query.courseId && req.query.courseId !== String(metadata.courseId)) {
      const course = await Course.findById(req.query.courseId);
      if (course && course.modules.some(m => m.cloudflareKey === metadata.cloudflareKey)) {
        targetCourseId = req.query.courseId;
      }
    }

    if (req.user.role !== 'admin') {
      const course = await Course.findById(targetCourseId).select('isFree');
      const isFree = course?.isFree === true;
      if (!isFree) {
        const enrollment = await Enrollment.findOne({
          userId: req.user.id,
          courseId: targetCourseId,
          status: { $in: ['active', 'completed'] },
        });
        if (!enrollment) {
          return res.status(403).json({ success: false, message: 'You are not enrolled in this course' });
        }
      }
    }

    const downloadUrl = await generateSignedUrl(metadata.cloudflareKey, 7 * 24 * 3600, 'video');

    res.status(200).json({
      success: true,
      url: downloadUrl,
      downloadUrl,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      filename: `video-${metadata._id}.${metadata.videoFormat}`,
      size: metadata.videoSize,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Generate signed URL (admin panel preview)
// @route   POST /api/v1/videos/generate-signed-url
// @access  Private/Admin
// ─────────────────────────────────────────────
exports.generateSignedUrlEndpoint = async (req, res, next) => {
  try {
    const { cloudflareKey, expiresIn = 3600 } = req.body;
    if (!cloudflareKey) {
      return res.status(400).json({ success: false, message: 'cloudflareKey is required' });
    }
    const signedUrl = await generateSignedUrl(cloudflareKey, expiresIn, 'video');
    res.status(200).json({ success: true, signedUrl, expiresAt: new Date(Date.now() + expiresIn * 1000) });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Delete video from Cloudflare R2 + MongoDB
// @route   DELETE /api/v1/videos/:videoId
// @access  Private/Admin
// ─────────────────────────────────────────────
exports.deleteVideo = async (req, res, next) => {
  try {
    const metadata = await findVideoMetadata(req.params.videoId);
    if (!metadata) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    await deleteFromR2(metadata.cloudflareKey, 'video');

    await Course.findByIdAndUpdate(metadata.courseId, {
      $inc: { cloudflareStorageUsed: -(metadata.videoSize || 0) },
    });

    const course = await Course.findById(metadata.courseId);
    if (course && course.modules[metadata.moduleIndex]) {
      course.modules[metadata.moduleIndex].videoUrl = undefined;
      course.modules[metadata.moduleIndex].cloudflareKey = undefined;
      await course.save();
    }

    await metadata.deleteOne();

    res.status(200).json({ success: true, message: 'Video deleted from Cloudflare R2 and database' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Get Cloudflare R2 storage statistics
// @route   GET /api/v1/videos/storage-stats
// @access  Private/Admin
// ─────────────────────────────────────────────
exports.getStorageStatsEndpoint = async (req, res, next) => {
  try {
    const [videoStats, imageStats] = await Promise.all([
      getStorageStats('video'),
      getStorageStats('image'),
    ]);

    const courseStats = await VideoMetadata.aggregate([
      { $group: { _id: '$courseId', totalVideos: { $sum: 1 }, totalSize: { $sum: '$videoSize' } } },
      { $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'course' } },
      { $unwind: { path: '$course', preserveNullAndEmpty: true } },
      { $project: { courseTitle: '$course.title', totalVideos: 1, totalSize: 1 } },
    ]);

    res.status(200).json({
      success: true,
      stats: {
        videoBucket: {
          totalObjects: videoStats.totalObjects,
          totalSizeBytes: videoStats.totalSize,
          totalSizeMB: (videoStats.totalSize / (1024 * 1024)).toFixed(2),
        },
        imageBucket: {
          totalObjects: imageStats.totalObjects,
          totalSizeBytes: imageStats.totalSize,
          totalSizeMB: (imageStats.totalSize / (1024 * 1024)).toFixed(2),
        },
        byCourse: courseStats,
      },
    });
  } catch (error) {
    next(error);
  }
};
