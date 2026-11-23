/** Multi-phase spell animation: gathering sigil, travelling shards, impact and fading motes. */
export function drawSpell(c:CanvasRenderingContext2D,kind:'ice'|'heal'|'guard',t:number,size:number,reduced=false){
 c.clearRect(0,0,size,size);const x=size/2,y=size/2,r=size*.31,fade=Math.min(1,t*9)*Math.min(1,(1-t)*3),p=reduced?.55:t;
 c.save();c.translate(x,y);c.globalAlpha=fade;c.lineWidth=1.2;c.strokeStyle=kind==='ice'?'#a8e8ff':'#b8f4c6';c.shadowColor=kind==='ice'?'#82ccff':'#a2e8ab';c.shadowBlur=8;
 if(kind==='guard'){
  c.strokeStyle='#b4e0ed';c.shadowColor='#6cabc2';c.lineWidth=2.2;
  c.scale(.78+p*.3,.78+p*.3);
  c.beginPath();
  c.moveTo(-r*.72,-r*.58);c.lineTo(0,-r*.81);c.lineTo(r*.72,-r*.58);c.lineTo(r*.67,r*.02);
  c.quadraticCurveTo(r*.55,r*.52,0,r*.83);c.quadraticCurveTo(-r*.55,r*.52,-r*.67,r*.02);
  c.closePath();c.fillStyle='#69abc059';c.fill();c.stroke();
 }else if(kind==='ice'){
  const gather=Math.max(0,1-p*3);c.save();c.rotate(p*.7);c.globalAlpha=fade*(.3+gather*.5);c.beginPath();c.arc(0,0,r*(.65+gather*.25),0,Math.PI*2);c.stroke();c.restore();
  for(let i=0;i<7;i++){const angle=i*Math.PI*2/7+.25,d=p<.4?r*(1-p/.4):r*(p-.4)*.7;const a=angle+(p<.4?p*.2:0);c.save();c.rotate(a);c.translate(d,0);c.rotate(-a-.5);const length=size*(.09+.08*(1-p));c.fillStyle=i%2?'#9bdbf5aa':'#e7faffdd';c.beginPath();c.moveTo(0,-length);c.lineTo(length*.24,0);c.lineTo(0,length*.5);c.lineTo(-length*.24,0);c.closePath();c.fill();c.restore();}
  if(p>.27){c.globalAlpha=fade*Math.max(0,1-(p-.27)*2);c.lineWidth=2;c.beginPath();c.arc(0,0,r*(p-.27)*2.2,0,Math.PI*2);c.stroke();for(let i=0;i<6;i++){c.save();c.rotate(i*Math.PI/3);c.beginPath();c.moveTo(0,-r*.6);c.lineTo(0,r*.6);c.stroke();c.restore();}}
 }else{
  c.save();c.scale(1,.35);for(let j=0;j<2;j++){c.globalAlpha=fade*(.5-j*.15);c.beginPath();c.arc(0,0,r*(.7+p*.4)+j*8,0,Math.PI*2);c.stroke();}c.restore();
  for(let i=0;i<12;i++){const a=i*2.399+p*.5,d=r*(.25+(i%4)*.2),lift=(p+i/12)%1;c.globalAlpha=fade*(1-lift);const px=Math.cos(a)*d,py=Math.sin(a)*d*.3-lift*r;c.beginPath();c.moveTo(px-3,py);c.lineTo(px+3,py);c.moveTo(px,py-6);c.lineTo(px,py+6);c.stroke();}
  c.globalAlpha=fade*(1-p);c.strokeStyle='#edffe7';c.lineWidth=3;c.beginPath();c.moveTo(0,-r*.35);c.lineTo(0,r*.1);c.moveTo(-r*.2,-r*.12);c.lineTo(r*.2,-r*.12);c.stroke();
 }c.restore();
}
