import { useState } from 'react';
import axios from 'axios';

export const AddChildItemForm = ({ 
  categoryId, 
  parentItem, 
  onClose, 
  onSuccess 
}) => {
  const [formData, setFormData] = useState({
    code: '',
    model: '',
    cost: 0,
    assigned_to: '',
    is_broken: false,
    additional_detail: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/categories/${categoryId}/items/${parentItem.id}/children`,
        formData
      );
      onSuccess(response.data);
      onClose();
    } catch (err) {
      console.error('Error adding child item:', err);
      setError(err.response?.data?.error || 'Failed to add child item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a2f36] rounded-xl p-6 w-full max-w-md border border-[#6B8E8E]/50">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-[#95CFAB]">Add New Unit to {parentItem.name}</h3>
          <button
            onClick={onClose}
            className="text-[#F5A83C] hover:text-[#F5A83C]/80 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#95CFAB]/80 mb-1">Code*</label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 rounded-lg bg-[#1a2f36] border border-[#6B8E8E]/50 text-[#95CFAB] focus:border-[#95CFAB] focus:ring-1 focus:ring-[#95CFAB] outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#95CFAB]/80 mb-1">Model</label>
            <input
              type="text"
              name="model"
              value={formData.model}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg bg-[#1a2f36] border border-[#6B8E8E]/50 text-[#95CFAB] focus:border-[#95CFAB] focus:ring-1 focus:ring-[#95CFAB] outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#95CFAB]/80 mb-1">Cost</label>
            <input
              type="number"
              name="cost"
              value={formData.cost}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 rounded-lg bg-[#1a2f36] border border-[#6B8E8E]/50 text-[#95CFAB] focus:border-[#95CFAB] focus:ring-1 focus:ring-[#95CFAB] outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#95CFAB]/80 mb-1">Assigned To</label>
            <input
              type="text"
              name="assigned_to"
              value={formData.assigned_to}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg bg-[#1a2f36] border border-[#6B8E8E]/50 text-[#95CFAB] focus:border-[#95CFAB] focus:ring-1 focus:ring-[#95CFAB] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#95CFAB]/80 mb-1">Additional Detail</label>
            <input
              type="text"
              name="additional_detail"
              value={formData.additional_detail}
              onChange={handleChange}
              placeholder="Additional Something"
              className="w-full px-3 py-2 rounded-lg bg-[#1a2f36] border border-[#6B8E8E]/50 text-[#95CFAB] focus:border-[#95CFAB] focus:ring-1 focus:ring-[#95CFAB] outline-none"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              name="is_broken"
              checked={formData.is_broken}
              onChange={handleChange}
              className="rounded bg-[#1a2f36] border-[#6B8E8E]/50 text-[#95CFAB] focus:ring-[#95CFAB]"
            />
            <label className="ml-2 text-sm font-medium text-[#95CFAB]/80">Is Broken</label>
          </div>

          {error && (
            <div className="text-[#F5A83C] text-sm py-2 px-3 rounded-lg bg-[#F5A83C]/10">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-[#F5A83C]/50 text-[#F5A83C] hover:bg-[#F5A83C]/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-[#95CFAB]/90 text-[#1a2f36] hover:bg-[#95CFAB] transition-colors disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Unit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};