import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminCategoriesPage from './pages/AdminCategoriesPage'
import AdminAuthorsPage from './pages/AdminAuthorsPage'
import AdminBooksPage from './pages/AdminBooksPage'
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
        <Route path="/admin/authors" element={<AdminAuthorsPage />} />
        <Route path="/admin/dashboard/:section" element={<AdminSectionPage />} />
        <Route path="/admin/categories" element={<AdminCategoriesPage />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
