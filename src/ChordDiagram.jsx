// ── ChordDiagram.jsx ───────────────────────────────────────────
// Renders guitar (fretboard) and piano (keyboard) diagrams for
// any chord. Drawn entirely in SVG — no libraries, no API calls.
//
// Usage:
//   <ChordDiagram chord="Am" onClose={() => {}} />

import { useState } from "react";

// ── Chord Data ─────────────────────────────────────────────────
// Guitar: [string1..string6] where each value is:
//   -1 = muted (x), 0 = open, 1-5 = fret number
// Plus optional barre: { fret, fromString, toString }
//
// Piano: array of semitone offsets from root note (0=root)
// e.g. major = [0,4,7], minor = [0,3,7]

const GUITAR_CHORDS = {
  // Major
  'C':   { frets: [-1,3,2,0,1,0], fingers: [null,3,2,null,1,null] },
  'C#':  { frets: [-1,4,3,1,2,1], fingers: [null,4,3,1,2,1], barre: { fret:1, from:1, to:5 } },
  'Db':  { frets: [-1,4,3,1,2,1], fingers: [null,4,3,1,2,1], barre: { fret:1, from:1, to:5 } },
  'D':   { frets: [-1,-1,0,2,3,2], fingers: [null,null,null,1,3,2] },
  'Eb':  { frets: [-1,-1,1,3,4,3], fingers: [null,null,1,2,4,3] },
  'E':   { frets: [0,2,2,1,0,0], fingers: [null,2,3,1,null,null] },
  'F':   { frets: [1,3,3,2,1,1], fingers: [1,3,4,2,1,1], barre: { fret:1, from:0, to:5 } },
  'F#':  { frets: [2,4,4,3,2,2], fingers: [1,3,4,2,1,1], barre: { fret:2, from:0, to:5 } },
  'Gb':  { frets: [2,4,4,3,2,2], fingers: [1,3,4,2,1,1], barre: { fret:2, from:0, to:5 } },
  'G':   { frets: [3,2,0,0,0,3], fingers: [2,1,null,null,null,3] },
  'Ab':  { frets: [4,3,1,1,1,4], fingers: [3,2,1,1,1,4], barre: { fret:1, from:1, to:4 } },
  'A':   { frets: [-1,0,2,2,2,0], fingers: [null,null,1,2,3,null] },
  'Bb':  { frets: [-1,1,3,3,3,1], fingers: [null,1,2,3,4,1], barre: { fret:1, from:1, to:5 } },
  'B':   { frets: [-1,2,4,4,4,2], fingers: [null,1,2,3,4,1], barre: { fret:2, from:1, to:5 } },
  // Minor
  'Cm':  { frets: [-1,3,5,5,4,3], fingers: [null,1,3,4,2,1], barre: { fret:3, from:1, to:5 } },
  'C#m': { frets: [-1,4,6,6,5,4], fingers: [null,1,3,4,2,1], barre: { fret:4, from:1, to:5 } },
  'Dbm': { frets: [-1,4,6,6,5,4], fingers: [null,1,3,4,2,1], barre: { fret:4, from:1, to:5 } },
  'Dm':  { frets: [-1,-1,0,2,3,1], fingers: [null,null,null,2,3,1] },
  'Ebm': { frets: [-1,-1,1,3,4,2], fingers: [null,null,1,3,4,2] },
  'Em':  { frets: [0,2,2,0,0,0], fingers: [null,2,3,null,null,null] },
  'Fm':  { frets: [1,3,3,1,1,1], fingers: [1,3,4,1,1,1], barre: { fret:1, from:0, to:5 } },
  'F#m': { frets: [2,4,4,2,2,2], fingers: [1,3,4,1,1,1], barre: { fret:2, from:0, to:5 } },
  'Gbm': { frets: [2,4,4,2,2,2], fingers: [1,3,4,1,1,1], barre: { fret:2, from:0, to:5 } },
  'Gm':  { frets: [3,5,5,3,3,3], fingers: [1,3,4,1,1,1], barre: { fret:3, from:0, to:5 } },
  'Abm': { frets: [4,6,6,4,4,4], fingers: [1,3,4,1,1,1], barre: { fret:4, from:0, to:5 } },
  'Am':  { frets: [-1,0,2,2,1,0], fingers: [null,null,2,3,1,null] },
  'Bbm': { frets: [-1,1,3,3,2,1], fingers: [null,1,3,4,2,1], barre: { fret:1, from:1, to:5 } },
  'Bm':  { frets: [-1,2,4,4,3,2], fingers: [null,1,3,4,2,1], barre: { fret:2, from:1, to:5 } },
  // 7th
  'C7':  { frets: [-1,3,2,3,1,0], fingers: [null,3,2,4,1,null] },
  'D7':  { frets: [-1,-1,0,2,1,2], fingers: [null,null,null,2,1,3] },
  'E7':  { frets: [0,2,0,1,0,0], fingers: [null,2,null,1,null,null] },
  'F7':  { frets: [1,3,1,2,1,1], fingers: [1,3,1,2,1,1], barre: { fret:1, from:0, to:5 } },
  'G7':  { frets: [3,2,0,0,0,1], fingers: [3,2,null,null,null,1] },
  'A7':  { frets: [-1,0,2,0,2,0], fingers: [null,null,2,null,3,null] },
  'B7':  { frets: [-1,2,1,2,0,2], fingers: [null,2,1,3,null,4] },
  // maj7
  'Cmaj7': { frets: [-1,3,2,0,0,0], fingers: [null,3,2,null,null,null] },
  'Dmaj7': { frets: [-1,-1,0,2,2,2], fingers: [null,null,null,1,1,1] },
  'Emaj7': { frets: [0,2,1,1,0,0], fingers: [null,3,1,2,null,null] },
  'Fmaj7': { frets: [-1,-1,3,2,1,0], fingers: [null,null,3,2,1,null] },
  'Gmaj7': { frets: [3,2,0,0,0,2], fingers: [3,2,null,null,null,1] },
  'Amaj7': { frets: [-1,0,2,1,2,0], fingers: [null,null,2,1,3,null] },
  'Bmaj7': { frets: [-1,2,4,3,4,2], fingers: [null,1,3,2,4,1], barre: { fret:2, from:1, to:5 } },
  // sus4
  'Csus4': { frets: [-1,3,3,0,1,1], fingers: [null,3,4,null,1,2] },
  'Dsus4': { frets: [-1,-1,0,2,3,3], fingers: [null,null,null,1,2,3] },
  'Esus4': { frets: [0,2,2,2,0,0], fingers: [null,1,2,3,null,null] },
  'Gsus4': { frets: [3,3,0,0,1,3], fingers: [2,3,null,null,1,4] },
  'Asus4': { frets: [-1,0,2,2,3,0], fingers: [null,null,1,2,3,null] },
  // dim
  'Cdim': { frets: [-1,3,4,5,4,-1], fingers: [null,1,2,4,3,null] },
  'Ddim': { frets: [-1,-1,0,1,0,1], fingers: [null,null,null,1,null,2] },
  'Edim': { frets: [0,1,2,3,2,-1], fingers: [null,1,2,4,3,null] },
  'Gdim': { frets: [3,4,5,3,-1,-1], fingers: [1,2,3,1,null,null] },
  'Adim': { frets: [-1,0,1,2,1,-1], fingers: [null,null,1,3,2,null] },
  'Bdim': { frets: [-1,2,3,4,3,-1], fingers: [null,1,2,4,3,null] },
};

// Piano chord intervals: semitone offsets from root
const PIANO_INTERVALS = {
  '':     [0, 4, 7],           // major
  'm':    [0, 3, 7],           // minor
  '7':    [0, 4, 7, 10],       // dominant 7
  'maj7': [0, 4, 7, 11],       // major 7
  'm7':   [0, 3, 7, 10],       // minor 7
  'sus2': [0, 2, 7],           // sus2
  'sus4': [0, 5, 7],           // sus4
  'dim':  [0, 3, 6],           // diminished
  'aug':  [0, 4, 8],           // augmented
  'add9': [0, 4, 7, 14],       // add9
  '6':    [0, 4, 7, 9],        // major 6
  'm6':   [0, 3, 7, 9],        // minor 6
  '9':    [0, 4, 7, 10, 14],   // dominant 9
};

const NOTE_TO_SEMITONE = { C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11 };

// Which piano keys are black (sharps/flats) in one octave
const BLACK_KEYS = [1, 3, 6, 8, 10]; // semitone positions

// ── Guitar Diagram ─────────────────────────────────────────────
function GuitarDiagram({ chordName }) {
  const data = GUITAR_CHORDS[chordName];
  if (!data) return <NotFound name={chordName} instrument="guitar" />;

  const { frets, barre } = data;
  const W = 200, H = 220;
  const left = 30, top = 40, right = W - 20;
  const strW = (right - left) / 5;
  const fretH = 30;
  const numFrets = 5;

  // Find min fret to determine if we need to offset
  const activeFrets = frets.filter(f => f > 0);
  const minFret = activeFrets.length ? Math.min(...activeFrets) : 1;
  const offset = minFret > 2 ? minFret - 1 : 0;
  const showOffset = offset > 0;

  return (
    <svg width={W} height={H} style={{ display: 'block', margin: '0 auto' }}>
      {/* Nut or fret offset marker */}
      {showOffset
        ? <text x={left - 8} y={top + fretH * 0.6} textAnchor="end" fontSize={11} fill="#6b6456">{offset + 1}fr</text>
        : <rect x={left} y={top - 4} width={right - left} height={4} rx={2} fill="#c8a84b" />
      }

      {/* Fret lines */}
      {Array.from({ length: numFrets + 1 }).map((_, i) => (
        <line key={i} x1={left} y1={top + i * fretH} x2={right} y2={top + i * fretH} stroke="#2a2820" strokeWidth={1} />
      ))}

      {/* String lines */}
      {frets.map((_, i) => (
        <line key={i} x1={left + i * strW} y1={top} x2={left + i * strW} y2={top + numFrets * fretH} stroke="#3a3830" strokeWidth={1} />
      ))}

      {/* Barre */}
      {barre && barre.fret >= offset + 1 && barre.fret <= offset + numFrets && (
        <rect
          x={left + barre.from * strW - 8}
          y={top + (barre.fret - offset - 1) * fretH + 6}
          width={(barre.to - barre.from) * strW + 16}
          height={fretH - 12}
          rx={9}
          fill="#c8a84b"
          opacity={0.85}
        />
      )}

      {/* Finger dots */}
      {frets.map((fret, i) => {
        if (fret <= 0) return null;
        const adjustedFret = fret - offset;
        if (adjustedFret < 1 || adjustedFret > numFrets) return null;
        const cx = left + i * strW;
        const cy = top + (adjustedFret - 1) * fretH + fretH / 2;
        return <circle key={i} cx={cx} cy={cy} r={9} fill="#c8a84b" />;
      })}

      {/* Muted / open string markers */}
      {frets.map((fret, i) => {
        const cx = left + i * strW;
        if (fret === -1) return (
          <text key={i} x={cx} y={top - 10} textAnchor="middle" fontSize={13} fill="#c84b4b">×</text>
        );
        if (fret === 0) return (
          <circle key={i} cx={cx} cy={top - 10} r={5} fill="none" stroke="#6b6456" strokeWidth={1.5} />
        );
        return null;
      })}

      {/* String labels */}
      {['E','A','D','G','B','e'].map((label, i) => (
        <text key={i} x={left + i * strW} y={top + numFrets * fretH + 16} textAnchor="middle" fontSize={10} fill="#4a4438">{label}</text>
      ))}
    </svg>
  );
}

// ── Piano Diagram ──────────────────────────────────────────────
function PianoDiagram({ chordName }) {
  const parsed = chordName.match(/^([A-G][#b]?)(.*)$/);
  if (!parsed) return <NotFound name={chordName} instrument="piano" />;

  const root = parsed[1];
  const suffix = parsed[2].replace(/\/[A-G][#b]?$/, ''); // strip slash bass
  const intervals = PIANO_INTERVALS[suffix] ?? PIANO_INTERVALS[''];
  const rootSemitone = NOTE_TO_SEMITONE[root];
  if (rootSemitone === undefined) return <NotFound name={chordName} instrument="piano" />;

  // Build set of active semitones (mod 12)
  const activeSet = new Set(intervals.map(i => (rootSemitone + i) % 12));

  const W = 200, H = 120;
  const keys = 14; // two octaves of white keys: C D E F G A B C D E F G A B
  const whitePattern = [0,2,4,5,7,9,11]; // semitones of white keys in one octave
  const keyW = W / keys;
  const keyH = H - 10;
  const blackH = keyH * 0.6;

  // Build white key list with their semitones
  const whiteKeys = [];
  for (let oct = 0; oct < 2; oct++) {
    whitePattern.forEach(s => whiteKeys.push((s + oct * 12) % 12));
  }

  // Black key positions (between white keys)
  const blackPositions = []; // { x, semitone }
  const blackPattern = [1,3,null,6,8,10,null]; // null = no black key after E and B
  let wi = 0;
  for (let oct = 0; oct < 2; oct++) {
    blackPattern.forEach((s, bi) => {
      if (s !== null) {
        blackPositions.push({ x: (wi + bi + 1) * keyW - keyW * 0.3, semitone: (s + oct * 12) % 12 });
      }
    });
    wi += 7;
  }

  return (
    <svg width={W} height={H} style={{ display: 'block', margin: '0 auto' }}>
      {/* White keys */}
      {whiteKeys.map((semitone, i) => {
        const active = activeSet.has(semitone);
        return (
          <g key={i}>
            <rect
              x={i * keyW + 1} y={0}
              width={keyW - 2} height={keyH}
              rx={2}
              fill={active ? '#c8a84b' : '#e8e0d0'}
              stroke="#2a2820" strokeWidth={1}
            />
          </g>
        );
      })}

      {/* Black keys */}
      {blackPositions.map((bp, i) => {
        const active = activeSet.has(bp.semitone);
        return (
          <rect key={i}
            x={bp.x} y={0}
            width={keyW * 0.6} height={blackH}
            rx={2}
            fill={active ? '#c8a84b' : '#1a1916'}
            stroke="#0f0e0d" strokeWidth={1}
          />
        );
      })}

      {/* Root label */}
      <text x={W / 2} y={H} textAnchor="middle" fontSize={11} fill="#6b6456" fontFamily="sans-serif">
        {root} highlighted
      </text>
    </svg>
  );
}

// ── Not Found ──────────────────────────────────────────────────
function NotFound({ name, instrument }) {
  return (
    <div style={{ textAlign: 'center', padding: '20px 0', color: '#4a4438', fontFamily: 'sans-serif', fontSize: 13 }}>
      No {instrument} diagram for {name} yet
    </div>
  );
}

// ── Main ChordDiagram Modal ────────────────────────────────────
export default function ChordDiagram({ chord, onClose }) {
  const [instrument, setInstrument] = useState('guitar');

  // Strip slash bass for display (Am/E → Am)
  const displayChord = chord.replace(/\/[A-G][#b]?$/, '');

  const gold = '#c8a84b';
  const bg2  = '#141310';
  const bg3  = '#1a1916';
  const border = '#2a2820';
  const textPrimary = '#e8e0d0';
  const textMuted = '#6b6456';

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)',
      }} />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', zIndex: 201,
        transform: 'translate(-50%, -50%)',
        background: bg2, border: `1px solid ${border}`, borderRadius: 16,
        padding: '24px', width: 260, boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 22, color: gold, fontFamily: "Georgia, serif", letterSpacing: '0.04em' }}>
            {displayChord}
          </span>
          <button onClick={onClose} style={{
            background: 'transparent', border: `1px solid ${border}`,
            borderRadius: 6, color: textMuted, padding: '4px 9px',
            cursor: 'pointer', fontSize: 14,
          }}>✕</button>
        </div>

        {/* Toggle */}
        <div style={{ display: 'flex', background: bg3, border: `1px solid ${border}`, borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
          {['guitar', 'piano'].map(inst => (
            <button key={inst} onClick={() => setInstrument(inst)} style={{
              flex: 1, padding: '7px', background: instrument === inst ? border : 'transparent',
              border: 'none', color: instrument === inst ? textPrimary : textMuted,
              cursor: 'pointer', fontSize: 12, fontFamily: 'sans-serif',
              textTransform: 'capitalize',
            }}>{inst}</button>
          ))}
        </div>

        {/* Diagram */}
        {instrument === 'guitar'
          ? <GuitarDiagram chordName={displayChord} />
          : <PianoDiagram  chordName={displayChord} />
        }
      </div>
    </>
  );
}
