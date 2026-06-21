"use client";

import { useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ShoppingItem {
  id: string;
  item: string;
  bought: boolean;
  created_at: string;
}

interface Props {
  initialItems: ShoppingItem[];
}

export function ShoppingListWidget({ initialItems }: Props) {
  const [items, setItems] = useState<ShoppingItem[]>(initialItems);
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);

  const add = async () => {
    if (!text.trim() || adding) return;
    setAdding(true);
    const { data } = await supabase
      .from("shopping_list")
      .insert({ item: text.trim(), bought: false })
      .select()
      .single();
    if (data) setItems((prev) => [data as ShoppingItem, ...prev]);
    setText("");
    setAdding(false);
  };

  const toggleBought = async (item: ShoppingItem) => {
    const newVal = !item.bought;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, bought: newVal } : i)));
    await supabase.from("shopping_list").update({ bought: newVal }).eq("id", item.id);
  };

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await supabase.from("shopping_list").delete().eq("id", id);
  };

  const pending = items.filter((i) => !i.bought);
  const bought = items.filter((i) => i.bought);

  return (
    <div className="bg-card border border-line rounded-lg p-4">
      <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-3">
        Shopping List
        <span className="ml-2 text-muted/50">{pending.length} remaining</span>
      </p>

      {/* Add item */}
      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add item… (Enter)"
          className="flex-1 bg-raised border border-line rounded px-3 py-1.5 text-sm text-bright placeholder:text-muted/50 focus:outline-none focus:border-teal"
        />
        <button
          onClick={add}
          disabled={adding || !text.trim()}
          className="px-3 py-1.5 bg-teal text-base text-xs font-mono rounded disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
        >
          Add
        </button>
      </div>

      {/* Pending */}
      {pending.length === 0 && bought.length === 0 && (
        <p className="text-xs text-muted/50 font-mono text-center py-4">List is empty.</p>
      )}

      <div className="space-y-1">
        {pending.map((item) => (
          <div key={item.id} className="flex items-center gap-2 py-1.5 group border-b border-line/30 last:border-0">
            <button
              onClick={() => toggleBought(item)}
              className="w-4 h-4 rounded border border-line hover:border-teal flex items-center justify-center shrink-0 transition-colors"
            >
              <Check className="w-2.5 h-2.5 text-teal opacity-0 hover:opacity-100" />
            </button>
            <span className="text-sm text-bright flex-1">{item.item}</span>
            <button
              onClick={() => remove(item.id)}
              className="opacity-0 group-hover:opacity-100 text-muted/40 hover:text-danger transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Bought */}
      {bought.length > 0 && (
        <div className="mt-3 pt-3 border-t border-line/30">
          <p className="text-[9px] font-mono text-muted/40 uppercase tracking-wider mb-2">Bought</p>
          <div className="space-y-1">
            {bought.map((item) => (
              <div key={item.id} className="flex items-center gap-2 py-1 group">
                <button
                  onClick={() => toggleBought(item)}
                  className="w-4 h-4 rounded border border-teal bg-teal/20 flex items-center justify-center shrink-0"
                >
                  <Check className="w-2.5 h-2.5 text-teal" />
                </button>
                <span className="text-sm text-muted/50 line-through flex-1">{item.item}</span>
                <button
                  onClick={() => remove(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted/40 hover:text-danger transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
