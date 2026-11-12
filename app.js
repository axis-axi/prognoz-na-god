(function(){
  'use strict';
  var form=document.getElementById('forecast-form'), result=document.getElementById('result');
  var error=document.getElementById('form-error'), yearInput=document.getElementById('forecast-year');
  var today=new Date(); yearInput.value=today.getFullYear(); yearInput.max='2200';
  var submitButton=form.querySelector('button[type="submit"]');submitButton.disabled=true;
  var months=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  var names=['','Маг','Жрица','Императрица','Император','Иерофант','Влюблённые','Колесница','Справедливость','Отшельник','Колесо Фортуны','Сила','Повешенный','Смерть','Умеренность','Дьявол','Башня','Звезда','Луна','Солнце','Суд','Мир','Шут'];
  var data={energies:{},programs:{},base:{}};

  var SECTION_LABELS={'Период в плюсе':'Если энергия проживается в плюсе','Период в минусе':'Если энергия проживается в минусе','Суть периода':'О чём это','Ресурс периода':'Ресурс','Талант периода':'Талант','Цели периода':'На что направить силы','Экзамен периода':'Вопросы года','Практика периода':'Практика','Здоровье и тело':'Здоровье и тело','Отдых и восстановление':'Отдых и восстановление'};
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function inline(s){return esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>').replace(/`(.+?)`/g,'<code>$1</code>');}
  function md(s){
    if(!s)return '<p class="empty-text">Текст для этой позиции ещё готовится.</p>';
    var lines=s.trim().split(/\r?\n/), out=[], para=[], list=[];
    function flushP(){if(para.length){out.push('<p>'+inline(para.join(' '))+'</p>');para=[];}}
    function flushL(){if(list.length){out.push('<ul>'+list.map(function(x){return '<li>'+inline(x)+'</li>';}).join('')+'</ul>');list=[];}}
    lines.forEach(function(raw){var line=raw.trim();if(!line||/^---+$/.test(line)){flushP();flushL();return;}var m=/^[-*]\s+(.+)/.exec(line);if(m){flushP();list.push(m[1]);return;}flushL();para.push(line);});flushP();flushL();return out.join('');
  }
  function text(n,section){var e=data.energies[String(n)];if(!e)return '';var keys=Object.keys(e.sections);var exact=keys.filter(function(k){return k.toLowerCase()===section.toLowerCase();})[0];return exact?e.sections[exact]:'';}
  function lowerFirst(s){s=String(s||'').trim();return s?s.charAt(0).toLowerCase()+s.slice(1):s;}
  function retime(s,unit){if(!s)return s;var per=unit==='period',u=per?{n:'период',g:'периода',d:'периоду',i:'периодом',N:'Период'}:{n:'месяц',g:'месяца',d:'месяцу',i:'месяцем',N:'Месяц'};
    var L='(?<![А-Яа-яЁё])',R='(?![А-Яа-яЁё])';
    return s.replace(new RegExp(L+'Год'+R,'g'),u.N).replace(/в этом году/g,per?'в этот период':'в этом месяце')
      .replace(new RegExp('(больше )?'+L+'года'+R,'g'),function(m,p){return p?m:u.g;})
      .replace(new RegExp(L+'год'+R,'g'),u.n).replace(new RegExp(L+'году'+R,'g'),u.d).replace(new RegExp(L+'годом'+R,'g'),u.i);}
  function eName(n){return (names[n]||'Энергия')+' · '+n;}
  function reduce(n){return MX.reduce(n);}
  function card(label,n,section,extra){var body=text(n,section);return '<article class="card '+(extra||'')+'"><span class="energy-num">'+n+'</span><h4>'+esc(label)+'</h4><div class="muted-label">'+esc(eName(n))+' · '+esc(section)+'</div>'+md(body)+'</article>';}
  function detailedCard(label,n,sections,extra){return '<article class="card '+(extra||'')+'"><span class="energy-num">'+n+'</span><h4>'+esc(label)+'</h4><div class="muted-label">'+esc(eName(n))+'</div>'+sections.map(function(s){var body=text(n,s);return body?'<h5>'+esc(SECTION_LABELS[s]||s)+'</h5>'+md(body):'';}).join('')+'</article>';}
  function movieCard(label,n){var movies=data.movies[String(n)]||'';return '<article class="card"><span class="energy-num">'+n+'</span><h4>'+esc(label)+'</h4><div class="muted-label">Кинотерапия · '+esc(eName(n))+'</div>'+md(movies?movies.split(/,\s*/).map(function(x){return '- '+x;}).join('\n'):'')+'</article>';}
  function positionCard(letter,meaning,n,section){return '<article class="card"><span class="energy-num">'+n+'</span><h4>'+esc(meaning)+'</h4><div class="muted-label">Точка '+letter+' · '+esc(eName(n))+'</div>'+md(text(n,section))+'</article>';}
  function section(id,title,subtitle,html){return '<section class="section" id="'+id+'"><div class="section-heading"><h3>'+title+'</h3><small>'+subtitle+'</small></div>'+html+'</section>';}
  function dateFromInput(value){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value||'');if(!m)return null;var y=+m[1],mo=+m[2],d=+m[3],dt=new Date(y,mo-1,d);return dt.getFullYear()===y&&dt.getMonth()===mo-1&&dt.getDate()===d?{d:d,m:mo,y:y}:null;}
  function ageAt(birth,y,m,d){var age=y-birth.y;if(m<birth.m||(m===birth.m&&d<birth.d))age--;return age;}
  function forecast(birth,year){
    var yearly=reduce(String(year).split('').reduce(function(a,d){return a+(+d);},0));
    var birthYearTotal=String(birth.y).split('').reduce(function(a,d){return a+(+d);},0),birthYearBase=reduce(birthYearTotal);
    var A=reduce(birth.d+yearly),B=reduce(birth.m+yearly),V=reduce(birthYearBase+yearly);
    var beforeG=reduce(birth.d+birth.m+birthYearBase),G=reduce(beforeG+yearly),D=reduce(A+B+V+G);
    var M=MX.extend(MX.calculateMatrix(birth.d,birth.m,year));
    var birthMx=MX.extend(MX.calculateMatrix(birth.d,birth.m,birth.y));
    var monthly=months.map(function(month,i){var en=reduce(birth.m+(i+1)+yearly);var age=ageAt(birth,year,i+1,1);var ageRow=MX.yearRow(birthMx,Math.max(0,age));return {month:month,n:i+1,en:en,age:age,life:ageRow.e1};});
    return {year:year,global:yearly,points:{A:A,B:B,V:V,G:G,D:D},M:M,monthly:monthly,birthMx:birthMx};
  }
  function renderPoints(f){var p=f.points;return '<div class="key-grid">'+[['А','Ресурс',p.A],['Б','Талант',p.B],['В','Задача года',p.V],['Г','Главный экзамен',p.G],['Д','Суть года',p.D]].map(function(x){return '<div class="key"><b>ТОЧКА '+x[0]+'</b><strong>'+x[2]+'</strong><span>'+x[1]+'</span></div>';}).join('')+'</div>';}
  function renderMatrix(f){var id='matrix-diagram';return '<div class="matrix-wrap"><div id="'+id+'"></div></div><p class="matrix-caption">Матрица года: '+esc(eName(f.M.a))+' · центр '+f.M.e+'. Денежный и отношенческий каналы показаны на линии благополучия.</p>';}
  function renderMonthly(f){return '<div class="month-grid">'+f.monthly.map(function(m){var focus=retime(text(m.en,'Суть периода'),'month'), actions=retime(text(m.en,'Цели периода'),'month'), avoid=retime(text(m.en,'Период в минусе'),'month');return '<article class="month-card"><h4>'+m.month+'</h4><div class="energyline">Энергия месяца: '+m.en+' · '+esc(eName(m.en))+'<br>Энергия года жизни: '+m.life+' · возраст '+m.age+'</div>'+md(focus)+'<h5>На чём сфокусироваться</h5>'+md(actions)+'<h5>Если энергия проживается в минусе</h5>'+md(avoid)+'</article>';}).join('')+'</div><p class="note">Прочитайте весь год сразу и отметьте месяцы с энергиями 12, 13 и 16: после них нужна пауза. Если перед ними вы работали в плотном режиме, именно в них вы просядете, поэтому заранее запланируйте отдых и восстановление.</p>';
  }
  function addMonths(date,count){var first=new Date(date.getFullYear(),date.getMonth()+count,1),last=new Date(first.getFullYear(),first.getMonth()+1,0).getDate();return new Date(first.getFullYear(),first.getMonth(),Math.min(date.getDate(),last));}
  function dateLabel(d){return String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+d.getFullYear();}
  function solarPeriods(birth,year,birthMx){var cursor=new Date(year,0,1),limit=new Date(year+1,0,1),out=[];
    while(cursor<limit){var age=ageAt(birth,cursor.getFullYear(),cursor.getMonth()+1,cursor.getDate()),cycleStart=new Date(birth.y+age,birth.m-1,birth.d);
      if(cycleStart>cursor){age--;cycleStart=new Date(birth.y+age,birth.m-1,birth.d);}
      var e1=MX.yearRow(birthMx,Math.max(0,age)).e1,e2=MX.yearRow(birthMx,Math.max(0,age+1)).e1,half=reduce(e1+e2),values=[e1,reduce(e1+half),half,reduce(half+e2)],found=false;
      for(var q=0;q<4;q++){var start=addMonths(cycleStart,q*3),end=addMonths(cycleStart,(q+1)*3);if(cursor>=start&&cursor<end){var clippedEnd=end<limit?end:limit;out.push({from:new Date(cursor),to:clippedEnd,age:age,q:q+1,en:values[q]});cursor=clippedEnd;found=true;break;}}
      if(!found)cursor=addMonths(cursor,3);
    }return out;
  }
  function renderSolar(f,birth){return '<div class="cards">'+solarPeriods(birth,f.year,f.birthMx).map(function(r){return '<article class="card"><span class="energy-num">'+r.en+'</span><h4>'+dateLabel(r.from)+' - '+dateLabel(r.to)+'</h4><div class="muted-label">'+r.age+' лет · '+r.q+'-й трёхмесячный отрезок · '+esc(eName(r.en))+'</div>'+md(retime(text(r.en,'Суть периода'),'period'))+'</article>';}).join('')+'</div><p class="note">Солярные отрезки отсчитываются от дня рождения. Границы ориентировочные: энергия может включаться немного раньше или позже даты.</p>';}
  function channel(f,ids,type){return '<div class="cards">'+ids.map(function(x){var n=x[1],label=x[0],key=x[2];var c=card(label,n,type,'');if(key)c=c.replace('<article class="card ">','<article class="card channel-key">');return c;}).join('')+'</div>';}
  function baseOne(n,role){var b=(data.base||{})[String(n)];if(!b)return '';var lv=(b.levels||[]).map(function(x,i){return '<li><strong>'+(i+1)+' уровень.</strong> '+esc(x)+'</li>';}).join('');
    return '<article class="card wide"><span class="energy-num">'+n+'</span><h4>'+esc(names[n]||'')+'</h4><div class="muted-label">'+esc(role)+' · '+esc(eName(n))+'</div><h5>Когда качество проявлено</h5>'+md(b.plus)+'<h5>Когда оно в минусе</h5>'+md(b.minus)+'<h5>Что помогает</h5>'+md(b.help)+(lv?'<h5>Уровни развития</h5><ul class="levels">'+lv+'</ul><p class="muted-label">Узнайте, на каком уровне вы сейчас: это точка, от которой можно двигаться дальше.</p>':'')+'</article>';}
  function baseCard(f){var a=f.birthMx.a,b=f.birthMx.b,intro='<p class="note">Это то, с чем вы пришли: природные качества, на которые удобно опираться весь год. Любое из них можно прожить по-разному. Ниже два варианта, чтобы вы узнали себя и увидели, куда направить внимание.</p>';
    return intro+'<div class="cards">'+baseOne(a,'энергия дня рождения')+(b!==a?baseOne(b,'энергия месяца рождения'):'')+'</div>'+(b===a?'<p class="note">День и месяц рождения у вас дают одну и ту же энергию, поэтому она показана один раз и звучит особенно сильно.</p>':'');}
  function tripleOf(f){return [f.M.d1,f.M.d2,f.M.d];}
  function lessonBlock(f){var ids=tripleOf(f),triple=ids.join('-'),tail=(data.tails||{})[triple],p=f.points;
    var exam='<article class="card wide"><span class="energy-num">'+p.G+'</span><h4>Главный экзамен года</h4><div class="muted-label">точка Г · '+esc(eName(p.G))+'</div>'+md(text(p.G,'Экзамен периода'))+'</article>';
    if(!tail)return '<div class="cards">'+exam+'</div><p class="note">Для связки '+triple+' в методичке нет отдельной расшифровки.</p>';
    var s=tail.sections||{};
    var main='<article class="card program-card wide"><span class="energy-num">'+esc(triple)+'</span><h4>Связка уроков года: '+esc(tail.name)+'</h4><div class="muted-label">нижняя тройка матрицы года, читается целиком</div>'+md(s['Тема года']||'')+'<h5>Возможности года</h5>'+md(s['Возможности года']||'')+'<h5>Где может быть сложно</h5>'+md(s['Где может быть сложно']||'')+'<h5>Задача года</h5>'+md(s['Задача года']||'')+'<h5>Что важно сделать</h5>'+md(s['Что важно сделать']||'')+'</article>';
    return '<div class="cards">'+exam+main+'</div>';}
  function programSection(f){var triple=tripleOf(f).join('-'),pr=data.programs[triple];if(!pr)return '';var s=pr.sections||{};
    return '<div class="cards"><article class="card program-card wide"><span class="energy-num">'+esc(triple)+'</span><h4>Программа: '+esc(pr.name)+'</h4><div class="muted-label">дополнение к расшифровке связки</div>'+md(s['Суть сценария']||'')+'<h5>Где может быть трудно</h5>'+md(s['Где риск в этом году']||'')+'<h5>Что поможет</h5>'+md(s['Что делать']||'')+'</article></div>';}
  function display(birth,f){
    var M=f.M,p=f.points,rel=[["К",M.d1],["Н · ключевая",M.x1,true],["М",M.x]],money=[["М",M.x],["О · ключевая",M.x2,true],["Л",M.c1]];
    var rod='<div class="cards"><article class="card"><h4>Мужская линия рода</h4><p>'+M.f+' · '+M.f_s2+' · '+M.f_s1+'</p>'+md(text(M.f,'Род, родители, дети'))+'</article><article class="card"><h4>Женская линия рода</h4><p>'+M.g+' · '+M.g_s2+' · '+M.g_s1+'</p>'+md(text(M.g,'Род, родители, дети'))+'</article><article class="card"><h4>Сила рода</h4><p class="rod-number">'+M.e1+'</p>'+md(text(M.e1,'Род, родители, дети'))+'</article><article class="card"><h4>Предназначения</h4><p>Личное: '+M.h+' + '+M.j+' = '+M.m+'<br>Социальное: '+M.n+' + '+M.t+' = '+M.z+'<br>Духовное: '+M.s+'</p>'+md(text(M.s,'Род, родители, дети'))+'</article></div>';
    var points='<div class="cards">'+detailedCard('Ваш ресурс: сильные стороны и их обратная сторона',p.A,['Ресурс периода','Период в плюсе','Период в минусе','Отдых и восстановление','Практика периода'],'wide')+detailedCard('Ваша сила и идеи года',p.B,['Талант периода','Период в плюсе','Период в минусе','Цели периода','Практика периода'],'wide')+detailedCard('Что может быть трудно и как себе помочь',p.V,['Период в минусе','Экзамен периода','Здоровье и тело','Практика периода'],'wide')+detailedCard('Суть вашего года подробнее',p.D,['Суть периода','Цели периода','Отдых и восстановление','Период в минусе','Практика периода'],'wide')+'</div>';
    var world=card('Общая энергия '+f.year,f.global,'Суть периода','wide');
    var h1=ageAt(birth,f.year,1,1),h2=ageAt(birth,f.year,12,31);
    var lifeBefore=MX.yearRow(f.birthMx,Math.max(0,h1)).e1,lifeAfter=MX.yearRow(f.birthMx,Math.max(0,h2)).e1;
    var lifeNote='<div class="note">Точка В: '+p.V+'. Энергия года жизни меняется в день рождения: в этом календарном году вам '+h1+' лет до дня рождения и '+(h1===h2?h1:h2)+' после него. В помесячной таблице указана энергия соответствующего возраста.</div>';
    var head='<div class="result-top"><p class="eyebrow">Полный персональный разбор</p><h2>Ваш '+f.year+' год</h2><p>Дата рождения: '+String(birth.d).padStart(2,'0')+'.'+String(birth.m).padStart(2,'0')+'.'+birth.y+' · возраст в начале года: '+h1+'</p><div class="actions"><button class="action" id="dl-pdf">Скачать PDF</button><button class="action" id="dl-doc">Скачать Word</button><button class="action secondary" onclick="window.print()">Распечатать</button><button class="action secondary" id="new-calc">Изменить расчёт</button></div><nav class="toc"><a href="#short">Если коротко</a><a href="#reading">Как читать разбор</a><a href="#base">Ваши базовые качества</a><a href="#points">Ваши качества и задачи</a><a href="#matrix">Матрица года</a><a href="#world">Общий фон года</a><a href="#money">Деньги и реализация</a><a href="#love">Отношения</a><a href="#lesson">Экзамен и уроки года</a><a href="#inspiration">Идеи и вдохновение</a><a href="#health">Здоровье и тело</a><a href="#family">Родители и дети</a><a href="#life">Дом и окружение</a><a href="#months">Все 12 месяцев</a><a href="#solar">Солярные отрезки</a><a href="#tools">Практики и кино</a>'+(programSection(f)?'<a href="#programs">Программа года</a>':'')+'</nav></div>';
    var content=head;
    content+=section('short','Если коротко','главная тема', '<div class="cards"><article class="card wide"><h4>Главное про ваш год</h4>'+md(text(p.D,'Суть периода'))+'<p><b>Где брать силы:</b> энергия '+p.A+' · '+esc(eName(p.A))+'</p><p><b>Что будет вдохновлять:</b> энергия '+p.B+' · '+esc(eName(p.B))+'</p><p><b>Если задача года проживается в минусе, могут проявиться:</b> '+esc(lowerFirst(text(p.V,'Период в минусе').split(/[.!?]/)[0]))+'.</p><p><b>Главный вопрос года:</b> '+esc(text(p.G,'Экзамен периода'))+'</p><p><b>Самая важная тема в действиях:</b> '+esc(((text(p.D,'Цели периода')||'').split(/\n/)[0]||'').replace(/^[-*]\s+/,''))+'</p></article></div>');
    content+=section('reading','Как читать этот разбор','карта тем и возможностей','<div class="card wide"><p>Этот разбор не предсказывает события. Он показывает темы, которые могут стать особенно заметными в течение года, и предлагает способы работать с ними.</p><p>Одна и та же тема может проявляться по-разному. Описания трудностей это не приговор, а повод вовремя заметить привычный сценарий и выбрать, как действовать дальше.</p><p>Читайте прогноз как карту ориентиров: решения и действия остаются за вами.</p></div>');
    content+=section('base','Ваши базовые качества','день и месяц рождения',baseCard(f));
    content+=section('points','Пять точек года','персональный расчёт',renderPoints(f)+points);
    content+=section('matrix','Полная матрица года','позиции и каналы',renderMatrix(f));
    content+=section('world','Энергия года','общий фон для всех','<div class="cards">'+detailedCard('Общий фон '+f.year,f.global,['Суть периода','Период в плюсе','Период в минусе','Цели периода'],'wide')+'</div>');
    content+=section('money','Деньги и реализация','денежный канал',channel(f,money,'Деньги и реализация'));
    content+=section('love','Любовь и отношения','канал отношений',channel(f,rel,'Любовь и отношения'));
    content+=section('lesson','Главный экзамен и уроки года','точка Г и связка уроков',lessonBlock(f));
    content+=section('inspiration','Вдохновение и идеи года','энергия точки Б','<div class="cards">'+detailedCard('Что важно привнести в мир',p.B,['Талант периода','Обучение и развитие','Цели периода','Ресурс периода'],'wide')+'</div>');
    content+=section('health','Здоровье и тело','профилактика и бережность',lifeNote+'<div class="cards">'+detailedCard('На что обратить внимание',p.V,['Здоровье и тело','Период в минусе','Отдых и восстановление','Практика периода'],'wide')+detailedCard('Энергия года жизни до дня рождения',lifeBefore,['Здоровье и тело','Ресурс периода'],'')+(lifeAfter!==lifeBefore?detailedCard('Энергия года жизни после дня рождения',lifeAfter,['Здоровье и тело','Ресурс периода'],''):'')+'</div><p class="note">Этот раздел касается режима и внимания к себе. Он не является диагнозом и не заменяет обследование. Если что-то беспокоит, обратитесь к врачу.</p>');
    content+=section('family','Род, родители и дети','родовые позиции',rod+'<div class="cards">'+detailedCard('Семейная тема года',M.g,['Род, родители, дети','Период в плюсе','Период в минусе'],'')+detailedCard('Что важно учитывать с детьми',p.B,['Род, родители, дети','Талант периода','Цели периода'],'')+'</div>');
    content+=section('life','Дом, окружение и восстановление','ресурс точки А','<div class="cards">'+detailedCard('Дом и пространство',p.A,['Дом и пространство','Ресурс периода','Отдых и восстановление'],'')+detailedCard('Окружение и круг общения',p.A,['Окружение','Период в плюсе','Период в минусе'],'')+detailedCard('Как отдыхать и восстанавливаться',p.A,['Отдых и восстановление','Ресурс периода','Практика периода'],'')+detailedCard('Обучение и развитие',p.B,['Обучение и развитие','Талант периода','Цели периода'],'')+'</div>');
    content+=section('months','Прогноз по месяцам','личная энергия каждого месяца',renderMonthly(f));
    content+=section('solar','Солярные отрезки','дополнительный слой',renderSolar(f,birth));
    var toolsHtml='<div class="cards">'+card('Практика главного фокуса',p.D,'Практика периода','')+card('Практика для сложных тем',p.V,'Практика периода','')+movieCard('Фильмы к главной теме года',p.D)+movieCard('Фильмы к задачам года',p.V)+'</div>';
    content+=section('tools','Практики и кинотерапия','поддержка года',toolsHtml);
    var prog=programSection(f);if(prog)content+=section('programs','Программа года','дополнение к разбору',prog);
    result.innerHTML=content;result.hidden=false;document.querySelector('.hero').classList.add('form-collapsed');document.getElementById('matrix-diagram')&&MX.renderMatrix(document.getElementById('matrix-diagram'),f.M);document.getElementById('dl-pdf').addEventListener('click',function(){window.ForecastExport.busy(this,window.ForecastExport.pdf);});document.getElementById('dl-doc').addEventListener('click',function(){window.ForecastExport.busy(this,window.ForecastExport.word);});document.getElementById('new-calc').addEventListener('click',function(){result.hidden=true;document.querySelector('.hero').classList.remove('form-collapsed');document.querySelector('.hero').scrollIntoView({behavior:'smooth'});});result.scrollIntoView({behavior:'smooth',block:'start'});
  }
  form.addEventListener('submit',function(ev){ev.preventDefault();error.hidden=true;var birth=dateFromInput(document.getElementById('birth-date').value),year=+yearInput.value;
    if(!birth){error.textContent='Проверьте дату рождения.';error.hidden=false;return;}
    if(!Number.isInteger(year)||year<1900||year>2200){error.textContent='Введите год от 1900 до 2200.';error.hidden=false;return;}
    if(year<birth.y){error.textContent='Год прогноза не может быть раньше года рождения.';error.hidden=false;return;}
    try{display(birth,forecast(birth,year));}catch(e){error.textContent='Не удалось построить прогноз. Обновите страницу и попробуйте ещё раз.';error.hidden=false;console.error(e);}
  });
  fetch('texts.json').then(function(r){if(!r.ok)throw new Error('texts.json');return r.json();}).then(function(d){data=d;submitButton.disabled=false;error.hidden=true;}).catch(function(){error.textContent='Не загрузились тексты. Запустите сайт локальным веб-сервером и сначала выполните build_texts.py.';error.hidden=false;});
})();
