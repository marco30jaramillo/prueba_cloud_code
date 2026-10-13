const fs=require('fs'),zlib=require('zlib');
// ---- geometría (misma lógica que isotipo.js, devolviendo polilíneas) ----
function geom(p){
  const {nb,tk,ticks,gap=3,perf=false}=p;
  const th=tk.deg*Math.PI/180,cos=Math.cos(th),sin=Math.sin(th);
  const R=(x,y)=>[tk.cx+x*cos+y*sin, tk.cy-x*sin+y*cos];
  const dist=(px,py)=>{const dx=px-tk.cx,dy=py-tk.cy;const lx=dx*cos-dy*sin,ly=dx*sin+dy*cos;return Math.hypot(Math.max(Math.abs(lx)-tk.w/2,0),Math.max(Math.abs(ly)-tk.h/2,0));};
  const {x0,y0,x1,y1,r}=nb;
  const P=[{t:'L',a:[x1-r,y1],b:[x0+r,y1]},{t:'A',c:[x0+r,y1-r],a0:90,a1:180},{t:'L',a:[x0,y1-r],b:[x0,y0+r]},{t:'A',c:[x0+r,y0+r],a0:180,a1:270},{t:'L',a:[x0+r,y0],b:[x1-r,y0]},{t:'A',c:[x1-r,y0+r],a0:270,a1:360},{t:'L',a:[x1,y0+r],b:[x1,y1-r]},{t:'A',c:[x1-r,y1-r],a0:0,a1:90}];
  const at=(pr,t)=>pr.t==='L'?[pr.a[0]+(pr.b[0]-pr.a[0])*t,pr.a[1]+(pr.b[1]-pr.a[1])*t]:(a=>[pr.c[0]+r*Math.cos(a),pr.c[1]+r*Math.sin(a)])((pr.a0+(pr.a1-pr.a0)*t)*Math.PI/180);
  const polys=[];let cur=null;
  P.forEach(pr=>{for(let i=0;i<=60;i++){const t=i/60,pt=at(pr,t),v=dist(pt[0],pt[1])>=gap;if(v){if(!cur){cur=[];polys.push(cur);}cur.push(pt);}else cur=null;}});
  (ticks||[]).forEach(y=>{const a=[x0-2,y],b=[x0+2,y];if(dist(a[0],a[1])>=gap&&dist(b[0],b[1])>=gap)polys.push([a,b]);});
  const W=tk.w/2,H=tk.h/2,rc=1,n=tk.n,L=[];
  const arc=(cx,cy,rr,a0,a1)=>{for(let i=0;i<=40;i++){const a=(a0+(a1-a0)*i/40)*Math.PI/180;L.push([cx+rr*Math.cos(a),cy+rr*Math.sin(a)]);}};
  L.push([-W+rc,-H],[W-rc,-H]);arc(W-rc,-H+rc,rc,-90,0);L.push([W,-n]);arc(W,0,n,-90,-270);L.push([W,H-rc]);arc(W-rc,H-rc,rc,0,90);L.push([-W+rc,H]);arc(-W+rc,H-rc,rc,90,180);L.push([-W,n]);arc(-W,0,n,90,-90);L.push([-W,-H+rc]);arc(-W+rc,-H+rc,rc,180,270);L.push([-W+rc,-H]);
  polys.push(L.map(([x,y])=>R(x,y)));
  if(perf){const px=-W+4;const arr=[];for(let k=0;k<=1;k+=0.5){const y=-H+0.9+(2*H-1.8)*k;arr.push(R(px,y));}arr.forEach(q=>polys.push([q,q]));}
  return polys;
}
const segs=polys=>{const s=[];polys.forEach(pl=>{for(let i=0;i<pl.length-1;i++)s.push([pl[i][0],pl[i][1],pl[i+1][0],pl[i+1][1]]);if(pl.length===1)s.push([pl[0][0],pl[0][1],pl[0][0],pl[0][1]]);});return s;};
const d2=(px,py,[ax,ay,bx,by])=>{const vx=bx-ax,vy=by-ay,l=vx*vx+vy*vy;let t=l?((px-ax)*vx+(py-ay)*vy)/l:0;t=Math.max(0,Math.min(1,t));const dx=px-(ax+t*vx),dy=py-(ay+t*vy);return dx*dx+dy*dy;};
function cover(S,size,ss){const out=new Float32Array(size*size);const u=24/size;for(let y=0;y<size;y++)for(let x=0;x<size;x++){let c=0;for(let j=0;j<ss;j++)for(let i=0;i<ss;i++){const px=(x+(i+.5)/ss)*u,py=(y+(j+.5)/ss)*u;let hit=false;for(const s of S){if(d2(px,py,s)<=1){hit=true;break;}}if(hit)c++;}out[y*size+x]=c/(ss*ss);}return out;}
// ---- PNG ----
const crcT=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
const crc=b=>{let c=0xffffffff;for(const x of b)c=crcT[(c^x)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
const chunk=(ty,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(ty),d]);const c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([l,td,c]);};
function png(w,h,rgb){const raw=Buffer.alloc((w*3+1)*h);for(let y=0;y<h;y++){raw[y*(w*3+1)]=0;rgb.copy(raw,y*(w*3+1)+1,y*w*3,(y+1)*w*3);}const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=2;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);}
module.exports={geom,segs,cover,png};
if(require.main===module){
  const variants=require(process.argv[2]);
  const keys=Object.keys(variants),big=240,small=24,z=6,pad=16;
  const cellW=big+pad, W=cellW*keys.length+pad, H=big+pad*3+small*z;
  const img=Buffer.alloc(W*H*3,255);
  const put=(ox,oy,cv,size,scale,ink=[37,99,235])=>{for(let y=0;y<size*scale;y++)for(let x=0;x<size*scale;x++){const c=cv[Math.floor(y/scale)*size+Math.floor(x/scale)];if(c>0){const o=((oy+y)*W+ox+x)*3;for(let k=0;k<3;k++)img[o+k]=Math.round(255-(255-ink[k])*c);}}};
  keys.forEach((k,i)=>{const S=segs(geom(variants[k]));put(pad+i*cellW,pad,cover(S,big,2),big,1);put(pad+i*cellW,pad*2+big,cover(S,small,6),small,z);});
  fs.writeFileSync(process.argv[3],png(W,H,img));
}
