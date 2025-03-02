import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { BellIcon, EnvelopeIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { Switch } from '@headlessui/react';

interface NotificationPreferencesProps {
  initialPreferences?: {
    email: boolean;
    inApp: boolean;
    batchSummary: boolean;
  };
  onSave?: (preferences: any) => Promise<void>;
}

export default function NotificationPreferences({ 
  initialPreferences,
  onSave 
}: NotificationPreferencesProps) {
  const { data: session } = useSession();
  const [preferences, setPreferences] = useState({
    email: true,
    inApp: true,
    batchSummary: false,
    ...initialPreferences
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load preferences on component mount
  useEffect(() => {
    if (!initialPreferences) {
      loadPreferences();
    }
  }, [initialPreferences]);

  // Load user preferences from the API
  const loadPreferences = async () => {
    if (!session?.user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/account/notification-preferences');
      
      if (!response.ok) {
        throw new Error('Failed to load notification preferences');
      }
      
      const data = await response.json();
      
      setPreferences({
        email: true, // Default values
        inApp: true,
        batchSummary: false,
        ...data.preferences
      });
    } catch (error) {
      console.error('Error loading notification preferences:', error);
      setError('Failed to load your notification preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle toggle change for a preference
  const handleToggle = (key: keyof typeof preferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    
    // Reset saved state when changes are made
    setSaved(false);
  };

  // Save preferences
  const savePreferences = async () => {
    if (!session?.user?.id) return;
    
    setLoading(true);
    setError(null);
    setSaved(false);
    
    try {
      if (onSave) {
        await onSave(preferences);
      } else {
        const response = await fetch('/api/account/notification-preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ preferences })
        });
        
        if (!response.ok) {
          throw new Error('Failed to save notification preferences');
        }
      }
      
      setSaved(true);
      
      // Reset saved state after 3 seconds
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      setError('Failed to save your notification preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Notification Preferences</h2>
        <BellIcon className="w-6 h-6 text-blue-600" />
      </div>
      
      {error && (
        <div className="p-3 bg-red-100 text-red-800 rounded-md">
          {error}
        </div>
      )}
      
      {saved && (
        <div className="p-3 bg-green-100 text-green-800 rounded-md">
          Your notification preferences have been saved.
        </div>
      )}
      
      <div className="space-y-4">
        <div className="p-4 rounded-md border border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <EnvelopeIcon className="w-5 h-5 text-gray-600" />
              <div>
                <h3 className="font-medium text-gray-900">Email Notifications</h3>
                <p className="text-sm text-gray-500">Receive important notifications via email</p>
              </div>
            </div>
            <Switch
              checked={preferences.email}
              onChange={() => handleToggle('email')}
              className={`${
                preferences.email ? 'bg-blue-600' : 'bg-gray-200'
              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
            >
              <span className="sr-only">Enable email notifications</span>
              <span
                className={`${
                  preferences.email ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </Switch>
          </div>
        </div>
        
        <div className="p-4 rounded-md border border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <BellIcon className="w-5 h-5 text-gray-600" />
              <div>
                <h3 className="font-medium text-gray-900">In-App Notifications</h3>
                <p className="text-sm text-gray-500">Receive notifications within the app</p>
              </div>
            </div>
            <Switch
              checked={preferences.inApp}
              onChange={() => handleToggle('inApp')}
              className={`${
                preferences.inApp ? 'bg-blue-600' : 'bg-gray-200'
              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
            >
              <span className="sr-only">Enable in-app notifications</span>
              <span
                className={`${
                  preferences.inApp ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </Switch>
          </div>
        </div>
        
        <div className="p-4 rounded-md border border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <DocumentDuplicateIcon className="w-5 h-5 text-gray-600" />
              <div>
                <h3 className="font-medium text-gray-900">Batch Notifications</h3>
                <p className="text-sm text-gray-500">Receive a single notification for batch actions instead of multiple individual notifications</p>
              </div>
            </div>
            <Switch
              checked={preferences.batchSummary}
              onChange={() => handleToggle('batchSummary')}
              className={`${
                preferences.batchSummary ? 'bg-blue-600' : 'bg-gray-200'
              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
            >
              <span className="sr-only">Enable batch notifications</span>
              <span
                className={`${
                  preferences.batchSummary ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </Switch>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={savePreferences}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}
