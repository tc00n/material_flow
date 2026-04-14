'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('E-Mail-Adresse oder Passwort ist falsch.')
        } else if (authError.message.includes('Email not confirmed')) {
          setError('Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse.')
        } else {
          setError('Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.')
        }
        return
      }

      if (data.session) {
        window.location.href = '/'
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <Alert className="border-red-200 bg-red-50 text-red-800">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-sm font-medium text-gray-700">
          E-Mail-Adresse
        </Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@neonex.de"
          required
          autoComplete="email"
          className="h-11 border-gray-200 bg-white focus-visible:ring-[#003C73] focus-visible:border-[#003C73]"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-sm font-medium text-gray-700">
          Passwort
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            className="h-11 pr-11 border-gray-200 bg-white focus-visible:ring-[#003C73] focus-visible:border-[#003C73]"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003C73] rounded"
            aria-label={showPassword ? 'Passwort ausblenden' : 'Passwort anzeigen'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <Link
          href="/forgot-password"
          className="text-sm text-[#003C73] hover:text-[#002a52] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003C73] rounded transition-colors duration-150"
        >
          Passwort vergessen?
        </Link>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-11 bg-[#003C73] hover:bg-[#002a52] active:bg-[#001f3d] text-white font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#003C73] focus-visible:ring-offset-2"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Anmelden…
          </span>
        ) : (
          'Anmelden'
        )}
      </Button>
    </form>
  )
}
