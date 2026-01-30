"use client";

import { useState, useEffect, useCallback } from 'react';
import { X, Search, Music, Edit3, Trash2, Loader2, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOrg } from '@/contexts/OrgContext';
import { createBrowserClient } from '@supabase/ssr';

interface Song {
  id: string;
  title: string;
  artist: string;
  lyrics: string;
  source: string;
  created_at: string;
}

interface LibraryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSongDeleted?: () => void;
}

const SONGS_PER_PAGE = 50;

export function LibraryManager({ isOpen, onClose, onSongDeleted }: LibraryManagerProps) {
  const { org } = useOrg();
  const [songs, setSongs] = useState<Song[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [editForm, setEditForm] = useState({ title: '', artist: '', lyrics: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchSongs = useCallback(async () => {
    if (!org?.id) return;
    
    setIsLoading(true);
    try {
      // Get total count
      let countQuery = supabase
        .from('songs')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', org.id);
      
      if (searchQuery.trim()) {
        countQuery = countQuery.or(`title.ilike.%${searchQuery}%,artist.ilike.%${searchQuery}%`);
      }
      
      const { count } = await countQuery;
      setTotalCount(count || 0);

      // Get paginated songs
      const offset = (currentPage - 1) * SONGS_PER_PAGE;
      let query = supabase
        .from('songs')
        .select('id, title, artist, lyrics, source, created_at')
        .eq('organization_id', org.id)
        .order('title', { ascending: true })
        .range(offset, offset + SONGS_PER_PAGE - 1);
      
      if (searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,artist.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setSongs(data || []);
    } catch (error) {
      console.error('Error fetching songs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [org?.id, currentPage, searchQuery, supabase]);

  useEffect(() => {
    if (isOpen) {
      fetchSongs();
    }
  }, [isOpen, fetchSongs]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleEdit = (song: Song) => {
    setEditingSong(song);
    setEditForm({
      title: song.title,
      artist: song.artist,
      lyrics: song.lyrics,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingSong) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('songs')
        .update({
          title: editForm.title,
          artist: editForm.artist,
          lyrics: editForm.lyrics,
        })
        .eq('id', editingSong.id);
      
      if (error) throw error;
      
      setEditingSong(null);
      fetchSongs();
    } catch (error) {
      console.error('Error updating song:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (songId: string) => {
    try {
      const { error } = await supabase
        .from('songs')
        .delete()
        .eq('id', songId);
      
      if (error) throw error;
      
      setDeleteConfirm(null);
      fetchSongs();
      onSongDeleted?.();
    } catch (error) {
      console.error('Error deleting song:', error);
    }
  };

  const totalPages = Math.ceil(totalCount / SONGS_PER_PAGE);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-verse-surface border border-verse-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-verse-border">
          <div>
            <h2 className="text-lg font-bold text-verse-text flex items-center gap-2">
              <Music className="w-5 h-5 text-gold-400" />
              My Library
            </h2>
            <p className="text-xs text-verse-muted">
              {totalCount.toLocaleString()} song{totalCount !== 1 ? 's' : ''} in your library
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-verse-muted hover:text-verse-text rounded-lg hover:bg-verse-border transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-verse-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-verse-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title or artist..."
              className="w-full pl-10 pr-4 py-2 bg-verse-bg border border-verse-border rounded-lg text-verse-text placeholder:text-verse-muted focus:outline-none focus:border-gold-500 text-sm"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
            </div>
          ) : songs.length === 0 ? (
            <div className="text-center py-12">
              <Music className="w-12 h-12 text-verse-muted mx-auto mb-3" />
              <p className="text-verse-muted">
                {searchQuery ? 'No songs match your search' : 'Your library is empty'}
              </p>
              <p className="text-xs text-verse-subtle mt-1">
                Import songs using the upload button
              </p>
            </div>
          ) : editingSong ? (
            /* Edit Form */
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setEditingSong(null)}
                  className="p-1 text-verse-muted hover:text-verse-text"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="font-medium text-verse-text">Edit Song</h3>
              </div>
              
              <div>
                <label className="block text-xs text-verse-muted mb-1">Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-verse-bg border border-verse-border rounded-lg text-verse-text focus:outline-none focus:border-gold-500"
                />
              </div>
              
              <div>
                <label className="block text-xs text-verse-muted mb-1">Artist</label>
                <input
                  type="text"
                  value={editForm.artist}
                  onChange={(e) => setEditForm(f => ({ ...f, artist: e.target.value }))}
                  className="w-full px-3 py-2 bg-verse-bg border border-verse-border rounded-lg text-verse-text focus:outline-none focus:border-gold-500"
                />
              </div>
              
              <div>
                <label className="block text-xs text-verse-muted mb-1">
                  Lyrics (separate sections with blank lines)
                </label>
                <textarea
                  value={editForm.lyrics}
                  onChange={(e) => setEditForm(f => ({ ...f, lyrics: e.target.value }))}
                  rows={12}
                  className="w-full px-3 py-2 bg-verse-bg border border-verse-border rounded-lg text-verse-text focus:outline-none focus:border-gold-500 font-mono text-sm resize-none"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setEditingSong(null)}
                  className="px-4 py-2 text-verse-muted hover:text-verse-text rounded-lg hover:bg-verse-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-verse-bg font-medium rounded-lg hover:bg-gold-400 transition-colors disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            /* Song List */
            <div className="space-y-1">
              {songs.map((song) => (
                <div
                  key={song.id}
                  className="flex items-center gap-3 p-3 bg-verse-bg border border-verse-border rounded-lg hover:border-verse-muted transition-colors group"
                >
                  <Music className="w-4 h-4 text-gold-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-verse-text truncate">{song.title}</p>
                    <p className="text-xs text-verse-muted truncate">{song.artist}</p>
                  </div>
                  <span className="text-xs text-verse-subtle px-2 py-0.5 bg-verse-border rounded">
                    {song.lyrics.split('\n\n').filter(Boolean).length} sections
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(song)}
                      className="p-1.5 text-verse-muted hover:text-gold-400 rounded-lg hover:bg-verse-border transition-colors"
                      title="Edit song"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {deleteConfirm === song.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(song.id)}
                          className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-2 py-1 text-xs text-verse-muted hover:text-verse-text rounded hover:bg-verse-border transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(song.id)}
                        className="p-1.5 text-verse-muted hover:text-red-400 rounded-lg hover:bg-verse-border transition-colors"
                        title="Delete song"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!editingSong && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-verse-border bg-verse-bg/50">
            <p className="text-xs text-verse-muted">
              Showing {((currentPage - 1) * SONGS_PER_PAGE) + 1} - {Math.min(currentPage * SONGS_PER_PAGE, totalCount)} of {totalCount.toLocaleString()}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 text-verse-muted hover:text-verse-text rounded-lg hover:bg-verse-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-verse-muted px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 text-verse-muted hover:text-verse-text rounded-lg hover:bg-verse-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
