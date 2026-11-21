"""Arrange the original chapter scores as MIDI; render with a local GM SoundFont.
Requires numpy, FluidSynth and ffmpeg. Set GLASS_SOUNDFONT to override the bank.
The SoundFont is used locally and is never copied into the repository.
"""
from pathlib import Path
import os, struct, subprocess, tempfile, wave, json
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
FONT=Path(os.environ.get('GLASS_SOUNDFONT',ROOT.parent/'science-fantasy-jrpg/soundfonts/MuseScore_General_HQ.sf2'))
if not FONT.is_file():raise SystemExit('Set GLASS_SOUNDFONT to a General MIDI .sf2 file.')
RATE=48000;PPQ=480
OUT=ROOT/'public/audio';MIDI=ROOT/'music';MIDI.mkdir(exist_ok=True)
manifest=json.loads((OUT/'manifest.json').read_text());reports=json.loads((MIDI/'render-report.json').read_text()) if (MIDI/'render-report.json').exists() else {}
def vlq(n):
 b=[n&127];n>>=7
 while n:b.insert(0,(n&127)|128);n>>=7
 return bytes(b)
def score(name,bpm,bars,passes):
 length=bars*4;events=[];notes=[]
 patches={'title':[49,43,8,52],'village':[46,43,68,48],'road':[45,43,73,48]}.get(name,[49 if name=='level' else 45 if name=='combat' else 48,43,8 if name!='boss' else 60,52])
 for ch,program in enumerate(patches):
  events.extend([(0,-3,bytes([0xc0|ch,program])),(0,-2,bytes([0xb0|ch,7,[72,83,77,55][ch]])),(0,-2,bytes([0xb0|ch,10,[38,64,90,72][ch]])),(0,-2,bytes([0xb0|ch,91,48]))])
 def note(ch,pitch,at,dur,vel):notes.append((ch,pitch,at,dur,vel))
 chords=[(50,57,62,65),(46,53,58,62),(48,55,60,65),(45,52,57,60)];melody=[74,77,81,79,77,74,72,69]
 for bar in range(bars):
  chord=chords[(bar//2)%4];root=chord[0];at=bar*4
  if name in ('title','village','road'):
   if name=='title':
    for pitch in chord:note(0,pitch,at,3.8,43)
    note(1,root-12,at,3.6,50)
    if bar%2==0:note(2,melody[bar%8],at+.5,2.8,60)
    if bar%4==3:
     for pitch in chord[1:]:note(3,pitch,at,3.8,35)
   elif name=='village':
    for i in range(4):note(0,chord[i]+12,at+i*.5,1.4,48+i*3)
    note(1,root-12,at,2.8,50)
    phrase=[77,79,81,84,81,79,77,76,74,77,79,81,79,77,74,72]
    note(2,phrase[bar%16],at+.5,1.25,58);note(2,phrase[(bar+1)%16],at+2.5,1.2,49)
    if bar%2==0:
     for pitch in chord:note(3,pitch,at,7.8,30)
   else:
    for i in range(8):note(0,chord[i%4]+12,at+i*.5,.3,44+i%3*4)
    note(1,root-12,at,1.6,60);note(1,root-5,at+2,1.6,54)
    if bar%2==0:note(2,melody[bar%8],at+.5,2.3,62)
    if bar%4==3:note(9,47,at+3,.3,42)
   continue
  if name=='level':
   if bar%2==0:
    for pitch in chord:note(0,pitch,at,7.8,48)
   note(1,root-12,at,3.8,63)
   note(2,melody[bar*2%8]+(12 if bar>=8 and bar%3==0 else 0),at+.5,2.5,67)
   if bar%2:note(2,melody[(bar*2+1)%8],at+2.5,2.9,56)
   note(9,36,at,.2,35)
  else:
   for i in range(8):
    note(0,chord[i%4]+(12 if i in (3,6) else 0),at+i*.5,.32,65+(i%3)*5)
    note(1,root-12+(7 if i in (3,7) else 0),at+i*.5,.42,75)
    note(9,42,at+i*.5,.09,36 if i%2 else 28)
   for off in (0,2,3.5):note(9,36,at+off,.25,83 if name=='boss' else 65)
   for off in (1,3):note(9,38,at+off,.18,66 if name=='boss' else 46)
   if name=='boss':
    lead=[74,75,81,77,75,74,72,69][bar%8]
    for off in (0,1.5,3):note(2,lead,at+off,.8,72)
    if bar%2==0:
     for pitch in (root,root+7,root+12):note(3,pitch,at,4.3,44)
    note(9,47 if bar%2==0 else 45,at,.4,65)
   else:
    note(2,melody[bar*2%8],at+1,1.25,72);note(2,melody[(bar*2+1)%8],at+2.5,1.2,64)
 # Validate that MIDI note-off events never cut off a retrigger of the same pitch.
 for ch,pitch,at,dur,vel in notes:
  for other in notes:
   if other[0]==ch and other[1]==pitch and at<other[2]<at+dur-1e-8:raise ValueError('overlapping notes')
 for repeat in range(passes):
  for ch,pitch,at,dur,vel in notes:
   start=round((at+repeat*length)*PPQ);end=round((min(at+dur,length)+repeat*length)*PPQ)
   events.extend([(start,1,bytes([0x90|ch,pitch,vel])),(end,0,bytes([0x80|ch,pitch,0]))])
 tempo=round(60000000/bpm);events.append((0,-4,b'\xff\x51\x03'+tempo.to_bytes(3,'big')))
 data=b'';previous=0
 for tick,_,event in sorted(events,key=lambda e:(e[0],e[1])):data+=vlq(tick-previous)+event;previous=tick
 data+=vlq(round(length*passes*PPQ)-previous)+b'\xff\x2f\x00'
 return b'MThd'+struct.pack('>IHHH',6,0,1,PPQ)+b'MTrk'+struct.pack('>I',len(data))+data,len(notes),tempo
with tempfile.TemporaryDirectory(prefix='glass-fluidsynth-') as folder:
 tmp=Path(folder)
 for name,bpm,bars in [('level',72,16),('combat',116,12),('boss',136,12),('title',68,12),('village',86,16),('road',100,16)]:
  if os.environ.get('GLASS_TRACKS') and name not in os.environ['GLASS_TRACKS'].split(','):continue
  editable,count,tempo=score(name,bpm,bars,1);(MIDI/(name+'.mid')).write_bytes(editable)
  rendered,_,_=score(name,bpm,bars,3);mid=tmp/(name+'.mid');mid.write_bytes(rendered);wav=tmp/(name+'.wav')
  subprocess.run(['fluidsynth','-ni','-g','0.45','-F',str(wav),'-r',str(RATE),str(FONT),str(mid)],check=True,stdout=subprocess.DEVNULL)
  with wave.open(str(wav)) as f:
   assert f.getnchannels()==2 and f.getsampwidth()==2 and f.getframerate()==RATE
   samples=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').reshape(-1,2).astype(np.float64)/32768
  seconds=bars*4*tempo/1000000;start=round(seconds*RATE);n=round(seconds*RATE);body=samples[start:start+n].copy()
  # A settled second pass includes reverb from the previous loop; bridge only the final 35 ms.
  seam=round(.035*RATE);ramp=np.linspace(0,1,seam)[:,None];body[-seam:]=body[-seam:]*(1-ramp)+samples[start-seam:start]*ramp
  gain=min((.68 if name=='boss' else .76)/max(abs(body).max(),1e-6),.14/max(np.sqrt(np.mean(body**2)),1e-6));body*=gain
  master=tmp/(name+'-master.wav')
  with wave.open(str(master),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(RATE);f.writeframes(np.round(body*32767).astype('<i2').tobytes())
  decoded_peaks={}
  for ext,codec,args in [('ogg','libvorbis',['-q:a','5']),('m4a','aac',['-b:a','160k','-movflags','+faststart'])]:
   dest=OUT/(name+'.'+ext);subprocess.run(['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y','-i',str(master),'-c:a',codec,*args,str(dest)],check=True)
   raw=subprocess.check_output(['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-i',str(dest),'-f','f32le','-acodec','pcm_f32le','-'])
   decoded=np.frombuffer(raw,dtype='<f4');decoded_peaks[ext]=float(abs(decoded).max());assert np.isfinite(decoded).all() and abs(decoded).max()<.9
  report={'seconds':n/RATE,'loop_seconds':n/RATE,'bpm':bpm,'sample_rate':RATE,'channels':2,'notes':count,'peak':float(abs(body).max()),'rms':float(np.sqrt(np.mean(body**2))),'seam_jump':float(abs(body[-1]-body[0]).max()),'decoded_peaks':decoded_peaks,'renderer':'FluidSynth','soundfont':FONT.name}
  manifest['music'][name]=report;reports[name]=report;print(name,json.dumps(report),flush=True)
manifest['music_sample_rate']=RATE
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(MIDI/'render-report.json').write_text(json.dumps(reports,indent=2)+'\n')
# Keep Web Audio loop endpoints aligned to rendered PCM, independent of compressed padding.
p=ROOT/'src/audio-state.ts';s=p.read_text();a=s.index('export const MUSIC_LOOP_SECONDS:');z=s.index('\n',a);s=s[:a]+'export const MUSIC_LOOP_SECONDS:Record<MusicScene,number>={'+','.join(k+':'+repr(v['loop_seconds']) for k,v in reports.items())+'};'+s[z:];p.write_text(s)
