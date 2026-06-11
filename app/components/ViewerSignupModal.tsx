'use client';

import { useRouter } from 'next/navigation';
import { X, Sparkles, ArrowRight } from 'lucide-react';

interface ViewerSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ViewerSignupModal({ isOpen, onClose }: ViewerSignupModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleCreateAccount = () => {
    router.push('/register');
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="viewer-signup-modal-title"
    >
      <div
        className="relative w-full max-w-md rounded-2xl border p-8 shadow-2xl shadow-blue-500/10"
        style={{
          backgroundColor: '#0B0E14',
          borderColor: 'rgba(79, 125, 255, 0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div
          className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5"
          style={{ backgroundColor: 'rgba(79, 125, 255, 0.15)' }}
        >
          <Sparkles size={24} className="text-blue-400" />
        </div>

        <h2
          id="viewer-signup-modal-title"
          className="text-2xl font-bold mb-3 pr-8"
          style={{ color: '#E6EAF0' }}
        >
          Save your view, get a quote, and start selling.
        </h2>

        <p className="text-base leading-relaxed mb-8" style={{ color: '#9BA3AF' }}>
          Create a free account to unlock full analysis, automated manufacturing quotes, and
          secure sharing tools.
        </p>

        <button
          type="button"
          onClick={handleCreateAccount}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/25 transition-all duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.98]"
        >
          Create Free Account
          <ArrowRight size={18} />
        </button>

        <p className="text-center text-xs mt-4" style={{ color: '#6B7280' }}>
          No credit card required
        </p>
      </div>
    </div>
  );
}
