import React, { useState } from 'react'
import { useAuth } from '../../hooks/use-auth.js'

type LoginFormClassNames = {
  root?: string
  field?: string
  input?: string
  actions?: string
  error?: string
}

export function LoginForm(
  { className, classNames, onSuccess }: {
    className?: string
    classNames?: LoginFormClassNames
    onSuccess?: () => void
  },
): React.JSX.Element {
  const { login, loading, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <form
      className={`${classNames?.root ?? ''} ${className ?? ''}`.trim()}
      onSubmit={async (e) => {
        e.preventDefault()
        await login(email, password)
        onSuccess?.()
      }}
    >
      <div className={classNames?.field}>
        <label>Email</label>
        <input
          className={classNames?.input}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className={classNames?.field}>
        <label>Password</label>
        <input
          className={classNames?.input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error ? <div className={classNames?.error}>{error}</div> : null}
      <div className={classNames?.actions}>
        <button type="submit" disabled={loading}>Login</button>
        <a href="/backend/auth/github">Login with GitHub</a>
      </div>
    </form>
  )
}
