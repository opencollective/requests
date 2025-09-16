import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginOptions } from '../components/LoginOptions';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome to{' '}
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Community Requests
              </span>
            </h1>
            <p className="text-lg text-gray-600">
              Choose your authentication method
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <LoginOptions />
          </div>

          <button
            onClick={() => navigate(-1)}
            className="mt-6 w-full bg-white hover:bg-gray-50 text-indigo-600 hover:text-indigo-700 px-4 py-2 rounded-lg border border-indigo-200 hover:border-indigo-300 text-sm font-medium flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-200"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>
        </div>
      </div>
    </div>
  );
};
