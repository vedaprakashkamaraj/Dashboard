// Background copied from the portfolio (webs, hanging spider, dots, city skyline). Static, no user data.
(() => {
const $ = s => document.getElementById(s.replace('#', ''));
function webPaths(cx,cy,R,a0,a1,N,rings,full){
 const pt=(r,a)=>[(cx+Math.cos(a)*r).toFixed(1),(cy+Math.sin(a)*r).toFixed(1)],cnt=full?N:N+1,st=(a1-a0)/N;let d='';
 for(let i=0;i<cnt;i++){const a=a0+i*st;d+=`M${cx},${cy} L${pt(R,a).join(',')} `}
 for(let k=1;k<=rings;k++){const r=R*k/rings;for(let i=0;i<N;i++){const a=a0+i*st,b=a+st,m=(a+b)/2,c=pt(r*Math.cos(st/2)*.72,m);d+=`M${pt(r,a).join(',')} Q${c.join(',')} ${pt(r,b).join(',')} `}}
 return d}
const webSvg=(vb,d,sw)=>`<svg viewBox="0 0 ${vb} ${vb}" aria-hidden="true"><path d="${d}" fill="none" stroke="#cfe0ff" stroke-width="${sw}" stroke-linecap="round"/></svg>`;
const legs=(s)=>[[-4,0,-14,-8,-22,2],[-5,3,-16,0,-24,12],[-5,6,-15,12,-21,24],[-4,9,-12,18,-16,30]].map(([a,b,c,d,e,f])=>`<path d="M${s*a},${b} L${s*c},${d} L${s*e},${f}" fill="none" stroke="#ff3b4a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
$('#gweb').innerHTML=webSvg(360,webPaths(360,0,360,Math.PI/2,Math.PI,6,8,false),1);
$('#gspi').innerHTML=`<svg viewBox="0 0 60 150" aria-hidden="true"><line x1="30" y1="0" x2="30" y2="70" stroke="#cfe0ff" stroke-opacity=".7" stroke-width="1.1"><animate attributeName="y2" values="70;105;70" dur="6s" repeatCount="indefinite"/></line>
 <g transform="translate(30,70)"><animateTransform attributeName="transform" type="translate" values="30 70;30 105;30 70" dur="6s" repeatCount="indefinite"/><g transform="scale(.8)">${legs(1)}${legs(-1)}
 <ellipse cx="0" cy="9" rx="8" ry="10" fill="#1a0d12" stroke="#ff3b4a" stroke-width="1.5"/><circle cx="0" cy="-5" r="5" fill="#1a0d12" stroke="#ff3b4a" stroke-width="1.5"/><circle cx="-2" cy="-6.5" r="1.2" fill="#fff"/><circle cx="2" cy="-6.5" r="1.2" fill="#fff"/><path d="M-2.5,6 L2.5,6 L0,10 L2.5,14 L-2.5,14 L0,10 Z" fill="#ff3b4a"/></g></g></svg>`;

function cityBg(){let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
 let out='<svg viewBox="0 0 1600 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs><linearGradient id="hbs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff3b4a"/><stop offset="1" stop-color="#3b6bff"/></linearGradient></defs><circle cx="1180" cy="230" r="150" fill="url(#hbs)" opacity=".28"/>';
 [['#0e1226',60,150],['#080a14',90,250]].forEach(([fill,minH,maxH],layer)=>{let x=layer?-20:-60;
  while(x<1620){const w=40+rnd()*70,h=minH+rnd()*(maxH-minH);
   out+=`<rect x="${x.toFixed(0)}" y="${(300-h).toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="${fill}"/>`;
   if(layer&&rnd()>.5)out+=`<rect x="${(x+w/2-1).toFixed(0)}" y="${(300-h-24).toFixed(0)}" width="2" height="24" fill="${fill}"/>`;
   if(layer)for(let wy=300-h+12;wy<292;wy+=16)for(let wx=x+8;wx<x+w-8;wx+=14)if(rnd()>.8)out+=`<rect x="${wx.toFixed(0)}" y="${wy.toFixed(0)}" width="4" height="6" fill="${rnd()>.5?'#cfe0ff':'#ff3b4a'}" opacity=".55"/>`;
   x+=w+rnd()*8}});
 return out+'</svg>'}
$('#hbg').innerHTML='<div class="hb-glow"></div><div class="hb-dots"></div><div class="hb-web">'+webSvg(360,webPaths(0,0,360,0,Math.PI/2,6,8,false),1)+'</div><div class="hb-city">'+cityBg()+'</div>';
})();
