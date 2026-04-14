'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react'

export function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Das Passwort muss mindestens 8 Zeichen lang sein.')
      return
    }
    if (password !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        setError('Das Passwort konnte nicht geändert werden. Bitte fordern Sie einen neuen Reset-Link an.')
        return
      }

      setSuccess(true)
      setTimeout(() => {
        window.location.href = '/'
      }, 2000)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Alert className="border-green-200 bg-green-50 text-green-800">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription>
          Passwort erfolgreich geändert. Sie werden weitergeleitet…
        </AlertDescription>
      </Alert>
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
        <Label htmlFor="password" className="text-sm font-medium text-gray-700">
          Neues Passwort
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mindestens 8 Zeichen"
            required
            autoComplete="new-password"
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

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
          Passwort bestätigen
        </Label>
        <Input
          id="confirmPassword"
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Passwort wiederholen"
          required
          autoComplete="new-password"
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
            Speichern…
          </span>
        ) : (
          'Neues Passwort speichern'
        )}
      </Button>
    </form>
  )
}
