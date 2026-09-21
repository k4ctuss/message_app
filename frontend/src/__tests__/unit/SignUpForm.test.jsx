import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SignUpForm } from '@/components/auth/SignUpForm'
import { useAuth } from '@/contexts/AuthContext'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn()
}))

describe('SignUpForm', () => {
  const signUp = vi.fn()
  const registerCallback = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useAuth.mockReturnValue({ signUp, loading: false })
  })

  it('shows an error when passwords do not match', async () => {
    const user = userEvent.setup()
    render(<SignUpForm registerCallback={registerCallback} />)

    await user.type(screen.getByLabelText('Nom'), 'Test User')
    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Mot de passe'), 'secret123')
    await user.type(screen.getByLabelText('Confimer votre Mot de passe'), 'different123')

    expect(screen.getByText('Mots de passe différents !')).toBeInTheDocument()
    expect(signUp).not.toHaveBeenCalled()
  })

  it('resets the form and forwards the email after a successful signup', async () => {
    const user = userEvent.setup()
    signUp.mockResolvedValue({ success: true })
    render(<SignUpForm registerCallback={registerCallback} />)

    await user.type(screen.getByLabelText('Nom'), 'Test User')
    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Mot de passe'), 'secret123')
    await user.type(screen.getByLabelText('Confimer votre Mot de passe'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'OK' }))

    expect(signUp).toHaveBeenCalledWith('Test User', 'user@example.com', 'secret123')
    expect(registerCallback).toHaveBeenCalledWith('user@example.com')
    expect(screen.getByLabelText('Nom')).toHaveValue('')
    expect(screen.getByLabelText('Email')).toHaveValue('')
  })
})
