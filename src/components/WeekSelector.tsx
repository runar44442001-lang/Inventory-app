import { getWeekLabel, getCurrentWeekId } from '../hooks/useInventory';

interface WeekSelectorProps {
  allWeekIds: string[];
  currentWeekId: string;
  isViewingHistory: boolean;
  onSelect: (weekId: string) => void;
  onNewWeek: () => void;
  onAddNextWeek: () => void;
}

export default function WeekSelector({
  allWeekIds,
  currentWeekId,
  isViewingHistory,
  onSelect,
  onNewWeek,
  onAddNextWeek,
}: WeekSelectorProps) {
  const todayWeekId = getCurrentWeekId();

  return (
    <div className="week-selector">
      <div className="week-nav">
        <select
          className="week-dropdown"
          value={currentWeekId}
          onChange={(e) => onSelect(e.target.value)}
        >
          {allWeekIds.map((id) => (
            <option key={id} value={id}>
              {getWeekLabel(id)} {id === todayWeekId ? '(Current)' : ''}
            </option>
          ))}
        </select>
        <button className="btn-next-week" onClick={onAddNextWeek}>
          + Next Week
        </button>
        {isViewingHistory && (
          <button className="btn-current-week" onClick={onNewWeek}>
            Go to Current Week
          </button>
        )}
      </div>
      {isViewingHistory && (
        <span className="history-badge">Viewing past week</span>
      )}
    </div>
  );
}