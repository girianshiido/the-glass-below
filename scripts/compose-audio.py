"""Original miniature score and sound design. Requires numpy and ffmpeg only when authoring."""
from pathlib import Path
import json, math, shutil, subprocess, tempfile, wave
import numpy as np

RATE=22050
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/audio'
OUT.mkdir(parents=True,exist_ok=True)
RNG=np.random.default_rng(21873)
ffmpeg=shutil.which('ffmpeg')
if not ffmpeg: raise RuntimeError('ffmpeg is required to author audio')

def frequency(note): return 440*2**((note-69)/12)
def tone(note,duration,kind='bell'):
    t=np.arange(int(duration*RATE))/RATE;f=frequency(note)
    if kind=='pad':
        s=(np.sin(2*np.pi*f*t)+.3*np.sin(2*np.pi*f*2.003*t)+.13*np.sin(2*np.pi*f*3*t))
        env=np.minimum(1,t/.65)*np.minimum(1,np.maximum(0,duration-t)/.9)*(.86+.14*np.sin(2*np.pi*.19*t))
    elif kind=='bass':
        s=np.sin(2*np.pi*f*t)+.19*np.sin(2*np.pi*f*2*t);env=np.minimum(1,t/.012)*np.exp(-t*2.4)*np.minimum(1,(duration-t)/.05)
    elif kind=='string':
        s=sum(np.sin(2*np.pi*f*h*t)/h**1.6 for h in (1,2,3,4,5));env=np.minimum(1,t/.035)*np.exp(-t*4)*np.minimum(1,(duration-t)/.07)
    elif kind=='brass':
        s=sum(np.sin(2*np.pi*f*h*t)/h**1.3 for h in (1,2,3,5));env=np.minimum(1,t/.07)*np.exp(-t*2.2)*np.minimum(1,(duration-t)/.1)
    else:
        s=(np.sin(2*np.pi*f*t)*np.exp(-t*2)+.45*np.sin(2*np.pi*f*2.006*t)*np.exp(-t*4)+.15*np.sin(2*np.pi*f*3.98*t)*np.exp(-t*6));env=np.minimum(1,t/.008)*np.minimum(1,(duration-t)/.04)
    return (s*np.maximum(0,env)).astype(np.float32)

def drum(kind,duration=.3):
    t=np.arange(int(duration*RATE))/RATE;noise=RNG.normal(0,1,len(t))
    if kind=='kick': return ((np.sin(2*np.pi*(48*t+50*.032*(1-np.exp(-t/.032))))+.16*noise*np.exp(-t*120))*np.exp(-t*15)).astype(np.float32)
    if kind=='snare': return ((noise*.6+np.sin(2*np.pi*164*t)*.35)*np.exp(-t*23)).astype(np.float32)
    high=np.r_[0,np.diff(noise)]
    return (high*.21*np.exp(-t*65)).astype(np.float32)

def render_scene(name,bpm,bars):
    beat=60/bpm;duration=bars*4*beat;n=round(duration*RATE);mix=np.zeros((n+3*RATE,2),np.float32)
    def add(sample,at,gain=.2,pan=0):
        start=round(at*RATE)
        if start>=len(mix): return
        sample=sample[:len(mix)-start]*gain
        mix[start:start+len(sample),0]+=sample*math.sqrt((1-pan)/2)
        mix[start:start+len(sample),1]+=sample*math.sqrt((1+pan)/2)
    chords=[(50,57,62,65),(46,53,58,62),(48,55,60,65),(45,52,57,60)]
    melody=[74,77,81,79,77,74,72,69]
    for bar in range(bars):
        chord=chords[(bar//2)%4];root=chord[0];at=bar*4*beat
        if name=='level':
            if bar%2==0:
                for i,note in enumerate(chord): add(tone(note,beat*8+.8,'pad'),at,.065,(i-1.5)*.35)
            add(tone(root-12,beat*3.9,'bass'),at,.17)
            add(tone(melody[(bar*2)%8]+(12 if bar>=8 and bar%3==0 else 0),2.2),at+beat*.5,.15,-.25)
            if bar%2: add(tone(melody[(bar*2+1)%8],2.6),at+beat*2.5,.115,.3)
            add(drum('kick',.45),at,.065)
        else:
            for i in range(8):
                note=chord[i%4]+(12 if i in (3,6) else 0)
                add(tone(note,beat*.65,'string'),at+i*.5*beat,.115,(-1 if i%2 else 1)*.35)
                add(drum('hat',.12),at+i*.5*beat,.13 if i%2 else .08,.4)
                add(tone(root-12+(7 if i in (3,7) else 0),beat*.46,'bass'),at+i*.5*beat,.22)
            for offset in (0,2,3.5): add(drum('kick',.4),at+offset*beat,.3 if name=='boss' else .22)
            for offset in (1,3): add(drum('snare',.25),at+offset*beat,.18 if name=='boss' else .12,-.1)
            lead=melody[(bar*2)%8]
            if name=='boss':
                lead=[74,75,81,77,75,74,72,69][bar%8]
                for off in (0,1.5,3):add(tone(lead,beat*.85,'brass'),at+off*beat,.13,-.1)
                if bar%2==0:
                    for note in (root,root+7,root+12):add(tone(note,beat*4.3,'pad'),at,.06)
            else:
                add(tone(lead,beat*1.4),at+beat,.16,.2)
                add(tone(melody[(bar*2+1)%8],beat*1.3),at+beat*2.5,.13,-.2)
    # Echo is wrapped at the loop boundary; no appended silence or codec padding is part of the loop.
    for delay,gain in ((.19,.17),(.37,.10),(.61,.055)):
        shift=round(delay*RATE);mix[shift:]+=mix[:-shift,::-1]*gain
    result=mix[:n].copy();tail=mix[n:];result[:len(tail)]+=tail
    peak=np.max(np.abs(result));result*=.78/max(peak,1e-6)
    return result,duration

def effect(name):
    durations={'frost':.72,'heal':1.1,'fracture':.6,'gate':1.,'reward':1.2,'step':.14,'hit':.27}
    duration=durations.get(name,.23);t=np.arange(round(duration*RATE))/RATE;noise=RNG.normal(0,1,len(t));signal=np.zeros(len(t))
    if name.startswith('slash'):
        variant=int(name[-1]);freq=2100-variant*200
        sweep=np.sin(2*np.pi*(freq*t-1800*t*t))*np.exp(-t*23)
        high=np.r_[0,np.diff(noise)]
        signal=(high*.3+sweep*.3)*np.sin(np.pi*np.minimum(1,t/duration))**.6*np.exp(-t*(10+variant))
        signal+=np.sin(2*np.pi*(125-variant*8)*t)*np.exp(-t*35)*.4
    elif name=='hit':signal=(noise*.22+np.sin(2*np.pi*(85*t+3*(1-np.exp(-t*20))))*.8)*np.exp(-t*19)
    elif name=='frost':
        signal=(np.sin(2*np.pi*(1850*t+1000*t*t))*.22+noise*.12)*np.exp(-t*9)
        for i,note in enumerate([91,94,98,103]):
            start=round(i*.055*RATE);part=tone(note,duration-i*.055)*.2;signal[start:start+len(part)]+=part
    elif name=='heal' or name=='reward':
        notes=[74,77,81,86] if name=='heal' else [62,69,74,77,81]
        for i,note in enumerate(notes):
            start=round(i*.095*RATE);part=tone(note,duration-i*.095)*.32;signal[start:start+len(part)]+=part
    elif name=='fracture':signal=(noise*.17+np.sin(2*np.pi*(100*t+10*t*t))*.7)*np.exp(-t*10)+np.sin(2*np.pi*920*t)*np.exp(-t*17)*.15
    elif name=='step':signal=(np.convolve(noise,np.ones(9)/9,mode='same')*.6+np.sin(2*np.pi*82*t)*.15)*np.exp(-t*32)
    elif name=='gate':signal=(np.sin(2*np.pi*67*t)*.4+np.sin(2*np.pi*176*t)*.14+noise*.08)*np.minimum(1,t/.06)*np.exp(-t*3)
    signal*=np.minimum(1,t/.004)*np.minimum(1,(duration-t)/.025)
    signal*=.8/max(np.max(np.abs(signal)),1e-6)
    return np.column_stack((signal,signal)).astype(np.float32)

def encode(name,samples,tmp):
    file=tmp/(name+'.wav')
    with wave.open(str(file),'wb')as w:
        w.setnchannels(2);w.setsampwidth(2);w.setframerate(RATE);w.writeframes((np.clip(samples,-1,1)*32767).astype('<i2').tobytes())
    for ext,codec,args in [('ogg','libvorbis',['-q:a','3']),('m4a','aac',['-b:a','80k','-movflags','+faststart'])]:
        subprocess.run([ffmpeg,'-nostdin','-hide_banner','-loglevel','error','-y','-i',str(file),'-c:a',codec,*args,str(OUT/(name+'.'+ext))],check=True)
    return {'seconds':len(samples)/RATE,'peak':float(np.max(np.abs(samples))),'rms':float(np.sqrt(np.mean(samples*samples)))}

manifest={'sample_rate':RATE,'music':{},'effects':{}}
with tempfile.TemporaryDirectory(prefix='glass-below-audio-')as folder:
    tmp=Path(folder)
    for name,bpm,bars in [('level',72,16),('combat',116,12),('boss',136,12)]:
        samples,seconds=render_scene(name,bpm,bars);manifest['music'][name]=encode(name,samples,tmp)|{'bpm':bpm,'loop_seconds':seconds}
    for name in ['slash-1','slash-2','slash-3','slash-4','hit','frost','heal','fracture','step','gate','reward']:manifest['effects'][name]=encode(name,effect(name),tmp)
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Composed 3 original music loops and 11 effects in OGG and AAC.')
