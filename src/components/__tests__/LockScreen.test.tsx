import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LockScreen } from '../LockScreen';

// Mock biometric service
vi.mock('../../services/biometricService', () => ({
  isBiometricAvailable: vi.fn(() => Promise.resolve(false)),
  getBiometryType: vi.fn(() => Promise.resolve('none')),
  authenticateWithBiometric: vi.fn(() => Promise.resolve(false)),
  getBiometricPreference: vi.fn(() => Promise.resolve(false))
}));

// Mock audit service
vi.mock('../../services/auditService', () => ({
  logAuditEvent: vi.fn()
}));

// Mock firebase modules so the component doesn't try to reach a real backend
vi.mock('../../services/firebaseConfig', () => ({
  isFirebaseConfigured: vi.fn(() => false),
  getFirebaseAuth: vi.fn()
}));

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn()
}));

// Lazy-import the mocked biometric helpers so we can override per-test
import {
  isBiometricAvailable,
  getBiometryType,
  getBiometricPreference
} from '../../services/biometricService';

const defaultProps = {
  userEmail: 'doctor@example.com',
  userId: 'user-1',
  orgId: 'org-1',
  onUnlock: vi.fn()
};

describe('LockScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────────────
  it('renders lock screen with password input', () => {
    render(<LockScreen {...defaultProps} />);

    expect(screen.getByText('Session Locked')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByText(defaultProps.userEmail)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unlock' })).toBeInTheDocument();
  });

  // ── Incorrect password ─────────────────────────────────────────
  it('shows error message on incorrect password submission', async () => {
    // When Firebase IS configured, signInWithEmailAndPassword will reject
    const { isFirebaseConfigured } = await import('../../services/firebaseConfig');
    (isFirebaseConfigured as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const { signInWithEmailAndPassword } = await import('firebase/auth');
    (signInWithEmailAndPassword as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('auth/wrong-password')
    );

    render(<LockScreen {...defaultProps} />);

    const input = screen.getByPlaceholderText('Password');
    fireEvent.change(input, { target: { value: 'wrong-password' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Incorrect password. Please try again.')).toBeInTheDocument();
    });
  });

  // ── Correct password ───────────────────────────────────────────
  it('calls onUnlock on correct password submission', async () => {
    // In non-Firebase mode (isFirebaseConfigured returns false), submitting
    // any password triggers onUnlock immediately.
    const { isFirebaseConfigured } = await import('../../services/firebaseConfig');
    (isFirebaseConfigured as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const onUnlock = vi.fn();
    render(<LockScreen {...defaultProps} onUnlock={onUnlock} />);

    const input = screen.getByPlaceholderText('Password');
    fireEvent.change(input, { target: { value: 'correct-password' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(onUnlock).toHaveBeenCalledTimes(1);
    });
  });

  // ── Biometric button ───────────────────────────────────────────
  it('renders Face ID / Touch ID button when biometric is available', async () => {
    (isBiometricAvailable as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (getBiometricPreference as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (getBiometryType as ReturnType<typeof vi.fn>).mockResolvedValue('faceId');

    render(<LockScreen {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Use Face ID')).toBeInTheDocument();
    });
  });
});
