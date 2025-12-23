/**
 * Admin Community API Routes
 * 
 * REST API for managing community posts, comments, and statistics in admin panel.
 */

const express = require('express');
const router = express.Router();

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

/**
 * GET /api/admin/community/posts
 * Get all posts with pagination and filtering
 */
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
    const offset = (page - 1) * limit;
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || 1;
    const category = req.query.category;
    const search = req.query.search;

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
        p.updatedAt,
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

    if (category && category !== 'Tümü' && category !== 'All') {
      query += ' AND p.category = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (p.caption LIKE ? OR u.name LIKE ? OR u.email LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // Get total count for pagination - build separate count query
    let countQuery = `
      SELECT COUNT(*) as total
      FROM community_posts p
      WHERE p.tenantId = ?
    `;
    const countParams = [tenantId];

    if (category && category !== 'Tümü' && category !== 'All') {
      countQuery += ' AND p.category = ?';
      countParams.push(category);
    }

    if (search) {
      countQuery += ' AND (p.caption LIKE ? OR EXISTS (SELECT 1 FROM users u WHERE u.id = p.userId AND u.tenantId = p.tenantId AND (u.name LIKE ? OR u.email LIKE ?)))';
      const searchPattern = `%${search}%`;
      countParams.push(searchPattern, searchPattern, searchPattern);
    }

    const [countResult] = await poolWrapper.execute(countQuery, countParams);
    const total = countResult[0]?.total || 0;

    query += ' ORDER BY p.createdAt DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [posts] = await poolWrapper.execute(query, params);

    // Format posts
    const formattedPosts = posts.map(post => ({
      id: post.id,
      userId: post.userId,
      userName: post.userName || 'Kullanıcı',
      userEmail: post.userEmail || '',
      userAvatar: `https://i.pravatar.cc/150?img=${post.userId || 1}`,
      location: post.location || '',
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      image: post.image || '',
      caption: post.caption || '',
      productName: post.productName || '',
      productPrice: post.productPrice ? parseFloat(post.productPrice) : null,
      productImage: post.productImage || '',
      likes: post.likes || 0,
      comments: post.comments || 0,
      category: post.category || 'All',
      hashtags: post.hashtags ? (typeof post.hashtags === 'string' ? JSON.parse(post.hashtags) : post.hashtags) : []
    }));

    res.json({
      success: true,
      data: formattedPosts,
      pagination: {
        page,
        limit,
        total,
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    console.error('❌ Admin Community: Get posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Gönderiler yüklenirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/community/posts/:id
 * Get single post details
 */
router.get('/posts/:id', async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { id } = req.params;
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || 1;

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
    `, [id, tenantId]);

    if (posts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Gönderi bulunamadı'
      });
    }

    const post = posts[0];
    const formattedPost = {
      id: post.id,
      userId: post.userId,
      userName: post.userName || 'Kullanıcı',
      userEmail: post.userEmail || '',
      userAvatar: `https://i.pravatar.cc/150?img=${post.userId || 1}`,
      location: post.location || '',
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      image: post.image || '',
      caption: post.caption || '',
      productName: post.productName || '',
      productPrice: post.productPrice ? parseFloat(post.productPrice) : null,
      productImage: post.productImage || '',
      likes: post.likes || 0,
      comments: post.comments || 0,
      category: post.category || 'All',
      hashtags: post.hashtags ? (typeof post.hashtags === 'string' ? JSON.parse(post.hashtags) : post.hashtags) : []
    };

    res.json({
      success: true,
      data: formattedPost
    });
  } catch (error) {
    console.error('❌ Admin Community: Get post error:', error);
    res.status(500).json({
      success: false,
      message: 'Gönderi yüklenirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * PUT /api/admin/community/posts/:id
 * Update post
 */
router.put('/posts/:id', async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { id } = req.params;
    const { caption, location, category, productId, hashtags } = req.body;
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || 1;

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
    updateValues.push(id, tenantId);

    await poolWrapper.execute(
      `UPDATE community_posts SET ${updateFields.join(', ')} WHERE id = ? AND tenantId = ?`,
      updateValues
    );

    // Get updated post
    const [updated] = await poolWrapper.execute(`
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
    `, [id, tenantId]);

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
      userEmail: post.userEmail || '',
      userAvatar: `https://i.pravatar.cc/150?img=${post.userId || 1}`,
      location: post.location || '',
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      image: post.image || '',
      caption: post.caption || '',
      productName: post.productName || '',
      productPrice: post.productPrice ? parseFloat(post.productPrice) : null,
      productImage: post.productImage || '',
      likes: post.likes || 0,
      comments: post.comments || 0,
      category: post.category || 'All',
      hashtags: post.hashtags ? (typeof post.hashtags === 'string' ? JSON.parse(post.hashtags) : post.hashtags) : []
    };

    res.json({
      success: true,
      data: formattedPost,
      message: 'Gönderi başarıyla güncellendi'
    });
  } catch (error) {
    console.error('❌ Admin Community: Update post error:', error);
    res.status(500).json({
      success: false,
      message: 'Gönderi güncellenirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * DELETE /api/admin/community/posts/:id
 * Delete post
 */
router.delete('/posts/:id', async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { id } = req.params;
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || 1;

    // Delete likes and comments first
    await poolWrapper.execute('DELETE FROM community_post_likes WHERE postId = ?', [id]);
    await poolWrapper.execute('DELETE FROM community_comments WHERE postId = ?', [id]);

    const [result] = await poolWrapper.execute(
      'DELETE FROM community_posts WHERE id = ? AND tenantId = ?',
      [id, tenantId]
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
    console.error('❌ Admin Community: Delete post error:', error);
    res.status(500).json({
      success: false,
      message: 'Gönderi silinirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/community/comments
 * Get all comments with pagination and filtering
 */
router.get('/comments', async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || 1;
    const postId = req.query.postId;
    const search = req.query.search;

    let query = `
      SELECT 
        c.id,
        c.postId,
        c.userId,
        c.comment,
        c.createdAt,
        u.name as userName,
        u.email as userEmail,
        p.caption as postCaption,
        p.image as postImage
      FROM community_comments c
      LEFT JOIN users u ON c.userId = u.id AND c.tenantId = u.tenantId
      LEFT JOIN community_posts p ON c.postId = p.id AND c.tenantId = p.tenantId
      WHERE c.tenantId = ?
    `;
    const params = [tenantId];

    if (postId) {
      query += ' AND c.postId = ?';
      params.push(postId);
    }

    if (search) {
      query += ' AND (c.comment LIKE ? OR u.name LIKE ? OR u.email LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // Get total count for pagination - build separate count query
    let countQuery = `
      SELECT COUNT(*) as total
      FROM community_comments c
      WHERE c.tenantId = ?
    `;
    const countParams = [tenantId];

    if (postId) {
      countQuery += ' AND c.postId = ?';
      countParams.push(postId);
    }

    if (search) {
      countQuery += ' AND (c.comment LIKE ? OR EXISTS (SELECT 1 FROM users u WHERE u.id = c.userId AND u.tenantId = c.tenantId AND (u.name LIKE ? OR u.email LIKE ?)))';
      const searchPattern = `%${search}%`;
      countParams.push(searchPattern, searchPattern, searchPattern);
    }

    const [countResult] = await poolWrapper.execute(countQuery, countParams);
    const total = countResult[0]?.total || 0;

    query += ' ORDER BY c.createdAt DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [comments] = await poolWrapper.execute(query, params);

    // Format comments
    const formattedComments = comments.map(comment => ({
      id: comment.id,
      postId: comment.postId,
      userId: comment.userId,
      userName: comment.userName || 'Kullanıcı',
      userEmail: comment.userEmail || '',
      userAvatar: `https://i.pravatar.cc/150?img=${comment.userId || 1}`,
      comment: comment.comment,
      createdAt: comment.createdAt,
      postCaption: comment.postCaption || '',
      postImage: comment.postImage || ''
    }));

    res.json({
      success: true,
      data: formattedComments,
      pagination: {
        page,
        limit,
        total,
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    console.error('❌ Admin Community: Get comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Yorumlar yüklenirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * DELETE /api/admin/community/comments/:id
 * Delete comment
 */
router.delete('/comments/:id', async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { id } = req.params;
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || 1;

    const [result] = await poolWrapper.execute(
      'DELETE FROM community_comments WHERE id = ? AND tenantId = ?',
      [id, tenantId]
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
    console.error('❌ Admin Community: Delete comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Yorum silinirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/community/stats
 * Get community statistics
 */
router.get('/stats', async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || 1;
    const days = parseInt(req.query.days) || 30;

    // Total counts
    const [totalPosts] = await poolWrapper.execute(
      'SELECT COUNT(*) as count FROM community_posts WHERE tenantId = ?',
      [tenantId]
    );

    const [totalComments] = await poolWrapper.execute(
      'SELECT COUNT(*) as count FROM community_comments WHERE tenantId = ?',
      [tenantId]
    );

    const [totalLikes] = await poolWrapper.execute(
      'SELECT COUNT(*) as count FROM community_post_likes WHERE tenantId = ?',
      [tenantId]
    );

    const [activeUsers] = await poolWrapper.execute(
      `SELECT COUNT(DISTINCT userId) as count 
       FROM community_posts 
       WHERE tenantId = ? AND createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [tenantId, days]
    );

    // Posts by category
    const [postsByCategory] = await poolWrapper.execute(
      `SELECT category, COUNT(*) as count 
       FROM community_posts 
       WHERE tenantId = ? 
       GROUP BY category 
       ORDER BY count DESC`,
      [tenantId]
    );

    // Posts trend (last 30 days)
    const [postsTrend] = await poolWrapper.execute(
      `SELECT 
        DATE(createdAt) as date,
        COUNT(*) as count
       FROM community_posts
       WHERE tenantId = ? AND createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(createdAt)
       ORDER BY date ASC`,
      [tenantId, days]
    );

    // Comments trend (last 30 days)
    const [commentsTrend] = await poolWrapper.execute(
      `SELECT 
        DATE(createdAt) as date,
        COUNT(*) as count
       FROM community_comments
       WHERE tenantId = ? AND createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(createdAt)
       ORDER BY date ASC`,
      [tenantId, days]
    );

    // Top users by posts
    const [topUsers] = await poolWrapper.execute(
      `SELECT 
        p.userId,
        u.name as userName,
        u.email as userEmail,
        COUNT(*) as postCount
       FROM community_posts p
       LEFT JOIN users u ON p.userId = u.id AND p.tenantId = u.tenantId
       WHERE p.tenantId = ?
       GROUP BY p.userId, u.name, u.email
       ORDER BY postCount DESC
       LIMIT 10`,
      [tenantId]
    );

    res.json({
      success: true,
      data: {
        totals: {
          posts: totalPosts[0]?.count || 0,
          comments: totalComments[0]?.count || 0,
          likes: totalLikes[0]?.count || 0,
          activeUsers: activeUsers[0]?.count || 0
        },
        postsByCategory: postsByCategory.map(item => ({
          category: item.category || 'All',
          count: item.count
        })),
        trends: {
          posts: postsTrend.map(item => ({
            date: item.date,
            count: item.count
          })),
          comments: commentsTrend.map(item => ({
            date: item.date,
            count: item.count
          }))
        },
        topUsers: topUsers.map(user => ({
          userId: user.userId,
          userName: user.userName || 'Kullanıcı',
          userEmail: user.userEmail || '',
          postCount: user.postCount
        }))
      }
    });
  } catch (error) {
    console.error('❌ Admin Community: Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'İstatistikler yüklenirken hata oluştu',
      error: error.message
    });
  }
});

