import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { SubGroup } from '@/types/subgroup';
import CustomLoader from '@/components/CustomLoader';

interface RejectModalProps {
  subGroup: SubGroup;
  reason: string;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  processing: boolean;
}

export function RejectModal({
  subGroup,
  reason,
  onReasonChange,
  onConfirm,
  onClose,
  processing
}: RejectModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[80] p-4">
      <div className="bg-white rounded-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Reject Request</h2>
              <p className="text-sm text-slate-500">"{subGroup.name}"</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Reason for rejection
          </label>
          <textarea
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Please provide a reason for rejecting this request..."
            rows={4}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none transition-all"
          />
          <p className="text-xs text-slate-400 mt-2">
            This reason will be sent to the requester.
          </p>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!reason.trim() || processing}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold shadow-md shadow-red-100"
          >
            {processing ? (
              <>
                <CustomLoader size="sm" />
                <span className="ml-2">Rejecting...</span>
              </>
            ) : (
              <>
                <X className="w-4 h-4" />
                Reject Request
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
