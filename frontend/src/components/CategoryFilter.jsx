import React from 'react';
import { useState, useEffect } from "react";
import { CategoryItemCard } from "./CategoryItemCard";
import { AddCategoryForm } from "./AddCategoryForm";
import { AddCategoryItemForm } from "./AddCategoryItemForm";
import { DeleteCategoryDialog } from "./DeleteCategoryDialog";
import axios from "axios";

export const CategoryFilter = ({ onCategorySelect }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [categoryItems, setCategoryItems] = useState({});
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [selectedCategoryForAdd, setSelectedCategoryForAdd] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  const handleDeleteCategory = async (categoryId) => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/api/categories/${categoryId}`);
      
      // Update state
      setCategories(prev => prev.filter(cat => cat.id !== categoryId));
      setSelectedCategories(prev => prev.filter(id => id !== categoryId));
      
      // Remove items from state
      setCategoryItems(prev => {
        const newItems = {...prev};
        delete newItems[categoryId];
        return newItems;
      });
      
      setCategoryToDelete(null);
    } catch (err) {
      console.error('Error deleting category:', err);
    }
  };

  const handleAddItemSuccess = (newItem) => {
    setCategoryItems(prev => ({
      ...prev,
      [selectedCategoryForAdd]: [...(prev[selectedCategoryForAdd] || []), newItem]
    }));
    
    // Update category quantity
    setCategories(prev => prev.map(cat => 
      cat.id === selectedCategoryForAdd 
        ? { ...cat, quantity: cat.quantity + 1 } 
        : cat
    ));
    
    setShowAddItemForm(false);
  };

  const handleUpdateItem = (categoryId, updatedItem) => {
    setCategoryItems(prev => ({
      ...prev,
      [categoryId]: prev[categoryId].map(item => 
        item.id === updatedItem.id ? updatedItem : item
      )
    }));
  };

  const handleAddCategorySuccess = (newCategory) => {
    setCategories(prev => [...prev, newCategory]);
    setSelectedCategories(prev => [...prev, newCategory.id]);
    setShowAddCategoryForm(false);
  };

  const handleDeleteItem = async (categoryId, itemId) => {
    try {
      const category = categories.find(c => c.id === categoryId);
      const tableName = category.name.toLowerCase().replace(/\s+/g, '_');
      
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL}/api/categories/${categoryId}/items/${itemId}`,
        { data: { tableName } }
      );

      setCategoryItems(prev => ({
        ...prev,
        [categoryId]: prev[categoryId].filter(item => item.id !== itemId)
      }));

      // Refresh categories to update quantities
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/categories`);
      setCategories(response.data);
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/categories`);
        setCategories(response.data);
        // Select all categories by default
        setSelectedCategories(response.data.map(cat => cat.id));
        setError(null);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError(err.message);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchItemsForSelectedCategories = async () => {
      if (selectedCategories.length === 0) {
        setCategoryItems({});
        return;
      }

      setItemsLoading(true);
      try {
        const itemsByCategory = {};
        
        // Fetch items for each selected category
        await Promise.all(selectedCategories.map(async (categoryId) => {
          try {
            const response = await axios.get(
              `${import.meta.env.VITE_API_BASE_URL}/api/categories/${categoryId}/items`
            );
            itemsByCategory[categoryId] = response.data;
          } catch (err) {
            console.error(`Error fetching items for category ${categoryId}:`, err);
            itemsByCategory[categoryId] = [];
          }
        }));

        setCategoryItems(itemsByCategory);
      } catch (err) {
        console.error('Error fetching category items:', err);
      } finally {
        setItemsLoading(false);
      }
    };

    fetchItemsForSelectedCategories();
  }, [selectedCategories]);

  const toggleCategory = (categoryId) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const selectAllCategories = () => {
    setSelectedCategories(categories.map(cat => cat.id));
  };

  useEffect(() => {
    if (categories.length > 0) {
      onCategorySelect(selectedCategories);
    }
  }, [selectedCategories, categories, onCategorySelect]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#95CFAB]"></div>
        <p className="mt-2 text-[#95CFAB]">Loading categories...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-[#F5A83C]">
        <p>Error loading ahh categories: {error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 rounded-lg bg-[#F5A83C]/10 text-[#F5A83C] hover:bg-[#F5A83C]/20 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-[#95CFAB]">Filter Categories</h3>
          <button
            onClick={selectAllCategories}
            className="px-4 py-2 rounded-lg text-sm font-medium
            border border-[#95CFAB]/30 text-[#95CFAB] hover:bg-[#95CFAB]/10
            transition-all"
          >
            Select All
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map(category => (
            <div 
              key={category.id}
              className={`p-4 rounded-xl text-center transition-all duration-300 relative
                  ${selectedCategories.includes(category.id)
                  ? 'bg-gradient-to-br from-[#2F4F4F] to-[#1B3C34] text-white shadow-lg shadow-[#2F4F4F]/30 hover:brightness-110 hover:scale-105'
                  : 'bg-[#1a2f36] border border-[#6B8E8E]/30 text-[#6B8E8E] hover:bg-[#6B8E8E]/20 hover:border-[#6B8E8E]/50 hover:scale-105'}`}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCategoryToDelete(category);
                }}
                className="absolute top-2 right-2 p-1 rounded-md bg-[#F5A83C]/10 hover:bg-[#F5A83C]/20 transition-colors"
                title="Delete Category"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <div onClick={() => toggleCategory(category.id)} className="cursor-pointer">
                <h4 className="font-bold text-lg">{category.name}</h4>
                <p className="text-sm mt-1">
                  {category.quantity} {category.quantity === 1 ? 'item' : 'items'}
                </p>
              </div>
            </div>
          ))}
          <button
            onClick={() => setShowAddCategoryForm(true)}
            className="p-4 rounded-xl text-center border-2 border-dashed border-[#95CFAB]/50
            text-[#95CFAB] hover:bg-[#95CFAB]/10 hover:border-solid hover:scale-105
            transition-all duration-300 flex flex-col items-center justify-center"
          >
            <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="font-medium">Add Category</span>
          </button>
        </div>
      </div>

      {itemsLoading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#95CFAB]"></div>
          <p className="mt-2 text-[#95CFAB]">Loading items...</p>
        </div>
      )}

      {selectedCategories.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-[#95CFAB]">Items in Selected Categories</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {selectedCategories.map(categoryId => {
              const category = categories.find(c => c.id === categoryId);
              const items = categoryItems[categoryId] || [];
              
              return [
                ...items.map(item => (
                  <CategoryItemCard
                    key={`${categoryId}-${item.id}`}
                    item={item}
                    categoryId={categoryId}
                    onUpdate={(updatedItem) => handleUpdateItem(categoryId, updatedItem)}
                    onDelete={(itemId) => handleDeleteItem(categoryId, itemId)}
                  />
                )),
                selectedCategories.length === 1 && (
                  <button
                    key={`${categoryId}-add-button`}
                    onClick={() => {
                      setSelectedCategoryForAdd(categoryId);
                      setShowAddItemForm(true);
                    }}
                    className="p-4 rounded-xl text-center border-2 border-dashed border-[#95CFAB]/50
                    text-[#95CFAB] hover:bg-[#95CFAB]/10 hover:border-solid hover:scale-105
                    transition-all duration-300 flex flex-col items-center justify-center"
                  >
                    <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="font-medium">Add Item</span>
                  </button>
                )
              ];
            })}
          </div>
        </div>
      )}
      {showAddItemForm && (
        <AddCategoryItemForm
          categoryId={selectedCategoryForAdd}
          onClose={() => setShowAddItemForm(false)}
          onSuccess={handleAddItemSuccess}
        />
      )}
      {showAddCategoryForm && (
        <AddCategoryForm
          onClose={() => setShowAddCategoryForm(false)}
          onSuccess={handleAddCategorySuccess}
        />
      )}
      {categoryToDelete && (
        <DeleteCategoryDialog
          categoryName={categoryToDelete.name}
          onConfirm={() => handleDeleteCategory(categoryToDelete.id)}
          onCancel={() => setCategoryToDelete(null)}
        />
      )}
    </div>
  );
};