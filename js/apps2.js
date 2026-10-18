/* ===================================================================
   Windows 12 — Apps v2: powerful Terminal + real Web Search Browser
   Overrides definitions from apps.js (loaded after it).
   =================================================================== */

/* ---- assign modern SVG icons to the apps ---- */
(() => {
  const map = { about:'about', explorer:'explorer', notepad:'editor', calculator:'calculator',
    terminal:'terminal', browser:'browser', settings:'settings', paint:'paint', photos:'photos',
    taskmgr:'taskmgr', minesweeper:'minesweeper', clock:'clock', recycle:'recycle' };
  for(const k in map){ if(APPS[k] && ICONS[map[k]]) APPS[k].icon = ICONS[map[k]]; }
})();

/* ------------------------------------------------------------------ */
/* TERMINAL  — built-in interpreter + optional real shell bridge       */
/* ------------------------------------------------------------------ */
/* Die Bridge (bridge.py) verlangt ein Sitzungs-Token. Sie gibt beim Start eine URL
   mit #bridge=<token>&port=<port> aus; das Token wird hier übernommen, für diesen
   Tab in sessionStorage gemerkt und sofort aus der Adresszeile entfernt.
   Ohne Token fragt die App die Bridge gar nicht erst an (z. B. auf GitHub Pages). */
const Bridge = { connected:false, token:null, url:'http://127.0.0.1:8124',
  init(){
    try{
      const h = new URLSearchParams(location.hash.slice(1));
      const t = h.get('bridge'), p = h.get('port') || '8124';
      if(t && /^[A-Za-z0-9_-]{20,}$/.test(t) && /^\d{2,5}$/.test(p)){
        sessionStorage.setItem('win12_bridge', JSON.stringify({t, p}));
        history.replaceState(null, '', location.pathname + location.search);
      }
      const saved = JSON.parse(sessionStorage.getItem('win12_bridge') || 'null');
      if(saved){ this.token = saved.t; this.url = 'http://127.0.0.1:' + saved.p; }
    }catch(e){ this.token = null; }
  },
  headers(extra){ return Object.assign({'X-Bridge-Token': this.token}, extra||{}); },
  async ping(){
    if(!this.token){ this.connected=false; return false; }
    try{ const r = await fetch(this.url+'/ping',{headers:this.headers(), signal:AbortSignal.timeout(800)}); this.connected = r.ok; }
    catch(e){ this.connected=false; }
    return this.connected;
  },
  async exec(cmd, cwd){
    const r = await fetch(this.url+'/exec',{ method:'POST', headers:this.headers({'Content-Type':'application/json'}),
      body: JSON.stringify({cmd, cwd}) });
    if(!r.ok) throw new Error(r.status===401 ? 'Token ungültig (Bridge neu gestartet?) – App über die neue Bridge-URL öffnen' : 'HTTP '+r.status);
    return r.json(); // { stdout, stderr, cwd }
  }
};
Bridge.init();

APPS.terminal = {
  title:'Terminal', icon: ICONS.terminal, width:760, height:460,
  render(body, win){
    win.state.cwd = win.state.cwd || 'C:/Users/Admin';
    win.state.realCwd = win.state.realCwd || null;   // real fs cwd when bridge on
    win.state.history = win.state.history || [];
    win.state.env = win.state.env || {};
    body.innerHTML = `<div class="terminal"></div>`;
    const term = body.querySelector('.terminal');
    const esc = s => (''+s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
    const println = (html, cls='') => { const d=document.createElement('div'); d.className='line '+cls; d.innerHTML=html; term.appendChild(d); term.scrollTop=term.scrollHeight; };

    println('<b>Windows 12 Terminal</b> [Version 12.0.2026]', 'info');
    println('Alles funktioniert sofort. Tippe <span class="ok">help</span> · Dateien (ls, cat, mkdir) · JavaScript (<span class="ok">js</span>) · Rechnen (<span class="ok">calc</span>) · Web (<span class="ok">curl</span>).');

    // detect bridge silently
    Bridge.ping().then(ok=>{
      if(ok){ println('● <span class="ok">Echte System-Shell verbunden</span> — Befehle laufen jetzt auf deinem Rechner.','ok'); win.state.real=true; }
    });

    function promptStr(){
      const tag = win.state.real ? '<span class="ok">●</span> ' : '';
      const cwd = win.state.real ? (win.state.realCwd || '~') : win.state.cwd;
      return `${tag}<span class="prompt">PS ${cwd}&gt; </span>`;
    }

    let histIdx = -1;
    function newPrompt(){
      const line = document.createElement('div'); line.className='prompt-line';
      line.innerHTML = `${promptStr()}<input class="cmd-input" spellcheck="false" autocomplete="off">`;
      term.appendChild(line);
      const inp = line.querySelector('.cmd-input'); inp.focus();
      inp.addEventListener('keydown', async e=>{
        if(e.key==='Enter'){
          const cmd = inp.value; inp.disabled=true;
          line.innerHTML = `${promptStr()}<span>${esc(cmd)}</span>`;
          if(cmd.trim()){ win.state.history.push(cmd); histIdx = win.state.history.length; }
          await run(cmd.trim());
          newPrompt();
        } else if(e.key==='ArrowUp'){ e.preventDefault(); if(histIdx>0){ histIdx--; inp.value=win.state.history[histIdx]||''; } }
        else if(e.key==='ArrowDown'){ e.preventDefault(); if(histIdx<win.state.history.length-1){ histIdx++; inp.value=win.state.history[histIdx]||''; } else { histIdx=win.state.history.length; inp.value=''; } }
      });
      term.scrollTop = term.scrollHeight;
    }

    function vpath(arg){ return arg.startsWith('C:') ? arg : (win.state.cwd + '/' + arg).replace(/\/+/g,'/'); }

    async function run(cmd){
      if(!cmd) return;
      const [c, ...args] = cmd.split(/\s+/);
      const arg = cmd.slice(c.length).trim();
      const lc = c.toLowerCase();

      // ---- client-side intercepts (always available) ----
      if(lc==='cls'||lc==='clear'){ term.innerHTML=''; return; }
      if(lc==='help'){ return showHelp(); }
      if(lc==='bridge'){ return showBridge(); }
      if(lc==='open'||lc==='start'){ if(APPS[arg]){ WM.open(arg); println('Öffne '+arg+'…','ok'); } else println('Apps: '+Object.keys(APPS).join(', '),'err'); return; }
      if(lc==='exit'){ WM.close(win.id); return; }
      if(lc==='realmode'){ win.state.real = arg!=='off' && await Bridge.ping(); println(win.state.real?'Echtmodus AN':(arg!=='off'&&!Bridge.token?'Kein Bridge-Token – tippe bridge für die Anleitung.':'Echtmodus AUS'), win.state.real?'ok':'warn'); return; }

      // ---- real shell via bridge ----
      if(win.state.real){
        try{
          const res = await Bridge.exec(cmd, win.state.realCwd);
          if(res.cwd) win.state.realCwd = res.cwd;
          if(res.stdout) println(esc(res.stdout).replace(/\n$/,''));
          if(res.stderr) println(esc(res.stderr).replace(/\n$/,''),'err');
        }catch(e){ println('Bridge-Fehler: '+e.message+' — wechsle in Simulation.','err'); win.state.real=false; }
        return;
      }

      // ---- built-in interpreter (real logic on the virtual FS) ----
      switch(lc){
        case 'dir': case 'ls': case 'gci': {
          const items = VFS.list(win.state.cwd);
          if(!items.length){ println('(leer)','warn'); break; }
          println(items.map(n=> n.type==='dir'?`<span class="info">${n.name}/</span>`:n.name).join('   ')); break; }
        case 'cd': case 'sl': {
          if(!arg||arg==='~'){ win.state.cwd='C:/Users/Admin'; break; }
          if(arg==='..'){ const p=win.state.cwd.split('/').filter(Boolean); if(p.length>1)p.pop(); win.state.cwd=p.join('/'); break; }
          const t = vpath(arg), n = VFS.resolve(t);
          if(n&&n.type==='dir') win.state.cwd=t.replace(/\/$/,''); else println('Verzeichnis nicht gefunden: '+arg,'err'); break; }
        case 'pwd': case 'gl': println(win.state.cwd); break;
        case 'cat': case 'type': case 'gc': { const ct=VFS.readFile(vpath(arg)); println(ct!==null?esc(ct):'<span class="err">Datei nicht gefunden</span>'); break; }
        case 'head': { const ct=VFS.readFile(vpath(arg)); println(ct!==null?esc(ct.split('\n').slice(0,10).join('\n')):'<span class="err">nicht gefunden</span>'); break; }
        case 'tail': { const ct=VFS.readFile(vpath(arg)); println(ct!==null?esc(ct.split('\n').slice(-10).join('\n')):'<span class="err">nicht gefunden</span>'); break; }
        case 'wc': { const ct=VFS.readFile(vpath(arg))||''; println(`${ct.split('\n').length} Zeilen, ${ct.split(/\s+/).filter(Boolean).length} Wörter, ${ct.length} Zeichen`); break; }
        case 'echo': case 'write-output': {
          // support: echo text > file  /  echo text >> file
          const m = arg.match(/^(.*?)\s*(>>?)\s*(\S+)$/);
          if(m){ const txt=m[1].replace(/^["']|["']$/g,''); const p=vpath(m[3]); const old=m[2]==='>>'?(VFS.readFile(p)||''):''; VFS.writeFile(p, old+(old?'\n':'')+txt); println('→ '+m[3],'ok'); }
          else println(esc(arg.replace(/^["']|["']$/g,''))); break; }
        case 'mkdir': case 'md': if(arg){ VFS.mkdir(win.state.cwd,arg); println('Ordner erstellt: '+arg,'ok'); } break;
        case 'touch': case 'ni': if(arg){ VFS.createFile(win.state.cwd,arg); println('Datei erstellt: '+arg,'ok'); } break;
        case 'rm': case 'del': case 'ri': if(arg){ VFS.remove(win.state.cwd,arg)?println('Gelöscht: '+arg,'ok'):println('Nicht gefunden','err'); } break;
        case 'mv': case 'move': case 'ren': { const [a,b]=args; if(a&&b){ VFS.rename(win.state.cwd,a,b)?println('Umbenannt','ok'):println('Fehler','err'); } break; }
        case 'cp': case 'copy': { const [a,b]=args; const ct=VFS.readFile(vpath(a)); if(ct!==null){ VFS.writeFile(vpath(b),ct); println('Kopiert','ok'); } else println('Quelle fehlt','err'); break; }
        case 'tree': { printTree(win.state.cwd, ''); break; }
        case 'find': case 'grep': case 'sls': { searchFs(win.state.cwd, arg.toLowerCase()); break; }
        case 'date': case 'get-date': println(new Date().toLocaleString('de-DE')); break;
        case 'whoami': println('windows12\\admin'); break;
        case 'hostname': println('WINDOWS-12-PC'); break;
        case 'ver': case 'systeminfo': println('Windows 12 Pro · Build 26100.web · Claude Engine 4.8'); break;
        case 'calc': case 'expr': { try{ println(esc(''+safeMath(arg)),'ok'); }catch(e){ println('Ungültiger Ausdruck','err'); } break; }
        case 'js': case 'node': { try{ const r = Function('"use strict";return ('+arg+')')(); println(esc(typeof r==='object'?JSON.stringify(r):String(r)),'ok'); }catch(e){ println('JS-Fehler: '+esc(e.message),'err'); } break; }
        case 'curl': case 'wget': case 'iwr': {
          const url = arg.split(/\s+/)[0];
          if(!/^https?:/.test(url)){ println('URL muss mit http(s):// beginnen','err'); break; }
          println('→ '+esc(url)+' …','info');
          try{ const r = await fetch(url); const t = await r.text(); println(esc(t.slice(0,1500))+(t.length>1500?'\n…('+t.length+' Zeichen)':'')); }
          catch(e){ println('Fehler: '+esc(e.message)+' (evtl. CORS-blockiert)','err'); } break; }
        case 'ping': { const h=arg||'localhost'; for(let i=1;i<=4;i++) println(`Antwort von ${esc(h)}: Zeit=${(Math.random()*20+5).toFixed(0)}ms`); break; }
        case 'color': { const h=Math.floor(Math.random()*360); document.documentElement.style.setProperty('--accent',`hsl(${h},90%,58%)`); Win12.prefs.accent=`hsl(${h},90%,58%)`; Win12.savePrefs(); println('Akzentfarbe geändert.','ok'); break; }
        case 'theme': { Win12.toggleTheme(); println('Design umgeschaltet.','ok'); break; }
        case 'history': win.state.history.forEach((h,i)=>println(`${i+1}  ${esc(h)}`)); break;
        case 'set': { const m=arg.match(/^(\w+)=(.*)$/); if(m){ win.state.env[m[1]]=m[2]; println('OK','ok'); } else println(JSON.stringify(win.state.env)); break; }
        case 'neofetch': case 'fastfetch': printNeofetch(); break;
        case 'cowsay': { const t=arg||'Muh!'; println(esc(` ${'_'.repeat(t.length+2)}\n< ${t} >\n ${'-'.repeat(t.length+2)}\n        \\   ^__^\n         \\  (oo)\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||`)); break; }
        case 'matrix': { let s=''; for(let i=0;i<8;i++){ s+=Array.from({length:50},()=>Math.random()<.5?'0':'1').join('')+'\n'; } println('<span class="ok">'+s+'</span>'); break; }
        default: println(`'${esc(c)}' wird nicht erkannt. Tippe 'help'. (Echte Befehle via 'bridge')`,'err');
      }
    }

    function safeMath(e){ if(!/^[-+*/%(). 0-9eE]+$/.test(e)) throw 0; return Function('"use strict";return('+e+')')(); }
    function printTree(path, prefix){
      const items = VFS.list(path);
      items.forEach((n,i)=>{ const last=i===items.length-1;
        println(prefix+(last?'└─ ':'├─ ')+(n.type==='dir'?`<span class="info">${n.name}</span>`:n.name));
        if(n.type==='dir') printTree(path+'/'+n.name, prefix+(last?'   ':'│  '));
      });
    }
    function searchFs(path, q){
      VFS.list(path).forEach(n=>{ const full=path+'/'+n.name;
        if(n.name.toLowerCase().includes(q)) println(full,'ok');
        if(n.type==='file' && (n.content||'').toLowerCase().includes(q)) println('  '+full+' (Inhalt)','info');
        if(n.type==='dir') searchFs(full,q);
      });
    }
    function printNeofetch(){ println(
`<span class="info">       ▟▙ ▟▙</span>     <span class="ok">admin@windows12</span>
<span class="info">       ▜▛ ▜▛</span>     ───────────────
<span class="info">       ▟▙ ▟▙</span>     OS: Windows 12 Pro (Web)
<span class="info">       ▜▛ ▜▛</span>     Kernel: claude-engine 4.8
                    Shell: ps-web
                    Auflösung: ${window.innerWidth}x${window.innerHeight}
                    Fenster: ${WM.getWindows().length} offen
                    CPU: Claude Engine ⚡
                    RAM: ∞ GB
                    Bridge: ${win.state.real?'<span class="ok">verbunden</span>':'getrennt'}`); }
    function showHelp(){ println(
`<b>Datei:</b> ls/dir · cd · pwd · cat · head · tail · wc · echo (> >>) · mkdir · touch · rm · mv · cp · tree · find/grep
<b>System:</b> date · whoami · hostname · ver · systeminfo · ping · history · set VAR=wert · color · theme
<b>Power:</b> <span class="ok">js</span> &lt;ausdruck&gt; (echtes JavaScript) · <span class="ok">calc</span> &lt;math&gt; · <span class="ok">curl</span> &lt;url&gt; (echter Request)
<b>Apps:</b> open &lt;app&gt; · exit
<b>Spaß:</b> neofetch · cowsay · matrix
<b>Echt:</b> <span class="warn">bridge</span> zeigt, wie du JEDEN echten Shell-Befehl ausführst`); }
    function showBridge(){ println(
`<b>Echte Befehlsausführung aktivieren:</b>
1. Öffne ein echtes Terminal im Projektordner Windows12/
2. Starte:  <span class="ok">python3 bridge.py</span>
3. Öffne die URL, die die Bridge ausgibt (http://127.0.0.1:8124/#bridge=…).
   Sie enthält ein Zufallstoken, das bei jedem Start neu erzeugt wird.
4. Terminal öffnen und einen Befehl tippen — er läuft jetzt WIRKLICH auf deinem Rechner.

Status: ${Bridge.token ? (Bridge.connected ? '<span class="ok">verbunden</span>' : 'Token vorhanden, Bridge nicht erreichbar') : 'kein Token'}
Die Bridge lauscht nur auf 127.0.0.1, prüft Host und Origin und führt ohne Token nichts aus.
<span class="warn">⚠ Achtung: Das führt echte Systembefehle aus. Nur auf deinem eigenen Rechner nutzen.</span>`); }

    newPrompt();
    term.addEventListener('click', ()=>{ const i=term.querySelector('.cmd-input:not([disabled])'); i&&i.focus(); });
  }
};

/* ------------------------------------------------------------------ */
/* BROWSER — real web search (Wikipedia + DuckDuckGo) + real tab open  */
/* ------------------------------------------------------------------ */
APPS.browser = {
  title:'Edge', icon: ICONS.browser, width:900, height:600,
  render(body, win){
    body.innerHTML = `
      <div class="browser">
        <div class="br-bar">
          <button data-act="back" title="Zurück">←</button>
          <button data-act="fwd" title="Vor">→</button>
          <button data-act="reload" title="Neu laden">⟳</button>
          <button data-act="home" title="Startseite">⌂</button>
          <div class="br-url-wrap"><input class="br-url" placeholder="Suchen oder URL eingeben — echte Web-Suche"><div class="br-suggest hidden"></div></div>
          <button data-act="go">→</button>
        </div>
        <div class="br-content"></div>
      </div>`;
    const url = body.querySelector('.br-url');
    const sug = body.querySelector('.br-suggest');
    const content = body.querySelector('.br-content');

    function home(){
      url.value='';
      content.innerHTML = `
        <div class="br-home">
          <div class="br-logo">🔎 <span>Windows Search</span></div>
          <input class="br-search" placeholder="Suche im echten Web…">
          <div class="br-tiles">
            ${[['🌐','Google','https://www.google.com'],['📺','YouTube','https://www.youtube.com'],
               ['📚','Wikipedia','https://de.wikipedia.org'],['🤖','Claude','https://claude.ai'],
               ['🐙','GitHub','https://github.com'],['🛒','Amazon','https://www.amazon.de'],
               ['🗺️','Maps','https://maps.google.com'],['📰','News','https://news.google.com']]
              .map(([i,n,u])=>`<div class="br-tile" data-url="${u}"><div class="ico">${i}</div><small>${n}</small></div>`).join('')}
          </div>
          <p class="br-note">Tippe einen Begriff und drücke Enter — echte Ergebnisse von Wikipedia &amp; DuckDuckGo.</p>
        </div>`;
      const s = content.querySelector('.br-search');
      s.addEventListener('keydown',e=>{ if(e.key==='Enter') go(s.value); });
      s.addEventListener('input', ()=>liveSuggest(s.value, content.querySelector('.br-home')));
      content.querySelectorAll('.br-tile').forEach(t=> t.onclick=()=>navigate(t.dataset.url));
    }

    function go(q){ q=q.trim(); if(!q) return;
      const isUrl = /^https?:\/\//.test(q) || /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(q);
      if(isUrl) navigate(q.startsWith('http')?q:'https://'+q); else search(q);
    }

    function navigate(target){
      url.value=target;
      content.innerHTML = `<div class="br-loading">Lade ${target} …<br><small>Viele Seiten erlauben kein Einbetten — dann öffnet sich ein echter Tab.</small></div>
        <iframe class="br-frame" src="${target}" referrerpolicy="no-referrer" style="display:none"></iframe>`;
      const f = content.querySelector('iframe');
      let loaded=false;
      f.onload = ()=>{ loaded=true; content.querySelector('.br-loading')?.remove(); f.style.display='block'; };
      setTimeout(()=>{ if(!loaded){ // blocked
        content.innerHTML = `<div class="br-home"><div class="br-logo">🚫</div>
          <p class="br-note">Diese Seite verbietet das Einbetten.</p>
          <button class="br-search" style="cursor:pointer;max-width:320px" data-open>In echtem Tab öffnen ↗</button></div>`;
        content.querySelector('[data-open]').onclick=()=>window.open(target,'_blank');
      }}, 2500);
    }

    async function search(q){
      url.value = q;
      sug.classList.add('hidden');
      content.innerHTML = `<div class="br-results"><div class="br-loading">Suche nach „${q}" …</div></div>`;
      const wrap = content.querySelector('.br-results');
      const gUrl = 'https://www.google.com/search?q='+encodeURIComponent(q);
      let html = `<div class="br-resbar"><b>Ergebnisse für „${q}"</b>
        <button class="br-google" data-g>Auf Google öffnen ↗</button></div>`;

      // DuckDuckGo instant answer
      let answer = '';
      try{
        const d = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`).then(r=>r.json());
        if(d.AbstractText){ answer = `<div class="br-answer"><b>${d.Heading||q}</b><p>${d.AbstractText}</p>
          ${d.AbstractURL?`<a href="#" data-ext="${d.AbstractURL}">${d.AbstractSource||'Quelle'} ↗</a>`:''}</div>`; }
      }catch(e){}

      // Wikipedia (real results with images)
      let results = '';
      try{
        const ws = await fetch(`https://de.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=6&format=json&origin=*`).then(r=>r.json());
        const titles = ws[1]||[], descs = ws[2]||[], urls = ws[3]||[];
        if(titles.length){
          // summary + thumb of first
          if(!answer){ try{
            const sum = await fetch(`https://de.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titles[0])}`).then(r=>r.json());
            answer = `<div class="br-answer">${sum.thumbnail?`<img src="${sum.thumbnail.source}">`:''}<div><b>${sum.title}</b><p>${sum.extract||''}</p>
              <a href="#" data-ext="${sum.content_urls?.desktop?.page||urls[0]}">Auf Wikipedia lesen ↗</a></div></div>`;
          }catch(e){} }
          results = titles.map((t,i)=>`<div class="br-result" data-ext="${urls[i]}">
            <div class="br-rtitle">${t}</div><div class="br-rurl">${urls[i]}</div>
            <div class="br-rdesc">${descs[i]||''}</div></div>`).join('');
        }
      }catch(e){}

      if(!answer && !results) html += `<div class="br-answer"><p>Keine direkten Treffer im Sandbox-Modus. Nutze „Auf Google öffnen".</p></div>`;
      wrap.innerHTML = html + answer + results;
      wrap.querySelector('[data-g]').onclick = ()=>window.open(gUrl,'_blank');
      wrap.querySelectorAll('[data-ext]').forEach(el=> el.onclick=(e)=>{ e.preventDefault(); window.open(el.dataset.ext,'_blank'); });
    }

    let sugTimer;
    async function liveSuggest(q, anchor){
      clearTimeout(sugTimer);
      if(!q || q.length<2){ sug.classList.add('hidden'); return; }
      sugTimer = setTimeout(async ()=>{
        try{
          const arr = await fetch(`https://duckduckgo.com/ac/?q=${encodeURIComponent(q)}&type=list`).then(r=>r.json());
          const items = (arr[1]||arr.map?.(x=>x.phrase)||[]).slice(0,6);
          if(!items.length){ sug.classList.add('hidden'); return; }
          sug.innerHTML = items.map(s=>`<div class="br-sg">🔍 ${s}</div>`).join('');
          sug.classList.remove('hidden');
          sug.querySelectorAll('.br-sg').forEach((el,i)=> el.onclick=()=>{ sug.classList.add('hidden'); search(items[i]); });
        }catch(e){ sug.classList.add('hidden'); }
      }, 180);
    }

    url.addEventListener('keydown',e=>{ if(e.key==='Enter'){ sug.classList.add('hidden'); go(url.value); } });
    url.addEventListener('input', ()=>liveSuggest(url.value));
    url.addEventListener('blur', ()=>setTimeout(()=>sug.classList.add('hidden'),200));
    body.querySelector('[data-act=go]').onclick=()=>go(url.value);
    body.querySelector('[data-act=home]').onclick=home;
    body.querySelector('[data-act=reload]').onclick=()=>{ const f=content.querySelector('iframe'); if(f) f.src=f.src; };
    body.querySelector('[data-act=back]').onclick=()=>{ const f=content.querySelector('iframe'); try{f.contentWindow.history.back();}catch(e){ home(); } };
    body.querySelector('[data-act=fwd]').onclick=()=>{ const f=content.querySelector('iframe'); try{f.contentWindow.history.forward();}catch(e){} };

    // allow opening with a preset query (from palette/assistant)
    if(win.state.searchQuery){ go(win.state.searchQuery); win.state.searchQuery=null; }
    else home();
  }
};

/* ===================================================================
   BROWSER v3 — REAL embedded Google search (igu=1 trick) + smart nav
   Overrides the v2 browser above (last assignment wins).
   =================================================================== */
APPS.browser = {
  title:'Edge', icon: ICONS.browser, width:980, height:640,
  render(body, win){
    win.state.hist = win.state.hist || [];
    if(win.state.hi === undefined) win.state.hi = -1;
    body.innerHTML = `
      <div class="browser">
        <div class="br-bar">
          <button data-act="back" title="Zurück">←</button>
          <button data-act="fwd" title="Vor">→</button>
          <button data-act="reload" title="Neu laden">⟳</button>
          <button data-act="home" title="Startseite">⌂</button>
          <div class="br-url-wrap"><input class="br-url" placeholder="Suchen mit Google oder Webadresse eingeben"><div class="br-suggest hidden"></div></div>
          <button data-act="ext" title="In echtem Tab öffnen">↗</button>
        </div>
        <div class="br-content"></div>
      </div>`;
    const urlIn = body.querySelector('.br-url');
    const sug = body.querySelector('.br-suggest');
    const content = body.querySelector('.br-content');

    function normalize(u){
      u = u.trim();
      if(!/^https?:\/\//.test(u)) u = 'https://' + u;
      u = u.replace('://google.','://www.google.').replace('://www.www.','://www.');
      // make Google embeddable inside an iframe
      if(/^https?:\/\/www\.google\.[a-z.]+\/search/i.test(u) && !/[?&]igu=1/.test(u)) u += (u.includes('?')?'&':'?') + 'igu=1';
      else if(/^https?:\/\/www\.google\.[a-z.]+\/?($|\?)/i.test(u)) u = 'https://www.google.com/webhp?igu=1';
      return u;
    }
    function googleSearch(q){ return 'https://www.google.com/search?igu=1&q=' + encodeURIComponent(q); }
    function isUrl(s){ return /^https?:\/\//i.test(s) || /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(s.trim()); }

    function load(url, push=true){
      sug.classList.add('hidden');
      if(push){ win.state.hist = win.state.hist.slice(0, win.state.hi+1); win.state.hist.push(url); win.state.hi = win.state.hist.length-1; }
      win.state.current = url;
      urlIn.value = url.replace('?igu=1&','?').replace(/[?&]igu=1/,'').replace('/webhp','');
      content.innerHTML = `<iframe class="br-frame" src="${url}" referrerpolicy="no-referrer" allow="fullscreen"></iframe>`;
    }
    function go(input){
      input = (input||'').trim(); if(!input) return;
      load(isUrl(input) ? normalize(input) : googleSearch(input));
    }
    function home(){
      win.state.current = null; urlIn.value='';
      content.innerHTML = `
        <div class="br-home">
          <div class="br-logo">🔎 <span>Windows&nbsp;Search</span></div>
          <input class="br-search" placeholder="Suche mit Google – echte Ergebnisse">
          <div class="br-tiles">
            ${[['🌐','Google','https://www.google.com'],['📺','YouTube','https://www.youtube.com/results?search_query='],
               ['📚','Wikipedia','https://de.wikipedia.org'],['🤖','Claude','https://claude.ai'],
               ['🐙','GitHub','https://github.com'],['🗺️','Maps','https://www.google.com/maps'],
               ['📰','News','https://news.google.com'],['🛒','Amazon','https://www.amazon.de']]
              .map(([i,n,u])=>`<div class="br-tile" data-url="${u}"><div class="ico">${i}</div><small>${n}</small></div>`).join('')}
          </div>
          <p class="br-note">Echte Google-Suche direkt im Fenster. Manche Seiten (z.B. YouTube) öffnen aus Sicherheitsgründen einen echten Tab — Klick auf ↗.</p>
        </div>`;
      const s = content.querySelector('.br-search');
      s.addEventListener('keydown', e=>{ if(e.key==='Enter') go(s.value); });
      s.addEventListener('input', ()=>liveSuggest(s.value));
      content.querySelectorAll('.br-tile').forEach(t=> t.onclick=()=>{
        const u=t.dataset.url;
        // sites that hard-block framing -> open real tab
        if(/youtube|amazon|github|claude\.ai/.test(u)) window.open(u.replace(/\/results.*/,''),'_blank'); else go(u);
      });
    }

    let sugTimer;
    function liveSuggest(q){
      clearTimeout(sugTimer);
      if(!q || q.length<2 || isUrl(q)){ sug.classList.add('hidden'); return; }
      sugTimer = setTimeout(async ()=>{
        try{
          const arr = await fetch(`https://duckduckgo.com/ac/?q=${encodeURIComponent(q)}&type=list`).then(r=>r.json());
          const items = (arr[1]||[]).slice(0,6);
          if(!items.length){ sug.classList.add('hidden'); return; }
          sug.innerHTML = items.map(s=>`<div class="br-sg">🔍 ${s}</div>`).join('');
          sug.classList.remove('hidden');
          sug.querySelectorAll('.br-sg').forEach((el,i)=> el.onmousedown=()=>{ sug.classList.add('hidden'); go(items[i]); });
        }catch(e){ sug.classList.add('hidden'); }
      }, 160);
    }

    urlIn.addEventListener('keydown', e=>{ if(e.key==='Enter'){ sug.classList.add('hidden'); go(urlIn.value); } });
    urlIn.addEventListener('input', ()=>liveSuggest(urlIn.value));
    urlIn.addEventListener('blur', ()=>setTimeout(()=>sug.classList.add('hidden'),200));
    body.querySelector('[data-act=home]').onclick = home;
    body.querySelector('[data-act=reload]').onclick = ()=>{ if(win.state.current) load(win.state.current,false); };
    body.querySelector('[data-act=back]').onclick = ()=>{ if(win.state.hi>0){ win.state.hi--; load(win.state.hist[win.state.hi],false); } else home(); };
    body.querySelector('[data-act=fwd]').onclick = ()=>{ if(win.state.hi < win.state.hist.length-1){ win.state.hi++; load(win.state.hist[win.state.hi],false); } };
    body.querySelector('[data-act=ext]').onclick = ()=>{ const u=(win.state.current||'https://www.google.com').replace(/[?&]igu=1/,''); window.open(u,'_blank'); };

    if(win.state.searchQuery){ go(win.state.searchQuery); win.state.searchQuery=null; }
    else home();
  }
};
