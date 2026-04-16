import { Button } from '@/components/ui/button'

function App() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-16 sm:px-10 lg:px-12">
        <div className="max-w-2xl space-y-6">
          <p className="text-sm font-medium uppercase tracking-[0.35em] text-muted-foreground">
            Bookstore
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
            Vite React TypeScript with shadcn/ui is ready.
          </h1>
          <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            Start adding book catalog pages, reusable UI components, and a cleaner design system built on shadcn/ui.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button>Explore components</Button>
            <Button variant="outline">Add your first page</Button>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
