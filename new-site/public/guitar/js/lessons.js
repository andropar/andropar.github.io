// Lesson content for the Learn tab. Buttons carry data-* attributes that app.js turns into sound:
//   data-notes="60,64,67"        play notes together (strum)
//   data-arp="60,64,67"          play one after another, then together
//   data-chord="0:maj"           strum the chord's first voicing
//   data-prog="0:major:0,4,5,3"  play a progression in a key (scale degrees)
// <svg data-neck="..."> placeholders are rendered by app.js (see renderLessonNecks).

import { INTERVAL_NAMES, QUALITIES, ROOT_NAMES } from "./theory.js";

const play = (attr, label = "▶ play") => `<button class="play" type="button" ${attr}>${label}</button>`;

const intervalRows = INTERVAL_NAMES.map(
  (iv) => `<tr><td class="mono">${iv.semi}</td><td><b>${iv.short}</b></td><td>${iv.name}</td><td class="muted">${iv.feel}</td><td>${play(`data-arp="60,${60 + iv.semi}"`)}</td></tr>`
).join("");

const chordRow = (q, formula) => {
  const Q = QUALITIES[q];
  const notes = Q.ints.map((i) => 60 + i.semi).join(",");
  return `<tr><td><b>C${Q.symbol}</b></td><td>${Q.name}</td><td class="mono">${formula}</td><td class="muted">${Q.feel}</td><td>${play(`data-arp="${notes}"`)}</td></tr>`;
};

export const LESSONS = [
  {
    id: "notes",
    title: "The 12 notes",
    html: () => `
      <p class="eyebrow">Lesson 1</p>
      <h2>The 12 notes, and why frets matter</h2>
      <p>Western music uses only 12 different notes, then repeats them higher and lower. Seven have letter names: <b>A B C D E F G</b>. The five in between get a sharp (♯, one step up) or flat (♭, one step down) name, so C♯ and D♭ are the same sound.</p>
      <div class="chips"><span class="chip">C</span><span class="chip">C♯/D♭</span><span class="chip">D</span><span class="chip">D♯/E♭</span><span class="chip">E</span><span class="chip">F</span><span class="chip">F♯/G♭</span><span class="chip">G</span><span class="chip">G♯/A♭</span><span class="chip">A</span><span class="chip">A♯/B♭</span><span class="chip">B</span></div>
      <p class="callout"><b>The one quirk to memorise:</b> there's nothing between B and C, and nothing between E and F. Everywhere else, there's a sharp/flat note between the letters.</p>
      <p>On guitar this becomes very concrete: <b>one fret = one half step</b> (one of those 12 notes). Move up 12 frets and you're back at the same note, an <b>octave</b> higher. That's why the 12th fret has the double dot.</p>
      <p>Here are the natural notes (no sharps or flats) on the whole neck. Notice the pattern on the low E string: E, F right next to it, then gaps of two frets, except between B and C.</p>
      <div class="neck-scroll mini-neck"><svg class="neck" data-neck="naturals"></svg></div>
      <p>Same note, several places: the 5th fret of the low E string is an A, the same pitch as the open A string. That's exactly how people tune by ear. Tap both to hear them match.</p>
      <p class="muted">Practical tip: learn the notes on the low E and A strings first. Every barre chord's name comes from the root on one of those two strings.</p>`,
  },
  {
    id: "intervals",
    title: "Intervals",
    html: () => `
      <p class="eyebrow">Lesson 2</p>
      <h2>Intervals: the distance between two notes</h2>
      <p>An interval is just how far apart two notes are, counted in half steps (frets). Every chord, scale and melody is a pattern of intervals, so once you hear intervals, theory stops being abstract.</p>
      <p>The names look odd at first (why is 4 frets a "third"?). That's because they count <i>letter names</i>: from C up to E you pass C, D, E, which is 3 letters, so it's a third. "Major" and "minor" then tell you which size of third.</p>
      <div class="table-scroll"><table>
        <thead><tr><th>Frets</th><th>Label</th><th>Name</th><th>How it feels</th><th></th></tr></thead>
        <tbody>${intervalRows}</tbody>
      </table></div>
      <p class="callout">The two that matter most for chords: the <b>major third (4 frets)</b> vs the <b>minor third (3 frets)</b>. That single fret is the whole difference between a happy and a sad chord.</p>`,
  },
  {
    id: "triads",
    title: "Building chords",
    html: () => `
      <p class="eyebrow">Lesson 3</p>
      <h2>Building chords: stacking thirds</h2>
      <p>A basic chord (a <b>triad</b>) is three notes: a <b>root</b>, a <b>third</b> above it, and a <b>fifth</b>. You build it by stacking two thirds. Which kinds of third you stack gives the chord its type.</p>
      <div class="table-scroll"><table>
        <thead><tr><th>Chord</th><th>Type</th><th>Frets from root</th><th>Sound</th><th></th></tr></thead>
        <tbody>
          ${chordRow("maj", "0 · 4 · 7")}
          ${chordRow("min", "0 · 3 · 7")}
          ${chordRow("dim", "0 · 3 · 6")}
          ${chordRow("aug", "0 · 4 · 8")}
          ${chordRow("5", "0 · 7")}
          ${chordRow("sus2", "0 · 2 · 7")}
          ${chordRow("sus4", "0 · 5 · 7")}
        </tbody>
      </table></div>
      <p><b>Worked example, C major:</b> start on C. Count 4 frets up: C♯, D, D♯, <b>E</b>. That's the major third. Count 3 more: F, F♯, <b>G</b>. That's the fifth. So C major = C, E, G. Lower the E by one fret to E♭ and you have C minor.</p>
      <div class="neck-scroll mini-neck"><svg class="neck" data-neck="cmaj"></svg></div>
      <p>The open C chord you already know (x32010) plays C, E, G, C, E: it repeats two of the notes in other octaves. Doubling notes doesn't change the chord's name; only the set of different notes counts.</p>
      <p class="callout">A chord's name = its root + its type. The root is usually (not always) the lowest note. When another chord tone is in the bass, it's written as a slash chord: C/E means "C major with E in the bass".</p>`,
  },
  {
    id: "sevenths",
    title: "Sevenths and colors",
    html: () => `
      <p class="eyebrow">Lesson 4</p>
      <h2>Seventh chords and other colors</h2>
      <p>Add a fourth note on top of a triad and you get richer chords. The most common is the <b>seventh</b>: stack one more third. Which seventh you add changes the mood a lot.</p>
      <div class="table-scroll"><table>
        <thead><tr><th>Chord</th><th>Type</th><th>Frets from root</th><th>Sound</th><th></th></tr></thead>
        <tbody>
          ${chordRow("7", "0 · 4 · 7 · 10")}
          ${chordRow("maj7", "0 · 4 · 7 · 11")}
          ${chordRow("m7", "0 · 3 · 7 · 10")}
          ${chordRow("m7b5", "0 · 3 · 6 · 10")}
          ${chordRow("6", "0 · 4 · 7 · 9")}
          ${chordRow("add9", "0 · 4 · 7 · 14")}
        </tbody>
      </table></div>
      <p><b>Why is "C7" not "C major 7"?</b> Plain "7" means the <i>minor</i> seventh (B♭ on C), and it's called the <b>dominant seventh</b> because it naturally appears on the 5th degree of a key (the dominant, next lesson). "maj7" spells out the major seventh (B on C), one fret below the octave.</p>
      <p>Some chords share exactly the same notes: C6 (C E G A) and Am7 (A C E G) are identical sets. The bass note decides what we call it, and in this app the detected bass note does the same job.</p>`,
  },
  {
    id: "keys",
    title: "Keys and progressions",
    html: () => `
      <p class="eyebrow">Lesson 5</p>
      <h2>Keys: why some chords belong together</h2>
      <p>A <b>key</b> is a home note plus a scale of 7 notes. The major scale is a fixed pattern of whole steps (W, 2 frets) and half steps (H, 1 fret):</p>
      <div class="formula"><span>W</span><span>W</span><span class="h">H</span><span>W</span><span>W</span><span>W</span><span class="h">H</span></div>
      <p>Starting on C, that gives C D E F G A B: all the white keys on a piano. Here it is along the A string, from C at fret 3 up to the next C at fret 15, so you can see the gaps:</p>
      <div class="neck-scroll mini-neck"><svg class="neck" data-neck="cscale"></svg></div>
      <p>Now build a triad on each note using <i>only notes from the scale</i>. You always get the same pattern of chord types, in every major key. These are written as Roman numerals: uppercase = major, lowercase = minor.</p>
      <div class="explore" style="margin:4px 0"><span>Pick a key:</span><select id="lessonKey">${ROOT_NAMES.map((n, i) => `<option value="${i}" ${i === 7 ? "selected" : ""}>${n} major</option>`).join("")}</select></div>
      <div class="diatonic" id="lessonDiatonic"></div>
      <p>Each chord has a job, called its <b>function</b> (shown under each chord as home / away / tension):</p>
      <ul>
        <li><b>Tonic</b> (I, also vi and iii): home, at rest.</li>
        <li><b>Predominant</b> (IV, ii): moves away and sets things up.</li>
        <li><b>Dominant</b> (V, vii°): tension that wants to go home to I.</li>
      </ul>
      <p>Most songs cycle home → away → tension → home. A few progressions you've heard thousands of times, in G major:</p>
      <div class="table-scroll"><table>
        <thead><tr><th>Numerals</th><th>In G</th><th>Where you've heard it</th><th></th></tr></thead>
        <tbody>
          <tr><td><b>I – V – vi – IV</b></td><td>G D Em C</td><td class="muted">The "four chord" pop progression</td><td>${play('data-prog="7:major:0,4,5,3"')}</td></tr>
          <tr><td><b>I – IV – V – I</b></td><td>G C D G</td><td class="muted">Folk, early rock and roll, blues</td><td>${play('data-prog="7:major:0,3,4,0"')}</td></tr>
          <tr><td><b>vi – IV – I – V</b></td><td>Em C G D</td><td class="muted">Same chords as above, started on the minor one: sounds sadder</td><td>${play('data-prog="7:major:5,3,0,4"')}</td></tr>
          <tr><td><b>ii – V – I</b></td><td>Am D G</td><td class="muted">The backbone of jazz</td><td>${play('data-prog="7:major:1,4,0"')}</td></tr>
          <tr><td><b>I – vi – IV – V</b></td><td>G Em C D</td><td class="muted">50s doo-wop</td><td>${play('data-prog="7:major:0,5,3,4"')}</td></tr>
        </tbody>
      </table></div>
      <p class="callout">That's why numerals are useful: learn I–V–vi–IV once and you can play it in any key. The Listen tab works out the key and the numerals for whatever you play.</p>`,
  },
  {
    id: "minor",
    title: "Minor keys",
    html: () => `
      <p class="eyebrow">Lesson 6</p>
      <h2>Minor keys and the relative minor</h2>
      <p>Play the C major scale but start and end on A: A B C D E F G. Same seven notes, different home, and it sounds sad. That's <b>A minor</b>, the <b>relative minor</b> of C major. Every major key has one: its vi chord.</p>
      <p>The chords are the same as in C major, just renumbered from A: i (Am), ii° (Bdim), III (C), iv (Dm), v (Em), VI (F), VII (G).</p>
      <p><b>One common twist:</b> the v chord (Em) is weak at pulling you home. So minor-key songs very often use a <b>major V</b> (E or E7) instead, borrowing a G♯ that makes a strong pull up to A. Listen to the difference:</p>
      <div class="row">${play('data-prog="9:minor:0,3,4,0"', "▶ Am – Dm – Em – Am")} ${play('data-prog="9:minor:0,3,104,0"', "▶ Am – Dm – E – Am")}</div>
      <p>This is why the app sometimes can't decide between, say, C major and A minor: they share all their notes. The chord you keep returning to, and the one you start and end on, gives it away.</p>`,
  },
  {
    id: "app",
    title: "How this app hears",
    html: () => `
      <p class="eyebrow">Lesson 7</p>
      <h2>How the app hears you, and how to help it</h2>
      <p>A plucked string doesn't vibrate at one frequency. A low A (110 Hz) also rings at 220, 330, 440, 550 Hz and up. These are <b>overtones</b> (harmonics). The 3rd overtone is a fifth higher (E) and the 5th is a major third higher (C♯), which is part of why a single note already "contains" a major chord.</p>
      <p>The app takes the spectrum of the mic signal ~25 times per second, finds the peaks, and groups peaks that are whole-number multiples of a lower one. Each group becomes one note. Those notes are compared with every chord type on every root, and the bass note breaks ties (C6 vs Am7). YIN, a pitch-tracking algorithm, gives the exact pitch for the tuner.</p>
      <ul>
        <li>Strum cleanly and let the chord ring. Muted or buzzing strings add noise.</li>
        <li>Keep the guitar 20–60 cm from the mic. Laptop mics work, but headset noise suppression can eat the sound.</li>
        <li>Single notes: play one string and mute the others with your palm.</li>
        <li>Detection lags a quarter of a second behind you. It needs some of the sound to work with.</li>
        <li>4-note chords (7ths) are harder than triads. If it says G when you play G7, the ♭7 is probably quiet: pick that string a bit harder.</li>
      </ul>`,
  },
];
