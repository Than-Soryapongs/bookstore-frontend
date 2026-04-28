import { useEffect, useState, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import {
  AdminAuthorsPage,
  AdminBooksPage,
  AdminCategoriesPage,
  AdminCustomersPage,
  AdminDashboardPage,
  AdminLoginPage,
  AdminOrdersPage,
  AdminProfilePage,
  AdminSecurityPage,
  AdminSectionPage,
} from './features/admin'
import { BookDetailsPage, CartPage, CheckoutPage, CustomerForgotPasswordPage, CustomerLoginPage, CustomerProfilePage, CustomerSecurityPage, CustomerSignupPage, HomePage, OrderDetailsPage, OrdersPage, WishlistPage } from './features/customer'
import { bootstrapAuthSession, ensureCsrfToken, hasAuthSession, isAdminSession, loadAuthSession } from './features/shared/auth'

function AdminRoute({ children }: { children: ReactNode }) {
  const session = loadAuthSession()

  if (!session?.accessToken) {
    return <Navigate replace to="/admin/login" />
  }

  if (!isAdminSession(session)) {
    return <Navigate replace to="/" />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/admin" element={<AdminLoginPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/login" element={<CustomerLoginPage />} />
      <Route path="/forgot-password" element={<CustomerForgotPasswordPage />} />
      <Route path="/signup" element={<CustomerSignupPage />} />
      <Route path="/books/:bookId" element={<BookDetailsPage />} />
      <Route path="/profile" element={<CustomerProfilePage />} />
      <Route path="/security" element={<CustomerSecurityPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/orders" element={<OrdersPage />} />
      <Route path="/orders/:orderId" element={<OrderDetailsPage />} />
      <Route path="/wishlist" element={<WishlistPage />} />
      <Route
        path="/admin/dashboard"
        element={
          <AdminRoute>
            <Navigate replace to="/admin/dashboard/overview" />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/dashboard/overview"
        element={
          <AdminRoute>
            <AdminDashboardPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/dashboard/authors"
        element={
          <AdminRoute>
            <Navigate replace to="/admin/authors" />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/dashboard/books"
        element={
          <AdminRoute>
            <AdminBooksPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/dashboard/orders"
        element={
          <AdminRoute>
            <AdminOrdersPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/dashboard/customers"
        element={
          <AdminRoute>
            <AdminCustomersPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/profile"
        element={
          <AdminRoute>
            <AdminProfilePage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/security"
        element={
          <AdminRoute>
            <AdminSecurityPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/authors"
        element={
          <AdminRoute>
            <AdminAuthorsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/dashboard/:section"
        element={
          <AdminRoute>
            <AdminSectionPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/categories"
        element={
          <AdminRoute>
            <AdminCategoriesPage />
          </AdminRoute>
        }
      />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}

function App() {
  const [isAuthReady, setIsAuthReady] = useState(() => hasAuthSession())

  useEffect(() => {
    let isActive = true

    void ensureCsrfToken().catch(() => {
      // Best-effort prefetch; refresh/logout can still fetch CSRF later if needed.
    })

    if (hasAuthSession()) {
      return undefined
    }

    void bootstrapAuthSession().finally(() => {
      if (isActive) {
        setIsAuthReady(true)
      }
    })

    return () => {
      isActive = false
    }
  }, [])

  if (!isAuthReady) {
    return <div className="min-h-screen bg-background" />
  }

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App
