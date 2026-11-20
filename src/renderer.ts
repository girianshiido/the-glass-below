import {MAP,WIDTH,HEIGHT,wall,ENCOUNTERS,CHEST,SHRINE,GATE,EXIT,same} from './world.ts';
import {CREATURES} from './engine.ts';
import type {Game,Enemy} from './engine.ts';
export interface Camera {x:number;y:number;yaw:number}
const CELL=2.6,TOP=3.05;
type Vec=[number,number,number];
const VERTEX=`attribute vec3 aPosition;attribute vec3 aNormal;attribute vec2 aUv;uniform mat4 uProjection;uniform mat4 uView;varying vec3 vWorld;varying vec3 vNormal;varying vec2 vUv;void main(){vWorld=aPosition;vNormal=aNormal;vUv=aUv;gl_Position=uProjection*uView*vec4(aPosition,1.);}`;
const FRAGMENT=`precision mediump float;varying vec3 vWorld;varying vec3 vNormal;varying vec2 vUv;uniform sampler2D uTexture;uniform vec3 uEye;uniform vec3 uTint;uniform float uMode;uniform float uAlpha;uniform vec3 uTorches[6];void main(){vec4 tex=texture2D(uTexture,vUv);if(tex.a<.12)discard;float d=distance(vWorld,uEye);vec3 light=vec3(.31,.40,.42);if(uMode<.5){float diffuse=max(0.,dot(normalize(vNormal),normalize(vec3(.3,.8,.4))));light+=vec3(.10,.13,.14)*diffuse;for(int i=0;i<6;i++){float t=distance(vWorld,uTorches[i]);light+=vec3(.88,.48,.20)*1.7/(1.+t*t*.85);}float lantern=distance(vWorld,uEye+vec3(0.,-.5,0.));light+=vec3(.22,.25,.23)*2./(1.+lantern*lantern*.3);}else if(uMode<1.5){light=vec3(.82,.86,.83);}else{light=vec3(1.);}vec3 color=tex.rgb*light*uTint;float fog=1.-exp(-d*d*.0027);color=mix(color,vec3(.025,.065,.075),min(.97,fog));gl_FragColor=vec4(color,tex.a*uAlpha);}`;
function projection(aspect:number){const f=1/Math.tan(Math.PI*67/360),n=.06,far=48;return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+n)/(n-far),-1,0,0,2*far*n/(n-far),0]);}
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
function makeStone(floor=false){
  const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d')!;
  let seed=217;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  x.fillStyle=floor?'#283638':'#334548';x.fillRect(0,0,256,256);
  const h=floor?128:64,w=floor?128:128;
  for(let row=0;row<256/h;row++)for(let col=-1;col<3;col++){
    const left=col*w+(row%2)*w/2,top=row*h,v=Math.floor(random()*16);
    x.fillStyle=`rgb(${floor?44+v:61+v},${floor?55+v:73+v},${floor?55+v:73+v})`;x.fillRect(left+2,top+2,w-4,h-4);
    x.strokeStyle='#8b999127';x.strokeRect(left+3,top+3,w-6,h-6);
    x.strokeStyle='#0d191c70';x.beginPath();x.moveTo(left+6,top+h-4);x.lineTo(left+w-4,top+h-4);x.stroke();
    if(random()>.5){x.strokeStyle='#172b2f70';x.beginPath();x.moveTo(left+w*.3,top+4);x.lineTo(left+w*.37,top+h*.55);x.lineTo(left+w*.29,top+h-4);x.stroke();}
  }
  for(let i=0;i<10000;i++){x.fillStyle=random()>.5?'#dae3c609':'#00151c12';x.fillRect(random()*256,random()*256,random()*3+1,1);}
  return c;
}
interface Mesh {buffer:WebGLBuffer;count:number}
export class DungeonRenderer {
  private gl:WebGLRenderingContext;
  private program:WebGLProgram;
  private positions:number;private normals:number;private uvs:number;
  private uniforms:Record<string,WebGLUniformLocation|null>={};
  private walls:Mesh;private floor:Mesh;private ceiling:Mesh;
  private dynamic:Mesh;
  private wallTexture:WebGLTexture;private floorTexture:WebGLTexture;private white:WebGLTexture;private glow:WebGLTexture;
  private atlas:WebGLTexture|null=null;
  private torches:Vec[]=[[2.5,1.65,.58],[.58,1.65,5.5],[7.5,1.65,4.58],[10.58,1.65,1.5],[16.58,1.65,5.5],[17.42,1.65,11.5]].map(([x,y,z])=>[x*CELL,y,z*CELL]);
  public ready:Promise<void>;
  public error='';
  constructor(public canvas:HTMLCanvasElement){
    const gl=canvas.getContext('webgl',{alpha:false,antialias:true,powerPreference:'low-power'});
    if(!gl)throw new Error('WebGL is required. Enable hardware acceleration in your browser.');this.gl=gl;
    const shader=(type:number,source:string)=>{const s=gl.createShader(type)!;gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)??'Shader');return s;};
    this.program=gl.createProgram()!;gl.attachShader(this.program,shader(gl.VERTEX_SHADER,VERTEX));gl.attachShader(this.program,shader(gl.FRAGMENT_SHADER,FRAGMENT));gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(this.program)??'WebGL');gl.useProgram(this.program);
    this.positions=gl.getAttribLocation(this.program,'aPosition');this.normals=gl.getAttribLocation(this.program,'aNormal');this.uvs=gl.getAttribLocation(this.program,'aUv');
    for(const name of ['uProjection','uView','uEye','uTint','uMode','uAlpha','uTorches[0]'])this.uniforms[name]=gl.getUniformLocation(this.program,name);
    gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(.025,.065,.075,1);
    this.wallTexture=this.texture(makeStone());this.floorTexture=this.texture(makeStone(true));
    const white=document.createElement('canvas');white.width=white.height=2;white.getContext('2d')!.fillStyle='#ffffff';white.getContext('2d')!.fillRect(0,0,2,2);this.white=this.texture(white);
    const glow=document.createElement('canvas');glow.width=glow.height=128;const ctx=glow.getContext('2d')!,gr=ctx.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'#fff6cf');gr.addColorStop(.13,'#ffc980');gr.addColorStop(.4,'#f58f4144');gr.addColorStop(1,'#f58f4100');ctx.fillStyle=gr;ctx.fillRect(0,0,128,128);this.glow=this.texture(glow);
    const walls:number[]=[],floor:number[]=[],ceiling:number[]=[];
    for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){
      if(wall(x,y))continue;const l=(x-.5)*CELL,r=(x+.5)*CELL,t=(y-.5)*CELL,b=(y+.5)*CELL;
      quad(floor,[l,0,t],[r,0,t],[r,0,b],[l,0,b],[0,1,0]);quad(ceiling,[l,TOP,b],[r,TOP,b],[r,TOP,t],[l,TOP,t],[0,-1,0]);
      if(wall(x,y-1))quad(walls,[l,0,t],[r,0,t],[r,TOP,t],[l,TOP,t],[0,0,1]);
      if(wall(x,y+1))quad(walls,[r,0,b],[l,0,b],[l,TOP,b],[r,TOP,b],[0,0,-1]);
      if(wall(x-1,y))quad(walls,[l,0,b],[l,0,t],[l,TOP,t],[l,TOP,b],[1,0,0]);
      if(wall(x+1,y))quad(walls,[r,0,t],[r,0,b],[r,TOP,b],[r,TOP,t],[-1,0,0]);
      // Architectural ribs at wall junctions give the corridors depth and rhythm.
      if(wall(x-1,y))box(walls,l+.035,0,t+.06,.15,TOP,.16);
      if(wall(x+1,y))box(walls,r-.035,0,t+.06,.15,TOP,.16);
    }
    this.walls=this.mesh(walls);this.floor=this.mesh(floor);this.ceiling=this.mesh(ceiling);this.dynamic=this.mesh([]);
    this.ready=this.loadAtlas().catch(error=>{this.error=String(error);throw error;});
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.error='The graphics context was lost. Reload to resume your saved expedition.';});
  }
  private async loadAtlas(){const img=new Image();img.src='./art/bestiary.png';await img.decode();this.atlas=this.texture(img);}
  private texture(image:TexImageSource){const gl=this.gl,t=gl.createTexture()!;gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,1);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;}
  private mesh(vertices:number[]):Mesh{const buffer=this.gl.createBuffer()!;this.gl.bindBuffer(this.gl.ARRAY_BUFFER,buffer);this.gl.bufferData(this.gl.ARRAY_BUFFER,new Float32Array(vertices),this.gl.STATIC_DRAW);return{buffer,count:vertices.length/8};}
  private draw(mesh:Mesh,texture:WebGLTexture,tint:Vec=[1,1,1],mode=0,alpha=1){
    const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);
    for(const[attribute,size,offset]of [[this.positions,3,0],[this.normals,3,12],[this.uvs,2,24]]){gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,size,gl.FLOAT,false,32,offset);}
    gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform3fv(this.uniforms.uTint,tint);gl.uniform1f(this.uniforms.uMode,mode);gl.uniform1f(this.uniforms.uAlpha,alpha);gl.drawArrays(gl.TRIANGLES,0,mesh.count);
  }
  private transient(vertices:number[],texture:WebGLTexture,tint:Vec,mode=0,alpha=1){const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,this.dynamic.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);this.dynamic.count=vertices.length/8;this.draw(this.dynamic,texture,tint,mode,alpha);}
  private billboard(x:number,z:number,w:number,h:number,yaw:number,uv:number[],ground=0){const s=Math.sin(yaw)*w/2,c=Math.cos(yaw)*w/2,a:Vec=[x+s,ground,z-c],b:Vec=[x-s,ground,z+c],out:number[]=[];quad(out,a,b,[b[0],h+ground,b[2]],[a[0],h+ground,a[2]],[0,0,1],uv);return out;}
  render(g:Game,camera:Camera,time:number){
    const gl=this.gl,dpr=Math.min(devicePixelRatio||1,1.6),w=Math.round(this.canvas.clientWidth*dpr),h=Math.round(this.canvas.clientHeight*dpr);
    if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}if(w===0||h===0)return;
    gl.viewport(0,0,w,h);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);
    const battle=g.battle,clock=g.phase==='combat'?battle!.time:time;
    let recent;for(let i=g.feedback.length-1;i>=0;i--){const f=g.feedback[i];if(f.kind==='hurt'&&battle&&battle.time-f.time<.32){recent=f;break;}}
    const shake=recent&&!battle?.paused?Math.sin((battle!.time-recent.time)*80)*.025:0;
    const eye:Vec=[camera.x*CELL,1.22+shake,camera.y*CELL];
    gl.uniformMatrix4fv(this.uniforms.uProjection,false,projection(w/h));gl.uniformMatrix4fv(this.uniforms.uView,false,view(eye,camera.yaw+shake*.3));gl.uniform3fv(this.uniforms.uEye,eye);gl.uniform3fv(this.uniforms['uTorches[0]'],this.torches.flat());
    gl.depthMask(true);this.draw(this.floor,this.floorTexture,[.8,.9,.88]);this.draw(this.ceiling,this.wallTexture,[.52,.62,.67]);this.draw(this.walls,this.wallTexture);
    const props:number[]=[];
    // Closed iron gate physically occludes the far corridor and its monsters.
    if(!g.gateOpen){const x=GATE.x*CELL,z=GATE.y*CELL;for(let n=-4;n<=4;n++)box(props,x+n*.27,0,z,.065,TOP,.09);box(props,x,1,z,CELL,.07,.1);box(props,x,2,z,CELL,.07,.1);}
    if(!g.chestOpen){box(props,CHEST.x*CELL,.02,CHEST.y*CELL,.8,.48,.55);box(props,CHEST.x*CELL,.49,CHEST.y*CELL,.84,.12,.6);}
    for(const [x,y,z]of this.torches)box(props,x,y-.3,z,.14,.32,.14);
    this.transient(props,this.white,[.38,.29,.15]);
    const source:number[]=[];box(source,SHRINE.x*CELL,.02,SHRINE.y*CELL,.65,.2,.65);this.transient(source,this.white,g.shrineUsed?[.19,.3,.3]:[.38,.8,.76],1);
    const portal:number[]=[];box(portal,EXIT.x*CELL,.02,EXIT.y*CELL,.95,.05,.95);this.transient(portal,this.white,[.44,.8,.79],2);
    gl.depthMask(false);
    for(const [x,y,z]of this.torches){const flame=this.billboard(x,z,.65+.04*Math.sin(clock*9+x),.9,camera.yaw,[0,0,1,1],y-.2);this.transient(flame,this.glow,[1,.81,.5],2);}
    if(!g.shrineUsed)this.transient(this.billboard(SHRINE.x*CELL,SHRINE.y*CELL,1.1,1.6,camera.yaw,[0,0,1,1],.08),this.glow,[.3,1,1],2,.7);
    const sprites:{x:number;y:number;kind:keyof typeof CREATURES;enemy?:Enemy;distance:number;offset:number}[]=[];
    for(const encounter of ENCOUNTERS){
      const active=battle?.encounter===encounter.id&&(g.phase==='combat'||g.phase==='victory');if(g.cleared.has(encounter.id)&&!active)continue;
      for(let i=0;i<encounter.count;i++){
        const enemy=active?battle?.enemies[i]:undefined;if(enemy&&enemy.hp<=0&&battle!.time-enemy.deathAt>.65&&g.phase!=='victory')continue;
        if(g.phase==='victory'&&active)continue;
        const offset=encounter.count>1?(i-.5)*.88:0;
        sprites.push({x:encounter.x,y:encounter.y,kind:encounter.kind,enemy,distance:Math.hypot(encounter.x-camera.x,encounter.y-camera.y),offset});
      }
    }
    sprites.sort((a,b)=>b.distance-a.distance);
    if(this.atlas)for(const sprite of sprites){
      const e=sprite.enemy;let pose=Math.floor(clock*1.7)%2;
      if(e){if(e.hp<=0||battle!.time-e.hurtAt<.24)pose=4;else if(battle!.time-e.strikeAt<.32)pose=3;else if(e.windup>0)pose=2;}
      const row=CREATURES[sprite.kind].row,uv=[pose/5+.004,1-(row+1)/3+.005,(pose+1)/5-.004,1-row/3-.005];
      const scale=sprite.kind==='sentinel'?1.3:sprite.kind==='wraith'?1.05:.9;
      const attack=e&&battle!.time-e.strikeAt<.3?Math.sin((battle!.time-e.strikeAt)/.3*Math.PI)*.22:0;
      const x=sprite.x*CELL-Math.cos(camera.yaw)*attack-Math.sin(camera.yaw)*sprite.offset,z=sprite.y*CELL-Math.sin(camera.yaw)*attack+Math.cos(camera.yaw)*sprite.offset;
      const alpha=e&&e.hp<=0?Math.max(0,1-(battle!.time-e.deathAt)/.65):1;
      const tint:Vec=e&&e.stunned>0?[.56,.94,1]:e&&battle!.time-e.hurtAt<.18?[1.4,.74,.65]:[1,1,1];
      this.transient(this.billboard(x,z,2.15*scale,2.35*scale,camera.yaw,uv,-.12+Math.sin(clock*2.5+row)*.012),this.atlas,tint,1,alpha);
    }
    gl.depthMask(true);
  }
}
export function drawMap(canvas:HTMLCanvasElement,g:Game,full=false){
  const ctx=canvas.getContext('2d')!,dpr=Math.min(devicePixelRatio||1,2),width=canvas.clientWidth,height=canvas.clientHeight;
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.scale(dpr,dpr);ctx.clearRect(0,0,width,height);
  const size=full?Math.min((width-24)/WIDTH,(height-24)/HEIGHT):Math.min(width/9,height/9);
  const ox=full?(width-WIDTH*size)/2:width/2-(g.position.x+.5)*size,oy=full?(height-HEIGHT*size)/2:height/2-(g.position.y+.5)*size;
  for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){
    if(!g.seen.has(`${x},${y}`))continue;const px=ox+x*size,py=oy+y*size;
    ctx.fillStyle=MAP[y][x]==='#'?'#3f5355':'#172e31';ctx.fillRect(px+1,py+1,size-2,size-2);
    if(MAP[y][x]==='#')continue;
    const p={x,y};let color='';if(same(p,CHEST))color=g.chestOpen?'#70634c':'#d9b574';if(same(p,SHRINE))color='#80d6c7';if(same(p,GATE)&&!g.gateOpen)color='#c8885a';if(same(p,EXIT))color='#c8ebe4';
    if(ENCOUNTERS.some(e=>same(e,p)&&!g.cleared.has(e.id)))color='#c27569';
    if(color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(px+size/2,py+size/2,size*.18,0,Math.PI*2);ctx.fill();}
  }
  const x=ox+(g.position.x+.5)*size,y=oy+(g.position.y+.5)*size;ctx.save();ctx.translate(x,y);ctx.rotate(g.direction*Math.PI/2);ctx.fillStyle='#f5dfb1';ctx.shadowColor='#eac381';ctx.shadowBlur=8;ctx.beginPath();ctx.moveTo(size*.34,0);ctx.lineTo(-size*.24,-size*.22);ctx.lineTo(-size*.13,0);ctx.lineTo(-size*.24,size*.22);ctx.closePath();ctx.fill();ctx.restore();
}
