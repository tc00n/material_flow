import { ResetPasswordForm } from '@/components/reset-password-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function NeonexLogo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 425.16 73.12"
      className="w-36 h-auto"
      aria-label="NEONEX"
      role="img"
    >
      <polygon points="365.08 1.01 347.98 1.01 378.06 36.42 347.98 71.83 365.08 71.83 395.09 36.42 365.08 1.01" style={{ fill: '#ed6a5c' }} />
      <polygon points="400.64 29.87 425.16 1.01 408.07 1.01 392.13 19.82 400.64 29.87" style={{ fill: '#003C73' }} />
      <polygon points="408.07 71.83 425.16 71.83 400.64 42.97 392.13 53.02 408.07 71.83" style={{ fill: '#003C73' }} />
      <path d="M111.21,131.77,78.79,87.53v44.24H64.35V61.07H77.07l32.72,44.34V61.07h14.45v70.7Z" transform="translate(-64.35 -59.86)" style={{ fill: '#003C73' }} />
      <path d="M140.42,131.77V61.07h45.35V73.29H154.86v16h30.91v12.22H154.86v18.08h30.91v12.22Z" transform="translate(-64.35 -59.86)" style={{ fill: '#003C73' }} />
      <path d="M233.07,133c-21,0-37.06-16.36-37.06-36.56s16.06-36.56,37.06-36.56,37,16.36,37,36.56S254,133,233.07,133Zm0-60.5c-12.52,0-21.61,10.51-21.61,23.94s9.09,23.94,21.61,23.94,21.52-10.51,21.52-23.94S245.5,72.48,233.07,72.48Z" transform="translate(-64.35 -59.86)" style={{ fill: '#003C73' }} />
      <path d="M330.74,131.77,298.32,87.53v44.24H283.88V61.07H296.6l32.73,44.34V61.07h14.44v70.7Z" transform="translate(-64.35 -59.86)" style={{ fill: '#003C73' }} />
      <path d="M358.43,131.77V61.07h45.35V73.29H372.87v16h30.91v12.22H372.87v18.08h30.91v12.22Z" transform="translate(-64.35 -59.86)" style={{ fill: '#003C73' }} />
    </svg>
  )
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-[0_4px_6px_-1px_rgba(0,60,115,0.08),0_10px_25px_-5px_rgba(0,60,115,0.12)] border-gray-100">
          <CardHeader className="text-center pb-2 pt-8 px-8">
            <div className="flex justify-center mb-7">
              <NeonexLogo />
            </div>
            <div className="w-8 h-0.5 bg-[#ed6a5c] mx-auto mb-5" />
            <CardTitle className="text-xl font-semibold text-gray-900 tracking-tight">
              Neues Passwort setzen
            </CardTitle>
            <CardDescription className="text-gray-500 mt-1.5">
              Geben Sie Ihr neues Passwort ein.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8 pt-6">
            <ResetPasswordForm />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} NEONEX. Nur für autorisierte Nutzer.
        </p>
      </div>
    </main>
  )
}
