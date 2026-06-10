/* ===================================================================
   Windows 12 — Modern SVG Icon Set (Fluent-style gradient tiles)
   Each icon scales to the container's font-size (1em).
   =================================================================== */
const ICONS = (() => {
  function tile(id, c1, c2, glyph){
    return `<svg viewBox="0 0 48 48" style="width:1em;height:1em;display:block;filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
      <rect x="4" y="4" width="40" height="40" rx="12" fill="url(#${id})"/>
      ${glyph}</svg>`;
  }
  return {
    explorer: tile('i-exp','#ffce6b','#f59016',
      `<path d="M13 17h7l2.6 2.6H35a2.6 2.6 0 0 1 2.6 2.6v10.2A2.6 2.6 0 0 1 35 35H13a2.6 2.6 0 0 1-2.6-2.6V19.6A2.6 2.6 0 0 1 13 17z" fill="#fff"/>
       <path d="M10.4 22h27.2v1.6H10.4z" fill="#0003"/>`),
    browser: tile('i-br','#37b6ff','#1f6feb',
      `<circle cx="24" cy="24" r="11" fill="none" stroke="#fff" stroke-width="2.4"/>
       <path d="M13.4 24h21.2M24 13.2c4.2 5 4.2 16.6 0 21.6M24 13.2c-4.2 5-4.2 16.6 0 21.6" fill="none" stroke="#fff" stroke-width="2"/>`),
    editor: tile('i-ed','#6a8bff','#3b5bdb',
      `<rect x="15" y="12.5" width="18" height="23" rx="2.6" fill="#fff"/>
       <path d="M19 18.5h10M19 23.5h10M19 28.5h7" stroke="#6a8bff" stroke-width="2" stroke-linecap="round"/>
       <path d="M30 30l5-5 2.4 2.4-5 5-2.8.4z" fill="#ffd35d" stroke="#e0a93b" stroke-width=".6"/>`),
    calculator: tile('i-ca','#5a6675','#2b3440',
      `<rect x="15" y="12" width="18" height="24" rx="3" fill="#fff"/>
       <rect x="18" y="15" width="12" height="5" rx="1.4" fill="#2b3440"/>
       <g fill="#2b3440"><circle cx="20" cy="25" r="1.5"/><circle cx="24" cy="25" r="1.5"/><circle cx="28" cy="25" r="1.5"/>
       <circle cx="20" cy="30.5" r="1.5"/><circle cx="24" cy="30.5" r="1.5"/></g>
       <rect x="26.6" y="29" width="3" height="3" rx="1" fill="#f59016"/>`),
    terminal: tile('i-te','#2c313d','#11141b',
      `<path d="M15 18.5l5.5 5.5L15 29.5" stroke="#52e06a" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
       <path d="M24 30h9" stroke="#52e06a" stroke-width="2.6" stroke-linecap="round"/>`),
    settings: tile('i-se','#97a1b2','#5b6472',
      `<circle cx="24" cy="24" r="4.4" fill="none" stroke="#fff" stroke-width="2.6"/>
       <g stroke="#fff" stroke-width="2.6" stroke-linecap="round">
       <path d="M24 13v3.4M24 31.6V35M35 24h-3.4M16.4 24H13M31.8 16.2l-2.4 2.4M18.6 29.4l-2.4 2.4M31.8 31.8l-2.4-2.4M18.6 18.6l-2.4-2.4"/></g>`),
    paint: tile('i-pa','#ff6aa9','#a855f7',
      `<path d="M24 13c-7 0-12 4.6-12 10.6 0 4.8 3.6 6.6 7 6.6 1.6 0 1.8 1 1.8 2 0 2.2 1.4 2.8 3.2 2.8 6.4 0 12-4.2 12-11C36 17 30.6 13 24 13z" fill="#fff"/>
       <circle cx="19" cy="22" r="1.9" fill="#ff5d5d"/><circle cx="24" cy="19.4" r="1.9" fill="#ffd35d"/><circle cx="29" cy="22" r="1.9" fill="#5db3ff"/><circle cx="27" cy="27" r="1.9" fill="#52d36a"/>`),
    photos: tile('i-ph','#34d399','#0e9f73',
      `<rect x="12.5" y="15" width="23" height="18" rx="3" fill="#fff"/>
       <circle cx="19.5" cy="21" r="2.3" fill="#ffce54"/>
       <path d="M14 32l6-7 4.5 4.5 4-3.5 5.5 6z" fill="#34d399"/>`),
    taskmgr: tile('i-tm','#22d3ee','#0e8fd9',
      `<g fill="#fff"><rect x="14.5" y="26" width="4.2" height="8" rx="1.4"/><rect x="21.9" y="20" width="4.2" height="14" rx="1.4"/><rect x="29.3" y="15.5" width="4.2" height="18.5" rx="1.4"/></g>`),
    minesweeper: tile('i-mi','#ff7a7a','#e23838',
      `<circle cx="22.5" cy="26" r="8" fill="#fff"/><circle cx="20" cy="23.5" r="2" fill="#e23838"/>
       <path d="M29 19l3.5-3.5M32 15.5l2.6 1M33 14l-1 2.6" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`),
    clock: tile('i-cl','#c084fc','#7c3aed',
      `<circle cx="24" cy="24" r="11" fill="#fff"/><path d="M24 17.5v7l4.4 3" stroke="#7c3aed" stroke-width="2.4" fill="none" stroke-linecap="round"/>`),
    about: tile('i-ab','#3cc6ff','#2563eb',
      `<g fill="#fff"><rect x="14" y="14" width="8.6" height="8.6" rx="1.8"/><rect x="25.4" y="14" width="8.6" height="8.6" rx="1.8"/><rect x="14" y="25.4" width="8.6" height="8.6" rx="1.8"/><rect x="25.4" y="25.4" width="8.6" height="8.6" rx="1.8"/></g>`),
    recycle: tile('i-rc','#9aa6b6','#647082',
      `<path d="M16.5 19h15l-1.3 15.2a2.2 2.2 0 0 1-2.2 2H20a2.2 2.2 0 0 1-2.2-2z" fill="#fff"/>
       <path d="M14.5 18.5h19M20.5 18.5l1-2.4h5l1 2.4" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/>
       <path d="M21 23v8M27 23v8" stroke="#647082" stroke-width="2" stroke-linecap="round"/>`),
    store: tile('i-st','#fbbf24','#f97316',
      `<path d="M16 19h16l-1.4 15a2.2 2.2 0 0 1-2.2 2H19.6a2.2 2.2 0 0 1-2.2-2z" fill="#fff"/>
       <path d="M19.5 19a4.5 4.5 0 0 1 9 0" fill="none" stroke="#fff" stroke-width="2.4"/>
       <path d="M22 26l2 2 4-4" stroke="#f97316" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
    assistant: tile('i-as','#a78bfa','#ec4899',
      `<path d="M24 12.5l2.4 6.8L33.2 22l-6.8 2.7L24 31.5l-2.4-6.8L14.8 22l6.8-2.7z" fill="#fff"/>
       <path d="M32.5 28l1.1 2.9 2.9 1.1-2.9 1.1-1.1 2.9-1.1-2.9-2.9-1.1 2.9-1.1z" fill="#fff" opacity=".85"/>`),
    widgets: tile('i-wi','#60a5fa','#22d3ee',
      `<g fill="#fff"><rect x="14" y="14" width="9" height="9" rx="2.2"/><rect x="25.5" y="14" width="9" height="13" rx="2.2"/><rect x="14" y="25.5" width="9" height="9" rx="2.2"/><rect x="25.5" y="29.5" width="9" height="5" rx="2.2"/></g>`),
    music: tile('i-mu','#fb7185','#be123c',
      `<path d="M31 14.5l-11 2.2v12.6a3.7 3.7 0 1 0 2 3.3V20.4l7-1.4v6.1a3.7 3.7 0 1 0 2 3.3z" fill="#fff"/>`),

    /* monochrome system glyphs (use currentColor) */
    search: `<svg viewBox="0 0 24 24" style="width:1em;height:1em;display:block" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>`,
    sparkle: `<svg viewBox="0 0 24 24" style="width:1em;height:1em;display:block" fill="currentColor"><path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8z"/><path d="M18 14l.9 2.6 2.6.9-2.6.9L18 21l-.9-2.6-2.6-.9 2.6-.9z" opacity=".7"/></svg>`,
    grid: `<svg viewBox="0 0 24 24" style="width:1em;height:1em;display:block" fill="currentColor"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
  };
})();
