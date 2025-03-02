import { useState } from 'react';
import { useAuth } from '@/lib/auth/hooks';
import { validateEmail } from '@/lib/auth/utils';
import type { ForgotPasswordCredentials } from '@/lib/auth/types';

export interface ForgotPasswordFormProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const ForgotPasswordForm = ({
  onSuccess,
  onError,
}: ForgotPasswordFormProps) => {
  const { forgotPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');

  const validateForm = (data: ForgotPasswordCredentials) => {
    if (!validateEmail(data.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const credentials: ForgotPasswordCredentials = {
      email: email.trim(),
    };

    if (!validateForm(credentials)) {
      setLoading(false);
      return;
    }

    try {
      await forgotPassword(credentials);
      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto p-6 space-y-6">
        <div className="text-center">
          <div className="text-green-500 text-5xl mb-4">✓</div>
          <h2 className="text-2xl font-bold">Check Your Email</h2>
          <p className="text-gray-600 mt-2">
            We've sent password reset instructions to:
          </p>
          <p className="text-gray-800 font-medium mt-1">{email}</p>
        </div>
        <p className="text-center text-sm text-gray-600">
          Didn't receive the email?{' '}
          <button
            onClick={() => setSuccess(false)}
            className="text-blue-600 hover:underline"
          >
            Try again
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Reset Password</h1>
        <p className="text-gray-600 mt-2">
          Enter your email to receive reset instructions
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your email"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 px-4 rounded-lg text-white font-medium
            ${loading
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
            }`}
        >
          {loading ? 'Sending instructions...' : 'Send reset instructions'}
        </button>

        <p className="text-center text-sm text-gray-600">
          Remember your password?{' '}
          <a href="/auth/login" className="text-blue-600 hover:underline">
            Sign in
          </a>
        </p>
      </form>
    </div>
  );
};