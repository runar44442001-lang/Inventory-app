import type { Category } from '../types';
import ItemRow from './ItemRow';
import AddItemForm from './AddItemForm';

interface CategoryCardProps {
  category: Category;
  isViewingHistory: boolean;
  onAddItem: (name: string) => void;
  onRemoveItem: (itemId: string) => void;
  onUpdateStock: (itemId: string, delta: number) => void;
  onUpdateOrder: (itemId: string, delta: number) => void;
}

export default function CategoryCard({
  category,
  isViewingHistory,
  onAddItem,
  onRemoveItem,
  onUpdateStock,
  onUpdateOrder,
}: CategoryCardProps) {
  return (
    <div className="category-card">
      <div className={`category-header header-${category.id}`}>
        <h2>{category.name}</h2>
        <span className="item-count">{category.items.length} items</span>
      </div>
      <div className="category-body">
        {category.items.length === 0 && (
          <p className="empty-message">No items yet. Add one below.</p>
        )}
        {category.items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            isViewingHistory={isViewingHistory}
            onStockChange={(delta) => onUpdateStock(item.id, delta)}
            onOrderChange={(delta) => onUpdateOrder(item.id, delta)}
            onDelete={() => onRemoveItem(item.id)}
          />
        ))}
        {!isViewingHistory && <AddItemForm onAdd={onAddItem} />}
      </div>
    </div>
  );
}