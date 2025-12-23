'use client'

import { useState, useEffect } from 'react'
import { formatDDMMYYYY } from '@/lib/date'
import { Edit, Trash2, Search, Filter, Users, MessageSquare, BarChart3, Image as ImageIcon, Heart, MapPin, Tag, X, Eye, RefreshCw, Calendar } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, type ApiResponse } from '@/lib/api'

interface Post {
  id: number
  userId: number
  userName: string
  userEmail: string
  userAvatar: string
  image: string
  caption: string
  location: string
  category: string
  productName?: string
  productPrice?: number
  productImage?: string
  likes: number
  comments: number
  hashtags: string[]
  createdAt: string
  updatedAt: string
}

interface Comment {
  id: number
  postId: number
  userId: number
  userName: string
  userEmail: string
  userAvatar: string
  comment: string
  createdAt: string
  postCaption: string
  postImage: string
}

interface Stats {
  totals: {
    posts: number
    comments: number
    likes: number
    activeUsers: number
  }
  postsByCategory: Array<{ category: string; count: number }>
  trends: {
    posts: Array<{ date: string; count: number }>
    comments: Array<{ date: string; count: number }>
  }
  topUsers: Array<{
    userId: number
    userName: string
    userEmail: string
    postCount: number
  }>
}

export default function Community() {
  const [activeTab, setActiveTab] = useState<'posts' | 'comments' | 'stats'>('posts')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Posts state
  const [posts, setPosts] = useState<Post[]>([])
  const [postsPage, setPostsPage] = useState(1)
  const [postsTotal, setPostsTotal] = useState(0)
  const [postsHasMore, setPostsHasMore] = useState(false)
  const [postsSearch, setPostsSearch] = useState('')
  const [postsCategory, setPostsCategory] = useState('Tümü')
  const [showPostModal, setShowPostModal] = useState<{ open: boolean; post?: Post | null }>({ open: false })
  const [editingPost, setEditingPost] = useState<Partial<Post>>({})
  const [savingPost, setSavingPost] = useState(false)
  const [deletingPost, setDeletingPost] = useState<number | null>(null)

  // Comments state
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsPage, setCommentsPage] = useState(1)
  const [commentsTotal, setCommentsTotal] = useState(0)
  const [commentsHasMore, setCommentsHasMore] = useState(false)
  const [commentsSearch, setCommentsSearch] = useState('')
  const [deletingComment, setDeletingComment] = useState<number | null>(null)

  // Stats state
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsDays, setStatsDays] = useState(30)

  const categories = ['Tümü', 'Yürüyüş', 'Kamp', 'Tırmanış', 'Doğa', 'Macera']

  // Fetch posts
  const fetchPosts = async (page = 1) => {
    try {
      setLoading(true)
      setError(null)
      const params: any = { page, limit: 20 }
      if (postsCategory !== 'Tümü') params.category = postsCategory
      if (postsSearch) params.search = postsSearch

      const response = await api.get<ApiResponse<{ data: Post[]; pagination: any }>>('/admin/community/posts', params)
      
      if (response.success && response.data) {
        // API response format: { success: true, data: Post[], pagination: {...} }
        const data = (response.data as any).data || (Array.isArray(response.data) ? response.data : [])
        const pagination = (response.data as any).pagination || null
        setPosts(data)
        if (pagination) {
          setPostsTotal(pagination.total || 0)
          setPostsHasMore(pagination.hasMore || false)
        } else {
          // Fallback: if no pagination, set total to data length
          setPostsTotal(data.length)
          setPostsHasMore(false)
        }
      }
    } catch (err: any) {
      setError(err.message || 'Gönderiler yüklenirken hata oluştu')
      console.error('Error fetching posts:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch comments
  const fetchComments = async (page = 1) => {
    try {
      setLoading(true)
      setError(null)
      const params: any = { page, limit: 20 }
      if (commentsSearch) params.search = commentsSearch

      const response = await api.get<ApiResponse<{ data: Comment[]; pagination: any }>>('/admin/community/comments', params)
      
      if (response.success && response.data) {
        // API response format: { success: true, data: Comment[], pagination: {...} }
        const data = (response.data as any).data || (Array.isArray(response.data) ? response.data : [])
        const pagination = (response.data as any).pagination || null
        setComments(data)
        if (pagination) {
          setCommentsTotal(pagination.total || 0)
          setCommentsHasMore(pagination.hasMore || false)
        } else {
          // Fallback: if no pagination, set total to data length
          setCommentsTotal(data.length)
          setCommentsHasMore(false)
        }
      }
    } catch (err: any) {
      setError(err.message || 'Yorumlar yüklenirken hata oluştu')
      console.error('Error fetching comments:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch stats
  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get<ApiResponse<Stats>>('/admin/community/stats', { days: statsDays })
      
      if (response.success && response.data) {
        // API response format: { success: true, data: Stats }
        setStats((response.data as any).data || response.data)
      }
    } catch (err: any) {
      setError(err.message || 'İstatistikler yüklenirken hata oluştu')
      console.error('Error fetching stats:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'posts') {
      fetchPosts(postsPage)
    } else if (activeTab === 'comments') {
      fetchComments(commentsPage)
    } else if (activeTab === 'stats') {
      fetchStats()
    }
  }, [activeTab, postsPage, commentsPage, postsCategory, statsDays])

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (activeTab === 'posts' && postsSearch) {
        fetchPosts(1)
      } else if (activeTab === 'comments' && commentsSearch) {
        fetchComments(1)
      }
    }, 500)
    return () => clearTimeout(delaySearch)
  }, [postsSearch, commentsSearch])

  // Delete post
  const handleDeletePost = async (postId: number) => {
    if (!confirm('Bu gönderiyi silmek istediğinizden emin misiniz?')) return

    try {
      setDeletingPost(postId)
      const response = await api.delete<ApiResponse<any>>(`/admin/community/posts/${postId}`)
      
      if (response.success) {
        setPosts(posts.filter(p => p.id !== postId))
        setPostsTotal(prev => Math.max(0, prev - 1))
      } else {
        alert(response.message || 'Gönderi silinirken hata oluştu')
      }
    } catch (err: any) {
      alert(err.message || 'Gönderi silinirken hata oluştu')
    } finally {
      setDeletingPost(null)
    }
  }

  // Delete comment
  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('Bu yorumu silmek istediğinizden emin misiniz?')) return

    try {
      setDeletingComment(commentId)
      const response = await api.delete<ApiResponse<any>>(`/admin/community/comments/${commentId}`)
      
      if (response.success) {
        setComments(comments.filter(c => c.id !== commentId))
        setCommentsTotal(prev => Math.max(0, prev - 1))
      } else {
        alert(response.message || 'Yorum silinirken hata oluştu')
      }
    } catch (err: any) {
      alert(err.message || 'Yorum silinirken hata oluştu')
    } finally {
      setDeletingComment(null)
    }
  }

  // Edit post
  const handleEditPost = (post: Post) => {
    setEditingPost({
      caption: post.caption,
      location: post.location,
      category: post.category,
      hashtags: post.hashtags
    })
    setShowPostModal({ open: true, post })
  }

  // Save post changes
  const handleSavePost = async () => {
    if (!showPostModal.post) return

    try {
      setSavingPost(true)
      const response = await api.put<ApiResponse<Post>>(`/admin/community/posts/${showPostModal.post.id}`, editingPost)
      
      if (response.success && response.data) {
        // API response format: { success: true, data: Post }
        const updatedPost = (response.data as any).data || response.data
        setPosts(posts.map(p => p.id === showPostModal.post!.id ? updatedPost : p))
        setShowPostModal({ open: false })
        setEditingPost({})
      } else {
        alert(response.message || 'Gönderi güncellenirken hata oluştu')
      }
    } catch (err: any) {
      alert(err.message || 'Gönderi güncellenirken hata oluştu')
    } finally {
      setSavingPost(false)
    }
  }

  if (loading && !posts.length && !comments.length && !stats) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-8 h-8 text-blue-500" />
            Topluluk Yönetimi
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gönderiler, yorumlar ve istatistikleri yönetin</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {[
            { id: 'posts' as const, label: 'Gönderiler', icon: ImageIcon },
            { id: 'comments' as const, label: 'Yorumlar', icon: MessageSquare },
            { id: 'stats' as const, label: 'İstatistikler', icon: BarChart3 }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  setPostsPage(1)
                  setCommentsPage(1)
                }}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Posts Tab */}
      {activeTab === 'posts' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Gönderi ara..."
                value={postsSearch}
                onChange={(e) => setPostsSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={postsCategory}
              onChange={(e) => {
                setPostsCategory(e.target.value)
                setPostsPage(1)
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Posts Grid */}
          {loading && !posts.length ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Yükleniyor...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
              <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Gönderi bulunamadı</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {posts.map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="relative aspect-square">
                    <img
                      src={post.image || '/placeholder-image.jpg'}
                      alt={post.caption || 'Gönderi'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-image.jpg'
                      }}
                    />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button
                        onClick={() => handleEditPost(post)}
                        className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-full hover:bg-white transition-colors"
                        title="Düzenle"
                      >
                        <Edit className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        disabled={deletingPost === post.id}
                        className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-full hover:bg-white transition-colors"
                        title="Sil"
                      >
                        {deletingPost === post.id ? (
                          <RefreshCw className="w-4 h-4 text-red-600 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-red-600" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={post.userAvatar}
                        alt={post.userName}
                        className="w-8 h-8 rounded-full"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{post.userName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatDDMMYYYY(new Date(post.createdAt))}</p>
                      </div>
                    </div>
                    {post.caption && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{post.caption}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        <span>{post.likes}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        <span>{post.comments}</span>
                      </div>
                      {post.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate">{post.location}</span>
                        </div>
                      )}
                    </div>
                    {post.category && (
                      <div className="flex items-center gap-1">
                        <Tag className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">{post.category}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {postsTotal > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Toplam {postsTotal} gönderi
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPostsPage(prev => Math.max(1, prev - 1))}
                  disabled={postsPage === 1}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Önceki
                </button>
                <button
                  onClick={() => setPostsPage(prev => prev + 1)}
                  disabled={!postsHasMore}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Sonraki
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Comments Tab */}
      {activeTab === 'comments' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Yorum ara..."
              value={commentsSearch}
              onChange={(e) => setCommentsSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Comments List */}
          {loading && !comments.length ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Yükleniyor...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Yorum bulunamadı</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4"
                >
                  <div className="flex items-start gap-4">
                    <img
                      src={comment.userAvatar}
                      alt={comment.userName}
                      className="w-10 h-10 rounded-full flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{comment.userName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{formatDDMMYYYY(new Date(comment.createdAt))}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          disabled={deletingComment === comment.id}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Sil"
                        >
                          {deletingComment === comment.id ? (
                            <RefreshCw className="w-4 h-4 text-red-600 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-red-600" />
                          )}
                        </button>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 mb-2">{comment.comment}</p>
                      {comment.postCaption && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gönderi:</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">{comment.postCaption}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {commentsTotal > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Toplam {commentsTotal} yorum
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCommentsPage(prev => Math.max(1, prev - 1))}
                  disabled={commentsPage === 1}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Önceki
                </button>
                <button
                  onClick={() => setCommentsPage(prev => prev + 1)}
                  disabled={!commentsHasMore}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Sonraki
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Period Selector */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Periyot:</label>
            <select
              value={statsDays}
              onChange={(e) => setStatsDays(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={7}>Son 7 gün</option>
              <option value={30}>Son 30 gün</option>
              <option value={90}>Son 90 gün</option>
            </select>
          </div>

          {loading && !stats ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Yükleniyor...</p>
            </div>
          ) : stats ? (
            <>
              {/* Total Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Toplam Gönderi', value: stats.totals.posts, icon: ImageIcon, color: 'blue' },
                  { label: 'Toplam Yorum', value: stats.totals.comments, icon: MessageSquare, color: 'green' },
                  { label: 'Toplam Beğeni', value: stats.totals.likes, icon: Heart, color: 'red' },
                  { label: 'Aktif Kullanıcı', value: stats.totals.activeUsers, icon: Users, color: 'purple' }
                ].map((stat) => {
                  const Icon = stat.icon
                  return (
                    <div
                      key={stat.label}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stat.value.toLocaleString()}</p>
                        </div>
                        <Icon className={`w-8 h-8 text-${stat.color}-500`} />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Posts by Category */}
              {stats.postsByCategory.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Kategoriye Göre Gönderiler</h3>
                  <div className="space-y-2">
                    {stats.postsByCategory.map((item) => (
                      <div key={item.category} className="flex items-center justify-between">
                        <span className="text-gray-700 dark:text-gray-300">{item.category || 'Diğer'}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Users */}
              {stats.topUsers.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">En Aktif Kullanıcılar</h3>
                  <div className="space-y-3">
                    {stats.topUsers.map((user, index) => (
                      <div key={user.userId} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-gray-500 dark:text-gray-400 font-medium">#{index + 1}</span>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{user.userName}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{user.userEmail}</p>
                          </div>
                        </div>
                        <span className="font-medium text-blue-600 dark:text-blue-400">{user.postCount} gönderi</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">İstatistik bulunamadı</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Edit Post Modal */}
      <AnimatePresence>
        {showPostModal.open && showPostModal.post && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Gönderi Düzenle</h3>
                  <button
                    onClick={() => {
                      setShowPostModal({ open: false })
                      setEditingPost({})
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Açıklama
                    </label>
                    <textarea
                      value={editingPost.caption || ''}
                      onChange={(e) => setEditingPost({ ...editingPost, caption: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Konum
                    </label>
                    <input
                      type="text"
                      value={editingPost.location || ''}
                      onChange={(e) => setEditingPost({ ...editingPost, location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Kategori
                    </label>
                    <select
                      value={editingPost.category || 'All'}
                      onChange={(e) => setEditingPost({ ...editingPost, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {categories.filter(c => c !== 'Tümü').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => {
                        setShowPostModal({ open: false })
                        setEditingPost({})
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      İptal
                    </button>
                    <button
                      onClick={handleSavePost}
                      disabled={savingPost}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {savingPost ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

