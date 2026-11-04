(function(){
"use strict";

var SURAH_STARTS = [1,8,294,494,670,790,955,1161,1236,1365,1474,1597,1708,1751,1803,1902,2030,2141,2251,2349,2484,2596,2674,2792,2856,2933,3160,3253,3341,3410,3470,3504,3534,3607,3661,3706,3789,3971,4059,4134,4219,4273,4326,4415,4474,4511,4546,4584,4613,4631,4676,4736,4785,4847,4902,4980,5076,5105,5127,5151,5164,5178,5189,5200,5218,5230,5242,5272,5324,5376,5420,5448,5476,5496,5552,5592,5623,5673,5713,5759,5801,5830,5849,5885,5910,5932,5949,5968,5994,6024,6044,6059,6080,6091,6099,6107,6126,6131,6139,6147,6158,6169,6177,6180,6189,6194,6198,6205,6208,6214,6217,6222,6226,6231];

var state = {
  surahs:[], reciters:[], currentReciter:null,
  playingSurah:null, playingAyah:0, playing:false,
  adhkarCounts:{}, adhkarDone:{}, currentAdhkarCat:"morning",
  prayerTimes:{}, nextPrayer:null,
  quizIndex:0, quizScore:0, quizAnswered:false,
  memory:{flipped:[],matched:0,moves:0,lock:false},
  word:{current:null,selected:[]}
};

var $ = function(id){return document.getElementById(id)};

function toast(msg){
  var t=$("toast"); t.textContent=msg; t.classList.add("show");
  clearTimeout(t._timer); t._timer=setTimeout(function(){t.classList.remove("show")},2500);
}

function notify(title, body){
  toast(title+" - "+body);
  if("Notification" in window && Notification.permission==="granted"){
    try{ new Notification(title,{body:body,icon:"/static/img/logo.png"}) }catch(e){}
  }
}

/* ============ التنقل ============ */
function gotoPage(name){
  document.querySelectorAll(".page").forEach(function(p){p.classList.remove("active")});
  var pg=$("page-"+name); if(pg) pg.classList.add("active");
  document.querySelectorAll(".nav-item").forEach(function(n){
    n.classList.toggle("active", n.dataset.page===name);
  });
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll(".nav-item").forEach(function(n){
  n.addEventListener("click",function(){gotoPage(n.dataset.page)});
});
document.querySelectorAll(".quick-item").forEach(function(q){
  q.addEventListener("click",function(){gotoPage(q.dataset.goto)});
});

/* ============ تحميل البيانات ============ */
function getJSON(url){ return fetch(url).then(function(r){return r.json()}) }

Promise.all([
  getJSON("/api/surahs"),
  getJSON("/api/reciters"),
  getJSON("/api/daily")
]).then(function(results){
  state.surahs=results[0];
  state.reciters=results[1];
  renderSurahs();
  renderReciters();
  renderFeatured();
  renderDaily(results[2]);
  initReciterSelect();
}).catch(function(e){console.error(e)});

/* ============ درس اليوم ============ */
function renderDaily(d){
  $("daily-ayah-text").textContent=d.ayah.text;
  $("daily-ayah-ref").textContent="سورة "+d.ayah.surah+" - آية "+d.ayah.number;
  $("daily-hadith-text").textContent=d.hadith.text;
  $("daily-hadith-ref").textContent="رواه: "+d.hadith.narrator+" - شرح: "+d.hadith.explanation;
  var h=new Date().getHours();
  var g = h<12?"صباح الخير ورحمة الله وبركاته":"مساء الخير ورحمة الله وبركاته";
  $("greeting-text").textContent=g;
}

/* ============ القرآن ============ */
function initReciterSelect(){
  var sel=$("reciter-select");
  sel.innerHTML='<option value="">اختر القارئ للاستماع...</option>';
  state.reciters.forEach(function(r,i){
    var o=document.createElement("option"); o.value=i; o.textContent=r.name; sel.appendChild(o);
  });
  sel.addEventListener("change",function(){
    state.currentReciter = sel.value!=="" ? state.reciters[parseInt(sel.value)] : null;
    if(state.currentReciter) toast("تم اختيار: "+state.currentReciter.name);
  });
}

function renderSurahs(filter){
  var grid=$("surah-grid"); grid.innerHTML="";
  var f=(filter||"").trim();
  state.surahs.forEach(function(s){
    if(f && s.name.indexOf(f)===-1) return;
    var div=document.createElement("div");
    div.className="surah-item";
    div.innerHTML='<div class="surah-num">'+s.number+'</div>'+
      '<div class="surah-info"><h4>سورة '+s.name+'</h4><span>'+s.type+' - '+s.ayahs+' آية</span></div>'+
      '<i class="fa-solid fa-play surah-play"></i>';
    div.addEventListener("click",function(){playSurah(s)});
    grid.appendChild(div);
  });
}
$("surah-search").addEventListener("input",function(e){renderSurahs(e.target.value)});

function globalAyah(surahNum, ayah){ return SURAH_STARTS[surahNum-1] + ayah - 1 }

function playSurah(surah){
  if(!state.currentReciter){ toast("الرجاء اختيار قارئ أولاً"); return }
  state.playingSurah=surah;
  state.playingAyah=1;
  state.playing=true;
  $("player-bar").classList.add("show");
  $("now-playing").textContent=state.currentReciter.name+" - سورة "+surah.name;
  playCurrentAyah();
}
function playCurrentAyah(){
  if(!state.playingSurah) return;
  var g=globalAyah(state.playingSurah.number, state.playingAyah);
  var url=state.currentReciter.server+g+".mp3";
  var audio=$("audio-player");
  audio.src=url;
  audio.play().catch(function(){toast("تعذر تشغيل التلاوة، تحقق من الاتصال")});
  $("btn-play").innerHTML='<i class="fa-solid fa-pause"></i>';
}
$("audio-player").addEventListener("ended",function(){
  if(state.playingAyah < state.playingSurah.ayahs){
    state.playingAyah++; playCurrentAyah();
  } else {
    state.playing=false;
    $("btn-play").innerHTML='<i class="fa-solid fa-play"></i>';
    toast("انتهت سورة "+state.playingSurah.name);
  }
});
$("btn-play").addEventListener("click",function(){
  var audio=$("audio-player");
  if(!state.playingSurah){toast("اختر سورة أولاً");return}
  if(audio.paused){audio.play();state.playing=true;$("btn-play").innerHTML='<i class="fa-solid fa-pause"></i>'}
  else{audio.pause();state.playing=false;$("btn-play").innerHTML='<i class="fa-solid fa-play"></i>'}
});
$("btn-next").addEventListener("click",function(){
  if(state.playingSurah && state.playingAyah<state.playingSurah.ayahs){state.playingAyah++;playCurrentAyah()}
});
$("btn-prev").addEventListener("click",function(){
  if(state.playingSurah && state.playingAyah>1){state.playingAyah--;playCurrentAyah()}
});

/* ============ التلاوات المميزة ============ */
function renderReciters(){
  var list=$("reciters-list"); list.innerHTML="";
  state.reciters.forEach(function(r,i){
    var div=document.createElement("div");
    div.className="reciter-card";
    div.innerHTML='<div class="reciter-avatar"><i class="fa-solid fa-user-tie"></i></div><h4>'+r.name+'</h4>';
    div.addEventListener("click",function(){
      $("reciter-select").value=i;
      state.currentReciter=r;
      gotoPage("quran");
      toast("تم اختيار: "+r.name+" - اختر سورة للاستماع");
    });
    list.appendChild(div);
  });
}
function renderFeatured(){
  var featured=[
    {name:"سورة الملك",surah:67,desc:"حصن المسلم من عذاب القبر"},
    {name:"سورة الكهف",surah:18,desc:"من قرأها يوم الجمعة أضاء له"},
    {name:"سورة يس",surah:36,desc:"قلب القرآن العظيم"},
    {name:"سورة الرحمن",surah:55,desc:"عرس القرآن الكريم"},
    {name:"سورة البقرة (آية الكرسي)",surah:2,desc:"سيد الآيات - آية 255"},
    {name:"المعوذتين",surah:113,desc:"سورتي الفلق والناس"}
  ];
  var list=$("featured-list"); list.innerHTML="";
  featured.forEach(function(f){
    var surah=state.surahs.find(function(s){return s.number===f.surah});
    if(!surah) return;
    var div=document.createElement("div");
    div.className="featured-item";
    div.innerHTML='<div class="fi-icon"><i class="fa-solid fa-star"></i></div>'+
      '<div style="flex:1"><h5>'+f.name+'</h5><span>'+f.desc+'</span></div>'+
      '<i class="fa-solid fa-play" style="color:var(--primary)"></i>';
    div.addEventListener("click",function(){
      if(!state.currentReciter){toast("اختر قارئاً من القائمة أولاً");return}
      playSurah(surah);
    });
    list.appendChild(div);
  });
}

/* ============ الأحاديث ============ */
var currentBook="bukhari";
function loadHadith(book){
  currentBook=book;
  getJSON("/api/hadith?book="+book).then(function(list){
    var c=$("hadith-list"); c.innerHTML="";
    list.forEach(function(h){
      var div=document.createElement("div");
      div.className="hadith-card";
      div.innerHTML='<div class="hadith-narrator">رواه: '+h.narrator+' - رقم '+h.number+'</div>'+
        '<p class="hadith-text">'+h.text+'</p>'+
        '<div class="hadith-explain"><i class="fa-solid fa-lightbulb" style="color:var(--gold)"></i> شرح: '+h.explanation+'</div>';
      c.appendChild(div);
    });
  });
}
document.querySelectorAll(".book-tab").forEach(function(t){
  t.addEventListener("click",function(){
    document.querySelectorAll(".book-tab").forEach(function(x){x.classList.remove("active")});
    t.classList.add("active");
    loadHadith(t.dataset.book);
  });
});
loadHadith("bukhari");

/* ============ الأذكار ============ */
function loadAdhkar(cat){
  state.currentAdhkarCat=cat;
  getJSON("/api/adhkar/"+cat).then(function(list){
    var c=$("adhkar-list"); c.innerHTML="";
    state.adhkarCounts={}; state.adhkarDone={};
    list.forEach(function(dk,i){
      state.adhkarCounts[i]=0;
      var div=document.createElement("div");
      div.className="adhkar-card"; div.id="adhkar-"+i;
      div.innerHTML='<p class="adhkar-text">'+dk.text+'</p>'+
        (dk.virtue?'<div class="adhkar-virtue"><i class="fa-solid fa-gem"></i> الفضل: '+dk.virtue+'</div>':'')+
        '<div class="adhkar-meta"><span><i class="fa-solid fa-bookmark"></i> '+dk.reference+'</span><span>التكرار: '+dk.count+' مرة</span></div>'+
        '<div class="counter-row">'+
          '<button class="counter-btn reset" data-i="'+i+'" data-act="reset"><i class="fa-solid fa-rotate-left"></i></button>'+
          '<div class="counter-display" id="count-'+i+'">0 / '+dk.count+'</div>'+
          '<button class="counter-btn" data-i="'+i+'" data-act="inc"><i class="fa-solid fa-plus"></i></button>'+
        '</div>';
      c.appendChild(div);
    });
    c.querySelectorAll(".counter-btn").forEach(function(b){
      b.addEventListener("click",function(){
        var i=parseInt(b.dataset.i), act=b.dataset.act;
        var target=list[i].count;
        if(act==="reset"){ state.adhkarCounts[i]=0; state.adhkarDone[i]=false }
        else {
          if(state.adhkarCounts[i]>=target) return;
          state.adhkarCounts[i]++;
          if(state.adhkarCounts[i]>=target){
            state.adhkarDone[i]=true;
            $("adhkar-"+i).classList.add("done");
            if(navigator.vibrate) navigator.vibrate(100);
            toast("أحسنت! اكتمل الذكر "+(i+1));
          }
        }
        $("count-"+i).textContent=state.adhkarCounts[i]+" / "+target;
        updateAdhkarProgress(list.length);
      });
    });
    updateAdhkarProgress(list.length);
  });
}
function updateAdhkarProgress(total){
  var done=Object.keys(state.adhkarDone).filter(function(k){return state.adhkarDone[k]}).length;
  var pct=total? Math.round(done/total*100):0;
  $("adhkar-progress-fill").style.width=pct+"%";
  $("adhkar-progress-text").textContent=done+" / "+total;
}
document.querySelectorAll(".cat-btn").forEach(function(b){
  b.addEventListener("click",function(){
    document.querySelectorAll(".cat-btn").forEach(function(x){x.classList.remove("active")});
    b.classList.add("active");
    loadAdhkar(b.dataset.cat);
  });
});
loadAdhkar("morning");

/* ============ مواقيت الصلاة ============ */
function fetchPrayer(city){
  var url="https://api.aladhan.com/v1/timingsByCity?city="+encodeURIComponent(city)+"&country=Egypt&method=5";
  fetch(url).then(function(r){return r.json()}).then(function(res){
    if(res.code!==200){toast("تعذر جلب المواقيت");return}
    var t=res.data.timings;
    state.prayerTimes={
      "الفجر":t.Fajr,"الشروق":t.Sunrise,"الظهر":t.Dhuhr,
      "العصر":t.Asr,"المغرب":t.Maghrib,"العشاء":t.Isha
    };
    var h=res.data.date.hijri;
    $("hijri-date").textContent=h.day+" "+h.month.ar+" "+h.year+" هـ";
    renderPrayerTimes();
    toast("تم تحديث مواقيت الصلاة لـ "+city);
  }).catch(function(){toast("تحقق من الاتصال بالإنترنت")});
}
function renderPrayerTimes(){
  var c=$("prayer-times"); c.innerHTML="";
  var icons={"الفجر":"fa-cloud-sun","الشروق":"fa-sun","الظهر":"fa-sun","العصر":"fa-cloud-sun","المغرب":"fa-sun","العشاء":"fa-moon"};
  var now=new Date();
  var nowMin=now.getHours()*60+now.getMinutes();
  var nextName=null, nextMin=9999;
  Object.keys(state.prayerTimes).forEach(function(name){
    var parts=state.prayerTimes[name].split(":");
    var m=parseInt(parts[0])*60+parseInt(parts[1]);
    if(m>nowMin && m<nextMin){nextMin=m;nextName=name}
    var isNext=(name===nextName);
    var div=document.createElement("div");
    div.className="prayer-card"+(isNext?" next":"");
    div.innerHTML='<div class="prayer-icon"><i class="fa-solid '+icons[name]+'"></i></div>'+
      '<div><div class="prayer-name">'+name+(isNext?' <span style="color:var(--gold);font-size:11px">(القادمة)</span>':'')+'</div>'+
      '<div class="prayer-time">'+state.prayerTimes[name]+'</div></div>';
    c.appendChild(div);
  });
  if(nextName){
    var diff=nextMin-nowMin;
    $("prayer-next").innerHTML='<i class="fa-solid fa-mosque"></i><span>الصلاة القادمة: '+nextName+' بعد '+Math.floor(diff/60)+' ساعة و'+(diff%60)+' دقيقة</span>';
  }
}
$("btn-fetch-prayer").addEventListener("click",function(){fetchPrayer($("city-input").value.trim()||"القاهرة")});
fetchPrayer("القاهرة");
setInterval(function(){if(Object.keys(state.prayerTimes).length) renderPrayerTimes()},60000);

/* ============ الإشعارات ============ */
$("enable-notif").addEventListener("click",function(){
  if(!("Notification" in window)){toast("المتصفح لا يدعم الإشعارات");return}
  if(Notification.permission==="granted"){toast("الإشعارات مفعلة بالفعل");return}
  Notification.requestPermission().then(function(p){
    if(p==="granted"){this.classList.add("on");notify("نور الإسلام","تم تفعيل الإشعارات بنجاح")}
    else toast("لم يتم تفعيل الإشعارات");
  }.bind(this));
});
setInterval(function(){
  var now=new Date();
  var h=now.getHours(), m=now.getMinutes();
  var toggles={};
  document.querySelectorAll(".reminder-toggle").forEach(function(t){toggles[t.dataset.reminder]=t.checked});
  if(toggles.morning && h===6 && m===0) notify("أذكار الصباح","حان وقت أذكار الصباح، ابدأ ذكرك لله");
  if(toggles.evening && h===18 && m===0) notify("أذكار المساء","حان وقت أذكار المساء، احرص على ذكر الله");
  if(toggles.salawat && m===0) notify("الصلاة على النبي","اللهم صل وسلم على نبينا محمد");
  if(toggles.dhikr && (h%2===0) && m===30) notify("اذكر الله","سبحان الله وبحمده، لا إله إلا الله والله أكبر");
  if(toggles.prayer){
    Object.keys(state.prayerTimes).forEach(function(name){
      if(name==="الشروق") return;
      var p=state.prayerTimes[name].split(":");
      var pm=parseInt(p[0])*60+parseInt(p[1]);
      var nm=h*60+m;
      if(pm-nm===10) notify("تنبيه الصلاة","تبقى 10 دقائق على صلاة "+name);
    });
  }
},60000);

/* ============ الألعاب ============ */
document.querySelectorAll(".game-tab").forEach(function(t){
  t.addEventListener("click",function(){
    document.querySelectorAll(".game-tab").forEach(function(x){x.classList.remove("active")});
    document.querySelectorAll(".game-panel").forEach(function(x){x.classList.remove("active")});
    t.classList.add("active");
    $("game-"+t.dataset.game).classList.add("active");
    if(t.dataset.game==="memory") initMemory();
    if(t.dataset.game==="word") newWord();
  });
});

/* أسئلة */
var quizData=[];
getJSON("/api/quiz").then(function(q){quizData=q;shuffle(quizData);loadQuizQuestion()});
function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}}
function loadQuizQuestion(){
  state.quizAnswered=false;
  if(state.quizIndex>=quizData.length){
    $("quiz-card").innerHTML='<div style="text-align:center;padding:20px"><i class="fa-solid fa-trophy" style="font-size:48px;color:var(--gold)"></i><h3 style="margin:14px 0">انتهت الأسئلة!</h3><p>نقاطك النهائية: '+state.quizScore+' / '+quizData.length+'</p><button class="btn-primary" id="quiz-restart">إعادة اللعب</button></div>';
    $("quiz-restart").addEventListener("click",function(){state.quizIndex=0;state.quizScore=0;shuffle(quizData);loadQuizQuestion()});
    return;
  }
  var q=quizData[state.quizIndex];
  $("quiz-progress").textContent="السؤال "+(state.quizIndex+1)+" / "+quizData.length;
  $("quiz-score").textContent="النقاط: "+state.quizScore;
  $("quiz-question").textContent=q.question;
  var opts=$("quiz-options"); opts.innerHTML="";
  q.options.forEach(function(op,i){
    var b=document.createElement("button");
    b.className="quiz-option"; b.textContent=op;
    b.addEventListener("click",function(){
      if(state.quizAnswered) return;
      state.quizAnswered=true;
      if(i===q.answer){b.classList.add("correct");state.quizScore++;toast("إجابة صحيحة!")}
      else{b.classList.add("wrong");opts.children[q.answer].classList.add("correct");toast("الإجابة الصحيحة: "+q.options[q.answer])}
      $("quiz-next").style.display="inline-flex";
    });
    opts.appendChild(b);
  });
  $("quiz-next").style.display="none";
}
$("quiz-next").addEventListener("click",function(){state.quizIndex++;loadQuizQuestion()});

/* ذاكرة */
var MEMORY_ICONS=["fa-quran","fa-mosque","fa-star-and-crescent","fa-kaaba","fa-hands-praying","fa-moon","fa-sun","fa-dove"];
function initMemory(){
  state.memory={flipped:[],matched:0,moves:0,lock:false};
  $("memory-moves").textContent="الحركات: 0";
  var grid=$("memory-grid"); grid.innerHTML="";
  var cards=MEMORY_ICONS.concat(MEMORY_ICONS);
  shuffle(cards);
  cards.forEach(function(icon,i){
    var c=document.createElement("div");
    c.className="memory-card"; c.dataset.icon=icon; c.dataset.idx=i;
    c.innerHTML='<i class="fa-solid '+icon+'"></i>';
    c.addEventListener("click",function(){flipCard(c)});
    grid.appendChild(c);
  });
}
function flipCard(c){
  if(state.memory.lock || c.classList.contains("flipped") || c.classList.contains("matched")) return;
  c.classList.add("flipped");
  state.memory.flipped.push(c);
  if(state.memory.flipped.length===2){
    state.memory.moves++;
    $("memory-moves").textContent="الحركات: "+state.memory.moves;
    state.memory.lock=true;
    var a=state.memory.flipped[0], b=state.memory.flipped[1];
    if(a.dataset.icon===b.dataset.icon){
      setTimeout(function(){a.classList.add("matched");b.classList.add("matched");state.memory.flipped=[];state.memory.lock=false;state.memory.matched++;
        if(state.memory.matched===MEMORY_ICONS.length){toast("مبروك! أكملت اللعبة في "+state.memory.moves+" حركة")}},500);
    } else {
      setTimeout(function(){a.classList.remove("flipped");b.classList.remove("flipped");state.memory.flipped=[];state.memory.lock=false},900);
    }
  }
}

/* لغز الكلمات */
var WORDS=[
  {word:"قرآن",hint:"كتاب الله المنزل على النبي محمد"},
  {word:"مكة",hint:"بلد الحرام وقبلة المسلمين"},
  {word:"صلاة",hint:"الركن الثاني من أركان الإسلام"},
  {word:"جنة",hint:"ثواب المؤمنين في الآخرة"},
  {word:"نبي",hint:"رسول الله يُوحى إليه"},
  {word:"إيمان",hint:"الركن الأول من أركان الإسلام"},
  {word:"زكاة",hint:"حق المال للفقراء"},
  {word:"صوم",hint:"ركن من أركان الإسلام في شهر رمضان"}
];
function newWord(){
  var w=WORDS[Math.floor(Math.random()*WORDS.length)];
  state.word={current:w,selected:[]};
  var letters=w.word.split(""); shuffle(letters);
  var lc=$("word-letters"); lc.innerHTML="";
  letters.forEach(function(ch,i){
    var b=document.createElement("button");
    b.className="word-letter"; b.textContent=ch; b.dataset.idx=i;
    b.addEventListener("click",function(){pickLetter(b,ch)});
    lc.appendChild(b);
  });
  $("word-answer").innerHTML="";
  $("word-hint").textContent="تلميح: "+w.hint;
}
function pickLetter(btn,ch){
  btn.classList.add("used");
  state.word.selected.push({ch:ch,btn:btn});
  var slot=document.createElement("div");
  slot.className="word-letter-slot"; slot.textContent=ch;
  slot.addEventListener("click",function(){
    var idx=state.word.selected.findIndex(function(s){return s.slot===slot});
    if(idx>=0){state.word.selected[idx].btn.classList.remove("used");state.word.selected.splice(idx,1);slot.remove()}
  });
  state.word.selected[state.word.selected.length-1].slot=slot;
  $("word-answer").appendChild(slot);
}
$("word-check").addEventListener("click",function(){
  var ans=state.word.selected.map(function(s){return s.ch}).join("");
  if(ans===state.word.current.word){toast("إجابة صحيحة! مبروك");setTimeout(newWord,1500)}
  else toast("إجابة خاطئة، حاول مرة أخرى");
});
$("word-reset").addEventListener("click",function(){
  state.word.selected.forEach(function(s){s.btn.classList.remove("used")});
  state.word.selected=[]; $("word-answer").innerHTML="";
});
$("word-new").addEventListener("click",newWord);

})();
