const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// poolWrapper'ı global'dan almak için
let poolWrapper = null;

// Factory function olarak export et
module.exports = (pool) => {
  poolWrapper = pool;
  return router;
};

// poolWrapper'ı middleware ile al
router.use((req, res, next) => {
  if (!poolWrapper) {
    poolWrapper = req.app.locals.poolWrapper || require('../database-schema').poolWrapper;
  }
  next();
});

// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/community');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'post-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Sadece resim dosyaları yüklenebilir'));
  }
});

// Helper function to get time ago
function getTimeAgo(date) {
  const now = new Date();
  const postDate = new Date(date);
  const diffInSeconds = Math.floor((now - postDate) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds} saniye önce`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} dakika önce`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} saat önce`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} gün önce`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} hafta önce`;
  return `${Math.floor(diffInSeconds / 2592000)} ay önce`;
}

// GET /api/community/posts - Get all posts with pagination
router.get('/posts', async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const category = req.query.category;
    const offset = (page - 1) * limit;
    const tenantId = req.tenant?.id || 1;

    let query = `
      SELECT 
        p.id,
        p.userId,
        p.image,
        p.caption,
        p.location,
        p.category,
        p.productId,
        p.hashtags,
        p.createdAt,
        u.name as userName,
        u.email as userEmail,
        pr.name as productName,
        pr.price as productPrice,
        pr.image as productImage,
        (SELECT COUNT(*) FROM community_post_likes WHERE postId = p.id) as likes,
        (SELECT COUNT(*) FROM community_comments WHERE postId = p.id) as comments
      FROM community_posts p
      LEFT JOIN users u ON p.userId = u.id AND p.tenantId = u.tenantId
      LEFT JOIN products pr ON p.productId = pr.id AND p.tenantId = pr.tenantId
      WHERE p.tenantId = ?
    `;
    const params = [tenantId];

    if (category && category !== 'All') {
      query += ' AND p.category = ?';
      params.push(category);
    }

    query += ' ORDER BY p.createdAt DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [posts] = await poolWrapper.execute(query, params);

    // Format posts
    const formattedPosts = posts.map(post => ({
      id: post.id,
      userId: post.userId,
      userName: post.userName || 'Kullanıcı',
      userAvatar: `https://i.pravatar.cc/150?img=${post.userId || 1}`,
      location: post.location || '',
      timeAgo: getTimeAgo(post.createdAt),
      image: post.image || '',
      caption: post.caption || '',
      productName: post.productName || '',
      productPrice: post.productPrice ? `₺${parseFloat(post.productPrice).toFixed(2)}` : '',
      productImage: post.productImage || '',
      likes: post.likes || 0,
      comments: post.comments || 0,
      category: post.category || 'All',
      hashtags: post.hashtags ? JSON.parse(post.hashtags) : [],
      createdAt: post.createdAt
    }));

    res.json({
      success: true,
      data: formattedPosts,
      pagination: {
        page,
        limit,
        total: formattedPosts.length
      }
    });
  } catch (error) {
    console.error('❌ Get posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Gönderiler yüklenirken hata oluştu'
    });
  }
});

// GET /api/community/posts/:postId - Get single post
router.get('/posts/:postId', async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { postId } = req.params;
    const tenantId = req.tenant?.id || 1;

    const [posts] = await poolWrapper.execute(`
      SELECT 
        p.*,
        u.name as userName,
        u.email as userEmail,
        pr.name as productName,
        pr.price as productPrice,
        pr.image as productImage,
        (SELECT COUNT(*) FROM community_post_likes WHERE postId = p.id) as likes,
        (SELECT COUNT(*) FROM community_comments WHERE postId = p.id) as comments
      FROM community_posts p
      LEFT JOIN users u ON p.userId = u.id AND p.tenantId = u.tenantId
      LEFT JOIN products pr ON p.productId = pr.id AND p.tenantId = pr.tenantId
      WHERE p.id = ? AND p.tenantId = ?
    `, [postId, tenantId]);

    if (posts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Gönderi bulunamadı'
      });
    }

    const post = posts[0];
    const formattedPost = {
      ...post,
      userName: post.userName || 'Kullanıcı',
      userAvatar: `https://i.pravatar.cc/150?img=${post.userId || 1}`,
      timeAgo: getTimeAgo(post.createdAt),
      productPrice: post.productPrice ? `₺${parseFloat(post.productPrice).toFixed(2)}` : '',
      likes: post.likes || 0,
      comments: post.comments || 0,
      hashtags: post.hashtags ? JSON.parse(post.hashtags) : []
    };

    res.json({
      success: true,
      data: formattedPost
    });
  } catch (error) {
    console.error('❌ Get post error:', error);
    res.status(500).json({
      success: false,
      message: 'Gönderi yüklenirken hata oluştu'
    });
  }
});

// POST /api/community/posts - Create new post
router.post('/posts', upload.single('image'), async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    // Handle both FormData and JSON
    let userId, caption, location, category, productId, hashtags;
    
    if (req.file) {
      // FormData request
      userId = req.body.userId;
      caption = req.body.caption || '';
      location = req.body.location || '';
      category = req.body.category || 'All';
      productId = req.body.productId ? parseInt(req.body.productId) : null;
      hashtags = req.body.hashtags ? (typeof req.body.hashtags === 'string' ? JSON.parse(req.body.hashtags) : req.body.hashtags) : [];
    } else {
      // JSON request
      ({ userId, caption, location, category, productId, hashtags } = req.body);
      caption = caption || '';
      location = location || '';
      category = category || 'All';
      productId = productId ? parseInt(productId) : null;
      hashtags = hashtags || [];
    }

    const tenantId = req.tenant?.id || 1;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı ID gerekli'
      });
    }

    // Handle image upload
    let imageUrl = '';
    if (req.file) {
      // File uploaded via multer
      imageUrl = `/uploads/community/${req.file.filename}`;
      // For now, use full URL if needed
      const baseUrl = process.env.BASE_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
      imageUrl = `${baseUrl}${imageUrl}`;
    } else if (req.body.image) {
      // Image URL provided in JSON body
      imageUrl = req.body.image;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Görsel gerekli'
      });
    }

    const [result] = await poolWrapper.execute(`
      INSERT INTO community_posts (tenantId, userId, image, caption, location, category, productId, hashtags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      tenantId,
      parseInt(userId),
      imageUrl,
      caption || '',
      location || '',
      category || 'All',
      productId ? parseInt(productId) : null,
      hashtags ? JSON.stringify(Array.isArray(hashtags) ? hashtags : [hashtags]) : JSON.stringify([])
    ]);

    // Get the created post
    const [newPost] = await poolWrapper.execute(`
      SELECT 
        p.*,
        u.name as userName,
        pr.name as productName,
        pr.price as productPrice,
        pr.image as productImage
      FROM community_posts p
      LEFT JOIN users u ON p.userId = u.id AND p.tenantId = u.tenantId
      LEFT JOIN products pr ON p.productId = pr.id AND p.tenantId = pr.tenantId
      WHERE p.id = ?
    `, [result.insertId]);

    const post = newPost[0];
    const formattedPost = {
      id: post.id,
      userId: post.userId,
      userName: post.userName || 'Kullanıcı',
      userAvatar: `https://i.pravatar.cc/150?img=${post.userId || 1}`,
      location: post.location || '',
      timeAgo: getTimeAgo(post.createdAt),
      image: post.image || '',
      caption: post.caption || '',
      productName: post.productName || '',
      productPrice: post.productPrice ? `₺${parseFloat(post.productPrice).toFixed(2)}` : '',
      productImage: post.productImage || '',
      likes: 0,
      comments: 0,
      category: post.category || 'All',
      hashtags: post.hashtags ? JSON.parse(post.hashtags) : [],
      createdAt: post.createdAt
    };

    res.status(201).json({
      success: true,
      data: formattedPost
    });
  } catch (error) {
    console.error('❌ Create post error:', error);
    res.status(500).json({
      success: false,
      message: 'Gönderi oluşturulurken hata oluştu'
    });
  }
});

// PUT /api/community/posts/:postId - Update post
router.put('/posts/:postId', async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { postId } = req.params;
    const { caption, location, category, productId, hashtags } = req.body;
    const tenantId = req.tenant?.id || 1;

    const updateFields = [];
    const updateValues = [];

    if (caption !== undefined) {
      updateFields.push('caption = ?');
      updateValues.push(caption);
    }
    if (location !== undefined) {
      updateFields.push('location = ?');
      updateValues.push(location);
    }
    if (category !== undefined) {
      updateFields.push('category = ?');
      updateValues.push(category);
    }
    if (productId !== undefined) {
      updateFields.push('productId = ?');
      updateValues.push(productId ? parseInt(productId) : null);
    }
    if (hashtags !== undefined) {
      updateFields.push('hashtags = ?');
      updateValues.push(JSON.stringify(Array.isArray(hashtags) ? hashtags : [hashtags]));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Güncellenecek alan bulunamadı'
      });
    }

    updateFields.push('updatedAt = NOW()');
    updateValues.push(postId, tenantId);

    await poolWrapper.execute(
      `UPDATE community_posts SET ${updateFields.join(', ')} WHERE id = ? AND tenantId = ?`,
      updateValues
    );

    // Get updated post
    const [updated] = await poolWrapper.execute(`
      SELECT 
        p.*,
        u.name as userName,
        pr.name as productName,
        pr.price as productPrice,
        pr.image as productImage
      FROM community_posts p
      LEFT JOIN users u ON p.userId = u.id AND p.tenantId = u.tenantId
      LEFT JOIN products pr ON p.productId = pr.id AND p.tenantId = pr.tenantId
      WHERE p.id = ? AND p.tenantId = ?
    `, [postId, tenantId]);

    if (updated.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Gönderi bulunamadı'
      });
    }

    const post = updated[0];
    const formattedPost = {
      id: post.id,
      userId: post.userId,
      userName: post.userName || 'Kullanıcı',
      userAvatar: `https://i.pravatar.cc/150?img=${post.userId || 1}`,
      location: post.location || '',
      timeAgo: getTimeAgo(post.createdAt),
      image: post.image || '',
      caption: post.caption || '',
      productName: post.productName || '',
      productPrice: post.productPrice ? `₺${parseFloat(post.productPrice).toFixed(2)}` : '',
      productImage: post.productImage || '',
      likes: 0,
      comments: 0,
      category: post.category || 'All',
      hashtags: post.hashtags ? JSON.parse(post.hashtags) : [],
      createdAt: post.createdAt
    };

    res.json({
      success: true,
      data: formattedPost
    });
  } catch (error) {
    console.error('❌ Update post error:', error);
    res.status(500).json({
      success: false,
      message: 'Gönderi güncellenirken hata oluştu'
    });
  }
});

// DELETE /api/community/posts/:postId - Delete post
router.delete('/posts/:postId', async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { postId } = req.params;
    const tenantId = req.tenant?.id || 1;

    // Delete likes and comments first
    await poolWrapper.execute('DELETE FROM community_post_likes WHERE postId = ?', [postId]);
    await poolWrapper.execute('DELETE FROM community_comments WHERE postId = ?', [postId]);

    const [result] = await poolWrapper.execute(
      'DELETE FROM community_posts WHERE id = ? AND tenantId = ?',
      [postId, tenantId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Gönderi bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Gönderi başarıyla silindi'
    });
  } catch (error) {
    console.error('❌ Delete post error:', error);
    res.status(500).json({
      success: false,
      message: 'Gönderi silinirken hata oluştu'
    });
  }
});

// POST /api/community/posts/:postId/like - Like post
router.post('/posts/:postId/like', async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { postId } = req.params;
    const { userId } = req.body;
    const tenantId = req.tenant?.id || 1;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı ID gerekli'
      });
    }

    // Check if already liked
    const [existing] = await poolWrapper.execute(
      'SELECT id FROM community_post_likes WHERE postId = ? AND userId = ? AND tenantId = ?',
      [postId, userId, tenantId]
    );

    if (existing.length > 0) {
      return res.json({
        success: true,
        message: 'Gönderi zaten beğenilmiş',
        liked: true
      });
    }

    await poolWrapper.execute(
      'INSERT INTO community_post_likes (tenantId, postId, userId) VALUES (?, ?, ?)',
      [tenantId, postId, userId]
    );

    const [likesCount] = await poolWrapper.execute(
      'SELECT COUNT(*) as count FROM community_post_likes WHERE postId = ?',
      [postId]
    );

    res.json({
      success: true,
      message: 'Gönderi beğenildi',
      likes: likesCount[0].count
    });
  } catch (error) {
    console.error('❌ Like post error:', error);
    res.status(500).json({
      success: false,
      message: 'Gönderi beğenilirken hata oluştu'
    });
  }
});

// DELETE /api/community/posts/:postId/like - Unlike post
router.delete('/posts/:postId/like', async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { postId } = req.params;
    const { userId } = req.body;
    const tenantId = req.tenant?.id || 1;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı ID gerekli'
      });
    }

    await poolWrapper.execute(
      'DELETE FROM community_post_likes WHERE postId = ? AND userId = ? AND tenantId = ?',
      [postId, userId, tenantId]
    );

    const [likesCount] = await poolWrapper.execute(
      'SELECT COUNT(*) as count FROM community_post_likes WHERE postId = ?',
      [postId]
    );

    res.json({
      success: true,
      message: 'Beğeni geri alındı',
      likes: likesCount[0].count
    });
  } catch (error) {
    console.error('❌ Unlike post error:', error);
    res.status(500).json({
      success: false,
      message: 'Beğeni geri alınırken hata oluştu'
    });
  }
});

// POST /api/community/posts/:postId/comment - Add comment
router.post('/posts/:postId/comment', async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { postId } = req.params;
    const { userId, comment } = req.body;
    const tenantId = req.tenant?.id || 1;

    if (!userId || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı ID ve yorum gerekli'
      });
    }

    const [result] = await poolWrapper.execute(
      'INSERT INTO community_comments (tenantId, postId, userId, comment) VALUES (?, ?, ?, ?)',
      [tenantId, postId, userId, comment]
    );

    // Get comment with user info
    const [comments] = await poolWrapper.execute(`
      SELECT c.*, u.name as userName
      FROM community_comments c
      LEFT JOIN users u ON c.userId = u.id AND c.tenantId = u.tenantId
      WHERE c.id = ?
    `, [result.insertId]);

    const commentData = comments[0];
    const formattedComment = {
      id: commentData.id,
      userId: commentData.userId,
      userName: commentData.userName || 'Kullanıcı',
      comment: commentData.comment,
      createdAt: commentData.createdAt,
      timeAgo: getTimeAgo(commentData.createdAt)
    };

    res.status(201).json({
      success: true,
      data: formattedComment
    });
  } catch (error) {
    console.error('❌ Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Yorum eklenirken hata oluştu'
    });
  }
});

// GET /api/community/posts/:postId/comments - Get comments
router.get('/posts/:postId/comments', async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { postId } = req.params;
    const tenantId = req.tenant?.id || 1;

    const [comments] = await poolWrapper.execute(`
      SELECT c.*, u.name as userName
      FROM community_comments c
      LEFT JOIN users u ON c.userId = u.id AND c.tenantId = u.tenantId
      WHERE c.postId = ? AND c.tenantId = ?
      ORDER BY c.createdAt DESC
    `, [postId, tenantId]);

    const formattedComments = comments.map(comment => ({
      id: comment.id,
      userId: comment.userId,
      userName: comment.userName || 'Kullanıcı',
      comment: comment.comment,
      createdAt: comment.createdAt,
      timeAgo: getTimeAgo(comment.createdAt)
    }));

    res.json({
      success: true,
      data: formattedComments
    });
  } catch (error) {
    console.error('❌ Get comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Yorumlar yüklenirken hata oluştu'
    });
  }
});

// DELETE /api/community/comments/:commentId - Delete comment
router.delete('/comments/:commentId', async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { commentId } = req.params;
    const tenantId = req.tenant?.id || 1;

    const [result] = await poolWrapper.execute(
      'DELETE FROM community_comments WHERE id = ? AND tenantId = ?',
      [commentId, tenantId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Yorum bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Yorum başarıyla silindi'
    });
  } catch (error) {
    console.error('❌ Delete comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Yorum silinirken hata oluştu'
    });
  }
});

// GET /api/community/users/:userId/posts - Get user posts
router.get('/users/:userId/posts', async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const tenantId = req.tenant?.id || 1;

    const [posts] = await poolWrapper.execute(`
      SELECT 
        p.*,
        u.name as userName,
        pr.name as productName,
        pr.price as productPrice,
        pr.image as productImage,
        (SELECT COUNT(*) FROM community_post_likes WHERE postId = p.id) as likes,
        (SELECT COUNT(*) FROM community_comments WHERE postId = p.id) as comments
      FROM community_posts p
      LEFT JOIN users u ON p.userId = u.id AND p.tenantId = u.tenantId
      LEFT JOIN products pr ON p.productId = pr.id AND p.tenantId = pr.tenantId
      WHERE p.userId = ? AND p.tenantId = ?
      ORDER BY p.createdAt DESC
      LIMIT ? OFFSET ?
    `, [userId, tenantId, limit, offset]);

    const formattedPosts = posts.map(post => ({
      id: post.id,
      userId: post.userId,
      userName: post.userName || 'Kullanıcı',
      userAvatar: `https://i.pravatar.cc/150?img=${post.userId || 1}`,
      location: post.location || '',
      timeAgo: getTimeAgo(post.createdAt),
      image: post.image || '',
      caption: post.caption || '',
      productName: post.productName || '',
      productPrice: post.productPrice ? `₺${parseFloat(post.productPrice).toFixed(2)}` : '',
      productImage: post.productImage || '',
      likes: post.likes || 0,
      comments: post.comments || 0,
      category: post.category || 'All',
      hashtags: post.hashtags ? JSON.parse(post.hashtags) : [],
      createdAt: post.createdAt
    }));

    res.json({
      success: true,
      data: formattedPosts
    });
  } catch (error) {
    console.error('❌ Get user posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı gönderileri yüklenirken hata oluştu'
    });
  }
});

// POST /api/community/users/:userId/follow - Follow user
router.post('/users/:userId/follow', async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { userId } = req.params;
    const { followUserId } = req.body;
    const tenantId = req.tenant?.id || 1;

    if (!followUserId) {
      return res.status(400).json({
        success: false,
        message: 'Takip edilecek kullanıcı ID gerekli'
      });
    }

    // Check if already following
    const [existing] = await poolWrapper.execute(
      'SELECT id FROM community_follows WHERE userId = ? AND followUserId = ? AND tenantId = ?',
      [userId, followUserId, tenantId]
    );

    if (existing.length > 0) {
      return res.json({
        success: true,
        message: 'Zaten takip ediliyor',
        following: true
      });
    }

    await poolWrapper.execute(
      'INSERT INTO community_follows (tenantId, userId, followUserId) VALUES (?, ?, ?)',
      [tenantId, userId, followUserId]
    );

    res.json({
      success: true,
      message: 'Kullanıcı takip edildi'
    });
  } catch (error) {
    console.error('❌ Follow user error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı takip edilirken hata oluştu'
    });
  }
});

// DELETE /api/community/users/:userId/follow - Unfollow user
router.delete('/users/:userId/follow', async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { userId } = req.params;
    const { followUserId } = req.body;
    const tenantId = req.tenant?.id || 1;

    if (!followUserId) {
      return res.status(400).json({
        success: false,
        message: 'Takibi bırakılacak kullanıcı ID gerekli'
      });
    }

    await poolWrapper.execute(
      'DELETE FROM community_follows WHERE userId = ? AND followUserId = ? AND tenantId = ?',
      [userId, followUserId, tenantId]
    );

    res.json({
      success: true,
      message: 'Takip bırakıldı'
    });
  } catch (error) {
    console.error('❌ Unfollow user error:', error);
    res.status(500).json({
      success: false,
      message: 'Takip bırakılırken hata oluştu'
    });
  }
});

// GET /api/community/users/:userId/followers - Get followers
router.get('/users/:userId/followers', async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { userId } = req.params;
    const tenantId = req.tenant?.id || 1;

    const [followers] = await poolWrapper.execute(`
      SELECT f.*, u.name as userName, u.email as userEmail
      FROM community_follows f
      LEFT JOIN users u ON f.userId = u.id AND f.tenantId = u.tenantId
      WHERE f.followUserId = ? AND f.tenantId = ?
    `, [userId, tenantId]);

    res.json({
      success: true,
      data: followers
    });
  } catch (error) {
    console.error('❌ Get followers error:', error);
    res.status(500).json({
      success: false,
      message: 'Takipçiler yüklenirken hata oluştu'
    });
  }
});

// GET /api/community/users/:userId/following - Get following
router.get('/users/:userId/following', async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { userId } = req.params;
    const tenantId = req.tenant?.id || 1;

    const [following] = await poolWrapper.execute(`
      SELECT f.*, u.name as userName, u.email as userEmail
      FROM community_follows f
      LEFT JOIN users u ON f.followUserId = u.id AND f.tenantId = u.tenantId
      WHERE f.userId = ? AND f.tenantId = ?
    `, [userId, tenantId]);

    res.json({
      success: true,
      data: following
    });
  } catch (error) {
    console.error('❌ Get following error:', error);
    res.status(500).json({
      success: false,
      message: 'Takip edilenler yüklenirken hata oluştu'
    });
  }
});

