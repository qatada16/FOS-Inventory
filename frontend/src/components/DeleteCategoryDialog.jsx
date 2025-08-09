export const DeleteCategoryDialog = ({ 
  categoryName, 
  onConfirm, 
  onCancel 
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a2f36] rounded-xl p-6 w-full max-w-md border border-[#6B8E8E]/50">
        <h3 className="text-lg font-bold text-[#95CFAB] mb-4">Confirm Deletion</h3>
        <p className="text-[#95CFAB]/80 mb-6">
          Are you sure you want to delete the category "{categoryName}"? 
          This will also delete all items in this category.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-[#F5A83C]/50 text-[#F5A83C] hover:bg-[#F5A83C]/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[#F5A83C]/90 text-[#1a2f36] hover:bg-[#F5A83C] transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};