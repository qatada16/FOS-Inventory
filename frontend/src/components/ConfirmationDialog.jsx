export const ConfirmationDialog = ({ message, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative max-w-md w-full rounded-xl overflow-hidden bg-gradient-to-br from-[#1a2f36] to-[#284952] border border-[#95CFAB]/20 p-6">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-[#95CFAB] mb-2">Confirm Action</h3>
          <p className="text-[#95CFAB]/80">{message}</p>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg font-medium border border-[#95CFAB]/30 text-[#95CFAB] hover:bg-[#95CFAB]/10 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg font-medium bg-gradient-to-br from-[#F5A83C] to-[#F5A83C]/70 text-[#284952] hover:shadow-lg hover:shadow-[#F5A83C]/20 transition-all"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};