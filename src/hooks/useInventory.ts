import { useState, useCallback } from 'react';
import type { Category } from '../types';

const STORAGE_KEY = 'inventory-app-data';

const DEFAULT_CATEGORIES: { id: string; name: string }[] = [
  { id: 'drinks', name: 'DRINKS' },
  { id: 'party', name: 'PARTY' },
  { id: 'cleaning', name: 'CLEANING' },
  { id: 'office', name: 'OFFICE SUPPLIES' },
];

interface MasterItems {
  [key: string]: string[];
}

interface WeekData {
  categories: Category[];
  savedAt: string;
}

interface AppState {
  masterItems: MasterItems;
  weeks: Record<string, WeekData>;
}

function getDefaultState(): AppState {
  return {
    masterItems: { drinks: [], party: [], cleaning: [], office: [] },
    weeks: {},
  };
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return getDefaultState();
}

function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function categoriesFromMaster(masterItems: MasterItems): Category[] {
  return DEFAULT_CATEGORIES.map((cat) => ({
    ...cat,
    items: (masterItems[cat.id] || []).map((name, i) => ({
      id: `master-${cat.id}-${i}`,
      name,
      inStock: 0,
      toOrder: 0,
    })),
  }));
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatLabel(d: Date): string {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return d.toLocaleDateString('en-US', options);
}

export function getCurrentWeekId(): string {
  return formatDate(getMonday(new Date()));
}

export function getNextWeekId(): string {
  const monday = getMonday(new Date());
  monday.setDate(monday.getDate() + 7);
  return formatDate(monday);
}

export function getWeekLabel(weekId: string): string {
  const d = new Date(weekId + 'T00:00:00');
  const end = new Date(d);
  end.setDate(end.getDate() + 6);
  return `${formatLabel(d)} – ${formatLabel(end)}`;
}

export function useInventory() {
  const [state, setState] = useState<AppState>(loadState);
  const [currentWeekId, setCurrentWeekId] = useState<string>(getCurrentWeekId());
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [loading] = useState(false);

  const currentWeekData = state.weeks[currentWeekId];
  const categories = currentWeekData
    ? currentWeekData.categories
    : categoriesFromMaster(state.masterItems);

  const allWeekIds = Array.from(
    new Set([...Object.keys(state.weeks), getCurrentWeekId()])
  )
    .sort()
    .reverse();

  const update = useCallback((updater: (prev: AppState) => AppState) => {
    setState((prev) => {
      const next = updater(prev);
      saveState(next);
      return next;
    });
  }, []);

  const switchWeek = useCallback((weekId: string) => {
    setCurrentWeekId(weekId);
    setIsViewingHistory(weekId !== getCurrentWeekId());
  }, []);

  const startNewWeek = useCallback(() => {
    const weekId = getCurrentWeekId();
    update((prev) => ({
      ...prev,
      weeks: {
        ...prev.weeks,
        [weekId]: {
          categories: categoriesFromMaster(prev.masterItems),
          savedAt: new Date().toISOString(),
        },
      },
    }));
    setCurrentWeekId(weekId);
    setIsViewingHistory(false);
  }, [update]);

  const addNextWeek = useCallback(() => {
    const nextId = getNextWeekId();
    update((prev) => ({
      ...prev,
      weeks: {
        ...prev.weeks,
        [nextId]: {
          categories: categoriesFromMaster(prev.masterItems),
          savedAt: new Date().toISOString(),
        },
      },
    }));
    setCurrentWeekId(nextId);
    setIsViewingHistory(false);
  }, [update]);

  const ensureWeek = useCallback((prev: AppState, weekId: string): AppState => {
    if (prev.weeks[weekId]) return prev;
    return {
      ...prev,
      weeks: {
        ...prev.weeks,
        [weekId]: {
          categories: categoriesFromMaster(prev.masterItems),
          savedAt: new Date().toISOString(),
        },
      },
    };
  }, []);

  const addItem = useCallback((categoryId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    update((prev) => {
      const existing = prev.masterItems[categoryId] || [];
      const newMaster = existing.includes(trimmed)
        ? existing
        : [...existing, trimmed];
      const newMasterItems = { ...prev.masterItems, [categoryId]: newMaster };

      const weekId = getCurrentWeekId();
      let newState = { ...prev, masterItems: newMasterItems };
      newState = ensureWeek(newState, weekId);

      const weekData = newState.weeks[weekId];
      const cats = weekData.categories.map((c) =>
        c.id === categoryId
          ? {
              ...c,
              items: [
                ...c.items,
                { id: Date.now().toString(), name: trimmed, inStock: 0, toOrder: 0 },
              ],
            }
          : c
      );
      return {
        ...newState,
        weeks: {
          ...newState.weeks,
          [weekId]: { ...weekData, categories: cats },
        },
      };
    });
  }, [update, ensureWeek]);

  const removeItem = useCallback((categoryId: string, itemId: string) => {
    update((prev) => {
      const weekId = getCurrentWeekId();
      const weekData = prev.weeks[weekId];
      if (!weekData) return prev;

      let removedName = '';
      const cats = weekData.categories.map((c) => {
        if (c.id !== categoryId) return c;
        const item = c.items.find((i) => i.id === itemId);
        if (item) removedName = item.name;
        return { ...c, items: c.items.filter((i) => i.id !== itemId) };
      });

      const newMasterItems = removedName
        ? {
            ...prev.masterItems,
            [categoryId]: (prev.masterItems[categoryId] || []).filter(
              (n) => n !== removedName
            ),
          }
        : prev.masterItems;

      return {
        ...prev,
        masterItems: newMasterItems,
        weeks: {
          ...prev.weeks,
          [weekId]: { ...weekData, categories: cats },
        },
      };
    });
  }, [update]);

  const updateStock = useCallback((categoryId: string, itemId: string, delta: number) => {
    update((prev) => {
      const weekId = getCurrentWeekId();
      let newState = ensureWeek(prev, weekId);
      const weekData = newState.weeks[weekId];
      const cats = weekData.categories.map((c) =>
        c.id === categoryId
          ? {
              ...c,
              items: c.items.map((i) =>
                i.id === itemId
                  ? { ...i, inStock: Math.max(0, i.inStock + delta) }
                  : i
              ),
            }
          : c
      );
      return {
        ...newState,
        weeks: {
          ...newState.weeks,
          [weekId]: { ...weekData, categories: cats },
        },
      };
    });
  }, [update, ensureWeek]);

  const updateOrder = useCallback((categoryId: string, itemId: string, delta: number) => {
    update((prev) => {
      const weekId = getCurrentWeekId();
      let newState = ensureWeek(prev, weekId);
      const weekData = newState.weeks[weekId];
      const cats = weekData.categories.map((c) =>
        c.id === categoryId
          ? {
              ...c,
              items: c.items.map((i) =>
                i.id === itemId
                  ? { ...i, toOrder: Math.max(0, i.toOrder + delta) }
                  : i
              ),
            }
          : c
      );
      return {
        ...newState,
        weeks: {
          ...newState.weeks,
          [weekId]: { ...weekData, categories: cats },
        },
      };
    });
  }, [update, ensureWeek]);

  return {
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
  };
}