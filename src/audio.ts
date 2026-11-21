import {DEFAULT_SOUND,parseSoundSettings,MUSIC_FILES,MUSIC_LOOP_SECONDS,SOUND_FILES} from './audio-state.ts';
import type {MusicScene,Sound,SoundSettings} from './audio-state.ts';
interface Voice {source:AudioBufferSourceNode;gain:GainNode}
export interface AudioRuntime {createContext?:()=>AudioContext|undefined;fetch?:typeof fetch;now?:()=>number}
const SETTINGS_KEY='the-glass-below:sound:v1';
/** A single Web Audio graph controls music and effects, including on iOS Safari. */
export class GameAudio {
  settings:SoundSettings={...DEFAULT_SOUND};
  private context?:AudioContext;
  private master?:GainNode;
  private musicBus?:GainNode;
  private effectBus?:GainNode;
  private current?:Voice;
  private fading=new Set<Voice>();
  private effects=new Set<AudioBufferSourceNode>();
  private buffers=new Map<string,Promise<AudioBuffer|undefined>>();
  private scene:MusicScene|null=null;
  private revision=0;
  private effectRevision=0;
  private paused=false;
  private hidden=false;
  private pendingScene:MusicScene|null=null;
  private playingScene:MusicScene|null=null;
  private lastEffect=new Map<Sound,number>();
  private runtime:AudioRuntime;
  constructor(runtime:AudioRuntime={}){this.runtime=runtime;try{this.settings=parseSoundSettings(localStorage.getItem(SETTINGS_KEY));}catch{/* Private browsing may block storage. */}}
  private now(){return this.runtime.now?.()??performance.now();}
  async unlock(){
    try{
      if(!this.context){const host=globalThis as typeof globalThis&{webkitAudioContext?:typeof AudioContext};const C=host.AudioContext??host.webkitAudioContext;this.context=this.runtime.createContext?.()??(C?new C({latencyHint:'interactive'}):undefined);if(!this.context)return;
        this.master=this.context.createGain();this.musicBus=this.context.createGain();this.effectBus=this.context.createGain();this.musicBus.connect(this.master);this.effectBus.connect(this.master);this.master.connect(this.context.destination);this.applyVolumes();
      }
      if(this.hidden)return;
      if(this.context.state==='suspended')await this.context.resume();
      if(this.context.state==='running'&&!this.settings.muted){this.ensureMusic();for(const sound of ['slash-1','slash-2','slash-3','slash-4','hit','frost','heal','fracture']as Sound[])void this.load(SOUND_FILES[sound]);}
    }catch{/* Remain silent until a later user gesture can unlock audio. */}
  }
  setSettings(next:Partial<SoundSettings>){
    this.settings={muted:next.muted??this.settings.muted,music:this.clamp(next.music??this.settings.music),effects:this.clamp(next.effects??this.settings.effects)};
    try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(this.settings));}catch{/* Settings still work for this session. */}
    this.applyVolumes();
    if(this.settings.muted){this.revision++;this.pendingScene=null;this.stopMusic(0);this.stopEffects();}else this.ensureMusic();
  }
  private clamp(n:number){return Number.isFinite(n)?Math.max(0,Math.min(1,n)):0;}
  private applyVolumes(){const c=this.context;if(!c)return;const t=c.currentTime;this.master!.gain.cancelScheduledValues(t);this.master!.gain.setTargetAtTime(this.settings.muted?0:1,t,.025);this.musicBus!.gain.setTargetAtTime(this.settings.music*(this.paused ? .25 : 1),t,.08);this.effectBus!.gain.setTargetAtTime(this.settings.effects,t,.025);}
  setScene(scene:MusicScene|null){if(this.scene===scene)return;this.scene=scene;this.revision++;this.pendingScene=null;this.stopMusic(.35);this.ensureMusic();}
  setPaused(paused:boolean){if(this.paused===paused)return;this.paused=paused;if(paused)this.stopEffects();this.applyVolumes();}
  setHidden(hidden:boolean){
    this.hidden=hidden;
    if(hidden){this.stopEffects();void this.context?.suspend().catch(()=>undefined);}else void this.unlock();
  }
  private stopEffects(){this.effectRevision++;for(const source of this.effects){try{source.stop();}catch{/* Already ended. */}}this.effects.clear();}
  private stopMusic(fade:number){
    const c=this.context,v=this.current;this.current=undefined;this.playingScene=null;if(!c||!v)return;
    this.fading.add(v);const now=c.currentTime;v.gain.gain.cancelScheduledValues(now);v.gain.gain.setValueAtTime(v.gain.gain.value,now);v.gain.gain.linearRampToValueAtTime(0,now+fade);try{v.source.stop(now+fade+.02);}catch{/* Already stopped. */}
    v.source.onended=()=>{v.source.disconnect();v.gain.disconnect();this.fading.delete(v);};
    // A mute must silence voices already fading out as well.
    if(fade===0)for(const voice of this.fading){try{voice.source.stop();}catch{/* Already stopped. */}}
  }
  private ensureMusic(){
    const scene=this.scene,c=this.context;
    if(!scene||!c||c.state!=='running'||this.hidden||this.settings.muted||this.playingScene===scene||this.pendingScene===scene)return;
    this.pendingScene=scene;const revision=this.revision;
    void this.load(MUSIC_FILES[scene]).then(buffer=>{
      if(revision!==this.revision)return;this.pendingScene=null;
      if(!buffer||this.scene!==scene||this.hidden||this.settings.muted||c.state!=='running')return;
      const source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;source.loop=true;source.loopEnd=Math.min(buffer.duration,MUSIC_LOOP_SECONDS[scene]);gain.gain.setValueAtTime(0,c.currentTime);gain.gain.linearRampToValueAtTime(1,c.currentTime+.4);source.connect(gain);gain.connect(this.musicBus!);source.start();this.current={source,gain};this.playingScene=scene;
    });
  }
  private load(files:[string,string]):Promise<AudioBuffer|undefined>{
    const key=files[0],cached=this.buffers.get(key);if(cached)return cached;
    const loading=(async()=>{
      if(!this.context)return undefined;
      let preferOgg=true;if(typeof Audio!=='undefined')preferOgg=!!new Audio().canPlayType('audio/ogg; codecs="vorbis"');
      for(const file of preferOgg?files:[files[1],files[0]])try{
        const response=await(this.runtime.fetch??fetch)(file);if(!response.ok)continue;
        return await this.context.decodeAudioData(await response.arrayBuffer());
      }catch{/* Try the other codec. */}
      this.buffers.delete(key);return undefined;
    })();this.buffers.set(key,loading);return loading;
  }
  private footstep=0;
  playFootstep(surface:'stone'|'earth'){const variant=[0,1,2,1][this.footstep++%4];this.play(surface==='earth'?(['step-earth-1','step-earth-2','step-earth-3']as const)[variant]:(['step','step-stone-2','step-stone-3']as const)[variant]);}
  play(sound:Sound){
    if(!this.context||this.context.state!=='running'||this.settings.muted||this.settings.effects===0||this.hidden||this.paused)return;
    const now=this.now(),last=this.lastEffect.get(sound)??-Infinity;if(now-last<65)return;this.lastEffect.set(sound,now);
    const revision=this.effectRevision;
    void this.load(SOUND_FILES[sound]).then(buffer=>{
      const c=this.context;if(!buffer||!c||c.state!=='running'||this.settings.muted||this.hidden||this.paused||revision!==this.effectRevision||this.now()-now>500)return;
      if(this.effects.size>=8){const oldest=this.effects.values().next().value;if(oldest){try{oldest.stop();}catch{/* Already ended. */}this.effects.delete(oldest);}}
      const source=c.createBufferSource();source.buffer=buffer;source.connect(this.effectBus!);source.onended=()=>{source.disconnect();this.effects.delete(source);};this.effects.add(source);source.start();
    });
  }
}
