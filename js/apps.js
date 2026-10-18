/* ===================================================================
   Windows 12 — Applications
   Each app: { title, icon, width, height, single?, render(body, win) }
   =================================================================== */
const APPS = {};

/* Escaping for values from user input or external APIs (DuckDuckGo, Wikipedia) before they go into HTML */
const escHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* only http(s) links may be opened or embedded */
const safeHttpUrl = u => (/^https?:\/\//i.test(String(u ?? '')) ? String(u) : '');

/* ------------------------------------------------------------------ */
/* ABOUT / WILLKOMMEN                                                  */
/* ------------------------------------------------------------------ */
APPS.about = {
  title:'Über Windows 12', icon:'💎', width:560, height:520, single:true,
  render(body){
    body.innerHTML = `
      <div class="about">
        <svg viewBox="0 0 88 88" width="78" height="78" style="margin-top:6px">
          <rect x="4" y="4" width="38" height="38" rx="3" fill="#50b0f0"/>
          <rect x="46" y="4" width="38" height="38" rx="3" fill="#50b0f0"/>
          <rect x="4" y="46" width="38" height="38" rx="3" fill="#50b0f0"/>
          <rect x="46" y="46" width="38" height="38" rx="3" fill="#50b0f0"/>
        </svg>
        <h1>Windows 12</h1>
        <p>Eine vollständige Desktop-Umgebung, gebaut mit reinem HTML, CSS und JavaScript — ohne Frameworks.</p>
        <div class="specs">
          <div><span>Edition</span><b>Windows 12 Pro (Web)</b></div>
          <div><span>Version</span><b>12.0.2026</b></div>
          <div><span>Build</span><b>26100.web</b></div>
          <div><span>Prozessor</span><b>Claude Engine ⚡</b></div>
          <div><span>RAM</span><b>∞ GB (virtuell)</b></div>
          <div><span>Sprache</span><b>JavaScript</b></div>
          <div style="border:none"><span>Erstellt von</span><b>Claude (Anthropic)</b></div>
        </div>
        <p style="font-size:12px;opacity:.7">Tipp: Rechtsklick auf den Desktop für Optionen. Fenster an den Bildschirmrand ziehen zum Andocken.</p>
      </div>`;
  }
};

/* ------------------------------------------------------------------ */
/* FILE EXPLORER                                                       */
/* ------------------------------------------------------------------ */
APPS.explorer = {
  title:'Datei-Explorer', icon:'📁', width:780, height:520,
  render(body, win){
    win.state.path = win.state.path || 'C:/Users/Admin';
    win.state.sel = null;
    const places = [
      {label:'Startseite', path:'C:/Users/Admin', icon:'🏠'},
      {label:'Desktop',    path:'C:/Users/Admin/Desktop', icon:'🖥️'},
      {label:'Dokumente',  path:'C:/Users/Admin/Dokumente', icon:'📄'},
      {label:'Bilder',     path:'C:/Users/Admin/Bilder', icon:'🖼️'},
      {label:'Downloads',  path:'C:/Users/Admin/Downloads', icon:'⬇️'},
      {label:'Musik',      path:'C:/Users/Admin/Musik', icon:'🎵'},
      {label:'Dieser PC',  path:'C:', icon:'💻'},
    ];
    body.innerHTML = `
      <div class="explorer">
        <div class="exp-side">
          ${places.map(p=>`<div class="nav-item" data-path="${p.path}"><span>${p.icon}</span><span>${p.label}</span></div>`).join('')}
        </div>
        <div class="exp-main">
          <div class="app-toolbar">
            <button data-act="back">←</button>
            <button data-act="up">↑</button>
            <button data-act="newfolder">📂 Neuer Ordner</button>
            <button data-act="newfile">📄 Neue Datei</button>
            <button data-act="del">🗑️ Löschen</button>
          </div>
          <div class="exp-path"></div>
          <div class="exp-files"></div>
          <div class="exp-status"></div>
        </div>
      </div>`;

    const filesEl = body.querySelector('.exp-files');
    const pathEl  = body.querySelector('.exp-path');
    const statusEl= body.querySelector('.exp-status');
    const history = [];

    function iconFor(node){
      if(node.type === 'dir') return '📁';
      if(node.kind === 'image') return node.content;
      const ext = node.name.split('.').pop().toLowerCase();
      return ({txt:'📄',png:'🖼️',jpg:'🖼️',sys:'⚙️',mp3:'🎵',js:'📜',md:'📝'})[ext] || '📄';
    }

    function render(){
      const items = VFS.list(win.state.path);
      // breadcrumb
      const parts = win.state.path.split('/').filter(Boolean);
      pathEl.innerHTML = parts.map((p,i)=>{
        const sub = parts.slice(0,i+1).join('/');
        return `<span class="crumb" data-path="${sub}">${p}</span>${i<parts.length-1?'<span>›</span>':''}`;
      }).join('');
      pathEl.querySelectorAll('.crumb').forEach(c=>c.onclick=()=>go(c.dataset.path));

      filesEl.innerHTML = items.length ? items.map(n=>`
        <div class="exp-file" data-name="${n.name}" data-type="${n.type}">
          <div class="ico">${iconFor(n)}</div>
          <div class="lbl">${n.name}</div>
        </div>`).join('') : `<div style="color:var(--text-dim);padding:20px">Dieser Ordner ist leer.</div>`;

      filesEl.querySelectorAll('.exp-file').forEach(f=>{
        f.onclick = (e)=>{ e.stopPropagation();
          filesEl.querySelectorAll('.exp-file').forEach(x=>x.classList.remove('sel'));
          f.classList.add('sel'); win.state.sel = f.dataset.name;
        };
        f.ondblclick = ()=> openItem(f.dataset.name, f.dataset.type);
        f.oncontextmenu = (e)=>{ e.preventDefault(); e.stopPropagation();
          win.state.sel = f.dataset.name;
          Win12.contextMenu(e.clientX, e.clientY, [
            {label:'Öffnen', icon:'📂', action:()=>openItem(f.dataset.name, f.dataset.type)},
            {label:'Umbenennen', icon:'✏️', action:()=>renameItem(f.dataset.name)},
            {label:'Löschen', icon:'🗑️', action:()=>{ VFS.remove(win.state.path, f.dataset.name); render(); }},
          ]);
        };
      });
      statusEl.textContent = `${items.length} Element(e)  •  ${win.state.path}`;
      // sync sidebar active
      body.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active', n.dataset.path===win.state.path));
    }

    function openItem(name, type){
      const full = win.state.path + '/' + name;
      if(type === 'dir'){ go(full); return; }
      const node = VFS.resolve(full);
      if(node.kind === 'image'){ WM.open('photos'); const w=[...WM.windows.values()].pop(); w.state.imgPath = full; w.app.show && w.app.show(w); return; }
      // open text in notepad
      Win12.openFileInNotepad(full);
    }

    function renameItem(name){
      const nn = prompt('Neuer Name:', name);
      if(nn && nn !== name){ VFS.rename(win.state.path, name, nn); render(); }
    }

    function go(path){ history.push(win.state.path); win.state.path = path; win.state.sel=null; render(); }

    body.querySelector('[data-act=back]').onclick = ()=>{ if(history.length){ win.state.path = history.pop(); render(); } };
    body.querySelector('[data-act=up]').onclick = ()=>{
      const parts = win.state.path.split('/').filter(Boolean);
      if(parts.length>1){ parts.pop(); go(parts.join('/')); }
    };
    body.querySelector('[data-act=newfolder]').onclick = ()=>{ VFS.mkdir(win.state.path,'Neuer Ordner'); render(); };
    body.querySelector('[data-act=newfile]').onclick = ()=>{
      const n = prompt('Dateiname:', 'Neue Datei.txt'); if(n){ VFS.createFile(win.state.path, n); render(); }
    };
    body.querySelector('[data-act=del]').onclick = ()=>{ if(win.state.sel){ VFS.remove(win.state.path, win.state.sel); win.state.sel=null; render(); } };
    body.querySelectorAll('.nav-item').forEach(n=> n.onclick = ()=>go(n.dataset.path));
    filesEl.oncontextmenu = (e)=>{ e.preventDefault();
      Win12.contextMenu(e.clientX, e.clientY, [
        {label:'Neuer Ordner', icon:'📂', action:()=>{ VFS.mkdir(win.state.path,'Neuer Ordner'); render(); }},
        {label:'Neue Datei', icon:'📄', action:()=>{ VFS.createFile(win.state.path,'Neue Datei'); render(); }},
        {label:'Aktualisieren', icon:'🔄', action:render},
      ]);
    };
    render();
  }
};

/* ------------------------------------------------------------------ */
/* NOTEPAD / EDITOR                                                    */
/* ------------------------------------------------------------------ */
APPS.notepad = {
  title:'Editor', icon:'📝', width:640, height:480,
  render(body, win){
    body.innerHTML = `
      <div class="app">
        <div class="app-toolbar">
          <button data-act="new">Neu</button>
          <button data-act="open">Öffnen</button>
          <button data-act="save">Speichern (Strg+S)</button>
          <span style="flex:1"></span>
          <span class="np-info" style="font-size:12px;color:var(--text-dim)"></span>
        </div>
        <textarea class="notepad-area" spellcheck="false" placeholder="Hier tippen…"></textarea>
      </div>`;
    const ta = body.querySelector('.notepad-area');
    const info = body.querySelector('.np-info');
    if(win.state.openPath){
      ta.value = VFS.readFile(win.state.openPath) || '';
      WM.setTitle(win.id, win.state.openPath.split('/').pop() + ' — Editor');
    }
    function updateInfo(){ const t=ta.value; info.textContent = `${t.length} Zeichen · ${t.split('\n').length} Zeilen`; }
    ta.addEventListener('input', updateInfo); updateInfo();
    ta.focus();

    function save(){
      let path = win.state.openPath;
      if(!path){
        const name = prompt('Dateiname:', 'Unbenannt.txt'); if(!name) return;
        path = 'C:/Users/Admin/Dokumente/' + name;
        win.state.openPath = path;
      }
      VFS.writeFile(path, ta.value, 'text');
      WM.setTitle(win.id, path.split('/').pop() + ' — Editor');
      Win12.toast('Editor', 'Gespeichert: ' + path.split('/').pop());
    }
    body.querySelector('[data-act=new]').onclick = ()=>{ ta.value=''; win.state.openPath=null; WM.setTitle(win.id,'Editor'); updateInfo(); };
    body.querySelector('[data-act=save]').onclick = save;
    body.querySelector('[data-act=open]').onclick = ()=>{
      const p = prompt('Pfad (z.B. C:/Users/Admin/Dokumente/Notizen.txt):','C:/Users/Admin/Dokumente/Willkommen.txt');
      if(p){ const c=VFS.readFile(p); if(c!==null){ ta.value=c; win.state.openPath=p; WM.setTitle(win.id, p.split('/').pop()+' — Editor'); updateInfo(); } else Win12.toast('Editor','Datei nicht gefunden'); }
    };
    ta.addEventListener('keydown', e=>{ if((e.ctrlKey||e.metaKey)&&e.key==='s'){ e.preventDefault(); save(); } });
  }
};

/* ------------------------------------------------------------------ */
/* CALCULATOR                                                          */
/* ------------------------------------------------------------------ */
APPS.calculator = {
  title:'Rechner', icon:'🧮', width:320, height:480, single:true,
  render(body){
    body.innerHTML = `
      <div class="calc">
        <div class="calc-display"><div class="calc-sub"></div><div class="calc-main">0</div></div>
        <div class="calc-grid">
          ${['C','⌫','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','±','0','.','='].map(k=>{
            const op = ['÷','×','−','+'].includes(k);
            const eq = k==='=';
            return `<button class="${eq?'eq':op?'op':''}" data-k="${k}">${k}</button>`;
          }).join('')}
        </div>
      </div>`;
    const main = body.querySelector('.calc-main');
    const sub  = body.querySelector('.calc-sub');
    let cur='0', prev=null, op=null, fresh=false;
    const map = {'÷':'/','×':'*','−':'-','+':'+'};
    function calc(a,b,o){ a=+a;b=+b; return o==='/'?(b===0?'Fehler':a/b):o==='*'?a*b:o==='-'?a-b:a+b; }
    function upd(){ main.textContent = (''+cur).slice(0,14); }
    body.querySelectorAll('button').forEach(b=> b.onclick = ()=>{
      const k=b.dataset.k;
      if(k>='0'&&k<='9'){ cur = (cur==='0'||fresh)?k:cur+k; fresh=false; }
      else if(k==='.'){ if(!cur.includes('.')) cur+='.'; }
      else if(k==='C'){ cur='0'; prev=null; op=null; sub.textContent=''; }
      else if(k==='⌫'){ cur = cur.length>1?cur.slice(0,-1):'0'; }
      else if(k==='±'){ cur = (cur[0]==='-'?cur.slice(1):'-'+cur); }
      else if(k==='%'){ cur = (+cur/100)+''; }
      else if(map[k]){ if(op&&!fresh){ cur=''+calc(prev,cur,op); } prev=cur; op=map[k]; fresh=true; sub.textContent=`${prev} ${k}`; }
      else if(k==='='){ if(op){ const r=calc(prev,cur,op); sub.textContent=`${prev} ${Object.keys(map).find(x=>map[x]===op)} ${cur} =`; cur=''+r; op=null; fresh=true; } }
      upd();
    });
    upd();
  }
};

/* ------------------------------------------------------------------ */
/* TERMINAL                                                            */
/* ------------------------------------------------------------------ */
APPS.terminal = {
  title:'Terminal', icon:'⬛', width:680, height:420,
  render(body, win){
    win.state.cwd = win.state.cwd || 'C:/Users/Admin';
    body.innerHTML = `<div class="terminal"></div>`;
    const term = body.querySelector('.terminal');
    function p(){ return `PS ${win.state.cwd}> `; }
    function println(html, cls=''){ const d=document.createElement('div'); d.className='line '+cls; d.innerHTML=html; term.appendChild(d); term.scrollTop=term.scrollHeight; }
    println('Windows 12 Terminal [Version 12.0.2026]', 'info');
    println('© Anthropic. Tippe <span class="ok">help</span> für Befehle.\n');

    function newPrompt(){
      const line = document.createElement('div');
      line.className='prompt-line';
      line.innerHTML = `<span class="prompt">${p()}</span><input class="cmd-input" spellcheck="false" autofocus>`;
      term.appendChild(line);
      const inp = line.querySelector('.cmd-input');
      inp.focus();
      inp.addEventListener('keydown', e=>{
        if(e.key==='Enter'){
          const cmd = inp.value; inp.disabled=true;
          line.innerHTML = `<span class="prompt">${p()}</span><span>${escapeHtml(cmd)}</span>`;
          run(cmd.trim());
          newPrompt();
        }
      });
      term.scrollTop = term.scrollHeight;
    }
    function escapeHtml(s){ return s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

    function run(cmd){
      if(!cmd) return;
      const [c,...args]=cmd.split(/\s+/);
      const arg = args.join(' ');
      switch(c.toLowerCase()){
        case 'help': println(
`Verfügbare Befehle:
  <span class="ok">help</span>            Diese Hilfe
  <span class="ok">dir / ls</span>        Verzeichnis auflisten
  <span class="ok">cd</span> &lt;ordner&gt;     Verzeichnis wechseln
  <span class="ok">cat</span> &lt;datei&gt;     Datei anzeigen
  <span class="ok">echo</span> &lt;text&gt;     Text ausgeben
  <span class="ok">mkdir</span> &lt;name&gt;    Ordner erstellen
  <span class="ok">touch</span> &lt;name&gt;    Datei erstellen
  <span class="ok">rm</span> &lt;name&gt;       Löschen
  <span class="ok">open</span> &lt;app&gt;      App öffnen (notepad, calculator, ...)
  <span class="ok">date</span>            Datum & Uhrzeit
  <span class="ok">whoami</span>          Benutzer
  <span class="ok">neofetch</span>        Systeminfo
  <span class="ok">color</span>           Zufallsfarbe als Akzent
  <span class="ok">cls / clear</span>     Bildschirm leeren`); break;
        case 'dir': case 'ls': {
          const items = VFS.list(win.state.cwd);
          if(!items.length){ println('(leer)','warn'); break; }
          println(items.map(n=> (n.type==='dir'?'<span class="info">'+n.name+'/</span>':n.name)).join('   '));
          break; }
        case 'cd': {
          if(!arg||arg==='~'){ win.state.cwd='C:/Users/Admin'; break; }
          if(arg==='..'){ const parts=win.state.cwd.split('/').filter(Boolean); if(parts.length>1)parts.pop(); win.state.cwd=parts.join('/'); break; }
          const target = arg.startsWith('C:')?arg : win.state.cwd+'/'+arg;
          const node = VFS.resolve(target);
          if(node&&node.type==='dir') win.state.cwd=target.replace(/\/$/,'');
          else println('Verzeichnis nicht gefunden: '+arg,'err');
          break; }
        case 'cat': case 'type': {
          const t = arg.startsWith('C:')?arg:win.state.cwd+'/'+arg;
          const c = VFS.readFile(t);
          println(c!==null?escapeHtml(c):'<span class="err">Datei nicht gefunden</span>'); break; }
        case 'echo': println(escapeHtml(arg)); break;
        case 'mkdir': if(arg){ VFS.mkdir(win.state.cwd,arg); println('Ordner erstellt: '+arg,'ok'); } break;
        case 'touch': if(arg){ VFS.createFile(win.state.cwd,arg); println('Datei erstellt: '+arg,'ok'); } break;
        case 'rm': case 'del': if(arg){ VFS.remove(win.state.cwd,arg)?println('Gelöscht: '+arg,'ok'):println('Nicht gefunden','err'); } break;
        case 'open': if(APPS[arg]){ WM.open(arg); println('Öffne '+arg+'…','ok'); } else println('App nicht gefunden. Verfügbar: '+Object.keys(APPS).join(', '),'err'); break;
        case 'date': println(new Date().toLocaleString('de-DE')); break;
        case 'whoami': println('windows12\\admin'); break;
        case 'color': { const h=Math.floor(Math.random()*360); document.documentElement.style.setProperty('--accent',`hsl(${h},90%,55%)`); println('Akzentfarbe geändert.','ok'); break; }
        case 'neofetch': println(
`<span class="info">       ▟▙ ▟▙</span>     admin@windows12
<span class="info">       ▜▛ ▜▛</span>     ───────────────
<span class="info">       ▟▙ ▟▙</span>     OS: Windows 12 Pro (Web)
<span class="info">       ▜▛ ▜▛</span>     Kernel: claude-engine 4.8
                    Shell: ps-web
                    Auflösung: ${window.innerWidth}x${window.innerHeight}
                    Fenster: ${WM.getWindows().length} offen
                    CPU: Claude Engine ⚡
                    RAM: ∞ GB`); break;
        case 'cls': case 'clear': term.innerHTML=''; break;
        case 'exit': WM.close(win.id); break;
        default: println(`'${escapeHtml(c)}' wird nicht erkannt. Tippe 'help'.`,'err');
      }
    }
    newPrompt();
    term.addEventListener('click', ()=>{ const inp=term.querySelector('.cmd-input:not([disabled])'); inp&&inp.focus(); });
  }
};

/* ------------------------------------------------------------------ */
/* BROWSER                                                             */
/* ------------------------------------------------------------------ */
APPS.browser = {
  title:'Edge', icon:'🌐', width:860, height:560,
  render(body, win){
    body.innerHTML = `
      <div class="browser">
        <div class="br-bar">
          <button data-act="back">←</button>
          <button data-act="fwd">→</button>
          <button data-act="reload">⟳</button>
          <button data-act="home">⌂</button>
          <input class="br-url" placeholder="Suchen oder Webadresse eingeben">
          <button data-act="go">→</button>
        </div>
        <div class="br-content" style="flex:1;display:flex;"></div>
      </div>`;
    const url = body.querySelector('.br-url');
    const content = body.querySelector('.br-content');

    function home(){
      url.value='';
      content.innerHTML = `
        <div class="br-home">
          <h1>🔎 Suche</h1>
          <input class="br-search" placeholder="Im Web suchen…">
          <div class="br-tiles">
            ${[['🔍','Google','https://www.google.com'],['📺','YouTube','https://www.youtube.com'],
               ['📚','Wikipedia','https://www.wikipedia.org'],['🤖','Claude','https://claude.ai'],
               ['🛒','Amazon','https://www.amazon.de'],['🐙','GitHub','https://github.com'],
               ['🗺️','Maps','https://maps.google.com'],['📰','News','https://news.google.com']]
              .map(([i,n,u])=>`<div class="br-tile" data-url="${u}"><div class="ico">${i}</div><small>${n}</small></div>`).join('')}
          </div>
          <p style="color:var(--text-dim);font-size:12px;text-align:center;max-width:420px">
            Hinweis: Viele Seiten verbieten das Einbetten in Frames. Bei einer leeren Seite wird die Adresse in einem echten Tab geöffnet.
          </p>
        </div>`;
      const s = content.querySelector('.br-search');
      s.addEventListener('keydown',e=>{ if(e.key==='Enter') navigate(s.value); });
      content.querySelectorAll('.br-tile').forEach(t=> t.onclick=()=>navigate(t.dataset.url));
    }
    function navigate(q){
      if(!q) return;
      let target = q;
      if(!/^https?:\/\//.test(q)){
        target = q.includes('.')&&!q.includes(' ') ? 'https://'+q : 'https://www.google.com/search?q='+encodeURIComponent(q);
      }
      url.value = target;
      content.innerHTML = `<iframe class="br-frame" src="${escHtml(safeHttpUrl(target))}" referrerpolicy="no-referrer"></iframe>`;
      const frame = content.querySelector('iframe');
      // many sites block iframes — offer real-tab fallback
      setTimeout(()=>{
        try{ const ok = frame.contentWindow && frame.contentWindow.length>=0; }catch(e){}
      },1200);
      frame.addEventListener('error',()=>fallback(target));
    }
    function fallback(target){
      content.innerHTML = `<div class="br-home"><h1>🚫</h1>
        <p style="text-align:center">Diese Seite kann nicht eingebettet werden.</p>
        <button class="br-search" style="cursor:pointer" data-open>In neuem Tab öffnen ↗</button></div>`;
      content.querySelector('[data-open]').onclick = ()=>{ const u = safeHttpUrl(target); if(u) window.open(u,'_blank','noopener'); };
    }
    url.addEventListener('keydown',e=>{ if(e.key==='Enter') navigate(url.value); });
    body.querySelector('[data-act=go]').onclick=()=>navigate(url.value);
    body.querySelector('[data-act=home]').onclick=home;
    body.querySelector('[data-act=reload]').onclick=()=>{ const f=content.querySelector('iframe'); if(f) f.src=f.src; };
    body.querySelector('[data-act=back]').onclick=()=>{ const f=content.querySelector('iframe'); try{f.contentWindow.history.back();}catch(e){} };
    body.querySelector('[data-act=fwd]').onclick=()=>{ const f=content.querySelector('iframe'); try{f.contentWindow.history.forward();}catch(e){} };
    home();
  }
};

/* ------------------------------------------------------------------ */
/* SETTINGS                                                            */
/* ------------------------------------------------------------------ */
APPS.settings = {
  title:'Einstellungen', icon:'⚙️', width:760, height:540, single:true,
  render(body, win){
    const pages = [
      {key:'personal', icon:'🎨', label:'Personalisierung'},
      {key:'system',   icon:'💻', label:'System'},
      {key:'sound',    icon:'🔊', label:'Sound'},
      {key:'about',    icon:'ℹ️', label:'Info'},
    ];
    win.state.page = win.state.page || 'personal';
    body.innerHTML = `
      <div class="settings">
        <div class="set-side">${pages.map(p=>`<div class="s-item" data-page="${p.key}"><span>${p.icon}</span><span>${p.label}</span></div>`).join('')}</div>
        <div class="set-main"></div>
      </div>`;
    const main = body.querySelector('.set-main');

    function renderPage(){
      body.querySelectorAll('.s-item').forEach(s=>s.classList.toggle('active', s.dataset.page===win.state.page));
      const dark = !document.body.classList.contains('light');
      if(win.state.page==='personal'){
        main.innerHTML = `
          <h2>Personalisierung</h2>
          <div class="set-row"><div class="desc"><b>Dunkelmodus</b><small>Dunkles Farbschema verwenden</small></div>
            <div class="toggle ${dark?'on':''}" data-toggle="theme"></div></div>
          <div class="set-row"><div class="desc"><b>Akzentfarbe</b><small>Hauptfarbe des Systems</small></div>
            <div style="display:flex;gap:8px">
              ${['#0a84ff','#ff453a','#30d158','#bf5af2','#ff9f0a','#64d2ff','#ff375f'].map(c=>`<div class="acc-dot" data-c="${c}" style="width:26px;height:26px;border-radius:50%;background:${c};cursor:pointer;border:2px solid rgba(255,255,255,.3)"></div>`).join('')}
            </div></div>
          <div class="set-row"><div class="desc"><b>Animierter Hintergrund</b><small>Bewegte Farbverläufe auf dem Desktop</small></div>
            <div class="toggle ${Win12.prefs.animBg!==false?'on':''}" data-toggle="anim"></div></div>
          <h2 style="margin-top:24px;font-size:18px">Hintergrund</h2>
          <div class="wall-grid">
            ${Win12.wallpapers.map((w,i)=>`<div class="wall-opt ${Win12.prefs.wallpaper===i?'sel':''}" data-wp="${i}" style="background:${w.css}"></div>`).join('')}
          </div>`;
        main.querySelector('[data-toggle=theme]').onclick = e=>{ Win12.toggleTheme(); renderPage(); };
        main.querySelector('[data-toggle=anim]').onclick = e=>{ e.target.classList.toggle('on'); Win12.setAnimatedBg(e.target.classList.contains('on')); };
        main.querySelectorAll('.acc-dot').forEach(d=> d.onclick=()=>{ document.documentElement.style.setProperty('--accent',d.dataset.c); Win12.prefs.accent=d.dataset.c; Win12.savePrefs(); });
        main.querySelectorAll('.wall-opt').forEach(w=> w.onclick=()=>{ Win12.setWallpaper(+w.dataset.wp); main.querySelectorAll('.wall-opt').forEach(x=>x.classList.remove('sel')); w.classList.add('sel'); });
      }
      else if(win.state.page==='system'){
        main.innerHTML = `
          <h2>System</h2>
          <div class="set-row"><div class="desc"><b>Gerätename</b><small>WINDOWS-12-PC</small></div></div>
          <div class="set-row"><div class="desc"><b>Bildschirmauflösung</b></div><span>${window.innerWidth} × ${window.innerHeight}</span></div>
          <div class="set-row"><div class="desc"><b>Offene Fenster</b></div><span>${WM.getWindows().length}</span></div>
          <div class="set-row"><div class="desc"><b>Alles zurücksetzen</b><small>Dateisystem & Einstellungen löschen</small></div>
            <button style="padding:8px 14px;border-radius:7px;background:#e81123;color:#fff" data-act="reset">Zurücksetzen</button></div>`;
        main.querySelector('[data-act=reset]').onclick=()=>{ if(confirm('Wirklich alles zurücksetzen?')){ VFS.resetAll(); localStorage.removeItem('win12_prefs'); location.reload(); } };
      }
      else if(win.state.page==='sound'){
        main.innerHTML = `
          <h2>Sound</h2>
          <div class="set-row"><div class="desc"><b>Hauptlautstärke</b></div><input type="range" min="0" max="100" value="65" style="accent-color:var(--accent);width:180px"></div>
          <div class="set-row"><div class="desc"><b>Ausgabegerät</b></div>
            <select class="set-select"><option>Lautsprecher (Virtuell)</option><option>Kopfhörer</option></select></div>
          <div class="set-row"><div class="desc"><b>Systemsounds</b><small>Sounds bei Aktionen abspielen</small></div><div class="toggle"></div></div>`;
        main.querySelectorAll('.toggle').forEach(t=>t.onclick=()=>t.classList.toggle('on'));
      }
      else if(win.state.page==='about'){
        main.innerHTML = `
          <h2>Info</h2>
          <div class="about" style="padding:0;text-align:left">
            <div class="specs">
              <div><span>Edition</span><b>Windows 12 Pro</b></div>
              <div><span>Version</span><b>12.0.2026</b></div>
              <div><span>Installiert am</span><b>${new Date().toLocaleDateString('de-DE')}</b></div>
              <div><span>Prozessor</span><b>Claude Engine ⚡ 4.8</b></div>
              <div><span>RAM</span><b>∞ GB</b></div>
              <div style="border:none"><span>Systemtyp</span><b>Web-basiert, 64-Bit</b></div>
            </div>
          </div>`;
      }
    }
    body.querySelectorAll('.s-item').forEach(s=> s.onclick=()=>{ win.state.page=s.dataset.page; renderPage(); });
    renderPage();
  }
};

/* ------------------------------------------------------------------ */
/* PAINT                                                               */
/* ------------------------------------------------------------------ */
APPS.paint = {
  title:'Paint', icon:'🎨', width:720, height:560,
  render(body, win){
    body.innerHTML = `
      <div class="paint">
        <div class="paint-tools">
          <button class="active" data-tool="brush" title="Pinsel">🖌️</button>
          <button data-tool="eraser" title="Radierer">🧽</button>
          <button data-tool="line" title="Linie">📏</button>
          <button data-tool="rect" title="Rechteck">▭</button>
          <button data-tool="circle" title="Kreis">⭕</button>
          <input type="color" value="#ff3366" title="Farbe">
          <input type="range" min="1" max="40" value="5" title="Größe">
          <span class="sz-lbl" style="font-size:12px;width:30px">5px</span>
          <button data-act="clear" title="Löschen">🗑️</button>
          <button data-act="save" title="Speichern">💾</button>
        </div>
        <div class="paint-canvas-wrap"><canvas id="paint-canvas" width="640" height="420"></canvas></div>
      </div>`;
    const canvas = body.querySelector('#paint-canvas');
    const ctx = canvas.getContext('2d');
    ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.lineCap='round'; ctx.lineJoin='round';
    let tool='brush', color='#ff3366', size=5, drawing=false, sx,sy, snapshot;
    body.querySelectorAll('[data-tool]').forEach(b=> b.onclick=()=>{ tool=b.dataset.tool; body.querySelectorAll('[data-tool]').forEach(x=>x.classList.remove('active')); b.classList.add('active'); });
    body.querySelector('input[type=color]').oninput=e=>color=e.target.value;
    const szLbl=body.querySelector('.sz-lbl');
    body.querySelector('input[type=range]').oninput=e=>{ size=+e.target.value; szLbl.textContent=size+'px'; };
    body.querySelector('[data-act=clear]').onclick=()=>{ ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); };
    body.querySelector('[data-act=save]').onclick=()=>{ const a=document.createElement('a'); a.download='zeichnung.png'; a.href=canvas.toDataURL(); a.click(); Win12.toast('Paint','Bild heruntergeladen'); };
    function pos(e){ const r=canvas.getBoundingClientRect(); return {x:(e.clientX-r.left)*(canvas.width/r.width), y:(e.clientY-r.top)*(canvas.height/r.height)}; }
    canvas.addEventListener('mousedown',e=>{ drawing=true; const p=pos(e); sx=p.x; sy=p.y;
      ctx.strokeStyle = tool==='eraser'?'#fff':color; ctx.fillStyle=ctx.strokeStyle; ctx.lineWidth=size;
      if(tool==='brush'||tool==='eraser'){ ctx.beginPath(); ctx.moveTo(p.x,p.y); }
      else snapshot = ctx.getImageData(0,0,canvas.width,canvas.height);
    });
    canvas.addEventListener('mousemove',e=>{ if(!drawing) return; const p=pos(e);
      if(tool==='brush'||tool==='eraser'){ ctx.lineTo(p.x,p.y); ctx.stroke(); }
      else { ctx.putImageData(snapshot,0,0); ctx.beginPath();
        if(tool==='line'){ ctx.moveTo(sx,sy); ctx.lineTo(p.x,p.y); ctx.stroke(); }
        else if(tool==='rect'){ ctx.strokeRect(sx,sy,p.x-sx,p.y-sy); }
        else if(tool==='circle'){ const r=Math.hypot(p.x-sx,p.y-sy); ctx.arc(sx,sy,r,0,7); ctx.stroke(); }
      }
    });
    window.addEventListener('mouseup',()=>drawing=false);
  }
};

/* ------------------------------------------------------------------ */
/* PHOTOS / IMAGE VIEWER                                               */
/* ------------------------------------------------------------------ */
APPS.photos = {
  title:'Fotos', icon:'🖼️', width:600, height:480,
  render(body, win){ this.show(win, body); },
  show(win, body){
    body = body || win.el.querySelector('.win-body');
    const path = win.state.imgPath;
    let content = '🖼️';
    if(path){ const node = VFS.resolve(path); if(node) content = node.content; WM.setTitle(win.id, path.split('/').pop()+' — Fotos'); }
    body.innerHTML = `<div class="photos"><div class="emoji-art">${content}</div></div>`;
  }
};

/* ------------------------------------------------------------------ */
/* TASK MANAGER                                                        */
/* ------------------------------------------------------------------ */
APPS.taskmgr = {
  title:'Task-Manager', icon:'📊', width:600, height:460, single:true,
  render(body, win){
    body.innerHTML = `<div class="taskmgr"><div class="tm-head">Prozesse</div><div class="tm-table"></div></div>`;
    const table = body.querySelector('.tm-table');
    function render(){
      const wins = WM.getWindows();
      const seed = wins.length*7+3;
      table.innerHTML = `
        <div class="tm-row head"><span>Name</span><span>CPU</span><span>Arbeitsspeicher</span><span></span></div>
        ${wins.map((w,i)=>{
          const cpu = ((Math.sin(seed+i*1.3)+1)*8+1).toFixed(1);
          const mem = (40+i*23+((seed*i)%60));
          return `<div class="tm-row">
            <span class="name">${w.app.icon} ${w.title}</span>
            <span>${cpu}%<div class="tm-bar"><i style="width:${Math.min(cpu*4,100)}%"></i></div></span>
            <span>${mem} MB</span>
            <button data-id="${w.id}">Beenden</button>
          </div>`;
        }).join('') || '<div style="padding:20px;color:var(--text-dim)">Keine laufenden Apps.</div>'}
        <div class="tm-row" style="opacity:.7"><span class="name">⚙️ System</span><span>2.4%</span><span>312 MB</span><span></span></div>
        <div class="tm-row" style="opacity:.7"><span class="name">🖥️ Desktop-Fenster-Manager</span><span>1.1%</span><span>96 MB</span><span></span></div>`;
      table.querySelectorAll('button[data-id]').forEach(b=> b.onclick=()=>{ WM.close(b.dataset.id); render(); });
    }
    render();
    win.state.timer = setInterval(render, 1500);
  },
  onClose(win){ clearInterval(win.state.timer); }
};

/* ------------------------------------------------------------------ */
/* MINESWEEPER                                                         */
/* ------------------------------------------------------------------ */
APPS.minesweeper = {
  title:'Minesweeper', icon:'💣', width:380, height:460,
  render(body, win){
    const N=9, MINES=10;
    body.innerHTML = `
      <div class="mines">
        <div class="mines-head"><span>💣 <b class="m-left">${MINES}</b></span><button data-act="new" style="font-size:24px;background:none">🙂</button><span>⏱️ <b class="m-time">0</b></span></div>
        <div class="mines-grid"></div>
        <div style="font-size:12px;color:var(--text-dim)">Linksklick: aufdecken · Rechtsklick: Flagge</div>
      </div>`;
    const grid = body.querySelector('.mines-grid');
    const faceBtn = body.querySelector('[data-act=new]');
    const leftEl = body.querySelector('.m-left');
    const timeEl = body.querySelector('.m-time');
    let cells, revealed, flagged, over, started, timer, time, flags;

    function init(){
      grid.style.gridTemplateColumns=`repeat(${N},30px)`;
      cells=[]; revealed=[]; flagged=[]; over=false; started=false; time=0; flags=0;
      clearInterval(timer); timeEl.textContent='0'; leftEl.textContent=MINES; faceBtn.textContent='🙂';
      // place mines
      const mineSet=new Set();
      while(mineSet.size<MINES) mineSet.add(Math.floor(Math.random()*N*N));
      for(let i=0;i<N*N;i++){ cells[i]=mineSet.has(i)?-1:0; revealed[i]=false; flagged[i]=false; }
      // counts
      for(let i=0;i<N*N;i++){ if(cells[i]===-1) continue; let c=0;
        neighbors(i).forEach(j=>{ if(cells[j]===-1)c++; }); cells[i]=c; }
      draw();
    }
    function neighbors(i){ const r=Math.floor(i/N),c=i%N,out=[];
      for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){ if(!dr&&!dc)continue; const nr=r+dr,nc=c+dc;
        if(nr>=0&&nr<N&&nc>=0&&nc<N) out.push(nr*N+nc); } return out; }
    function draw(){
      grid.innerHTML='';
      for(let i=0;i<N*N;i++){
        const d=document.createElement('div'); d.className='cell';
        if(revealed[i]){ d.classList.add('revealed');
          if(cells[i]===-1){ d.classList.add('mine'); d.textContent='💣'; }
          else if(cells[i]>0){ d.textContent=cells[i]; d.classList.add('c'+cells[i]); }
        } else if(flagged[i]){ d.classList.add('flag'); d.textContent='🚩'; }
        d.oncontextmenu=e=>{ e.preventDefault(); if(over||revealed[i])return; flagged[i]=!flagged[i]; flags+=flagged[i]?1:-1; leftEl.textContent=MINES-flags; draw(); };
        d.onclick=()=>reveal(i);
        grid.appendChild(d);
      }
    }
    function reveal(i){
      if(over||revealed[i]||flagged[i]) return;
      if(!started){ started=true; timer=setInterval(()=>{ time++; timeEl.textContent=time; },1000); }
      revealed[i]=true;
      if(cells[i]===-1){ over=true; faceBtn.textContent='😵'; clearInterval(timer);
        for(let k=0;k<N*N;k++) if(cells[k]===-1) revealed[k]=true; draw();
        Win12.toast('Minesweeper','💥 Boom! Verloren.'); return; }
      if(cells[i]===0) neighbors(i).forEach(j=>{ if(!revealed[j]) reveal(j); });
      draw();
      // win check
      if(revealed.filter(Boolean).length === N*N - MINES){ over=true; faceBtn.textContent='😎'; clearInterval(timer); Win12.toast('Minesweeper','🎉 Gewonnen in '+time+'s!'); }
    }
    faceBtn.onclick=init;
    init();
    win.state.cleanup=()=>clearInterval(timer);
  },
  onClose(win){ win.state.cleanup&&win.state.cleanup(); }
};

/* ------------------------------------------------------------------ */
/* CLOCK                                                               */
/* ------------------------------------------------------------------ */
APPS.clock = {
  title:'Uhr', icon:'🕐', width:380, height:300, single:true,
  render(body, win){
    body.innerHTML = `<div class="clockapp"><div class="big">--:--:--</div><div class="zone">Mitteleuropäische Zeit</div></div>`;
    const big = body.querySelector('.big');
    function upd(){ big.textContent = new Date().toLocaleTimeString('de-DE'); }
    upd(); win.state.timer=setInterval(upd,1000);
  },
  onClose(win){ clearInterval(win.state.timer); }
};

/* ------------------------------------------------------------------ */
/* RECYCLE BIN                                                         */
/* ------------------------------------------------------------------ */
APPS.recycle = {
  title:'Papierkorb', icon:'🗑️', width:560, height:400, single:true,
  render(body){
    body.innerHTML = `<div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;color:var(--text-dim)">
      <div style="font-size:64px">🗑️</div><div>Der Papierkorb ist leer.</div></div>`;
  }
};
