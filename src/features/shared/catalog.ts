import { apiRequest } from './api'

export interface CatalogBookAuthor {
  id: number
  name: string
  slug: string
  biography: string
  createdAt: string
  updatedAt: string
}

export interface CatalogCategory {
  id: number
  name: string
  slug: string
  description: string
  createdAt: string
  updatedAt: string
}

export interface CatalogBook {
  id: number
  categoryId: number
  authors: CatalogBookAuthor[]
  title: string
  slug: string
  description: string
  isbn: string
  price: number
  stock: number
  likeCount: number
  ratingCount: number
  averageRating: number
  coverImageUrl: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface TopSalesCatalogBookResponseData {
  book: CatalogBook
  totalSold: number
}

export interface ApiEnvelope<T> {
  timestamp: string
  status: number
  message: string
  data: T
  path: string
}

export interface PaginatedCatalogBooksResponse {
  content: CatalogBook[]
  totalElements: number
  totalPages: number
  page: number
  size: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface PaginatedCatalogCategoriesResponse {
  content: CatalogCategory[]
  totalElements: number
  totalPages: number
  page: number
  size: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface FetchCatalogBooksParams {
  page?: number
  size?: number
  keyword?: string
  categoryId?: number
  authorId?: number
  minPrice?: number
  maxPrice?: number
  createdFrom?: string
  createdTo?: string
  updatedFrom?: string
  updatedTo?: string
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
}

export interface FetchCatalogBookSearchParams {
  keyword: string
  page?: number
  size?: number
}

export interface FetchCatalogCategoriesParams {
  page?: number
  size?: number
  keyword?: string
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
}

export type BookSortField = 'name' | 'title' | 'slug' | 'price' | 'stock' | 'likeCount' | 'averageRating' | 'updatedAt' | 'createdAt'

function normalizeBookSortField(sortBy?: string): BookSortField {
  switch (sortBy) {
    case 'name':
    case 'title':
    case 'slug':
    case 'price':
    case 'stock':
    case 'likeCount':
    case 'averageRating':
    case 'updatedAt':
    case 'createdAt':
      return sortBy
    default:
      return 'createdAt'
  }
}

export async function fetchCatalogCategories(params: FetchCatalogCategoriesParams = {}) {
  const query = new URLSearchParams()

  query.set('page', String(params.page ?? 0))
  query.set('size', String(params.size ?? 200))

  if (params.keyword && params.keyword.trim().length > 0) {
    query.set('keyword', params.keyword.trim())
  }

  query.set('sortBy', params.sortBy ?? 'name')
  query.set('sortDirection', params.sortDirection ?? 'asc')

  return apiRequest<ApiEnvelope<PaginatedCatalogCategoriesResponse>>(`/catalog/categories?${query.toString()}`, {
    method: 'GET',
  })
}

export async function fetchMostRatedCatalogBook() {
  return apiRequest<ApiEnvelope<CatalogBook>>('/catalog/books/most-rated', {
    method: 'GET',
  })
}

export async function fetchTopSalesCatalogBook() {
  return apiRequest<ApiEnvelope<TopSalesCatalogBookResponseData>>('/catalog/books/top-sales', {
    method: 'GET',
  })
}

export async function searchCatalogBooks(params: FetchCatalogBookSearchParams) {
  const query = new URLSearchParams()

  query.set('page', String(params.page ?? 0))
  query.set('size', String(params.size ?? 5))
  query.set('keyword', params.keyword.trim())
  query.set('sortBy', 'createdAt')
  query.set('sortDirection', 'desc')

  return apiRequest<ApiEnvelope<PaginatedCatalogBooksResponse>>(`/catalog/books?${query.toString()}`, {
    method: 'GET',
  })
}

export async function fetchCatalogBookById(bookId: number) {
  return apiRequest<ApiEnvelope<CatalogBook>>(`/catalog/books/${bookId}`, {
    method: 'GET',
  })
}

export async function fetchCatalogBooks(params: FetchCatalogBooksParams = {}) {
  const query = new URLSearchParams()

  query.set('page', String(params.page ?? 0))
  query.set('size', String(params.size ?? 20))

  if (params.keyword && params.keyword.trim().length > 0) {
    query.set('keyword', params.keyword.trim())
  }

  if (params.categoryId !== undefined && params.categoryId !== null && Number.isFinite(params.categoryId)) {
    query.set('categoryId', String(params.categoryId))
  }

  if (params.authorId !== undefined && params.authorId !== null && Number.isFinite(params.authorId)) {
    query.set('authorId', String(params.authorId))
  }

  if (params.minPrice !== undefined && params.minPrice !== null && Number.isFinite(params.minPrice)) {
    query.set('minPrice', String(params.minPrice))
  }

  if (params.maxPrice !== undefined && params.maxPrice !== null && Number.isFinite(params.maxPrice)) {
    query.set('maxPrice', String(params.maxPrice))
  }

  if (params.createdFrom && params.createdFrom.trim().length > 0) {
    query.set('createdFrom', params.createdFrom.trim())
  }

  if (params.createdTo && params.createdTo.trim().length > 0) {
    query.set('createdTo', params.createdTo.trim())
  }

  if (params.updatedFrom && params.updatedFrom.trim().length > 0) {
    query.set('updatedFrom', params.updatedFrom.trim())
  }

  if (params.updatedTo && params.updatedTo.trim().length > 0) {
    query.set('updatedTo', params.updatedTo.trim())
  }

  query.set('sortBy', normalizeBookSortField(params.sortBy))
  query.set('sortDirection', params.sortDirection ?? 'desc')

  return apiRequest<ApiEnvelope<PaginatedCatalogBooksResponse>>(`/catalog/books?${query.toString()}`, {
    method: 'GET',
  })
}