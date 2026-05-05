import { authenticatedApiRequest, type ApiEnvelope } from '../../shared/auth'

export interface DashboardOverviewStats {
  totalUsers: number
  enabledUsers: number
  verifiedUsers: number
  totalBooks: number
  totalCategories: number
  totalAuthors: number
  totalOrders: number
  billableOrders: number
  cancelledOrders: number
  totalRevenue: number
  totalSoldUnits: number
  averageOrderValue: number
}

export interface DashboardRevenueTrendPoint {
  date: string
  orderCount: number
  revenue: number
  soldUnits: number
}

export interface DashboardRevenueLabelPoint {
  label: string
  revenue: number
  soldUnits: number
}

export interface DashboardOrderStatusPoint {
  label: string
  value: number
}

export interface DashboardRecentOrder {
  id: number
  orderNumber: string
  status: string
  paymentMethod: string
  itemCount: number
  totalAmount: number
  createdAt: string
  updatedAt: string
}

export interface DashboardRecentOrderPage {
  content: DashboardRecentOrder[]
  totalElements: number
  totalPages: number
  page: number
  size: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface DashboardBookAuthor {
  id: number
  name: string
  slug: string
  biography: string
  createdAt: string
  updatedAt: string
}

export interface DashboardBookCategory {
  id: number
  name: string
  slug: string
  description: string
  createdAt: string
  updatedAt: string
}

export interface DashboardBook {
  id: number
  categoryId: number
  category?: DashboardBookCategory
  authors: DashboardBookAuthor[]
  title: string
  slug: string
  description: string
  isbn: string
  price: number
  stock: number
  likeCount: number
  ratingCount?: number
  averageRating: number
  coverImageUrl: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface DashboardTopBookItem {
  book: DashboardBook
  totalSold: number
}

export interface DashboardTopBookResponse {
  items: DashboardTopBookItem[]
  totalItems: number
}

export interface DashboardInventoryHealthResponse {
  threshold: number
  totalBooks: number
  lowStockBooks: number
  outOfStockBooks: number
  items: DashboardBook[]
}

export interface DashboardUser {
    period: string
    value: number
}

export interface DashboardUserGrowthResponse {
    data: DashboardUser[]
};

export async function fetchAdminDashboardOverview() {
  return authenticatedApiRequest<ApiEnvelope<DashboardOverviewStats>>('/admin/dashboard/overview')
}

export async function fetchAdminDashboardRevenueTrend(days = 30) {
  const query = new URLSearchParams()
  query.set('days', String(Math.max(1, Math.floor(days))))

  return authenticatedApiRequest<ApiEnvelope<DashboardRevenueTrendPoint[]>>(`/admin/dashboard/revenue-trend?${query.toString()}`)
}

export async function fetchAdminDashboardRevenueByCategory(limit = 10) {
  const query = new URLSearchParams()
  query.set('limit', String(Math.max(1, Math.floor(limit))))

  return authenticatedApiRequest<ApiEnvelope<DashboardRevenueLabelPoint[]>>(`/admin/dashboard/revenue-by-category?${query.toString()}`)
}

export async function fetchAdminDashboardRevenueByAuthor(limit = 10) {
  const query = new URLSearchParams()
  query.set('limit', String(Math.max(1, Math.floor(limit))))

  return authenticatedApiRequest<ApiEnvelope<DashboardRevenueLabelPoint[]>>(`/admin/dashboard/revenue-by-author?${query.toString()}`)
}

export async function fetchAdminDashboardOrderStatus() {
  return authenticatedApiRequest<ApiEnvelope<DashboardOrderStatusPoint[]>>('/admin/dashboard/order-status')
}

export async function fetchAdminDashboardRecentOrders(limit = 10) {
  const query = new URLSearchParams()
  query.set('limit', String(Math.max(1, Math.floor(limit))))

  return authenticatedApiRequest<ApiEnvelope<DashboardRecentOrderPage>>(`/admin/dashboard/recent-orders?${query.toString()}`)
}

export async function fetchAdminDashboardTopBooks(limit = 10) {
  const query = new URLSearchParams()
  query.set('limit', String(Math.max(1, Math.floor(limit))))

  return authenticatedApiRequest<ApiEnvelope<DashboardTopBookResponse>>(`/admin/dashboard/top-books?${query.toString()}`)
}

export async function fetchAdminDashboardInventoryHealth(threshold = 10, limit = 10) {
  const query = new URLSearchParams()
  query.set('threshold', String(Math.max(1, Math.floor(threshold))))
  query.set('limit', String(Math.max(1, Math.floor(limit))))

  return authenticatedApiRequest<ApiEnvelope<DashboardInventoryHealthResponse>>(`/admin/dashboard/inventory-health?${query.toString()}`)
}

export async function fetchAdminDashboardUserGrowth(months = 12) {
  const query = new URLSearchParams()
  query.set('months', String(Math.max(1, Math.floor(months))))

  return authenticatedApiRequest<ApiEnvelope<DashboardUserGrowthResponse>>(`/admin/dashboard/user-growth?${query.toString()}`)
}

export async function fetchAdminDashboardTopCategories(limit = 10) {
  const query = new URLSearchParams()
  query.set('limit', String(Math.max(1, Math.floor(limit))))

  return authenticatedApiRequest<ApiEnvelope<unknown>>(`/admin/dashboard/top-categories?${query.toString()}`)
}
