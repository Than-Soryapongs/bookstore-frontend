import { ArrowRight, BookOpen, Search, ShoppingBag, Sparkles, Star } from 'lucide-react'

import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Separator } from '../components/ui/separator'

const featuredBooks = [
  {
    title: 'The Silent Library',
    author: 'Mina Sato',
    genre: 'Fiction',
    price: '$18',
    rating: '4.9',
    accent: 'from-amber-200 to-orange-300',
  },
  {
    title: 'Designing Stories',
    author: 'Noah Carter',
    genre: 'Design',
    price: '$24',
    rating: '4.8',
    accent: 'from-sky-200 to-cyan-300',
  },
  {
    title: 'Foundations of Focus',
    author: 'Lea Fernandez',
    genre: 'Productivity',
    price: '$21',
    rating: '5.0',
    accent: 'from-emerald-200 to-lime-300',
  },
]

const categories = ['Best Sellers', 'New Releases', 'Productivity', 'Design', 'Fiction']

export function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(120,119,198,0.12),_transparent_28%),linear-gradient(180deg,#fffaf4_0%,#ffffff_42%,#f8fafc_100%)] text-foreground dark:bg-[radial-gradient(circle_at_top,_rgba(120,119,198,0.18),_transparent_28%),linear-gradient(180deg,#09090b_0%,#111827_42%,#020617_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6 sm:px-10 lg:px-12">
        <header className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-background/80 px-5 py-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <BookOpen className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Bookstore</p>
              <h1 className="text-lg font-semibold tracking-tight">Curated reads for modern shelves</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm">
              Catalog
            </Button>
            <Button size="sm">
              <ShoppingBag className="mr-2 size-4" />
              Cart
            </Button>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:py-14">
          <div className="space-y-8">
            <div className="space-y-6">
              <Badge variant="secondary" className="gap-2 px-3 py-1.5 text-xs uppercase tracking-[0.28em]">
                <Sparkles className="size-3.5" />
                New collection
              </Badge>

              <div className="space-y-4">
                <h2 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
                  Build a bookstore experience with a calmer, more intentional UI.
                </h2>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  Search titles, browse featured collections, and compose shopping flows with shadcn/ui components already wired into the project.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="h-11 pl-9 text-sm shadow-sm" placeholder="Search books, authors, or categories" />
              </div>
              <Button className="h-11 px-5">
                Start browsing
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge key={category} variant="outline" className="rounded-full px-3 py-1">
                  {category}
                </Badge>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>1.2k</CardTitle>
                  <CardDescription>Books cataloged</CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>320</CardTitle>
                  <CardDescription>Curated authors</CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>24h</CardTitle>
                  <CardDescription>Fast delivery support</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>

          <Card className="overflow-hidden border-border/70 bg-background/90 shadow-xl shadow-black/5">
            <CardHeader className="space-y-3 border-b bg-muted/20 pb-6">
              <div className="flex items-center justify-between gap-3">
                <Badge>Featured shelf</Badge>
                <span className="text-sm text-muted-foreground">Updated today</span>
              </div>
              <CardTitle className="text-2xl">Popular picks this week</CardTitle>
              <CardDescription>
                A simple card grid you can expand into a full shop page, checkout flow, or admin dashboard.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 p-4 sm:p-6">
              {featuredBooks.map((book) => (
                <div
                  key={book.title}
                  className="grid grid-cols-[5rem_1fr] gap-4 rounded-2xl border border-border/70 p-3 transition-colors hover:bg-muted/30"
                >
                  <div className={`rounded-2xl bg-gradient-to-br ${book.accent} p-3 shadow-inner`}>
                    <div className="flex h-full items-end rounded-xl border border-white/50 bg-white/30 p-2 text-[10px] font-medium text-slate-800 dark:border-white/10 dark:bg-black/20 dark:text-white">
                      {book.genre}
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium leading-none">{book.title}</p>
                        <Badge variant="outline" className="rounded-full">
                          {book.genre}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">by {book.author}</p>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star className="size-4 fill-current" />
                        <span className="font-medium text-foreground">{book.rating}</span>
                      </div>
                      <Button variant="outline" size="sm" className="rounded-full">
                        {book.price}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>

            <Separator />

            <CardFooter className="flex items-center justify-between gap-3 p-4 sm:p-6">
              <div>
                <p className="text-sm font-medium">Ready to expand?</p>
                <p className="text-sm text-muted-foreground">Add routing, product pages, and a real cart next.</p>
              </div>
              <Button variant="outline">View all books</Button>
            </CardFooter>
          </Card>
        </section>
      </div>
    </main>
  )
}

export default HomePage