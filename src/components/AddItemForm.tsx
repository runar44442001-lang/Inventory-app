import { useState, type FormEvent } from 'react';

interface AddItemFormProps {
  onAdd: (name: string) => void;
}

export default function AddItemForm({ onAdd }: AddItemFormProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue('');
  };

  return (
    <form className="add-item-form" onSubmit={handleSubmit}>
      <input
        type="text"
        className="add-item-input"
        placeholder="Add item..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button type="submit" className="btn-add">Add</button>
    </form>
  );
}