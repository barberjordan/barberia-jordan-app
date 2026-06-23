import React, { createContext, useState, useContext } from 'react'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function login(email, password) {
    setLoading(true)
    setError('')
    try {
      const result = await window.api.login(email, password)
      if (result) {
        setUser(result)
        return true
      } else {
        setError('Credenciales incorrectas')
        return false
      }
    } catch (err) {
      setError('Error al iniciar sesión')
      return false
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
