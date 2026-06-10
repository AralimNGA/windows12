/* ===================================================================
   Windows 12 — Main / Shell  (boot, login, taskbar, start menu, …)
   =================================================================== */

/* ---------- Global Shell API (used by apps) ---------- */
const Win12 = {
  wallpapers: [
    { name:'Standard', css:'linear-gradient(135deg,#0a1830,#1a1140,#2a0f3a)' },
    { name:'Ozean',    css:'linear-gradient(135deg,#0b486b,#3b8686,#79bd9a)' },
    { name:'Sonnenuntergang', css:'linear-gradient(135deg,#ff512f,#dd2476,#7b2ff7)' },
    { name:'Wald',     css:'linear-gradient(135deg,#134e5e,#71b280)' },
    { name:'Nacht',    css:'linear-gradient(135deg,#000428,#004e92)' },
    { name:'Aurora',   css:'linear-gradient(135deg,#00c6ff,#0072ff,#7b2ff7)' },
  ],
  prefs: {},

  toast(title, msg){
    let layer = document.getElementById('toast-layer');
    if(!layer){ layer=document.createElement('div'); layer.id='toast-layer'; document.getElementById('desktop').appendChild(layer); }
    const t = document.createElement('div'); t.className='toast';
    t.innerHTML = `<b>${title}</b><small>${msg}</small>`;
    layer.appendChild(t);
    setTimeout(()=>{ t.style.transition='.3s'; t.style.opacity='0'; t.style.transform='translateX(20px)'; setTimeout(()=>t.remove(),300); }, 3500);
  },

  contextMenu(x, y, items){
    const menu = document.getElementById('context-menu');
    menu.innerHTML = items.map(it=> it.sep ? '<div class="ctx-sep"></div>'
      : `<div class="ctx-item ${it.disabled?'disabled':''}"><span class="ico">${it.icon||''}</span><span>${it.label}</span></div>`).join('');
    menu.classList.remove('hidden');
    // position (keep on screen)
    const w=240, h=items.length*38;
    menu.style.left = Math.min(x, window.innerWidth-w)+'px';
    menu.style.top  = Math.min(y, window.innerHeight-h-50)+'px';
    const nodes = [...menu.querySelectorAll('.ctx-item')];
    let idx=0;
    items.forEach(it=>{ if(it.sep) return; const node=nodes[idx++];
      if(!it.disabled) node.onclick=()=>{ menu.classList.add('hidden'); it.action&&it.action(); };
    });
  },

  toggleTheme(){
    document.body.classList.toggle('light');
    Win12.prefs.light = document.body.classList.contains('light');
    Win12.savePrefs();
  },
  setWallpaper(i){
    const wp = Win12.wallpapers[i]; if(!wp) return;
    document.getElementById('desktop').style.backgroundImage = wp.css;
    Win12.prefs.wallpaper = i; Win12.savePrefs();
  },
  setAnimatedBg(on){
    Win12.prefs.animBg = on; Win12.savePrefs();
    const bg = document.getElementById('living-bg');
    if(bg) bg.style.display = on ? '' : 'none';
  },
  savePrefs(){ try{ localStorage.setItem('win12_prefs', JSON.stringify(Win12.prefs)); }catch(e){} },
  loadPrefs(){
    try{ Win12.prefs = JSON.parse(localStorage.getItem('win12_prefs')||'{}'); }catch(e){ Win12.prefs={}; }
    if(Win12.prefs.light) document.body.classList.add('light');
    if(Win12.prefs.accent) document.documentElement.style.setProperty('--accent', Win12.prefs.accent);
    if(typeof Win12.prefs.wallpaper==='number') Win12.setWallpaper(Win12.prefs.wallpaper);
  },

  openFileInNotepad(path){
    const id = WM.open('notepad');
    const w = WM.windows.get(id);
    w.state.openPath = path;
    w.app.render(w.el.querySelector('.win-body'), w);
  },
};

/* ---------- Taskbar ---------- */
const Taskbar = {
  // apps pinned to the taskbar
  pinned: ['explorer','browser','notepad','calculator','terminal','settings','paint','minesweeper'],
  refresh(){
    const cont = document.getElementById('tb-apps');
    if(!cont) return;
    const wins = WM.getWindows();
    const active = WM.getActive();
    // group running windows by app
    const runningByApp = {};
    wins.forEach(w=>{ (runningByApp[w.appKey]=runningByApp[w.appKey]||[]).push(w); });

    const keys = [...new Set([...this.pinned, ...Object.keys(runningByApp)])];
    cont.innerHTML = keys.map(key=>{
      const app = APPS[key]; if(!app) return '';
      const running = runningByApp[key];
      const isActive = running && running.some(w=>w.id===active && !w.minimized);
      return `<div class="tb-app ${running?'running':''} ${isActive?'active':''}" data-app="${key}" title="${app.title}">${app.icon}</div>`;
    }).join('');

    cont.querySelectorAll('.tb-app').forEach(el=>{
      const key = el.dataset.app;
      el.onclick = ()=>{
        const running = runningByApp[key];
        if(!running){ WM.open(key); return; }
        // toggle minimize / focus
        const focused = running.find(w=>w.id===WM.getActive() && !w.minimized);
        if(focused){ WM.minimize(focused.id); }
        else { const target = running.find(w=>w.minimized) || running[0]; WM.restore(target.id); WM.focus(target.id); }
      };
      el.oncontextmenu = (e)=>{ e.preventDefault();
        const running = runningByApp[key];
        Win12.contextMenu(e.clientX, e.clientY, [
          {label:'Öffnen', icon:APPS[key].icon, action:()=>WM.open(key)},
          ...(running?[{label:'Alle Fenster schließen', icon:'✖️', action:()=>running.forEach(w=>WM.close(w.id))}]:[]),
        ]);
      };
    });
  }
};

/* =================================================================== */
/* BOOT SEQUENCE                                                       */
/* =================================================================== */
function boot(){
  Win12.loadPrefs();
  setTimeout(()=>{
    document.getElementById('boot-screen').classList.add('hidden');
    showLock();
  }, 1500);
}

function showLock(){
  const lock = document.getElementById('lock-screen');
  lock.classList.remove('hidden');
  updateLockClock();
  const form = document.getElementById('login-form');
  form.onsubmit = (e)=>{ e.preventDefault(); enterDesktop(); };
  const hint = lock.querySelector('.lock-hint');
  if(hint) hint.textContent = 'Automatische Anmeldung…';
  // Auto-login: behave like a real PC that boots straight into the session
  setTimeout(()=>enterDesktop(), 1300);
}

function updateLockClock(){
  const now = new Date();
  const t = document.getElementById('lock-time');
  const d = document.getElementById('lock-date');
  if(t) t.textContent = now.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
  if(d) d.textContent = now.toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'});
}

let loggedIn = false;
function enterDesktop(){
  if(loggedIn) return; loggedIn = true;
  const lock = document.getElementById('lock-screen');
  lock.style.transition='.4s'; lock.style.opacity='0';
  setTimeout(()=>{
    lock.classList.add('hidden'); lock.style.opacity='1';
    const desk = document.getElementById('desktop');
    desk.classList.remove('hidden');
    initDesktop();
  }, 400);
}

/* =================================================================== */
/* DESKTOP INIT                                                        */
/* =================================================================== */
let desktopReady = false;
function initDesktop(){
  if(desktopReady){ return; }
  desktopReady = true;

  buildDesktopIcons();
  buildStartMenu();
  Taskbar.refresh();
  startClock();
  buildCalendar();
  bindShellEvents();
  if(typeof Extras !== 'undefined') Extras.init();

  setTimeout(()=>Win12.toast('Willkommen 👋','Tipp: Strg+Leertaste öffnet die Suche, Strg+/ den Copilot.'), 800);
}

const DESKTOP_APPS = [
  {key:'about',      label:'Willkommen'},
  {key:'explorer',   label:'Dieser PC'},
  {key:'recycle',    label:'Papierkorb'},
  {key:'browser',    label:'Edge'},
  {key:'notepad',    label:'Editor'},
  {key:'terminal',   label:'Terminal'},
  {key:'minesweeper',label:'Minesweeper'},
];

function buildDesktopIcons(){
  const cont = document.getElementById('desktop-icons');
  cont.innerHTML = DESKTOP_APPS.map(a=>`
    <div class="desk-icon" data-app="${a.key}">
      <div class="ico">${APPS[a.key].icon}</div>
      <div class="lbl">${a.label}</div>
    </div>`).join('');
  cont.querySelectorAll('.desk-icon').forEach(ic=>{
    ic.onclick = (e)=>{ e.stopPropagation();
      cont.querySelectorAll('.desk-icon').forEach(x=>x.classList.remove('selected'));
      ic.classList.add('selected');
    };
    ic.ondblclick = ()=> WM.open(ic.dataset.app);
    ic.oncontextmenu = (e)=>{ e.preventDefault(); e.stopPropagation();
      Win12.contextMenu(e.clientX, e.clientY, [
        {label:'Öffnen', icon:'📂', action:()=>WM.open(ic.dataset.app)},
      ]);
    };
  });
}

/* ---------- Start Menu ---------- */
const START_APPS = ['explorer','browser','notepad','calculator','terminal','settings','paint','photos','minesweeper','clock','taskmgr','about'];
function buildStartMenu(){
  const grid = document.getElementById('start-pinned');
  grid.innerHTML = START_APPS.map(k=>`
    <div class="start-app" data-app="${k}"><div class="ico">${APPS[k].icon}</div><div class="lbl">${APPS[k].title}</div></div>`).join('');
  grid.querySelectorAll('.start-app').forEach(a=> a.onclick=()=>{ WM.open(a.dataset.app); closeStart(); });

  const rec = document.getElementById('start-recommended');
  const recents = [
    {key:'notepad', icon:'📄', name:'Willkommen.txt', sub:'Zuletzt geöffnet', file:'C:/Users/Admin/Dokumente/Willkommen.txt'},
    {key:'photos',  icon:'🌅', name:'Sonnenuntergang.png', sub:'Bilder', img:'C:/Users/Admin/Bilder/Sonnenuntergang.png'},
    {key:'minesweeper', icon:'💣', name:'Minesweeper', sub:'Spiel'},
    {key:'settings', icon:'⚙️', name:'Einstellungen', sub:'System'},
  ];
  rec.innerHTML = recents.map((r,i)=>`<div class="rec-item" data-i="${i}"><span class="ico">${r.icon}</span><span class="meta"><b>${r.name}</b><small>${r.sub}</small></span></div>`).join('');
  rec.querySelectorAll('.rec-item').forEach(el=> el.onclick=()=>{
    const r = recents[+el.dataset.i];
    if(r.file){ Win12.openFileInNotepad(r.file); }
    else if(r.img){ const id=WM.open('photos'); const w=WM.windows.get(id); w.state.imgPath=r.img; w.app.show(w); }
    else WM.open(r.key);
    closeStart();
  });

  // search
  const search = document.getElementById('start-search-input');
  search.oninput = ()=>{
    const q = search.value.toLowerCase().trim();
    grid.querySelectorAll('.start-app').forEach(a=>{
      const k=a.dataset.app; const hit = !q || APPS[k].title.toLowerCase().includes(q) || k.includes(q);
      a.style.display = hit ? '' : 'none';
    });
  };

  document.getElementById('power-btn').onclick = showPowerMenu;
}

function showPowerMenu(){
  const btn = document.getElementById('power-btn');
  const r = btn.getBoundingClientRect();
  Win12.contextMenu(r.left-120, r.top-130, [
    {label:'Energie sparen', icon:'🌙', action:()=>Win12.toast('System','Energiesparmodus (simuliert)')},
    {label:'Herunterfahren', icon:'⏻', action:()=>shutdown('Wird heruntergefahren…', true)},
    {label:'Neu starten', icon:'🔄', action:()=>shutdown('Wird neu gestartet…', false)},
    {label:'Abmelden', icon:'👤', action:()=>shutdown('Abmelden…', 'lock')},
  ]);
  closeStart();
}

function shutdown(text, mode){
  closeAllFlyouts();
  const sd = document.getElementById('shutdown-screen');
  document.getElementById('shutdown-text').textContent = text;
  sd.classList.remove('hidden');
  setTimeout(()=>{
    if(mode === true){
      sd.querySelector('.boot-spinner').style.display='none';
      document.getElementById('shutdown-text').innerHTML = 'Du kannst den Computer jetzt ausschalten.<br><br><button onclick="location.reload()" style="margin-top:10px;padding:8px 18px;border-radius:8px;background:var(--accent);color:#fff">Erneut starten</button>';
    } else if(mode==='lock'){
      location.reload();
    } else {
      location.reload();
    }
  }, 2200);
}

/* ---------- Clock / Tray ---------- */
function startClock(){
  function tick(){
    const now = new Date();
    const time = now.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
    const date = now.toLocaleDateString('de-DE');
    const tT = document.getElementById('tb-time'); if(tT) tT.textContent = time;
    const tD = document.getElementById('tb-date'); if(tD) tD.textContent = date;
    const bt = document.getElementById('cal-big-time'); if(bt) bt.textContent = now.toLocaleTimeString('de-DE');
    const bd = document.getElementById('cal-big-date'); if(bd) bd.textContent = now.toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    updateLockClock();
  }
  tick(); setInterval(tick, 1000);
}

/* ---------- Calendar ---------- */
let calViewDate = new Date();
function buildCalendar(){
  const grid = document.getElementById('cal-grid');
  const monthLbl = document.getElementById('cal-month');
  function render(){
    const y = calViewDate.getFullYear(), m = calViewDate.getMonth();
    monthLbl.textContent = calViewDate.toLocaleDateString('de-DE',{month:'long',year:'numeric'});
    const dows = ['Mo','Di','Mi','Do','Fr','Sa','So'];
    let html = dows.map(d=>`<div class="dow">${d}</div>`).join('');
    const first = new Date(y,m,1);
    let startDow = (first.getDay()+6)%7; // Monday=0
    const daysIn = new Date(y,m+1,0).getDate();
    const prevDays = new Date(y,m,0).getDate();
    const today = new Date();
    for(let i=0;i<startDow;i++) html += `<div class="day muted">${prevDays-startDow+i+1}</div>`;
    for(let d=1;d<=daysIn;d++){
      const isToday = d===today.getDate()&&m===today.getMonth()&&y===today.getFullYear();
      html += `<div class="day ${isToday?'today':''}">${d}</div>`;
    }
    grid.innerHTML = html;
  }
  document.getElementById('cal-prev').onclick=()=>{ calViewDate.setMonth(calViewDate.getMonth()-1); render(); };
  document.getElementById('cal-next').onclick=()=>{ calViewDate.setMonth(calViewDate.getMonth()+1); render(); };
  render();
}

/* ---------- Flyouts ---------- */
function closeStart(){ document.getElementById('start-menu').classList.add('hidden'); document.getElementById('start-btn').classList.remove('active'); }
function closeAllFlyouts(){
  closeStart();
  document.getElementById('action-center').classList.add('hidden');
  document.getElementById('calendar-flyout').classList.add('hidden');
  document.getElementById('context-menu').classList.add('hidden');
}
function toggleFlyout(id){
  const el = document.getElementById(id);
  const isHidden = el.classList.contains('hidden');
  closeAllFlyouts();
  if(isHidden){ el.classList.remove('hidden'); if(id==='start-menu'){ document.getElementById('start-btn').classList.add('active'); document.getElementById('start-search-input').focus(); } }
}

/* ---------- Shell Events ---------- */
function bindShellEvents(){
  document.getElementById('start-btn').onclick = (e)=>{ e.stopPropagation(); toggleFlyout('start-menu'); };
  document.getElementById('search-btn').onclick = (e)=>{ e.stopPropagation(); toggleFlyout('start-menu'); };
  document.getElementById('tb-clock').onclick = (e)=>{ e.stopPropagation(); toggleFlyout('calendar-flyout'); };
  document.getElementById('tray-icons').onclick = (e)=>{ e.stopPropagation(); toggleFlyout('action-center'); };

  // action center tiles
  document.querySelectorAll('.ac-tile').forEach(tile=>{
    tile.onclick = ()=>{
      tile.classList.toggle('active');
      const t = tile.dataset.toggle;
      if(t==='theme'){ Win12.toggleTheme(); }
      if(t==='night'){ document.body.classList.toggle('night'); }
      if(t==='airplane'){ const net=document.getElementById('tray-net'); net.textContent = tile.classList.contains('active')?'✈️':'📶'; }
    };
  });
  document.getElementById('bri-slider').oninput = (e)=>{
    document.getElementById('window-layer').style.filter = `brightness(${0.4+e.target.value/100*0.6})`;
  };

  // show desktop
  document.getElementById('show-desktop').onclick = ()=> WM.minimizeAll();

  // weather flyout (just a toast)
  document.getElementById('tb-weather').onclick = ()=> Win12.toast('Wetter','⛅ 18°C, teilweise bewölkt · Berlin');

  // desktop right-click
  document.getElementById('desktop').addEventListener('contextmenu', (e)=>{
    if(e.target.closest('.window') || e.target.closest('#taskbar') || e.target.closest('.desk-icon')) return;
    e.preventDefault();
    Win12.contextMenu(e.clientX, e.clientY, [
      {label:'Aktualisieren', icon:'🔄', action:()=>{ buildDesktopIcons(); Win12.toast('Desktop','Aktualisiert'); }},
      {sep:true},
      {label:'Neuer Ordner', icon:'📂', action:()=>{ VFS.mkdir('C:/Users/Admin/Desktop','Neuer Ordner'); Win12.toast('Desktop','Ordner in Desktop erstellt'); }},
      {label:'Editor öffnen', icon:'📝', action:()=>WM.open('notepad')},
      {label:'Terminal öffnen', icon:'⬛', action:()=>WM.open('terminal')},
      {sep:true},
      {label:'Design ändern', icon:'🎨', action:()=>Win12.toggleTheme()},
      {label:'Anzeigeeinstellungen', icon:'⚙️', action:()=>WM.open('settings')},
    ]);
  });

  // desktop click clears selection + closes flyouts
  document.getElementById('desktop').addEventListener('mousedown', (e)=>{
    if(!e.target.closest('#start-menu') && !e.target.closest('#start-btn') && !e.target.closest('#search-btn')
       && !e.target.closest('#action-center') && !e.target.closest('#tray-icons')
       && !e.target.closest('#calendar-flyout') && !e.target.closest('#tb-clock')){
      closeAllFlyouts();
    }
    if(e.target.id==='desktop' || e.target.id==='desktop-icons' || e.target.id==='window-layer'){
      document.querySelectorAll('.desk-icon').forEach(x=>x.classList.remove('selected'));
      startSelectBox(e);
    }
  });

  // global click closes context menu
  document.addEventListener('click', (e)=>{
    if(!e.target.closest('#context-menu')) document.getElementById('context-menu').classList.add('hidden');
  });

  // keyboard shortcuts
  document.addEventListener('keydown', (e)=>{
    if(e.key==='Escape'){ closeAllFlyouts(); }
    // Win/Meta key toggles start
    if(e.key==='Meta' || (e.key===' ' && e.ctrlKey)){ e.preventDefault(); toggleFlyout('start-menu'); }
  });
}

/* ---------- Selection box ---------- */
function startSelectBox(e){
  const box = document.getElementById('select-box');
  const sx=e.clientX, sy=e.clientY;
  box.style.display='block';
  function move(ev){
    const x=Math.min(sx,ev.clientX), y=Math.min(sy,ev.clientY);
    const w=Math.abs(ev.clientX-sx), h=Math.abs(ev.clientY-sy);
    Object.assign(box.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'});
    // select intersecting icons
    document.querySelectorAll('.desk-icon').forEach(ic=>{
      const r=ic.getBoundingClientRect();
      const hit = !(r.right<x||r.left>x+w||r.bottom<y||r.top>y+h);
      ic.classList.toggle('selected', hit);
    });
  }
  function up(){ box.style.display='none'; Object.assign(box.style,{width:0,height:0}); document.removeEventListener('mousemove',move); document.removeEventListener('mouseup',up); }
  document.addEventListener('mousemove',move);
  document.addEventListener('mouseup',up);
}

/* ---------- Start ---------- */
window.addEventListener('DOMContentLoaded', boot);
