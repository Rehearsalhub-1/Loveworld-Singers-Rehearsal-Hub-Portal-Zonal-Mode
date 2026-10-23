'use client';

import React from 'react';
import { AlertCircle, UserPlus } from 'lucide-react';

interface DeviceConflictAlertProps {
  activeDevice: string;
  onSignUp: () => void;
}

export default function DeviceConflictAlert({ activeDevice, onSignUp }: DeviceConflictAlertProps) {
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
      <div className="flex items-start">
        <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">
            Account Already in Use
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>
              This account is currently logged in on <span className="font-semibold">{activeDevice}</span>.
            </p>
            <p className="mt-2">
              For security and privacy reasons, each account can only be used on one device at a time.
            </p>
          </div>
          <div className="mt-4">
            <button
              onClick={onSignUp}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Sign Up for Your Own Account
            </button>
            <p className="mt-2 text-xs text-yellow-600">
              Create your own account to access all features securely
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}