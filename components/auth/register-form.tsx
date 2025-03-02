import { useState } from 'react';
import { useAuth } from '@/lib/auth/hooks';
import { validatePassword } from '@/lib/auth/utils';
import type { RegisterCredentials } from '@/lib/auth/types';

export interface RegisterFormProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const RegisterForm = ({ onSuccess, onError }: RegisterFormProps) => {
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  const validateForm = (data: RegisterCredentials) => {
    const errors: typeof validationErrors = {};

    if (!validatePassword(data.password)) {
      errors.password = 'Password must be at least 8 characters with uppercase, lowercase, and number';
    }

    if (data.password !== data.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setValidationErrors({});

    const formData = new FormData(event.currentTarget);
    const credentials: RegisterCredentials = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      confirmPassword: formData.get('confirmPassword') as string,
    };

    if (!validateForm(credentials)) {
      setLoading(false);
      return;
    }

    try {
      await register(credentials);
      onSuccess?.();
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Create an Account</h1>
        <p className="text-gray-600 mt-2">Sign up to get started</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-medium">
            Full Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your full name"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your email"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 
              ${validationErrors.password ? 'border-red-500' : ''}`}
            placeholder="Create a password"
          />
          {validationErrors.password && (
            <p className="text-red-600 text-sm mt-1">
              {validationErrors.password}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="block text-sm font-medium">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
              ${validationErrors.confirmPassword ? 'border-red-500' : ''}`}
            placeholder="Confirm your password"
          />
          {validationErrors.confirmPassword && (
            <p className="text-red-600 text-sm mt-1">
              {validationErrors.confirmPassword}
            </p>
          )}
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
          {loading ? 'Creating account...' : 'Create account'}
        </button>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <a href="/auth/login" className="text-blue-600 hover:underline">
            Sign in
          </a>
        </p>
      </form>
    </div>
  );
};