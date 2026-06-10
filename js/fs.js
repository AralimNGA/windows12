/* ===================================================================
   Windows 12 — Virtual File System (persisted to localStorage)
   A tiny in-memory tree: folders contain children; files have content.
   =================================================================== */
const VFS = (() => {
  const KEY = 'win12_vfs_v1';

  const defaultTree = {
    name: 'C:', type: 'dir', children: {
      'Users': { name:'Users', type:'dir', children: {
        'Admin': { name:'Admin', type:'dir', children: {
          'Desktop':   { name:'Desktop',   type:'dir', children:{} },
          'Dokumente': { name:'Dokumente', type:'dir', children: {
            'Willkommen.txt': { name:'Willkommen.txt', type:'file', content:
`Willkommen bei Windows 12! 🎉

Dieses Betriebssystem läuft komplett im Browser und wurde
von Claude in HTML, CSS und JavaScript gebaut.

Was du ausprobieren kannst:
 • Fenster verschieben, vergrößern, andocken (an den Bildschirmrand ziehen)
 • Apps über das Startmenü öffnen
 • Im Terminal Befehle eingeben (tippe "help")
 • Dateien im Explorer verwalten
 • Im Editor schreiben und speichern (Strg+S)
 • Das Design in den Einstellungen ändern (Hell/Dunkel)
 • Minesweeper spielen 💣

Viel Spaß!` },
            'Notizen.txt': { name:'Notizen.txt', type:'file', content:'- Einkaufen\n- Windows 12 testen\n- Kaffee ☕' },
          }},
          'Bilder': { name:'Bilder', type:'dir', children: {
            'Sonnenuntergang.png': { name:'Sonnenuntergang.png', type:'file', content:'🌅', kind:'image' },
            'Berge.png':           { name:'Berge.png',           type:'file', content:'🏔️', kind:'image' },
            'Katze.png':           { name:'Katze.png',           type:'file', content:'🐱', kind:'image' },
          }},
          'Downloads': { name:'Downloads', type:'dir', children:{} },
          'Musik':     { name:'Musik',     type:'dir', children:{} },
        }}
      }},
      'Windows': { name:'Windows', type:'dir', children: {
        'System32': { name:'System32', type:'dir', children: {
          'kernel.sys': { name:'kernel.sys', type:'file', content:'// Bitte nicht löschen ;)', kind:'system' },
        }}
      }},
      'Programme': { name:'Programme', type:'dir', children:{} },
    }
  };

  let tree;
  try {
    const saved = localStorage.getItem(KEY);
    tree = saved ? JSON.parse(saved) : structuredClone(defaultTree);
  } catch(e){ tree = structuredClone(defaultTree); }

  function save(){ try{ localStorage.setItem(KEY, JSON.stringify(tree)); }catch(e){} }

  // Resolve a path like "C:/Users/Admin/Dokumente" -> node
  function resolve(path){
    const parts = path.replace(/\\/g,'/').split('/').filter(Boolean);
    let node = tree;
    if(parts[0] === 'C:') parts.shift();
    for(const p of parts){
      if(node.type !== 'dir' || !node.children[p]) return null;
      node = node.children[p];
    }
    return node;
  }

  function list(path){
    const node = resolve(path);
    if(!node || node.type !== 'dir') return [];
    return Object.values(node.children).sort((a,b)=>{
      if(a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  function readFile(path){
    const node = resolve(path);
    return node && node.type === 'file' ? node.content : null;
  }

  function writeFile(path, content, kind){
    const parts = path.replace(/\\/g,'/').split('/').filter(Boolean);
    if(parts[0]==='C:') parts.shift();
    const fname = parts.pop();
    const dir = resolve('C:/'+parts.join('/'));
    if(!dir || dir.type !== 'dir') return false;
    if(dir.children[fname] && dir.children[fname].type === 'file'){
      dir.children[fname].content = content;
    } else {
      dir.children[fname] = { name:fname, type:'file', content, kind:kind||'text' };
    }
    save(); return true;
  }

  function mkdir(path, name){
    const dir = resolve(path);
    if(!dir || dir.type !== 'dir') return false;
    let base = name, i = 2;
    while(dir.children[base]){ base = `${name} (${i++})`; }
    dir.children[base] = { name:base, type:'dir', children:{} };
    save(); return base;
  }

  function createFile(path, name){
    const dir = resolve(path);
    if(!dir || dir.type !== 'dir') return false;
    let base = name, i = 2;
    const ext = name.includes('.') ? '' : '.txt';
    base = name + ext;
    while(dir.children[base]){
      const dot = (name+ext).lastIndexOf('.');
      base = `${(name+ext).slice(0,dot)} (${i++})${(name+ext).slice(dot)}`;
    }
    dir.children[base] = { name:base, type:'file', content:'', kind:'text' };
    save(); return base;
  }

  function remove(path, name){
    const dir = resolve(path);
    if(!dir || !dir.children[name]) return false;
    delete dir.children[name];
    save(); return true;
  }

  function rename(path, oldName, newName){
    const dir = resolve(path);
    if(!dir || !dir.children[oldName] || dir.children[newName]) return false;
    const node = dir.children[oldName];
    node.name = newName;
    dir.children[newName] = node;
    delete dir.children[oldName];
    save(); return true;
  }

  function resetAll(){ tree = structuredClone(defaultTree); save(); }

  return { resolve, list, readFile, writeFile, mkdir, createFile, remove, rename, save, resetAll,
           get tree(){ return tree; } };
})();
