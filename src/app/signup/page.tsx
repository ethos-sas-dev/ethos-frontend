'use client'

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { useAuth } from "../_lib/auth/AuthContext"
import { useRouter } from "next/navigation"

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { signUp } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    
    // Validar que las contraseñas coincidan
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }
    
    // Validar longitud mínima de contraseña
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    
    setIsLoading(true)

    try {
      await signUp(email, password)
      setSuccess(true)
      // Puedes redirigir al usuario o mostrar un mensaje de éxito
      // Dependiendo de la configuración de Supabase, puede que el usuario
      // necesite verificar su correo antes de poder iniciar sesión
    } catch (error: any) {
      if (error.message) {
        setError(error.message)
      } else {
        setError('Ocurrió un error durante el registro. Por favor, intente nuevamente.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Mensaje para pantallas pequeñas */}
      <div className="block md:hidden min-h-screen items-center justify-center bg-[#024728] opacity-90">
        <div className="text-center px-6">
          <h2 className="text-xl font-semibold text-white mb-3">
            Acceso no disponible
          </h2>
          <p className="text-white">
            Necesitas una pantalla más grande para acceder al sistema. Por favor, intenta desde una laptop o computadora de escritorio.
          </p>
          <Link href="/" className="text-white">
            <button className="bg-[#008A4B] text-white py-2 px-4 mt-12 rounded-lg text-base font-normal hover:bg-[#006837] transition-colors">
              Volver a la página principal
            </button>
          </Link>
        </div>
      </div>

      {/* Contenido principal (visible solo en md+) */}
      <div className="hidden md:block">
        {/* Header */}
        <header className="bg-[#024728] h-[70px] flex items-center justify-center">
          <Image src="/logo.svg" alt="Logo" width={150} height={50} priority />
        </header>

        <div className="flex">
          {/* Left side image */}
          <div className="w-1/2 h-[calc(100vh-70px)] min-h-[490px] relative bg-[#006837] flex items-center justify-center">
            <div className="text-white text-center px-12">
              <h2 className="text-3xl font-semibold mb-4">Bienvenido/a a Ethos</h2>
              <p className="text-xl">Sistema de gestión de propiedades y proyectos</p>
            </div>
          </div>

          {/* Right side signup form */}
          <div className="w-1/2 h-[calc(100vh-70px)] min-h-[490px] relative">
            <Link href="/" className="absolute top-8 left-8 hover:opacity-80 transition-opacity">
              <svg
                className="w-8 h-8 transform rotate-180"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>

            <div className="flex flex-col items-center justify-center h-full px-16">
              <h1 className="text-3xl font-bold mb-8 text-center">Crear Cuenta</h1>

              {success ? (
                <div className="w-full max-w-[575px] bg-green-50 border border-green-400 text-green-700 p-6 rounded-lg space-y-4">
                  <h2 className="text-xl font-medium">¡Registro exitoso!</h2>
                  <p>Se ha enviado un correo de verificación a {email}. Por favor, verifica tu correo para activar tu cuenta.</p>
                  <div className="mt-6">
                    <Link href="/login">
                      <button className="w-full bg-[#008A4B] text-white py-3 rounded-lg mt-6 text-base font-normal hover:bg-[#006837] transition-colors">
                        Ir a iniciar sesión
                      </button>
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="w-full max-w-[575px] bg-white border border-[#D9D9D9] rounded-lg p-6 space-y-6">
                  {error && (
                    <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                      {error}
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <label htmlFor="email" className="block text-base text-[#1E1E1E]">
                      Correo electrónico
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-3 border border-[#D9D9D9] rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[#008A4B] focus:border-transparent"
                      placeholder="usuario@ethos.com.ec"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="password" className="block text-base text-[#1E1E1E]">
                      Contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-3 border border-[#D9D9D9] rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[#008A4B] focus:border-transparent"
                        placeholder="Mínimo 6 caracteres"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {showPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="block text-base text-[#1E1E1E]">
                      Confirmar Contraseña
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full p-3 border border-[#D9D9D9] rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[#008A4B] focus:border-transparent"
                      placeholder="Repite tu contraseña"
                      required
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-[#008A4B] text-white py-3 rounded-lg mt-6 text-base font-normal hover:bg-[#006837] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
                  </button>

                  <div className="text-center mt-4">
                    <p className="text-gray-600">
                      ¿Ya tienes una cuenta?{' '}
                      <Link href="/login" className="text-[#008A4B] hover:underline">
                        Iniciar sesión
                      </Link>
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 