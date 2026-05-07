import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { 
  Menu, 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  BookOpen, 
  FolderOpen, 
  UserCheck, 
  ShoppingCart,
  DollarSign,
  Package,
  AlertTriangle,
  Loader2,
  RefreshCcw,
} from 'lucide-react'
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'

import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import AdminSidebar from '../components/AdminSidebar'
import { loadAuthSession, logout } from '../../shared/auth'
import {
  fetchAdminDashboardOverview,
  fetchAdminDashboardRevenueTrend,
  fetchAdminDashboardRevenueByCategory,
  fetchAdminDashboardRevenueByAuthor,
  fetchAdminDashboardOrderStatus,
  fetchAdminDashboardRecentOrders,
  fetchAdminDashboardTopBooks,
  fetchAdminDashboardInventoryHealth,
  fetchAdminDashboardUserGrowth,
  type DashboardOverviewStats,
  type DashboardRevenueTrendPoint,
  type DashboardRevenueLabelPoint,
  type DashboardOrderStatusPoint,
  type DashboardRecentOrder,
  type DashboardTopBookItem,
  type DashboardBook,
  type DashboardUserGrowthResponse
} from '../lib/adminDashboard'

// Chart color palette
const CHART_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', 
  '#06b6d4', '#f97316', '#a855f7', '#14b8a6', '#ef4444'
]

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatCompactNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toString()
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString()
}

function formatDate(value: string): string {
  const date = new Date(value)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getStatusBadgeClass(status: string): string {
  const statusLower = status.toLowerCase()
  if (statusLower.includes('completed') || statusLower.includes('delivered')) {
    return 'border-emerald-300/70 bg-emerald-50 text-emerald-700'
  }
  if (statusLower.includes('pending') || statusLower.includes('processing')) {
    return 'border-amber-300/70 bg-amber-50 text-amber-800'
  }
  if (statusLower.includes('cancelled') || statusLower.includes('failed')) {
    return 'border-rose-300/70 bg-rose-50 text-rose-700'
  }
  return 'border-sky-300/70 bg-sky-50 text-sky-700'
}

export function AdminDashboardPage() {
  const session = loadAuthSession()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true,
  )
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  
  // Data states
  const [overviewStats, setOverviewStats] = useState<DashboardOverviewStats | null>(null)
  const [revenueTrend, setRevenueTrend] = useState<DashboardRevenueTrendPoint[]>([])
  const [revenueByCategory, setRevenueByCategory] = useState<DashboardRevenueLabelPoint[]>([])
  const [revenueByAuthor, setRevenueByAuthor] = useState<DashboardRevenueLabelPoint[]>([])
  const [orderStatus, setOrderStatus] = useState<DashboardOrderStatusPoint[]>([])
  const [recentOrders, setRecentOrders] = useState<DashboardRecentOrder[]>([])
  const [topBooks, setTopBooks] = useState<DashboardTopBookItem[]>([])
  const [lowStockBooks, setLowStockBooks] = useState<DashboardBook[]>([])
  const [userGrowth, setUserGrowth] = useState<DashboardUserGrowthResponse | null>(null)
  
  // Loading states
  const [isLoadingOverview, setIsLoadingOverview] = useState(true)
  const [isLoadingCharts, setIsLoadingCharts] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  // Chart configuration
  const [revenueTrendDays, setRevenueTrendDays] = useState(30)

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await logout()
    } finally {
      window.location.assign('/admin/login')
    }
  }

  const loadDashboardData = useCallback(async () => {
    setErrorMessage(null)
    
    try {
      // Load overview stats first
      setIsLoadingOverview(true)
      const overviewResponse = await fetchAdminDashboardOverview()
      setOverviewStats(overviewResponse.data)
      setIsLoadingOverview(false)
      
      // Load all chart data in parallel
      setIsLoadingCharts(true)
      const [
        trendResponse,
        categoryResponse,
        authorResponse,
        statusResponse,
        ordersResponse,
        booksResponse,
        inventoryResponse,
        growthResponse
      ] = await Promise.all([
        fetchAdminDashboardRevenueTrend(revenueTrendDays),
        fetchAdminDashboardRevenueByCategory(8),
        fetchAdminDashboardRevenueByAuthor(8),
        fetchAdminDashboardOrderStatus(),
        fetchAdminDashboardRecentOrders(10),
        fetchAdminDashboardTopBooks(10),
        fetchAdminDashboardInventoryHealth(10, 10),
        fetchAdminDashboardUserGrowth(12)
      ])
      
      setRevenueTrend(trendResponse.data)
      setRevenueByCategory(categoryResponse.data)
      setRevenueByAuthor(authorResponse.data)
      setOrderStatus(statusResponse.data)
      setRecentOrders(ordersResponse.data.content)
      setTopBooks(booksResponse.data.items)
      setLowStockBooks(inventoryResponse.data.items)
      setUserGrowth(growthResponse.data)
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load dashboard data.'
      setErrorMessage(message)
    } finally {
      setIsLoadingOverview(false)
      setIsLoadingCharts(false)
    }
  }, [revenueTrendDays])

  useEffect(() => {
    if (!session?.accessToken) return
    void loadDashboardData()
  }, [loadDashboardData, session?.accessToken])

  async function handleRefresh() {
    setIsRefreshing(true)
    try {
      await loadDashboardData()
    } finally {
      setIsRefreshing(false)
    }
  }

  if (!session?.accessToken) {
    return <Navigate replace to="/admin/login" />
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.85),transparent_34%),linear-gradient(to_bottom_right,rgba(249,250,251,1),rgba(255,255,255,1))] text-foreground dark:bg-background">
      <div className={`mx-auto min-h-screen w-full max-w-[1600px] transition-[padding] duration-200 ${isDesktopSidebarOpen ? 'lg:pl-72' : 'lg:pl-0'}`}>
        <AdminSidebar
          activeHref="/admin/dashboard/overview"
          isOpen={isMobileSidebarOpen}
          isDesktopOpen={isDesktopSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          onToggleDesktop={() => setIsDesktopSidebarOpen((current) => !current)}
          onLogout={() => void handleLogout()}
          isLoggingOut={isLoggingOut}
        />

        <section className="space-y-6 px-4 py-5 sm:px-6 lg:px-6 lg:py-8 lg:pl-4">
          {/* Header */}
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="flex flex-col gap-4 border-b bg-gradient-to-r from-muted/20 via-background to-background sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="lg:hidden" 
                    onClick={() => setIsMobileSidebarOpen(true)}
                  >
                    <Menu className="size-4" />
                  </Button>
                  <Badge className="w-fit gap-2">
                    <ShieldCheck className="size-3.5" />
                    Admin Dashboard
                  </Badge>
                </div>
                <CardTitle className="text-3xl tracking-tight">Dashboard Overview</CardTitle>
                <CardDescription>
                  Real-time analytics and key metrics for your bookstore platform.
                </CardDescription>
              </div>
              
              <Button
                variant="outline"
                onClick={() => void handleRefresh()}
                disabled={isRefreshing}
                className="gap-2"
              >
                {isRefreshing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCcw className="size-4" />
                )}
                Refresh
              </Button>
            </CardHeader>

            <CardContent className="space-y-6 p-5 sm:p-6">
              {/* Error Alert */}
              {errorMessage && (
                <Alert variant="destructive">
                  <AlertTitle>Failed to load dashboard</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              {/* Overview Stats Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <Card className="border-border/70 bg-gradient-to-br from-blue-50/80 to-background shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-xs font-medium uppercase tracking-wider">
                        Total Users
                      </CardDescription>
                      <Users className="size-4 text-blue-600" />
                    </div>
                    {isLoadingOverview ? (
                      <div className="h-8 w-20 animate-pulse rounded bg-muted" />
                    ) : (
                      <CardTitle className="text-2xl tabular-nums">
                        {formatCompactNumber(overviewStats?.totalUsers ?? 0)}
                      </CardTitle>
                    )}
                  </CardHeader>
                </Card>

                <Card className="border-border/70 bg-gradient-to-br from-emerald-50/80 to-background shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-xs font-medium uppercase tracking-wider">
                        Verified
                      </CardDescription>
                      <UserCheck className="size-4 text-emerald-600" />
                    </div>
                    {isLoadingOverview ? (
                      <div className="h-8 w-20 animate-pulse rounded bg-muted" />
                    ) : (
                      <CardTitle className="text-2xl tabular-nums">
                        {formatCompactNumber(overviewStats?.verifiedUsers ?? 0)}
                      </CardTitle>
                    )}
                  </CardHeader>
                </Card>

                <Card className="border-border/70 bg-gradient-to-br from-violet-50/80 to-background shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-xs font-medium uppercase tracking-wider">
                        Books
                      </CardDescription>
                      <BookOpen className="size-4 text-violet-600" />
                    </div>
                    {isLoadingOverview ? (
                      <div className="h-8 w-20 animate-pulse rounded bg-muted" />
                    ) : (
                      <CardTitle className="text-2xl tabular-nums">
                        {formatCompactNumber(overviewStats?.totalBooks ?? 0)}
                      </CardTitle>
                    )}
                  </CardHeader>
                </Card>

                <Card className="border-border/70 bg-gradient-to-br from-amber-50/80 to-background shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-xs font-medium uppercase tracking-wider">
                        Categories
                      </CardDescription>
                      <FolderOpen className="size-4 text-amber-600" />
                    </div>
                    {isLoadingOverview ? (
                      <div className="h-8 w-20 animate-pulse rounded bg-muted" />
                    ) : (
                      <CardTitle className="text-2xl tabular-nums">
                        {overviewStats?.totalCategories ?? 0}
                      </CardTitle>
                    )}
                  </CardHeader>
                </Card>

                <Card className="border-border/70 bg-gradient-to-br from-pink-50/80 to-background shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-xs font-medium uppercase tracking-wider">
                        Orders
                      </CardDescription>
                      <ShoppingCart className="size-4 text-pink-600" />
                    </div>
                    {isLoadingOverview ? (
                      <div className="h-8 w-20 animate-pulse rounded bg-muted" />
                    ) : (
                      <CardTitle className="text-2xl tabular-nums">
                        {formatCompactNumber(overviewStats?.totalOrders ?? 0)}
                      </CardTitle>
                    )}
                  </CardHeader>
                </Card>

                <Card className="border-border/70 bg-gradient-to-br from-cyan-50/80 to-background shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-xs font-medium uppercase tracking-wider">
                        Units Sold
                      </CardDescription>
                      <Package className="size-4 text-cyan-600" />
                    </div>
                    {isLoadingOverview ? (
                      <div className="h-8 w-20 animate-pulse rounded bg-muted" />
                    ) : (
                      <CardTitle className="text-2xl tabular-nums">
                        {formatCompactNumber(overviewStats?.totalSoldUnits ?? 0)}
                      </CardTitle>
                    )}
                  </CardHeader>
                </Card>
              </div>

              {/* Revenue Highlight Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-border/70 bg-gradient-to-br from-green-50/80 to-background shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-xs font-medium uppercase tracking-wider">
                        Total Revenue
                      </CardDescription>
                      <DollarSign className="size-5 text-green-600" />
                    </div>
                    {isLoadingOverview ? (
                      <div className="h-10 w-32 animate-pulse rounded bg-muted" />
                    ) : (
                      <>
                        <CardTitle className="text-3xl tabular-nums">
                          {formatCurrency(overviewStats?.totalRevenue ?? 0)}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          From {formatCompactNumber(overviewStats?.billableOrders ?? 0)} billable orders
                        </p>
                      </>
                    )}
                  </CardHeader>
                </Card>

                <Card className="border-border/70 bg-gradient-to-br from-blue-50/80 to-background shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-xs font-medium uppercase tracking-wider">
                        Avg Order Value
                      </CardDescription>
                      <TrendingUp className="size-5 text-blue-600" />
                    </div>
                    {isLoadingOverview ? (
                      <div className="h-10 w-32 animate-pulse rounded bg-muted" />
                    ) : (
                      <>
                        <CardTitle className="text-3xl tabular-nums">
                          {formatCurrency(overviewStats?.averageOrderValue ?? 0)}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          Per completed order
                        </p>
                      </>
                    )}
                  </CardHeader>
                </Card>

                <Card className="border-border/70 bg-gradient-to-br from-orange-50/80 to-background shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-xs font-medium uppercase tracking-wider">
                        Cancelled Orders
                      </CardDescription>
                      <AlertTriangle className="size-5 text-orange-600" />
                    </div>
                    {isLoadingOverview ? (
                      <div className="h-10 w-32 animate-pulse rounded bg-muted" />
                    ) : (
                      <>
                        <CardTitle className="text-3xl tabular-nums">
                          {overviewStats?.cancelledOrders ?? 0}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {overviewStats?.totalOrders 
                            ? `${((overviewStats.cancelledOrders / overviewStats.totalOrders) * 100).toFixed(1)}% of total`
                            : 'No orders yet'
                          }
                        </p>
                      </>
                    )}
                  </CardHeader>
                </Card>
              </div>

              {/* Charts Section */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Revenue Trend Chart */}
                <Card className="border-border/70 shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Revenue Trend</CardTitle>
                        <CardDescription>Daily revenue over time</CardDescription>
                      </div>
                      <select
                        value={revenueTrendDays}
                        onChange={(e) => setRevenueTrendDays(Number(e.target.value))}
                        className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                      >
                        <option value={7}>7 days</option>
                        <option value={14}>14 days</option>
                        <option value={30}>30 days</option>
                        <option value={60}>60 days</option>
                        <option value={90}>90 days</option>
                      </select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoadingCharts ? (
                      <div className="flex h-[300px] items-center justify-center">
                        <Loader2 className="size-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : revenueTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={revenueTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={formatDate}
                            stroke="#6b7280"
                            fontSize={12}
                          />
                          <YAxis 
                            tickFormatter={(value: number) => formatCurrency(value)}
                            stroke="#6b7280"
                            fontSize={12}
                          />
                          <Tooltip 
                            formatter={(value) =>
                              typeof value === 'number' ? formatCurrency(value) : value
                            }
                            labelFormatter={(label) =>
                              typeof label === 'string' ? formatDate(label) : String(label)
                            }
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '12px'
                            }}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            dot={{ fill: '#3b82f6', r: 4 }}
                            activeDot={{ r: 6 }}
                            name="Revenue"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                        No revenue data available
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Order Status Pie Chart */}
                <Card className="border-border/70 shadow-sm">
                  <CardHeader>
                    <CardTitle>Order Status Distribution</CardTitle>
                    <CardDescription>Breakdown of all orders by status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingCharts ? (
                      <div className="flex h-[300px] items-center justify-center">
                        <Loader2 className="size-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : orderStatus.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={orderStatus}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name ?? ''} (${((percent ?? 0) * 100).toFixed(0)}%)`
                            }
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {orderStatus.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '12px'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                        No order status data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Revenue by Category and Author Bar Charts */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-border/70 shadow-sm">
                  <CardHeader>
                    <CardTitle>Revenue by Category</CardTitle>
                    <CardDescription>Top performing book categories</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingCharts ? (
                      <div className="flex h-[300px] items-center justify-center">
                        <Loader2 className="size-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : revenueByCategory.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={revenueByCategory}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey="label" 
                            stroke="#6b7280"
                            fontSize={12}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis 
                            tickFormatter={(value: number) => formatCurrency(value)}
                            stroke="#6b7280"
                            fontSize={12}
                          />
                          <Tooltip
                            formatter={(value) =>
                              typeof value === 'number' ? formatCurrency(value) : value
                            }
                            labelFormatter={(label) =>
                              typeof label === 'string' ? formatDate(label) : String(label)
                            }
                          />
                          <Bar dataKey="revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Revenue" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                        No category revenue data available
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/70 shadow-sm">
                  <CardHeader>
                    <CardTitle>Revenue by Author</CardTitle>
                    <CardDescription>Top selling authors</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingCharts ? (
                      <div className="flex h-[300px] items-center justify-center">
                        <Loader2 className="size-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : revenueByAuthor.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={revenueByAuthor}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey="label" 
                            stroke="#6b7280"
                            fontSize={12}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis 
                            tickFormatter={(value: number) => formatCurrency(value)}
                            stroke="#6b7280"
                            fontSize={12}
                          />
                          <Tooltip
                            formatter={(value) =>
                              typeof value === 'number' ? formatCurrency(value) : value
                            }
                            labelFormatter={(label) =>
                              typeof label === 'string' ? formatDate(label) : String(label)
                            }
                          />
                          <Bar dataKey="revenue" fill="#ec4899" radius={[4, 4, 0, 0]} name="Revenue" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                        No author revenue data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* User Growth Chart */}
              {userGrowth?.data?.length ? (
                <Card className="border-border/70 shadow-sm">
                  <CardHeader>
                    <CardTitle>User Growth</CardTitle>
                    <CardDescription>Monthly user registration trend</CardDescription>
                  </CardHeader>

                  <CardContent>
                    {isLoadingCharts ? (
                      <div className="flex h-[300px] items-center justify-center">
                        <Loader2 className="size-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={userGrowth.data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

                          <XAxis
                            dataKey="period"
                            stroke="#6b7280"
                            fontSize={12}
                          />

                          <YAxis
                            stroke="#6b7280"
                            fontSize={12}
                          />

                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '12px'
                            }}
                          />

                          <Legend />

                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={{ fill: '#10b981', r: 4 }}
                            activeDot={{ r: 6 }}
                            name="New Users"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              ) : null}

              {/* Tables Section */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Top Books */}
                <Card className="border-border/70 shadow-sm">
                  <CardHeader>
                    <CardTitle>Top Selling Books</CardTitle>
                    <CardDescription>Best performing titles by units sold</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingCharts ? (
                      <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="flex items-center gap-3 animate-pulse">
                            <div className="h-16 w-12 rounded bg-muted" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 w-3/4 rounded bg-muted" />
                              <div className="h-3 w-1/2 rounded bg-muted" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : topBooks.length > 0 ? (
                      <div className="space-y-3">
                        {topBooks.map((item, index) => (
                          <div 
                            key={item.book.id} 
                            className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/10 p-3 transition hover:bg-muted/20"
                          >
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-black from-blue-500 to-violet-600 font-semibold text-white text-sm">
                              {index + 1}
                            </div>
                            {item.book.coverImageUrl ? (
                              <img 
                                src={item.book.coverImageUrl} 
                                alt={item.book.title}
                                className="h-16 w-12 rounded object-cover shadow-sm"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-16 w-12 items-center justify-center rounded bg-muted">
                                <BookOpen className="size-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm text-foreground truncate">
                                {item.book.title}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {item.book.authors.map(a => a.name).join(', ')}
                              </p>
                              <div className="mt-1 flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {item.totalSold} sold
                                </Badge>
                                <span className="text-xs font-semibold text-green-600">
                                  {formatCurrency(item.book.price * item.totalSold)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                        No sales data available
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Low Stock Inventory */}
                <Card className="border-border/70 shadow-sm">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="size-5 text-orange-600" />
                      <div>
                        <CardTitle>Low Stock Alert</CardTitle>
                        <CardDescription>Books running low on inventory</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoadingCharts ? (
                      <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="flex items-center gap-3 animate-pulse">
                            <div className="h-16 w-12 rounded bg-muted" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 w-3/4 rounded bg-muted" />
                              <div className="h-3 w-1/2 rounded bg-muted" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : lowStockBooks.length > 0 ? (
                      <div className="space-y-3">
                        {lowStockBooks.map((book) => (
                          <div 
                            key={book.id} 
                            className="flex items-center gap-3 rounded-lg border border-orange-200/70 bg-orange-50/30 p-3 transition hover:bg-orange-50/50"
                          >
                            {book.coverImageUrl ? (
                              <img 
                                src={book.coverImageUrl} 
                                alt={book.title}
                                className="h-16 w-12 rounded object-cover shadow-sm"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-16 w-12 items-center justify-center rounded bg-muted">
                                <BookOpen className="size-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm text-foreground truncate">
                                {book.title}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {book.authors.map(a => a.name).join(', ')}
                              </p>
                              <div className="mt-1 flex items-center gap-2">
                                <Badge 
                                  variant="outline" 
                                  className="border-orange-300/70 bg-orange-100 text-orange-800 text-xs"
                                >
                                  {book.stock === 0 ? 'Out of stock' : `${book.stock} left`}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatCurrency(book.price)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                        All books are well stocked
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Recent Orders Table */}
              <Card className="border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>Latest customer orders and transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingCharts ? (
                    <div className="space-y-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-16 animate-pulse rounded bg-muted" />
                      ))}
                    </div>
                  ) : recentOrders.length > 0 ? (
                    <div className="overflow-hidden rounded-2xl border border-border/70">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px] border-collapse text-left text-sm">
                          <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                            <tr>
                              <th className="px-4 py-3 font-semibold">Order Number</th>
                              <th className="px-4 py-3 font-semibold">Status</th>
                              <th className="px-4 py-3 font-semibold">Payment</th>
                              <th className="px-4 py-3 font-semibold">Items</th>
                              <th className="px-4 py-3 font-semibold">Amount</th>
                              <th className="px-4 py-3 font-semibold">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/70 bg-background">
                            {recentOrders.map((order) => (
                              <tr key={order.id} className="transition hover:bg-muted/20">
                                <td className="px-4 py-3 font-medium">
                                  #{order.orderNumber}
                                </td>
                                <td className="px-4 py-3">
                                  <Badge variant="outline" className={getStatusBadgeClass(order.status)}>
                                    {order.status}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">
                                  {order.paymentMethod}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">
                                  {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                                </td>
                                <td className="px-4 py-3 font-semibold">
                                  {formatCurrency(order.totalAmount)}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground text-xs">
                                  {formatDateTime(order.createdAt)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                      No recent orders
                    </div>
                  )}
                </CardContent>
              </Card>

            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}

export default AdminDashboardPage