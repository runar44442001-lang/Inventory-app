export interface Item {
  id: string;
  name: string;
  inStock: number;
  toOrder: number;
}

export interface Category {
  id: string;
  name: string;
  items: Item[];
}

export interface WeekEntry {
  weekId: string;
  weekLabel: string;
  categories: Category[];
  savedAt: string;
}