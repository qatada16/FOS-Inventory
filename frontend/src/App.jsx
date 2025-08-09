import React from 'react';
import { useState } from "react";
import { Header } from "./components/Header";
import { CategoryFilter } from "./components/CategoryFilter";
import axios from "axios";

export default function App() {
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [isExporting, setIsExporting] = useState(false);

  const handleCategorySelect = (categoryIds) => {
    setSelectedCategories(categoryIds);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/export/database`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `FOS_Inventory_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error('Error exporting data:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d1a1f] to-[#14262b] text-[#95CFAB] p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <Header />
        
        <div className="flex justify-center mb-8">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-[#95CFAB] to-[#6B8E8E] text-[#0d1a1f] font-bold hover:from-[#6B8E8E] hover:to-[#95CFAB] transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-[#0d1a1f]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Exporting...
              </span>
            ) : (
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export Database
              </span>
            )}
          </button>
        </div>
        
        <div className="mb-12">
          <CategoryFilter onCategorySelect={handleCategorySelect} />
        </div>
      </div>
    </div>
  );
}