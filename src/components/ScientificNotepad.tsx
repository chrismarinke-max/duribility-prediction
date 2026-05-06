import { useState, useEffect } from 'react';
import { ClipboardList, Save, Trash2, Plus, Search, Tag, Clock, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Note {
  id: string;
  title: string;
  content: string;
  date: string;
  tag: string;
}

const ScientificNotepad = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('scientific_notes');
    if (saved) {
      const parsed = JSON.parse(saved);
      setNotes(parsed);
      if (parsed.length > 0) setActiveNoteId(parsed[0].id);
    } else {
      // Default initial note
      const initial = [{
        id: '1',
        title: 'New Research Note',
        content: 'Start documenting your findings here...',
        date: new Date().toLocaleDateString(),
        tag: 'Research'
      }];
      setNotes(initial);
      setActiveNoteId('1');
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (notes.length > 0) {
      localStorage.setItem('scientific_notes', JSON.stringify(notes));
    }
  }, [notes]);

  const activeNote = notes.find(n => n.id === activeNoteId) || notes[0];

  const handleUpdate = (updates: Partial<Note>) => {
    setNotes(notes.map(n => n.id === activeNoteId ? { ...n, ...updates } : n));
  };

  const createNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'Untitled Note',
      content: '',
      date: new Date().toLocaleDateString(),
      tag: 'General'
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
  };

  const deleteNote = (id: string) => {
    const filtered = notes.filter(n => n.id !== id);
    setNotes(filtered);
    if (activeNoteId === id && filtered.length > 0) setActiveNoteId(filtered[0].id);
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    n.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex gap-8 p-4 overflow-hidden">
      {/* Sidebar: Note List */}
      <div className="w-80 bg-white rounded-[40px] shadow-sm border border-slate-100 flex flex-col overflow-hidden shrink-0">
        <div className="p-8 border-b border-slate-100 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">MEMO & NOTES</h2>
            <button 
              onClick={createNote}
              className="w-10 h-10 bg-brand-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-brand-100 hover:scale-110 active:scale-95 transition-all"
            >
              <Plus size={20} />
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search notes..." 
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 ring-brand-200 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
          {filteredNotes.map((note) => (
            <button
              key={note.id}
              onClick={() => setActiveNoteId(note.id)}
              className={`w-full text-left p-6 rounded-3xl transition-all group relative overflow-hidden ${
                activeNoteId === note.id 
                ? 'bg-slate-900 text-white shadow-2xl scale-[1.02]' 
                : 'hover:bg-slate-50 text-slate-600'
              }`}
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                   <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                     activeNoteId === note.id ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-400'
                   }`}>
                     {note.tag}
                   </span>
                   <span className="text-[10px] opacity-40 font-bold">{note.date}</span>
                </div>
                <h4 className="font-black text-base mb-2 truncate">{note.title || 'Untitled'}</h4>
                <p className="text-xs opacity-60 line-clamp-2 leading-relaxed">
                  {note.content || 'No content yet...'}
                </p>
              </div>
              {activeNoteId === note.id && (
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                   <Trash2 
                    size={16} 
                    className="text-red-400 hover:text-red-500" 
                    onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }} 
                   />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 bg-white rounded-[40px] shadow-2xl border border-slate-100 flex flex-col relative overflow-hidden">
        {activeNote ? (
          <>
            <div className="p-10 border-b border-slate-50 flex items-center justify-between z-10 bg-white">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-4 mb-2">
                   <Tag size={14} className="text-brand-500" />
                   <select 
                    className="bg-slate-100 text-[10px] font-black uppercase tracking-widest border-none rounded-md px-2 py-1 outline-none cursor-pointer"
                    value={activeNote.tag}
                    onChange={(e) => handleUpdate({ tag: e.target.value })}
                   >
                     <option value="Research">Research</option>
                     <option value="General">General</option>
                     <option value="Calculations">Calculations</option>
                     <option value="Critical">Critical</option>
                   </select>
                </div>
                <input 
                  type="text" 
                  className="w-full text-4xl font-black text-slate-900 outline-none placeholder:text-slate-100"
                  placeholder="Note Title"
                  value={activeNote.title}
                  onChange={(e) => handleUpdate({ title: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-4">
                 <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Modified</span>
                    <span className="text-xs font-bold text-slate-900">{activeNote.date}</span>
                 </div>
                 <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-brand-600">
                    <FileText size={24} />
                 </div>
              </div>
            </div>

            <div className="flex-1 p-10 relative">
               <div className="absolute top-0 right-0 p-12 opacity-[0.02] text-brand-600 pointer-events-none">
                  <ClipboardList size={400} />
               </div>
               <textarea 
                className="w-full h-full bg-transparent resize-none outline-none text-xl text-slate-700 font-medium leading-loose placeholder:text-slate-100 z-10 relative"
                placeholder="Type your scientific insights here..."
                value={activeNote.content}
                onChange={(e) => handleUpdate({ content: e.target.value })}
               />
            </div>

            <div className="p-8 bg-slate-50/50 flex justify-end">
               <div className="flex items-center gap-3 text-brand-600 font-black text-xs uppercase tracking-widest">
                  <Save size={16} />
                  <span>Auto-saved to Cloud Storage</span>
               </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-10 space-y-8">
             <ClipboardList size={120} />
             <h2 className="text-4xl font-black tracking-widest">SELECT A NOTE</h2>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScientificNotepad;
