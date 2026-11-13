/* Выгрузка готового прогноза в PDF и Word. Читает уже построенную страницу #result,
   поэтому файл всегда совпадает с тем, что человек видит на экране */
(function(){
  'use strict';
  var P={main:'5E1A1E',acc:'A8823C',ink:'3A2A22',mute:'7C6B5C',rule:'DCCBAA',line:'C6A15B',card:'F8F3EA'};

  function download(blob,name){
    if(window.__capture){window.__capture(blob,name);return;}
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;
    document.body.appendChild(a);a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href);document.body.removeChild(a);},1500);
  }
  function loadScript(u){return new Promise(function(res,rej){var s=document.createElement('script');s.src=u;s.onload=res;s.onerror=rej;document.head.appendChild(s);});}
  function clean(t){return String(t||'').replace(/\s+/g,' ').trim();}
  /* жирный и курсив внутри абзаца */
  function runsOf(el){var out=[];(function walk(n,b,i){n.childNodes.forEach(function(c){
    if(c.nodeType===3){if(c.nodeValue)out.push({t:c.nodeValue.replace(/\s+/g,' '),b:b,i:i});}
    else if(c.nodeType===1){var tag=c.tagName;walk(c,b||tag==='STRONG'||tag==='B',i||tag==='EM'||tag==='I');}});})(el,false,false);
    return out;}
  function fileBase(){var d=document.querySelector('.result-top p:not(.eyebrow)');var h=document.querySelector('.result-top h2');
    return (clean(h&&h.textContent)+' '+clean(d&&d.textContent).replace(/[^0-9.]/g,' ').trim().split(' ')[0]).replace(/[\\\/:*?"<>|]/g,'');}

  /* страница -> список блоков */
  function collect(){
    var doc={title:clean(document.querySelector('.result-top h2').textContent),
      sub:clean((document.querySelector('.result-top p:not(.eyebrow)')||{}).textContent),sections:[]};
    document.querySelectorAll('#result .section').forEach(function(sec){
      var s={id:sec.id,t:clean(sec.querySelector('h3').textContent),sub:clean((sec.querySelector('small')||{}).textContent),blocks:[]};
      var seen=[];
      sec.querySelectorAll('h4,h5,p,ul,.muted-label,.energyline,.key,.note,.swatches,#matrix-diagram').forEach(function(el){
        if(seen.indexOf(el)>-1)return;seen.push(el);
        if(el.closest('li'))return;
        if(el.matches('.swatches')){s.blocks.push({k:'swatches',colors:(el.getAttribute('data-colors')||'').split(',').filter(Boolean)});return;}
        if(el.id==='matrix-diagram'){s.blocks.push({k:'matrix',el:el});return;}
        if(el.matches('.key')){s.blocks.push({k:'key',t:clean(el.innerText.replace(/\n+/g,' · '))});return;}
        if(el.matches('.muted-label')){s.blocks.push({k:'label',t:clean(el.textContent)});return;}
        if(el.matches('.energyline')){s.blocks.push({k:'label',t:clean(el.innerText.replace(/\n+/g,' · '))});return;}
        if(el.matches('.note')){s.blocks.push({k:'note',runs:runsOf(el)});return;}
        if(el.tagName==='H4'){s.blocks.push({k:'h4',t:clean(el.textContent)});return;}
        if(el.tagName==='H5'){s.blocks.push({k:'h5',t:clean(el.textContent)});return;}
        if(el.tagName==='UL'){s.blocks.push({k:'ul',items:[].map.call(el.children,function(li){return runsOf(li);})});return;}
        if(el.tagName==='P'){if(el.closest('.note')||el.matches('.empty-text'))return;s.blocks.push({k:'p',runs:runsOf(el)});}
      });
      doc.sections.push(s);
    });
    return doc;
  }
  /* схема матрицы -> картинка: рамка из SVG, круги и числа дорисованы по их позициям на странице */
  function matrixPng(el){
    return new Promise(function(res){
      try{var svg=el.querySelector('svg');if(!svg)return res(null);
        var er=el.getBoundingClientRect(),sr=svg.getBoundingClientRect(),w=Math.round(er.width),h=Math.round(er.height),k=2;
        if(w<200||h<200)return res(null);
        var clone=svg.cloneNode(true);clone.setAttribute('xmlns','http://www.w3.org/2000/svg');clone.setAttribute('width',Math.round(sr.width));clone.setAttribute('height',Math.round(sr.height));
        var img=new Image();
        img.onload=function(){
          var c=document.createElement('canvas');c.width=w*k;c.height=h*k;var x=c.getContext('2d');
          x.fillStyle='#FBF7EF';x.fillRect(0,0,c.width,c.height);
          x.drawImage(img,(sr.left-er.left)*k,(sr.top-er.top)*k,sr.width*k,sr.height*k);
          el.querySelectorAll('.mx-node,.mx-ltr').forEach(function(n){
            var r=n.getBoundingClientRect(),cs=getComputedStyle(n),cx=(r.left+r.width/2-er.left)*k,cy=(r.top+r.height/2-er.top)*k;
            var bg=cs.backgroundColor,transparent=!bg||bg==='rgba(0, 0, 0, 0)'||bg==='transparent';
            if(!transparent){x.beginPath();x.arc(cx,cy,r.width/2*k,0,6.2832);x.fillStyle=bg;x.fill();
              var bw=parseFloat(cs.borderTopWidth)||0;if(bw>0){x.lineWidth=bw*k;x.strokeStyle=cs.borderTopColor;x.stroke();}}
            x.fillStyle=cs.color;x.textAlign='center';x.textBaseline='middle';
            x.font=(cs.fontStyle==='italic'?'italic ':'')+(parseInt(cs.fontWeight,10)>=600?'600 ':'')+(parseFloat(cs.fontSize)*k)+'px Georgia,serif';
            x.fillText(n.textContent.trim(),cx,cy+k);
          });
          res({url:c.toDataURL('image/png'),w:w,h:h});};
        img.onerror=function(){res(null);};
        img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(clone));
      }catch(e){res(null);}
    });
  }

  /* ---------- PDF ---------- */
  function pdfRuns(runs){return runs.map(function(r){var o={text:r.t};if(r.b){o.bold=true;o.color='#'+P.main;}if(r.i)o.italics=true;return o;});}
  function exportPdf(){
    var doc=collect(),col=function(x){return '#'+x;};
    return matrixPng(document.getElementById('matrix-diagram')||document.createElement('div')).then(function(png){
      return loadScript('pdfmake.min.js').then(function(){return loadScript('pdf-fonts.js');}).then(function(){
        window.pdfMake.fonts={Montserrat:{normal:'mont-400.ttf',bold:'mont-600.ttf',italics:'mont-400.ttf',bolditalics:'mont-600.ttf'},
          Playfair:{normal:'play-500.ttf',bold:'play-500.ttf',italics:'play-500.ttf',bolditalics:'play-500.ttf'}};
        var c=[];
        c.push({text:'МАТРИЦА СУДЬБЫ',fontSize:8,bold:true,color:col(P.acc),characterSpacing:3,alignment:'center'});
        c.push({text:doc.title,font:'Playfair',fontSize:30,color:col(P.main),alignment:'center',margin:[0,8,0,2]});
        c.push({text:'Полный персональный разбор',fontSize:9,color:col(P.mute),alignment:'center',margin:[0,0,0,4]});
        c.push({text:doc.sub,fontSize:10,color:col(P.mute),alignment:'center',margin:[0,0,0,14]});
        c.push({text:'ОГЛАВЛЕНИЕ',fontSize:7.5,bold:true,color:col(P.acc),characterSpacing:1.6,margin:[0,6,0,4]});
        doc.sections.forEach(function(s){c.push({text:s.t,linkToDestination:s.id,fontSize:9.5,color:col(P.main),decoration:'underline',margin:[0,0,0,3]});});
        doc.sections.forEach(function(s,i){
          c.push({text:s.sub.toUpperCase(),fontSize:7.5,bold:true,color:col(P.acc),characterSpacing:1.6,margin:[0,0,0,3],pageBreak:'before',id:s.id});
          c.push({text:s.t,font:'Playfair',fontSize:18,color:col(P.main),margin:[0,0,0,2]});
          c.push({canvas:[{type:'line',x1:0,y1:0,x2:515,y2:0,lineWidth:.8,lineColor:col(P.line)}],margin:[0,2,0,8]});
          s.blocks.forEach(function(b){
            switch(b.k){
              case 'h4':c.push({text:b.t,font:'Playfair',fontSize:13,color:col(P.main),margin:[0,8,0,2]});break;
              case 'h5':c.push({text:b.t.toUpperCase(),fontSize:7.5,bold:true,color:col(P.acc),characterSpacing:1.4,margin:[0,8,0,3]});break;
              case 'label':c.push({text:b.t.toUpperCase(),fontSize:6.8,color:col(P.acc),characterSpacing:1,margin:[0,0,0,3]});break;
              case 'key':c.push({text:b.t,fontSize:10,bold:true,color:col(P.main),margin:[0,0,0,3]});break;
              case 'p':c.push({text:pdfRuns(b.runs),fontSize:10,color:col(P.ink),lineHeight:1.5,margin:[0,0,0,6]});break;
              case 'note':c.push({table:{widths:['*'],body:[[{text:pdfRuns(b.runs),fontSize:9.6,color:col(P.ink),lineHeight:1.45,fillColor:col(P.card),margin:[8,6,8,6]}]]},layout:'noBorders',margin:[0,4,0,8]});break;
              case 'ul':c.push({ul:b.items.map(function(r){return {text:pdfRuns(r)};}),fontSize:9.8,color:col(P.ink),lineHeight:1.45,margin:[0,0,0,6]});break;
              case 'swatches':if(b.colors.length)c.push({table:{widths:b.colors.map(function(){return 34;}),heights:22,body:[b.colors.map(function(h){return {text:' ',fillColor:h,fontSize:10};})]},layout:{hLineColor:function(){return '#DCCBAA';},vLineColor:function(){return '#FFFFFF';},hLineWidth:function(){return .5;},vLineWidth:function(){return 3;}},margin:[0,2,0,8]});break;
              case 'matrix':if(png)c.push({image:png.url,width:420,alignment:'center',margin:[0,4,0,8]});break;
            }
          });
        });
        var def={pageSize:'A4',pageMargins:[40,44,40,48],content:c,defaultStyle:{font:'Montserrat',fontSize:10,color:col(P.ink)},
          footer:function(cur,tot){return {text:'Прогноз на год · '+cur+' / '+tot,alignment:'center',fontSize:7,color:col(P.acc),characterSpacing:1.5,margin:[0,14,0,0]};}};
        return new Promise(function(res,rej){try{window.pdfMake.createPdf(def).getBlob(function(b){download(b,fileBase()+'.pdf');res();});}catch(e){rej(e);}});
      });
    });
  }

  /* ---------- Word ---------- */
  function exportWord(){
    var doc=collect();
    return matrixPng(document.getElementById('matrix-diagram')||document.createElement('div')).then(function(png){
      return loadScript('docx.umd.js').then(function(){
        var X=window.docx,kids=[];
        var run=function(t,o){o=o||{};o.text=t;return new X.TextRun(o);};
        var para=function(t,o){o=o||{};return new X.Paragraph({children:o.runs||[run(t,{font:o.font||'Calibri',size:o.size||22,color:o.color||P.ink,italics:o.it,bold:o.bold,characterSpacing:o.sp})],spacing:{after:o.after||140,before:o.before||0,line:o.line||300},alignment:o.al,bullet:o.bullet,pageBreakBefore:o.pb,heading:o.heading});};
        var rich=function(runs,size,o){o=o||{};return para('',{runs:runs.map(function(r){return run(r.t,{font:'Calibri',size:size||22,bold:r.b,italics:r.i,color:r.b?P.main:P.ink});}),after:o.after,bullet:o.bullet});};
        kids.push(para('МАТРИЦА СУДЬБЫ',{size:16,color:P.acc,bold:true,al:X.AlignmentType.CENTER,sp:60}));
        kids.push(para(doc.title,{font:'Georgia',size:60,color:P.main,al:X.AlignmentType.CENTER,after:40}));
        kids.push(para('Полный персональный разбор',{size:18,color:P.mute,al:X.AlignmentType.CENTER,after:80}));
        kids.push(para(doc.sub,{size:20,color:P.mute,al:X.AlignmentType.CENTER,after:200}));
        doc.sections.forEach(function(s,i){
          kids.push(para(s.sub.toUpperCase(),{size:15,color:P.acc,bold:true,sp:40,after:60,pb:i>0}));
          kids.push(para(s.t,{font:'Georgia',size:36,color:P.main,after:100,heading:X.HeadingLevel.HEADING_1}));
          s.blocks.forEach(function(b){
            switch(b.k){
              case 'h4':kids.push(para(b.t,{font:'Georgia',size:26,color:P.main,before:140,after:60}));break;
              case 'h5':kids.push(para(b.t.toUpperCase(),{size:15,color:P.acc,bold:true,sp:40,before:140,after:60}));break;
              case 'label':kids.push(para(b.t.toUpperCase(),{size:14,color:P.acc,sp:30,after:40}));break;
              case 'key':kids.push(para(b.t,{size:21,bold:true,color:P.main,after:60}));break;
              case 'p':kids.push(rich(b.runs,22));break;
              case 'note':kids.push(rich(b.runs,21));break;
              case 'ul':b.items.forEach(function(r){kids.push(rich(r,21,{bullet:{level:0},after:80}));});break;
              case 'swatches':if(b.colors.length){kids.push(new X.Table({width:{size:40,type:X.WidthType.PERCENTAGE},rows:[new X.TableRow({height:{value:420,rule:X.HeightRule.EXACT},children:b.colors.map(function(h){return new X.TableCell({shading:{type:X.ShadingType.CLEAR,fill:h.replace('#',''),color:'auto'},children:[new X.Paragraph({text:''})]});})})]}));kids.push(para('',{after:80}));}break;
              case 'matrix':if(png){var bin=atob(png.url.split(',')[1]),arr=new Uint8Array(bin.length);for(var q=0;q<bin.length;q++)arr[q]=bin.charCodeAt(q);
                kids.push(new X.Paragraph({alignment:X.AlignmentType.CENTER,children:[new X.ImageRun({data:arr,transformation:{width:380,height:Math.round(380*png.h/png.w)},type:'png'})]}));}break;
            }
          });
        });
        var d=new X.Document({sections:[{properties:{page:{margin:{top:1000,bottom:1000,left:1100,right:1100}}},children:kids}]});
        return X.Packer.toBlob(d);
      });
    }).then(function(b){download(b,fileBase()+'.docx');});
  }

  function busy(btn,fn){var t=btn.textContent;btn.disabled=true;btn.textContent='Готовим файл…';
    Promise.resolve().then(fn).catch(function(e){if(window.console)console.warn(e);if(fn===exportPdf)window.print();}).then(function(){btn.disabled=false;btn.textContent=t;});}
  window.ForecastExport={pdf:exportPdf,word:exportWord,busy:busy};
})();
