import { useState, useEffect, useCallback, useRef } from 'react';
import type { Category } from '../types';

const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

async function fetchState() {
  const res = await fetch(`${API_BASE}/api/state`);
  if (!res.ok) throw new Error('Failed to fetch state');
  return res.json();
}

async function apiAddItem(categoryId: string, name: string) {
  const res = await fetch(`${API_BASE}/api/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ categoryId, name }),
  });
  if (!res.ok) throw new Error('Failed to add item');
  return res.json();
}

async function apiRemoveItem(categoryId: string, itemId: string) {
  const res = await fetch(`${API_BASE}/api/items/${categoryId}/${itemId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to remove item');
  return res.json();
}

async function apiUpdateStock(categoryId: string, itemId: string, delta: number) {
  const res = await fetch(`${API_BASE}/api/items/${categoryId}/${itemId}/stock`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delta }),
  });
  if (!res.ok) throw new Error('Failed to update stock');
  return res.json();
}

async function apiUpdateOrder(categoryId: string, itemId: string, delta: number) {
  const res = await fetch(`${API_BASE}/api/items/${categoryId}/${itemId}/order`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delta }),
  });
  if (!res.ok) throw new Error('Failed to update order');
  return res.json();
}

async function apiStartNewWeek() {
  const res = await fetch(`${API_BASE}/api/weeks/new`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to start new week');
  return res.json();
}

async function apiAddNextWeek() {
  const res = await fetch(`${API_BASE}/api/weeks/next`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to add next week');
  return res.json();
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentWeekId, setCurrentWeekId] = useState<string>(getCurrentWeekId());
  const [allWeekIds, setAllWeekIds] = useState<string[]>([]);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<number | null>(null);

  const loadState = useCallback(async () => {
    try {
      const data = await fetchState();
      setCategories(data.categories);
      setCurrentWeekId(data.currentWeekId);
      setAllWeekIds(data.allWeekIds);
    } catch (err) {
      console.error('Failed to load state:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  useEffect(() => {
    pollRef.current = window.setInterval(() => {
      if (!isViewingHistory) {
        loadState();
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isViewingHistory, loadState]);

  const switchWeek = useCallback((weekId: string) => {
    setCurrentWeekId(weekId);
    setIsViewingHistory(weekId !== getCurrentWeekId());
    fetchState().then((data) => {
      const weekData = data.weeks?.[weekId];
      if (weekData) {
        setCategories(weekData.categories);
      } else {
        setCategories([]);
      }
    }).catch(console.error);
  }, []);

  const startNewWeek = useCallback(async () => {
    try {
      const data = await apiStartNewWeek();
      setCategories(data.categories);
      setCurrentWeekId(data.currentWeekId);
      setAllWeekIds(data.allWeekIds);
      setIsViewingHistory(false);
    } catch (err) {
      console.error('Failed to start new week:', err);
    }
  }, []);

  const addNextWeek = useCallback(async () => {
    try {
      const data = await apiAddNextWeek();
      setCategories(data.categories);
      setCurrentWeekId(data.currentWeekId);
      setAllWeekIds(data.allWeekIds);
      setIsViewingHistory(false);
    } catch (err) {
      console.error('Failed to add next week:', err);
    }
  }, []);

  const addItem = useCallback(async (categoryId: string, name: string) => {
    try {
      const data = await apiAddItem(categoryId, name);
      setCategories(data.categories);
      setAllWeekIds(data.allWeekIds);
    } catch (err) {
      console.error('Failed to add item:', err);
    }
  }, []);

  const removeItem = useCallback(async (categoryId: string, itemId: string) => {
    try {
      const data = await apiRemoveItem(categoryId, itemId);
      setCategories(data.categories);
    } catch (err) {
      console.error('Failed to remove item:', err);
    }
  }, []);

  const updateStock = useCallback(async (categoryId: string, itemId: string, delta: number) => {
    try {
      const data = await apiUpdateStock(categoryId, itemId, delta);
      setCategories(data.categories);
    } catch (err) {
      console.error('Failed to update stock:', err);
    }
  }, []);

  const updateOrder = useCallback(async (categoryId: string, itemId: string, delta: number) => {
    try {
      const data = await apiUpdateOrder(categoryId, itemId, delta);
      setCategories(data.categories);
    } catch (err) {
      console.error('Failed to update order:', err);
    }
  }, []);

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