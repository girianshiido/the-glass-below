/** Deterministic, locally generated masonry; no texture downloads. */
export function makeStone(floor=false){
 const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d')!;
 let seed=floor?942:217;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 x.fillStyle='#101c20';x.fillRect(0,0,512,512);
 const h=floor?256:128,w=256;
 for(let row=0;row<512/h;row++)for(let col=-1;col<3;col++){
  const l=col*w+(floor?0:row%2*w/2),t=row*h,v=random()*20;
  const g=x.createLinearGradient(l,t,l+w,t+h);g.addColorStop(0,`rgb(${68+v},${83+v},${85+v})`);g.addColorStop(.3,`rgb(${47+v},${62+v},${65+v})`);g.addColorStop(1,'#293a3e');x.fillStyle=g;x.fillRect(l+5,t+5,w-10,h-10);
  x.strokeStyle='#afbab02e';x.lineWidth=2;x.strokeRect(l+7,t+7,w-14,h-14);
  x.strokeStyle='#050e1599';x.lineWidth=4;x.beginPath();x.moveTo(l+7,t+h-7);x.lineTo(l+w-6,t+h-7);x.lineTo(l+w-6,t+6);x.stroke();
  for(let i=0;i<55;i++){const a=l+random()*w,b=t+random()*h;x.fillStyle=random()>.5?'#c6c7b00d':'#07171b24';x.fillRect(a,b,random()*22+2,random()*5+1);}
  if(random()>.25){let a=l+w*random();x.strokeStyle='#081a1f99';x.lineWidth=1.4;x.beginPath();x.moveTo(a,t+5);for(let j=1;j<6;j++){a+=(random()-.5)*28;x.lineTo(a,t+h*j/6);}x.stroke();}
 }
 // Fine stone grain, veining and mineral deposits remain visible up close.
 const data=x.getImageData(0,0,512,512);for(let i=0;i<data.data.length;i+=4){const n=(random()-.5)*19;for(let k=0;k<3;k++)data.data[i+k]+=n;}x.putImageData(data,0,0);
 if(floor){
  x.strokeStyle='#a9976359';x.lineWidth=3;x.strokeRect(23,23,466,466);x.strokeStyle='#081a1eb3';x.lineWidth=2;x.strokeRect(28,28,456,456);
  x.save();x.translate(256,256);x.rotate(Math.PI/4);x.strokeStyle='#a1b4a64d';x.lineWidth=4;x.strokeRect(-65,-65,130,130);x.strokeRect(-49,-49,98,98);x.restore();
 }else{
  // Humidity and moss collect at the base of each course, rather than a flat wall tint.
  for(let i=0;i<55;i++){const a=random()*512,b=random()*512;x.fillStyle='#375b4b16';x.beginPath();x.ellipse(a,b,random()*32+4,random()*8+2,0,0,Math.PI*2);x.fill();}
 }
 return c;
}
export function makeFlame(){
 const c=document.createElement('canvas');c.width=128;c.height=256;const x=c.getContext('2d')!;
 const g=x.createLinearGradient(0,245,0,15);g.addColorStop(0,'#ff5420');g.addColorStop(.4,'#ffa62e');g.addColorStop(.8,'#ffdf83');g.addColorStop(1,'#fff4d7');x.fillStyle=g;
 x.beginPath();x.moveTo(64,12);x.bezierCurveTo(104,83,42,83,98,159);x.bezierCurveTo(139,233,59,270,36,226);x.bezierCurveTo(3,167,74,133,64,12);x.fill();
 x.fillStyle='#fff4bd';x.beginPath();x.moveTo(62,126);x.bezierCurveTo(88,184,87,239,58,241);x.bezierCurveTo(28,235,60,186,62,126);x.fill();return c;
}
