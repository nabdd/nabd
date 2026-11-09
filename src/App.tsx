import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Landing from '@/pages/Landing'
import DonorProfile from '@/pages/DonorProfile'
import { RequireAuth } from '@/lib/auth'

const Join = lazy(() => import('@/pages/Join'))
const JoinSuccess = lazy(() => import('@/pages/JoinSuccess'))
const Login = lazy(() => import('@/pages/Login'))
const WhatsAppDemo = lazy(() => import('@/pages/WhatsAppDemo'))
const AppLayout = lazy(() => import('@/pages/app/AppLayout'))
const Requests = lazy(() => import('@/pages/app/Requests'))
const NewRequest = lazy(() => import('@/pages/app/NewRequest'))
const RequestTracking = lazy(() => import('@/pages/app/RequestTracking'))
const Donors = lazy(() => import('@/pages/app/Donors'))
const ComingSoon = lazy(() => import('@/pages/app/ComingSoon'))

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function Fallback() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-bg" role="status" aria-label="Loading">
      <div className="skeleton h-3 w-40" />
    </div>
  )
}

export default function App() {
  return (
    <>
      <ScrollTop />
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/join" element={<Join />} />
          <Route path="/join/success" element={<JoinSuccess />} />
          <Route path="/login" element={<Login />} />
          <Route path="/donor" element={<DonorProfile />} />
          <Route path="/whatsapp" element={<WhatsAppDemo />} />
          <Route path="/app" element={<RequireAuth><AppLayout /></RequireAuth>}>
            <Route index element={<Requests />} />
            <Route path="requests/new" element={<NewRequest />} />
            <Route path="requests/:id" element={<RequestTracking />} />
            <Route path="donors" element={<Donors />} />
            <Route path="*" element={<ComingSoon />} />
          </Route>
          <Route path="*" element={<Landing />} />
        </Routes>
      </Suspense>
    </>
  )
}
