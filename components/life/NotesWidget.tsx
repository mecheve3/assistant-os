"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatDateDMY } from "@/lib/utils";

interface Note {
  id: string;
  content: string;
  created_at: string;
}

interface Props {
  table: string;
  initialNotes: Note[];
  placeholder?: string;
  label?: string;
}

export function NotesWidget({
  table,
  initialNotes,
  placeholder = "Write a note…",
  label = "Notes",
}: Props) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!content.trim() || saving) return;
    setSaving(true);
    const { data } = await supabase
      .from(table)
      .insert({ content: content.trim() })
      .select()
      .single();
    if (data) setNotes((prev) => [data as Note, ...prev]);
    setContent("");
    setSaving(false);
  };

  const remove = async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await supabase.from(table).delete().eq("id", id);
  };

  return (
    <div className="bg-card border border-line rounded-lg p-4">
      <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-3">
        {label}
      </p>

      <textarea
        rows={4}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-raised border border-line rounded px-3 py-2 text-sm text-bright placeholder:text-muted/50 resize-none focus:outline-none focus:border-teal leading-relaxed mb-2"
      />
      <div className="flex justify-end mb-4">
        <button
          onClick={save}
          disabled={saving || !content.trim()}
          className="px-4 py-1.5 bg-teal text-base text-xs font-mono rounded disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {saving ? "Saving…" : "Save note"}
        </button>
      </div>

      {notes.length > 0 && (
        <div className="space-y-3 border-t border-line pt-3">
          {notes.map((note) => (
            <div key={note.id} className="group relative">
              <p className="text-[10px] font-mono text-muted/50 mb-1">
                {formatDateDMY(note.created_at.split("T")[0])}
              </p>
              <p className="text-sm text-bright/80 leading-relaxed whitespace-pre-wrap">
                {note.content}
              </p>
              <button
                onClick={() => remove(note.id)}
                className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 text-[10px] font-mono text-muted/40 hover:text-danger transition-all"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
