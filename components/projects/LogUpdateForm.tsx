"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { todayISO } from "@/lib/utils";

interface LogUpdateFormProps {
  projectId: string;
}

export function LogUpdateForm({ projectId }: LogUpdateFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    what_i_did: "",
    what_is_blocked: "",
    next_action: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.what_i_did.trim()) return;

    setSaving(true);
    const { error } = await supabase.from("project_updates").insert({
      project_id: projectId,
      date: todayISO(),
      what_i_did: form.what_i_did.trim(),
      what_is_blocked: form.what_is_blocked.trim() || null,
      next_action: form.next_action.trim() || null,
    });

    setSaving(false);
    if (!error) {
      setForm({ what_i_did: "", what_is_blocked: "", next_action: "" });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    }
  };

  return (
    <div className="border border-line rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-raised border-b border-line">
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-danger/70" />
          <div className="w-2 h-2 rounded-full bg-warn/70" />
          <div className="w-2 h-2 rounded-full bg-teal/70" />
        </div>
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted ml-1">
          log update — today
        </p>
        {saved && (
          <div className="ml-auto flex items-center gap-1.5 text-teal text-xs font-mono">
            <CheckCircle className="w-3.5 h-3.5" />
            Update logged
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-base p-4 space-y-4">
        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest text-muted block mb-1.5">
            &gt; what_i_did <span className="text-danger">*</span>
          </label>
          <textarea
            rows={3}
            value={form.what_i_did}
            onChange={(e) => setForm((f) => ({ ...f, what_i_did: e.target.value }))}
            placeholder="What did you work on today?"
            required
            className="w-full bg-raised border border-line rounded px-3 py-2 text-sm text-bright placeholder:text-muted/60 resize-none focus:outline-none focus:border-teal transition-colors font-sans leading-relaxed"
          />
        </div>

        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest text-muted block mb-1.5">
            &gt; what_is_blocked
          </label>
          <textarea
            rows={2}
            value={form.what_is_blocked}
            onChange={(e) => setForm((f) => ({ ...f, what_is_blocked: e.target.value }))}
            placeholder="Any blockers? Leave empty if none."
            className="w-full bg-raised border border-line rounded px-3 py-2 text-sm text-bright placeholder:text-muted/60 resize-none focus:outline-none focus:border-warn transition-colors font-sans leading-relaxed"
          />
        </div>

        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest text-muted block mb-1.5">
            &gt; next_action
          </label>
          <input
            type="text"
            value={form.next_action}
            onChange={(e) => setForm((f) => ({ ...f, next_action: e.target.value }))}
            placeholder="The single most important next step."
            className="w-full bg-raised border border-line rounded px-3 py-2 text-sm text-bright placeholder:text-muted/60 focus:outline-none focus:border-teal transition-colors font-mono"
          />
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={!form.what_i_did.trim() || saving}
            className="px-5 py-2 bg-teal text-base text-sm font-mono font-semibold rounded disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {saving ? "Saving…" : "$ log update"}
          </button>
        </div>
      </form>
    </div>
  );
}
