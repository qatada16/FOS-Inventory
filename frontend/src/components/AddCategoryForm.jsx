import { useState } from "react";
import axios from "axios";

export const AddCategoryForm = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    quantity: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/categories`,
        formData
      );
      
      if (response.data.id) {
        onSuccess(response.data);
        onClose();
      }
    } catch (err) {
      console.error('Error creating category:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative max-w-md w-full rounded-xl overflow-hidden bg-gradient-to-br from-[#1a2f36] to-[#284952] border border-[#95CFAB]/20 p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-[#95CFAB]/10 hover:bg-[#95CFAB]/20 transition-colors"
        >
          <svg className="w-6 h-6 text-[#95CFAB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-bold text-[#95CFAB] mb-6">Add New Category</h2>
        
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-[#F5A83C]/10 text-[#F5A83C]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#95CFAB]/80 mb-1">Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg bg-[#1a2f36] border border-[#95CFAB]/20 text-[#95CFAB] focus:outline-none focus:ring-1 focus:ring-[#95CFAB]"
              required
            />
          </div>

          

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg font-medium border border-[#95CFAB]/30 text-[#95CFAB] hover:bg-[#95CFAB]/10 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg font-medium bg-gradient-to-br from-[#F5A83C] to-[#F5A83C]/70 text-[#284952] hover:shadow-lg hover:shadow-[#F5A83C]/20 transition-all disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};