"use client";

import { useState, useRef, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  GripVertical, 
  Plus, 
  Trash2, 
  BookOpen,
  Edit3,
  Check,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Session {
  id: string;
  title: string;
  date: string;
  duration_minutes: number;
  summary: string;
  scriptures: any[];
  key_points: string[];
  transcript: string;
  version: number;
  status: 'draft' | 'published';
}

interface SessionEditorProps {
  session: Session;
  onChange: (updates: Partial<Session>) => void;
}

// Auto-resize textarea hook - returns ref AND whether at max height
function useAutoResize(value: string, minHeight = 150, maxHeight = 500) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isAtMax, setIsAtMax] = useState(false);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to measure true scrollHeight
    textarea.style.height = 'auto';
    
    const scrollHeight = textarea.scrollHeight;
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    
    textarea.style.height = `${newHeight}px`;
    setIsAtMax(scrollHeight > maxHeight);
  }, [value, minHeight, maxHeight]);

  return { ref: textareaRef, isAtMax };
}

function SortableKeyPoint({
  id,
  index,
  point,
  onEdit,
  onDelete,
}: {
  id: string;
  index: number;
  point: string;
  onEdit: (index: number, value: string) => void;
  onDelete: (index: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(point);
  const { ref: editRef, isAtMax: editAtMax } = useAutoResize(editValue, 60, 200);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSave = () => {
    onEdit(index, editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(point);
    setIsEditing(false);
  };

  useEffect(() => {
    setEditValue(point);
  }, [point]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-start gap-3 p-4 bg-verse-bg border border-verse-border rounded-xl transition-all",
        isDragging && "opacity-50 shadow-xl border-gold-500",
        !isDragging && "hover:border-verse-muted"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-1 p-1 rounded text-verse-muted hover:text-verse-text cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <span className="mt-1 text-lg font-bold text-gold-500 min-w-[24px]">
        {index + 1}.
      </span>

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              ref={editRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className={cn(
                "w-full px-3 py-2 bg-verse-surface border border-gold-500 rounded-lg text-verse-text resize-none focus:outline-none",
                editAtMax ? "overflow-y-auto" : "overflow-hidden"
              )}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-1 px-3 py-1.5 bg-gold-500 text-verse-bg rounded-lg text-sm font-medium hover:bg-gold-400 transition-colors"
              >
                <Check className="w-3 h-3" />
                Save
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-1 px-3 py-1.5 bg-verse-border text-verse-text rounded-lg text-sm hover:bg-verse-muted/20 transition-colors"
              >
                <X className="w-3 h-3" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p
            onClick={() => setIsEditing(true)}
            className="text-verse-text leading-relaxed cursor-text hover:bg-verse-surface/50 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
          >
            {point}
          </p>
        )}
      </div>

      {!isEditing && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 rounded-lg text-verse-muted hover:text-verse-text hover:bg-verse-surface transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(index)}
            className="p-1.5 rounded-lg text-verse-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export function SessionEditor({ session, onChange }: SessionEditorProps) {
  const [newPoint, setNewPoint] = useState('');
  
  // Auto-resize with conditional scrollbar
  const { ref: summaryRef, isAtMax: summaryAtMax } = useAutoResize(session.summary, 150, 500);
  const { ref: newPointRef, isAtMax: newPointAtMax } = useAutoResize(newPoint, 60, 150);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = session.key_points.findIndex((_, i) => `point-${i}` === active.id);
      const newIndex = session.key_points.findIndex((_, i) => `point-${i}` === over.id);

      onChange({
        key_points: arrayMove(session.key_points, oldIndex, newIndex),
      });
    }
  };

  const handleEditPoint = (index: number, value: string) => {
    const updated = [...session.key_points];
    updated[index] = value;
    onChange({ key_points: updated });
  };

  const handleDeletePoint = (index: number) => {
    onChange({
      key_points: session.key_points.filter((_, i) => i !== index),
    });
  };

  const handleAddPoint = () => {
    if (!newPoint.trim()) return;
    onChange({
      key_points: [...session.key_points, newPoint.trim()],
    });
    setNewPoint('');
  };

  const handleDeleteScripture = (index: number) => {
    onChange({
      scriptures: session.scriptures.filter((_, i) => i !== index),
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <section>
        <input
          type="text"
          value={session.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className="w-full text-3xl font-display font-bold text-verse-text bg-transparent border-none focus:outline-none placeholder:text-verse-muted"
          placeholder="Session Title"
        />
        <div className="flex items-center gap-4 mt-2 text-sm text-verse-muted">
          <span>{formatDate(session.date)}</span>
          <span>•</span>
          <span>{session.duration_minutes} minutes</span>
          <span>•</span>
          <span>{session.scriptures.length} scriptures</span>
        </div>
      </section>

      {/* Summary - Conditional scrollbar */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-verse-text">Summary</h2>
        <div className="relative">
          <textarea
            ref={summaryRef}
            value={session.summary}
            onChange={(e) => onChange({ summary: e.target.value })}
            className={cn(
              "w-full px-4 py-3 bg-verse-surface border border-verse-border rounded-xl text-verse-text placeholder:text-verse-muted focus:outline-none focus:border-gold-500 resize-none leading-relaxed",
              summaryAtMax ? "overflow-y-auto" : "overflow-hidden"
            )}
            placeholder="Enter the sermon summary..."
            style={{ minHeight: '150px' }}
          />
          <div className="absolute bottom-3 right-3 text-xs text-verse-muted">
            {session.summary.length} characters
          </div>
        </div>
      </section>

      {/* Key Points */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-verse-text">
            Key Points ({session.key_points.length})
          </h2>
          <span className="text-xs text-verse-muted">Drag to reorder</span>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={session.key_points.map((_, i) => `point-${i}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {session.key_points.map((point, index) => (
                <SortableKeyPoint
                  key={`point-${index}`}
                  id={`point-${index}`}
                  index={index}
                  point={point}
                  onEdit={handleEditPoint}
                  onDelete={handleDeletePoint}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Add New Point */}
        <div className="flex items-start gap-3 p-4 bg-verse-bg/50 border border-dashed border-verse-border rounded-xl">
          <Plus className="w-5 h-5 text-verse-muted mt-2" />
          <div className="flex-1">
            <textarea
              ref={newPointRef}
              value={newPoint}
              onChange={(e) => setNewPoint(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddPoint();
                }
              }}
              className={cn(
                "w-full px-3 py-2 bg-verse-surface border border-verse-border rounded-lg text-verse-text placeholder:text-verse-muted focus:outline-none focus:border-gold-500 resize-none",
                newPointAtMax ? "overflow-y-auto" : "overflow-hidden"
              )}
              placeholder="Add a new key point... (Enter to add)"
              style={{ minHeight: '60px' }}
            />
          </div>
          <button
            onClick={handleAddPoint}
            disabled={!newPoint.trim()}
            className="px-4 py-2 bg-gold-500 text-verse-bg rounded-lg font-medium hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
        </div>
      </section>

      {/* Scriptures */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-verse-text flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-gold-500" />
          Scripture References ({session.scriptures.length})
        </h2>

        <div className="grid gap-3">
          {session.scriptures.map((scripture, index) => (
            <div
              key={index}
              className="group flex items-start gap-4 p-4 bg-verse-surface border border-verse-border rounded-xl hover:border-verse-muted transition-colors"
            >
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gold-400">
                  {scripture.reference}
                </h4>
                {scripture.verse_text && (
                  <p className="mt-1 text-sm text-verse-muted italic line-clamp-2">
                    "{scripture.verse_text}"
                  </p>
                )}
              </div>
              <button
                onClick={() => handleDeleteScripture(index)}
                className="p-1.5 rounded-lg text-verse-muted opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {session.scriptures.length === 0 && (
          <div className="text-center py-8 text-verse-muted">
            No scriptures referenced.
          </div>
        )}
      </section>

      {/* Transcript */}
      {session.transcript && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-verse-text">Original Transcript</h2>
          <div className="p-4 bg-verse-surface border border-verse-border rounded-xl max-h-[300px] overflow-y-auto">
            <p className="text-sm text-verse-muted leading-relaxed whitespace-pre-wrap">
              {session.transcript}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
