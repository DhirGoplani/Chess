export default function ConfirmModal({
  isOpen,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  isDanger = false,
}) {
  if (!isOpen) return null;

  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 z-[9999] bg-[rgba(10,6,3,0.8)] backdrop-blur-md flex items-center justify-center p-4 animate-[fadeIn_0.15s_ease-out_both]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-gradient-to-b from-[#2c1a0e] to-[#1a0e07] border border-[rgba(196,163,90,0.3)] shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-6 text-center animate-[popIn_0.2s_ease-out_both]"
      >
        <div className="w-12 h-12 rounded-xl bg-[rgba(196,163,90,0.1)] border border-[rgba(196,163,90,0.25)] flex items-center justify-center mx-auto mb-4 text-xl">
          {isDanger ? "⚠️" : "♟"}
        </div>
        <h3 className="font-['Playfair_Display',serif] text-lg font-bold text-[#f0e6d3] mb-1.5">
          {title}
        </h3>
        <p className="text-xs text-[#c4a882] mb-6 leading-relaxed">
          {message}
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 rounded-xl bg-transparent border border-[rgba(196,163,90,0.25)] text-[#c4a882] text-xs font-semibold hover:border-[#c4a35a] hover:text-[#f0e6d3] transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all ${
              isDanger
                ? "bg-[rgba(229,57,53,0.18)] border border-[rgba(229,57,53,0.4)] text-[#e53935] hover:bg-[#e53935] hover:text-white"
                : "bg-gradient-to-r from-[#c4a35a] to-[#e8a838] text-[#1a0e07] hover:brightness-110"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
