import { useInventory } from './hooks/useInventory';
import CategoryCard from './components/CategoryCard';
import WeekSelector from './components/WeekSelector';

export default function App() {
  const {
    categories,
    currentWeekId,
    allWeekIds,
    isViewingHistory,
    loading,
    switchWeek,
    startNewWeek,
    addNextWeek,
    addItem,
    removeItem,
    updateStock,
    updateOrder,
  } = useInventory();

  if (loading) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>Location Inventory</h1>
          <p>Loading...</p>
        </header>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Location Inventory</h1>
        <WeekSelector
          allWeekIds={allWeekIds}
          currentWeekId={currentWeekId}
          isViewingHistory={isViewingHistory}
          onSelect={switchWeek}
          onNewWeek={startNewWeek}
          onAddNextWeek={addNextWeek}
        />
      </header>
      <main className="grid">
        {categories.map((cat) => (
          <CategoryCard
            key={cat.id}
            category={cat}
            isViewingHistory={isViewingHistory}
            onAddItem={(name) => addItem(cat.id, name)}
            onRemoveItem={(itemId) => removeItem(cat.id, itemId)}
            onUpdateStock={(itemId, delta) => updateStock(cat.id, itemId, delta)}
            onUpdateOrder={(itemId, delta) => updateOrder(cat.id, itemId, delta)}
          />
        ))}
      </main>
    </div>
  );
}