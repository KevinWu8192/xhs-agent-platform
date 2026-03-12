export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 shadow-lg mb-4">
            <span className="text-3xl">🌸</span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">XHS 博主助手</h1>
          <p className="text-neutral-500 text-sm mt-1">让每一篇笔记都出众</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-card-lg p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
