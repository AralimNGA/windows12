/* ===================================================================
   Windows 12 — Window Manager
   =================================================================== */
const WM = (() => {
  const layer = () => document.getElementById('window-layer');
  let zCounter = 100;
  let idCounter = 0;
  const windows = new Map();   // id -> winObj
  let activeId = null;

  const TASKBAR_H = 78;   // reserved space for the floating taskbar

  function nextCascade(){
    const n = windows.size;
    return { x: 90 + (n%6)*34, y: 60 + (n%6)*30 };
  }

  /* ---- create a window for an app definition ---- */
  function open(appKey){
    const app = APPS[appKey];
    if(!app) return;
    // single-instance apps: focus existing
    if(app.single){
      for(const [id,w] of windows){
        if(w.appKey === appKey){ restore(id); focus(id); return id; }
      }
    }
    const id = 'win'+(++idCounter);
    const { x, y } = nextCascade();
    const w = app.width  || 720;
    const h = app.height || 480;

    const el = document.createElement('div');
    el.className = 'window';
    el.style.left = x+'px'; el.style.top = y+'px';
    el.style.width = w+'px'; el.style.height = h+'px';
    el.dataset.id = id;
    el.innerHTML = `
      <div class="win-titlebar">
        <span class="ico">${app.icon}</span>
        <span class="win-title">${app.title}</span>
        <div class="win-controls">
          <button class="min" title="Minimieren"><svg viewBox="0 0 12 12"><line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" stroke-width="1.3"/></svg></button>
          <button class="max" title="Maximieren"><svg viewBox="0 0 12 12"><rect x="2.2" y="2.2" width="7.6" height="7.6" fill="none" stroke="currentColor" stroke-width="1.3"/></svg></button>
          <button class="close" title="Schließen"><svg viewBox="0 0 12 12"><line x1="2.5" y1="2.5" x2="9.5" y2="9.5" stroke="currentColor" stroke-width="1.3"/><line x1="9.5" y1="2.5" x2="2.5" y2="9.5" stroke="currentColor" stroke-width="1.3"/></svg></button>
        </div>
      </div>
      <div class="win-body"></div>
      ${['n','s','e','w','ne','nw','se','sw'].map(d=>`<div class="rz rz-${d}" data-dir="${d}"></div>`).join('')}
    `;
    layer().appendChild(el);

    const winObj = { id, appKey, app, el, minimized:false, maximized:false,
                     prevRect:null, title: app.title, state:{} };
    windows.set(id, winObj);

    // mount app content
    const body = el.querySelector('.win-body');
    try { app.render(body, winObj); }
    catch(e){ body.innerHTML = `<div style="padding:20px;color:#f88">Fehler beim Laden: ${e.message}</div>`; }

    bindWindow(winObj);
    focus(id);
    Taskbar.refresh();
    return id;
  }

  function bindWindow(w){
    const el = w.el;
    const tb = el.querySelector('.win-titlebar');

    el.addEventListener('mousedown', () => focus(w.id), true);

    // controls
    el.querySelector('.min').addEventListener('click', e => { e.stopPropagation(); minimize(w.id); });
    el.querySelector('.max').addEventListener('click', e => { e.stopPropagation(); toggleMax(w.id); });
    el.querySelector('.close').addEventListener('click', e => { e.stopPropagation(); close(w.id); });
    tb.addEventListener('dblclick', e => { if(!e.target.closest('.win-controls')) toggleMax(w.id); });

    // drag
    tb.addEventListener('mousedown', e => {
      if(e.target.closest('.win-controls')) return;
      startDrag(w, e);
    });

    // resize handles
    el.querySelectorAll('.rz').forEach(h => {
      h.addEventListener('mousedown', e => { e.stopPropagation(); startResize(w, e, h.dataset.dir); });
    });
  }

  /* ---------- DRAG + SNAP ---------- */
  function startDrag(w, e){
    if(w.maximized){
      // un-maximize on drag, keeping pointer over titlebar
      const ratio = e.clientX / window.innerWidth;
      toggleMax(w.id, true);
      w.el.style.left = (e.clientX - w.el.offsetWidth * ratio) + 'px';
      w.el.style.top  = '4px';
    }
    const startX = e.clientX, startY = e.clientY;
    const ox = w.el.offsetLeft, oy = w.el.offsetTop;
    let snapZone = null;
    const overlay = document.getElementById('snap-overlay');

    function move(ev){
      let nx = ox + (ev.clientX - startX);
      let ny = oy + (ev.clientY - startY);
      ny = Math.max(0, ny);
      w.el.style.left = nx+'px'; w.el.style.top = ny+'px';

      // detect snap zone
      const m = 8;
      snapZone = null;
      if(ev.clientY <= m) snapZone = 'top';
      else if(ev.clientX <= m) snapZone = 'left';
      else if(ev.clientX >= window.innerWidth - m) snapZone = 'right';

      if(snapZone){
        overlay.classList.remove('hidden');
        const r = snapRect(snapZone);
        overlay.style.cssText = `position:absolute;left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;
          background:rgba(10,132,255,.25);border:1px solid rgba(10,132,255,.6);border-radius:8px;z-index:8000;
          transition:all .12s;pointer-events:none;`;
      } else {
        overlay.classList.add('hidden');
      }
    }
    function up(){
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      overlay.classList.add('hidden');
      if(snapZone) snap(w.id, snapZone);
    }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  function snapRect(zone){
    const W = window.innerWidth, H = window.innerHeight - TASKBAR_H;
    if(zone === 'top')   return { x:0, y:0, w:W, h:H };
    if(zone === 'left')  return { x:0, y:0, w:W/2, h:H };
    if(zone === 'right') return { x:W/2, y:0, w:W/2, h:H };
  }

  function snap(id, zone){
    const w = windows.get(id);
    if(!w) return;
    if(zone === 'top' || zone === 'max'){ maximize(id); return; }
    saveRect(w);
    if(w.maximized){ w.el.classList.remove('maximized'); w.maximized = false; }
    const W = window.innerWidth, H = window.innerHeight - TASKBAR_H, hw = W/2, hh = H/2;
    const rects = {
      left:{x:0,y:0,w:hw,h:H}, right:{x:hw,y:0,w:hw,h:H},
      tl:{x:0,y:0,w:hw,h:hh}, tr:{x:hw,y:0,w:hw,h:hh},
      bl:{x:0,y:hh,w:hw,h:hh}, br:{x:hw,y:hh,w:hw,h:hh},
    };
    const r = rects[zone] || rects.left;
    w.el.classList.add('snapping');
    Object.assign(w.el.style, { left:r.x+'px', top:r.y+'px', width:r.w+'px', height:r.h+'px' });
    setTimeout(()=>w.el.classList.remove('snapping'), 160);
    focus(id);
  }

  /* ---------- RESIZE ---------- */
  function startResize(w, e, dir){
    if(w.maximized) return;
    const sx = e.clientX, sy = e.clientY;
    const r = { x:w.el.offsetLeft, y:w.el.offsetTop, w:w.el.offsetWidth, h:w.el.offsetHeight };
    const minW = 280, minH = 160;
    function move(ev){
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      let { x,y,w:ww,h:hh } = r;
      if(dir.includes('e')) ww = Math.max(minW, r.w + dx);
      if(dir.includes('s')) hh = Math.max(minH, r.h + dy);
      if(dir.includes('w')){ ww = Math.max(minW, r.w - dx); x = r.x + (r.w - ww); }
      if(dir.includes('n')){ hh = Math.max(minH, r.h - dy); y = r.y + (r.h - hh); }
      Object.assign(w.el.style, { left:x+'px', top:y+'px', width:ww+'px', height:hh+'px' });
    }
    function up(){ document.removeEventListener('mousemove',move); document.removeEventListener('mouseup',up); }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  /* ---------- STATE ---------- */
  function saveRect(w){
    w.prevRect = { left:w.el.style.left, top:w.el.style.top, width:w.el.style.width, height:w.el.style.height };
  }

  function focus(id){
    const w = windows.get(id); if(!w) return;
    if(w.minimized) restore(id);
    activeId = id;
    w.el.style.zIndex = ++zCounter;
    Taskbar.refresh();
  }

  function minimize(id){
    const w = windows.get(id); if(!w) return;
    w.el.classList.add('minimizing');
    setTimeout(()=>{ w.el.style.display='none'; w.el.classList.remove('minimizing'); }, 170);
    w.minimized = true;
    if(activeId === id) activeId = null;
    Taskbar.refresh();
  }

  function restore(id){
    const w = windows.get(id); if(!w) return;
    w.minimized = false;
    w.el.style.display = 'flex';
    w.el.style.zIndex = ++zCounter;
    activeId = id;
    Taskbar.refresh();
  }

  function toggleMax(id, force){
    const w = windows.get(id); if(!w) return;
    if(w.maximized && !force){
      // restore
      if(w.prevRect) Object.assign(w.el.style, w.prevRect);
      w.el.classList.remove('maximized');
      w.maximized = false;
    } else if(!w.maximized){
      maximize(id);
    } else if(force){ // forced un-maximize during drag
      w.el.classList.remove('maximized');
      w.maximized = false;
    }
  }

  function maximize(id){
    const w = windows.get(id); if(!w) return;
    if(!w.maximized) saveRect(w);
    w.el.classList.add('maximized');
    Object.assign(w.el.style, { left:'0px', top:'0px', width:'100%', height:(window.innerHeight - TASKBAR_H)+'px' });
    w.maximized = true;
  }

  function close(id){
    const w = windows.get(id); if(!w) return;
    if(w.app.onClose) try{ w.app.onClose(w); }catch(e){}
    w.el.style.animation = 'winMin .14s ease forwards';
    setTimeout(()=>{ w.el.remove(); }, 130);
    windows.delete(id);
    if(activeId === id) activeId = null;
    Taskbar.refresh();
  }

  function minimizeAll(){ for(const id of windows.keys()) minimize(id); }
  function getWindows(){ return [...windows.values()]; }
  function getActive(){ return activeId; }
  function setTitle(id, t){ const w = windows.get(id); if(w){ w.title=t; w.el.querySelector('.win-title').textContent=t; Taskbar.refresh(); } }

  return { open, close, minimize, restore, focus, toggleMax, minimizeAll, snapTo:snap,
           getWindows, getActive, setTitle, windows };
})();
