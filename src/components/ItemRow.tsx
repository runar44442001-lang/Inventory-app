import type { Item } from '../types';

interface ItemRowProps {
  item: Item;
  isViewingHistory: boolean;
  onStockChange: (delta: number) => void;
  onOrderChange: (delta: number) => void;
  onDelete: () => void;
}

export default function ItemRow({ item, isViewingHistory, onStockChange, onOrderChange, onDelete }: ItemRowProps) {
  return (
    <div className="item-row">
      <span className="item-name">{item.name}</span>
      <div className="item-controls">
        <div className="control-group">
          <span className="control-label">In Stock</span>
          <div className="counter">
            <button className="btn-counter" disabled={isViewingHistory} onClick={() => onStockChange(-1)}>-</button>
            <span className="counter-value">{item.inStock}</span>
            <button className="btn-counter" disabled={isViewingHistory} onClick={() => onStockChange(1)}>+</button>
          </div>
        </div>
        <div className="control-group">
          <span className="control-label">To Order</span>
          <div className="counter">
            <button className="btn-counter" disabled={isViewingHistory} onClick={() => onOrderChange(-1)}>-</button>
            <span className="counter-value">{item.toOrder}</span>
            <button className="btn-counter" disabled={isViewingHistory} onClick={() => onOrderChange(1)}>+</button>
          </div>
        </div>
        {!isViewingHistory && (
          <button className="btn-delete" onClick={onDelete} title="Remove item">&times;</button>
        )}
      </div>
    </div>
  );
}