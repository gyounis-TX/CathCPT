import React, { useState, useEffect } from 'react';
import { X, Building2, Check, AlertCircle, Unlink, Loader2, Link } from 'lucide-react';
import { logger } from '../services/logger';
import {
  getPracticeConnection,
  connectToPractice,
  disconnectFromPractice,
  getConnectionStatus,
  isValidPracticeCodeFormat,
  PracticeConnection
} from '../services/practiceConnection';

interface PracticeCodeSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionChanged: () => void;
}

export const PracticeCodeSetup: React.FC<PracticeCodeSetupProps> = ({
  isOpen,
  onClose,
  onConnectionChanged
}) => {
  const [practiceCode, setPracticeCode] = useState('');
  const [connection, setConnection] = useState<PracticeConnection | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{
    hospitalsCount: number;
    cathLabsCount: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConnection();
    }
  }, [isOpen]);

  const loadConnection = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const conn = await getPracticeConnection();
      setConnection(conn);

      if (conn) {
        const status = await getConnectionStatus();
        setConnectionStatus({
          hospitalsCount: status.hospitalsCount,
          cathLabsCount: status.cathLabsCount
        });
      }
    } catch (err) {
      logger.error('Error loading connection', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const code = practiceCode.trim().toUpperCase();

    if (!isValidPracticeCodeFormat(code)) {
      setError('Invalid code format. Please enter a 6-12 character alphanumeric code.');
      return;
    }

    setIsConnecting(true);

    try {
      const conn = await connectToPractice(code);
      setConnection(conn);
      setPracticeCode('');
      setSuccess(`Connected to ${conn.organizationName}`);

      const status = await getConnectionStatus();
      setConnectionStatus({
        hospitalsCount: status.hospitalsCount,
        cathLabsCount: status.cathLabsCount
      });

      onConnectionChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect from this practice? Your local data will be preserved.')) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await disconnectFromPractice();
      setConnection(null);
      setConnectionStatus(null);
      onConnectionChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:w-[420px] sm:rounded-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Practice Connection</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : connection ? (
            // Connected State
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-green-800">Connected</div>
                  <div className="text-sm text-green-600">{connection.organizationName}</div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Practice Code</span>
                  <span className="font-mono text-gray-900">{connection.practiceCode}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Connected On</span>
                  <span className="text-gray-900">{formatDate(connection.connectedAt)}</span>
                </div>
                {connectionStatus && (
                  <>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Hospitals</span>
                      <span className="text-gray-900">{connectionStatus.hospitalsCount}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Cath Labs</span>
                      <span className="text-gray-900">{connectionStatus.cathLabsCount}</span>
                    </div>
                  </>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                onClick={handleDisconnect}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-red-300 text-red-700 rounded-lg font-medium hover:bg-red-50"
              >
                <Unlink className="w-4 h-4" />
                Disconnect from Practice
              </button>
            </div>
          ) : (
            // Not Connected State
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Enter your practice code to enable sync with your organization's billing system.
              </p>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              )}

              <form onSubmit={handleConnect} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Practice Code
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={practiceCode}
                      onChange={(e) => {
                        setPracticeCode(e.target.value.toUpperCase());
                        setError(null);
                      }}
                      placeholder="Enter code (e.g., CARD2024)"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono uppercase"
                      maxLength={12}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    6-12 character code provided by your practice admin
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isConnecting || !practiceCode.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Link className="w-4 h-4" />
                      Connect
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500">
                Don't have a code? Contact your practice administrator.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-4 py-3">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PracticeCodeSetup;
