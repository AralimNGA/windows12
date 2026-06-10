/* ===================================================================
   Windows 12 — Extras: Command Palette, Copilot, Widgets, Weather,
                Living Wallpaper, Snap Layouts
   =================================================================== */
const Extras = (() => {

  /* ---------------- real weather (Open-Meteo, no key, CORS) ------- */
  const WCODE = {0:['☀️','Klar'],1:['🌤️','Überwiegend klar'],2:['⛅','Teils bewölkt'],3:['☁️','Bewölkt'],
    45:['🌫️','Nebel'],48:['🌫️','Reifnebel'],51:['🌦️','Leichter Niesel'],61:['🌧️','Regen'],63:['🌧️','Regen'],
    65:['🌧️','Starker Regen'],71:['🌨️','Schnee'],73:['🌨️','Schnee'],80:['🌦️','Schauer'],81:['🌦️','Schauer'],
    95:['⛈️','Gewitter'],96:['⛈️','Gewitter']};
  let weatherCache = null;
  async function getWeather(){
    if(weatherCache && Date.now()-weatherCache.t < 600000) return weatherCache.data;
    let lat=52.52, lon=13.405, city='Berlin';
    try{
      const d = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto`).then(r=>r.json());
      const data = { temp:Math.round(d.current.temperature_2m), code:d.current.weather_code,
        hi:Math.round(d.daily.temperature_2m_max[0]), lo:Math.round(d.daily.temperature_2m_min[0]), city };
      weatherCache = { t:Date.now(), data };
      return data;
    }catch(e){ return null; }
  }
  async function refreshTaskbarWeather(retry){
    const el = document.getElementById('tb-weather'); if(!el) return;
    const w = await getWeather();
    if(w){ const [emoji] = WCODE[w.code]||['🌡️','']; el.textContent = `${emoji} ${w.temp}°C`; }
    else if((retry||0) < 4){ setTimeout(()=>refreshTaskbarWeather((retry||0)+1), 2500); }  // cold-start retry
  }

  /* ====================== LIVING WALLPAPER ======================== */
  function buildLivingBg(){
    const desk = document.getElementById('desktop');
    if(document.getElementById('living-bg')) return;
    const bg = document.createElement('div'); bg.id='living-bg';
    bg.innerHTML = `<span class="blob b1"></span><span class="blob b2"></span><span class="blob b3"></span><span class="blob b4"></span>`;
    if(Win12.prefs.animBg === false) bg.style.display = 'none';
    desk.insertBefore(bg, desk.firstChild);
  }

  /* ====================== COMMAND PALETTE ========================= */
  function buildPalette(){
    if(document.getElementById('cmd-palette')) return;
    const el = document.createElement('div'); el.id='cmd-palette'; el.className='hidden';
    el.innerHTML = `
      <div class="cp-box">
        <div class="cp-input-row"><span class="cp-ico">${ICONS.search}</span>
          <input id="cp-input" placeholder="Apps, Dateien, Befehle, Rechnen, Web — alles suchen…" autocomplete="off"></div>
        <div id="cp-results"></div>
        <div class="cp-foot"><span>↑↓ Navigieren</span><span>↵ Öffnen</span><span>Esc Schließen</span></div>
      </div>`;
    document.getElementById('desktop').appendChild(el);
    el.addEventListener('mousedown', e=>{ if(e.target===el) closePalette(); });
    const input = el.querySelector('#cp-input');
    input.addEventListener('input', ()=>renderResults(input.value));
    input.addEventListener('keydown', e=>{
      const items = [...el.querySelectorAll('.cp-item')];
      let idx = items.findIndex(i=>i.classList.contains('sel'));
      if(e.key==='ArrowDown'){ e.preventDefault(); idx=Math.min(items.length-1,idx+1); select(items,idx); }
      else if(e.key==='ArrowUp'){ e.preventDefault(); idx=Math.max(0,idx-1); select(items,idx); }
      else if(e.key==='Enter'){ e.preventDefault(); (items[idx]||items[0])?.click(); }
      else if(e.key==='Escape'){ closePalette(); }
    });
  }
  function select(items, idx){ items.forEach(i=>i.classList.remove('sel')); if(items[idx]){ items[idx].classList.add('sel'); items[idx].scrollIntoView({block:'nearest'}); } }

  function renderResults(q){
    const box = document.getElementById('cp-results');
    q = q.trim();
    const results = [];
    // math
    if(/^[-+*/%(). 0-9]+$/.test(q) && /[-+*/]/.test(q)){
      try{ const r = Function('"use strict";return('+q+')')(); results.push({icon:'🟰', title:`${q} = ${r}`, sub:'Ergebnis · Enter kopiert', act:()=>navigator.clipboard?.writeText(''+r)}); }catch(e){}
    }
    // apps
    const ql = q.toLowerCase();
    Object.keys(APPS).forEach(k=>{ const a=APPS[k];
      if(!q || a.title.toLowerCase().includes(ql) || k.includes(ql))
        results.push({iconSvg:a.icon, title:a.title, sub:'App öffnen', act:()=>WM.open(k)});
    });
    // commands
    const cmds = [
      {t:'Dunkelmodus umschalten', s:'Design', kw:'design theme dunkel hell dark', act:()=>Win12.toggleTheme()},
      {t:'Einstellungen öffnen', s:'System', kw:'settings', act:()=>WM.open('settings')},
      {t:'Sperren / Abmelden', s:'System', kw:'lock sperren', act:()=>location.reload()},
      {t:'Alle Fenster minimieren', s:'Fenster', kw:'desktop minimieren', act:()=>WM.minimizeAll()},
      {t:'Copilot öffnen', s:'KI', kw:'copilot assistent ki ai', act:()=>toggleAssistant(true)},
      {t:'Widgets öffnen', s:'Widgets', kw:'widgets wetter', act:()=>toggleWidgets(true)},
    ];
    cmds.forEach(c=>{ if(!q || (c.t+' '+c.kw).toLowerCase().includes(ql)) results.push({icon:'⚡', title:c.t, sub:c.s, act:c.act}); });
    // files (VFS search)
    if(q.length>=2){ searchVFS('C:/Users/Admin', ql, results, 0); }
    // web search fallback
    if(q.length>=2) results.push({icon:'🌐', title:`„${q}" im Web suchen`, sub:'Edge · echte Suche', act:()=>{ const id=WM.open('browser'); const w=WM.windows.get(id); w.state.searchQuery=q; w.app.render(w.el.querySelector('.win-body'), w); }});

    box.innerHTML = results.slice(0,9).map((r,i)=>`
      <div class="cp-item ${i===0?'sel':''}" data-i="${i}">
        <span class="cp-i">${r.iconSvg||r.icon||'•'}</span>
        <span class="cp-meta"><b>${r.title}</b><small>${r.sub||''}</small></span></div>`).join('')
      || `<div class="cp-empty">Keine Treffer</div>`;
    box.querySelectorAll('.cp-item').forEach((el,i)=> el.onclick=()=>{ closePalette(); results[i].act&&results[i].act(); });
  }
  function searchVFS(path, q, out, depth){
    if(depth>4) return;
    VFS.list(path).forEach(n=>{ const full=path+'/'+n.name;
      if(n.name.toLowerCase().includes(q)) out.push({icon: n.type==='dir'?'📁':'📄', title:n.name, sub:full,
        act:()=> n.type==='dir' ? openExplorerAt(full) : Win12.openFileInNotepad(full) });
      if(n.type==='dir') searchVFS(full,q,out,depth+1);
    });
  }
  function openExplorerAt(path){ const id=WM.open('explorer'); const w=WM.windows.get(id); w.state.path=path; w.app.render(w.el.querySelector('.win-body'),w); }

  function openPalette(){ buildPalette(); const el=document.getElementById('cmd-palette'); el.classList.remove('hidden');
    const inp=el.querySelector('#cp-input'); inp.value=''; renderResults(''); setTimeout(()=>inp.focus(),20); }
  function closePalette(){ document.getElementById('cmd-palette')?.classList.add('hidden'); }

  /* ====================== COPILOT ASSISTANT ====================== */
  function buildAssistant(){
    if(document.getElementById('copilot')) return;
    const el = document.createElement('div'); el.id='copilot'; el.className='hidden';
    el.innerHTML = `
      <div class="cop-head"><span class="cop-title">${ICONS.sparkle} Copilot</span>
        <button class="cop-close">✕</button></div>
      <div class="cop-msgs" id="cop-msgs"></div>
      <div class="cop-suggest" id="cop-suggest"></div>
      <div class="cop-input-row">
        <input id="cop-input" placeholder="Frag mich etwas oder gib einen Befehl…">
        <button id="cop-send">➤</button></div>`;
    document.getElementById('desktop').appendChild(el);
    el.querySelector('.cop-close').onclick=()=>toggleAssistant(false);
    const input = el.querySelector('#cop-input');
    const send = ()=>{ const v=input.value.trim(); if(!v) return; input.value=''; userSay(v); };
    el.querySelector('#cop-send').onclick=send;
    input.addEventListener('keydown',e=>{ if(e.key==='Enter') send(); });
    // greeting + chips
    addMsg('bot', 'Hi! Ich bin **Copilot** für Windows 12. Ich kann Apps öffnen, das Design ändern, rechnen, das Wetter sagen und im Web suchen. Probier die Vorschläge unten 👇');
    const chips = ['Öffne den Rechner','Wie ist das Wetter?','Dunkelmodus an','Rechne 1234 * 56','Suche nach Katzen'];
    el.querySelector('#cop-suggest').innerHTML = chips.map(c=>`<button class="cop-chip">${c}</button>`).join('');
    el.querySelectorAll('.cop-chip').forEach(b=> b.onclick=()=>userSay(b.textContent));
  }
  function addMsg(who, text){
    const box = document.getElementById('cop-msgs');
    const d = document.createElement('div'); d.className='cop-msg '+who;
    d.innerHTML = text.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
    box.appendChild(d); box.scrollTop = box.scrollHeight;
    return d;
  }
  async function userSay(text){
    addMsg('user', text);
    const typing = addMsg('bot', '<i class="cop-typing">●●●</i>');
    const reply = await think(text);
    typing.innerHTML = reply.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
    document.getElementById('cop-msgs').scrollTop = 1e9;
  }
  async function think(text){
    const t = text.toLowerCase().trim();
    const aliases = {rechner:'calculator',taschenrechner:'calculator',calculator:'calculator',
      explorer:'explorer',dateien:'explorer','datei-explorer':'explorer',terminal:'terminal',konsole:'terminal',powershell:'terminal',
      editor:'notepad',notepad:'notepad',browser:'browser',edge:'browser',internet:'browser',
      einstellungen:'settings',settings:'settings',paint:'paint',malen:'paint',zeichnen:'paint',
      fotos:'photos',bilder:'photos',minesweeper:'minesweeper',uhr:'clock','task-manager':'taskmgr',taskmanager:'taskmgr'};
    // open app
    if(/(öffne|open|starte|zeig|mach.*auf)/.test(t)){
      for(const k in aliases){ if(t.includes(k)){ WM.open(aliases[k]); return `Öffne **${APPS[aliases[k]].title}** für dich. ✨`; } }
    }
    // theme
    if(/(dunkelmodus|dunkel|dark mode|dark)/.test(t)){ if(document.body.classList.contains('light')) Win12.toggleTheme(); return 'Dunkelmodus ist jetzt **an**. 🌙'; }
    if(/(hellmodus|hell|light mode|heller)/.test(t)){ if(!document.body.classList.contains('light')) Win12.toggleTheme(); return 'Hellmodus ist jetzt **an**. ☀️'; }
    // wallpaper
    const wm = t.match(/(hintergrund|wallpaper).*?(\d)/); if(wm){ Win12.setWallpaper(+wm[2]-1); return `Hintergrund **${wm[2]}** gesetzt. 🖼️`; }
    if(/(hintergrund|wallpaper)/.test(t)){ Win12.setWallpaper(Math.floor(Math.random()*Win12.wallpapers.length)); return 'Neuer Hintergrund gesetzt! 🎨'; }
    // time/date
    if(/(wie spät|uhrzeit|zeit|uhr)/.test(t)) return `Es ist **${new Date().toLocaleTimeString('de-DE')}**. ⏰`;
    if(/(datum|welcher tag|heute)/.test(t)) return `Heute ist **${new Date().toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}**. 📅`;
    // weather
    if(/(wetter|temperatur|regne)/.test(t)){ const w=await getWeather(); if(!w) return 'Ich konnte das Wetter gerade nicht abrufen. 🌐'; const [e,desc]=WCODE[w.code]||['🌡️','']; return `In **${w.city}**: ${e} **${w.temp}°C**, ${desc} (↑${w.hi}° ↓${w.lo}°).`; }
    // math
    if(/[-+*/].*[0-9]/.test(t) && /[0-9]/.test(t)){ const expr=t.replace(/[^0-9+\-*/%(). ]/g,'').trim(); try{ const r=Function('"use strict";return('+expr+')')(); if(r!==undefined&&!isNaN(r)) return `**${expr.trim()} = ${r}** 🧮`; }catch(e){} }
    // search
    const sm = t.match(/(such[e]?|google|finde|web).*?(nach|for)?\s+(.+)/);
    if(/(such|google|finde)/.test(t)){ const q = (sm&&sm[3]) ? sm[3] : t.replace(/(suche?|google|finde|nach|im web)/g,'').trim(); if(q){ const id=WM.open('browser'); const w=WM.windows.get(id); w.state.searchQuery=q; w.app.render(w.el.querySelector('.win-body'),w); return `Ich suche im Web nach **„${q}"**. 🔎`; } }
    // who/help
    if(/(wer bist du|was kannst du|hilfe|help)/.test(t)) return 'Ich bin **Copilot**, dein Assistent in Windows 12. Sag z.B. *„öffne Paint"*, *„dunkelmodus an"*, *„rechne 42*7"*, *„wie ist das Wetter"* oder *„suche nach Pinguinen"*.';
    if(/(hallo|hi|hey|moin|servus)/.test(t)) return 'Hallo! 👋 Wie kann ich dir helfen?';
    if(/(danke|thx|merci)/.test(t)) return 'Gern geschehen! 😊';
    // fallback
    return 'Das habe ich noch nicht gelernt 🤔 — aber ich kann Apps öffnen, rechnen, das Wetter sagen, das Design ändern und im Web suchen. Versuch z.B. *„öffne Terminal"*.';
  }
  function toggleAssistant(force){ buildAssistant(); const el=document.getElementById('copilot');
    const show = force!==undefined ? force : el.classList.contains('hidden');
    el.classList.toggle('hidden', !show); if(show) setTimeout(()=>el.querySelector('#cop-input').focus(),50); }

  /* ====================== WIDGETS BOARD =========================== */
  function buildWidgets(){
    if(document.getElementById('widgets-board')) return;
    const el = document.createElement('div'); el.id='widgets-board'; el.className='hidden';
    el.innerHTML = `
      <div class="wb-grid">
        <div class="wb-card wb-weather"><div class="wb-loading">Wetter lädt…</div></div>
        <div class="wb-card wb-clock"><div class="wb-time">--:--</div><div class="wb-date"></div></div>
        <div class="wb-card wb-notes"><b>📝 Schnellnotiz</b><textarea placeholder="Tippe etwas… (wird gespeichert)"></textarea></div>
        <div class="wb-card wb-sys"><b>💻 System</b><div class="wb-sysrows"></div></div>
      </div>`;
    document.getElementById('desktop').appendChild(el);
    // notes persistence
    const ta = el.querySelector('.wb-notes textarea');
    ta.value = localStorage.getItem('win12_note')||'';
    ta.addEventListener('input', ()=>localStorage.setItem('win12_note', ta.value));
    // clock
    const upd = ()=>{ const n=new Date(); el.querySelector('.wb-time').textContent=n.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
      el.querySelector('.wb-date').textContent=n.toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'}); };
    upd(); setInterval(upd,1000);
  }
  async function fillWidgets(){
    const w = await getWeather();
    const card = document.querySelector('.wb-weather');
    if(card){ if(w){ const [e,desc]=WCODE[w.code]||['🌡️','']; card.innerHTML=`<div class="wb-wemoji">${e}</div>
      <div class="wb-wtemp">${w.temp}°</div><div class="wb-wdesc">${desc}</div><div class="wb-wcity">${w.city} · ↑${w.hi}° ↓${w.lo}°</div>`; }
      else card.innerHTML=`<div class="wb-loading">Wetter nicht verfügbar 🌐</div>`; }
    const sys = document.querySelector('.wb-sysrows');
    if(sys) sys.innerHTML = `
      <div><span>Fenster</span><b>${WM.getWindows().length}</b></div>
      <div><span>Auflösung</span><b>${window.innerWidth}×${window.innerHeight}</b></div>
      <div><span>Browser</span><b>${navigator.userAgent.split(') ')[0].split('(')[1]?.split(';')[0]||'Web'}</b></div>
      <div><span>OS</span><b>Windows 12 Pro</b></div>`;
  }
  function toggleWidgets(force){ buildWidgets(); const el=document.getElementById('widgets-board');
    const show = force!==undefined ? force : el.classList.contains('hidden');
    el.classList.toggle('hidden', !show); if(show) fillWidgets(); }

  /* ====================== SNAP LAYOUTS POPUP ===================== */
  function buildSnapPopup(){
    if(document.getElementById('snap-popup')) return;
    const el = document.createElement('div'); el.id='snap-popup'; el.className='hidden';
    el.innerHTML = `
      <div class="sp-layout" data-l="halves"><i></i><i></i></div>
      <div class="sp-layout sp-quad" data-l="quad"><i></i><i></i><i></i><i></i></div>`;
    document.getElementById('desktop').appendChild(el);
    let zoneHandler=null;
    el.querySelectorAll('.sp-layout i').forEach((cell, idx)=>{
      cell.onclick = ()=>{ if(!Extras._snapTarget) return;
        const parent = cell.parentElement.dataset.l;
        let zone;
        if(parent==='halves') zone = idx===0?'left':'right';
        else zone = ['tl','tr','bl','br'][idx];
        WM.snapTo(Extras._snapTarget, zone); hideSnap();
      };
    });
    el.addEventListener('mouseenter', ()=>clearTimeout(el._t));
    el.addEventListener('mouseleave', hideSnap);
  }
  function hideSnap(){ const el=document.getElementById('snap-popup'); if(el){ el._t=setTimeout(()=>el.classList.add('hidden'),250); } }
  function attachSnap(){
    document.addEventListener('mouseover', e=>{
      const max = e.target.closest && e.target.closest('.win-controls .max');
      const el = document.getElementById('snap-popup'); if(!el) return;
      if(max){ const win=max.closest('.window'); Extras._snapTarget = win?.dataset.id;
        const r = max.getBoundingClientRect();
        el.style.left = Math.min(r.left-60, window.innerWidth-180)+'px'; el.style.top=(r.bottom+4)+'px';
        clearTimeout(el._t); el.classList.remove('hidden');
      }
    });
  }

  /* ====================== TASKBAR BUTTONS ======================== */
  function addTaskbarButtons(){
    const center = document.getElementById('tb-center');
    if(center && !document.getElementById('assistant-btn')){
      const b = document.createElement('button'); b.className='tb-btn'; b.id='assistant-btn'; b.title='Copilot';
      b.style.color='#c9a8ff'; b.innerHTML=ICONS.sparkle;
      center.insertBefore(b, document.getElementById('tb-apps'));
      b.onclick=(e)=>{ e.stopPropagation(); toggleAssistant(); };
    }
    // weather opens widgets
    const wbtn = document.getElementById('tb-weather');
    if(wbtn) wbtn.onclick = (e)=>{ e.stopPropagation(); toggleWidgets(); };
    // search button -> palette
    const sb = document.getElementById('search-btn');
    if(sb){ sb.innerHTML = ICONS.search; sb.onclick=(e)=>{ e.stopPropagation(); openPalette(); }; }
  }

  /* ====================== INIT ================================== */
  function init(){
    buildLivingBg();
    buildPalette();
    buildSnapPopup();
    addTaskbarButtons();
    attachSnap();
    refreshTaskbarWeather();
    setInterval(refreshTaskbarWeather, 600000);

    // keyboard shortcuts
    document.addEventListener('keydown', e=>{
      if((e.ctrlKey||e.metaKey) && e.code==='Space'){ e.preventDefault(); openPalette(); }
      if((e.ctrlKey||e.metaKey) && e.key==='/'){ e.preventDefault(); toggleAssistant(); }
      if(e.key==='Escape'){ closePalette(); }
    });
  }

  return { init, openPalette, closePalette, toggleAssistant, toggleWidgets, _snapTarget:null };
})();
window.Extras = Extras;
