/* ===========================
   Grille (modèle pur)
   - gestion des cellules
   - utilitaires de voisinage
   - génération: emojis, labyrinthe, plus long path
   - remplissage du path (exposants, “voisin-aware”)
   - distracteurs récursifs (fauxPath)
   - neutres
   - diagnostic raccourcis
   =========================== */


  /* ---------- Helpers génériques ---------- */
  function randInt(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }
  function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
  function isMulDiv(a,b){ return a>0 && b>0 && (a%b===0 || b%a===0); }


function factorDecomp(n) {
  let num = n;
  const factors = {};
  let d = 2;
  while (num > 1) {
    while (num % d === 0) {
      factors[d] = (factors[d] || 0) + 1;
      num /= d;
    }
    d++;
    if (d * d > num && num > 1) {
      factors[num] = (factors[num] || 0) + 1;
      break;
    }
  }
  return Object.entries(factors)
    .map(([p, e]) => (e > 1 ? `${p}^${e}` : `${p}`))
    .join(" × ");
}

function logPathVal(tag, step, r, c, val, palette){
  const pal = (palette && palette.length) ? `  | palette:[${palette.join(', ')}]` : "";
  console.log(`[${tag}] #${String(step).padStart(2,'0')} (${r},${c})  ${val} = ${factorDecomp(val)}${pal}`);
}



  /* ---------- Exposants / nombres ---------- */
  const PRIME_BASE_DEFAULT = [2,3,5,7,11];

  function vecFromValue(n, base=PRIME_BASE_DEFAULT){
    const v={}; for(const p of base) v[p]=0;
    let x=n;
    for(const p of base){
      while(x%p===0){ v[p]++; x/=p; }
    }
    if(x>1){ // prime hors base : on compacte dans le dernier prime de base
      const last = base[base.length-1];
      v[last] = (v[last]||0)+1;
    }
    return v;
  }
  function valueFromVec(vec, base=PRIME_BASE_DEFAULT){
    let v=1;
    for(const p of base){ const e=vec[p]||0; if(e>0) v*=p**e; }
    return v;
  }
  function cloneVec(v, base=PRIME_BASE_DEFAULT){ const o={}; for(const p of base) o[p]=v[p]||0; return o; }

  /* ---------- Grille ---------- */
  class Grille {
    /**
     * @param {number} rows
     * @param {number} cols
     */
    constructor(rows, cols){
      this.rows = rows;
      this.cols = cols;
      this.cells = Array.from({length:rows}, (_,r)=>
        Array.from({length:cols}, (_,c)=> new Cellule(r,c))
      );
    }

    /* --- accès & voisinage --- */
    inBounds(r,c){ return r>=0 && r<this.rows && c>=0 && c<this.cols; }
    get(r,c){ return this.cells[r][c]; }
    neighbors4(r,c){
      const nb=[[r+1,c],[r-1,c],[r,c+1],[r,c-1]];
      return nb.filter(([rr,cc])=> this.inBounds(rr,cc));
    }
    neighborsCheb(r,c,rad){
      const list=[];
      for(let dr=-rad; dr<=rad; dr++){
        for(let dc=-rad; dc<=rad; dc++){
          if(dr===0 && dc===0) continue;
          const rr=r+dr, cc=c+dc;
          if(this.inBounds(rr,cc)) list.push([rr,cc]);
        }
      }
      return list;
    }
    forEachCell(fn){
      for(let r=0;r<this.rows;r++) for(let c=0;c<this.cols;c++) fn(this.cells[r][c], r, c);
    }

    /* --- Emojis (masque) --- */
    /**
     * Place des emojis avec un halo de Chebyshev (anti-agglomération).
     * @returns {number} combien placés
     */
    makeEmojiMask({ ratio=0.22, halo=1, emojis=["🌳","🍄","🌸","🌼","🌲","🌿","🪨"] } = {}){
      const all=[];
      for(let r=0;r<this.rows;r++) for(let c=0;c<this.cols;c++) all.push([r,c]);
      shuffle(all);
      const target = Math.floor(ratio*this.rows*this.cols);
      let placed=0;
      for(const [r,c] of all){
        if(placed>=target) break;
        const cell=this.get(r,c);
        if(cell.isEmoji || !cell.isEmpty) continue;
        // halo libre d’emoji
        let ok=true;
        for(const [rr,cc] of this.neighborsCheb(r,c,halo)){
          if(this.get(rr,cc).isEmoji){ ok=false; break; }
        }
        if(!ok) continue;
        cell.setEmoji(emojis[Math.floor(Math.random()*emojis.length)], {deactivate:true});
        placed++;
      }
      return placed;
    }

    /* --- Composante libre (sans emoji) --- */
/* --- Composante libre (sans emoji) --- */
largestFreeComponent(){
  const seen = Array.from({length:this.rows},()=>Array(this.cols).fill(false));
  let best=[], bestSize=0;
  for(let r=0;r<this.rows;r++){
    for(let c=0;c<this.cols;c++){
      const cell=this.get(r,c);
      if(cell.isEmoji || seen[r][c]) continue;
      const comp=[], q=[[r,c]]; seen[r][c]=true;
      while(q.length){
        const [x,y]=q.shift(); comp.push([x,y]);
        for(const [nx,ny] of this.neighbors4(x,y)){
          if(!this.get(nx,ny).isEmoji && !seen[nx][ny]){
            seen[nx][ny]=true;
            q.push([nx,ny]);
          }
        }
      }
      if(comp.length>bestSize){ bestSize=comp.length; best=comp; }
    }
  }

  const inBest = new Set(best.map(([r,c])=> gid(r,c)));
  const adj = this.generateMaze(inBest);   // 🔹 ajout ici

  return { cells: best, inBest, adj };     // 🔹 on renvoie aussi adj
}


    /* --- Labyrinthe parfait sur inComponent (backtracker) --- */
    generateMaze(inComponent){
      const adj = new Map();
      for(let r=0;r<this.rows;r++) for(let c=0;c<this.cols;c++) adj.set(gid(r,c), []);
      if(inComponent.size===0) return adj;

      const firstKey = inComponent.values().next().value;
      const [sr,sc] = firstKey.split("_").map(Number);
      const visited = Array.from({length:this.rows},()=>Array(this.cols).fill(false));

      const stack=[[sr,sc]]; visited[sr][sc]=true;
      while(stack.length){
        const [r,c]=stack[stack.length-1];
        const nbs = shuffle(this.neighbors4(r,c)).filter(([rr,cc])=> inComponent.has(gid(rr,cc)) && !visited[rr][cc]);
        if(nbs.length===0){ stack.pop(); continue; }
        const [nr,nc]=nbs[0];
        adj.get(gid(r,c)).push([nr,nc]);
        adj.get(gid(nr,nc)).push([r,c]);
        visited[nr][nc]=true;
        stack.push([nr,nc]);
      }
      return adj;
    }

    /* --- Plus long chemin dans le labyrinthe (double BFS) --- */
    bfsFarthest(adj, start){
      const q=[start], dist=new Map([[gid(...start),0]]), prev=new Map([[gid(...start),null]]);
      while(q.length){
        const [r,c]=q.shift();
        for(const [nr,nc] of (adj.get(gid(r,c))||[])){
          const key=gid(nr,nc);
          if(!dist.has(key)){
            dist.set(key, dist.get(gid(r,c))+1);
            prev.set(key, [r,c]);
            q.push([nr,nc]);
          }
        }
      }
      let best=start, bestd=-1;
      for(const [key,d] of dist.entries()){
        if(d>bestd){ bestd=d; best=key.split("_").map(Number); }
      }
      return { end: best, prev };
    }
    pathFromPrev(prev, start, end){
      const path=[]; let cur=end;
      while(cur){ path.push(cur); cur=prev.get(gid(...cur)); }
      return path.reverse();
    }
    longestPath(adj, inComponent){
      if(inComponent.size===0) return { path:[], start:null, end:null };
      const a = inComponent.values().next().value.split("_").map(Number);
      const b = this.bfsFarthest(adj, a).end;
      const binfo = this.bfsFarthest(adj, b);
      const c = binfo.end;
      const sol = this.pathFromPrev(binfo.prev, b, c);
      return { path: sol, start: b, end: c };
    }

    /* --- Outils “voisin-aware” pour génération du path --- */
    assignedNeighborVals(r, c, mapVal, prevCoord=null){
      const vals=[];
      for(const [nr,nc] of this.neighbors4(r,c)){
        if(prevCoord && nr===prevCoord[0] && nc===prevCoord[1]) continue;
        const v = mapVal.get(gid(nr,nc));
        if(v>0) vals.push(v);
      }
      return vals;
    }
    okAvoid(nv, avoidList){
      for(const v of avoidList){ if(isMulDiv(nv, v)) return false; }
      return true;
    }

    /* --- Génération path (exposants + voisins déjà posés) --- */
    assignPathNumbersWithRule(path, {
      bounds={minVal:6, maxVal:120},
      primesBase=PRIME_BASE_DEFAULT,
      spoilerPrime=null,
      pathGen={
        pRun:0.65,
        up2Chance:0.25,
        down2Chance:0.45,
        palettes:[[2,3],[3,5],[2,5]]
      },
      startPool=[6,8,9,10,12,14,15]
    } = {}){
      if(!path || !path.length) return;

      const hasSpoiler = (n)=> (spoilerPrime && spoilerPrime>1) ? (n%spoilerPrime===0) : false;

      // helpers UP/DOWN “aware”
      const pickUpVec = (prevVec, stepIdx, avoidVals)=>{
        const groups = pathGen.palettes.map(g=>g.filter(p=>p!==spoilerPrime));
        const g = groups[stepIdx % groups.length];
        // essais ordonnés: +1 sur 1 prime, +1+1, puis +2
        const tries=[];
        for(const p of g) tries.push({[p]:1});
        for(let i=0;i<g.length;i++) for(let j=i+1;j<g.length;j++) tries.push({[g[i]]:1,[g[j]]:1});
        for(const p of g) tries.push({[p]:2});
        for(const delta of tries){
          const cand = cloneVec(prevVec, primesBase);
          for(const p in delta) cand[p] = (cand[p]||0)+delta[p];
          const val = valueFromVec(cand, primesBase);
          if(val>=bounds.minVal && val<=bounds.maxVal && !hasSpoiler(val) && this.okAvoid(val, avoidVals)) return cand;
        }
        return null;
      };
      const pickDownVec = (prevVec, avoidVals)=>{
        const order = [...primesBase]
          .sort((a,b)=>{
            const ea=prevVec[a]||0, eb=prevVec[b]||0;
            const wa=(a>5?3:1), wb=(b>5?3:1);
            return (eb*wb) - (ea*wa);
          })
          .filter(p=>(prevVec[p]||0)>0);
        if(!order.length) return null;
        const tries=[];
        for(const p of order) tries.push({[p]:1});
        for(let i=0;i<order.length;i++) for(let j=i+1;j<order.length;j++) tries.push({[order[i]]:1,[order[j]]:1});
        for(const p of order) tries.push({[p]:2});
        for(const delta of tries){
          const cand = cloneVec(prevVec, primesBase);
          let ok=true;
          for(const p in delta){
            if((cand[p]||0) < delta[p]){ ok=false; break; }
            cand[p]-=delta[p];
          }
          if(!ok) continue;
          const val = valueFromVec(cand, primesBase);
          if(val>=bounds.minVal && val<=bounds.maxVal && !hasSpoiler(val) && this.okAvoid(val, avoidVals)) return cand;
        }
        return null;
      };

      // map des valeurs posées sur le path (id -> number)
      const pathVals = new Map();

      // départ : éviter spoiler
      const startChoices = startPool
        .filter(v=> v>=bounds.minVal && v<=bounds.maxVal && !hasSpoiler(v));
      const startVal = startChoices.length ? startChoices[randInt(0,startChoices.length-1)]
                                           : Math.max(bounds.minVal, 6);
      let vec = vecFromValue(startVal, primesBase);
      pathVals.set(gid(...path[0]), valueFromVec(vec, primesBase));
      this.get(path[0][0], path[0][1]).setNumber(valueFromVec(vec, primesBase)).markPath(true);
      
      // LOG départ
{
  const v0 = valueFromVec(vec, primesBase);
  const [r0,c0] = path[0];
  logPathVal('START', 0, r0, c0, v0);
}

      // direction avec “runs”
      let dir = Math.random()<0.5 ? 'UP' : 'DOWN';

      for(let i=1;i<path.length;i++){
        const prevCoord = path[i-1];
        const curCoord  = path[i];

        const prevVal = pathVals.get(gid(...prevCoord));
        const prevVec = vecFromValue(prevVal, primesBase);

        const avoidVals = this.assignedNeighborVals(curCoord[0], curCoord[1], pathVals, prevCoord);

        // bornes => contrainte directionnelle
        const vPrev = valueFromVec(prevVec, primesBase);
        if(vPrev >= bounds.maxVal*0.85) dir='DOWN';
        if(vPrev <= bounds.minVal*1.2)  dir='UP';
        else if(Math.random() > (pathGen.pRun ?? 0.65)) dir = (dir==='UP'?'DOWN':'UP');

        let nextVec=null;
        if(dir==='UP')   nextVec = pickUpVec(prevVec, i, avoidVals);
        if(dir==='DOWN') nextVec = pickDownVec(prevVec, avoidVals);
        if(!nextVec){
          if(dir==='UP')   nextVec = pickDownVec(prevVec, avoidVals);
          else             nextVec = pickUpVec(prevVec, i, avoidVals);
        }
        if(!nextVec){
          // UP minimal
          const g = (pathGen.palettes[i%pathGen.palettes.length]||[2]).filter(p=>p!==spoilerPrime);
          if(g.length){
            const cand = cloneVec(prevVec, primesBase);
            cand[g[0]] = (cand[g[0]]||0)+1;
            const nv=valueFromVec(cand, primesBase);
            if(nv>=bounds.minVal && nv<=bounds.maxVal && !hasSpoiler(nv) && this.okAvoid(nv, avoidVals)){
              nextVec = cand;
            }
          }
        }
        if(!nextVec){
          // DOWN minimal
          const order = [...primesBase].sort((a,b)=>(prevVec[b]||0)-(prevVec[a]||0)).filter(p=>(prevVec[p]||0)>0);
          if(order.length){
            const cand = cloneVec(prevVec, primesBase);
            cand[order[0]]--;
            const nv=valueFromVec(cand, primesBase);
            if(nv>=bounds.minVal && nv<=bounds.maxVal && !hasSpoiler(nv) && this.okAvoid(nv, avoidVals)){
              nextVec = cand;
            }
          }
        }
        if(!nextVec){ nextVec = cloneVec(prevVec, primesBase); }

        const nv = valueFromVec(nextVec, primesBase);
        pathVals.set(gid(...curCoord), nv);
        this.get(curCoord[0], curCoord[1]).setNumber(nv).markPath(true);
        vec = nextVec;
        logPathVal('STEP', i, curCoord[0], curCoord[1], nv);


      }
      
      // LOG étape i

      // marquer start/end
      this.get(path[0][0], path[0][1]).markStart(true);
      const last = path[path.length-1];
      this.get(last[0], last[1]).markEnd(true);
    }

    /* --- Distracteurs récursifs (fauxPath) --- */
    placeDistractorsRecursiveWithRule(path, {
      bounds={minVal:6, maxVal:120},
      ratio=0.5, maxIters=2000,
      spoilerPrime=null
    } = {}){
      const hasSpoiler = (n)=> (spoilerPrime && spoilerPrime>1) ? (n%spoilerPrime===0) : false;

      const onPath = new Set(path.map(([r,c])=> gid(r,c)));
      const rank = new Map(path.map((p,i)=> [gid(p[0],p[1]), i])); // proximité départ
      const faux = new Set(onPath);

      const degFaux = (r,c)=> this.neighbors4(r,c).reduce((acc,[nr,nc])=> acc + (faux.has(gid(nr,nc))?1:0), 0);
      const baseNeighbor = (r,c)=>{
        let best=null, bestRank=Infinity;
        for(const [nr,nc] of this.neighbors4(r,c)){
          const key=gid(nr,nc);
          if(!faux.has(key)) continue;
          const rk = rank.get(key) ?? 1e9;
          if(rk < bestRank){ bestRank=rk; best=[nr,nc]; }
        }
        return best;
      };
      const okAvoid = (x, avoid)=> {
        if(x<bounds.minVal || x>bounds.maxVal || x===1) return false;
        if(hasSpoiler(x)) return false;
        for(const v of avoid) if(isMulDiv(x,v)) return false;
        return true;
      };
      const candidateDistractorValue = (V, avoid)=>{
        const tries=[];
        // diviseurs doux
        for(const d of [2,3,5]) if(V%d===0) tries.push(V/d);
        // multiples doux
        for(const f of [2,3,4]) if(V*f<=bounds.maxVal) tries.push(V*f);
        // tri par |Δ|
        tries.sort((a,b)=>Math.abs(a-V)-Math.abs(b-V));
        for(const x of tries){
          if(isMulDiv(x,V) && okAvoid(x, avoid)) return x;
        }
        // Ajustements par exposants
        const vecV = vecFromValue(V);
        // -1 prioritaire sur gros primes
        for(const p of [11,7,5,3,2]){
          if((vecV[p]||0)>0){
            const cand = cloneVec(vecV); cand[p]--;
            const val = valueFromVec(cand);
            if(isMulDiv(val,V) && okAvoid(val, avoid)) return val;
          }
        }
        for(const p of [2,3,5]){
          const cand = cloneVec(vecV); cand[p]++; const val=valueFromVec(cand);
          if(isMulDiv(val,V) && okAvoid(val, avoid)) return val;
        }
        return null;
      };

      const eligibleCells = ()=>{
        const list=[];
        for(let r=0;r<this.rows;r++) for(let c=0;c<this.cols;c++){
          const cell=this.get(r,c);
          if(cell.isEmoji || !cell.isEmpty) continue;
          const d = degFaux(r,c);
          if(d===0) continue;
          const base = baseNeighbor(r,c);
          if(!base) continue;
          const baseKey = gid(...base);
          const rbase = rank.get(baseKey) ?? 1e9;
          list.push({r,c,deg:d, base, rbase});
        }
        // tri: plus de voisins fauxPath d’abord, puis plus proche du départ
        list.sort((A,B)=> (B.deg-A.deg) || (A.rbase-B.rbase));
        return list;
      };

      const initElig = eligibleCells();
      const quota = Math.floor(initElig.length * ratio);
      let placed=0, iter=0;

      while(iter++<maxIters && placed<quota){
        const cands = eligibleCells();
        if(!cands.length) break;
        let did=false;
        for(const cand of cands){
          const {r,c, base} = cand;
          // éviter de créer des passerelles avec autres voisins
          const avoid=[];
          for(const [nr,nc] of this.neighbors4(r,c)){
            const key=gid(nr,nc);
            if(key===gid(...base)) continue;
            const v = this.get(nr,nc).value;
            if(typeof v === "number" && v>0) avoid.push(v);
          }
          const V = this.get(base[0], base[1]).value;
          if(typeof V !== "number" || V<=0) continue;
          const D = candidateDistractorValue(V, avoid);
          if(!D) continue;

          // pose le leurre + ajoute à fauxPath
          this.get(r,c).setNumber(D);
          const key=gid(r,c);
          faux.add(key);
          rank.set(key, (rank.get(gid(...base)) ?? 0) + 0.01);
          placed++; did=true;
          break;
        }
        if(!did) break;
      }
      return placed;
    }

    /* --- Neutres --- */
    fillNeutralsWithRule({
      bounds={minVal:6, maxVal:120},
      spoilerPrime=null
    } = {}){
      const hasSpoiler = (n)=> (spoilerPrime && spoilerPrime>1) ? (n%spoilerPrime===0) : false;

      const pickNeutral = (around)=>{
        for(let t=0;t<400;t++){
          const v = randInt(bounds.minVal, bounds.maxVal);
          if(hasSpoiler(v)) continue;
          let ok=true;
          for(const a of around){
            if(a>0 && isMulDiv(v,a)){ ok=false; break; }
          }
          if(ok) return v;
        }
        return randInt(bounds.minVal, bounds.maxVal);
      };

      for(let r=0;r<this.rows;r++){
        for(let c=0;c<this.cols;c++){
          const cell=this.get(r,c);
          if(cell.isEmoji || !cell.isEmpty) continue;
          const around = this.neighbors4(r,c)
            .map(([rr,cc])=> this.get(rr,cc).value)
            .filter(v=> typeof v === "number" && v>0);
          cell.setNumber(pickNeutral(around));
        }
      }
    }

    /* --- Marquages path (facultatif, pratique) --- */
    markPathFlags(path){
      if(!path || !path.length) return;
      for(const [r,c] of path) this.get(r,c).markPath(true);
      this.get(path[0][0], path[0][1]).markStart(true);
      const last = path[path.length-1];
      this.get(last[0], last[1]).markEnd(true);
    }

    /* --- Raccourcis (diagnostic) --- */
    detectShortcuts(path){
      const posToIdx = new Map(path.map((p,i)=> [gid(p[0],p[1]), i]));
      const pairs=[];
      for(let i=0;i<path.length;i++){
        const [r,c]=path[i];
        const aVal = this.get(r,c).value;
        for(const [nr,nc] of this.neighbors4(r,c)){
          const key=gid(nr,nc);
          if(!posToIdx.has(key)) continue;
          const j=posToIdx.get(key);
          if(Math.abs(j-i)===1) continue; // arête du corridor
          if(j<i) continue; // une seule fois
          const bVal = this.get(nr,nc).value;
          if(isMulDiv(aVal,bVal)) pairs.push({i,j,a:[r,c], b:[nr,nc]});
        }
      }
      pairs.sort((p,q)=>(q.j-q.i)-(p.j-p.i));
      return pairs;
    }
  }

  // exposer en global (Trinket)
  window.Grille = Grille;


