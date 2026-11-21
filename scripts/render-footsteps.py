"""Soft heel-to-toe footsteps; render only these assets, preserving all music masters."""
from pathlib import Path
import json, shutil, subprocess, tempfile, wave
import numpy as np
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/audio';RATE=48000
ffmpeg=shutil.which('ffmpeg')
if not ffmpeg: raise RuntimeError('ffmpeg is required')
manifest=json.loads((OUT/'manifest.json').read_text())
with tempfile.TemporaryDirectory(prefix='glass-footsteps-') as folder:
    for surface in ['stone','earth']:
        for variant in range(3):
            name=('step' if variant==0 else f'step-stone-{variant+1}') if surface=='stone' else f'step-earth-{variant+1}'
            rng=np.random.default_rng(4181+variant*71+(900 if surface=='earth' else 0))
            seconds=.34+variant*.012;t=np.arange(round(seconds*RATE))/RATE
            def noise(cutoff):
                raw=rng.normal(0,1,len(t));spectrum=np.fft.rfft(raw);freq=np.fft.rfftfreq(len(t),1/RATE)
                spectrum*=1/(1+(freq/cutoff)**4);result=np.fft.irfft(spectrum,n=len(t));return result/max(np.std(result),1e-6)
            heel=np.exp(-((t-(.032+variant*.002))/.023)**2)
            sole=np.exp(-((t-(.093+variant*.005))/.047)**2)
            brush=np.exp(-((t-.17)/.071)**2)
            contact=noise(530 if surface=='stone' else 330)
            body=noise(145)
            friction=noise(1500 if surface=='stone' else 900)
            signal=contact*(.27*heel+.21*sole)+body*(.22*heel+.17*sole)+friction*brush*(.025 if surface=='stone' else .038)
            signal*=np.minimum(1,t/.016)*np.minimum(1,np.maximum(0,seconds-t)/.065)
            if surface=='stone':
                for delay,gain in [(.019,.09),(.043,.035)]:
                    n=round(delay*RATE);signal[n:]+=signal[:-n]*gain
            peak=.28 if surface=='stone' else .23;signal*=peak/max(np.max(np.abs(signal)),1e-6)
            stereo=np.column_stack([signal*.99,signal])
            wav=Path(folder)/(name+'.wav')
            with wave.open(str(wav),'wb') as w:
                w.setnchannels(2);w.setsampwidth(2);w.setframerate(RATE);w.writeframes((stereo*32767).astype('<i2').tobytes())
            for ext,codec,args in [('ogg','libvorbis',['-q:a','4']),('m4a','aac',['-b:a','96k','-movflags','+faststart'])]:
                subprocess.run([ffmpeg,'-nostdin','-hide_banner','-loglevel','error','-y','-i',str(wav),'-c:a',codec,*args,str(OUT/(name+'.'+ext))],check=True)
            manifest['effects'][name]={'seconds':len(t)/RATE,'sample_rate':RATE,'channels':2,'peak':float(np.max(np.abs(stereo))),'rms':float(np.sqrt(np.mean(stereo**2))),'surface':surface,'variant':variant+1}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Rendered six soft footsteps in OGG + AAC; music unchanged.')
