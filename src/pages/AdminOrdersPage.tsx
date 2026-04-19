import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, FileSpreadsheet, FileText, Loader2, Menu, RefreshCcw, Search, ShieldCheck, X } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import AdminSidebar from '../components/admin/AdminSidebar'
import { Input } from '../components/ui/input'
import { clearAuthSession, loadAuthSession, logoutAdmin } from '../lib/auth'
import { fetchAdminOrder, fetchAdminOrders, patchAdminOrderStatus, type AdminOrder } from '../lib/adminOrders'
import { exportRowsToExcel, exportRowsToPdf, type ExportColumn } from '../lib/exportTable'

type OrderPageMeta = {
  totalElements: number
  totalPages: number
  page: number
  size: number
  hasNext: boolean
  hasPrevious: boolean
}

const defaultOrderPageMeta: OrderPageMeta = {
  totalElements: 0,
  totalPages: 0,
  page: 0,
  size: 20,
  hasNext: false,
  hasPrevious: false,
}

function normalizeOrders(value: unknown): AdminOrder[] {
  return Array.isArray(value) ? (value as AdminOrder[]) : []
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString()
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

function getStatusBadgeClasses(status: string) {
  switch (status.toUpperCase()) {
    case 'PENDING':
      return 'border-slate-300/70 bg-slate-50 text-slate-700'
    case 'PROCESSING':
      return 'border-amber-300/70 bg-amber-50 text-amber-800'
    case 'SHIPPED':
      return 'border-sky-300/70 bg-sky-50 text-sky-700'
    case 'DELIVERED':
      return 'border-emerald-300/70 bg-emerald-50 text-emerald-700'
    case 'CANCELLED':
      return 'border-rose-300/70 bg-rose-50 text-rose-700'
    default:
      return 'border-slate-300/70 bg-slate-50 text-slate-700'
  }
}

const orderStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const

function formatStatusLabel(value: string) {
  return value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getOrderStatusOptions() {
  return orderStatuses.map((value) => ({ value, label: formatStatusLabel(value) }))
}

export function AdminOrdersPage() {
  const session = loadAuthSession()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true,
  )
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [orderPageMeta, setOrderPageMeta] = useState<OrderPageMeta>(defaultOrderPageMeta)
  const [page, setPage] = useState(0)
  const [isLoadingOrders, setIsLoadingOrders] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [pageErrorMessage, setPageErrorMessage] = useState<string | null>(null)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('')
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'totalAmount' | 'itemCount'>('createdAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null)
  const [selectedOrderStatus, setSelectedOrderStatus] = useState('')
  const [isLoadingOrderDetails, setIsLoadingOrderDetails] = useState(false)
  const [orderDetailErrorMessage, setOrderDetailErrorMessage] = useState<string | null>(null)
  const [isUpdatingOrderStatus, setIsUpdatingOrderStatus] = useState(false)
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false)
  const pageSize = 20

  async function handleLogout() {
    setIsLoggingOut(true)

    try {
      await logoutAdmin()
      clearAuthSession()
    } finally {
      window.location.assign('/admin/login')
    }
  }

  const loadOrders = useCallback(
    async (nextPage = page) => {
      setIsLoadingOrders(true)
      setPageErrorMessage(null)

      try {
        const response = await fetchAdminOrders({
          page: nextPage,
          size: pageSize,
          keyword,
          status,
          sortBy,
          sortDirection,
          createdFrom,
          createdTo,
        })

        setOrders(normalizeOrders(response.data.content))
        setOrderPageMeta({
          totalElements: response.data.totalElements,
          totalPages: response.data.totalPages,
          page: response.data.page,
          size: response.data.size,
          hasNext: response.data.hasNext,
          hasPrevious: response.data.hasPrevious,
        })
        setPage(response.data.page)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load orders.'
        setPageErrorMessage(message)
      } finally {
        setIsLoadingOrders(false)
      }
    },
    [createdFrom, createdTo, keyword, page, pageSize, sortBy, sortDirection, status],
  )

  useEffect(() => {
    if (!session?.accessToken) {
      return
    }

    void loadOrders(page)
  }, [loadOrders, page, session?.accessToken])

  useEffect(() => {
    if (!selectedOrder) {
      setSelectedOrderStatus('')
      setIsLoadingOrderDetails(false)
      setOrderDetailErrorMessage(null)
      return
    }

    setSelectedOrderStatus(selectedOrder.status)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedOrder(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedOrder])

  async function openOrderDetails(order: AdminOrder) {
    setSelectedOrder(order)
    setSelectedOrderStatus(order.status)
    setIsLoadingOrderDetails(true)
    setOrderDetailErrorMessage(null)

    try {
      const response = await fetchAdminOrder(order.id)
      setSelectedOrder(response.data)
      setSelectedOrderStatus(response.data.status)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load order details.'
      setOrderDetailErrorMessage(message)
    } finally {
      setIsLoadingOrderDetails(false)
    }
  }

  if (!session?.accessToken) {
    return <Navigate replace to="/admin/login" />
  }

  async function handleUpdateSelectedOrderStatus() {
    if (!selectedOrder || !selectedOrderStatus || selectedOrderStatus === selectedOrder.status || isUpdatingOrderStatus) {
      return
    }

    setIsUpdatingOrderStatus(true)
    setPageErrorMessage(null)
    setOrderDetailErrorMessage(null)

    const previousStatus = selectedOrder.status
    const nextStatus = selectedOrderStatus

    setSelectedOrder({ ...selectedOrder, status: nextStatus })

    try {
      const response = await patchAdminOrderStatus({ id: selectedOrder.id, status: nextStatus })
      const updatedOrder = response.data

      setSelectedOrder(updatedOrder)
      setSelectedOrderStatus(updatedOrder.status)
      setOrders((currentOrders) => currentOrders.map((order) => (order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order)))
    } catch (error) {
      setSelectedOrder((currentOrder) => (currentOrder ? { ...currentOrder, status: previousStatus } : currentOrder))
      setSelectedOrderStatus(previousStatus)
      const message = error instanceof Error ? error.message : 'Failed to update order status.'
      setPageErrorMessage(message)
    } finally {
      setIsUpdatingOrderStatus(false)
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true)

    try {
      await loadOrders(page)
    } finally {
      setIsRefreshing(false)
    }
  }

  async function getOrdersForExport() {
    const response = await fetchAdminOrders({
      page: 0,
      size: Math.max(orderPageMeta.totalElements, orders.length, 1),
      keyword,
      status,
      sortBy,
      sortDirection,
      createdFrom,
      createdTo,
    })

    return normalizeOrders(response.data.content)
  }

  async function handleExportExcel() {
    setIsExportingExcel(true)
    setPageErrorMessage(null)

    try {
      const rows = await getOrdersForExport()
      const columns: ExportColumn<AdminOrder>[] = [
        { header: 'ID', value: (row) => row.id },
        { header: 'Order number', value: (row) => row.orderNumber },
        { header: 'Status', value: (row) => row.status },
        { header: 'Payment method', value: (row) => row.paymentMethod },
        { header: 'Recipient name', value: (row) => row.recipientName ?? '' },
        { header: 'Recipient phone', value: (row) => row.recipientPhone ?? '' },
        { header: 'Shipping address', value: (row) => row.shippingAddress ?? '' },
        { header: 'Note', value: (row) => row.note ?? '' },
        { header: 'Item count', value: (row) => row.itemCount },
        { header: 'Subtotal', value: (row) => formatCurrency(row.subtotal ?? row.totalAmount) },
        { header: 'Shipping fee', value: (row) => formatCurrency(row.shippingFee ?? 0) },
        { header: 'Total amount', value: (row) => formatCurrency(row.totalAmount) },
        { header: 'Created at', value: (row) => formatDateTime(row.createdAt) },
        { header: 'Updated at', value: (row) => formatDateTime(row.updatedAt) },
      ]

      exportRowsToExcel(rows, columns, 'orders.xlsx', 'Orders')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export orders to Excel.'
      setPageErrorMessage(message)
    } finally {
      setIsExportingExcel(false)
    }
  }

  async function handleExportPdf() {
    setIsExportingPdf(true)
    setPageErrorMessage(null)

    try {
      const rows = await getOrdersForExport()
      const columns: ExportColumn<AdminOrder>[] = [
        { header: 'Order number', value: (row) => row.orderNumber },
        { header: 'Status', value: (row) => row.status },
        { header: 'Payment', value: (row) => row.paymentMethod },
        { header: 'Recipient', value: (row) => row.recipientName ?? '' },
        { header: 'Phone', value: (row) => row.recipientPhone ?? '' },
        { header: 'Item count', value: (row) => row.itemCount },
        { header: 'Subtotal', value: (row) => formatCurrency(row.subtotal ?? row.totalAmount) },
        { header: 'Shipping fee', value: (row) => formatCurrency(row.shippingFee ?? 0) },
        { header: 'Total amount', value: (row) => formatCurrency(row.totalAmount) },
        { header: 'Updated at', value: (row) => formatDateTime(row.updatedAt) },
      ]

      exportRowsToPdf(rows, columns, 'Orders export', 'orders.pdf')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export orders to PDF.'
      setPageErrorMessage(message)
    } finally {
      setIsExportingPdf(false)
    }
  }

  function generateOrderInvoicePdf(order: AdminOrder) {
    const document = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
    const pageWidth = document.internal.pageSize.getWidth()

    document.setFontSize(18)
    document.setFont('helvetica', 'bold')
    document.text('Bookstore Invoice', 40, 40)
    document.setDrawColor(120)
    document.setLineWidth(0.75)
    document.line(40, 50, pageWidth - 40, 50)

    document.setFontSize(13)
    document.text('Order confirmed', 40, 76)

    document.setFontSize(10)
    document.setFont('helvetica', 'normal')
    document.text(`Order ${order.orderNumber}`, 40, 96)
    document.text(`Generated ${new Date().toLocaleString()}`, 40, 112)

    autoTable(document, {
      startY: 132,
      head: [['Field', 'Value']],
      body: [
        ['Order number', order.orderNumber],
        ['Date', formatDateTime(order.createdAt)],
        ['Status', order.status],
        ['Payment method', order.paymentMethod],
        ['Customer', order.recipientName ?? ''],
        ['Recipient phone', order.recipientPhone ?? ''],
        ['Shipping address', order.shippingAddress ?? ''],
      ],
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 5,
        overflow: 'linebreak',
        valign: 'middle',
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 140, fontStyle: 'bold' },
        1: { cellWidth: 'auto' },
      },
    })

    const items = order.items ?? []

    autoTable(document, {
      startY: (document as typeof document & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY
        ? (document as typeof document & { lastAutoTable?: { finalY?: number } }).lastAutoTable!.finalY! + 18
        : 220,
      head: [['Item', 'Qty', 'Unit price', 'Line total']],
      body: items.length > 0
        ? items.map((item) => [item.title, String(item.quantity), formatCurrency(item.unitPrice), formatCurrency(item.lineTotal)])
        : [['No items available', '', '', '']],
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 5,
        overflow: 'linebreak',
        valign: 'middle',
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    })

    autoTable(document, {
      startY: (document as typeof document & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY
        ? (document as typeof document & { lastAutoTable?: { finalY?: number } }).lastAutoTable!.finalY! + 18
        : 320,
      head: [['Totals', 'Amount']],
      body: [
        ['Subtotal', formatCurrency(order.subtotal ?? order.totalAmount)],
        ['Shipping fee', formatCurrency(order.shippingFee ?? 0)],
        ['Total', formatCurrency(order.totalAmount)],
      ],
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 5,
        overflow: 'linebreak',
        valign: 'middle',
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 140, fontStyle: 'bold' },
        1: { cellWidth: 'auto' },
      },
    })

    document.setFontSize(9)
    document.text('Keep this invoice for your records.', 40, (document as typeof document & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ? (document as typeof document & { lastAutoTable?: { finalY?: number } }).lastAutoTable!.finalY! + 24 : 500)

    document.save(`invoice-${order.orderNumber}.pdf`)
  }

  async function handleGenerateInvoice() {
    if (!selectedOrder || isGeneratingInvoice) {
      return
    }

    setIsGeneratingInvoice(true)

    try {
      generateOrderInvoicePdf(selectedOrder)
    } finally {
      setIsGeneratingInvoice(false)
    }
  }

  function handleClearFilters() {
    setPage(0)
    setKeyword('')
    setStatus('')
    setCreatedFrom('')
    setCreatedTo('')
    setSortBy('createdAt')
    setSortDirection('desc')
  }

  function handlePageChange(nextPage: number) {
    setPage(Math.max(0, nextPage))
  }

  function getVisiblePageNumbers(totalPages: number, currentPageIndex: number) {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1)
    }

    const currentPageNumber = currentPageIndex + 1
    const pages = new Set<number>([1, totalPages])

    for (let offset = -1; offset <= 1; offset += 1) {
      const candidate = currentPageNumber + offset
      if (candidate > 1 && candidate < totalPages) {
        pages.add(candidate)
      }
    }

    return Array.from(pages).sort((left, right) => left - right)
  }

  const currentPageMeta = orderPageMeta ?? defaultOrderPageMeta
  const displayedPage = currentPageMeta.page + 1
  const visibleOrderCount = orders.length
  const sortLabel = `${
    sortBy === 'createdAt'
      ? 'Created at'
      : sortBy === 'updatedAt'
        ? 'Updated at'
        : sortBy === 'totalAmount'
          ? 'Total amount'
          : 'Item count'
  } ${sortDirection.toUpperCase()}`
  const hasTextFilter = keyword.trim().length > 0
  const hasDateFilters = Boolean(createdFrom || createdTo)
  const activeFilterLabel = hasTextFilter || hasDateFilters || status ? 'Filtered orders' : 'All orders'
  const startItem = currentPageMeta.totalElements === 0 ? 0 : currentPageMeta.page * currentPageMeta.size + 1
  const endItem = Math.min(currentPageMeta.totalElements, currentPageMeta.page * currentPageMeta.size + visibleOrderCount)
  const visiblePageNumbers = getVisiblePageNumbers(currentPageMeta.totalPages, currentPageMeta.page)
  const currentPageRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0)
  const currentPageItems = orders.reduce((sum, order) => sum + order.itemCount, 0)

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.85),transparent_34%),linear-gradient(to_bottom_right,rgba(249,250,251,1),rgba(255,255,255,1))] text-foreground dark:bg-background">
      <div className={`mx-auto min-h-screen w-full max-w-[1600px] transition-[padding] duration-200 ${isDesktopSidebarOpen ? 'lg:pl-72' : 'lg:pl-0'}`}>
        <AdminSidebar
          activeHref="/admin/dashboard/orders"
          isOpen={isMobileSidebarOpen}
          isDesktopOpen={isDesktopSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          onToggleDesktop={() => setIsDesktopSidebarOpen((current) => !current)}
          onLogout={() => void handleLogout()}
          isLoggingOut={isLoggingOut}
        />

        <section className="space-y-6 px-4 py-5 sm:px-6 lg:px-6 lg:py-8 lg:pl-4">
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="flex flex-col gap-4 border-b bg-gradient-to-r from-muted/20 via-background to-background sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="lg:hidden" onClick={() => setIsMobileSidebarOpen(true)}>
                    <Menu className="size-4" />
                  </Button>
                  <Badge className="w-fit gap-2">
                    <ShieldCheck className="size-3.5" />
                    Admin orders
                  </Badge>
                </div>
                <CardTitle className="text-3xl tracking-tight">Orders</CardTitle>
                <CardDescription>Review checkout records, payment methods, and fulfillment progress.</CardDescription>
              </div>

            </CardHeader>

            <CardContent className="space-y-5 p-5 sm:p-6">
              {pageErrorMessage ? (
                <Alert variant="destructive">
                  <AlertTitle>Something went wrong</AlertTitle>
                  <AlertDescription>{pageErrorMessage}</AlertDescription>
                </Alert>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="border-border/70 bg-card/80 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardDescription>Total orders</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">{currentPageMeta.totalElements}</CardTitle>
                  </CardHeader>
                </Card>

                <Card className="border-border/70 bg-card/80 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardDescription>Current page</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">{displayedPage}</CardTitle>
                  </CardHeader>
                </Card>

                <Card className="border-border/70 bg-card/80 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardDescription>Page revenue</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">{formatCurrency(currentPageRevenue)}</CardTitle>
                  </CardHeader>
                </Card>

                <Card className="border-border/70 bg-card/80 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardDescription>Filter</CardDescription>
                    <CardTitle className="truncate text-lg">{activeFilterLabel}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <div className="space-y-4 rounded-3xl border border-border/70 bg-background p-4 shadow-sm sm:p-5">
                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.55fr_0.55fr_0.55fr_0.55fr]">
                  <label className="space-y-2">
                    <span className="text-sm font-medium">Search</span>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={keyword}
                        onChange={(event) => {
                          setPage(0)
                          setKeyword(event.target.value)
                        }}
                        placeholder="Search orders"
                        className="h-10 pl-9"
                      />
                    </div>
                  </label>

                  <div className="flex items-end">
                    <Button variant="outline" className="w-full" onClick={handleClearFilters}>
                      Clear filters
                    </Button>
                  </div>

                  <div className="flex items-end">
                    <Button variant="outline" className="w-full" onClick={() => void handleRefresh()} disabled={isRefreshing}>
                      {isRefreshing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCcw className="mr-2 size-4" />}
                      Refresh
                    </Button>
                  </div>

                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => void handleExportExcel()}
                      disabled={isExportingExcel || isLoadingOrders}
                    >
                      {isExportingExcel ? <Loader2 className="mr-2 size-4 animate-spin" /> : <FileSpreadsheet className="mr-2 size-4" />}
                      Excel
                    </Button>
                  </div>

                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => void handleExportPdf()}
                      disabled={isExportingPdf || isLoadingOrders}
                    >
                      {isExportingPdf ? <Loader2 className="mr-2 size-4 animate-spin" /> : <FileText className="mr-2 size-4" />}
                      PDF
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr]">
                  <label className="space-y-2">
                    <span className="text-sm font-medium">Status</span>
                    <select
                      value={status}
                      onChange={(event) => {
                        setPage(0)
                        setStatus(event.target.value)
                      }}
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      <option value="">All statuses</option>
                      {getOrderStatusOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium">Created from</span>
                    <Input
                      type="date"
                      value={createdFrom}
                      onChange={(event) => {
                        setPage(0)
                        setCreatedFrom(event.target.value)
                      }}
                      className="h-10"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium">Created to</span>
                    <Input
                      type="date"
                      value={createdTo}
                      onChange={(event) => {
                        setPage(0)
                        setCreatedTo(event.target.value)
                      }}
                      className="h-10"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium">Sort by</span>
                    <select
                      value={sortBy}
                      onChange={(event) => {
                        setPage(0)
                        setSortBy(event.target.value as typeof sortBy)
                      }}
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      <option value="createdAt">Created at</option>
                      <option value="updatedAt">Updated at</option>
                      <option value="totalAmount">Total amount</option>
                      <option value="itemCount">Item count</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium">Direction</span>
                    <select
                      value={sortDirection}
                      onChange={(event) => {
                        setPage(0)
                        setSortDirection(event.target.value as typeof sortDirection)
                      }}
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      <option value="desc">Descending</option>
                      <option value="asc">Ascending</option>
                    </select>
                  </label>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{sortLabel}</Badge>
                    {hasTextFilter ? <Badge variant="outline">Keyword: {keyword.trim()}</Badge> : null}
                    {hasDateFilters ? <Badge variant="outline">Created {createdFrom || '...'} - {createdTo || '...'}</Badge> : null}
                    <Badge variant="outline">{currentPageMeta.totalPages} pages</Badge>
                    <Badge variant="outline">{currentPageItems} items on page</Badge>
                    {!hasTextFilter && !hasDateFilters && !status ? <Badge variant="outline">No filter</Badge> : null}
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-border/70 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                    <thead className="bg-muted/30 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Order</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Payment</th>
                        <th className="px-4 py-3 font-semibold">Items</th>
                        <th className="px-4 py-3 font-semibold">Total</th>
                        <th className="px-4 py-3 font-semibold">Created at</th>
                        <th className="px-4 py-3 font-semibold">Updated at</th>
                        <th className="px-4 py-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/70 bg-background">
                      {isLoadingOrders ? (
                        Array.from({ length: 10 }, (_, index) => index).map((index) => (
                          <tr key={index} className="animate-pulse">
                            <td className="px-4 py-4"><div className="h-4 w-28 rounded bg-muted" /></td>
                            <td className="px-4 py-4"><div className="h-5 w-20 rounded-full bg-muted" /></td>
                            <td className="px-4 py-4"><div className="h-4 w-24 rounded bg-muted" /></td>
                            <td className="px-4 py-4"><div className="h-4 w-10 rounded bg-muted" /></td>
                            <td className="px-4 py-4"><div className="h-4 w-20 rounded bg-muted" /></td>
                            <td className="px-4 py-4"><div className="h-4 w-32 rounded bg-muted" /></td>
                            <td className="px-4 py-4"><div className="h-4 w-32 rounded bg-muted" /></td>
                            <td className="px-4 py-4"><div className="ml-auto h-8 w-20 rounded-full bg-muted" /></td>
                          </tr>
                        ))
                      ) : orders.length > 0 ? (
                        orders.map((order) => (
                          <tr
                            key={order.id}
                            className="cursor-pointer transition hover:bg-muted/30"
                            onClick={() => void openOrderDetails(order)}
                          >
                            <td className="px-4 py-4">
                              <div className="font-medium text-foreground">{order.orderNumber}</div>
                              <div className="mt-1 text-xs text-muted-foreground">ID {order.id}</div>
                            </td>
                            <td className="px-4 py-4">
                              <Badge variant="outline" className={getStatusBadgeClasses(order.status)}>
                                {order.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-4">{order.paymentMethod}</td>
                            <td className="px-4 py-4 tabular-nums">{order.itemCount}</td>
                            <td className="px-4 py-4 font-semibold tabular-nums">{formatCurrency(order.totalAmount)}</td>
                            <td className="px-4 py-4 text-muted-foreground">{formatDateTime(order.createdAt)}</td>
                            <td className="px-4 py-4 text-muted-foreground">{formatDateTime(order.updatedAt)}</td>
                            <td className="px-4 py-4 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  void openOrderDetails(order)
                                }}
                              >
                                View
                                <ChevronRight className="size-4" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="px-4 py-16 text-center text-sm text-muted-foreground">
                            No orders found for the current filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {startItem} to {endItem} of {currentPageMeta.totalElements} orders
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPageMeta.page - 1)}
                    disabled={!currentPageMeta.hasPrevious}
                  >
                    <ChevronLeft className="mr-1 size-4" />
                    Previous
                  </Button>

                  {visiblePageNumbers.map((pageNumber) => {
                    const isCurrent = pageNumber === currentPageMeta.page + 1

                    return (
                      <Button
                        key={pageNumber}
                        variant={isCurrent ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePageChange(pageNumber - 1)}
                      >
                        {pageNumber}
                      </Button>
                    )
                  })}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPageMeta.page + 1)}
                    disabled={!currentPageMeta.hasNext}
                  >
                    Next
                    <ChevronRight className="ml-1 size-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {selectedOrder ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-6 sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-details-title"
          onClick={() => setSelectedOrder(null)}
        >
          <Card
            className="flex max-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col overflow-hidden border-border/70 shadow-2xl sm:max-h-[calc(100vh-4rem)]"
            onClick={(event) => event.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-start justify-between gap-4 border-b bg-muted/20">
              <div className="space-y-1">
                <Badge variant="outline" className={getStatusBadgeClasses(selectedOrder.status)}>
                  {selectedOrder.status}
                </Badge>
                <CardTitle id="order-details-title" className="text-2xl tracking-tight">
                  {selectedOrder.orderNumber}
                </CardTitle>
                <CardDescription>Order summary, shipping details, and status controls.</CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => void handleGenerateInvoice()}
                  disabled={isLoadingOrderDetails || isGeneratingInvoice}
                >
                  {isGeneratingInvoice ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                  Invoice PDF
                </Button>

                <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(null)} aria-label="Close order details">
                  <X className="size-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
              {isLoadingOrderDetails ? (
                <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/10 p-4">
                  <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }, (_, index) => (
                      <div key={index} className="h-24 animate-pulse rounded-2xl bg-muted" />
                    ))}
                  </div>
                </div>
              ) : null}

              {orderDetailErrorMessage ? (
                <Alert variant="destructive">
                  <AlertTitle>Could not load details</AlertTitle>
                  <AlertDescription>{orderDetailErrorMessage}</AlertDescription>
                </Alert>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="border-border/70 bg-card/80 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardDescription>Status</CardDescription>
                    <CardTitle className="text-lg">
                      <Badge variant="outline" className={getStatusBadgeClasses(selectedOrder.status)}>
                        {selectedOrder.status}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                </Card>

                <Card className="border-border/70 bg-card/80 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardDescription>Payment method</CardDescription>
                    <CardTitle className="text-lg">{selectedOrder.paymentMethod}</CardTitle>
                  </CardHeader>
                </Card>

                <Card className="border-border/70 bg-card/80 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardDescription>Order number</CardDescription>
                    <CardTitle className="text-lg">{selectedOrder.orderNumber}</CardTitle>
                  </CardHeader>
                </Card>

                <Card className="border-border/70 bg-card/80 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardDescription>Items in order</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">{selectedOrder.itemCount}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/10 p-4 sm:flex-row sm:items-end sm:justify-between">
                <label className="flex-1 space-y-2">
                  <span className="text-sm font-medium">Status</span>
                  <select
                    value={selectedOrderStatus}
                    onChange={(event) => setSelectedOrderStatus(event.target.value)}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    {getOrderStatusOptions().map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <Button
                  className="gap-2"
                  onClick={() => void handleUpdateSelectedOrderStatus()}
                  disabled={isUpdatingOrderStatus || isLoadingOrderDetails || !selectedOrderStatus || selectedOrderStatus === selectedOrder.status}
                >
                  {isUpdatingOrderStatus ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
                  Save status
                </Button>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-border/70 bg-muted/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Recipient name</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{selectedOrder.recipientName ?? 'N/A'}</p>
                </div>

                <div className="rounded-2xl border border-border/70 bg-muted/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Recipient phone</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{selectedOrder.recipientPhone ?? 'No phone provided'}</p>
                </div>

                <div className="rounded-2xl border border-border/70 bg-muted/10 p-4 md:col-span-2 xl:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Shipping address</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{selectedOrder.shippingAddress ?? 'N/A'}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedOrder.note ?? 'No note provided'}</p>
                </div>

                <div className="rounded-2xl border border-border/70 bg-muted/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Created at</p>
                  <p className="mt-2 text-sm font-medium">{formatDateTime(selectedOrder.createdAt)}</p>
                </div>

                <div className="rounded-2xl border border-border/70 bg-muted/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Updated at</p>
                  <p className="mt-2 text-sm font-medium">{formatDateTime(selectedOrder.updatedAt)}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-muted/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Subtotal</p>
                  <p className="mt-2 text-lg font-semibold">{formatCurrency(selectedOrder.subtotal ?? selectedOrder.totalAmount)}</p>
                </div>

                <div className="rounded-2xl border border-border/70 bg-muted/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Shipping fee</p>
                  <p className="mt-2 text-lg font-semibold">{formatCurrency(selectedOrder.shippingFee ?? 0)}</p>
                </div>

                <div className="rounded-2xl border border-border/70 bg-muted/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Total amount</p>
                  <p className="mt-2 text-lg font-semibold">{formatCurrency(selectedOrder.totalAmount)}</p>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-border/70 bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Order items</p>
                    <h3 className="mt-1 text-lg font-semibold tracking-tight">Line items</h3>
                  </div>
                  <Badge variant="outline">{formatNumber(selectedOrder.itemCount)} items</Badge>
                </div>

                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                  <div className="space-y-3">
                    {selectedOrder.items.map((item) => (
                      <div key={`${item.bookId}-${item.slug}`} className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-muted/20 p-4 sm:flex-row sm:items-center">
                        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-background">
                          <img
                            src={item.coverImageUrl}
                            alt={item.title}
                            className="size-full object-cover"
                            loading="lazy"
                          />
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="truncate text-sm font-semibold text-foreground">{item.title}</h4>
                            <Badge variant="outline">x{item.quantity}</Badge>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">{item.slug}</p>
                          <p className="text-sm text-muted-foreground">Book ID {item.bookId}</p>
                        </div>

                        <div className="grid min-w-[220px] grid-cols-3 gap-3 text-right text-sm">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Unit</p>
                            <p className="mt-1 font-medium">{formatCurrency(item.unitPrice)}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Qty</p>
                            <p className="mt-1 font-medium">{formatNumber(item.quantity)}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Line total</p>
                            <p className="mt-1 font-semibold">{formatCurrency(item.lineTotal)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-5 text-sm text-muted-foreground">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-medium text-foreground">No line items available</p>
                        <p className="mt-1 leading-6">
                          The API response did not include item rows for this order. The detail view still shows the totals, recipient, and status so the order can be managed.
                        </p>
                      </div>

                      <Badge variant="outline">{selectedOrder.status}</Badge>
                    </div>
                  </div>
                )}
              </div>

            </CardContent>
          </Card>
        </div>
      ) : null}
    </main>
  )
}

export default AdminOrdersPage