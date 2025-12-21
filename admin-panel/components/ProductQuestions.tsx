'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, CheckCircle, XCircle, Search, Filter, RefreshCw, X, Package, User, Clock, ThumbsUp, Edit2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'

interface ProductQuestion {
  id: number
  productId?: number
  productName?: string
  productImage?: string
  userId?: number
  userName?: string
  userEmail?: string
  userPhone?: string
  question: string
  answer?: string
  answeredBy?: string
  answeredAt?: string
  helpfulCount?: number
  createdAt: string
  updatedAt?: string
}

export default function ProductQuestions() {
  const [questions, setQuestions] = useState<ProductQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'answered' | 'unanswered'>('all')
  const [selectedQuestion, setSelectedQuestion] = useState<ProductQuestion | null>(null)
  const [showAnswerModal, setShowAnswerModal] = useState(false)
  const [answerText, setAnswerText] = useState('')
  const [answering, setAnswering] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    loadQuestions()
  }, [statusFilter])

  const loadQuestions = async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = {}
      if (statusFilter !== 'all') {
        params.status = statusFilter
      }
      
      const response = await api.get<any>('/admin/product-questions', params)
      const data = response as any
      
      if (data.success && Array.isArray(data.data)) {
        const formattedQuestions = data.data.map((q: any) => ({
          id: q.id,
          productId: q.productId,
          productName: q.productName || 'Bilinmeyen Ürün',
          productImage: q.productImage,
          userId: q.userId,
          userName: q.userName || 'Anonim',
          userEmail: q.userEmail,
          userPhone: q.userPhone,
          question: q.question || '',
          answer: q.answer,
          answeredBy: q.answeredBy,
          answeredAt: q.answeredAt,
          helpfulCount: q.helpfulCount || 0,
          createdAt: new Date(q.createdAt).toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          updatedAt: q.updatedAt
        }))
        setQuestions(formattedQuestions)
      } else {
        setQuestions([])
      }
    } catch (error: any) {
      console.error('Error loading product questions:', error)
      setQuestions([])
    } finally {
      setLoading(false)
    }
  }

  const handleAnswer = (question: ProductQuestion) => {
    setSelectedQuestion(question)
    setAnswerText(question.answer || '')
    setShowAnswerModal(true)
  }

  const submitAnswer = async () => {
    if (!selectedQuestion || !answerText.trim()) {
      alert('Lütfen bir cevap yazın')
      return
    }

    try {
      setAnswering(true)
      await api.post(`/admin/product-questions/${selectedQuestion.id}/answer`, {
        answer: answerText.trim()
      })
      
      setShowAnswerModal(false)
      setSelectedQuestion(null)
      setAnswerText('')
      loadQuestions()
    } catch (error: any) {
      console.error('Error answering question:', error)
      alert('Cevap gönderilirken bir hata oluştu: ' + (error.message || 'Bilinmeyen hata'))
    } finally {
      setAnswering(false)
    }
  }

  const deleteQuestion = async (id: number) => {
    if (!confirm('Bu soruyu silmek istediğinize emin misiniz?')) return
    
    try {
      setDeletingId(id)
      await api.delete(`/admin/product-questions/${id}`)
      setQuestions(questions.filter(q => q.id !== id))
    } catch (error: any) {
      console.error('Error deleting question:', error)
      alert('Soru silinirken bir hata oluştu: ' + (error.message || 'Bilinmeyen hata'))
    } finally {
      setDeletingId(null)
    }
  }

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = 
      q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.answer?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const answeredCount = questions.filter(q => q.answer && q.answer.trim()).length
  const unansweredCount = questions.filter(q => !q.answer || !q.answer.trim()).length

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Ürün Soruları
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Müşterilerin ürünler hakkındaki sorularını yönetin ve cevaplayın
          </p>
        </div>
        <button
          onClick={loadQuestions}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          Yenile
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Toplam Soru</p>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{questions.length}</p>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Cevaplanmamış</p>
          <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{unansweredCount}</p>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Cevaplanmış</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{answeredCount}</p>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-5">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Faydalı Bulunma</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {questions.reduce((sum, q) => sum + (q.helpfulCount || 0), 0)}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Soru, ürün veya kullanıcı ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'answered' | 'unanswered')}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tümü</option>
              <option value="unanswered">Cevaplanmamış</option>
              <option value="answered">Cevaplanmış</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="text-center py-20">
            <MessageSquare className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 text-lg">
              {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz soru bulunmuyor'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map((question, index) => (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 dark:bg-slate-800"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      {question.productImage && (
                        <img
                          src={question.productImage}
                          alt={question.productName}
                          className="w-16 h-16 object-cover rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="w-4 h-4 text-slate-400" />
                          <p className="font-semibold text-slate-800 dark:text-slate-200">
                            {question.productName}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            {question.userName}
                          </p>
                          {question.userEmail && (
                            <span className="text-xs text-slate-400">({question.userEmail})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {question.createdAt}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 mb-3">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Soru:
                      </p>
                      <p className="text-slate-800 dark:text-slate-200">{question.question}</p>
                    </div>

                    {question.answer ? (
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-3 border border-green-200 dark:border-green-800">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-green-700 dark:text-green-400">
                            Cevap:
                          </p>
                          {question.answeredBy && (
                            <span className="text-xs text-green-600 dark:text-green-500">
                              {question.answeredBy} tarafından
                            </span>
                          )}
                        </div>
                        <p className="text-green-800 dark:text-green-300">{question.answer}</p>
                        {question.answeredAt && (
                          <p className="text-xs text-green-600 dark:text-green-500 mt-2">
                            {new Date(question.answeredAt).toLocaleDateString('tr-TR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 mb-3 border border-yellow-200 dark:border-yellow-800">
                        <p className="text-sm text-yellow-700 dark:text-yellow-400">
                          ⏳ Bu soru henüz cevaplanmamış
                        </p>
                      </div>
                    )}

                    {(question.helpfulCount ?? 0) > 0 && (
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <ThumbsUp className="w-4 h-4" />
                        <span>{question.helpfulCount} kişi faydalı buldu</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleAnswer(question)}
                      className="p-2 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/40 rounded-lg transition-colors"
                      title={question.answer ? "Cevabı Düzenle" : "Cevap Ver"}
                    >
                      {question.answer ? (
                        <Edit2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      )}
                    </button>
                    <button
                      onClick={() => deleteQuestion(question.id)}
                      disabled={deletingId === question.id}
                      className="p-2 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-800/40 rounded-lg transition-colors disabled:opacity-50"
                      title="Sil"
                    >
                      {deletingId === question.id ? (
                        <RefreshCw className="w-5 h-5 text-red-600 dark:text-red-400 animate-spin" />
                      ) : (
                        <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Answer Modal */}
      <AnimatePresence>
        {showAnswerModal && selectedQuestion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              if (!answering) {
                setShowAnswerModal(false)
                setSelectedQuestion(null)
                setAnswerText('')
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-2xl w-full"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    Soruya Cevap Ver
                  </h3>
                  <button
                    onClick={() => {
                      if (!answering) {
                        setShowAnswerModal(false)
                        setSelectedQuestion(null)
                        setAnswerText('')
                      }
                    }}
                    disabled={answering}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <X className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                    Ürün:
                  </p>
                  <p className="text-slate-800 dark:text-slate-200 font-semibold">
                    {selectedQuestion.productName}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                    Soru:
                  </p>
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
                    <p className="text-slate-800 dark:text-slate-200">
                      {selectedQuestion.question}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                    Cevap:
                  </label>
                  <textarea
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    placeholder="Soruyu cevaplayın..."
                    rows={6}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    disabled={answering}
                  />
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    if (!answering) {
                      setShowAnswerModal(false)
                      setSelectedQuestion(null)
                      setAnswerText('')
                    }
                  }}
                  disabled={answering}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  onClick={submitAnswer}
                  disabled={answering || !answerText.trim()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {answering ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Gönderiliyor...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Cevabı Gönder
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

