import {EXPEDITION_FIXTURES,FLOATING_WALKWAY,BELL_BARRIER,SERVICE_DOOR} from './expedition-world.ts';
import {keeperAccess,lowWater,isFloatingWalkway,burnersLit} from './expedition-state.ts';
import {ESTUARY_STAGE,BELL_STEPS,LOCK_STAIRS,SLUICE_WHEEL,TIDE_GATE} from './estuary-world.ts';
import {CRYPT_TORCHES,TORCH_HEIGHT} from './scene-lights.ts';
import {regionGeometry,coastalGateLeaves,COLORS,box as regionBox,quad as regionQuad} from './region-geometry.ts';
import type {Material} from './region-geometry.ts';
import {regionOf,REGION_WORLDS,regionOffset,trailCoverage} from './region-world.ts';
import type {Zone} from './campaign.ts';
import {makeStone,makeFlame} from './stone-art.ts';
import {MAP,WIDTH,HEIGHT,wall,ENCOUNTERS,CHEST,SHRINE,GATE,EXIT,same} from './world.ts';
import {CREATURES,visibleEnemy,encounterActive,encounterDefinition} from './engine.ts';
import type {Game,Enemy} from './engine.ts';
import {creatureFrame,creatureLayout,battlePosition,VERTICAL_FOV,CAMERA_HEIGHT,DEFAULT_INSETS} from './combat-view.ts';
import type {CombatInsets} from './combat-view.ts';
export interface Camera {x:number;y:number;yaw:number}
const CELL=2.6,TOP=3.05;
type Vec=[number,number,number];
const VERTEX=`attribute vec3 aPosition;attribute vec3 aNormal;attribute vec2 aUv;uniform mat4 uProjection;uniform mat4 uView;varying vec3 vWorld;varying vec3 vNormal;varying vec2 vUv;void main(){vWorld=aPosition;vNormal=aNormal;vUv=aUv;gl_Position=uProjection*uView*vec4(aPosition,1.);}`;
const FRAGMENT=`precision mediump float;varying vec3 vWorld;varying vec3 vNormal;varying vec2 vUv;
uniform sampler2D uTexture;uniform sampler2D uTrailMask;uniform sampler2D uGrass;uniform vec3 uEye;uniform vec3 uTint;uniform float uMode;uniform float uAlpha;uniform vec3 uTorches[10];uniform float uTorchCount;uniform vec3 uAmbient;uniform float uHeadlamp;uniform float uTime;uniform float uOutside;uniform vec3 uFogColor;uniform float uFogDensity;
void main(){vec4 tex=texture2D(uTexture,vUv);if(uMode>4.5){vec2 maskUv=vec2((vWorld.x/2.6-20.+.5)/25.,1.-(vWorld.z/2.6+2.+.5)/21.);float cover=texture2D(uTrailMask,maskUv).r;vec3 grass=texture2D(uGrass,vWorld.xz*.38).rgb*vec3(.31,.48,.34);tex.rgb=mix(grass,tex.rgb,cover);}if(tex.a<.12)discard;float d=distance(vWorld,uEye);vec3 light=uAmbient;vec3 sheen=vec3(0.);
if(uMode<.5||uMode>4.5){vec3 n=normalize(vNormal+vec3(sin(vWorld.z*41.)*.045,0.,sin(vWorld.x*37.)*.045));vec3 eye=normalize(uEye-vWorld);
 light+=mix(vec3(.035,.045,.05),vec3(.28,.27,.21),uOutside)*max(0.,dot(n,normalize(vec3(.3,.8,.4))));
 for(int i=0;i<10;i++){if(float(i)>=uTorchCount)continue;vec3 delta=uTorches[i]-vWorld;float t=length(delta);vec3 l=normalize(delta);float flicker=.93+.07*sin(uTime*7.+float(i)*2.)*sin(uTime*11.3+float(i));float power=4.5*flicker*(1.-uOutside)/(1.+t*t*.7);
 light+=vec3(1.,.56,.23)*power*(.25+.75*max(0.,dot(n,l)));
 float spec=pow(max(0.,dot(n,normalize(l+eye))),40.);sheen+=vec3(.6,.34,.12)*spec*power*max(0.,n.y)*.35;}
 if(uOutside>.5){float warm=.8/(1.+pow(distance(vWorld,vec3(10.4,2.1,20.3)),2.)*1.2)+.8/(1.+pow(distance(vWorld,vec3(41.6,2.1,28.1)),2.)*1.2);light+=vec3(.7,.35,.1)*warm;}
 float lantern=distance(vWorld,uEye+vec3(0.,-.4,0.));light+=vec3(.55,.64,.61)*2.3*(1.-uOutside)*uHeadlamp/(1.+lantern*lantern*.55);if(uOutside>.5)light=min(light,vec3(1.2));
 float base=clamp(vWorld.y/.24,0.,1.);if(abs(n.y)<.5)light*=.62+.38*base;
}else if(uMode<1.5){light=vec3(.82,.86,.83);}else{light=vec3(1.);}
vec3 color=tex.rgb*light*uTint+sheen;if(uMode>2.5&&uMode<3.5){float ripple=sin(length(vWorld.xz-vec2(26.,20.8))*27.-uTime*4.)*.5+.5;float glint=pow(max(0.,sin(vWorld.x*31.+vWorld.z*24.-uTime*2.)),20.);
if(uMode>3.1){float wave=vWorld.z*2.6+vWorld.x*.72-uTime*1.14;ripple=.52+.28*sin(wave)+.13*sin(vWorld.z*5.8-vWorld.x*1.33+uTime*.76);glint=pow(max(0.,sin(wave+sin(vWorld.x*.83+uTime*.19))),16.)*.25;}
color+=vec3(.1,.17,.19)*ripple+vec3(.45,.56,.6)*glint;}if(uMode>3.5&&uMode<4.5){float fresnel=pow(1.-abs(dot(normalize(vNormal),normalize(uEye-vWorld))),3.);color+=vec3(.22,.3,.35)*fresnel;}float fog=1.-exp(-d*d*uFogDensity);float drift=.8+.2*sin(vWorld.x*.16+uTime*.08)*sin(vWorld.z*.13-uTime*.05);fog+=uOutside*.15*(1.-exp(-d*.035))*exp(-max(0.,vWorld.y)*1.35)*drift;color=mix(color,uFogColor,min(.99,fog));gl_FragColor=vec4(color,tex.a*uAlpha);}`;
function projection(aspect:number,shiftY=0){const f=1/Math.tan(VERTICAL_FOV/2),n=.06,far=220;return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,shiftY,(far+n)/(n-far),-1,0,0,2*far*n/(n-far),0]);}
function view(eye:Vec,yaw:number){const c=Math.cos(yaw),s=Math.sin(yaw);return new Float32Array([-s,0,-c,0,0,1,0,0,c,0,-s,0,s*eye[0]-c*eye[2],-eye[1],c*eye[0]+s*eye[2],1]);}
function quad(out:number[],a:Vec,b:Vec,c:Vec,d:Vec,n:Vec,uv=[0,0,1,1]){
  const[u0,v0,u1,v1]=uv;
  for(const[p,u,v]of [[a,u0,v0],[b,u1,v0],[c,u1,v1],[a,u0,v0],[c,u1,v1],[d,u0,v1]]as [Vec,number,number][])out.push(...p,...n,u,v);
}
function box(out:number[],x:number,y:number,z:number,w:number,h:number,d:number){
 const a=x-w/2,b=x+w/2,c=z-d/2,e=z+d/2,t=y+h;
 quad(out,[a,y,c],[b,y,c],[b,t,c],[a,t,c],[0,0,-1]);quad(out,[b,y,e],[a,y,e],[a,t,e],[b,t,e],[0,0,1]);
 quad(out,[a,y,e],[a,y,c],[a,t,c],[a,t,e],[-1,0,0]);quad(out,[b,y,c],[b,y,e],[b,t,e],[b,t,c],[1,0,0]);quad(out,[a,t,c],[b,t,c],[b,t,e],[a,t,e],[0,1,0]);
}
interface Mesh {buffer:WebGLBuffer;count:number}
export class DungeonRenderer {
  private gl:WebGLRenderingContext;
  private program:WebGLProgram;
  private positions:number;private normals:number;private uvs:number;
  private uniforms:Record<string,WebGLUniformLocation|null>={};
  private walls:Mesh;private floor:Mesh;private ceiling:Mesh;
  private dynamic:Mesh;private ornament:Mesh;
  private wallTexture:WebGLTexture;private floorTexture:WebGLTexture;private white:WebGLTexture;private glow:WebGLTexture;private flame:WebGLTexture;
  private atlas:WebGLTexture|null=null;
  private residents:WebGLTexture|null=null;
  private sky:WebGLTexture;private trailMask:WebGLTexture;
  private regions=new Map<Zone,{material:Material;mesh:Mesh}[]>();
  private coastalGates:{open:Mesh;closed:Mesh};
  private outdoorMeshes:{material:Material;mesh:Mesh}[]=[];
  private materials=new Map<Material,WebGLTexture>();
  private torches:Vec[]=[[2,1.72,.76],[.76,1.72,5],[8,1.72,4.76],[10,1.72,.76],[16,1.72,4.76],[17.24,1.72,11]].map(([x,y,z])=>[x*CELL,y,z*CELL]);
  public ready:Promise<void>;
  public error='';
  private combatInsets:CombatInsets={...DEFAULT_INSETS};
  setCombatInsets(insets:CombatInsets){this.combatInsets=insets;}
  constructor(public canvas:HTMLCanvasElement){
    const gl=canvas.getContext('webgl',{alpha:false,antialias:true,powerPreference:'low-power'});
    if(!gl)throw new Error('WebGL is required. Enable hardware acceleration in your browser.');this.gl=gl;
    const shader=(type:number,source:string)=>{const s=gl.createShader(type)!;gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)??'Shader');return s;};
    this.program=gl.createProgram()!;gl.attachShader(this.program,shader(gl.VERTEX_SHADER,VERTEX));gl.attachShader(this.program,shader(gl.FRAGMENT_SHADER,FRAGMENT));gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(this.program)??'WebGL');gl.useProgram(this.program);
    this.positions=gl.getAttribLocation(this.program,'aPosition');this.normals=gl.getAttribLocation(this.program,'aNormal');this.uvs=gl.getAttribLocation(this.program,'aUv');
    for(const name of ['uProjection','uView','uEye','uTint','uMode','uAlpha','uTorches[0]','uTime','uOutside','uFogColor','uFogDensity','uTrailMask','uGrass','uTorchCount','uAmbient','uHeadlamp'])this.uniforms[name]=gl.getUniformLocation(this.program,name);
    gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(.025,.065,.075,1);
    const sky=document.createElement('canvas');sky.width=512;sky.height=256;const sc=sky.getContext('2d')!,sg=sc.createLinearGradient(0,0,0,256);sg.addColorStop(0,'#183044');sg.addColorStop(.46,'#4d6878');sg.addColorStop(.8,'#a7ada0');sg.addColorStop(1,'#9eaa94');sc.fillStyle=sg;sc.fillRect(0,0,512,256);for(let k=0;k<34;k++){sc.fillStyle='#d7c6a50b';sc.beginPath();sc.ellipse((k*107)%512,80+(k*31)%65,42+(k*29)%80,1+k%4,0,0,Math.PI*2);sc.fill();}this.sky=this.texture(sky);
    this.wallTexture=this.texture(makeStone(),true);this.floorTexture=this.texture(makeStone(true));
    const white=document.createElement('canvas');white.width=white.height=2;white.getContext('2d')!.fillStyle='#ffffff';white.getContext('2d')!.fillRect(0,0,2,2);this.white=this.texture(white);
    const glow=document.createElement('canvas');glow.width=glow.height=128;const ctx=glow.getContext('2d')!,gr=ctx.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'#fff6cf');gr.addColorStop(.13,'#ffc980');gr.addColorStop(.4,'#f58f4144');gr.addColorStop(1,'#f58f4100');ctx.fillStyle=gr;ctx.fillRect(0,0,128,128);this.glow=this.texture(glow);this.flame=this.texture(makeFlame());
    const walls:number[]=[],floor:number[]=[],ceiling:number[]=[],ornament:number[]=[];
    for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){
      if(wall(x,y))continue;const l=(x-.5)*CELL,r=(x+.5)*CELL,t=(y-.5)*CELL,b=(y+.5)*CELL;
      quad(floor,[l,0,t],[r,0,t],[r,0,b],[l,0,b],[0,1,0]);quad(ceiling,[l,TOP,b],[r,TOP,b],[r,TOP,t],[l,TOP,t],[0,-1,0]);
      if(wall(x,y-1))quad(walls,[l,0,t],[r,0,t],[r,TOP,t],[l,TOP,t],[0,0,1]);
      if(wall(x,y+1))quad(walls,[r,0,b],[l,0,b],[l,TOP,b],[r,TOP,b],[0,0,-1]);
      if(wall(x-1,y))quad(walls,[l,0,b],[l,0,t],[l,TOP,t],[l,TOP,b],[1,0,0]);
      if(wall(x+1,y))quad(walls,[r,0,t],[r,0,b],[r,TOP,b],[r,TOP,t],[-1,0,0]);
      // Projecting plinths, cornices and layered piers make the masonry read in real depth.
      for(const side of [-1,1]){
       if(wall(x+side,y)){
        const edge=side<0?l+.07:r-.07;
        box(walls,edge,0,y*CELL,.23,.22,CELL);box(walls,edge,2.67,y*CELL,.24,.14,CELL);
        box(walls,edge,0,t+.15,.32,2.75,.34);box(walls,edge,2.47,t+.15,.46,.24,.48);
        box(ornament,edge-side*.13,.25,t+.15,.025,2.15,.09);
       }
       if(wall(x,y+side)){
        const edge=side<0?t+.07:b-.07;
        box(walls,x*CELL,0,edge,CELL,.22,.23);box(walls,x*CELL,2.67,edge,CELL,.14,.24);
        box(walls,l+.15,0,edge,.34,2.75,.32);box(walls,l+.15,2.47,edge,.48,.24,.46);
        box(ornament,l+.15,.25,edge-side*.13,.09,2.15,.025);
       }
      }
      // Repeated stone vault ribs span the two corridor orientations, leaving the route clear.
      const east=!wall(x-1,y)||!wall(x+1,y),south=!wall(x,y-1)||!wall(x,y+1);
      if((x+y)%2===0)for(const alongX of [true,false]){
       if(alongX&&!east||!alongX&&!south)continue;
       for(let k=0;k<8;k++){
        const a=-CELL/2+k*CELL/8,b=a+CELL/8+.015;
        const ya=2.55+.45*Math.sin((a/CELL+.5)*Math.PI),yb=2.55+.45*Math.sin((b/CELL+.5)*Math.PI);
        if(alongX)quad(walls,[x*CELL-.11,ya,y*CELL+a],[x*CELL+.11,ya,y*CELL+a],[x*CELL+.11,yb,y*CELL+b],[x*CELL-.11,yb,y*CELL+b],[0,-1,0]);
        else quad(walls,[x*CELL+a,ya,y*CELL-.11],[x*CELL+b,yb,y*CELL-.11],[x*CELL+b,yb,y*CELL+.11],[x*CELL+a,ya,y*CELL+.11],[0,-1,0]);
       }
      }
    }
    this.ornament=this.mesh(ornament);this.walls=this.mesh(walls);this.floor=this.mesh(floor);this.ceiling=this.mesh(ceiling);this.dynamic=this.mesh([]);
    const shared={}as Record<Material,number[]>;for(const m of Object.keys(COLORS)as Material[])shared[m]=[];
    const meshes=(groups:Record<Material,number[]>)=>Object.entries(groups).filter(([,v])=>v.length).sort(([a],[b])=>(a==='water'?2:a==='shadow'?1:0)-(b==='water'?2:b==='shadow'?1:0)).map(([material,v])=>({material:material as Material,mesh:this.mesh(v)}));
    for(const zone of Object.keys(REGION_WORLDS)as Zone[]){const groups=regionGeometry(zone);if(zone==='village'||zone==='road'){const offset=regionOffset(zone);for(const material of Object.keys(groups)as Material[]){const v=groups[material],out=shared[material];for(let i=0;i<v.length;i+=8)out.push(v[i]+offset.x*CELL,v[i+1],v[i+2]+offset.y*CELL,...v.slice(i+3,i+8));}}else this.regions.set(zone,meshes(groups));}this.outdoorMeshes=meshes(shared);
    const roadOrigin=regionOffset('road');
    const gateMesh=(open:boolean)=>this.mesh(coastalGateLeaves(roadOrigin.x*CELL,roadOrigin.y*CELL,open));
    this.coastalGates={open:gateMesh(true),closed:gateMesh(false)};
    for(const material of ['wood','roof','plaster','grass','path','leaf','cobble']as Material[]){const c=document.createElement('canvas');c.width=c.height=256;const cx=c.getContext('2d')!;cx.fillStyle='#d2cbb9';cx.fillRect(0,0,256,256);let seed=713;for(let i=0;i<3500;i++){seed=(seed*1664525+1013904223)>>>0;const x=seed%256;seed=(seed*1664525+1013904223)>>>0;const y=seed%256;cx.fillStyle=i%2?'#20281b19':'#ffffff23';cx.fillRect(x,y,material==='wood'?1:3,material==='wood'?22:material==='grass'?8:2);}if(material==='roof'||material==='wood'){cx.strokeStyle='#182b2e55';cx.lineWidth=2;for(let y=0;y<256;y+=32){cx.beginPath();cx.moveTo(0,y);cx.lineTo(256,y);cx.stroke();if(material==='roof')for(let x=0;x<256;x+=48){cx.beginPath();cx.moveTo(x+(y%64?24:0),y);cx.lineTo(x+(y%64?24:0),y+32);cx.stroke();}}}if(material==='cobble'){cx.fillStyle='#3f514e';cx.fillRect(0,0,256,256);for(let row=0;row<10;row++)for(let col=-1;col<10;col++){const x=col*30+(row%2)*15,y=row*26;cx.fillStyle=['#9a9b88','#888f81','#a4a28b','#798a80'][(col+row*3+20)%4];cx.beginPath();cx.roundRect(x+1,y+1,27,23,4);cx.fill();cx.strokeStyle='#c5c4a63a';cx.stroke();}}if(material==='grass'){const pixels=cx.createImageData(256,256);for(let k=0;k<pixels.data.length;k+=4){seed=(seed*1664525+1013904223)>>>0;const shade=seed%23-11;pixels.data[k]=148+shade;pixels.data[k+1]=160+shade;pixels.data[k+2]=137+shade;pixels.data[k+3]=255;}cx.putImageData(pixels,0,0);cx.strokeStyle='#52684b35';cx.lineWidth=.6;for(let k=0;k<500;k++){seed=(seed*1664525+1013904223)>>>0;const x=seed%256;seed=(seed*1664525+1013904223)>>>0;const y=seed%256;cx.beginPath();cx.moveTo(x,y);cx.lineTo(x+1,y-3);cx.stroke();}}this.materials.set(material,this.texture(c,true));}
    const mask=document.createElement('canvas');mask.width=mask.height=512;const mc=mask.getContext('2d')!,md=mc.createImageData(512,512);for(let y=0;y<512;y++)for(let x=0;x<512;x++){const cover=Math.round(trailCoverage((x+.5)/512*25-.5,(y+.5)/512*21-.5)*255),i=(y*512+x)*4;md.data[i]=md.data[i+1]=md.data[i+2]=cover;md.data[i+3]=255;}mc.putImageData(md,0,0);this.trailMask=this.texture(mask);
    const rubble=document.createElement('canvas');rubble.width=rubble.height=512;const rc=rubble.getContext('2d')!;rc.fillStyle='#454d43';rc.fillRect(0,0,512,512);let rs=921;const rand=()=>{rs=(rs*1664525+1013904223)>>>0;return rs/4294967296;};for(let row=0;row<7;row++)for(let col=-1;col<6;col++){const x=col*102+(row%2)*51,y=row*74,shade=Math.floor(rand()*25);rc.fillStyle=`rgb(${107+shade},${112+shade},${102+shade})`;rc.beginPath();rc.moveTo(x+8,y+8);rc.lineTo(x+92,y+5+rand()*5);rc.lineTo(x+100,y+56);rc.lineTo(x+88,y+69);rc.lineTo(x+6,y+66);rc.lineTo(x+2,y+22);rc.closePath();rc.fill();rc.strokeStyle='#b8b8a155';rc.lineWidth=2;rc.stroke();}for(let k=0;k<20000;k++){rc.fillStyle=k%2?'#f0e9c310':'#17261b18';rc.fillRect(rand()*512,rand()*512,1+rand()*3,1+rand()*3);}this.materials.set('fieldstone',this.texture(rubble,true));const limestone=document.createElement('canvas');limestone.width=limestone.height=256;const lc=limestone.getContext('2d')!;lc.fillStyle='#9b9e8f';lc.fillRect(0,0,256,256);for(let k=0;k<16000;k++){lc.fillStyle=k%3?'#e6e4ce12':'#283b2d25';lc.fillRect(rand()*256,rand()*256,1+rand()*3,1+rand()*2);}this.materials.set('cutstone',this.texture(limestone,true));this.materials.set('cliff',this.materials.get('cutstone')!);this.materials.set('brick',this.wallTexture);
    const pane=document.createElement('canvas');pane.width=pane.height=256;const pc=pane.getContext('2d')!,pg=pc.createLinearGradient(0,0,210,256);pg.addColorStop(0,'#26434d');pg.addColorStop(.28,'#7f9694');pg.addColorStop(.46,'#adac8a');pg.addColorStop(.53,'#304e59');pg.addColorStop(.64,'#b7955b');pg.addColorStop(1,'#e3b46e');pc.fillStyle=pg;pc.fillRect(0,0,256,256);pc.fillStyle='#0e222553';pc.fillRect(0,0,23,256);pc.fillRect(232,0,24,256);pc.strokeStyle='#d5ece64a';pc.lineWidth=8;for(const x of [-90,50,190,330]){pc.beginPath();pc.moveTo(x,0);pc.lineTo(x-110,256);pc.stroke();}for(let y=0;y<256;y+=12){pc.strokeStyle='#cae5e91c';pc.lineWidth=1;pc.beginPath();pc.moveTo(0,y);pc.bezierCurveTo(64,y+7,128,y-9,256,y+3);pc.stroke();}pc.strokeStyle='#172c30cc';pc.lineWidth=3;for(const slope of [-1,1])for(let i=-4;i<6;i++){pc.beginPath();pc.moveTo(i*75,0);pc.lineTo(i*75+slope*256,256);pc.stroke();}this.materials.set('glass',this.texture(pane));this.materials.set('coolglass',this.texture(pane));
    this.ready=Promise.all([this.loadAtlas(),this.loadResidents(),this.loadSurfaces()]).then(()=>{}).catch(error=>{this.error=String(error);throw error;});
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.error='The graphics context was lost. Reload to resume your saved expedition.';});
  }
  private async loadSurfaces(){const img=new Image();img.src='./art/surfaces.webp';await img.decode();for(const[material,col,row]of [['path',0,0],['wood',1,0],['plaster',0,1],['roof',1,1]]as [Material,number,number][]){const c=document.createElement('canvas');c.width=c.height=512;c.getContext('2d')!.drawImage(img,col*img.width/2,row*img.height/2,img.width/2,img.height/2,0,0,512,512);this.materials.set(material,this.texture(c,true));}}
  private async loadResidents(){const img=new Image();img.src='./art/residents.webp';await img.decode();this.residents=this.texture(img);}
  private async loadAtlas(){const img=new Image();img.src='./art/bestiary.png';await img.decode();this.atlas=this.texture(img);}
  private texture(image:TexImageSource,repeat=false){const gl=this.gl,t=gl.createTexture()!;gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,1);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,repeat?gl.REPEAT:gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,repeat?gl.REPEAT:gl.CLAMP_TO_EDGE);return t;}
  private mesh(vertices:number[]):Mesh{const buffer=this.gl.createBuffer()!;this.gl.bindBuffer(this.gl.ARRAY_BUFFER,buffer);this.gl.bufferData(this.gl.ARRAY_BUFFER,new Float32Array(vertices),this.gl.STATIC_DRAW);return{buffer,count:vertices.length/8};}
  private draw(mesh:Mesh,texture:WebGLTexture,tint:Vec=[1,1,1],mode=0,alpha=1){
    const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);
    for(const[attribute,size,offset]of [[this.positions,3,0],[this.normals,3,12],[this.uvs,2,24]]){gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,size,gl.FLOAT,false,32,offset);}
    gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform3fv(this.uniforms.uTint,tint);gl.uniform1f(this.uniforms.uMode,mode);gl.uniform1f(this.uniforms.uAlpha,alpha);gl.drawArrays(gl.TRIANGLES,0,mesh.count);
  }
  private transient(vertices:number[],texture:WebGLTexture,tint:Vec,mode=0,alpha=1){const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,this.dynamic.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);this.dynamic.count=vertices.length/8;this.draw(this.dynamic,texture,tint,mode,alpha);}
  private billboard(x:number,z:number,w:number,h:number,yaw:number,uv:number[],ground=0){const s=Math.sin(yaw)*w/2,c=Math.cos(yaw)*w/2,a:Vec=[x+s,ground,z-c],b:Vec=[x-s,ground,z+c],out:number[]=[];quad(out,a,b,[b[0],h+ground,b[2]],[a[0],h+ground,a[2]],[0,0,1],uv);return out;}
  render(g:Game,camera:Camera,time:number){
    if(g.campaign){this.renderRegion(g,camera,time);return;}
    const gl=this.gl,dpr=Math.min(devicePixelRatio||1,1.6),w=Math.round(this.canvas.clientWidth*dpr),h=Math.round(this.canvas.clientHeight*dpr);
    if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}if(w===0||h===0)return;
    gl.viewport(0,0,w,h);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);
    const battle=g.battle,clock=g.phase==='combat'?battle!.time:time;
    let recent;for(let i=g.feedback.length-1;i>=0;i--){const f=g.feedback[i];if(f.kind==='hurt'&&battle&&battle.time-f.time<.32){recent=f;break;}}
    const shake=recent&&!battle?.paused?Math.sin((battle!.time-recent.time)*80)*.025:0;
    const eye:Vec=[camera.x*CELL,CAMERA_HEIGHT+shake,camera.y*CELL];
    const battleEncounter=battle?encounterDefinition(battle.encounter):undefined;
    const advance=battle?Math.max(0,...battle.enemies.map(e=>{const age=battle.time-e.strikeAt;return age>=0&&age<.3?Math.sin(age/.3*Math.PI)*.22:0;})):0;
    const depth=battleEncounter?Math.max(.7,(battleEncounter.x*CELL-eye[0])*Math.cos(camera.yaw)+(battleEncounter.y*CELL-eye[2])*Math.sin(camera.yaw)-advance):0;
    const framing=battleEncounter&&battle?creatureLayout(battleEncounter.kind,this.canvas.clientWidth,this.canvas.clientHeight,depth,this.combatInsets):undefined;
    gl.uniformMatrix4fv(this.uniforms.uProjection,false,projection(w/h,framing?.shiftY??0));gl.uniformMatrix4fv(this.uniforms.uView,false,view(eye,camera.yaw+shake*.3));gl.uniform3fv(this.uniforms.uEye,eye);gl.uniform3fv(this.uniforms['uTorches[0]'],this.torches.flat());gl.uniform1f(this.uniforms.uTime,clock);gl.uniform1f(this.uniforms.uTorchCount,this.torches.length);gl.uniform3fv(this.uniforms.uAmbient,[.2,.29,.33]);gl.uniform1f(this.uniforms.uHeadlamp,1);gl.uniform1f(this.uniforms.uOutside,0);gl.uniform3fv(this.uniforms.uFogColor,[.018,.043,.055]);gl.uniform1f(this.uniforms.uFogDensity,.0037);
    gl.depthMask(true);this.draw(this.floor,this.floorTexture,[.8,.9,.88]);this.draw(this.ceiling,this.wallTexture,[.52,.62,.67]);this.draw(this.walls,this.wallTexture);this.draw(this.ornament,this.white,[.24,.39,.37]);
    const props:number[]=[];
    // Closed iron gate physically occludes the far corridor and its monsters.
    if(!g.gateOpen){const x=GATE.x*CELL,z=GATE.y*CELL;for(let n=-4;n<=4;n++)box(props,x+n*.27,0,z,.065,TOP,.09);box(props,x,1,z,CELL,.07,.1);box(props,x,2,z,CELL,.07,.1);}
    if(!g.chestOpen){box(props,CHEST.x*CELL,.02,CHEST.y*CELL,.8,.48,.55);box(props,CHEST.x*CELL,.49,CHEST.y*CELL,.84,.12,.6);}

    this.transient(props,this.white,[.38,.29,.15]);
    const sconces:number[]=[];
    for(const [x,y,z]of this.torches){
      box(sconces,x,y-.35,z,.045,.28,.045);
      for(let k=0;k<8;k++){
        const a=k*Math.PI/4,b=(k+1)*Math.PI/4;
        quad(sconces,[x+Math.cos(a)*.035,y-.15,z+Math.sin(a)*.035],[x+Math.cos(b)*.035,y-.15,z+Math.sin(b)*.035],[x+Math.cos(b)*.13,y-.04,z+Math.sin(b)*.13],[x+Math.cos(a)*.13,y-.04,z+Math.sin(a)*.13],[Math.cos(a),.4,Math.sin(a)]);
      }
    }
    this.transient(sconces,this.white,[.16,.20,.21],1);
    const fittings:number[]=[];
    if(!g.chestOpen){for(const side of [-1,1])box(fittings,CHEST.x*CELL+side*.27,.03,CHEST.y*CELL,.065,.59,.62);box(fittings,CHEST.x*CELL,.28,CHEST.y*CELL-.3,.15,.19,.035);}
    for(const side of [-1,1]){box(fittings,EXIT.x*CELL+side*.95,0,EXIT.y*CELL,.22,2.3,.25);box(fittings,EXIT.x*CELL+side*.95,2.3,EXIT.y*CELL,.31,.18,.34);}
    this.transient(fittings,this.white,[.49,.42,.24]);
    const source:number[]=[];box(source,SHRINE.x*CELL,.02,SHRINE.y*CELL,.65,.2,.65);this.transient(source,this.white,g.shrineUsed?[.19,.3,.3]:[.38,.8,.76],1);
    const portal:number[]=[];box(portal,EXIT.x*CELL,.02,EXIT.y*CELL,.95,.05,.95);this.transient(portal,this.white,[.44,.8,.79],2);
    gl.depthMask(false);
    for(const [x,y,z]of this.torches){
      const pulse=1+.08*Math.sin(clock*9+x);
      this.transient(this.billboard(x,z,.8,1.05,camera.yaw,[0,0,1,1],y-.4),this.glow,[1,.42,.12],2,.38);
      this.transient(this.billboard(x+.025*Math.sin(clock*13),z,.19*pulse,.55*pulse,camera.yaw,[0,0,1,1],y-.09),this.flame,[1,1,1],2);
      for(let i=0;i<3;i++){const t=(clock*.32+i*.31+x)%1;this.transient(this.billboard(x+Math.sin(t*8+i)*.07,z,.022,.045,camera.yaw,[0,0,1,1],y+t*.7),this.glow,[1,.55,.2],2,(1-t)*.8);}
    }
    if(!g.shrineUsed)this.transient(this.billboard(SHRINE.x*CELL,SHRINE.y*CELL,1.1,1.6,camera.yaw,[0,0,1,1],.08),this.glow,[.3,1,1],2,.7);
    const sprites:{x:number;y:number;kind:keyof typeof CREATURES;enemy?:Enemy;distance:number;scale:number}[]=[];
    for(const encounter of ENCOUNTERS){
      const active=battle?.encounter===encounter.id&&(g.phase==='combat'||g.phase==='victory');if(!encounterActive(g,encounter.id)&&!active)continue;
      const layout=active&&framing?framing:creatureLayout(encounter.kind,this.canvas.clientWidth,this.canvas.clientHeight,Math.hypot(encounter.x-camera.x,encounter.y-camera.y)*CELL,{top:0,bottom:0});
      const enemy=active?visibleEnemy(battle!):undefined;if(enemy&&enemy.hp<=0&&battle!.time-enemy.deathAt>.65&&g.phase!=='victory')continue;
      if(g.phase==='victory'&&active)continue;
      sprites.push({x:encounter.x,y:encounter.y,kind:encounter.kind,enemy,distance:Math.hypot(encounter.x-camera.x,encounter.y-camera.y),scale:layout.scale});
    }
    sprites.sort((a,b)=>b.distance-a.distance);
    if(this.atlas)for(const sprite of sprites){
      const e=sprite.enemy;let pose=Math.floor(clock*1.7)%2;
      if(e){if(e.hp<=0||battle!.time-e.hurtAt<.24)pose=4;else if(battle!.time-e.strikeAt<.32)pose=3;else if(e.windup>0)pose=2;}
      const frame=creatureFrame(sprite.kind,pose);
      const attack=e&&battle!.time-e.strikeAt<.3?Math.sin((battle!.time-e.strikeAt)/.3*Math.PI)*.22:0;
      const x=sprite.x*CELL-Math.cos(camera.yaw)*attack,z=sprite.y*CELL-Math.sin(camera.yaw)*attack;
      const alpha=e&&e.hp<=0?Math.max(0,1-(battle!.time-e.deathAt)/.65):1;
      const tint:Vec=e&&e.stunned>0&&e.frozen?[.56,.94,1]:e&&battle!.time-e.hurtAt<.18?[1.4,.74,.65]:[1,1,1];
      this.transient(this.billboard(x,z,frame.width*sprite.scale,frame.height*sprite.scale,camera.yaw,frame.uv),this.atlas,tint,1,alpha);
    }
    gl.depthMask(true);
  }
  private renderRegion(g:Game,camera:Camera,time:number){
    const gl=this.gl,w=Math.round(this.canvas.clientWidth*Math.min(devicePixelRatio||1,1.6)),h=Math.round(this.canvas.clientHeight*Math.min(devicePixelRatio||1,1.6));if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}if(!w||!h)return;
    const region=regionOf(g),offset=regionOffset(region.zone),battle=g.battle,clock=g.phase==='combat'?battle!.time:time,eye:Vec=[(camera.x+offset.x)*CELL,CAMERA_HEIGHT,(camera.y+offset.y)*CELL],outdoor=region.outdoor,greyhavenExterior=region.zone==='village'||region.zone==='road';
    const fog:Vec=region.zone==='estuary'?[.44,.55,.57]:outdoor?[.38,.49,.54]:region.zone==='glassworks'?[.08,.14,.17]:[.025,.065,.08];gl.clearColor(...fog,1);gl.viewport(0,0,w,h);gl.depthMask(true);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);
    const lights:Vec[]=region.zone==='crypts'?CRYPT_TORCHES.map(p=>[p.x*CELL,TORCH_HEIGHT,p.y*CELL]):region.zone==='glassworks'?[[4.5*CELL,1.5,7.6*CELL],[17.5*CELL,1.5,7.6*CELL],[4.5*CELL,1.5,11.4*CELL],[18*CELL,1.5,11.4*CELL]]:region.zone==='lockworks'?[[2.4*CELL,1.5,9*CELL],[8.4*CELL,1.5,6*CELL],[12.4*CELL,1.5,5*CELL],[12.4*CELL,1.5,3*CELL],[16.4*CELL,1.5,8*CELL],[21.4*CELL,1.5,10*CELL],[23.4*CELL,1.5,14*CELL]]:
      region.zone==='warehouse'?[[3.2*CELL,2.55,11*CELL],[6.2*CELL,2.15,7*CELL],[7*CELL,2.2,3*CELL],[16.6*CELL,2.45,3*CELL],[16.35*CELL,2.45,8*CELL],[12*CELL,2.5,12*CELL]]:
      region.zone==='annealing'?[[11*CELL,1.65,13*CELL],[3.15*CELL,1.7,11*CELL],[14*CELL,1.7,5*CELL],
        ...(g.campaign!.expedition?.westBurner?[[3*CELL,1.21,4*CELL]] as Vec[]:[]),
        ...(g.campaign!.expedition?.eastBurner?[[19*CELL,1.21,11*CELL]] as Vec[]:[])]:[];
    const encounter=battle?encounterDefinition(battle.encounter):undefined;
    const advance=battle?Math.max(0,...battle.enemies.map(e=>{const age=battle.time-e.strikeAt;return age>=0&&age<.3?Math.sin(age/.3*Math.PI)*.22:0;})):0;
    const close=encounter&&battle?battlePosition(g.position,encounter,battle.time):encounter;
    const depth=close?Math.max(.7,((close.x+offset.x)*CELL-eye[0])*Math.cos(camera.yaw)+((close.y+offset.y)*CELL-eye[2])*Math.sin(camera.yaw)-advance):0;
    const framing=encounter&&battle?creatureLayout(encounter.kind,this.canvas.clientWidth,this.canvas.clientHeight,depth,this.combatInsets):undefined;
    gl.uniformMatrix4fv(this.uniforms.uProjection,false,projection(w/h,framing?.shiftY??0));gl.uniformMatrix4fv(this.uniforms.uView,false,view(eye,camera.yaw));gl.uniform3fv(this.uniforms.uEye,eye);gl.uniform3fv(this.uniforms['uTorches[0]'],lights.length?lights.flat():[0,0,0]);gl.uniform1f(this.uniforms.uTorchCount,lights.length);gl.uniform3fv(this.uniforms.uAmbient,outdoor?[.8,.86,.9]:region.zone==='crypts'?[.13,.18,.2]:[.3,.36,.38]);gl.uniform1f(this.uniforms.uHeadlamp,0);gl.uniform1f(this.uniforms.uTime,clock);gl.uniform1f(this.uniforms.uOutside,outdoor?1:0);gl.uniform3fv(this.uniforms.uFogColor,fog);gl.uniform1f(this.uniforms.uFogDensity,outdoor?.000065:.00024);
    if(outdoor){const skybox:number[]=[],cx=20*CELL,cz=8*CELL,r=145;regionQuad(skybox,[cx-r,-30,cz-r],[cx+r,-30,cz-r],[cx+r,100,cz-r],[cx-r,100,cz-r],[0,0,1]);regionQuad(skybox,[cx+r,-30,cz+r],[cx-r,-30,cz+r],[cx-r,100,cz+r],[cx+r,100,cz+r],[0,0,-1]);regionQuad(skybox,[cx-r,-30,cz+r],[cx-r,-30,cz-r],[cx-r,100,cz-r],[cx-r,100,cz+r],[1,0,0]);regionQuad(skybox,[cx+r,-30,cz-r],[cx+r,-30,cz+r],[cx+r,100,cz+r],[cx+r,100,cz-r],[-1,0,0]);regionQuad(skybox,[cx-r,100,cz-r],[cx+r,100,cz-r],[cx+r,100,cz+r],[cx-r,100,cz+r],[0,-1,0],[0,1,1,1]);gl.depthMask(false);gl.uniform1f(this.uniforms.uFogDensity,0);this.transient(skybox,this.sky,[1,1,1],2);gl.uniform1f(this.uniforms.uFogDensity,.000065);gl.depthMask(true);}
    if(outdoor){gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.trailMask);gl.uniform1i(this.uniforms.uTrailMask,1);gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,this.materials.get('grass')!);gl.uniform1i(this.uniforms.uGrass,2);gl.activeTexture(gl.TEXTURE0);}
    for(const {material,mesh}of (greyhavenExterior?this.outdoorMeshes:this.regions.get(region.zone)!)){const tex=this.materials.get(material)??(material==='stone'?this.wallTexture:material==='floor'?this.floorTexture:this.white);if(material==='shadow'||material==='water')gl.depthMask(false);this.draw(mesh,tex,COLORS[material],material==='path'?5:material==='water'?(region.zone==='estuary'?3.25:3):['glass','coolglass'].includes(material)?4:['ember','shadow'].includes(material)?2:0,material==='shadow'?.25:material==='water'?.78:1);gl.depthMask(true);}
    const props:number[]=[];
    if(greyhavenExterior){
      const amount=g.campaign!.villageGateOpen?Math.min(1,Math.max(0,(g.playTime-(g.campaign!.gateOpenedAt??-2))/.9)):0;
      for(const side of [-1,1]){const hinge=8*CELL+side*CELL/2,angle=amount*Math.PI*.48;for(let bar=0;bar<=6;bar++){const d=bar*CELL/12;regionBox(props,20*CELL-Math.sin(angle)*d,0,hinge-side*Math.cos(angle)*d,.07,2.7,.07);}for(const y of [.5,1.5,2.6]){const d=CELL/4,x=20*CELL-Math.sin(angle)*d,z=hinge-side*Math.cos(angle)*d;const a:Vec=[x+Math.sin(angle)*CELL/4,y,z+side*Math.cos(angle)*CELL/4],b:Vec=[x-Math.sin(angle)*CELL/4,y,z-side*Math.cos(angle)*CELL/4];regionQuad(props,a,b,[b[0],y+.08,b[2]],[a[0],y+.08,a[2]],[1,0,0]);}}
      this.transient(props,this.white,[.24,.23,.17]);
      const open=g.campaign!.stage>=ESTUARY_STAGE.trail;
      this.draw(open?this.coastalGates.open:this.coastalGates.closed,this.white,[.31,.30,.26]);
    }
    if(region.zone==='crypts'){
      if(!g.gateOpen){for(let k=-4;k<=4;k++)regionBox(props,17*CELL+k*.27,0,9*CELL,.075,4.2,.12);regionBox(props,17*CELL,2,9*CELL,2.6,.1,.14);}
      if(!g.chestOpen){regionBox(props,5*CELL,.02,3*CELL,.8,.5,.6);regionBox(props,5*CELL,.52,3*CELL,.85,.1,.65);}this.transient(props,this.white,[.53,.39,.21]);
      const spring:number[]=[];regionBox(spring,1*CELL,.02,7*CELL,.7,.22,.7);this.transient(spring,this.white,g.shrineUsed?[.2,.4,.4]:[.3,.9,.9],2);
    }
    if(region.zone==='crypts'){
      const holders:number[]=[];for(const[x,y,z]of lights){regionBox(holders,x,y-.45,z,.065,.42,.065);regionBox(holders,x,y-.13,z,.2,.1,.2);}this.transient(holders,this.white,[.16,.13,.09]);gl.depthMask(false);
      for(const[x,y,z]of lights){const pulse=1+.06*Math.sin(clock*8+x);this.transient(this.billboard(x,z,.85,1.1,camera.yaw,[0,0,1,1],y-.35),this.glow,[1,.45,.16],2,.32);this.transient(this.billboard(x+.02*Math.sin(clock*11),z,.22*pulse,.59*pulse,camera.yaw,[0,0,1,1],y-.04),this.flame,[1,1,1],2);}
      gl.depthMask(true);
    }
    if(region.zone==='estuary'){
      this.drawEstuaryControls(g);
      const c=g.campaign!;
      if(this.residents&&c.stage===ESTUARY_STAGE.mooring&&c.bellShortcut)
        this.transient(this.billboard(22.4*CELL,11.4*CELL,.82,1.9,camera.yaw,[.75,0,1,1],-.13),this.residents,[1,1,1],1);
    }
    this.drawExpeditionFixtures(g);
    // Opaque world geometry writes depth first; alpha cutout characters then occlude correctly.
    const sprites:{x:number;y:number;kind?:keyof typeof CREATURES;enemy?:Enemy;frame?:number;scale:number}[]=[];
    for(const visible of greyhavenExterior?[REGION_WORLDS.village,REGION_WORLDS.road]:[region]){const origin=regionOffset(visible.zone);for(const e of visible.encounters){const active=battle?.encounter===e.id;if(!encounterActive(g,e.id)||g.phase==='victory'&&active)continue;const place=active&&battle?battlePosition(g.position,e,battle.time):e;sprites.push({...e,x:place.x+origin.x,y:place.y+origin.y,enemy:active?visibleEnemy(battle!):undefined,scale:active?framing?.scale??1:1});}for(const n of visible.residents)if(!(n.id==='lys'&&g.campaign!.recruited))sprites.push({...n,x:n.x+origin.x,y:n.y+origin.y,scale:1});}
    sprites.sort((a,b)=>Math.hypot(b.x-camera.x-offset.x,b.y-camera.y-offset.y)-Math.hypot(a.x-camera.x-offset.x,a.y-camera.y-offset.y));
    for(const s of sprites){if(s.frame!==undefined){if(this.residents)this.transient(this.billboard(s.x*CELL,s.y*CELL,.82,1.9,camera.yaw,[s.frame/4,0,(s.frame+1)/4,1]),this.residents,[1,1,1],1);continue;}if(!this.atlas||!s.kind)continue;
      const e=s.enemy;let pose=Math.floor(clock*1.7)%2;if(e){if(e.hp<=0||battle!.time-e.hurtAt<.24)pose=4;else if(battle!.time-e.strikeAt<.32)pose=3;else if(e.windup>0)pose=2;}const f=creatureFrame(s.kind,pose),attack=e&&battle!.time-e.strikeAt<.3?Math.sin((battle!.time-e.strikeAt)/.3*Math.PI)*.22:0;this.transient(this.billboard(s.x*CELL-Math.cos(camera.yaw)*attack,s.y*CELL-Math.sin(camera.yaw)*attack,f.width*s.scale,f.height*s.scale,camera.yaw,f.uv),this.atlas,e&&e.frozen&&e.stunned>0?[.56,.94,1]:e&&battle!.time-e.hurtAt<.18?[1.4,.74,.65]:[1,1,1],1);
    }
    gl.depthMask(true);
  }

  private drawEstuaryControls(g:Game){
    const c=g.campaign!,props:number[]=[],low=lowWater(g);
    for(const [point,operated] of [[SLUICE_WHEEL,low],[TIDE_GATE,c.stage>=ESTUARY_STAGE.ferrymaster]] as const){
      const x=point.x*CELL,z=point.y*CELL-.67,angle=operated?.55:0;
      for(let i=0;i<20;i++){
        const a=i*Math.PI/10+angle;
        regionBox(props,x+.42*Math.cos(a),1.24+.42*Math.sin(a),z,.15,.15,.10);
      }
      for(let i=0;i<5;i++){
        const a=i*Math.PI*2/5+angle;
        for(let r=.04;r<.43;r+=.06)regionBox(props,x+r*Math.cos(a),1.24+r*Math.sin(a),z,.095,.095,.10);
      }
    }
    const x=BELL_STEPS.x*CELL,z=(BELL_STEPS.y-.47)*CELL;
    if(!c.bellShortcut)regionBox(props,x,.03,z,1.46,2.16,.13);
    else regionBox(props,x+.77,.03,z+.72,.13,2.16,1.46);
    const closed=c.stage>=ESTUARY_STAGE.ferrymaster;
    const gateX=(TIDE_GATE.x+.55)*CELL,gateZ=TIDE_GATE.y*CELL;
    for(const edge of [-1.3,1.3])regionBox(props,gateX,-.72,gateZ+edge,.29,3.05,.23);
    regionBox(props,gateX,closed?-.59:1.05,gateZ,.23,1.22,CELL);
    this.transient(props,this.white,[.48,.35,.19]);

    if(c.stage<ESTUARY_STAGE.alone){
      const hull:number[]=[],bx=22.4*CELL,bz=11.55*CELL;
      for(let i=-6;i<=6;i++){
        const width=1.01*(1-(i/7)**2);
        regionBox(hull,bx,-.62,bz+i*.39,width,.55,.4);
      }
      regionBox(hull,bx,-.15,bz,.09,2.7,.09);
      this.transient(hull,this.materials.get('wood')??this.white,[.84,.68,.51]);
    }

    const blend=Math.min(1,Math.max(0,(g.playTime-(c.expedition?.tideChangedAt??c.sluiceLoweredAt??-3))/1.8));
    const fill=low?1-blend:blend;
    const deck:number[]=[],zWalk=FLOATING_WALKWAY.y*CELL,height=-1.08*(1-fill);
    const start=(FLOATING_WALKWAY.start-.5)*CELL,end=(FLOATING_WALKWAY.end+.5)*CELL;
    for(let x=start+.16;x<end;x+=.32)regionBox(deck,x,height-.14,zWalk,.301,.14,2.46);
    for(const side of [-1,1]){
      regionBox(deck,(start+end)/2,height-.51,zWalk+side*.86,end-start,.43,.34);
      for(let x=start+.16;x<end;x+=1.3)regionBox(deck,x,height,zWalk+side*1.15,.13,.75,.13);
      regionBox(deck,(start+end)/2,height+.66,zWalk+side*1.15,end-start,.105,.12);
    }
    this.transient(deck,this.materials.get('wood')??this.white,[.82,.77,.69]);
    if(fill>0){
      const water:number[]=[],wx=LOCK_STAIRS.x*CELL,wz=LOCK_STAIRS.y*CELL,h=.17+fill*.69;
      regionQuad(water,[wx-1.10,h,wz-1.23],[wx+1.10,h,wz-1.23],[wx+1.10,h,wz+1.19],[wx-1.10,h,wz+1.19],[0,1,0]);
      this.transient(water,this.white,[.17,.39,.43],3.25,.91);
    }
  }

  private drawExpeditionFixtures(g:Game){
    const c=g.campaign!,p=c.expedition;
    const iron:number[]=[],glow:number[]=[];
    const barred=(x:number,z:number,alongX:boolean)=>{
      for(let bar=-4;bar<=4;bar++){
        const offset=bar*.25;
        regionBox(iron,x+(alongX?0:offset),0,z+(alongX?offset:0),.095,3.04,.13);
      }
      regionBox(iron,x,1.22,z,alongX?.17:2.3,.11,alongX?2.3:.17);
    };
    if(c.zone==='lockworks'){
      if(!keeperAccess(g)){
        const x=BELL_BARRIER.x*CELL,z=BELL_BARRIER.y*CELL+.95;
        barred(x,z,false);
      }
      const relay=EXPEDITION_FIXTURES.signal;
      regionBox(glow,relay.x*CELL,1.29,relay.y*CELL-.57,.48,.12,.08);
      if(!p?.lantern){
        const tag=EXPEDITION_FIXTURES.lantern,x=tag.x*CELL,z=tag.y*CELL-.57;
        regionBox(iron,x,0,z,.35,.13,.29);
        regionBox(glow,x,.13,z,.23,.26,.22);
      }
    }
    if(c.zone==='warehouse'&&!p?.culvert)barred(17*CELL,8*CELL,true);
    if(!(p?.ledger&&burnersLit(g))){
      if(c.zone==='annealing')barred(11*CELL,1*CELL,false);
      if(c.zone==='glassworks')barred(SERVICE_DOOR.x*CELL,SERVICE_DOOR.y*CELL,true);
    }
    if(c.zone==='annealing'){
      for(const key of ['westBurner','eastBurner'] as const){
        const burner=EXPEDITION_FIXTURES[key],x=burner.x*CELL,z=burner.y*CELL;
        if(p?.[key])regionBox(glow,x,.51,z-.477,1,.41,.055);
        else regionBox(iron,x,.7,z-.45,.15,.19,.16);
      }
    }
    if(iron.length)this.transient(iron,this.white,[.28,.26,.22]);
    if(glow.length)this.transient(glow,this.white,c.zone==='annealing'?[1,.51,.14]:[.31,.72,.63],2);
  }

}
export function drawMap(canvas:HTMLCanvasElement,g:Game,full=false){
  const ctx=canvas.getContext('2d')!,dpr=Math.min(devicePixelRatio||1,2),width=canvas.clientWidth,height=canvas.clientHeight;
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.scale(dpr,dpr);ctx.clearRect(0,0,width,height);
  const region=g.campaign?regionOf(g):undefined,map=region?.map??MAP,mw=map[0].length,mh=map.length,seen=region?new Set(g.campaign?.worldSeen?.[region.zone]??[]):g.seen;
  const size=full?Math.min((width-24)/mw,(height-24)/mh):Math.min(width/9,height/9);
  const ox=full?(width-mw*size)/2:width/2-(g.position.x+.5)*size,oy=full?(height-mh*size)/2:height/2-(g.position.y+.5)*size;
  for(let y=0;y<mh;y++)for(let x=0;x<mw;x++){
    if(!seen.has(`${x},${y}`))continue;const px=ox+x*size,py=oy+y*size;
    ctx.fillStyle=map[y][x]==='#'?'#3f5355':'#172e31';ctx.fillRect(px+1,py+1,size-2,size-2);
    if(map[y][x]==='#')continue;
    if(region?.zone==='estuary'&&isFloatingWalkway({x,y})&&lowWater(g)){
      ctx.fillStyle='#1d4957';ctx.fillRect(px+1,py+1,size-2,size-2);continue;
    }
    const p={x,y};let color='';if(region?.passages.some(q=>same(p,q)))color='#80d6c7';if(region?.residents.some(q=>same(p,q))||region?.entrances.some(q=>same(p,q)))color='#e2c476';if(region?.zone==='estuary'&&[SLUICE_WHEEL,TIDE_GATE].some(q=>same(p,q)))color='#86c2bb';if((!region||region.zone==='crypts')&&same(p,CHEST))color=g.chestOpen?'#70634c':'#d9b574';if((!region||region.zone==='crypts')&&same(p,SHRINE))color='#80d6c7';if((!region||region.zone==='crypts')&&same(p,GATE)&&!g.gateOpen)color='#c8885a';if((!region||region.zone==='crypts')&&same(p,EXIT))color='#c8ebe4';
    if(region&&Object.values(EXPEDITION_FIXTURES).some(f=>f.zone===region.zone&&same(f,p)))color='#e2c476';
    if(region?.zone==='lockworks'&&same(p,BELL_BARRIER)&&!keeperAccess(g))color='#c8885a';
    if((region?.encounters??ENCOUNTERS).some(e=>same(e,p)&&encounterActive(g,e.id)))color='#c27569';
    if(color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(px+size/2,py+size/2,size*.18,0,Math.PI*2);ctx.fill();}
  }
  const x=ox+(g.position.x+.5)*size,y=oy+(g.position.y+.5)*size;ctx.save();ctx.translate(x,y);ctx.rotate(g.direction*Math.PI/2);ctx.fillStyle='#f5dfb1';ctx.shadowColor='#eac381';ctx.shadowBlur=8;ctx.beginPath();ctx.moveTo(size*.34,0);ctx.lineTo(-size*.24,-size*.22);ctx.lineTo(-size*.13,0);ctx.lineTo(-size*.24,size*.22);ctx.closePath();ctx.fill();ctx.restore();
}
