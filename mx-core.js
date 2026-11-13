/* ============================================================
   ЯДРО КАЛЬКУЛЯТОРОВ ПО МАТРИЦЕ СУДЬБЫ
   Версия 1.0 · сверено 02.09.2026

   Здесь только расчёты, геометрия диаграммы и самопроверки.
   Интерфейса нет: файл ничего не ищет в вёрстке и ничего не рисует
   сам, кроме диаграммы в переданный ему элемент.

   ПРАВИЛО: формулы в этом файле не меняются. Они сверены по трём
   источникам — контрольная дата 17.01.1989 из инструкции, разбор
   07.04.1991 с калькулятора beloesolnce.ru и гайд «Зоны и точки
   в матрице судьбы». При запуске файл сам себя проверяет и пишет
   результат в консоль браузера.

   Как пользоваться: подключить файл первым, дальше обращаться
   через window.MX — например MX.calculateMatrix(7, 4, 1991).
   В Tilda это отдельный блок T123 перед блоком с интерфейсом.
   ============================================================ */
window.MX = (function(){
"use strict";

/* ============ 1. КАНОН: свёртка и матрица ============ */
function reduce(n){
  while(n > 22) n = String(n).split('').reduce(function(s,d){return s + (+d);},0);
  return n === 0 ? 22 : n;
}

function calculateMatrix(day, month, year){
  var a = reduce(day);
  var b = reduce(month);
  var c = reduce(String(year).split('').reduce(function(s,d){return s+(+d);},0));
  var d = reduce(a + b + c);
  var e = reduce(a + b + c + d);
  var f = reduce(a + b);
  var g = reduce(b + c);
  var y = reduce(c + d);
  var k = reduce(a + d);
  return {a:a,b:b,c:c,d:d,e:e,f:f,g:g,y:y,k:k};
}

/* Родовые точки в углах.
   'center' — как на образце beloesolnce: угол + центр
   'sila'   — как записано в инструкции: угол + сила рода
   Меняется одной строкой.                                            */
var RODOVYE_MODE = 'center';

function extend(M){
  M.a1 = reduce(M.a + M.e); M.a2 = reduce(M.a + M.a1); M.a3 = reduce(M.a1 + M.e);
  M.b1 = reduce(M.b + M.e); M.b2 = reduce(M.b + M.b1); M.b3 = reduce(M.b1 + M.e);
  M.d1 = reduce(M.d + M.e); M.d2 = reduce(M.d + M.d1);
  M.c1 = reduce(M.c + M.e); M.c2 = reduce(M.c + M.c1);

  M.x  = reduce(M.d1 + M.c1);
  M.x1 = reduce(M.d1 + M.x);
  M.x2 = reduce(M.x  + M.c1);

  M.e1 = reduce(M.f + M.g + M.y + M.k);
  var base = (RODOVYE_MODE === 'center') ? M.e : M.e1;
  ['f','g','y','k'].forEach(function(key){
    var corner = M[key];
    var s1 = reduce(base + corner);
    M[key+'_s1'] = s1;
    M[key+'_s2'] = reduce(corner + s1);
  });

  M.h = reduce(M.b + M.d); M.j = reduce(M.a + M.c); M.m = reduce(M.h + M.j);
  M.n = reduce(M.f + M.y); M.t = reduce(M.g + M.k); M.z = reduce(M.n + M.t);
  M.s = reduce(M.m + M.z);
  /* контроль из гайда: 3-е предназначение может быть только 3,6,9,12,15,18,21 */
  M._ok = ([3,6,9,12,15,18,21].indexOf(M.s) !== -1);
  M.planet = reduce(M.z + M.s);
  M.inner = reduce(M.e + M.e1);
  return M;
}

/* Матрица пары: складываем одноимённые точки обеих матриц, дальше
   внутренняя структура считается теми же формулами, что и личная:
   I=Е+А, L=Е+Б, V=Е+В, H=Е+Г, X=H+V, T=H+X, Z=X+V. */
function pairMatrix(M1, M2){
  var P = {};
  ['a','b','c','d','e','f','g','y','k'].forEach(function(key){
    P[key] = reduce(M1[key] + M2[key]);
  });
  P._pair = true;
  return extend(P);
}

/* ============ 2. КАНОН: прогностика ============ */
function calculatePrognosis(M){
  var main=[{age:0,v:M.a},{age:10,v:M.f},{age:20,v:M.b},{age:30,v:M.g},
            {age:40,v:M.c},{age:50,v:M.y},{age:60,v:M.d},{age:70,v:M.k}];
  var all=[];
  for(var i=0;i<8;i++){
    var cur=main[i], next=main[(i+1)%8];
    all.push({from:cur.age,to:cur.age+1.25,value:cur.v,isMain:true});
    var mid=reduce(cur.v+next.v), sub1=reduce(cur.v+mid), sub3=reduce(mid+next.v);
    var subVals=[reduce(cur.v+sub1),sub1,reduce(sub1+mid),mid,reduce(mid+sub3),sub3,reduce(sub3+next.v)];
    for(var j=0;j<7;j++){var sf=cur.age+1.25*(j+1);all.push({from:sf,to:sf+1.25,value:subVals[j],isMain:false,isHalf:(j===3)});}
  }
  return all;
}

/* Подпись периода ЦЕЛЫМИ годами. 1,25 года = ровно 15 месяцев,
   поэтому десятичной арифметики по годам здесь нет вообще.        */
/* 'exact' — начало периода годами и месяцами: шкала идёт без пропусков.
   'years' — только целые года, как на белом солнце (тогда 4-5 и 9-10 выпадают,
             потому что в десятилетии 8 периодов, а годовых окон 10).           */
var LABEL_MODE = 'years';

function fmtAge(a){
  if(a % 5 === 0) return a + ' лет';
  var m = Math.round(a * 12);                /* 1,25 года = ровно 15 месяцев */
  return Math.floor(m / 12) + 'г ' + (m % 12) + 'м';
}
/* Лет 80, а периодов 64 — один к одному они не ложатся.
   Каждый целый год относим к периоду, внутри которого лежит его середина,
   и подписываем период всем доставшимся ему диапазоном лет. Тогда шкала
   идёт без пропусков, а подпись стоит на одном луче со своей энергией. */
var YEARS_BY_PERIOD = (function(){
  var map = [];
  for(var n = 0; n < 80; n++){
    var i = Math.floor((n + 0.5) / 1.25);
    if(!map[i]) map[i] = [n, n]; else map[i][1] = n;
  }
  return map;
})();
/* Подпись периода на кольце. Правило: всегда ровно один год, N-(N+1),
   по году, в котором период начинается. Двухлетних диапазонов быть не должно.
   Следствие: в каждом десятилетии два года остаются без подписи —
   периодов восемь, а годов десять. Так же устроено на beloesolnce.
   Все годы без исключения показывает таблица через yearByYear. */
function ringLabel(from){
  var y = Math.floor(from);
  return y + '-' + (y + 1);
}

function yearsOfPeriod(from){
  var r = YEARS_BY_PERIOD[Math.round(from / 1.25)];
  return r ? (r[0] + '-' + (r[1] + 1)) : '';
}

function periodLabel(p, mode){
  mode = mode || LABEL_MODE;
  if(p.from % 5 === 0) return p.from + ' лет';
  if(mode === 'years'){ var y = Math.floor(p.from); return y + '-' + (y + 1); }
  return fmtAge(p.from);
}
function periodRange(p){ return fmtAge(p.from) + ' \u2013 ' + fmtAge(p.to); }

/* Возраст целыми годами и месяцами */
function ageYM(birth, now){
  var y = now.getFullYear() - birth.getFullYear();
  var m = now.getMonth() - birth.getMonth();
  if(now.getDate() < birth.getDate()) m--;
  if(m < 0){ y--; m += 12; }
  return {y:y, m:m, months: y*12 + m};
}
function plural(n, one, few, many){
  var n10 = n % 10, n100 = n % 100;
  if(n10 === 1 && n100 !== 11) return one;
  if(n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
  return many;
}

/* ============ 3. Геометрия диаграммы ============ */
var CX = 300, CY = 300;
/* Тройки энергий собраны в плотную связку у своей крупной точки:
   зазор до неё 9 единиц, между собой 7. К центру остаётся свободное поле,
   как на образце. Доли получены из радиусов кругов.                     */
function WELL_T(){  return 0.4663; }   /* К и Л */
function WELL_T2(){ return 0.2856; }   /* белые круги за ними */
var PT = {
  A:[92,300], B:[300,92], V:[508,300], G:[300,508], D:[300,300],
  E:[153,153], J:[447,153], I:[447,447], Z:[153,447]
};
function lerp(p,q,t){ return [p[0]+(q[0]-p[0])*t, p[1]+(q[1]-p[1])*t]; }
function pol(r,deg){ var a=deg*Math.PI/180; return [CX + r*Math.cos(a), CY - r*Math.sin(a)]; }
function ang(age){ return 180 - (age/80)*360; }
function pc(v){ return (v/6).toFixed(3) + '%'; }

function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* ---- SVG каркаса ---- */
function svgFrame(M, showPrognosis, isPair){
  var s = '';
  var gold='#C6A15B', light='#D9C7A7', ink='#3E2B23';

  /* золотая палитра диаграммы */
  s += '<defs>'
     + '<radialGradient id="mxdGlow" cx="50%" cy="46%" r="54%">'
     +   '<stop offset="0%" stop-color="#FFFFFF" stop-opacity=".92"/>'
     +   '<stop offset="55%" stop-color="#F7ECD6" stop-opacity=".5"/>'
     +   '<stop offset="100%" stop-color="#EFE3D2" stop-opacity="0"/>'
     + '</radialGradient>'
     + '<linearGradient id="mxdGold" x1="0" y1="0" x2="1" y2="1">'
     +   '<stop offset="0%" stop-color="#E4CF9F"/><stop offset="45%" stop-color="#C6A15B"/>'
     +   '<stop offset="100%" stop-color="#A8823C"/>'
     + '</linearGradient>'
     + '</defs>';

  s += '<circle cx="300" cy="300" r="252" fill="url(#mxdGlow)"/>';
  s += '<circle class="mx-draw" cx="300" cy="300" r="226" fill="none" stroke="url(#mxdGold)" stroke-width="1.7" opacity=".95"/>';
  s += '<circle cx="300" cy="300" r="219" fill="none" stroke="'+gold+'" stroke-width=".7" opacity=".38"/>';
  s += '<circle cx="300" cy="300" r="163" fill="none" stroke="'+gold+'" stroke-width=".7" opacity=".3"/>';

  if(showPrognosis){
    /* светлая полоса, на которой лежат бусины арканов */
    s += '<circle cx="300" cy="300" r="290" fill="none" stroke="rgba(255,251,242,.72)" stroke-width="44"/>';
    s += '<circle cx="300" cy="300" r="290" fill="none" stroke="'+gold+'" stroke-width="44" opacity=".05"/>';
    s += '<circle cx="300" cy="300" r="268" fill="none" stroke="'+light+'" stroke-width=".9" opacity=".85"/>';
    s += '<circle cx="300" cy="300" r="312" fill="none" stroke="'+light+'" stroke-width=".9" opacity=".85"/>';
    s += '<circle cx="300" cy="300" r="376" fill="none" stroke="'+light+'" stroke-width=".8" stroke-dasharray="2 7" opacity=".6"/>';
  }

  /* ромб и квадрат — золотом */
  s += '<polygon class="mx-draw mx-draw-2" points="300,92 508,300 300,508 92,300" fill="none" stroke="url(#mxdGold)" stroke-width="1.5" opacity=".95"/>';
  s += '<polygon class="mx-draw mx-draw-2" points="153,153 447,153 447,447 153,447" fill="none" stroke="url(#mxdGold)" stroke-width="1.5" opacity=".95"/>';
  /* оси */
  s += '<line class="mx-draw mx-draw-3" x1="92" y1="300" x2="508" y2="300" stroke="'+gold+'" stroke-width="1" opacity=".6"/>';
  s += '<line class="mx-draw mx-draw-3" x1="300" y1="92" x2="300" y2="508" stroke="'+gold+'" stroke-width="1" opacity=".6"/>';
  /* родовые диагонали: Е-И мужская, Ж-З женская — приглушены, чтобы не спорить с золотом */
  s += '<line x1="153" y1="153" x2="447" y2="447" stroke="#8A96C2" stroke-width="1.1" opacity=".5"/>';
  s += '<line x1="447" y1="153" x2="153" y2="447" stroke="#C89A8C" stroke-width="1.1" opacity=".5"/>';
  /* Линия благополучия соединяет точки К и Л. Координаты берём из тех же
     долей, что и сами точки, иначе линия проходит мимо их центров. */
  var wR = 208 * (1 - WELL_T());
  var wK = [300, 300 + wR], wL = [300 + wR, 300];
  s += '<line x1="'+(wK[0]-11.3).toFixed(1)+'" y1="'+(wK[1]+11.3).toFixed(1)+'"'
     + ' x2="'+(wL[0]+11.3).toFixed(1)+'" y2="'+(wL[1]-11.3).toFixed(1)+'"'
     + ' stroke="'+gold+'" stroke-width="1.3" stroke-dasharray="5 4" opacity=".9"/>';

  /* золотые точки на пересечениях ромба и квадрата */
  [[361,153],[447,239],[447,361],[361,447],[239,447],[153,361],[153,239],[239,153]].forEach(function(q){
    s += '<circle cx="'+q[0]+'" cy="'+q[1]+'" r="2.7" fill="url(#mxdGold)" opacity=".9"/>';
  });
  /* искры внутри поля */
  [[300,196,.42],[196,300,.36],[404,300,.36],[300,404,.3]].forEach(function(q){
    s += '<path transform="translate('+(q[0]-6)+','+(q[1]-6)+') scale(.5)" fill="'+gold+'" opacity="'+q[2]
       + '" d="M12 0c.7 6.4 4.9 10.6 12 12-7.1 1.4-11.3 5.6-12 12-.7-6.4-4.9-10.6-12-12C7.1 10.6 11.3 6.4 12 0z"/>';
  });

  /* В матрице пары названия точек не подписываем — только цифры. */
  var letters = isPair ? [] : [
    {p:'A', t:'А', age:0},  {p:'E', t:'Е', age:10}, {p:'B', t:'Б', age:20}, {p:'J', t:'Ж', age:30},
    {p:'V', t:'В', age:40}, {p:'I', t:'И', age:50}, {p:'G', t:'Г', age:60}, {p:'Z', t:'З', age:70}
  ];
  letters.forEach(function(L){
    var node = PT[L.p];
    var dx = node[0]-CX, dy = node[1]-CY;
    var len = Math.sqrt(dx*dx+dy*dy);
    /* 256 — внешний край крупных кругов 242, внутренний край кольца соляра 268 */
    var r = 256;
    var x = CX + dx/len*r, y = CY + dy/len*r;
    var anchor = dx > 40 ? 'start' : (dx < -40 ? 'end' : 'middle');
    s += '<text x="'+x.toFixed(1)+'" y="'+(y+5).toFixed(1)+'" text-anchor="middle"'
       + ' font-family="Montserrat,sans-serif" font-size="14.5" font-weight="600" letter-spacing=".4"'
       + ' fill="#5E1A1E" style="paint-order:stroke;stroke:#F6F0E5;stroke-width:4.5px;stroke-linejoin:round">'+L.t+'</text>';

  });
  s += '<text x="300" y="336" text-anchor="middle" font-family="Montserrat,sans-serif" font-size="12" font-weight="600" fill="#5E1A1E" style="paint-order:stroke;stroke:#FBF6EE;stroke-width:5px;stroke-linejoin:round">Д</text>';

  /* прогностика — только внутри SVG.
     Внутреннее кольцо: арканы бусинами. Внешнее: годы, развёрнутые по радиусу —
     каждая подпись читается вдоль своего луча и не может наехать на соседнюю. */
  if(showPrognosis){
    var periods = calculatePrognosis(M);
    s += '<g class="mx-ring-g">';

    /* Шаг между бусинами на радиусе 290 равен 28,5 единицы,
       поэтому радиусы подобраны так, чтобы соседние бусины не соприкасались. */
    periods.forEach(function(p){
      var aBead = ang(p.from);
      var v = pol(290, aBead);
      var r, fill, stroke, fg, fs;

      /* Засечка и возраст стоят на том же луче, что и бусина, поэтому каждый
         возраст оказывается ровно напротив своей энергии. Чем мельче бусина,
         тем короче и бледнее засечка. */
      var gFrom, gTo, gCol, gW, gOp, gFs, gFw, gFill;
      if(p.isMain){      gFrom=307; gTo=334; gCol=gold;  gW=1.5; gOp='.9';  gFs=11;  gFw='700'; gFill='#5E1A1E'; }
      else if(p.isHalf){ gFrom=305; gTo=330; gCol=gold;  gW=1.0; gOp='.7';  gFs=10;  gFw='600'; gFill='#A8823C'; }
      else {             gFrom=303; gTo=323; gCol=light; gW=.5;  gOp='.32'; gFs=8.6; gFw='400'; gFill='#A2947F'; }
      var g1 = pol(gFrom, aBead), g2 = pol(gTo, aBead);
      s += '<line x1="'+g1[0].toFixed(1)+'" y1="'+g1[1].toFixed(1)+'" x2="'+g2[0].toFixed(1)+'" y2="'+g2[1].toFixed(1)
         + '" stroke="'+gCol+'" stroke-width="'+gW+'" opacity="'+gOp+'"/>';

      var flipY = Math.cos(aBead*Math.PI/180) < 0;
      var rotY = (flipY ? -aBead + 180 : -aBead).toFixed(2);
      var ly = pol(340, aBead);
      s += '<text x="'+ly[0].toFixed(1)+'" y="'+ly[1].toFixed(1)+'" text-anchor="'+(flipY?'end':'start')+'"'
         + ' dominant-baseline="middle" transform="rotate('+rotY+' '+ly[0].toFixed(1)+' '+ly[1].toFixed(1)+')"'
         + ' font-family="Montserrat,sans-serif" font-size="'+gFs+'" font-weight="'+gFw+'"'
         + ' letter-spacing=".2" fill="'+gFill+'">'+ringLabel(p.from)+'</text>';

      if(p.isMain){        r=16;   fill='#5A1A1E'; stroke='#C6A15B'; fg='#F3E3C6'; fs=17; }
      else if(p.isHalf){   r=13.5; fill='#E5D5B4'; stroke='#C0A473'; fg='#4A3A2C'; fs=15; }
      else {               r=11.5; fill='#FFFDF8'; stroke=light;     fg='#3A2A22'; fs=13.5; }

      s += '<circle cx="'+v[0].toFixed(1)+'" cy="'+v[1].toFixed(1)+'" r="'+r+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width=".9"/>';
      s += '<text x="'+v[0].toFixed(1)+'" y="'+(v[1]+fs*0.35).toFixed(1)+'" text-anchor="middle"'
         + ' font-family="Playfair Display,serif" font-size="'+fs+'" font-weight="600" fill="'+fg+'">'+p.value+'</text>';
    });
    s += '</g>';
  }
  var box = showPrognosis ? '-100 -100 800 800' : '-60 -60 720 720';
  return '<svg viewBox="'+box+'" xmlns="http://www.w3.org/2000/svg">' + s + '</svg>';
}

/* ---- узлы поверх SVG, позиции в процентах ---- */
function node(cls, coord, val){
  /* Задержка растёт с удалением от центра: круги проявляются волной наружу.
     208 — радиус крупных точек, дальше них узлов нет. */
  var d = Math.sqrt(Math.pow(coord[0]-300,2) + Math.pow(coord[1]-300,2));
  var delay = (0.30 + Math.min(d,208)/208 * 0.34).toFixed(3);
  return '<div class="mx-node '+cls+'" style="left:'+pc(coord[0])+';top:'+pc(coord[1])
       + ';--mx-d:'+delay+'s">'+val+'</div>';
}

function plane(M, isPair){
  var h = '';
  var A=PT.A,B=PT.B,V=PT.V,G=PT.G,D=PT.D,E=PT.E,J=PT.J,I=PT.I,Z=PT.Z;

  /* внутренние точки осей */
  /* Круги убывают от А, Б, В, Г к центру: 4.6 -> 3.9 -> 3.0 cqw.
     Доли посчитаны от их радиусов так, чтобы между любой парой соседей
     оставался одинаковый зазор ~13 единиц, включая зазор до центра и до
     крупного круга. Поэтому Анахата ни к чему не прилипает.            */
  /* Анахата стоит ровно посередине между центром и соседней энергией:
     зазор с обеих сторон одинаковый, 19.7 единицы. */
  var a2=lerp(A,D,.2856), a1=lerp(A,D,.4663), a3=lerp(A,D,.6717);
  var b2=lerp(B,D,.2856), b1=lerp(B,D,.4663), b3=lerp(B,D,.6717);
  var tW = WELL_T(), tW2 = WELL_T2();
  var d2=lerp(G,D,tW2), d1=lerp(G,D,tW);
  var c2=lerp(V,D,tW2), c1=lerp(V,D,tW);

  /* линия благополучия */
  var xP  = lerp(d1,c1,.5);
  var x1P = lerp(d1,xP,.5);
  var x2P = lerp(xP,c1,.5);

  h += node('mx-n-i', a2, M.a2) + node('mx-n-i2', a1, M.a1);
  h += node('mx-n-i', b2, M.b2) + node('mx-n-i2', b1, M.b1);
  /* точки Анахаты и родовые цепочки есть только в личной матрице */
  if(!isPair) h += node('mx-n-g', a3, M.a3) + node('mx-n-g', b3, M.b3);
  h += node('mx-n-i', d2, M.d2) + node('mx-n-i2', d1, M.d1);
  h += node('mx-n-i', c2, M.c2) + node('mx-n-i2', c1, M.c1);

  h += node('mx-n-m', xP, M.x) + node('mx-n-w', x1P, M.x1) + node('mx-n-w', x2P, M.x2);

  /* родовые цепочки в углах */
  if(!isPair) [['E','f'],['J','g'],['I','y'],['Z','k']].forEach(function(pair){
    var corner = PT[pair[0]];
    h += node('mx-n-r',  lerp(corner,D,.2648), M[pair[1]+'_s2']);
    h += node('mx-n-r2', lerp(corner,D,.4283), M[pair[1]+'_s1']);
  });

  /* углы и главные точки */
  h += node('mx-n-k', E, M.f) + node('mx-n-k', J, M.g) + node('mx-n-k', I, M.y) + node('mx-n-k', Z, M.k);
  h += node('mx-n-o', A, M.a) + node('mx-n-o', B, M.b) + node('mx-n-o', V, M.c) + node('mx-n-o', G, M.d);
  h += node('mx-n-c', D, M.e);

  /* значки денег и сердца на линии благополучия + М/Ж у нижних углов */
  /* буквы точек по гайду: К = Г+Д, Л = Д+В, М = К+Л, Н = К+М, О = М+Л */
  function ltr(x, y, t){
    return '<div class="mx-ltr" style="left:'+pc(x)+';top:'+pc(y)+'">'+t+'</div>';
  }
  /* м, н, о подписываются по нормали к линии благополучия — тогда буквы
     не наезжают ни друг на друга, ни на соседние круги */
  /* Буквы уводим от своих бусин на 26 единиц: к — влево, л — вверх,
     а м, н, о — внутрь, к центру, где нет соседних кругов. */
  /* Буква стоит строго под своей энергией, значок — строго над ней.
     У к и л оси заняты соседями, поэтому они уходят по диагонали наружу. */
  if(!isPair){
  h += ltr(d1[0],     d1[1]-24,  'к');   /* над своим кругом, по оси */
  h += ltr(c1[0]-24,  c1[1],     'л');   /* слева вплотную к своему кругу */
  h += ltr(xP[0],     xP[1]+24,  'м');   /* прямо под своим кругом */
  h += ltr(x1P[0]+17, x1P[1]+17, 'н');   /* на одной диагонали с сердцем */
  h += ltr(x2P[0]+17, x2P[1]+17, 'о');   /* на одной диагонали с долларом */
  }

  /* значок висит над своей точкой и смещён от ближайшего соседа */
  /* Значок стоит вплотную к своей точке, но не заходит на неё: смещение 17
     по каждой оси даёт 24 единицы до центра круга при его радиусе 13.
     Уходят внутрь, в пустой треугольник между центром и линией благополучия. */
  /* В личной матрице значки уходят внутрь: снаружи стоят родовые точки.
     В паре родовых нет, поэтому снаружи просторнее — выносим туда,
     и центр остаётся чистым. */
  /* -17 в личной: значок и буква встают симметрично по обе стороны
     своего круга на одной диагонали */
  var gOff = isPair ? 16 : -17;
  var gCls = 'mx-glyph' + (isPair ? '' : ' mx-glyph-sm');
  h += '<div class="'+gCls+'" style="left:'+pc(x2P[0]+gOff)+';top:'+pc(x2P[1]+gOff)+';color:#7E8C3E">&#36;</div>';
  h += '<div class="'+gCls+'" style="left:'+pc(x1P[0]+gOff)+';top:'+pc(x1P[1]+gOff)+'">&#9829;</div>';

  return '<div class="mx-plane">'+h+'</div>';
}

function renderMatrix(el, M, showPrognosis, isPair, animate){
  el.className = 'mx-matrix' + (showPrognosis ? ' is-prog' : '') + (animate ? ' is-anim' : '');
  el.innerHTML = svgFrame(M, showPrognosis, isPair) + plane(M, isPair);
}

/* ============ 4. Справочники ============ */
var WEEKDAYS=['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];

/* Тексты живут в отдельном файле mx-texts.js и подключаются раньше ядра.
   Так их можно править, не трогая расчёт, и каждый блок влезает в лимит Tilda. */
var ARCANA = window.MX_ARCANA || {};
var ARCANA_DRAFT = !!window.MX_ARCANA_DRAFT;
function arcana(num){ return ARCANA[num] || {n:'Аркан ' + num, s:'', a:'', p:''}; }

/* Какое предназначение работает у человека прямо сейчас.
   По вашей методичке предназначение включается в 20 лет: до этого
   показываем ближайшее, личное, и помечаем, что оно ещё впереди. */
function activePurpose(M, years){
  if(years < 40) return { level:'Личное',     span:'20–40 лет',        value:M.m, soon:(years < 20) };
  if(years < 60) return { level:'Социальное', span:'40–60 лет',        value:M.z, soon:false };
  return           { level:'Духовное',   span:'60 лет и дальше', value:M.s, soon:false };
}

function pad(n){ return (n<10?'0':'')+n; }

var CHAKRAS = [
  {n:'7. Сахасрара',   c:'#8E7099', f:'#FFFFFF'},
  {n:'6. Аджна',       c:'#6B7FB0', f:'#FFFFFF'},
  {n:'5. Вишудха',     c:'#77A6BC', f:'#FFFFFF'},
  {n:'4. Анахата',     c:'#7FAA86', f:'#FFFFFF'},
  {n:'3. Манипура',    c:'#DDC475', f:'#3A2A22'},
  {n:'2. Свадхистана', c:'#D6976A', f:'#FFFFFF'},
  {n:'1. Муладхара',   c:'#BE7168', f:'#FFFFFF'}
];

/* Энергии одного года жизни. По вашему файлу ЭНЕРГИИ ПО ГОДАМ:
   первая энергия соответствует числу полных лет, вторая стоит строго
   напротив, то есть плюс или минус сорок лет, третья это их сумма. */
function yearRow(M, years){
  /* Круг прогностики идёт от 0 до 80 и после этого повторяется:
     80 это снова 0, 90 это 10. Поэтому берём остаток, а не обрезаем. */
  var y = ((Math.floor(years) % 80) + 80) % 80;
  var row = yearByYear(M)[y];
  return { year:years, ring:y, label:row.label, e1:row.e1, e2:row.e2, e3:row.e3,
           repeat:(years >= 80) };
}

/* Энергии по годам. Периодов 64, а целых лет 80, поэтому один к одному они
   не ложатся: два периода в каждом десятилетии идут по два года. Здесь мы
   разворачиваем расчёт на все 80 лет — каждый год получает аркан того
   периода, внутри которого лежит его середина. Формулы при этом не
   меняются, меняется только подача. Поле shared показывает, что энергия
   та же, что и в предыдущем году. */
function yearByYear(M){
  var p = calculatePrognosis(M), out = [], prev = -1;
  for(var n = 0; n < 80; n++){
    var i = Math.floor((n + 0.5) / 1.25);
    var e1 = p[i].value, e2 = p[(i + 32) % 64].value;
    out.push({ year: n, label: n + '-' + (n + 1),
               e1: e1, e2: e2, e3: reduce(e1 + e2),
               isDecade: (n % 10 === 0), shared: (i === prev), periodIndex: i });
    prev = i;
  }
  return out;
}

/* ============ 5. Готовые наборы данных для интерфейса ============ */

/* Карта здоровья, раздел 2.4. Возвращает семь строк и итог,
   рисует их уже интерфейс. */
function healthRows(M){
  var src = [
    [M.a,  M.b ], [M.a2, M.b2], [M.a1, M.b1], [M.a3, M.b3],
    [M.e,  M.e ], [M.c1, M.d1], [M.c,  M.d ]
  ];
  var sum = [0,0,0], rows = [];
  src.forEach(function(r, i){
    var third = reduce(r[0] + r[1]);
    sum[0] += r[0]; sum[1] += r[1]; sum[2] += third;
    rows.push({ name: CHAKRAS[i].n, color: CHAKRAS[i].c, fg: CHAKRAS[i].f,
                phys: r[0], energy: r[1], emo: third });
  });
  return { rows: rows,
           total: { phys: reduce(sum[0]), energy: reduce(sum[1]), emo: reduce(sum[2]) } };
}

/* Энергии года, раздел 2.6. Энергия 2 — точка напротив, то есть +40 лет. */
function yearsRows(M){
  var p = calculatePrognosis(M);
  return p.map(function(period, i){
    var e1 = period.value, e2 = p[(i + 32) % 64].value;
    return { years: yearsOfPeriod(period.from),   /* как на кольце: целые года */
             exact: periodRange(period),             /* точные границы, если понадобятся */
             e1: e1, e2: e2, e3: reduce(e1 + e2),
             isMain: period.isMain, from: period.from, to: period.to };
  });
}

/* ============ 6. Самопроверка по контрольной дате ============ */
(function selfTest(){
  var ok = true, log = [];
  function eq(name, got, exp){ if(got !== exp){ ok=false; log.push(name+': получено '+got+', ожидалось '+exp); } }

  eq('reduce(17)', reduce(17), 17);
  eq('reduce(23)', reduce(23), 5);
  eq('reduce(29)', reduce(29), 11);
  eq('reduce(31)', reduce(31), 4);

  var T = calculateMatrix(17, 1, 1989);
  eq('a', T.a, 17); eq('b', T.b, 1); eq('c', T.c, 9); eq('d', T.d, 9);
  eq('e', T.e, 9);  eq('f', T.f, 18); eq('g', T.g, 10); eq('y', T.y, 18); eq('k', T.k, 8);

  var P = calculatePrognosis(T);
  var slot = P.filter(function(p){ return Math.abs(p.from - 36.25) < 0.001; })[0];
  eq('период 36,25-37,5', slot ? slot.value : null, 11);
  eq('подпись периода', slot ? periodLabel(slot,'years') : null, '36-37');
  eq('число рождения', reduce(17), 17);

  /* вторая сверка — по образцу beloesolnce, 07.04.1991 */
  var R = extend(calculateMatrix(7, 4, 1991));
  eq('bs: a', R.a, 7); eq('bs: b', R.b, 4); eq('bs: c', R.c, 20); eq('bs: d', R.d, 4); eq('bs: e', R.e, 8);
  eq('bs: f', R.f, 11); eq('bs: g', R.g, 6); eq('bs: y', R.y, 6); eq('bs: k', R.k, 11);
  eq('bs: a1', R.a1, 15); eq('bs: a2', R.a2, 22); eq('bs: a3', R.a3, 5);
  eq('bs: b1', R.b1, 12); eq('bs: b2', R.b2, 16); eq('bs: b3', R.b3, 20);
  eq('bs: c1', R.c1, 10); eq('bs: c2', R.c2, 3);
  eq('bs: d1', R.d1, 12); eq('bs: d2', R.d2, 16);
  eq('bs: линия благополучия', R.x + '/' + R.x1 + '/' + R.x2, '22/7/5');
  eq('bs: сила рода', R.e1, 7);
  eq('bs: внутренняя сила', R.inner, 15);
  eq('bs: небо/земля/личное', R.h+'/'+R.j+'/'+R.m, '8/9/17');
  eq('bs: М/Ж/социальное', R.n+'/'+R.t+'/'+R.z, '17/17/7');
  eq('bs: духовное', R.s, 6);
  /* контроль из гайда: духовное предназначение кратно 3 */
  if([3,6,9,12,15,18,21].indexOf(R.s) === -1){ ok=false; log.push('духовное предназначение вне ряда 3,6,9…21: '+R.s); }
  eq('bs: планетарное', R.planet, 13);
  eq('bs: родовые Е', R.f_s2 + '/' + R.f_s1, '3/19');
  eq('bs: родовые Ж', R.g_s2 + '/' + R.g_s1, '20/14');

  var RP = calculatePrognosis(R);
  function at(a){ return RP.filter(function(p){ return Math.abs(p.from-a)<0.001; })[0]; }
  eq('bs: 21,25', at(21.25).value, 18);
  eq('bs: подпись 21,25', periodLabel(at(21.25),'years'), '21-22');
  eq('bs: 22,5', at(22.5).value, 14);
  eq('bs: подпись 22,5', periodLabel(at(22.5),'years'), '22-23');
  eq('bs: 25 лет', at(25).value, 10);
  eq('bs: 26,25', at(26.25).value, 8);
  eq('bs: подпись 26,25', periodLabel(at(26.25),'years'), '26-27');
  eq('bs: 27,5', at(27.5).value, 16);
  eq('bs: 5 лет', at(5).value, 18);
  /* подписи периодов: всегда ровно один год, в том числе на стыке с пятилеткой */
  eq('bs: подпись 3,75',  periodLabel(at(3.75),'years'),  '3-4');
  eq('bs: подпись 8,75',  periodLabel(at(8.75),'years'),  '8-9');
  eq('bs: подпись 13,75', periodLabel(at(13.75),'years'), '13-14');
  eq('bs: подпись 23,75', periodLabel(at(23.75),'years'), '23-24');
  eq('bs: подпись 28,75', periodLabel(at(28.75),'years'), '28-29');
  var mxBad = RP.filter(function(q){
    var mm = /^(\d+)-(\d+)$/.exec(periodLabel(q,'years'));
    return mm && (+mm[2] - +mm[1]) !== 1;
  });
  eq('bs: диапазонов длиннее года', mxBad.length, 0);

  /* режим 'exact': шкала без пропусков, конец периода совпадает с началом следующего */
  eq('bs: метка 0',    periodLabel(at(0),'exact'),    '0 лет');
  eq('bs: метка 1,25', periodLabel(at(1.25),'exact'), '1г 3м');
  eq('bs: метка 2,5',  periodLabel(at(2.5),'exact'),  '2г 6м');
  eq('bs: метка 3,75', periodLabel(at(3.75),'exact'), '3г 9м');
  eq('bs: метка 5',    periodLabel(at(5),'exact'),    '5 лет');
  eq('bs: метка 8,75', periodLabel(at(8.75),'exact'), '8г 9м');
  eq('bs: метка 20',   periodLabel(at(20),'exact'),   '20 лет');
  var mxGap = 0;
  for(var gi = 0; gi < RP.length - 1; gi++){
    if(fmtAge(RP[gi].to) !== fmtAge(RP[gi+1].from)) mxGap++;
  }
  eq('bs: разрывов в шкале', mxGap, 0);

  if(ok) console.log('%cМатрица: самопроверка пройдена ✓', 'color:#1a7f37;font-weight:bold');
  else console.warn('Матрица: РАСХОЖДЕНИЯ\n' + log.join('\n'));
})();

return {
  version: '1.0',

  /* канон: раздел 2 инструкции */
  reduce: reduce,
  calculateMatrix: calculateMatrix,
  extend: extend,
  pairMatrix: pairMatrix,
  calculatePrognosis: calculatePrognosis,

  /* возраст и подписи периодов */
  ageYM: ageYM,
  fmtAge: fmtAge,
  periodLabel: periodLabel,
  periodRange: periodRange,
  yearsOfPeriod: yearsOfPeriod,
  ringLabel: ringLabel,

  /* готовые наборы */
  healthRows: healthRows,
  yearsRows: yearsRows,
  yearByYear: yearByYear,
  yearRow: yearRow,

  /* справочники */
  ARCANA: ARCANA,
  ARCANA_DRAFT: ARCANA_DRAFT,
  arcana: arcana,
  activePurpose: activePurpose,
  CHAKRAS: CHAKRAS,
  WEEKDAYS: WEEKDAYS,

  /* диаграмма */
  renderMatrix: renderMatrix,
  svgFrame: svgFrame,
  plane: plane,

  /* мелочи, нужные интерфейсу */
  esc: esc,
  pad: pad,
  plural: plural
};

})();
