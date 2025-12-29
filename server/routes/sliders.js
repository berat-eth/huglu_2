const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');

// poolWrapper'ı global'dan almak için
let poolWrapper = null;

// poolWrapper'ı set etmek için factory function
function createSlidersRouter(pool) {
  poolWrapper = pool;
  return router;
}

// Factory function olarak export et
module.exports = createSlidersRouter;

// Aktif slider'ları getir
router.get('/', async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { limit = 20 } = req.query;
    const [sliders] = await poolWrapper.execute(`
      SELECT id, title, description, imageUrl, thumbnailUrl, videoUrl, clickAction, \`order\`, isActive, autoPlay, duration, buttonText, buttonColor, textColor, overlayOpacity, createdAt, updatedAt
      FROM sliders 
      WHERE isActive = true
      ORDER BY \`order\` ASC
      LIMIT ?
    `, [parseInt(limit)]);

    // JSON alanlarını parse et
    const parsedSliders = sliders.map(slider => ({
      ...slider,
      clickAction: slider.clickAction ? JSON.parse(slider.clickAction) : { type: 'none', value: '' }
    }));

    res.json({
      success: true,
      data: parsedSliders
    });
  } catch (error) {
    console.error('Slider yükleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Slider yüklenirken hata oluştu'
    });
  }
});

// Tüm slider'ları getir (admin için)
router.get('/all', authenticateAdmin, async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { limit = 50 } = req.query;
    const [sliders] = await poolWrapper.execute(`
      SELECT id, title, description, imageUrl, thumbnailUrl, videoUrl, clickAction, \`order\`, isActive, 
             autoPlay, duration, buttonText, buttonColor, textColor, overlayOpacity, createdAt, updatedAt
      FROM sliders 
      ORDER BY \`order\` ASC
      LIMIT ?
    `, [parseInt(limit)]);

    // JSON alanlarını parse et
    const parsedSliders = sliders.map(slider => ({
      ...slider,
      clickAction: slider.clickAction ? JSON.parse(slider.clickAction) : { type: 'none', value: '' }
    }));

    res.json({
      success: true,
      data: parsedSliders
    });
  } catch (error) {
    console.error('Tüm slider yükleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Slider yüklenirken hata oluştu'
    });
  }
});

// Yeni slider oluştur
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const {
      title,
      description,
      imageUrl,
      thumbnailUrl,
      videoUrl,
      isActive = true,
      order,
      autoPlay = true,
      duration = 5,
      clickAction = { type: 'none', value: '' },
      buttonText = 'Keşfet',
      buttonColor = '#3B82F6',
      textColor = '#FFFFFF',
      overlayOpacity = 0.3
    } = req.body;

    if (!title || !imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Başlık ve resim URL\'si gerekli'
      });
    }

    // Görseli direkt olarak kullan (sunucuya kaydetme)
    const processedImageUrl = imageUrl;

    // Order belirlenmesi - eğer verilmemişse en yüksek order + 1
    let finalOrder = order;
    if (!finalOrder) {
      const [maxOrderResult] = await poolWrapper.execute(
        'SELECT MAX(`order`) as maxOrder FROM sliders'
      );
      finalOrder = (maxOrderResult[0]?.maxOrder || 0) + 1;
    }

    const [result] = await poolWrapper.execute(`
      INSERT INTO sliders (title, description, imageUrl, thumbnailUrl, videoUrl, isActive, \`order\`, autoPlay, duration, clickAction, buttonText, buttonColor, textColor, overlayOpacity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      title,
      description || null,
      processedImageUrl,
      thumbnailUrl || null,
      videoUrl || null,
      isActive,
      finalOrder,
      autoPlay,
      duration,
      JSON.stringify(clickAction),
      buttonText,
      buttonColor,
      textColor,
      overlayOpacity
    ]);

    // Tüm alanları getir
    const [newSlider] = await poolWrapper.execute(
      'SELECT id, title, description, imageUrl, thumbnailUrl, videoUrl, clickAction, \`order\`, isActive, autoPlay, duration, buttonText, buttonColor, textColor, overlayOpacity, createdAt, updatedAt FROM sliders WHERE id = ?',
      [result.insertId]
    );

    const parsedSlider = {
      ...newSlider[0],
      clickAction: newSlider[0].clickAction ? JSON.parse(newSlider[0].clickAction) : { type: 'none', value: '' }
    };

    res.status(201).json({
      success: true,
      data: parsedSlider
    });
  } catch (error) {
    console.error('Slider oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Slider oluşturulurken hata oluştu'
    });
  }
});

// Slider güncelle
router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { id } = req.params;
    const {
      title,
      description,
      imageUrl,
      thumbnailUrl,
      videoUrl,
      isActive,
      order,
      autoPlay,
      duration,
      clickAction,
      buttonText,
      buttonColor,
      textColor,
      overlayOpacity
    } = req.body;

    // Slider'ın var olup olmadığını kontrol et - Optimize: Sadece gerekli column'lar
    const [existing] = await poolWrapper.execute(
      'SELECT id, title, imageUrl, clickAction, \`order\`, isActive FROM sliders WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Slider bulunamadı'
      });
    }

    // Güncelleme yap
    const updateFields = [];
    const updateValues = [];

    if (title !== undefined) {
      updateFields.push('title = ?');
      updateValues.push(title);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (imageUrl !== undefined) {
      // Görseli direkt olarak kullan (sunucuya kaydetme)
      updateFields.push('imageUrl = ?');
      updateValues.push(imageUrl);
    }
    if (thumbnailUrl !== undefined) {
      updateFields.push('thumbnailUrl = ?');
      updateValues.push(thumbnailUrl);
    }
    if (videoUrl !== undefined) {
      updateFields.push('videoUrl = ?');
      updateValues.push(videoUrl);
    }
    if (isActive !== undefined) {
      updateFields.push('isActive = ?');
      updateValues.push(isActive);
    }
    if (order !== undefined) {
      updateFields.push('`order` = ?');
      updateValues.push(order);
    }
    if (autoPlay !== undefined) {
      updateFields.push('autoPlay = ?');
      updateValues.push(autoPlay);
    }
    if (duration !== undefined) {
      updateFields.push('duration = ?');
      updateValues.push(duration);
    }
    if (clickAction !== undefined) {
      updateFields.push('clickAction = ?');
      updateValues.push(JSON.stringify(clickAction));
    }
    if (buttonText !== undefined) {
      updateFields.push('buttonText = ?');
      updateValues.push(buttonText);
    }
    if (buttonColor !== undefined) {
      updateFields.push('buttonColor = ?');
      updateValues.push(buttonColor);
    }
    if (textColor !== undefined) {
      updateFields.push('textColor = ?');
      updateValues.push(textColor);
    }
    if (overlayOpacity !== undefined) {
      updateFields.push('overlayOpacity = ?');
      updateValues.push(overlayOpacity);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Güncellenecek alan bulunamadı'
      });
    }

    updateValues.push(id);
    await poolWrapper.execute(
      `UPDATE sliders SET ${updateFields.join(', ')}, updatedAt = NOW() WHERE id = ?`,
      updateValues
    );

    // Güncellenmiş slider'ı getir - Tüm alanları getir
    const [updated] = await poolWrapper.execute(
      'SELECT id, title, description, imageUrl, thumbnailUrl, videoUrl, clickAction, \`order\`, isActive, autoPlay, duration, buttonText, buttonColor, textColor, overlayOpacity, createdAt, updatedAt FROM sliders WHERE id = ?',
      [id]
    );

    const parsedSlider = {
      ...updated[0],
      clickAction: updated[0].clickAction ? JSON.parse(updated[0].clickAction) : { type: 'none', value: '' }
    };

    res.json({
      success: true,
      data: parsedSlider
    });
  } catch (error) {
    console.error('Slider güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Slider güncellenirken hata oluştu'
    });
  }
});

// Slider sil
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { id } = req.params;
    const [result] = await poolWrapper.execute(
      'DELETE FROM sliders WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Slider bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Slider silindi'
    });
  } catch (error) {
    console.error('Slider silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Slider silinirken hata oluştu'
    });
  }
});

// Slider durumunu değiştir
router.patch('/:id/toggle', authenticateAdmin, async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { id } = req.params;
    const { isActive } = req.body;
    // Optimize: Sadece gerekli column'lar
    const [slider] = await poolWrapper.execute(
      'SELECT id, title, imageUrl, clickAction, \`order\`, isActive FROM sliders WHERE id = ?',
      [id]
    );

    if (slider.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Slider bulunamadı'
      });
    }

    const newActiveState = isActive !== undefined ? isActive : !slider[0].isActive;
    await poolWrapper.execute(
      'UPDATE sliders SET isActive = ?, updatedAt = NOW() WHERE id = ?',
      [newActiveState, id]
    );

    // Tüm alanları getir
    const [updated] = await poolWrapper.execute(
      'SELECT id, title, description, imageUrl, thumbnailUrl, videoUrl, clickAction, \`order\`, isActive, autoPlay, duration, buttonText, buttonColor, textColor, overlayOpacity, createdAt, updatedAt FROM sliders WHERE id = ?',
      [id]
    );

    const parsedSlider = {
      ...updated[0],
      clickAction: updated[0].clickAction ? JSON.parse(updated[0].clickAction) : { type: 'none', value: '' }
    };

    res.json({
      success: true,
      data: parsedSlider
    });
  } catch (error) {
    console.error('Slider durumu değiştirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Slider durumu değiştirilirken hata oluştu'
    });
  }
});

// Slider sıralamasını güncelle
router.patch('/reorder', authenticateAdmin, async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { sliderIds } = req.body;

    if (!Array.isArray(sliderIds)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz sıralama verisi'
      });
    }

    // Transaction ile sıralama güncelle
    const connection = await poolWrapper.getConnection();
    try {
      await connection.beginTransaction();

      for (let i = 0; i < sliderIds.length; i++) {
        await connection.execute(
          'UPDATE sliders SET `order` = ?, updatedAt = NOW() WHERE id = ?',
          [i + 1, sliderIds[i]]
        );
      }

      await connection.commit();
      res.json({
        success: true,
        message: 'Slider sıralaması güncellendi'
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Slider sıralama hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Slider sıralaması güncellenirken hata oluştu'
    });
  }
});

// Slider tıklama sayısını artır
router.post('/:id/click', async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { id } = req.params;
    await poolWrapper.execute(
      'UPDATE sliders SET clicks = clicks + 1, updatedAt = NOW() WHERE id = ?',
      [id]
    );

    // Optimize: Sadece clicks column'u gerekli
    const [slider] = await poolWrapper.execute(
      'SELECT clicks FROM sliders WHERE id = ?',
      [id]
    );

    if (slider.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Slider bulunamadı'
      });
    }

    const parsedSlider = {
      ...slider[0],
      clickAction: slider[0].clickAction ? JSON.parse(slider[0].clickAction) : { type: 'none', value: '' }
    };

    res.json({
      success: true,
      data: parsedSlider
    });
  } catch (error) {
    console.error('Slider tıklama hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Slider tıklama kaydedilirken hata oluştu'
    });
  }
});

// Slider görüntülenme sayısını artır
router.post('/:id/view', async (req, res) => {
  try {
    if (!poolWrapper) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const { id } = req.params;
    await poolWrapper.execute(
      'UPDATE sliders SET views = views + 1, updatedAt = NOW() WHERE id = ?',
      [id]
    );

    // Optimize: Sadece views column'u gerekli
    const [slider] = await poolWrapper.execute(
      'SELECT views FROM sliders WHERE id = ?',
      [id]
    );

    if (slider.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Slider bulunamadı'
      });
    }

    const parsedSlider = {
      ...slider[0],
      clickAction: slider[0].clickAction ? JSON.parse(slider[0].clickAction) : { type: 'none', value: '' }
    };

    res.json({
      success: true,
      data: parsedSlider
    });
  } catch (error) {
    console.error('Slider görüntülenme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Slider görüntülenme kaydedilirken hata oluştu'
    });
  }
});
