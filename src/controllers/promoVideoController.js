const PromoVideo = require('../models/PromoVideo');
const { CDN_URL, deleteFromR2 } = require('../config/cloudflare');

// @desc  Get all active promo videos (public)
// @route GET /api/v1/promo-videos
exports.getPromoVideos = async (req, res, next) => {
  try {
    const videos = await PromoVideo.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
    res.status(200).json({ success: true, promoVideos: videos });
  } catch (err) {
    next(err);
  }
};

// @desc  Get all promo videos including inactive (admin)
// @route GET /api/v1/promo-videos/all
exports.getAllPromoVideos = async (req, res, next) => {
  try {
    const videos = await PromoVideo.find().sort({ order: 1, createdAt: -1 });
    res.status(200).json({ success: true, promoVideos: videos });
  } catch (err) {
    next(err);
  }
};

// @desc  Create promo video after direct R2 upload
// @route POST /api/v1/promo-videos
// body: { title, key }
exports.createPromoVideo = async (req, res, next) => {
  try {
    const { title, key } = req.body;
    if (!title || !key) {
      return res.status(400).json({ success: false, message: 'title and key are required' });
    }

    const videoUrl = `${CDN_URL}/${key}`;
    const count = await PromoVideo.countDocuments();

    const promo = await PromoVideo.create({
      title,
      videoUrl,
      cloudflareKey: key,
      order: count,
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, promoVideo: promo });
  } catch (err) {
    next(err);
  }
};

// @desc  Delete a promo video (also removes from Cloudflare R2)
// @route DELETE /api/v1/promo-videos/:id
exports.deletePromoVideo = async (req, res, next) => {
  try {
    const promo = await PromoVideo.findById(req.params.id);
    if (!promo) {
      return res.status(404).json({ success: false, message: 'Promo video not found' });
    }

    if (promo.cloudflareKey) {
      await deleteFromR2(promo.cloudflareKey, 'video').catch(() => {});
    }
    await promo.deleteOne();

    res.status(200).json({ success: true, message: 'Promo video deleted' });
  } catch (err) {
    next(err);
  }
};

// @desc  Update promo video (title or active status)
// @route PUT /api/v1/promo-videos/:id
exports.updatePromoVideo = async (req, res, next) => {
  try {
    const promo = await PromoVideo.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!promo) {
      return res.status(404).json({ success: false, message: 'Promo video not found' });
    }
    res.status(200).json({ success: true, promoVideo: promo });
  } catch (err) {
    next(err);
  }
};
