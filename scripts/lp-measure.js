/* Mesure de la page de vente statique (inséré dans <head> par scripts/build-sales-page.py).
 * Mêmes règles que le site (src/lib/behavior.ts, src/components/BehaviorAnalytics.tsx) :
 * - visiteurs en Europe (fuseau horaire) : rien n'est chargé avant leur accord (bandeau) ;
 * - Pixel Meta et PostHog chargés après interaction ou inactivité (page rapide) ;
 * - PostHog : saisies masquées, widget de paiement exclu (.ph-no-capture), URL nettoyées,
 *   identifiant = identifiant anonyme first-party (wp_vid) renvoyé par /api/t.
 * Événements : wpCapture(nom, propriétés) — mis en attente tant que PostHog n'est pas chargé. */
(function(){
  var PH_KEY='__POSTHOG_KEY__',PH_HOST='__POSTHOG_HOST__',PIXEL='1025626273769966';
  var CK='wp_consent',started=false,pending=[];
  function consent(){var m=document.cookie.match(/(?:^|;\s*)wp_consent=(granted|denied)/);return m?m[1]:null;}
  function euTz(){try{return /^(Europe\/|Atlantic\/(Canary|Madeira|Azores|Reykjavik|Faroe))/.test(Intl.DateTimeFormat().resolvedOptions().timeZone);}catch(e){return false;}}
  function allowed(){var c=consent();if(c==='denied')return false;return !euTz()||c==='granted';}
  var KEEP=/^(utm_(source|medium|campaign|content|term)|fbclid|gclid|variante)$/;
  function clean(u){
    if(typeof u!=='string'||!u)return u;
    try{var x=new URL(u),del=[];x.searchParams.forEach(function(v,k){if(!KEEP.test(k))del.push(k);});del.forEach(function(k){x.searchParams.delete(k);});x.hash='';return x.toString();}
    catch(e){return u.split(/[?#]/)[0];}
  }
  function source(){
    var p=new URLSearchParams(location.search),s=(p.get('utm_source')||'').toLowerCase(),m=p.get('utm_medium')||'';
    var paid=/^(cpc|ppc|paid|paid_social|ads?)$/i.test(m),social=/facebook|fb|meta|instagram|ig|tiktok|youtube|whatsapp/i;
    if(s){if(social.test(s))return paid?'social_ads':'social';if(/google|bing/.test(s))return paid?'search_ads':'search';if(/mail|newsletter|resend/.test(s))return 'email';return s.slice(0,40);}
    if(p.has('fbclid'))return 'social_ads';
    if(document.referrer){try{var h=new URL(document.referrer).hostname;if(/wooplans\.com$/i.test(h))return 'direct';if(/google\.|bing\.|duckduckgo\.|yahoo\.|ecosia\./i.test(h))return 'search';if(social.test(h))return 'social';return 'referral';}catch(e){return 'referral';}}
    return 'direct';
  }
  window.wpCapture=function(ev,props){
    if(window.posthog)window.posthog.capture(ev,props||{});
    else if(pending.length<50)pending.push([ev,props||{}]);
  };
  window.fbq=window.fbq||function(){(window.fbq.queue=window.fbq.queue||[]).push(arguments)};
  window.fbq('init',PIXEL);
  window.fbq('track','PageView');

  function loadPixel(){
    var queued=(window.fbq&&window.fbq.queue)||[];
    !function(f,b,e,v,n,t,s){if(f.fbq&&f.fbq.callMethod)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=queued;t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
  }
  function loadPostHog(vid){
    if(!PH_KEY||window.posthog)return;
    var ph=[];ph._i=[];ph.__SV=1;ph.people=[];
    ['capture','register','register_once','opt_out_capturing'].forEach(function(m){ph[m]=function(){ph.push([m].concat([].slice.call(arguments)));};});
    var cfg={api_host:PH_HOST,person_profiles:'identified_only',capture_pageview:true,capture_pageleave:true,autocapture:true,
      enable_heatmaps:true,capture_dead_clicks:true,disable_surveys:true,
      session_recording:{maskAllInputs:true,maskTextSelector:'[data-ph-mask]'},
      before_send:function(e){if(e&&e.properties){['$current_url','$referrer','$initial_referrer','$initial_current_url','$session_entry_url','$session_entry_referrer'].forEach(function(k){if(k in e.properties)e.properties[k]=clean(e.properties[k]);});}return e;}};
    if(vid)cfg.bootstrap={distinctID:vid};
    ph._i.push([PH_KEY,cfg]);
    window.posthog=ph;
    ph.register({page_type:'page_vente',variant:window.WP_VARIANT||'a'});
    var p=new URLSearchParams(location.search);
    ph.register_once({wp_source:source(),wp_campaign:p.get('utm_campaign')});
    pending.splice(0).forEach(function(x){ph.capture(x[0],x[1]);});
    var t=document.createElement('script');t.async=true;t.crossOrigin='anonymous';
    t.src=PH_HOST.replace('.i.posthog.com','-assets.i.posthog.com')+'/static/array.js';
    document.head.appendChild(t);
  }
  function start(){
    if(started||!allowed())return;
    started=true;
    loadPixel();
    var vid=window.wpVid||Promise.resolve(null);
    var timeout=new Promise(function(r){setTimeout(function(){r(null);},3000);});
    Promise.race([vid,timeout]).then(loadPostHog,function(){loadPostHog(null);});
  }
  function later(){
    ['pointerdown','keydown','touchstart','scroll'].forEach(function(n){window.addEventListener(n,start,{once:true,passive:true});});
    window.addEventListener('load',function(){
      if('requestIdleCallback' in window)requestIdleCallback(start,{timeout:8000});
      else setTimeout(start,8000);
    },{once:true});
  }
  window.wpConsent=function(v){
    document.cookie=CK+'='+v+'; Path=/; Max-Age=34128000; SameSite=Lax; Secure';
    var b=document.getElementById('wpConsent');if(b)b.remove();
    if(v==='granted')start();
  };
  if(consent()===null&&euTz()){
    document.addEventListener('DOMContentLoaded',function(){
      var d=document.createElement('div');d.id='wpConsent';d.setAttribute('role','dialog');d.setAttribute('aria-label',"Mesure d'audience");
      d.style.cssText='position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;max-width:560px;margin:0 auto;background:#fff;color:#1f2937;border-radius:12px;padding:16px;font:14px/1.45 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.2)';
      d.innerHTML="Nous mesurons l'utilisation du site (pages vues, clics, enregistrements anonymisés de navigation) pour l'améliorer. Aucune saisie n'est enregistrée. <a href=\"/confidentialite\" style=\"text-decoration:underline\">En savoir plus</a>"+
        '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">'+
        '<button type="button" onclick="wpConsent(\'denied\')" style="padding:8px 16px;border-radius:8px;border:1px solid #d1d5db;background:#fff;font-weight:600;cursor:pointer">Refuser</button>'+
        '<button type="button" onclick="wpConsent(\'granted\')" style="padding:8px 16px;border-radius:8px;border:0;background:#0F5B59;color:#fff;font-weight:600;cursor:pointer">Accepter</button></div>';
      document.body.appendChild(d);
    });
  }else later();
})();
