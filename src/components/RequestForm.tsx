import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { RequestFormData } from '../types/RequestFormSchema';
import { requestFormSchema } from '../types/RequestFormSchema';
import { useNostr } from '../hooks/useNostr';

interface UserMetadata {
  name?: string;
  display_name?: string;
  about?: string;
  picture?: string;
}

interface RequestFormProps {
  defaultValues?: RequestFormData;
  // eslint-disable-next-line no-unused-vars
  onSubmit: (data: RequestFormData) => Promise<void>;
  isSubmitting: boolean;
  isEmbed?: boolean;
  userPublicKey?: string | null;
  metadata?: UserMetadata | null;
  buttonReplacement?: React.ReactNode;
}

export const RequestForm: React.FC<RequestFormProps> = ({
  defaultValues,
  onSubmit,
  isSubmitting,
  isEmbed = false,
  userPublicKey,
  metadata,
  buttonReplacement,
}) => {
  const [error, setError] = useState<string | null>(null);
  const { setTemporaryUserName, temporaryUserName } = useNostr();

  // State for authenticated users (controlled inputs)
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const isAuthenticated = !!userPublicKey;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestFormData>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: defaultValues as RequestFormData,
  });

  const handleFormSubmit = async (formData: RequestFormData) => {
    try {
      if (
        formData.name.trim() &&
        formData.name.trim() !== (metadata?.name || metadata?.display_name)
      ) {
        setTemporaryUserName(formData.name.trim());
      }
      setError(null);
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleAuthenticatedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      return;
    }

    const data: RequestFormData = {
      name:
        metadata?.name ||
        metadata?.display_name ||
        temporaryUserName ||
        'Anonymous User',
      email: '', // Email not required for authenticated users
      subject: subject.trim(),
      message: message.trim(),
    };
    try {
      setError(null);
      await onSubmit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  // Render authenticated user form (simple controlled inputs)
  if (isAuthenticated) {
    const displayName = metadata?.name || metadata?.display_name || 'Anonymous';
    const displayAbout =
      metadata?.about || 'Product Designer and Community Volunteer';

    return (
      <div className={isEmbed ? 'p-4' : ''}>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* User Profile Section */}
        <div className="pb-4 border-b border-gray-200 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
              {metadata?.picture ? (
                <img
                  src={metadata.picture}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg
                  className="w-8 h-8 text-gray-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {displayName}
              </h3>
              <p className="text-sm text-gray-600">{displayAbout}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleAuthenticatedSubmit} className="space-y-4">
          {/* Subject Field */}
          <div>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Subject"
              className="w-full px-3 py-2 border-0 border-b border-gray-300 focus:outline-none focus:border-indigo-500 text-gray-900 placeholder-gray-400"
            />
          </div>

          {/* Message Field */}
          <div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="What would you like to request?"
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder-gray-400 resize-none"
            />
          </div>

          {/* Submit Button */}
          {buttonReplacement ? (
            <div className="pt-4 border-t border-gray-200">
              {buttonReplacement}
            </div>
          ) : (
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={isSubmitting || !subject.trim() || !message.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Sending...' : 'Send'}
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{ transform: 'rotate(45deg)' }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
          )}
        </form>
      </div>
    );
  }

  // Render non-authenticated user form (react-hook-form with validation)
  return (
    <div className={isEmbed ? 'p-4' : ''}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name *
            </label>
            <input
              type="text"
              {...register('name')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Your full name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              {...register('email')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="your.email@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject *
          </label>
          <input
            type="text"
            {...register('subject')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Brief description of your request"
          />
          {errors.subject && (
            <p className="mt-1 text-sm text-red-600">
              {errors.subject.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message *
          </label>
          <textarea
            {...register('message')}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            placeholder="What would you like to request?"
          />
          {errors.message && (
            <p className="mt-1 text-sm text-red-600">
              {errors.message.message}
            </p>
          )}
        </div>

        {buttonReplacement ? (
          <div className="pt-4 border-t border-gray-200">
            {buttonReplacement}
          </div>
        ) : (
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Sending...' : 'Send'}
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ transform: 'rotate(45deg)' }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
