import { useState, useEffect } from 'react';
import axios from 'axios';
import { AddChildItemForm } from "./AddChildItemForm";
import { EditChildItemForm } from "./EditChildItemForm";

export const ChildItemsModal = ({ 
  categoryId, 
  parentItem, 
  onClose 
}) => {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'broken', 'working'
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingChild, setEditingChild] = useState(null);

  const fetchChildren = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/api/categories/${categoryId}/items/${parentItem.id}/children`
      );
      setChildren(response.data.items);
      setError(null);
    } catch (err) {
      console.error('Error fetching child items:', err);
      setError(err.response?.data?.error || 'Failed to load child items');
      setChildren([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChildren();
  }, [categoryId, parentItem.id]);

  const filteredChildren = children.filter(child => {
    if (filter === 'all') return true;
    return filter === 'broken' ? child.is_broken : !child.is_broken;
  });

  const handleDeleteChild = async (childId) => {
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL}/api/categories/${categoryId}/items/${parentItem.id}/children/${childId}`
      );
      fetchChildren(); // Refresh the list
    } catch (err) {
      console.error('Error deleting child item:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a2f36] rounded-xl p-6 w-full max-w-6xl max-h-[90vh] overflow-auto border border-[#6B8E8E]/50">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-xl font-bold text-[#95CFAB]">{parentItem.name} Units</h3>
            <p className="text-sm text-[#95CFAB]/80">{children.length} Total Units</p>
          </div>
          <div className="flex space-x-3">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-[#1a2f36] border border-[#6B8E8E]/50 text-[#95CFAB] rounded-lg px-3 py-1"
            >
              <option value="all">All</option>
              <option value="broken">Broken</option>
              <option value="working">Working</option>
            </select>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-3 py-1 rounded-lg bg-[#95CFAB]/90 text-[#1a2f36] hover:bg-[#95CFAB] transition-colors"
            >
              Add New Unit
            </button>
            <button
              onClick={onClose}
              className="text-[#F5A83C] hover:text-[#F5A83C]/80 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#95CFAB]"></div>
            <p className="mt-2 text-[#95CFAB]">Loading items...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-[#F5A83C]">
            <p>{error}</p>
          </div>
        ) : filteredChildren.length === 0 ? (
          <div className="text-center py-8 text-[#95CFAB]/80">
            <p>No items found matching the filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-[#95CFAB]">
              <thead className="text-xs uppercase bg-[#2F4F4F]/50">
                <tr>
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3">Model</th>
                  <th className="px-6 py-3">Cost</th>
                  <th className="px-6 py-3">Assigned To</th>
                  <th className="px-6 py-3">Issue Date</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredChildren.map((child) => (
                  <tr key={child.id} className="border-b border-[#6B8E8E]/30 hover:bg-[#6B8E8E]/10">
                    <td className="px-6 py-4">{child.code}</td>
                    <td className="px-6 py-4">{child.model || '-'}</td>
                    <td className="px-6 py-4">{child.cost ? child.cost.toLocaleString() : '-'}</td>
                    <td className="px-6 py-4">{child.assigned_to || '-'}</td>
                    <td className="px-6 py-4">
                      {child.issue_date ? new Date(child.issue_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        child.is_broken 
                          ? 'bg-[#F5A83C]/20 text-[#F5A83C]' 
                          : 'bg-[#95CFAB]/20 text-[#95CFAB]'
                      }`}>
                        {child.is_broken ? 'Broken' : 'Working'}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex space-x-2">
                      <button
                        onClick={() => setEditingChild(child)}
                        className="p-1 rounded-md bg-[#95CFAB]/10 hover:bg-[#95CFAB]/20 transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteChild(child.id)}
                        className="p-1 rounded-md bg-[#F5A83C]/10 hover:bg-[#F5A83C]/20 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {showAddForm && (
          <AddChildItemForm
            categoryId={categoryId}
            parentItem={parentItem}
            onClose={() => setShowAddForm(false)}
            onSuccess={() => {
              fetchChildren();
              setShowAddForm(false);
            }}
          />
        )}
        
        {editingChild && (
          <EditChildItemForm
            categoryId={categoryId}
            parentItemId={parentItem.id}
            childItem={editingChild}
            onClose={() => setEditingChild(null)}
            onSuccess={() => {
              fetchChildren();
              setEditingChild(null);
            }}
          />
        )}
      </div>
    </div>
  );
};