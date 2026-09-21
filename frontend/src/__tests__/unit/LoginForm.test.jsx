import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginForm } from '@/components/auth/LoginForm'
import { useAuth } from '@/contexts/AuthContext'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn()
}))

describe('LoginForm', () => {
  const login = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useAuth.mockReturnValue({ login, loading: false })
  })

  it('keeps the submit button disabled until both fields are filled', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)
    const submit = screen.getByRole('button', { name: 'OK' })

    expect(submit).toBeDisabled()
    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    expect(submit).toBeDisabled()
    await user.type(screen.getByLabelText('Mot de Passe'), 'secret123')
    expect(submit).toBeEnabled()
  })

  it('displays a validation error for an invalid email', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.type(screen.getByLabelText('Email'), 'invalid-email')
    await user.type(screen.getByLabelText('Mot de Passe'), 'secret123')

    expect(screen.getByText('Mail Invalide !')).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it('submits trimmed credentials after valid input', async () => {
    const user = userEvent.setup()
    login.mockResolvedValue({ success: true })
    render(<LoginForm />)

    await user.type(screen.getByLabelText('Email'), ' user@example.com ')
    await user.type(screen.getByLabelText('Mot de Passe'), ' secret123 ')
    await user.click(screen.getByRole('button', { name: 'OK' }))

    expect(login).toHaveBeenCalledWith('user@example.com', 'secret123')
  })
})
