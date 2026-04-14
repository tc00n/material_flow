'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'

export function ResetForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })

      if (resetError) {
        setError('Der Link konnte nicht gesendet werden. Bitte versuchen Sie es erneut.')
        return
      }

      setSuccess(true)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-4">
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription>
            Wir haben Ihnen einen Link zum Zurücksetzen des Passworts geschickt. Bitte prüfen Sie Ihren Posteingang.
          </AlertDescription>
        </Alert>
        <p className="text-sm text-gray-500 text-center">
          Kein Link angekommen?{' '}
          <button
            onClick={() => { setSuccess(false); setEmail('') }}
            className="text-[#003C73] hover:underline focus-visible:outline-none"
          >
            Erneut senden
          </button>
        </p>
      </div>
    )
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

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-11 bg-[#003C73] hover:bg-[#002a52] active:bg-[#001f3d] text-white font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#003C73] focus-visible:ring-offset-2"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Senden…
          </span>
        ) : (
          'Reset-Link senden'
        )}
      </Button>

      <div className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#003C73] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003C73] rounded"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Zurück zur Anmeldung
        </Link>
      </div>
    </form>
  )
}
