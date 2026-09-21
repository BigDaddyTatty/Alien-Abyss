const c=document.getElementById('game'),ctx=c.getContext('2d'),rc=document.getElementById('radarCanvas'),rctx=rc.getContext('2d');
let W,H,dpr,player,enemies=[],particles=[],bubbles=[],game='menu',last=0,cam={x:0,y:1000},input={x:0,y:0,active:false,dash:false},saveKey='alienAbyssSaveV1';

const biomes=[
 {name:'Shallow Reef',a:0,b:4000,bg:'#063b50',fog:'rgba(3,60,85,.28)'},
 {name:'Crystal Caverns',a:4000,b:10000,bg:'#0a1830',fog:'rgba(8,17,38,.5)'},
 {name:'The Abyss',a:10000,b:20000,bg:'#02060d',fog:'rgba(1,3,10,.72)'}
];
const forms=[
 {level:1,name:'Larval',size:18,speed:220,hp:50,color:'#35dca0',glow:'#28e8c8'},
 {level:3,name:'Hunter',size:28,speed:255,hp:100,color:'#16a8e8',glow:'#3de7ff'},
 {level:5,name:'Stalker',size:43,speed:285,hp:220,color:'#8656ee',glow:'#cf7dff'},
 {level:7,name:'Abyssal',size:70,speed:320,hp:500,color:'#b51d70',glow:'#ff5ac8'},
 {level:10,name:'Leviathan',size:115,speed:350,hp:1200,color:'#101724',glow:'#ff405f'}
];
const species=[
 ['Silver Minnow',10,5,'#b9d1dc',0,3000,1],['Reef Fish',15,8,'#38bdf8',0,4500,1],
 ['Alien Shrimp',13,12,'#f472b6',1000,6000,1],['Crystal Crab',23,25,'#8b8cf5',3000,9000,2],
 ['Glow Eel',20,35,'#35d39b',3000,10000,2],['Razor Fish',27,45,'#a8b5c4',2000,8500,2],
 ['Void Piranha',37,80,'#ef4444',6000,15000,3],['Deep Eel',33,100,'#6333a9',7000,18000,3],
 ['Abyss Crawler',48,120,'#2352a0',8000,20000,3],['Terror Fish',68,250,'#454550',10000,20000,4],
 ['Abyss Stalker',78,350,'#172c62',12000,20000,4],['Leviathan',150,1000,'#11131a',15000,25000,5]
];

function resize(){dpr=Math.min(2,devicePixelRatio||1);W=innerWidth;H=innerHeight;c.width=W*dpr;c.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}addEventListener('resize',resize);resize();
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function lerp(a,b,t){return a+(b-a)*t}
function D(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function biome(y){return biomes.find(b=>y>=b.a&&y<=b.b)||biomes[2]}
function form(){let f=forms[0];for(const x of forms)if(player.level>=x.level)f=x;return f}
function save(){if(!player)return;localStorage.setItem(saveKey,JSON.stringify({level:player.level,bio:player.bio,score:player.score,x:player.x,y:player.y}))}
function load(){try{return JSON.parse(localStorage.getItem(saveKey))}catch(e){return null}}
function clearSave(){localStorage.removeItem(saveKey)}

class Player{
 constructor(data){this.x=data?.x??0;this.y=data?.y??1000;this.vx=0;this.vy=0;this.level=data?.level??1;this.bio=data?.bio??0;this.score=data?.score??0;this.hp=1;this.updateForm()}
 updateForm(){const f=form();this.f=f;this.size=f.size+(this.level-f.level)*2;this.speed=f.speed+(this.level-f.level)*4;this.maxHp=f.hp+this.level*12;this.hp=this.maxHp;this.need=Math.floor(30*Math.pow(1.55,this.level-1))}
 update(dt){
  if(input.active){let a=Math.atan2(input.y-this.y,input.x-this.x),sp=this.speed*(input.dash?1.9:1);this.vx+=Math.cos(a)*sp*5*dt;this.vy+=Math.sin(a)*sp*5*dt}
  let max=this.speed*(input.dash?1.9:1),s=Math.hypot(this.vx,this.vy);if(s>max){this.vx*=max/s;this.vy*=max/s}
  this.x+=this.vx*dt;this.y+=this.vy*dt;this.vx*=.93;this.vy*=.93;this.y=clamp(this.y,60,24000)
 }
 eat(e){this.bio+=e.bio;this.score+=e.bio*10;particlesBurst(e.x,e.y,e.color,18);if(this.bio>=this.need){this.bio-=this.need;this.level++;const old=this.f.name;this.updateForm();if(this.f.name!==old){game='evo';document.getElementById('evoName').textContent=this.f.name+' Form Unlocked';document.getElementById('evo').classList.remove('hidden')}}save()}
 draw(){drawCreature(this.x,this.y,this.size,this.f.color,this.f.glow,1)}
}

class Enemy{
 constructor(x,y,s){this.x=x;this.y=y;this.vx=0;this.vy=0;this.s=s;this.size=s[1];this.color=s[3];this.bio=s[2];this.tier=s[6];this.a=Math.random()*6.28;this.timer=Math.random()*3;this.phase=Math.random()*6.28}
 update(dt){
  let d=Math.hypot(this.x-player.x,this.y-player.y),target=this.a,mod=.5;
  if(d<650){if(this.size>player.size*1.12){target=Math.atan2(player.y-this.y,player.x-this.x);mod=1.15}else if(this.size<player.size*.88){target=Math.atan2(this.y-player.y,this.x-player.x);mod=1.25}}
  this.timer-=dt;if(this.timer<=0){this.a+=(Math.random()-.5)*1.8;this.timer=1+Math.random()*3}
  if(d<650&&this.size>player.size*1.12)target=Math.atan2(player.y-this.y,player.x-this.x)
  let diff=Math.atan2(Math.sin(target),Math.cos(target));this.vx+=Math.cos(diff)*90*mod*dt;this.vy+=Math.sin(diff)*90*mod*dt;
  let sp=Math.hypot(this.vx,this.vy),mx=90+this.tier*25;if(sp>mx){this.vx*=mx/sp;this.vy*=mx/sp}
  this.x+=this.vx*dt;this.y+=this.vy*dt;this.vx*=.985;this.vy*=.985;this.phase+=dt*3;
  this.y=clamp(this.y,20,24000)
 }
 draw(){drawCreature(this.x,this.y,this.size,this.color,this.tier>=3?'#6bc7ff':null,.75)}
}

function drawCreature(x,y,size,color,glow,scale){
 ctx.save();ctx.translate(x,y);let ang=Math.atan2(player.y-y,player.x-x);if(Math.abs(x-player.x)+Math.abs(y-player.y)<1)ang=Math.atan2(player.vy,player.vx);ctx.rotate(ang);
 if(glow){ctx.shadowBlur=size*.7;ctx.shadowColor=glow}
 ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(0,0,size*1.35,size*.72,0,0,Math.PI*2);ctx.fill();
 ctx.shadowBlur=0;
 ctx.fillStyle='rgba(255,255,255,.13)';ctx.beginPath();ctx.ellipse(-size*.3,-size*.22,size*.48,size*.16,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle=glow||'#071018';ctx.beginPath();ctx.arc(size*.55,-size*.25,size*.14,0,7);ctx.arc(size*.55,size*.25,size*.14,0,7);ctx.fill();
 ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.moveTo(-size*1.2,0);ctx.lineTo(-size*1.8,-size*.35);ctx.lineTo(-size*1.8,size*.35);ctx.closePath();ctx.fill();
 ctx.restore()
}
function particlesBurst(x,y,color,n){for(let i=0;i<n;i++){let a=Math.random()*6.28,v=40+Math.random()*190;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:1,c:color,s:2+Math.random()*4})}}
function spawn(){if(enemies.length>=42)return;let a=Math.random()*6.28,d=Math.max(W,H)*.55+300+Math.random()*600,x=player.x+Math.cos(a)*d,y=player.y+Math.sin(a)*d;if(y<20||y>24000)return;let valid=species.filter(s=>y>=s[4]&&y<=s[5]);if(valid.length)enemies.push(new Enemy(x,y,valid[Math.floor(Math.random()*valid.length)]))}
function env(){if(bubbles.length>150)return;for(let i=0;i<3;i++)bubbles.push({x:cam.x+(Math.random()-.5)*(W+1200),y:cam.y+(Math.random()-.5)*(H+1200),r:1+Math.random()*4,v:-8-Math.random()*18})}
function collide(){for(let i=enemies.length-1;i>=0;i--){let e=enemies[i],d=D(player,e);if(d<player.size+e.size){if(player.size>e.size*1.12){player.eat(e);enemies.splice(i,1)}else if(e.size>player.size*1.12){player.hp-=e.tier*12;particlesBurst(player.x,player.y,'#ff405f',10);let a=Math.atan2(player.y-e.y,player.x-e.x);player.vx+=Math.cos(a)*220;player.vy+=Math.sin(a)*220;if(player.hp<=0)die()}else{let a=Math.atan2(player.y-e.y,player.x-e.x);player.vx+=Math.cos(a)*100;player.vx+=Math.cos(a)*100}}}}
function die(){game='over';save();document.getElementById('final').textContent=`${player.f.name} • Level ${player.level} • Score ${Math.floor(player.score)}`;document.getElementById('over').classList.remove('hidden')}
function update(dt){if(game!=='play')return;player.update(dt);for(const e of enemies)e.update(dt);collide();for(let i=particles.length-1;i>=0;i--){let p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.97;p.vy*=.97;p.l-=dt;if(p.l<=0)particles.splice(i,1)}for(const b of bubbles){b.y+=b.v*dt;if(b.y<cam.y-H)b.y=cam.y+H}cam.x=lerp(cam.x,player.x,Math.min(1,dt*4));cam.y=lerp(cam.y,player.y,Math.min(1,dt*4));for(let i=0;i<2;i++)spawn();env();hud()}
function hud(){let f=player.f;document.getElementById('level').textContent='LVL '+player.level;document.getElementById('form').textContent=f.name;document.getElementById('score').textContent=Math.floor(player.score);document.getElementById('depth').textContent='Depth: '+Math.floor(player.y)+'m';document.getElementById('biome').textContent=biome(player.y).name.toUpperCase();document.getElementById('bio').style.width=Math.min(100,player.bio/player.need*100)+'%';document.getElementById('biotxt').textContent=Math.floor(player.bio)+' / '+player.need+' BIO';document.getElementById('hp').style.width=Math.max(0,player.hp/player.maxHp*100)+'%'}
function draw(){let b=biome(cam.y);ctx.fillStyle=b.bg;ctx.fillRect(0,0,W,H);ctx.save();ctx.translate(W/2-cam.x,H/2-cam.y);
 for(const q of bubbles){if(Math.abs(q.x-cam.x)<W&&Math.abs(q.y-cam.y)<H){ctx.strokeStyle='rgba(180,240,255,.16)';ctx.beginPath();ctx.arc(q.x,q.y,q.r,0,7);ctx.stroke()}}
 for(const e of enemies)if(Math.abs(e.x-cam.x)<W/2+180&&Math.abs(e.y-cam.y)<H/2+180)e.draw();if(player&&game!=='menu')player.draw();
 for(const p of particles){ctx.globalAlpha=p.l;ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,p.s,0,7);ctx.fill()}ctx.globalAlpha=1;ctx.restore();
 let fog=b.fog;ctx.fillStyle=fog;ctx.fillRect(0,0,W,H);let g=ctx.createRadialGradient(W/2,H/2,H*.12,W/2,H/2,H*.85);g.addColorStop(0,'transparent');g.addColorStop(1,'rgba(0,0,0,.72)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);if(game==='play')radar()}
function radar(){rctx.clearRect(0,0,132,132);rctx.strokeStyle='rgba(0,220,255,.12)';rctx.beginPath();rctx.arc(66,66,44,0,7);rctx.stroke();rctx.fillStyle='#fff';rctx.beginPath();rctx.arc(66,66,3,0,7);rctx.fill();for(const e of enemies){let dx=e.x-player.x,dy=e.y-player.y,d=Math.hypot(dx,dy),range=1800;if(d<range){rctx.fillStyle=e.size>player.size*1.12?'#ff4055':e.size<player.size*.88?'#41e89a':'#a8b8c4';rctx.beginPath();rctx.arc(66+dx/range*60,66+dy/range*60,2,0,7);rctx.fill()}}}
function start(){
  try{
    let data=load();
    player=new Player(data);
    enemies=[];particles=[];bubbles=[];
    cam.x=player.x;cam.y=player.y;
    for(let i=0;i<25;i++)spawn();
    for(let i=0;i<70;i++)env();
    game='play';
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('over').classList.add('hidden');
    document.getElementById('evo').classList.add('hidden');
    document.getElementById('paused').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    hud();
  }catch(err){
    console.error('Alien Abyss start error:',err);
    alert('Alien Abyss could not start. Please reload the page.');
  }
}
window.__alienStart=function(){
  try {
    start();
  } catch(e) {
    console.error(e);
    alert("Could not start Alien Abyss. Try opening the HTML file directly in Safari or Chrome.");
  }
};
function mainMenu(){game='menu';document.getElementById('paused').classList.add('hidden');document.getElementById('hud').classList.add('hidden');document.getElementById('menu').classList.remove('hidden')}
function frame(t){let dt=Math.min(.05,(t-last)/1000||0);last=t;update(dt);draw();requestAnimationFrame(frame)}requestAnimationFrame(frame);

function setPointer(x,y){input.x=cam.x+(x-W/2);input.y=cam.y+(y-H/2);input.active=true}
addEventListener('pointermove',e=>setPointer(e.clientX,e.clientY));addEventListener('pointerdown',e=>{if(e.target===c)setPointer(e.clientX,e.clientY)});addEventListener('pointerup',()=>input.active=false);
addEventListener('keydown',e=>{if(e.code==='Space')input.dash=true;if(e.code==='Escape'&&game==='play')pause()});addEventListener('keyup',e=>{if(e.code==='Space')input.dash=false});
const dash=document.getElementById('dash');dash.addEventListener('pointerdown',e=>{e.preventDefault();input.dash=true});['pointerup','pointercancel','pointerleave'].forEach(x=>dash.addEventListener(x,()=>input.dash=false));
const startButton=document.getElementById('start');
startButton.addEventListener('pointerup',e=>{e.preventDefault();e.stopPropagation();window.__alienStart();});
startButton.addEventListener('touchend',e=>{e.preventDefault();e.stopPropagation();window.__alienStart();},{passive:false});
startButton.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();window.__alienStart();});
document.getElementById('retry').addEventListener('click',start);
document.getElementById('continue').addEventListener('click',()=>{document.getElementById('evo').classList.add('hidden');game='play';save()});
document.getElementById('pause').addEventListener('click',pause);
document.getElementById('resume').addEventListener('click',()=>{document.getElementById('paused').classList.add('hidden');game='play'});
document.getElementById('menuBtn').addEventListener('click',mainMenu);
function pause(){if(game!=='play')return;game='paused';document.getElementById('paused').classList.remove('hidden');save()}
