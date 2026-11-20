// Local oscillators and one generated noise buffer; no files or network.
export class Synth {
  constructor() { this.muted=false; this.ctx=null; this.beat=0; this.next=0; this.voices=0; }
  start() {
    if (!this.ctx) {
      const Audio=window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      this.ctx=new Audio(); const c=this.ctx;
      this.master=c.createGain(); this.master.gain.value=this.muted?0:.22; // A soft output ceiling protects even overlapping effects; one graph per gesture unlock.
      this.limiter=c.createWaveShaper();this.limiter.curve=Float32Array.from({length:2049},(_,i)=>.8*Math.tanh(((i/1024)-1)/.8));
      this.analyser=c.createAnalyser();this.analyser.fftSize=2048;
      this.master.connect(this.limiter);this.limiter.connect(this.analyser);this.analyser.connect(c.destination);
      this.noise=c.createBuffer(1,c.sampleRate*.3,c.sampleRate);
      const samples=this.noise.getChannelData(0); for(let i=0;i<samples.length;i++) samples[i]=(Math.random()*2-1)*(1-i/samples.length);
      this.engine=this.loop('sawtooth',50,.0); this.siren=this.loop('sine',660,0);
      this.next=c.currentTime+.1;
    }
    this.ctx.resume().catch(()=>{});
  }
  loop(type,freq,volume) {
    const c=this.ctx,osc=c.createOscillator(),gain=c.createGain(),filter=c.createBiquadFilter();
    osc.type=type; osc.frequency.value=freq; gain.gain.value=volume; filter.frequency.value=500;
    osc.connect(filter); filter.connect(gain); gain.connect(this.master); osc.start(); return {osc,gain,filter};
  }
  tone(freq,duration=.15,volume=.2,type='sine',at=this.ctx?.currentTime) {
    if (!this.ctx || this.voices>=24) return;
    this.voices++;
    const c=this.ctx,o=c.createOscillator(),g=c.createGain(); o.type=type;o.frequency.value=freq;
    g.gain.setValueAtTime(.001,at);g.gain.exponentialRampToValueAtTime(volume,at+.012);g.gain.exponentialRampToValueAtTime(.001,at+duration);
    o.connect(g);g.connect(this.master);o.start(at);o.stop(at+duration+.03);o.onended=()=>{o.disconnect();g.disconnect();this.voices--;};
  }
  effect(name) {
    if (!this.ctx) return; const t=this.ctx.currentTime;
    if (name==='shot' || name==='punch') {
      if(this.voices>=24)return;this.voices++;
      const n=this.ctx.createBufferSource(),g=this.ctx.createGain(),f=this.ctx.createBiquadFilter();n.buffer=this.noise;
      f.type='lowpass';f.frequency.value=name==='shot'?3800:180;
      g.gain.setValueAtTime(name==='shot'?.65:.8,t);g.gain.exponentialRampToValueAtTime(.001,t+.18);
      n.connect(f);f.connect(g);g.connect(this.master);n.start();n.stop(t+.2);n.onended=()=>{n.disconnect();f.disconnect();g.disconnect();this.voices--;};
      if(name==='punch')this.tone(70,.13,.35);return;
    }
    const notes={click:[500],cash:[660,990],success:[330,440,554,660],fail:[220,185,130]}[name]||[440];
    notes.forEach((n,i)=>this.tone(n,.22,.2,'sine',t+i*.12));
  }
  toggle() { this.muted=!this.muted; if(this.ctx)this.master.gain.setTargetAtTime(this.muted?0:.22,this.ctx.currentTime,.03);return this.muted; }
  update(game,police,playing) {
    if(!this.ctx)return;const c=this.ctx,t=c.currentTime;
    this.engine.osc.frequency.setTargetAtTime(38+Math.abs(game.drive?.speed||0)*3,t,.12);
    this.engine.gain.gain.setTargetAtTime(playing&&game.car?.userData.health>0 ? .1:0,t,.15);
    const near=playing&&police.units.some(u=>u.car.position.distanceToSquared(game.player.position)<110**2);
    this.siren.osc.frequency.setTargetAtTime(Math.floor(t*2)%2?660:880,t,.08);
    this.siren.filter.frequency.value=1800; this.siren.gain.gain.setTargetAtTime(near?.12:0,t,.2);
    // Schedule only a short horizon, never replay missed beats after suspension.
    if(this.next<t-.5)this.next=t+.05;
    while(this.next<t+.16){if(playing){const root=[55,55,65.41,49][Math.floor(this.beat/8)%4];
      this.tone(root,this.beat%2?.3:.55,.10,'triangle',this.next);
      if(this.beat%8===0)[4,5,6].forEach(r=>this.tone(root*r,2.5,.025,'sine',this.next));}
      this.beat++;this.next+=.42;}
  }
}
