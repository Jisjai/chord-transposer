import { useState, useEffect, useCallback } from "react";
import ChordDiagram from "./ChordDiagram.jsx";
import Auth from "./Auth.jsx";
import { supabase } from "./supabase.js";

// ── Music Theory Core ──────────────────────────────────────────
const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const FLAT_KEYS = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm'];
const ALL_KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

function parseChord(chord) {
  const match = chord.match(/^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/);
  if (!match) return null;
  return { root: match[1], suffix: match[2], bass: match[3] };
}

function transposeNote(note, semitones, useFlatScale) {
  const scale = useFlatScale ? FLATS : SHARPS;
  const index = SHARPS.indexOf(note) !== -1 ? SHARPS.indexOf(note) : FLATS.indexOf(note);
  if (index === -1) return note;
  return scale[((index + semitones) % 12 + 12) % 12];
}

function transposeChord(chord, semitones, targetKey) {
  const parsed = parseChord(chord);
  if (!parsed) return chord;
  const flat = FLAT_KEYS.includes(targetKey);
  const newRoot = transposeNote(parsed.root, semitones, flat);
  const newBass = parsed.bass ? transposeNote(parsed.bass, semitones, flat) : null;
  return newRoot + parsed.suffix + (newBass ? '/' + newBass : '');
}

function keyToSemitone(key) {
  const root = key.match(/^[A-G][#b]?/)?.[0];
  const idx = SHARPS.indexOf(root) !== -1 ? SHARPS.indexOf(root) : FLATS.indexOf(root);
  return idx;
}

function getSemitonesBetweenKeys(fromKey, toKey) {
  const from = keyToSemitone(fromKey);
  const to   = keyToSemitone(toKey);
  if (from === -1 || to === -1) return 0;
  return ((to - from) + 12) % 12;
}

const CHORD_TOKEN_REGEX = /^[A-G][#b]?(?:maj|min|m|M|sus|aug|dim|add|no)?(?:\d+)?(?:\/[A-G][#b]?)?$/;

function isChordLine(line) {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  const chordCount = tokens.filter(t => CHORD_TOKEN_REGEX.test(t)).length;
  return chordCount / tokens.length > 0.5;
}

function transposeText(text, semitones, targetKey) {
  if (semitones === 0) return text;
  return text.split('\n').map(line => {
    if (!isChordLine(line)) return line;
    return line.replace(/[A-G][#b]?(?:maj|min|m|M|sus|aug|dim|add|no)?(?:\d+)?(?:\/[A-G][#b]?)?/g,
      match => transposeChord(match, semitones, targetKey));
  }).join('\n');
}

// ── Auto-detect key ────────────────────────────────────────────
// Scores each possible key against the chords found in the text.
// The key whose scale contains the most of the song's chords wins.

const KEY_PROFILES = {
  'C': ['C','Dm','Em','F','G','Am','Bdim'],
  'C#':['C#','D#m','Fm','F#','G#','A#m','Cdim'],
  'D': ['D','Em','F#m','G','A','Bm','C#dim'],
  'Eb':['Eb','Fm','Gm','Ab','Bb','Cm','Ddim'],
  'E': ['E','F#m','G#m','A','B','C#m','D#dim'],
  'F': ['F','Gm','Am','Bb','C','Dm','Edim'],
  'F#':['F#','G#m','A#m','B','C#','D#m','Fdim'],
  'G': ['G','Am','Bm','C','D','Em','F#dim'],
  'Ab':['Ab','Bbm','Cm','Db','Eb','Fm','Gdim'],
  'A': ['A','Bm','C#m','D','E','F#m','G#dim'],
  'Bb':['Bb','Cm','Dm','Eb','F','Gm','Adim'],
  'B': ['B','C#m','D#m','E','F#','G#m','A#dim'],
};

function detectKey(text) {
  // Collect all chord tokens from chord lines
  const chords = [];
  text.split('\n').forEach(line => {
    if (!isChordLine(line)) return;
    const matches = line.match(/[A-G][#b]?(?:maj|min|m|M|sus|aug|dim|add|no)?(?:\d+)?(?:\/[A-G][#b]?)?/g);
    if (matches) chords.push(...matches);
  });
  if (!chords.length) return null;

  // Strip suffixes to get just root notes
  const roots = chords.map(c => {
    const m = c.match(/^([A-G][#b]?)/);
    return m ? m[1] : null;
  }).filter(Boolean);

  // Score each key
  let bestKey = 'C', bestScore = -1;
  Object.entries(KEY_PROFILES).forEach(([key, scale]) => {
    // Scale roots only
    const scaleRoots = scale.map(c => c.match(/^([A-G][#b]?)/)?.[1]);
    const score = roots.filter(r => scaleRoots.includes(r)).length;
    if (score > bestScore) { bestScore = score; bestKey = key; }
  });
  return bestKey;
}
// Chord lines: each chord token is a clickable button that opens
// the diagram modal. Lyric lines are plain white text.
const CHORD_SPLIT_REGEX = /([A-G][#b]?(?:maj|min|m|M|sus|aug|dim|add|no)?(?:\d+)?(?:\/[A-G][#b]?)?)/g;

function ColoredSheet({ text, onChordClick }) {
  if (!text) return null;
  return (
    <div style={{ fontFamily: "'Courier New', monospace", fontSize: 13, lineHeight: 1.9, whiteSpace: 'pre' }}>
      {text.split('\n').map((line, i) => {
        if (!isChordLine(line)) {
          return <div key={i} style={{ color: '#e8e0d0' }}>{line || '\u00A0'}</div>;
        }
        // Split line into chord tokens and spaces, render chords as buttons
        const parts = line.split(CHORD_SPLIT_REGEX);
        return (
          <div key={i}>
            {parts.map((part, j) => {
              if (CHORD_TOKEN_REGEX.test(part)) {
                return (
                  <button key={j} onClick={() => onChordClick(part)} style={{
                    background: 'transparent', border: 'none', padding: 0,
                    color: '#c8a84b', cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 'inherit', textDecoration: 'underline dotted',
                    textUnderlineOffset: 3,
                  }}>{part}</button>
                );
              }
              return <span key={j}>{part}</span>;
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── AI Extractor ───────────────────────────────────────────────
// NOTE: In the deployed version, calls go to /api/extract (our Vercel
// serverless function) instead of directly to Anthropic.
// The serverless function adds the API key server-side.

const EXTRACTION_PROMPT = `You are reading a screenshot of a song with lyrics and chords.
Extract the full content and return it as plain text, following these rules:
1. Preserve the layout exactly: if chords appear above a lyric line, keep them on the line above.
2. Keep the original chord symbols exactly as written (e.g. Am7, F#, Bb/D).
3. Preserve the spacing between chords on chord lines.
4. Do not add, remove, or correct anything. Transcribe what you see.
5. Do not use markdown, headers, or formatting. Plain text only.
6. If you cannot find any chords in the image, respond with exactly: NO_CHORDS_FOUND
Return only the extracted text, nothing else.`;

// Compress image to max 1000px wide at 80% quality before sending to API
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1000;
      const scale = img.width > MAX ? MAX / img.width : 1;
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Compression failed')), 'image/jpeg', 0.8);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

async function extractChordsFromImage(imageFile, userToken = null) {
  const compressed = await compressImage(imageFile);
  const base64Image = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(compressed);
  });

  const headers = { 'Content-Type': 'application/json' };
  if (userToken) headers['Authorization'] = `Bearer ${userToken}`;

  const response = await fetch('/api/extract', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Image } },
          { type: 'text', text: EXTRACTION_PROMPT },
        ],
      }],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || `API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  if (text === 'NO_CHORDS_FOUND') throw new Error('No chords found in this image.');
  return { text, uploadsRemaining: data.uploadsRemaining, uploadsLimit: data.uploadsLimit };
}

// ── localStorage ───────────────────────────────────────────────
const STORAGE_KEY = 'chordTransposer_songs';
function loadSongs() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } }
function saveSongs(songs) { localStorage.setItem(STORAGE_KEY, JSON.stringify(songs)); }

// ── Design tokens ──────────────────────────────────────────────
const gold = '#c8a84b';
const bg   = '#0f0e0d';
const bg2  = '#141310';
const bg3  = '#1a1916';
const border = '#2a2820';
const textPrimary = '#e8e0d0';
const textMuted   = '#6b6456';
const textFaint   = '#3a3428';

const s = {
  app: { minHeight: '100vh', background: bg, color: textPrimary, fontFamily: "Georgia, 'Times New Roman', serif", position: 'relative' },
  bgGlow: { position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: `radial-gradient(ellipse at 15% 15%, #1c1505 0%, transparent 55%), radial-gradient(ellipse at 85% 85%, #050f05 0%, transparent 55%)` },
  header: { position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${border}` },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  headerRight: { display: 'flex', gap: 8 },
  logo: { fontSize: 44, color: gold, lineHeight: 1, userSelect: 'none' },
  title: { margin: 0, fontSize: 24, fontWeight: 'normal', letterSpacing: '0.04em' },
  subtitle: { margin: 0, fontSize: 12, color: textMuted, letterSpacing: '0.1em', fontFamily: 'sans-serif' },
  iconBtn: { position: 'relative', background: 'transparent', border: `1px solid ${border}`, color: '#a09880', padding: '7px 13px', borderRadius: 8, cursor: 'pointer', fontSize: 15 },
  badge: { position: 'absolute', top: -7, right: -7, background: gold, color: bg, borderRadius: '50%', width: 17, height: 17, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', fontWeight: 'bold' },
  panel: { position: 'relative', zIndex: 10, margin: '12px 28px', padding: '18px 22px', background: bg3, border: `1px solid ${border}`, borderRadius: 12 },
  statusBar: { position: 'relative', zIndex: 10, margin: '10px 28px', padding: '9px 18px', borderRadius: 8, fontSize: 13, fontFamily: 'sans-serif' },
  statusLoading: { background: '#1a1608', border: `1px solid ${gold}`, color: gold },
  statusError:   { background: '#1a0808', border: '1px solid #c84b4b', color: '#c84b4b' },
  statusSuccess: { background: '#081a08', border: '1px solid #4bc84b', color: '#4bc84b' },
  main: { position: 'relative', zIndex: 10, display: 'flex', gap: 20, padding: '20px 28px', minHeight: 'calc(100vh - 130px)', flexWrap: 'wrap' },
  leftCol: { width: 272, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 },
  dropZone: { border: `1px solid ${border}`, borderRadius: 12, padding: '36px 20px', textAlign: 'center', cursor: 'pointer', background: bg2, transition: 'all 0.2s' },
  dropZoneActive: { borderColor: '#4a4438', background: bg3 },
  dropIcon: { marginBottom: 14 },
  dropText: { margin: '0 0 6px', fontSize: 13, color: textMuted, letterSpacing: '0.06em', fontFamily: 'sans-serif' },
  dropHint: { margin: 0, fontSize: 11, color: textFaint, fontFamily: 'sans-serif', letterSpacing: '0.04em' },
  controls: { display: 'flex', flexDirection: 'column', gap: 14 },
  controlGroup: { display: 'flex', flexDirection: 'column', gap: 7 },
  label: { fontSize: 10, letterSpacing: '0.14em', color: textMuted, textTransform: 'uppercase', fontFamily: 'sans-serif' },
  hint: { margin: '4px 0 0', fontSize: 11, color: textFaint, fontFamily: 'sans-serif' },
  input: { background: bg3, border: `1px solid ${border}`, borderRadius: 8, color: textPrimary, padding: '9px 13px', fontSize: 13, fontFamily: 'sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' },
  row: { display: 'flex', gap: 8, alignItems: 'center' },
  keyGrid: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 },
  keyBtn: { background: bg3, border: `1px solid ${border}`, borderRadius: 6, color: '#a09880', padding: '6px 2px', fontSize: 12, cursor: 'pointer', fontFamily: 'sans-serif', textAlign: 'center', transition: 'all 0.12s' },
  keyActive: { background: gold, border: `1px solid ${gold}`, color: bg, fontWeight: 'bold' },
  modeRow: { display: 'flex', background: bg3, border: `1px solid ${border}`, borderRadius: 8, overflow: 'hidden' },
  modeBtn: { flex: 1, padding: '8px', background: 'transparent', border: 'none', color: textMuted, cursor: 'pointer', fontSize: 12, fontFamily: 'sans-serif' },
  modeBtnOn: { background: border, color: textPrimary },
  slider: { width: '100%', accentColor: gold },
  sliderLabels: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: textFaint, fontFamily: 'sans-serif' },
  btnPrimary: { background: gold, border: 'none', borderRadius: 8, color: bg, padding: '11px', fontSize: 13, cursor: 'pointer', fontWeight: 'bold', fontFamily: 'sans-serif', letterSpacing: '0.04em' },
  btnSmall: { background: bg3, border: `1px solid ${border}`, borderRadius: 6, color: '#a09880', padding: '5px 11px', fontSize: 12, cursor: 'pointer', fontFamily: 'sans-serif' },
  outputHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 22px', borderBottom: `1px solid ${border}`, flexShrink: 0 },
  outputTitleGroup: { display: 'flex', flexDirection: 'column', gap: 2 },
  outputTitle: { fontSize: 15, color: textPrimary },
  outputKeyLabel: { fontSize: 12, color: gold, fontFamily: 'sans-serif' },
  outputHeaderRight: { display: 'flex', alignItems: 'center', gap: 8 },
  expandBtn: { background: 'transparent', border: `1px solid ${border}`, borderRadius: 6, color: textMuted, padding: '5px 9px', cursor: 'pointer', fontSize: 14, lineHeight: 1 },
  outputBody: { flex: 1, padding: '20px 24px', overflowX: 'auto', overflowY: 'auto' },
  empty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyIcon: { opacity: 0.15 },
  emptyText: { margin: 0, fontSize: 13, color: textMuted, letterSpacing: '0.08em', fontFamily: 'sans-serif' },
  emptyHint: { margin: 0, fontSize: 11, color: textFaint, fontFamily: 'sans-serif', letterSpacing: '0.04em' },
  savedRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${bg2}` },
  savedTitle: { fontSize: 13, color: textPrimary },
  savedMeta: { fontSize: 11, color: textFaint, fontFamily: 'sans-serif' },
};

// ── App ────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]                 = useState(null);
  const [originalText, setOriginalText] = useState('');
  const [displayText, setDisplayText]   = useState('');
  const [originalKey, setOriginalKey]   = useState('C');
  const [targetKey, setTargetKey]       = useState('C');
  const [semitones, setSemitones]       = useState(0);
  const [mode, setMode]                 = useState('key');
  const [songTitle, setSongTitle]       = useState('');
  const [savedSongs, setSavedSongs]     = useState(loadSongs);
  const [status, setStatus]             = useState({ type: '', message: '' });
  const [dragging, setDragging]         = useState(false);
  const [showSaved, setShowSaved]         = useState(false);
  const [fullscreen, setFullscreen]       = useState(false);
  const [selectedChord, setSelectedChord] = useState(null);
  const [copied, setCopied]               = useState(false);
  const [uploadsRemaining, setUploadsRemaining] = useState(null);

  useEffect(() => {
    if (!originalText) return;
    const shift = mode === 'key' ? getSemitonesBetweenKeys(originalKey, targetKey) : semitones;
    setDisplayText(transposeText(originalText, shift, targetKey));
  }, [originalText, originalKey, targetKey, semitones, mode]);

  const handleImage = useCallback(async (file) => {
    if (!file?.type.startsWith('image/')) { setStatus({ type: 'error', message: 'Please upload an image file.' }); return; }
    setStatus({ type: 'loading', message: 'Reading chords from screenshot...' });
    try {
      // Get the current session token if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || null;

      const { text, uploadsRemaining: remaining, uploadsLimit: limit } = await extractChordsFromImage(file, token);
      const detectedKey = detectKey(text) || 'C';
      setOriginalText(text); setDisplayText(text);
      setOriginalKey(detectedKey);
      setTargetKey(detectedKey); setSemitones(0);
      setSongTitle(file.name.replace(/\.[^/.]+$/, '') || 'Untitled');
      setUploadsRemaining(remaining);
      setStatus({ type: 'success', message: `Chords extracted! Detected key: ${detectedKey}. ${remaining} upload${remaining !== 1 ? 's' : ''} remaining today.` });
    } catch (e) { setStatus({ type: 'error', message: e.message }); }
  }, [originalKey, user]);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImage(file);
  }, [handleImage]);

  const saveSong = async () => {
    if (!originalText) return;
    const song = { title: songTitle || 'Untitled', original_text: originalText, original_key: originalKey };

    if (user) {
      // Save to Supabase cloud
      const { error } = await supabase.from('songs').upsert({
        ...song,
        user_id: user.id,
        saved_at: new Date().toISOString(),
      });
      if (error) { setStatus({ type: 'error', message: 'Failed to save to cloud.' }); return; }
      setStatus({ type: 'success', message: `"${song.title}" saved to your account.` });
      loadCloudSongs();
    } else {
      // Save to localStorage
      const localSong = { id: Date.now(), title: song.title, originalText, originalKey, savedAt: new Date().toLocaleDateString() };
      const updated = [localSong, ...savedSongs.filter(s => s.title !== localSong.title)];
      setSavedSongs(updated); saveSongs(updated);
      setStatus({ type: 'success', message: `"${song.title}" saved to device. Sign in to save to your account.` });
    }
  };

  const loadCloudSongs = async () => {
    if (!user) return;
    const { data } = await supabase.from('songs').select('*').eq('user_id', user.id).order('saved_at', { ascending: false });
    if (data) setSavedSongs(data.map(s => ({ id: s.id, title: s.title, originalText: s.original_text, originalKey: s.original_key, savedAt: new Date(s.saved_at).toLocaleDateString() })));
  };

  // Load cloud songs when user logs in
  useEffect(() => {
    if (user) loadCloudSongs();
    else setSavedSongs(loadSongs());
  }, [user]);

  const loadSong = (song) => {
    setOriginalText(song.originalText); setDisplayText(song.originalText);
    setOriginalKey(song.originalKey); setTargetKey(song.originalKey);
    setSemitones(0); setSongTitle(song.title); setShowSaved(false);
    setStatus({ type: 'success', message: `Loaded "${song.title}"` });
  };

  const deleteSong = async (id) => {
    if (user) {
      await supabase.from('songs').delete().eq('id', id);
      loadCloudSongs();
    } else {
      const updated = savedSongs.filter(s => s.id !== id);
      setSavedSongs(updated); saveSongs(updated);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(displayText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const printSheet = () => {
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>${songTitle || 'Chord Sheet'}</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 14px; line-height: 1.8;
               padding: 40px; color: #000; background: #fff; }
        h2 { font-family: Georgia, serif; margin-bottom: 4px; }
        .meta { font-size: 12px; color: #666; margin-bottom: 24px; }
        .chord-line { color: #8a6a00; font-weight: bold; }
        .lyric-line { color: #000; }
        pre { white-space: pre; margin: 0; }
      </style></head><body>
      <h2>${songTitle || 'Chord Sheet'}</h2>
      <div class="meta">${currentShift === 0 ? `Key of ${originalKey}` : mode === 'key' ? `Transposed: ${originalKey} → ${targetKey}` : `Transposed: ${currentShift > 0 ? '+' : ''}${currentShift} semitones`}</div>
      ${displayText.split('\n').map(line =>
        `<pre class="${isChordLine(line) ? 'chord-line' : 'lyric-line'}">${line || ' '}</pre>`
      ).join('')}
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  const hasContent = !!originalText;
  const currentShift = mode === 'key' ? getSemitonesBetweenKeys(originalKey, targetKey) : semitones;

  const isMobile = window.innerWidth < 600;

  const rightColStyle = fullscreen
    ? { position: 'fixed', top: 73, left: 0, right: 0, bottom: 0, zIndex: 100, background: bg2, borderTop: `1px solid ${border}`, display: 'flex', flexDirection: 'column' }
    : { flex: 1, minWidth: isMobile ? '100%' : 300, background: bg2, border: `1px solid ${border}`, borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: isMobile ? 400 : undefined };

  return (
    <div style={s.app}>
      <div style={s.bgGlow} />

      <header style={s.header}>
        <div style={s.headerLeft}>
          {/* SVG Logo: stylized flat symbol with gold gradient and shadow */}
          <svg width="44" height="52" viewBox="0 0 44 52" fill="none" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0}}>
            <defs>
              <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#e8c96a"/>
                <stop offset="100%" stopColor="#a07820"/>
              </linearGradient>
              <filter id="glow">
                <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#c8a84b" floodOpacity="0.5"/>
              </filter>
            </defs>
            {/* Stem */}
            <rect x="10" y="4" width="5" height="38" rx="2.5" fill="url(#goldGrad)" filter="url(#glow)"/>
            {/* Ball of the flat */}
            <ellipse cx="19" cy="36" rx="9" ry="7" fill="url(#goldGrad)" filter="url(#glow)"/>
            {/* Inner cutout to make it look like a real flat symbol */}
            <ellipse cx="19" cy="35" rx="5" ry="4" fill="#0f0e0d"/>
            {/* Shine */}
            <ellipse cx="16" cy="32" rx="2" ry="1.5" fill="#f0d97a" opacity="0.4"/>
          </svg>
          <div>
            <h1 style={s.title}>Chord Transposer</h1>
            <p style={s.subtitle}>Upload a screenshot · transpose instantly</p>
          </div>
        </div>
        <div style={s.headerRight}>
          <Auth onUserChange={setUser} />
          <button style={s.iconBtn} onClick={() => setShowSaved(!showSaved)}>
            🎵 {savedSongs.length > 0 && <span style={s.badge}>{savedSongs.length}</span>}
          </button>
        </div>
      </header>

      {showSaved && (
        <div style={s.panel}>
          <label style={s.label}>Saved Songs ({savedSongs.length})</label>
          {savedSongs.length === 0
            ? <p style={s.hint}>No saved songs yet.</p>
            : savedSongs.map(song => (
              <div key={song.id} style={s.savedRow}>
                <div>
                  <span style={s.savedTitle}>{song.title}</span>
                  <span style={s.savedMeta}> · key of {song.originalKey} · {song.savedAt}</span>
                </div>
                <div style={s.row}>
                  <button style={s.btnSmall} onClick={() => loadSong(song)}>Load</button>
                  <button style={{...s.btnSmall, color:'#c84b4b', borderColor:'#3a1a1a'}} onClick={() => deleteSong(song.id)}>✕</button>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {status.message && (
        <div style={{...s.statusBar, ...(status.type==='loading' ? s.statusLoading : status.type==='error' ? s.statusError : s.statusSuccess)}}>
          {status.type==='loading' ? '⟳ ' : status.type==='error' ? '✕ ' : '✓ '}{status.message}
        </div>
      )}

      <main style={s.main}>
        {!fullscreen && (
          <div style={s.leftCol}>
            <div style={{...s.dropZone, ...(dragging ? s.dropZoneActive : {})}}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => document.getElementById('fileInput').click()}>
              <input id="fileInput" type="file" accept="image/*" style={{display:'none'}}
                onChange={e => handleImage(e.target.files[0])} />
              <div style={s.dropIcon}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="4" y="20" width="24" height="2" rx="1" fill="#3a3428"/>
                  <rect x="4" y="24" width="24" height="2" rx="1" fill="#2a2820"/>
                  <path d="M16 4 L16 18 M10 10 L16 4 L22 10" stroke="#4a4438" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p style={s.dropText}>Upload a chord sheet</p>
              <p style={s.dropHint}>drag and drop or click to browse</p>
            </div>

            {hasContent && (
              <div style={s.controls}>
                <div style={s.controlGroup}>
                  <label style={s.label}>Song title</label>
                  <input value={songTitle} onChange={e => setSongTitle(e.target.value)} placeholder="Song name..." style={s.input} />
                </div>
                {mode === 'key' && (
                  <div style={s.controlGroup}>
                    <label style={s.label}>Original key</label>
                    <div style={s.keyGrid}>
                      {ALL_KEYS.map(k => (
                        <button key={k} style={{...s.keyBtn, ...(originalKey===k ? s.keyActive : {})}} onClick={() => setOriginalKey(k)}>{k}</button>
                      ))}
                    </div>
                  </div>
                )}
                <div style={s.modeRow}>
                  <button style={{...s.modeBtn, ...(mode==='key' ? s.modeBtnOn : {})}} onClick={() => setMode('key')}>By Key</button>
                  <button style={{...s.modeBtn, ...(mode==='semitone' ? s.modeBtnOn : {})}} onClick={() => setMode('semitone')}>By Semitones</button>
                </div>
                {mode === 'key' ? (
                  <div style={s.controlGroup}>
                    <label style={s.label}>Transpose to key</label>
                    <div style={s.keyGrid}>
                      {ALL_KEYS.map(k => (
                        <button key={k} style={{...s.keyBtn, ...(targetKey===k ? s.keyActive : {})}} onClick={() => setTargetKey(k)}>{k}</button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={s.controlGroup}>
                    <label style={s.label}>Semitones <span style={{color: gold}}>{semitones > 0 ? `+${semitones}` : semitones}</span></label>
                    <input type="range" min="-6" max="6" value={semitones} onChange={e => setSemitones(Number(e.target.value))} style={s.slider} />
                    <div style={s.sliderLabels}><span>−6</span><span>0</span><span>+6</span></div>
                  </div>
                )}
                <button style={s.btnPrimary} onClick={saveSong}>💾 &nbsp;Save to device</button>
              </div>
            )}
          </div>
        )}

        <div style={rightColStyle}>
          {hasContent ? (
            <>
              <div style={s.outputHeader}>
                <div style={s.outputTitleGroup}>
                  <span style={s.outputTitle}>{songTitle || 'Untitled'}</span>
                  <span style={s.outputKeyLabel}>
                    {currentShift === 0 ? `Key of ${originalKey} · no transpose`
                      : mode === 'key' ? `${originalKey} → ${targetKey} (${currentShift > 0 ? '+' : ''}${currentShift} semitones)`
                      : `${currentShift > 0 ? '+' : ''}${currentShift} semitones from ${originalKey}`}
                  </span>
                </div>
                <div style={s.outputHeaderRight}>
                  <button style={s.expandBtn} onClick={copyToClipboard} title="Copy to clipboard">
                    {copied ? '✓' : '⎘'}
                  </button>
                  <button style={s.expandBtn} onClick={printSheet} title="Print / Export">
                    ⎙
                  </button>
                  <button style={s.expandBtn} onClick={() => setFullscreen(!fullscreen)}
                    title={fullscreen ? 'Exit fullscreen' : 'Expand'}>
                    {fullscreen ? '✕' : '⤢'}
                  </button>
                </div>
              </div>
              <div style={s.outputBody}>
                <p style={{ margin:'0 0 12px', fontSize:11, color:'#4a4438', fontFamily:'sans-serif', letterSpacing:'0.06em' }}>
                  Click any chord to see how to play it
                </p>
                <ColoredSheet text={displayText} onChordClick={setSelectedChord} />
              </div>
            </>
          ) : (
            <div style={s.empty}>
              <div style={s.emptyIcon}>
                <svg width="64" height="40" viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <line x1="4" y1="8"  x2="60" y2="8"  stroke="#2a2820" strokeWidth="1.5"/>
                  <line x1="4" y1="16" x2="60" y2="16" stroke="#2a2820" strokeWidth="1.5"/>
                  <line x1="4" y1="24" x2="60" y2="24" stroke="#2a2820" strokeWidth="1.5"/>
                  <line x1="4" y1="32" x2="60" y2="32" stroke="#2a2820" strokeWidth="1.5"/>
                  <rect x="20" y="18" width="10" height="2" rx="1" fill="#3a3428"/>
                  <rect x="36" y="12" width="10" height="2" rx="1" fill="#3a3428"/>
                  <rect x="44" y="22" width="8"  height="2" rx="1" fill="#3a3428"/>
                </svg>
              </div>
              <p style={s.emptyText}>Your transposed sheet will appear here</p>
              <p style={s.emptyHint}>upload a screenshot to get started</p>
            </div>
          )}
        </div>
      </main>

      <footer style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '20px 28px', borderTop: '1px solid #2a2820', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <a href="https://github.com/Jisjai/chord-transposer/issues" target="_blank" rel="noreferrer"
          style={{ fontSize: 11, color: '#6b6456', fontFamily: 'sans-serif', textDecoration: 'none', letterSpacing: '0.08em' }}>
          Found a bug or have feedback? Open an issue on GitHub
        </a>
        <span style={{ fontSize: 11, color: '#3a3428', fontFamily: 'sans-serif', letterSpacing: '0.08em' }}>
          Made by Jisjai Bloemendal
        </span>
      </footer>

      {selectedChord && (
        <ChordDiagram chord={selectedChord} onClose={() => setSelectedChord(null)} />
      )}
    </div>
  );
}
