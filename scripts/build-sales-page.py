"""
Génère public/lp/catalogue-premium.html à partir de la page de vente historique
(cpbook index-digital.html, copiée dans scripts/sales-page.source.html).

Changements appliqués :
- chemins des médias : ./assets → /assets, /media → /videos (bucket R2 cpbook-videos) ;
- paiement : widget Snap Chariow conservé (produit de type « service ») ; chaque clic enregistre
  une intention d'achat (/api/checkout, mode widget) pour l'attribution UTM ;
- suppression du formulaire MoneyFusion, de son retour de paiement et de l'analytics Supabase ;
- suivi first-party du tunnel via /api/t ; balises SEO (canonical, Open Graph) ;
- mesure du comportement : PostHog + Pixel Meta (scripts/lp-measure.js, clé lue dans wrangler.jsonc),
  bandeau de consentement pour l'Europe, widget de paiement exclu des enregistrements.

Variante B : scripts/sales-page-b.py (appliquée à la page A générée).

Usage : python3 scripts/build-sales-page.py
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
src = (ROOT / "scripts" / "sales-page.source.html").read_text(encoding="utf-8")
s = src


def replace_once(old: str, new: str) -> None:
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f"Motif attendu une fois, trouvé {count} fois : {old[:80]!r}")
    s = s.replace(old, new)


def replace_between(start: str, end: str, new: str, include_end: bool = True) -> None:
    global s
    i = s.find(start)
    if i < 0:
        raise SystemExit(f"Début introuvable : {start[:80]!r}")
    j = s.find(end, i + len(start))
    if j < 0:
        raise SystemExit(f"Fin introuvable : {end[:80]!r}")
    if include_end:
        j += len(end)
    s = s[:i] + new + s[j:]


# 1. Médias
s = s.replace('"./assets/', '"/assets/').replace("'./assets/", "'/assets/")
s = re.sub(r'(["\'(])/media/', r"\1/videos/", s)

# 2. SEO
replace_once(
    '<link rel="preload" as="image"',
    '<link rel="canonical" href="https://www.wooplans.com/catalogue-premium">\n'
    '<meta property="og:type" content="website">\n'
    '<meta property="og:site_name" content="WooPlans">\n'
    '<meta property="og:title" content="Catalogue Premium WooPlans : 50+ plans de maisons avec leurs devis">\n'
    '<meta property="og:description" content="Choisissez la maison adaptée à votre famille, votre terrain et votre budget : rendus 3D, distributions cotées et devis estimatifs détaillés.">\n'
    '<meta property="og:url" content="https://www.wooplans.com/catalogue-premium">\n'
    '<meta property="og:image" content="https://www.wooplans.com/assets/digital/hero-catalogue.jpg">\n'
    '<meta name="twitter:card" content="summary_large_image">\n'
    '<link rel="icon" href="/favicon.png">\n'
    '<link rel="preload" as="image"',
)

# 3. Bouton CTA → widget Snap Chariow (inchangé) + enregistrement de l'intention d'achat (UTM)
replace_once(
    "function redirectToCheckout(ctaId) {\n",
    "function redirectToCheckout(ctaId) {\n  ctaId=(ctaId||'sales_page')+'@'+(window.WP_VARIANT||'a');\n  wpTrack('cta_click',ctaId);\n  wpCheckoutIntent(ctaId);\n  wpCapture('cta_click',{cta_id:ctaId});\n  wpCapture('checkout_open',{cta_id:ctaId,mode:'widget'});\n",
)

# 4. Envoi du formulaire → /api/checkout
replace_between(
    "async function submitOrder(){",
    "document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeVideo();closeOrder();closeChariowCheckout()}});",
    """async function submitOrder(){
  const v1=chk('fName','ff-name'),vCountry=chk('fCountry','ff-country'),v2=chk('fPhone','ff-phone'),v3=chk('fEmail','ff-email');
  const phoneDigits=document.getElementById('fPhone').value.replace(/\\D/g,'').replace(/^0+/,'');
  if(phoneDigits.length<7||phoneDigits.length>12){document.getElementById('ff-phone').classList.add('has-error');return}
  if(!v1||!vCountry||!v2||!v3)return;
  const emailVal=document.getElementById('fEmail').value.trim();
  const emailFf=document.getElementById('ff-email');
  if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(emailVal)){emailFf.classList.add('has-error');return;}
  emailFf.classList.remove('has-error');
  const button=document.querySelector('.order-body .submit-btn');
  const note=document.querySelector('.order-body .form-note');
  button.disabled=true;
  button.textContent='Paiement en préparation…';
  note.style.color='';
  note.textContent='Connexion sécurisée à notre plateforme de paiement…';
  try{
    const response=await fetch('/api/checkout',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        name:document.getElementById('fName').value.trim(),
        email:emailVal,
        phone:phoneDigits,
        countryCode:document.getElementById('fCountry').value,
        ctaId:currentCtaId
      })
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok||!data.url)throw new Error(data.error||'Paiement indisponible');
    wpCapture('checkout_open',{cta_id:currentCtaId,mode:'redirect'});
    window.location.href=data.url;
  }catch(error){
    note.textContent=error.message||'Impossible de lancer le paiement. Réessayez.';
    note.style.color='#b42318';
    button.disabled=false;
    button.textContent='Payer et recevoir mon catalogue';
  }
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeVideo();closeOrder();}});""",
)
replace_once("Payer et Télécharger\n", "Payer et recevoir mon catalogue\n")
replace_once(
    '<p class="form-note">Vous serez redirigé vers notre plateforme de paiement sécurisé</p>',
    '<p class="form-note">Paiement sécurisé par Mobile Money ou carte. Votre code d\'accès s\'affiche juste après le paiement et vous est envoyé par email.</p>',
)

replace_once("    city:'Digital',\n    payment_method:'MoneyFusion'\n", "    city:'Digital'\n")

# 5. Retour MoneyFusion : supprimé (la confirmation se fait sur /merci)
replace_between("async function checkReturnedPayment(){", "\n}\n", "function checkReturnedPayment(){}\n")

# 7. Analytics Supabase → suivi first-party
replace_between(
    "<!-- ══════════════════════════════════════════════════════════\n     ANALYTICS",
    "</script>\n</body>",
    """<script>
var WP_VARIANT='a';
function wpTrack(type,ctaId){
  try{
    var body=JSON.stringify({type:type,ctaId:ctaId||undefined,url:location.href,referrer:document.referrer||null});
    if(navigator.sendBeacon)navigator.sendBeacon('/api/t',new Blob([body],{type:'application/json'}));
    else fetch('/api/t',{method:'POST',headers:{'Content-Type':'application/json'},body:body,keepalive:true});
  }catch(e){}
}
function wpCheckoutIntent(ctaId){
  try{fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'widget',ctaId:ctaId}),keepalive:true});}catch(e){}
}
// Vue de la page : la réponse donne l'identifiant anonyme du visiteur, repris par PostHog (lp-measure.js).
window.wpVid=fetch('/api/t',{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,
  body:JSON.stringify({type:'sales_page_view',ctaId:'variant_'+WP_VARIANT,url:location.href,referrer:document.referrer||null})})
  .then(function(r){return r.json();}).then(function(d){return d.vid||null;}).catch(function(){return null;});
document.addEventListener('click',function(e){
  var wa=e.target.closest&&e.target.closest('a[href*="wa.me"]');
  if(wa){var id=(wa.getAttribute('data-wa-id')||'sales_page')+'@'+WP_VARIANT;wpTrack('whatsapp_click',id);wpCapture('whatsapp_click',{cta_id:id});}
},true);
</script>
</body>""",
)

# 8. Mesure : Pixel Meta + PostHog (consentement en Europe), à la place de Microsoft Clarity
wrangler = (ROOT / "wrangler.jsonc").read_text(encoding="utf-8")
def wrangler_var(name: str) -> str:
    m = re.search(rf'"{name}"\s*:\s*"([^"]*)"', wrangler)
    return m.group(1) if m else ""
ph_key = wrangler_var("POSTHOG_KEY")
ph_host = wrangler_var("POSTHOG_HOST") or "https://eu.i.posthog.com"
if not re.fullmatch(r"(phc_[A-Za-z0-9]+)?", ph_key) or not re.fullmatch(r"https://[a-z0-9.-]+", ph_host):
    raise SystemExit("POSTHOG_KEY ou POSTHOG_HOST invalide dans wrangler.jsonc")
measure = (ROOT / "scripts" / "lp-measure.js").read_text(encoding="utf-8")
pixel_ids = wrangler_var("FB_PIXEL_ID").replace(" ", "")
if not re.fullmatch(r"\d+(,\d+)*", pixel_ids):
    raise SystemExit("FB_PIXEL_ID invalide dans wrangler.jsonc")
measure = measure.replace("__POSTHOG_KEY__", ph_key).replace("__POSTHOG_HOST__", ph_host).replace("__FB_PIXEL_IDS__", pixel_ids)
replace_between(
    "<!-- Tracking events are queued immediately",
    "</noscript>",
    "<!-- Mesure : Pixel Meta et PostHog chargés après interaction ou inactivité, avec consentement en Europe. -->\n<script>\n" + measure + "</script>",
)
replace_once("    if(typeof clarity==='function')clarity('event','promo_popup_view_29000');", "    wpCapture('promo_popup_view',{offer:29000});")
replace_once("    if(typeof clarity==='function')clarity('event','promo_popup_dismiss_29000');", "    wpCapture('promo_popup_dismiss',{offer:29000});")
replace_once("    if(typeof clarity==='function'){clarity('set','promo_offer','29000');clarity('event','promo_popup_click_29000');}", "    wpCapture('promo_popup_click',{offer:29000});")
replace_once('<div id="chariow-widget"', '<div id="chariow-widget" class="ph-no-capture"')
assert "clarity" not in s.lower(), "référence Clarity restante"

assert "moneyfusion" not in s.lower(), "référence MoneyFusion restante"
assert "supabase" not in s.lower(), "référence Supabase restante"
assert 'id="bonusSpecial"' in s

# Numéro WhatsApp du support (unique pour tout le site)
replace_once("const WHATSAPP_NUMBER='237653769998';", "const WHATSAPP_NUMBER='237694327885';")
replace_once("const WHATSAPP_NUMBER_DISPLAY='+237 653 76 99 98';", "const WHATSAPP_NUMBER_DISPLAY='+237 694 32 78 85';")

# Nombre de modèles : rempli par src/app/catalogue-premium/route.ts (HTMLRewriter, nombre de modèles publiés en base).
# « 50+ » reste affiché si la base est indisponible ; titre et balises meta sont réécrits par la route.
replace_once("<h1>OBTENEZ 50+ PLANS<br>", "<h1>OBTENEZ <span data-wp-count>50+</span> PLANS<br>")
replace_once("<strong>50+ modèles</strong>", "<strong><span data-wp-count>50+</span> modèles</strong>")
replace_once("<td>Sélection de 50+ plans</td>", "<td>Sélection de <span data-wp-count>50+</span> plans</td>")
replace_once('<div class="pinc">50+ plans', '<div class="pinc"><span data-wp-count>50+</span> plans')
replace_once("Catalogue Premium Wooplans — 50 Plans de Maison", "Catalogue Premium Wooplans — Plans de Maison")

# Prix du catalogue et montants qui en découlent. Source unique : src/config/catalogue.json
# (lue aussi par le site et la VSL) ; prix des plans complets : src/lib/custom-plans.ts.
import json
PRICE = int(json.loads((ROOT / "src" / "config" / "catalogue.json").read_text(encoding="utf-8"))["price"])
PRICE_AFTER_STEP = 60000  # prix au palier de 100 modèles (src/lib/sales-page.ts)
VALUE = 500000  # valeur affichée du catalogue (tableau de valeur)
plan_prices = [int(x) for x in re.findall(r"price: (\d+)", (ROOT / "src" / "lib" / "custom-plans.ts").read_text(encoding="utf-8"))]
if len(plan_prices) != 2 or not 0 < PRICE < PRICE_AFTER_STEP:
    raise SystemExit("prix du catalogue ou des plans complets introuvable ou incohérent")
villa, duplex = plan_prices

def fcfa(n: int, sep: str = " ") -> str:
    return f"{n:,}".replace(",", sep)

PRICE_TOKENS = {
    "{{PRIX}}": fcfa(PRICE),
    "{{PRIX_NBSP}}": fcfa(PRICE, "&nbsp;"),
    "{{PRIX_XAF}}": str(PRICE),
    "{{RESTE_VILLA_NBSP}}": fcfa(villa - PRICE, "&nbsp;"),
    "{{RESTE_DUPLEX_NBSP}}": fcfa(duplex - PRICE, "&nbsp;"),
    "{{REMISE}}": str(round((PRICE_AFTER_STEP - PRICE) / PRICE_AFTER_STEP * 100)),
    "{{PART_VALEUR}}": f"{PRICE / VALUE * 100:.1f}",
    "{{ECONOMIE}}": fcfa(PRICE_AFTER_STEP - PRICE),
    "{{ECONOMIE_VALEUR}}": fcfa(VALUE - PRICE),
    # Repli si la base est indisponible (sinon la route calcule le prix réel par modèle) : 60 modèles et plus.
    "{{PAR_MODELE_MAX}}": str(-(-PRICE // 60 // 50) * 50),
}

def apply_prices(html: str, page: str) -> str:
    for token, value in PRICE_TOKENS.items():
        html = html.replace(token, value)
    if "{{" in html:
        raise SystemExit(f"[{page}] repère de prix non remplacé : " + html[html.index("{{"):][:40])
    return html

s = apply_prices(s, "page A")
out = ROOT / "public" / "lp" / "catalogue-premium.html"
out.write_text(s, encoding="utf-8")
print(f"OK → {out.relative_to(ROOT)} ({len(s)} octets)")

# Variante B (scripts/sales-page-b.py) : servie par /catalogue-premium selon SALES_PAGE_B_SHARE ou ?variante=b
import importlib.util
spec = importlib.util.spec_from_file_location("sales_page_b", ROOT / "scripts" / "sales-page-b.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
b = apply_prices(module.build(s, measure), "variante B")
out_b = ROOT / "public" / "lp" / "catalogue-premium-b.html"
out_b.write_text(b, encoding="utf-8")
print(f"OK → {out_b.relative_to(ROOT)} ({len(b)} octets)")
