"use client";

import { useState, useMemo } from "react";
import { Check, Plus, ArrowRight, X, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface GroceryItem {
  id: number;
  name: string;
  category: string;
  category_emoji: string | null;
  sort_order: number;
  is_permanent: boolean;
  is_default: boolean;
  checked: boolean;
}

interface Props {
  initialItems: GroceryItem[];
}

// ─── Single item row ──────────────────────────────────────────────────────────

function ItemRow({
  item,
  onToggle,
  onConvert,
  onRemove,
}: {
  item: GroceryItem;
  onToggle: (item: GroceryItem) => void;
  onConvert: (item: GroceryItem) => void;
  onRemove?: (item: GroceryItem) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [converting, setConverting] = useState(false);

  const handleConvert = async () => {
    setConverting(true);
    await onConvert(item);
    setConverting(false);
  };

  return (
    <div
      className="flex items-center gap-2 py-1 group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={() => onToggle(item)}
        className={[
          "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
          item.checked
            ? "border-teal bg-teal/20"
            : "border-line hover:border-teal/60",
        ].join(" ")}
      >
        {item.checked && <Check className="w-2.5 h-2.5 text-teal" />}
      </button>

      <span
        className={[
          "text-sm flex-1 leading-snug transition-colors",
          item.checked ? "text-muted/50 line-through" : "text-bright",
        ].join(" ")}
      >
        {item.name}
      </span>

      {hovered && (
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleConvert}
            disabled={converting}
            title="Crear tarea"
            className="flex items-center gap-0.5 text-[9px] font-mono text-muted/40 hover:text-teal transition-colors disabled:opacity-40"
          >
            <ArrowRight className="w-3 h-3" />
            tarea
          </button>
          {!item.is_permanent && onRemove && (
            <button
              onClick={() => onRemove(item)}
              className="text-muted/30 hover:text-danger transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Category section ─────────────────────────────────────────────────────────

function CategorySection({
  category,
  emoji,
  items,
  onToggle,
  onConvert,
  onRemove,
}: {
  category: string;
  emoji: string | null;
  items: GroceryItem[];
  onToggle: (item: GroceryItem) => void;
  onConvert: (item: GroceryItem) => void;
  onRemove: (item: GroceryItem) => void;
}) {
  const [open, setOpen] = useState(true);
  const needed = items.filter((i) => i.checked).length;

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 py-1.5 text-left group"
      >
        {open ? (
          <ChevronDown className="w-3 h-3 text-muted/50 shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted/50 shrink-0" />
        )}
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted">
          {emoji} {category}
        </span>
        {needed > 0 && (
          <span className="ml-auto text-[9px] font-mono text-teal/70">
            {needed}
          </span>
        )}
      </button>

      {open && (
        <div className="pl-5 border-l border-line/20">
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onToggle={onToggle}
              onConvert={onConvert}
              onRemove={!item.is_permanent ? onRemove : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── GroceriesWidget ─────────────────────────────────────────────────────────

export function GroceriesWidget({ initialItems }: Props) {
  const [items, setItems] = useState<GroceryItem[]>(initialItems);
  const [newItem, setNewItem] = useState("");
  const [adding, setAdding] = useState(false);
  const [lastTask, setLastTask] = useState<string | null>(null);

  // Group items by category, preserving category sort order
  const grouped = useMemo(() => {
    const map = new Map<string, { emoji: string | null; items: GroceryItem[] }>();
    for (const item of items) {
      if (!map.has(item.category)) {
        map.set(item.category, { emoji: item.category_emoji, items: [] });
      }
      map.get(item.category)!.items.push(item);
    }
    // Sort items within each category by sort_order
    for (const { items: catItems } of map.values()) {
      catItems.sort((a, b) => a.sort_order - b.sort_order);
    }
    return map;
  }, [items]);

  const totalNeeded = items.filter((i) => i.checked).length;

  const toggle = async (item: GroceryItem) => {
    const newVal = !item.checked;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, checked: newVal } : i)));
    await supabase.from("grocery_items").update({ checked: newVal }).eq("id", item.id);
  };

  const convertToTask = async (item: GroceryItem) => {
    const title = `Comprar ${item.name}`;
    await supabase.from("tasks").insert({
      title,
      status: "inbox",
      priority: "medium",
      area: "personal",
      life_area: "home_shopping",
    });
    // Uncheck the item since it's now tracked as a task
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, checked: false } : i)));
    await supabase.from("grocery_items").update({ checked: false }).eq("id", item.id);
    setLastTask(title);
    setTimeout(() => setLastTask(null), 3000);
  };

  const addTemp = async () => {
    const name = newItem.trim();
    if (!name || adding) return;
    setAdding(true);

    const { data } = await supabase
      .from("grocery_items")
      .insert({
        name,
        category: "Otros",
        category_emoji: "🛒",
        sort_order: 999,
        is_permanent: false,
        is_default: false,
        checked: true,
      })
      .select()
      .single();

    if (data) setItems((prev) => [...prev, data as GroceryItem]);
    setNewItem("");
    setAdding(false);
  };

  const removeTemp = async (item: GroceryItem) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    await supabase.from("grocery_items").delete().eq("id", item.id);
  };

  const clearChecked = async () => {
    const ids = items.filter((i) => i.checked && !i.is_permanent).map((i) => i.id);
    setItems((prev) =>
      prev.map((i) => (i.checked ? { ...i, checked: false } : i))
    );
    // Uncheck permanent items, delete temp items
    const permanentChecked = items.filter((i) => i.checked && i.is_permanent).map((i) => i.id);
    if (permanentChecked.length > 0) {
      await supabase.from("grocery_items").update({ checked: false }).in("id", permanentChecked);
    }
    if (ids.length > 0) {
      await supabase.from("grocery_items").delete().in("id", ids);
    }
  };

  return (
    <div className="bg-card border border-line rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted">
          Mercado
          {totalNeeded > 0 && (
            <span className="ml-2 text-teal/70">{totalNeeded} items</span>
          )}
        </p>
        {totalNeeded > 0 && (
          <button
            onClick={clearChecked}
            className="text-[9px] font-mono text-muted/40 hover:text-danger transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>

      {lastTask && (
        <div className="mb-3 px-2 py-1.5 bg-teal/10 border border-teal/20 rounded text-[10px] font-mono text-teal">
          ✓ Tarea creada: {lastTask}
        </div>
      )}

      {/* Add temporary item */}
      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTemp()}
          placeholder="Agregar item temporal…"
          className="flex-1 bg-raised border border-line rounded px-3 py-1.5 text-xs text-bright placeholder:text-muted/40 focus:outline-none focus:border-teal"
        />
        <button
          onClick={addTemp}
          disabled={adding || !newItem.trim()}
          className="px-2.5 py-1.5 bg-teal/20 text-teal rounded disabled:opacity-40 hover:bg-teal/30 transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Categories */}
      <div>
        {Array.from(grouped.entries()).map(([category, { emoji, items: catItems }]) => (
          <CategorySection
            key={category}
            category={category}
            emoji={emoji}
            items={catItems}
            onToggle={toggle}
            onConvert={convertToTask}
            onRemove={removeTemp}
          />
        ))}
      </div>
    </div>
  );
}
