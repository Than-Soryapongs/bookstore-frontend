import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Bot, BookOpen, CreditCard, Menu, Package2, RefreshCcw, ShieldCheck, ShoppingCart, Users } from 'lucide-react'

import AdminSidebar from '../components/AdminSidebar'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../components/ui/card'
import { loadAuthSession, logout } from '../../shared/auth'

const sectionLabels: Record<string, { title: string; description: string }> = {
  authors: {
    title: 'Authors',
    description: 'Manage author records from here.',
  },
  books: {
    title: 'Books',
    description: 'Book management will live here next.',
  },
  orders: {
    title: 'Orders',
    description: 'Track and manage orders from this section.',
  },
  customers: {
    title: 'Customers',
    description: 'Customer management will be placed here.',
  },
  'ai-assistance': {
    title: 'AI Assistance',
    description: 'Assistant tools and prompts will live here.',
  },
  pos: {
    title: 'POS',
    description: 'Point-of-sale workflows will be managed here.',
  },
}

const sectionHighlights: Record<string, Array<{ label: string; value: string; description: string }>> = {
  books: [
    { label: 'Catalog focus', value: 'Inventory', description: 'Add the full book CRUD flow here.' },
    { label: 'Media support', value: 'Cover art', description: 'Preview images and metadata together.' },
    { label: 'Publishing', value: 'Availability', description: 'Track stock, status, and visibility.' },
  ],
  orders: [
    { label: 'Sales focus', value: 'Checkout', description: 'Build order inspection and fulfillment.' },
    { label: 'Lifecycle', value: 'Status', description: 'Track pending, paid, and completed orders.' },
    { label: 'Operations', value: 'Audit', description: 'Expose payment and shipping history.' },
  ],
  customers: [
    { label: 'User focus', value: 'Accounts', description: 'Manage customer records and access.' },
    { label: 'Support', value: 'Activity', description: 'Show recent orders and account state.' },
    { label: 'Retention', value: 'Insights', description: 'Surface engagement and purchase history.' },
  ],
  'ai-assistance': [
    { label: 'Assistant mode', value: 'AI', description: 'Draft prompts, summaries, and admin help flows.' },
    { label: 'Catalog support', value: 'Search', description: 'Use AI to find and analyze records faster.' },
    { label: 'Workflow', value: 'Assist', description: 'Guide common admin tasks with smart actions.' },
  ],
  pos: [
    { label: 'Checkout focus', value: 'Terminal', description: 'Handle in-store sales and order capture.' },
    { label: 'Payments', value: 'Cards', description: 'Support payment capture and receipt flows.' },
    { label: 'Operations', value: 'Shift', description: 'Keep the checkout screen ready for staff.' },
  ],
  authors: [
    { label: 'Author focus', value: 'Profiles', description: 'Keep author records organized.' },
    { label: 'Search', value: 'Keyword', description: 'Filter authors with the same flow as categories.' },
    { label: 'Actions', value: 'Create', description: 'Load, inspect, and delete records.' },
  ],
}

const sectionActionCards: Record<string, Array<{ title: string; description: string }>> = {
  books: [
    { title: 'Build list view', description: 'Mirror the categories page with live search and pagination.' },
    { title: 'Add detail modal', description: 'Show cover, author, category, and status together.' },
    { title: 'Wire CRUD actions', description: 'Add create, update, and delete flows when endpoints are ready.' },
  ],
  orders: [
    { title: 'Add orders table', description: 'Show the order queue with filters and state badges.' },
    { title: 'Track fulfillment', description: 'Review payment, shipping, and completion state.' },
    { title: 'Expose customer links', description: 'Jump from an order to the related user and items.' },
  ],
  customers: [
    { title: 'Build customer cards', description: 'List account summaries with search and pagination.' },
    { title: 'Surface activity', description: 'Show last login, recent purchases, and status.' },
    { title: 'Keep admin actions safe', description: 'Add dedicated detail and confirmation dialogs.' },
  ],
  'ai-assistance': [
    { title: 'Add assistant chat', description: 'Create a workspace for AI powered admin help.' },
    { title: 'Show prompt presets', description: 'Quick access to common tasks and commands.' },
    { title: 'Connect tools later', description: 'Wire model actions when the backend is ready.' },
  ],
  pos: [
    { title: 'Build checkout screen', description: 'Create a fast POS workflow for sales.' },
    { title: 'Add payment steps', description: 'Capture cash, card, and receipt actions.' },
    { title: 'Support product lookup', description: 'Search books quickly during checkout.' },
  ],
  authors: [
    { title: 'Use the search flow', description: 'Keep the keyword filter and page controls consistent.' },
    { title: 'Keep details explicit', description: 'Load one author, inspect it, then confirm destructive actions.' },
    { title: 'Extend when ready', description: 'Add update support later if the backend exposes it.' },
  ],
}

export function AdminSectionPage() {
  const session = loadAuthSession()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true,
  )
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { section } = useParams<{ section: string }>()

  async function handleLogout() {
    setIsLoggingOut(true)

    try {
      await logout()
    } finally {
      window.location.assign('/admin/login')
    }
  }

  if (!session?.accessToken) {
    return <Navigate replace to="/admin/login" />
  }

  if (!section || !sectionLabels[section]) {
    return <Navigate replace to="/admin/dashboard/overview" />
  }

  const sectionInfo = sectionLabels[section]
  const highlights = sectionHighlights[section]
  const actionCards = sectionActionCards[section]
  const statusLabel = section === 'authors' || section === 'ai-assistance' || section === 'pos' ? 'Ready' : 'Planned'
  const sectionIcon = section === 'books' ? BookOpen : section === 'orders' ? ShoppingCart : section === 'customers' ? Users : section === 'ai-assistance' ? Bot : section === 'pos' ? CreditCard : Package2
  const SectionIcon = sectionIcon

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.85),transparent_34%),linear-gradient(to_bottom_right,rgba(249,250,251,1),rgba(255,255,255,1))] text-foreground dark:bg-background">
      <div className={`mx-auto min-h-screen w-full max-w-[1600px] transition-[padding] duration-200 ${isDesktopSidebarOpen ? 'lg:pl-72' : 'lg:pl-0'}`}>
        <AdminSidebar
          activeHref={`/admin/dashboard/${section}`}
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
                    Admin section
                  </Badge>
                </div>
                <CardTitle className="text-3xl tracking-tight">{sectionInfo.title}</CardTitle>
                <CardDescription>{sectionInfo.description}</CardDescription>
              </div>

              <Badge variant="outline" className="w-fit gap-2 self-start sm:self-center">
                <SectionIcon className="size-3.5" />
                {statusLabel}
              </Badge>
            </CardHeader>

            <CardContent className="space-y-5 p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="border-border/70 bg-card/80 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardDescription>Section</CardDescription>
                    <CardTitle className="truncate text-lg">{sectionInfo.title}</CardTitle>
                  </CardHeader>
                </Card>

                <Card className="border-border/70 bg-card/80 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardDescription>Status</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">{statusLabel}</CardTitle>
                  </CardHeader>
                </Card>

                <Card className="border-border/70 bg-card/80 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardDescription>Focus</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">{highlights[0].value}</CardTitle>
                  </CardHeader>
                </Card>

                <Card className="border-border/70 bg-card/80 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardDescription>Next step</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">UI flow</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
                <Card className="border-border/70 shadow-sm">
                  <CardHeader className="border-b bg-muted/20">
                    <CardTitle>{sectionInfo.title} workspace</CardTitle>
                    <CardDescription>Use this section as the dedicated destination for this admin area.</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-5">
                    <div className="space-y-3">
                      {highlights.map((item) => (
                        <div key={item.label} className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">{item.label}</p>
                              <h3 className="mt-1 text-lg font-semibold tracking-tight">{item.value}</h3>
                            </div>

                            <Badge variant="outline">Admin</Badge>
                          </div>

                          <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/70 shadow-sm">
                  <CardHeader className="flex flex-col gap-3 border-b bg-muted/20 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <RefreshCcw className="size-4" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Planned UI flow</CardTitle>
                        <CardDescription>Match the categories page when this section gets real data.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 p-5 sm:p-6">
                    {actionCards.map((item) => (
                      <div key={item.title} className="rounded-2xl border border-border/70 bg-muted/10 p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2">
                            <h3 className="text-base font-semibold">{item.title}</h3>
                            <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                          </div>
                          <Badge variant="outline">Next</Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>

                  <CardFooter className="border-t bg-muted/10 px-5 py-4 text-sm text-muted-foreground sm:px-6">
                    This route is now a dedicated destination, so it can grow into a full CRUD screen without changing navigation.
                  </CardFooter>
                </Card>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}

export default AdminSectionPage