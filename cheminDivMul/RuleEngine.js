/* ========= RuleEngine de base (global) ========= */
class RuleEngine {
  isValidStep(a, b) { throw new Error("isValidStep non implémenté"); }
  chooseStart(bounds) { throw new Error("chooseStart non implémenté"); }
  nextOnPath(prevVal, stepIdx, context={}) { throw new Error("nextOnPath non implémenté"); }
  candidatesForDistractor(anchorVal, context={}) { return []; }
  neutralCandidate(aroundVals, bounds) { throw new Error("neutralCandidate non implémenté"); }
}

/* ========= Utilitaires factorisation (internes) ========= */
function vecFromValue(n, base=[2,3,5,7]){
  const v={}; for(const p of base) v[p]=0; let x=n;
  for(const p of base){ while(x%p===0){ v[p]++; x/=p; } }
  if(x>1){ v[base[base.length-1]]++; }
  return v;
}
function valueFromVec(vec, base=[2,3,5,7]){
  let v=1; for(const p of base){ const e=vec[p]||0; if(e>0) v*=p**e; }
  return v;
}
function cloneVec(v, base=[2,3,5,7]){ const o={}; for(const p of base) o[p]=v[p]||0; return o; }
function equalVec(a,b, base=[2,3,5,7]){ for(const p of base) if((a[p]||0)!==(b[p]||0)) return false; return true; }
function randInt(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }
function pickRandom(arr){ return arr[randInt(0, arr.length-1)]; }
function isMulDiv(a,b){ return a>0 && b>0 && (a%b===0 || b%a===0); }

/* ========= Implémentation Séquence stateless + anti-pingpong ========= */
const SequenceStrategies = {
  uniform({ candidates }) {
    return pickRandom(candidates);
  },
  balance({ prevVec, candidates, history, primes }) {
    const ages = {}; for (const p of primes) ages[p]=0;
    for (const p of primes){
      let age = 0;
      for (let k = history.length-1; k > 0; k--){
        const cur = history[k], prev = history[k-1];
        if ((cur[p]||0) !== (prev[p]||0)) break;
        age++;
      }
      ages[p] = age;
    }
    let best=candidates[0], bestS=-Infinity;
    for (const cand of candidates){
      let s = 0;
      for (const p of primes) if ((cand[p]||0)!==(prevVec[p]||0)) s += ages[p];
      s += Math.random()*0.01;
      if (s>bestS){ bestS=s; best=cand; }
    }
    return best;
  },
  smooth({ prevVec, candidates, primes }) {
    const prev = valueFromVec(prevVec, primes);
    let best=candidates[0], bestS=-Infinity;
    for (const cand of candidates){
      const r = valueFromVec(cand, primes) / prev;
      const mag = Math.log2(Math.max(r, 1/r));
      const near2 = -Math.abs(mag - 1);
      const penalty = mag > 2 ? -1 : 0;
      const s = near2 + penalty + Math.random()*0.01;
      if (s>bestS){ bestS=s; best=cand; }
    }
    return best;
  },
  cycle({ prevVec, candidates, stepIndex, primes }) {
    const pTarget = primes[ stepIndex % primes.length ];
    const filt = candidates.filter(c => (c[pTarget]||0)!==(prevVec[pTarget]||0));
    return (filt.length ? pickRandom(filt) : pickRandom(candidates));
  }
};

class SequenceRule extends RuleEngine {
  constructor(opts={}){
    super();
    this.primes = opts.primes ?? [2,3,5,7];
    this.bounds = opts.bounds ?? {minVal:2, maxVal:200};
    this.length = opts.length ?? 20;
    this.probs = opts.probs ?? { mono1:0.6, mono2:0.25, bi1:0.15 };
    this.rules = opts.rules ?? { primeUp:true, halfDown:true };
    this.strategy = opts.strategy ?? "uniform";
    this.maxTries = opts.maxTries ?? 50;
    this.strategyPick = SequenceStrategies[this.strategy] || SequenceStrategies.uniform;
  }

  isValidStep(a,b){ return isMulDiv(a,b); }

  chooseStart(bounds=this.bounds){
    // méthode du plafond comme dans ta version
    let max = Math.max(2, bounds.maxVal);
    const v={}; for(const p of this.primes) v[p]=0;
    let somme=0;
    for(let i=0;i<this.primes.length;i++){
      const p=this.primes[i];
      const eMax=Math.floor(Math.log(max)/Math.log(p));
      const forceMin1 = (i===this.primes.length-1)&&(somme===0)&&(eMax>=1);
      const e = forceMin1 ? randInt(1,eMax) : randInt(0,eMax);
      v[p]=e; somme+=e;
      if(e>0) max=Math.floor(max/(p**e));
    }
    return valueFromVec(v,this.primes);
  }

  nextOnPath(prevVal, stepIdx, context={}){
    const bounds = context.bounds || this.bounds;
    const history = context.history || [];
    const prevVec = vecFromValue(prevVal,this.primes);
    const prevPrevVec = history.length>=2 ? history[history.length-2] : null;

    const candidates=[];
    for(let t=0;t<this.maxTries;t++){
      const type=this._pickStepType();
      const dir=this._decideDirection(prevVec, bounds, this.rules);
      const cand=this._randomCandidate(prevVec, dir, type);
      if(!cand) continue;
      if(equalVec(cand, prevVec,this.primes)) continue;
      if(prevPrevVec && equalVec(cand, prevPrevVec,this.primes)) continue;
      const val=valueFromVec(cand,this.primes);
      if(val<bounds.minVal||val>bounds.maxVal) continue;
      candidates.push(cand);
    }
    if(!candidates.length){
      // fallback: répète la valeur
      return {value:prevVal, dir:"UP"};
    }
    const chosen=this.strategyPick({
      prevVec, candidates, history, stepIndex, bounds, primes:this.primes
    });
    return { value:valueFromVec(chosen,this.primes), dir:"UP" };
  }

  _pickStepType(){
    const u=Math.random();
    if(u<this.probs.mono1) return "mono1";
    if(u<this.probs.mono1+this.probs.mono2) return "mono2";
    return "bi1";
  }
  _randomCandidate(prevVec, dir, type){
    const cand=cloneVec(prevVec,this.primes);
    if(type==="mono1"){
      const p=pickRandom(this.primes);
      if(dir==="UP") cand[p]++; else { if(cand[p]===0) return null; cand[p]--; }
      return cand;
    }
    if(type==="mono2"){
      const p=pickRandom(this.primes);
      if(dir==="UP") cand[p]+=2; else { if(cand[p]<2) return null; cand[p]-=2; }
      return cand;
    }
    if(type==="bi1"){
      const [p,q]=this._pickTwoPrimes();
      if(dir==="UP"){ cand[p]++; cand[q]++; }
      else { if(cand[p]===0||cand[q]===0) return null; cand[p]--; cand[q]--; }
      return cand;
    }
    return null;
  }
  _pickTwoPrimes(){
    const i=randInt(0,this.primes.length-1);
    let j=randInt(0,this.primes.length-2); if(j>=i) j++;
    return [this.primes[i],this.primes[j]];
  }
  _decideDirection(prevVec,bounds,rules){
    const X=valueFromVec(prevVec,this.primes);
    const isPrimeBase=this.primes.includes(X);
    if(rules.primeUp && isPrimeBase) return "UP";
    if(rules.halfDown && X>bounds.maxVal/2) return "DOWN";
    return Math.random()<0.5?"UP":"DOWN";
  }
}


/* === Expose global === */
window.RuleEngine = RuleEngine;
window.SequenceRule = SequenceRule;
