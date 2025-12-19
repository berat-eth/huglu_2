import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

export default function ProductCard({ product, onPress, onFavorite }) {
  // Stok durumunu kontrol et
  const isOutOfStock = product.stock === 0 || 
                       product.stock === '0' || 
                       product.inStock === false || 
                       product.inStock === 0 ||
                       product.stockStatus === 'out_of_stock' ||
                       product.stockStatus === 'outofstock';
  
  // Stok sayısını kontrol et (10'dan az ise sınırlı stok)
  const stockQuantity = parseInt(product.stock) || 0;
  const isLimitedStock = !isOutOfStock && stockQuantity > 0 && stockQuantity < 10;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.95}>
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: product.image || product.imageUrl || product.thumbnail || 'https://via.placeholder.com/300?text=Ürün' }} 
          style={styles.image}
          resizeMode="cover"
          defaultSource={require('../../assets/icon.png')}
        />
        {/* Stokta Yok Badge */}
        {isOutOfStock && (
          <View style={styles.outOfStockBadge}>
            <Text style={styles.outOfStockText}>STOKTA YOK</Text>
          </View>
        )}
        {/* Diğer Badge'ler (sadece stokta varsa göster) */}
        {!isOutOfStock && product.badge && (
          <View style={[styles.badge, product.badge === 'NEW' && styles.badgeNew]}>
            <Text style={styles.badgeText}>{product.badge}</Text>
          </View>
        )}
        {/* Sınırlı Stok Badge - Sol üst köşe (çapraz) */}
        {isLimitedStock && (
          <View style={styles.limitedStockBadge}>
            <Ionicons name="alarm-outline" size={12} color={COLORS.white} style={styles.limitedStockIcon} />
            <Text style={styles.limitedStockText}>SINIRLI STOK</Text>
          </View>
        )}
        <TouchableOpacity 
          style={styles.favoriteButton} 
          onPress={onFavorite} 
          activeOpacity={0.8}
        >
          <Ionicons
            name={product.isFavorite ? 'heart' : 'heart-outline'}
            size={20}
            color={product.isFavorite ? COLORS.error : COLORS.textMain}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>
            {parseFloat(product.price || 0).toFixed(0)}<Text style={styles.priceSymbol}>₺</Text>
          </Text>
          {product.oldPrice && parseFloat(product.oldPrice) > parseFloat(product.price) && (
            <Text style={styles.oldPrice}>
              {parseFloat(product.oldPrice).toFixed(0)}₺
            </Text>
          )}
        </View>
        {product.oldPrice && parseFloat(product.oldPrice) > parseFloat(product.price) && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>
              %{Math.round(((parseFloat(product.oldPrice) - parseFloat(product.price)) / parseFloat(product.oldPrice)) * 100)} İndirim
            </Text>
          </View>
        )}
        <Text style={styles.category}>{product.category || product.brand || 'Ürün'}</Text>
        {product.rating && product.rating > 0 && (
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#FFC107" />
            <Text style={styles.ratingText}>{parseFloat(product.rating).toFixed(1)}</Text>
            {product.reviewCount && (
              <Text style={styles.reviewCount}>({product.reviewCount})</Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 8,
    backgroundColor: 'transparent',
  },
  imageContainer: {
    position: 'relative',
    aspectRatio: 4 / 5,
    backgroundColor: COLORS.gray100,
    borderRadius: 20,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(17, 212, 33, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  badgeNew: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  outOfStockBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  outOfStockText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  limitedStockBadge: {
    position: 'absolute',
    top: 16, // Biraz daha aşağıya indirildi
    left: 8,
    backgroundColor: 'rgba(245, 105, 11, 0.95)', // Turuncu/sarı renk
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 2,
    transform: [{ rotate: '-15deg' }], // Çapraz yap
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  limitedStockIcon: {
    marginRight: 2,
  },
  limitedStockText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 3, // Favori butonu en üstte olmalı
  },
  content: {
    paddingTop: 12,
    gap: 6,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
    lineHeight: 20,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    lineHeight: 22,
  },
  priceSymbol: {
    fontSize: 14,
    fontWeight: '700',
  },
  oldPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray400,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
  },
  category: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.gray500,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  reviewCount: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.gray400,
  },
});
