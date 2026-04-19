import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminCategoriesPage from './pages/AdminCategoriesPage'
import AdminAuthorsPage from './pages/AdminAuthorsPage'
import AdminBooksPage from './pages/AdminBooksPage'
import AdminOrdersPage from './pages/AdminOrdersPage'
import AdminCustomersPage from './pages/AdminCustomersPage'
import AdminProfilePage from './pages/AdminProfilePage'
import AdminSecurityPage from './pages/AdminSecurityPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminSectionPage from './pages/AdminSectionPage.tsx'
import HomePage from './pages/HomePage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminLoginPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<Navigate replace to="/admin/dashboard/overview" />} />
        <Route path="/admin/dashboard/overview" element={<AdminDashboardPage />} />
        <Route path="/admin/dashboard/authors" element={<Navigate replace to="/admin/authors" />} />
        <Route path="/admin/dashboard/books" element={<AdminBooksPage />} />
        <Route path="/admin/dashboard/orders" element={<AdminOrdersPage />} />
        <Route path="/admin/dashboard/customers" element={<AdminCustomersPage />} />
        <Route path="/admin/profile" element={<AdminProfilePage />} />
        <Route path="/admin/security" element={<AdminSecurityPage />} />
        <Route path="/admin/authors" element={<AdminAuthorsPage />} />
        <Route path="/admin/dashboard/:section" element={<AdminSectionPage />} />
        <Route path="/admin/categories" element={<AdminCategoriesPage />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
