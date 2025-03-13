import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function useAuth(requireAuth: boolean = true) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      
      if (!token && requireAuth) {
        router.push('/login')
        setIsAuthenticated(false)
        setIsLoading(false)
        return
      }

      if (!token) {
        setIsAuthenticated(false)
        setIsLoading(false)
        return
      }

      try {
        // バックエンドのAPIでトークンの有効性を確認
        const response = await fetch('http://localhost:3000/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          setIsAuthenticated(true)
        } else {
          if (requireAuth) {
            localStorage.removeItem('token')
            router.push('/login')
          }
          setIsAuthenticated(false)
        }
      } catch (error) {
        if (requireAuth) {
          localStorage.removeItem('token')
          router.push('/login')
        }
        setIsAuthenticated(false)
      }

      setIsLoading(false)
    }

    checkAuth()
  }, [router, requireAuth])

  return { isLoading, isAuthenticated }
} 