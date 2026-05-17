import { useState } from "react";

// ── Enharmonic aliases ─────────────────────────────────────────
// Maps any enharmonic spelling to our canonical key in GUITAR_CHORDS
const ENHARMONIC = {
  'Db':'C#','D#':'Eb','E#':'F','Fb':'E',
  'Gb':'F#','G#':'Ab','A#':'Bb','B#':'C','Cb':'B',
  // minor
  'Dbm':'C#m','D#m':'Ebm','E#m':'Fm','Fbm':'Em',
  'Gbm':'F#m','G#m':'Abm','A#m':'Bbm','B#m':'Cm','Cbm':'Bm',
  // 7ths
  'Db7':'C#7','D#7':'Eb7','Gb7':'F#7','G#7':'Ab7','A#7':'Bb7',
  // maj7
  'Dbmaj7':'C#maj7','D#maj7':'Ebmaj7','Gbmaj7':'F#maj7','G#maj7':'Abmaj7','A#maj7':'Bbmaj7',
  // m7
  'Dbm7':'C#m7','D#m7':'Ebm7','Gbm7':'F#m7','G#m7':'Abm7','A#m7':'Bbm7',
  // sus2
  'Dbs2':'C#sus2','D#sus2':'Ebsus2','Gbs2':'F#sus2','G#sus2':'Absus2','A#sus2':'Bbsus2',
  // sus4
  'Dbsus4':'C#sus4','D#sus4':'Ebsus4','Gbsus4':'F#sus4','G#sus4':'Absus4','A#sus4':'Bbsus4',
  // dim
  'Dbdim':'C#dim','D#dim':'Ebdim','Gbdim':'F#dim','G#dim':'Abdim','A#dim':'Bbdim',
};

// ── Guitar chord library ───────────────────────────────────────
// frets: [low-E, A, D, G, B, high-e]  -1=muted  0=open  1-9=fret
// barre: { fret, from, to }  (string indices 0=low-E … 5=high-e)
const GUITAR_CHORDS = {
  // ── MAJOR ──
  'C':   { frets:[-1,3,2,0,1,0] },
  'C#':  { frets:[-1,4,3,1,2,1], barre:{fret:1,from:1,to:5} },
  'D':   { frets:[-1,-1,0,2,3,2] },
  'Eb':  { frets:[-1,-1,1,3,4,3], barre:{fret:1,from:2,to:5} },
  'E':   { frets:[0,2,2,1,0,0] },
  'F':   { frets:[1,3,3,2,1,1], barre:{fret:1,from:0,to:5} },
  'F#':  { frets:[2,4,4,3,2,2], barre:{fret:2,from:0,to:5} },
  'G':   { frets:[3,2,0,0,0,3] },
  'Ab':  { frets:[-1,1,3,3,3,1], barre:{fret:1,from:1,to:5} },  // Ab = G#
  'A':   { frets:[-1,0,2,2,2,0] },
  'Bb':  { frets:[-1,1,3,3,3,1], barre:{fret:1,from:1,to:5} },
  'B':   { frets:[-1,2,4,4,4,2], barre:{fret:2,from:1,to:5} },

  // ── MINOR ──
  'Cm':  { frets:[-1,3,5,5,4,3], barre:{fret:3,from:1,to:5} },
  'C#m': { frets:[-1,4,6,6,5,4], barre:{fret:4,from:1,to:5} },
  'Dm':  { frets:[-1,-1,0,2,3,1] },
  'Ebm': { frets:[-1,-1,1,3,4,2], barre:{fret:1,from:2,to:4} },
  'Em':  { frets:[0,2,2,0,0,0] },
  'Fm':  { frets:[1,3,3,1,1,1], barre:{fret:1,from:0,to:5} },
  'F#m': { frets:[2,4,4,2,2,2], barre:{fret:2,from:0,to:5} },
  'Gm':  { frets:[3,5,5,3,3,3], barre:{fret:3,from:0,to:5} },
  'Abm': { frets:[4,6,6,4,4,4], barre:{fret:4,from:0,to:5} },
  'Am':  { frets:[-1,0,2,2,1,0] },
  'Bbm': { frets:[-1,1,3,3,2,1], barre:{fret:1,from:1,to:5} },
  'Bm':  { frets:[-1,2,4,4,3,2], barre:{fret:2,from:1,to:5} },

  // ── DOMINANT 7 ──
  'C7':  { frets:[-1,3,2,3,1,0] },
  'C#7': { frets:[-1,4,3,4,2,4], barre:{fret:4,from:1,to:5} },
  'D7':  { frets:[-1,-1,0,2,1,2] },
  'Eb7': { frets:[-1,-1,1,3,2,3] },
  'E7':  { frets:[0,2,0,1,0,0] },
  'F7':  { frets:[1,3,1,2,1,1], barre:{fret:1,from:0,to:5} },
  'F#7': { frets:[2,4,2,3,2,2], barre:{fret:2,from:0,to:5} },
  'G7':  { frets:[3,2,0,0,0,1] },
  'Ab7': { frets:[4,3,1,1,1,4], barre:{fret:1,from:1,to:4} },
  'A7':  { frets:[-1,0,2,0,2,0] },
  'Bb7': { frets:[-1,1,3,1,3,1], barre:{fret:1,from:1,to:5} },
  'B7':  { frets:[-1,2,1,2,0,2] },

  // ── MAJOR 7 ──
  'Cmaj7':  { frets:[-1,3,2,0,0,0] },
  'C#maj7': { frets:[-1,4,3,1,1,0] },
  'Dmaj7':  { frets:[-1,-1,0,2,2,2] },
  'Ebmaj7': { frets:[-1,-1,1,3,3,2] },
  'Emaj7':  { frets:[0,2,1,1,0,0] },
  'Fmaj7':  { frets:[-1,-1,3,2,1,0] },
  'F#maj7': { frets:[2,4,3,3,2,2], barre:{fret:2,from:0,to:5} },
  'Gmaj7':  { frets:[3,2,0,0,0,2] },
  'Abmaj7': { frets:[4,3,1,1,1,3] },
  'Amaj7':  { frets:[-1,0,2,1,2,0] },
  'Bbmaj7': { frets:[-1,1,3,2,3,0] },
  'Bmaj7':  { frets:[-1,2,4,3,4,2], barre:{fret:2,from:1,to:5} },

  // ── MINOR 7 ──
  'Cm7':  { frets:[-1,3,5,3,4,3], barre:{fret:3,from:1,to:5} },
  'C#m7': { frets:[-1,4,6,4,5,4], barre:{fret:4,from:1,to:5} },
  'Dm7':  { frets:[-1,-1,0,2,1,1] },
  'Ebm7': { frets:[-1,-1,1,3,2,2] },
  'Em7':  { frets:[0,2,0,0,0,0] },
  'Fm7':  { frets:[1,3,1,1,1,1], barre:{fret:1,from:0,to:5} },
  'F#m7': { frets:[2,4,2,2,2,2], barre:{fret:2,from:0,to:5} },
  'Gm7':  { frets:[3,5,3,3,3,3], barre:{fret:3,from:0,to:5} },
  'Abm7': { frets:[4,6,4,4,4,4], barre:{fret:4,from:0,to:5} },
  'Am7':  { frets:[-1,0,2,0,1,0] },
  'Bbm7': { frets:[-1,1,3,1,2,1], barre:{fret:1,from:1,to:5} },
  'Bm7':  { frets:[-1,2,4,2,3,2], barre:{fret:2,from:1,to:5} },

  // ── SUS2 ──
  'Csus2':  { frets:[-1,3,0,0,1,3] },
  'C#sus2': { frets:[-1,4,1,1,2,4] },
  'Dsus2':  { frets:[-1,-1,0,2,3,0] },
  'Ebsus2': { frets:[-1,-1,1,3,4,1] },
  'Esus2':  { frets:[0,2,2,4,0,0] },
  'Fsus2':  { frets:[1,3,3,0,1,1], barre:{fret:1,from:0,to:5} },
  'F#sus2': { frets:[2,4,4,1,2,2], barre:{fret:2,from:0,to:5} },
  'Gsus2':  { frets:[3,0,0,0,1,3] },
  'Absus2': { frets:[4,1,1,1,2,4] },
  'Asus2':  { frets:[-1,0,2,2,0,0] },
  'Bbsus2': { frets:[-1,1,3,3,1,1], barre:{fret:1,from:1,to:5} },
  'Bsus2':  { frets:[-1,2,4,4,2,2], barre:{fret:2,from:1,to:5} },

  // ── SUS4 ──
  'Csus4':  { frets:[-1,3,3,0,1,1] },
  'C#sus4': { frets:[-1,4,4,1,2,2], barre:{fret:1,from:2,to:5} },
  'Dsus4':  { frets:[-1,-1,0,2,3,3] },
  'Ebsus4': { frets:[-1,-1,1,3,4,4] },
  'Esus4':  { frets:[0,2,2,2,0,0] },
  'Fsus4':  { frets:[1,3,3,3,1,1], barre:{fret:1,from:0,to:5} },
  'F#sus4': { frets:[2,4,4,4,2,2], barre:{fret:2,from:0,to:5} },
  'Gsus4':  { frets:[3,3,0,0,1,3] },
  'Absus4': { frets:[4,4,1,1,2,4] },
  'Asus4':  { frets:[-1,0,2,2,3,0] },
  'Bbsus4': { frets:[-1,1,3,3,4,1], barre:{fret:1,from:1,to:5} },
  'Bsus4':  { frets:[-1,2,4,4,5,2], barre:{fret:2,from:1,to:5} },

  // ── DIM ──
  'Cdim':  { frets:[-1,3,4,5,4,-1] },
  'C#dim': { frets:[-1,4,5,3,5,-1] },
  'Ddim':  { frets:[-1,-1,0,1,0,1] },
  'Ebdim': { frets:[-1,-1,1,2,1,2] },
  'Edim':  { frets:[0,1,2,3,2,-1] },
  'Fdim':  { frets:[1,2,3,4,3,-1] },
  'F#dim': { frets:[2,3,4,5,4,-1] },
  'Gdim':  { frets:[3,4,5,3,-1,-1] },
  'Abdim': { frets:[4,5,3,4,-1,-1] },
  'Adim':  { frets:[-1,0,1,2,1,-1] },
  'Bbdim': { frets:[-1,1,2,3,2,-1] },
  'Bdim':  { frets:[-1,2,3,4,3,-1] },
};

// ── Piano interval library ─────────────────────────────────────
const PIANO_INTERVALS = {
  '':      [0,4,7],
  'm':     [0,3,7],
  '7':     [0,4,7,10],
  'maj7':  [0,4,7,11],
  'm7':    [0,3,7,10],
  'sus2':  [0,2,7],
  'sus4':  [0,5,7],
  'dim':   [0,3,6],
  'dim7':  [0,3,6,9],
  'aug':   [0,4,8],
  'add9':  [0,4,7,14],
  '6':     [0,4,7,9],
  'm6':    [0,3,7,9],
  '9':     [0,4,7,10,14],
  'maj9':  [0,4,7,11,14],
};

const NOTE_TO_SEMITONE = {
  'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,
  'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,
  'Ab':8,'A':9,'A#':10,'Bb':10,'B':11,
};

// ── Resolve chord name through enharmonic aliases ──────────────
function resolveChord(name) {
  return ENHARMONIC[name] || name;
}

// ── Guitar Diagram ─────────────────────────────────────────────
function GuitarDiagram({ chordName }) {
  const resolved = resolveChord(chordName);
  const data = GUITAR_CHORDS[resolved];
  if (!data) return <NotFound name={chordName} instrument="guitar" />;

  const { frets, barre } = data;
  const W = 200, H = 220;
  const left = 30, top = 40, right = W - 20;
  const strW = (right - left) / 5;
  const fretH = 30;
  const numFrets = 5;

  const activeFrets = frets.filter(f => f > 0);
  const minFret = activeFrets.length ? Math.min(...activeFrets) : 1;
  const offset = minFret > 2 ? minFret - 1 : 0;

  return (
    <svg width={W} height={H} style={{ display:'block', margin:'0 auto' }}>
      {offset > 0
        ? <text x={left-8} y={top+fretH*0.6} textAnchor="end" fontSize={11} fill="#6b6456">{offset+1}fr</text>
        : <rect x={left} y={top-4} width={right-left} height={4} rx={2} fill="#c8a84b" />
      }
      {Array.from({length:numFrets+1}).map((_,i) => (
        <line key={i} x1={left} y1={top+i*fretH} x2={right} y2={top+i*fretH} stroke="#2a2820" strokeWidth={1} />
      ))}
      {frets.map((_,i) => (
        <line key={i} x1={left+i*strW} y1={top} x2={left+i*strW} y2={top+numFrets*fretH} stroke="#3a3830" strokeWidth={1} />
      ))}
      {barre && barre.fret >= offset+1 && barre.fret <= offset+numFrets && (
        <rect
          x={left+barre.from*strW-8} y={top+(barre.fret-offset-1)*fretH+6}
          width={(barre.to-barre.from)*strW+16} height={fretH-12}
          rx={9} fill="#c8a84b" opacity={0.85}
        />
      )}
      {frets.map((fret,i) => {
        if (fret <= 0) return null;
        const adj = fret - offset;
        if (adj < 1 || adj > numFrets) return null;
        return <circle key={i} cx={left+i*strW} cy={top+(adj-1)*fretH+fretH/2} r={9} fill="#c8a84b" />;
      })}
      {frets.map((fret,i) => {
        const cx = left+i*strW;
        if (fret===-1) return <text key={i} x={cx} y={top-10} textAnchor="middle" fontSize={13} fill="#c84b4b">×</text>;
        if (fret===0)  return <circle key={i} cx={cx} cy={top-10} r={5} fill="none" stroke="#6b6456" strokeWidth={1.5} />;
        return null;
      })}
      {['E','A','D','G','B','e'].map((label,i) => (
        <text key={i} x={left+i*strW} y={top+numFrets*fretH+16} textAnchor="middle" fontSize={10} fill="#4a4438">{label}</text>
      ))}
    </svg>
  );
}

// ── Piano Diagram ──────────────────────────────────────────────
function PianoDiagram({ chordName }) {
  // Parse root, suffix, and optional bass note (slash chord)
  const match = chordName.match(/^([A-G][#b]?)(.*?)(?:\/([A-G][#b]?))?$/);
  if (!match) return <NotFound name={chordName} instrument="piano" />;

  const root   = match[1];
  const suffix = match[2] || '';
  const bass   = match[3]; // e.g. "E" in "Dm/E"

  const intervals = PIANO_INTERVALS[suffix] ?? PIANO_INTERVALS[''];
  const rootSemi  = NOTE_TO_SEMITONE[root];
  const bassSemi  = bass ? NOTE_TO_SEMITONE[bass] : null;
  if (rootSemi === undefined) return <NotFound name={chordName} instrument="piano" />;

  // Active chord tones (mod 12)
  const chordTones = new Set(intervals.map(i => (rootSemi + i) % 12));
  // Bass note gets a different highlight colour
  const bassSet = bassSemi !== null ? new Set([bassSemi % 12]) : new Set();

  const W = 200, H = 130;
  const keys = 14;
  const keyW = W / keys;
  const keyH = H - 20;
  const blackH = keyH * 0.62;
  const whitePattern = [0,2,4,5,7,9,11];
  const blackPattern = [1,3,null,6,8,10,null];

  const whiteKeys = [];
  for (let oct = 0; oct < 2; oct++)
    whitePattern.forEach(s => whiteKeys.push((s + oct*12) % 12));

  const blackPositions = [];
  let wi = 0;
  for (let oct = 0; oct < 2; oct++) {
    blackPattern.forEach((s, bi) => {
      if (s !== null)
        blackPositions.push({ x: (wi+bi+1)*keyW - keyW*0.32, semitone: (s+oct*12)%12 });
    });
    wi += 7;
  }

  const keyColor = (semitone, isBlack) => {
    if (bassSet.has(semitone)) return '#4bc84b';   // bass note = green
    if (chordTones.has(semitone)) return '#c8a84b'; // chord tone = gold
    return isBlack ? '#1a1916' : '#e8e0d0';          // default
  };

  return (
    <svg width={W} height={H} style={{ display:'block', margin:'0 auto' }}>
      {whiteKeys.map((semitone,i) => (
        <rect key={i} x={i*keyW+1} y={0} width={keyW-2} height={keyH}
          rx={2} fill={keyColor(semitone,false)} stroke="#2a2820" strokeWidth={1} />
      ))}
      {blackPositions.map((bp,i) => (
        <rect key={i} x={bp.x} y={0} width={keyW*0.62} height={blackH}
          rx={2} fill={keyColor(bp.semitone,true)} stroke="#0f0e0d" strokeWidth={1} />
      ))}
      {/* Legend */}
      <text x={4} y={H-4} fontSize={9} fill="#6b6456" fontFamily="sans-serif">gold = chord</text>
      {bass && <text x={W/2} y={H-4} fontSize={9} fill="#4bc84b" fontFamily="sans-serif" textAnchor="middle">green = bass ({bass})</text>}
    </svg>
  );
}

// ── Audio Engine ───────────────────────────────────────────────
// Uses the Web Audio API — built into every browser, no libraries needed.
// Piano: layered sine + triangle waves with soft attack and decay
// Guitar: sawtooth waves with a sharp attack and faster decay to mimic a pluck

const NOTE_FREQ = {
  'C':261.63,'C#':277.18,'Db':277.18,'D':293.66,'D#':311.13,'Eb':311.13,
  'E':329.63,'F':349.23,'F#':369.99,'Gb':369.99,'G':392.00,'G#':415.30,
  'Ab':415.30,'A':440.00,'A#':466.16,'Bb':466.16,'B':493.88,
};

// Get frequencies for all notes in a chord
function getChordFrequencies(chordName) {
  const parsed = chordName.match(/^([A-G][#b]?)(.*?)(?:\/([A-G][#b]?))?$/);
  if (!parsed) return [];
  const root = parsed[1];
  const suffix = parsed[2] || '';
  const bass = parsed[3];

  const intervals = {
    '':     [0,4,7],
    'm':    [0,3,7],
    '7':    [0,4,7,10],
    'maj7': [0,4,7,11],
    'm7':   [0,3,7,10],
    'sus2': [0,2,7],
    'sus4': [0,5,7],
    'dim':  [0,3,6],
    'aug':  [0,4,8],
  }[suffix] ?? [0,4,7];

  const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const rootIdx = NOTES.indexOf(
    NOTE_FREQ[root] ? root : Object.keys(NOTE_FREQ).find(k => NOTE_FREQ[k] === NOTE_FREQ[root])
  );

  const freqs = intervals.map(interval => {
    const noteIdx = (rootIdx + interval) % 12;
    const octaveShift = rootIdx + interval >= 12 ? 2 : 1;
    return NOTE_FREQ[NOTES[noteIdx]] * octaveShift;
  });

  // Add bass note an octave lower if slash chord
  if (bass && NOTE_FREQ[bass]) {
    freqs.unshift(NOTE_FREQ[bass] * 0.5);
  }

  return freqs;
}

async function playPianoChord(chordName, ctx) {
  await ctx.resume();
  const freqs = getChordFrequencies(chordName);
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.4, ctx.currentTime);
  master.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
  master.connect(ctx.destination);

  freqs.forEach(freq => {
    // Layer sine + triangle for a warmer piano-like tone
    ['sine', 'triangle'].forEach((type, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(i === 0 ? 0.6 : 0.3, ctx.currentTime);
      // Soft attack
      gain.gain.linearRampToValueAtTime(i === 0 ? 0.7 : 0.35, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.2);
      osc.connect(gain);
      gain.connect(master);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 2.5);
    });
  });

  setTimeout(() => {}, 3000);
}

async function playGuitarChord(chordName, ctx) {
  await ctx.resume();
  const freqs = getChordFrequencies(chordName);

  // Strum effect: each string starts slightly after the previous
  freqs.forEach((freq, i) => {
    const strumDelay = i * 0.04; // 40ms between each string = natural strum
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    // Sawtooth + slight detune for a plucked string character
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + strumDelay);
    osc.detune.setValueAtTime(Math.random() * 4 - 2, ctx.currentTime); // subtle humanization

    // Sharp attack, faster decay than piano
    gain.gain.setValueAtTime(0, ctx.currentTime + strumDelay);
    gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + strumDelay + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + strumDelay + 1.4);

    // Light lowpass filter to soften the sawtooth harshness
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + strumDelay);
    osc.stop(ctx.currentTime + strumDelay + 1.6);
  });

  setTimeout(() => {}, 2500);
}

// ── Not Found ──────────────────────────────────────────────────
function NotFound({ name, instrument }) {
  return (
    <div style={{ textAlign:'center', padding:'20px 0', color:'#4a4438', fontFamily:'sans-serif', fontSize:13 }}>
      No {instrument} diagram for {name} yet
    </div>
  );
}

// ── Shared AudioContext ────────────────────────────────────────
// iOS Safari requires AudioContext to be created AND unlocked
// synchronously within a direct user gesture (tap/click).
// We keep one shared context and unlock it on first use.
let sharedCtx = null;

function getAudioContext() {
  if (!sharedCtx) {
    sharedCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume synchronously — this is the key iOS fix
  if (sharedCtx.state === 'suspended') {
    sharedCtx.resume();
  }
  return sharedCtx;
}

// ── Main Modal ─────────────────────────────────────────────────
export default function ChordDiagram({ chord, onClose }) {
  const [instrument, setInstrument] = useState('guitar');
  const [playing, setPlaying]       = useState(false);
  const displayChord = chord;

  const playChord = () => {
    if (playing) return;
    // Get/create context synchronously inside the tap handler
    // This is what iOS requires — no async, no await, no delay
    const ctx = getAudioContext();
    setPlaying(true);
    if (instrument === 'piano') playPianoChord(displayChord, ctx);
    else playGuitarChord(displayChord, ctx);
    setTimeout(() => setPlaying(false), instrument === 'piano' ? 2500 : 1800);
  };

  return (
    <>
      <div onClick={onClose} style={{
        position:'fixed', inset:0, zIndex:200,
        background:'rgba(0,0,0,0.6)', backdropFilter:'blur(2px)',
      }} />
      <div style={{
        position:'fixed', top:'50%', left:'50%', zIndex:201,
        transform:'translate(-50%,-50%)',
        background:'#141310', border:'1px solid #2a2820', borderRadius:16,
        padding:'24px', width:260, boxShadow:'0 20px 60px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <span style={{ fontSize:22, color:'#c8a84b', fontFamily:"Georgia,serif", letterSpacing:'0.04em' }}>
            {displayChord}
          </span>
          <button onClick={onClose} style={{
            background:'transparent', border:'1px solid #2a2820',
            borderRadius:6, color:'#6b6456', padding:'4px 9px', cursor:'pointer', fontSize:14,
          }}>✕</button>
        </div>

        {/* Instrument toggle */}
        <div style={{ display:'flex', background:'#1a1916', border:'1px solid #2a2820', borderRadius:8, overflow:'hidden', marginBottom:20 }}>
          {['guitar','piano'].map(inst => (
            <button key={inst} onClick={() => setInstrument(inst)} style={{
              flex:1, padding:'7px', background: instrument===inst ? '#2a2820' : 'transparent',
              border:'none', color: instrument===inst ? '#e8e0d0' : '#6b6456',
              cursor:'pointer', fontSize:12, fontFamily:'sans-serif', textTransform:'capitalize',
            }}>{inst}</button>
          ))}
        </div>

        {/* Diagram */}
        {instrument === 'guitar'
          ? <GuitarDiagram chordName={displayChord} />
          : <PianoDiagram  chordName={displayChord} />
        }

        {/* Play button */}
        <button onClick={playChord} style={{
          width:'100%', marginTop:16, padding:'10px',
          background: playing ? '#1a1916' : '#1e1c18',
          border: `1px solid ${playing ? '#3a3428' : '#4a4438'}`,
          borderRadius:8, cursor: playing ? 'default' : 'pointer',
          color: playing ? '#4a4438' : '#a09880',
          fontFamily:'sans-serif', fontSize:13,
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          transition:'all 0.2s',
        }}>
          {playing
            ? <><span style={{ fontSize:10 }}>●</span> playing...</>
            : <><span style={{ fontSize:14 }}>▶</span> Play chord</>
          }
        </button>
      </div>
    </>
  );
}

