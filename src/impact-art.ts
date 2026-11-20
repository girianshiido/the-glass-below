/** Short, transparent blade strokes and sparks, in the style of the earlier games. */
export function drawThinImpact(c:CanvasRenderingContext2D,variant:number,progress:number,size:number,kind:'hit'|'hurt'|'break',motion=true){
  c.clearRect(0,0,size,size);if(progress>=1)return;
  const t=motion?progress:.42,x=size*.5,y=size*.5;
  const color=kind==='hurt'?'#efb6a0':kind==='break'?'#f2cc8e':'#e5eee8';
  const fade=Math.min(1,progress*14)*Math.min(1,(1-progress)*2.2);
  c.save();c.globalAlpha=fade;c.lineCap='round';c.lineJoin='round';
  function line(ax:number,ay:number,bx:number,by:number,bend:number,width:number){
    const sweep=Math.min(1,t*4.5);
    const path=()=>{c.beginPath();c.moveTo(ax,ay);c.quadraticCurveTo((ax+bx)/2,(ay+by)/2+bend,ax+(bx-ax)*sweep,ay+(by-ay)*sweep);};
    c.strokeStyle=color;c.lineWidth=width;path();c.stroke();
    c.strokeStyle='#fffbed';c.lineWidth=.85;path();c.stroke();
  }
  const rx=size*.36,ry=size*.23;
  if(kind==='hurt'){
    for(let i=0;i<3;i++){const a=-.8+i*.75;line(x-Math.cos(a)*rx*.55,y-Math.sin(a)*ry,x+Math.cos(a)*rx*.65,y+Math.sin(a)*ry,-size*.025,1.6);}
  }else{
    if(variant%4===0)line(x-rx,y+ry,x+rx,y-ry,-size*.08,kind==='break'?2.6:1.8);
    else if(variant%4===1)line(x+rx,y+ry,x-rx,y-ry,-size*.06,2);
    else if(variant%4===2)line(x-rx,y+size*.035,x+rx,y-size*.035,-size*.12,1.7);
    else{line(x-rx*.9,y+ry,x+rx*.9,y-ry,-size*.05,1.6);line(x-rx*.68,y-ry*.65,x+rx*.68,y+ry*.65,size*.025,1.2);}
    if(kind==='break')line(x-rx*.65,y-ry*.8,x+rx*.65,y+ry*.8,size*.04,1.6);
  }
  if(motion){
    c.strokeStyle=kind==='hurt'?'#e9a68e':'#e9c98c';c.lineWidth=1;
    const count=kind==='break'?8:6;
    for(let i=0;i<count;i++){
      const a=i*2.399+variant*.7,d=size*(.045+t*.26),length=size*.045*(1-t);
      c.beginPath();c.moveTo(x+Math.cos(a)*d,y+Math.sin(a)*d);c.lineTo(x+Math.cos(a)*(d+length),y+Math.sin(a)*(d+length));c.stroke();
    }
  }
  c.globalAlpha=fade*(1-progress);c.fillStyle='#fff5cf';c.beginPath();c.arc(x,y,kind==='break'?2:1.3,0,Math.PI*2);c.fill();c.restore();
}
