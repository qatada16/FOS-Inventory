import { useState } from "react";
import { EditCategoryItemForm } from "./EditCategoryItemForm";
import { ConfirmationDialog } from "./ConfirmationDialog";
import { ChildItemsModal } from "./ChildItemsModal";

export const CategoryItemCard = ({ item, categoryId, onUpdate, onDelete }) => {
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showChildItems, setShowChildItems] = useState(false);

  return (
    <>
      <div 
        className="p-4 rounded-xl bg-[#1a2f36] border border-[#6B8E8E]/30 
          text-[#95CFAB] hover:bg-[#6B8E8E]/20 hover:border-[#6B8E8E]/50 
          transition-all duration-300 hover:scale-105 relative cursor-pointer"
        onClick={() => setShowChildItems(true)}
      >
        <div className="absolute top-2 right-2 flex space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowEditForm(true);
            }}
            className="p-1 rounded-md bg-[#95CFAB]/10 hover:bg-[#95CFAB]/20 transition-colors"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }}
            className="p-1 rounded-md bg-[#F5A83C]/10 hover:bg-[#F5A83C]/20 transition-colors"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
        
        <h4 className="font-bold text-lg pr-6">{item.name}</h4>
        <div className="mt-2 space-y-1 text-sm">
          <p>Code: {item.code}</p>
          <p>Quantity: {item.quantity}</p>
        </div>
      </div>

      {showEditForm && (
        <EditCategoryItemForm
          item={item}
          categoryId={categoryId}
          onClose={() => setShowEditForm(false)}
          onSuccess={(updatedItem) => {
            onUpdate(updatedItem);
            setShowEditForm(false);
          }}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmationDialog
          message={`Are you sure you want to delete ${item.name}?`}
          onConfirm={() => {
            onDelete(item.id);
            setShowDeleteConfirm(false);
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {showChildItems && (
        <ChildItemsModal
          categoryId={categoryId}
          parentItem={item}
          onClose={() => setShowChildItems(false)}
        />
      )}
    </>
  );
};