"use client";

import { BLOCK_TYPE_LIST, BLOCK_TYPES, type BlockType } from "@/lib/blocks";

export function BlockPicker({
  onPick,
  onCancel,
}: {
  onPick: (type: BlockType) => void;
  onCancel: () => void;
}) {
  return (
    <div className="border-border rounded-md border p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium">Add a section</p>
        <button
          type="button"
          onClick={onCancel}
          className="text-text-muted hover:text-foreground pressable h-9 px-2 text-sm"
        >
          Cancel
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {BLOCK_TYPE_LIST.map((type) => {
          const meta = BLOCK_TYPES[type];
          const Icon = meta.icon;
          return (
            <button
              key={type}
              type="button"
              onClick={() => onPick(type)}
              className="border-border hover:border-primary/40 hover:bg-primary-tint pressable flex min-h-20 flex-col items-start gap-1.5 rounded-md border p-3 text-left"
            >
              <Icon className="text-primary size-5" aria-hidden="true" />
              <span className="text-sm font-medium">{meta.label}</span>
              <span className="text-text-muted text-xs">{meta.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
