import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GROUP_COLORS } from "@/lib/groups";
import { api } from "@/services/api";
import type { TargetGroup } from "@/types";
import { toast } from "sonner";
import { wailsError } from "@/lib/utils";

export function GroupManager({
  open,
  onOpenChange,
  groups,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  groups: TargetGroup[];
  onChanged: () => Promise<void> | void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(GROUP_COLORS[0]);
  const [editing, setEditing] = useState<TargetGroup | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setName("");
    setColor(GROUP_COLORS[0]);
    setEditing(null);
  }

  async function save() {
    setBusy(true);
    try {
      if (editing) await api.updateGroup(editing.id, name, color);
      else await api.createGroup(name, color);
      toast.success(editing ? "Group updated" : "Group created");
      reset();
      await onChanged();
    } catch (err) {
      toast.error(wailsError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Target groups</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">Create Home, VPS, cameras, work — whatever matches how you think about the list.</p>
          ) : (
            groups.map((g) => (
              <div key={g.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                <span className="h-3 w-3 rounded-full" style={{ background: g.color }} />
                <span className="flex-1 text-sm">{g.name}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setEditing(g);
                    setName(g.name);
                    setColor(g.color || GROUP_COLORS[0]);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-rose-400"
                  onClick={() =>
                    void api
                      .deleteGroup(g.id)
                      .then(async () => {
                        toast.success("Group deleted");
                        if (editing?.id === g.id) reset();
                        await onChanged();
                      })
                      .catch((err) => toast.error(wailsError(err)))
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
        <div className="grid gap-3 rounded-lg border border-border p-3">
          <div className="grid gap-2">
            <Label>{editing ? "Rename group" : "New group"}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="خانه / VPS / دوربین / کار" maxLength={40} />
          </div>
          <div className="flex flex-wrap gap-2">
            {GROUP_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="h-6 w-6 rounded-full border border-white/10"
                style={{ background: c, outline: color === c ? `2px solid ${c}` : undefined, outlineOffset: 2 }}
                aria-label={c}
              />
            ))}
          </div>
          <div className="flex justify-end gap-2">
            {editing ? (
              <Button type="button" variant="outline" onClick={reset}>
                Cancel
              </Button>
            ) : null}
            <Button type="button" disabled={busy || !name.trim()} onClick={() => void save()}>
              <Plus className="h-4 w-4" />
              {editing ? "Save group" : "Add group"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
