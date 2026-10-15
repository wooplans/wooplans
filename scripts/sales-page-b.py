"""
Variante B de la page de vente, dérivée de la page A générée (scripts/build-sales-page.py).

Objectif : aligner la promesse sur ce que l'acheteur reçoit vraiment (accès en ligne à
l'espace Premium + fiche PDF de chaque modèle, nouveaux modèles inclus automatiquement),
réduire la friction du paiement Mobile Money et alléger la page sur mobile.
Urgence, avis et prix barré : inchangés (décision du propriétaire).

Zones dynamiques remplies par src/app/catalogue-premium/route.ts (HTMLRewriter, données D1) :
- [data-wp-count] : nombre de modèles publiés ;
- [data-wp-gallery] : rendus de couverture des modèles en vedette du catalogue.
"""

WHATSAPP = "237694327885"
WA_PAYMENT = f"https://wa.me/{WHATSAPP}?text=Bonjour%20WOOPLANS%2C%20j%27ai%20un%20souci%20pour%20payer%20le%20Catalogue%20Premium."
WA_QUESTION = f"https://wa.me/{WHATSAPP}?text=Bonjour%20WOOPLANS%2C%20j%27ai%20une%20question%20sur%20le%20Catalogue%20Premium."
COUNT = '<span data-wp-count>nos</span>'


def build(a: str) -> str:
    s = a

    def rep(old: str, new: str, count: int = 1) -> None:
        nonlocal s
        found = s.count(old)
        if found != count:
            raise SystemExit(f"[variante B] motif attendu {count} fois, trouvé {found} fois : {old[:90]!r}")
        s = s.replace(old, new)

    # ── Suivi : variante B ──
    rep("var WP_VARIANT='a';", "var WP_VARIANT='b';")

    # ── Titre, méta : nombre réel de modèles ──
    rep("<title>50+ Plans de Maisons avec leurs vrais devis | Wooplans</title>",
        "<title>Catalogue Premium : plans de maisons avec leurs vrais devis | Wooplans</title>")
    rep('<meta name="description" content="Accédez à 50+ plans de maisons avec leurs vrais devis, rendus 3D et plans détaillés. Valeur réelle 500 000 FCFA, prix du jour 39 000 FCFA.">',
        '<meta name="description" content="Accès immédiat aux plans de maisons WOOPLANS avec leurs vrais devis, rendus 3D et distributions cotées, sur téléphone. Fiche PDF de chaque modèle. 39 000 FCFA.">')
    rep('content="Catalogue Premium WooPlans : 50+ plans de maisons avec leurs devis"',
        'content="Catalogue Premium WooPlans : plans de maisons avec leurs devis"')
    rep('<link rel="preload" as="image"',
        '<link rel="preconnect" href="https://js.chariowcdn.com" crossorigin>\n<link rel="preload" as="image"')

    # ── Hero : promesse alignée sur le livrable ──
    rep("<h1>OBTENEZ 50+ PLANS<br>AVEC LEURS <span class=\"hl\">VRAIS DEVIS.</span></h1>",
        f"<h1>OBTENEZ {COUNT} PLANS<br>AVEC LEURS <span class=\"hl\">VRAIS DEVIS.</span></h1>")
    rep('<p class="hero-sub">Comparez les modèles, visualisez votre future maison et estimez votre budget avant de lancer votre chantier.</p>',
        '<p class="hero-sub">Accès immédiat sur votre téléphone : comparez les modèles, leurs plans cotés et leurs devis, puis téléchargez la fiche PDF de celui qui vous plaît.</p>')

    # ── Boutons : on obtient un accès, pas un téléchargement de 190 Mo ──
    rep("Télécharger le Catalogue\n", "Obtenir le Catalogue\n", count=3)
    rep("    Télécharger\n  </button>", "    Commander\n  </button>")
    rep("Téléchargement direct</div>", "Accès immédiat</div>", count=2)

    # ── Témoignages vidéo : rien n'est téléchargé avant le clic (3G, coût Worker) ──
    rep("  ['tvid0','tvid1','tvid2','tvid3'].forEach(function(id){",
        "  [].forEach(function(id){ /* variante B : vidéos chargées uniquement au clic */")
    rep('<img class="testi-poster" id="tposter0" alt="">', "")
    rep('<img class="testi-poster" id="tposter1" alt="">', "")
    rep('<img class="testi-poster" id="tposter2" alt="">', "")
    rep('<img class="testi-poster" id="tposter3" alt="">', "")

    # ── Ce que vous recevez ──
    rep("<h2 class=\"r\">Chaque plan que vous recevez <span class=\"ao\">contient...</span></h2>",
        "<h2 class=\"r\">Chaque modèle de votre espace Premium <span class=\"ao\">contient...</span></h2>")
    rep("""      <div class="inside-text"><h3>Devis estimatifs</h3><p>Sachez combien ça coûte vraiment avant de négocier avec les entrepreneurs.</p></div>
    </div>""", """      <div class="inside-text"><h3>Devis estimatifs</h3><p>Sachez combien ça coûte vraiment avant de négocier avec les entrepreneurs.</p></div>
    </div>
    <div class="inside-item r d3">
      <div class="inside-icon">📄</div>
      <div class="inside-text"><h3>Fiche PDF à votre nom</h3><p>Téléchargez la fiche de chaque modèle pour l'imprimer ou la montrer à votre maçon, même sans connexion.</p></div>
    </div>
    <div class="inside-item r">
      <div class="inside-icon">📱</div>
      <div class="inside-text"><h3>Sur votre téléphone, toujours à jour</h3><p>Favoris, comparateur de 3 modèles, et les nouveaux modèles ajoutés automatiquement.</p></div>
    </div>""")

    # ── Galerie : rendus des modèles en vedette (D1), injectés par la route ──
    i = s.find('<div class="models-gallery" aria-label="Aperçu des modèles du Catalogue Premium">')
    j = s.find('<div class="models-gallery-note r">', i)
    if i < 0 or j < 0:
        raise SystemExit("[variante B] galerie introuvable")
    s = s[:i] + '<div class="models-gallery" aria-label="Aperçu des modèles du Catalogue Premium" data-wp-gallery></div>\n    ' + s[j:]
    rep('<div class="models-gallery-note r"><strong>50+ modèles</strong>',
        f'<div class="models-gallery-note r"><strong>{COUNT.replace("nos", "Tous les")} modèles</strong>')
    rep("Chaque modèle est présenté avec ses rendus 3D, son plan et son devis estimatif.",
        "Chaque modèle est présenté avec ses rendus 3D, ses distributions cotées et son devis estimatif.")

    # ── Valeur ──
    rep("<tr><td>Sélection de 50+ plans</td>", f"<tr><td>Sélection de {COUNT} plans</td>")

    # ── Aperçu vidéo : pas de préchargement ──
    rep('controls playsinline preload="metadata" poster="/assets/digital/catalogue-cover.jpg"',
        'controls playsinline preload="none" poster="/assets/digital/catalogue-cover.jpg"')
    rep("Visionnez le catalogue en train d'être feuilleté pour découvrir sa finition premium et la présentation des modèles.",
        "Découvrez la présentation des modèles : rendus, distributions et devis, tels que vous les retrouverez dans votre espace.")

    # ── Garantie : une seule formulation, alignée sur la FAQ ──
    rep("Accédez au catalogue et vérifiez son contenu. Si le produit ne correspond pas à la promesse, contactez notre support sous 7 jours pour demander une solution ou un remboursement.",
        "Accédez au catalogue et vérifiez son contenu. S'il ne vous convient pas, un simple message WhatsApp dans les 7 jours suffit pour être remboursé.")
    rep(f'<a class="support-link whatsapp" href="https://wa.me/{WHATSAPP}" target="_blank" rel="noopener">',
        f'<a class="support-link whatsapp" href="{WA_QUESTION}" data-wa-id="guarantee" target="_blank" rel="noopener">')

    # ── Offre ──
    rep("""        <div class="pinc">Catalogue complet en haute résolution</div>
        <div class="pinc">50+ plans — villas &amp; duplex</div>
        <div class="pinc">Rendus 3D + Plans + Devis estimatifs</div>
        <div class="pinc">Téléchargement immédiat (accès à vie)</div>
        <div class="pinc"><strong>Bonus du jour :</strong>&nbsp; les nouveaux plans ajoutés chaque mois</div>""",
        f"""        <div class="pinc">Accès immédiat à l'espace Premium (à vie)</div>
        <div class="pinc">{COUNT.replace("nos", "Tous les")} modèles — villas &amp; duplex</div>
        <div class="pinc">Rendus 3D + distributions cotées + devis estimatifs</div>
        <div class="pinc">Fiche PDF de chaque modèle, à votre nom</div>
        <div class="pinc"><strong>Bonus du jour :</strong>&nbsp; les nouveaux modèles ajoutés automatiquement</div>""")

    # ── Bonus ──
    rep("Aucun nouveau catalogue à racheter pour profiter des mises à jour envoyées.",
        "Aucun nouveau catalogue à racheter : les nouveaux modèles apparaissent automatiquement dans votre espace Premium.")
    rep('src="/assets/digital/house-model-01.webp"', 'src="/assets/digital/house-model-01-720.webp"')
    rep('src="/assets/digital/house-model-03.webp"', 'src="/assets/digital/house-model-03-720.webp"')
    rep('class="bonus-house one" width="1536" height="1024"', 'class="bonus-house one" width="720" height="480"')
    rep('class="bonus-house two" width="1536" height="1024"', 'class="bonus-house two" width="720" height="480"')

    # ── FAQ : livraison réelle, paiement Mobile Money, échec de paiement ──
    i = s.find('<div class="faq-list" style="margin-top:20px">')
    j = s.find("<!-- FINAL CTA -->", i)
    if i < 0 or j < 0:
        raise SystemExit("[variante B] FAQ introuvable")
    faq = [
        ("Comment commander ?",
         "Touchez « Obtenir le Catalogue », choisissez votre moyen de paiement (Orange Money, MTN MoMo, Wave, Moov, Airtel, carte bancaire…) et validez. Votre code d'accès s'affiche aussitôt."),
        ("Quand vais-je recevoir mon catalogue ?",
         "Immédiatement après le paiement : votre code d'accès personnel s'affiche à l'écran et vous est envoyé par e-mail. Avec votre e-mail et ce code, vous ouvrez votre espace Premium, sur téléphone ou ordinateur, à vie."),
        ("Puis-je télécharger les plans ?",
         "Oui. Chaque modèle se télécharge en fiche PDF : rendus 3D, distributions cotées, pièces et surfaces, devis par lot. La fiche est marquée à votre nom, pour l'imprimer ou la montrer à votre maçon."),
        ("Comment vais-je recevoir les nouveaux plans ?",
         "Ils sont ajoutés automatiquement dans votre espace Premium, avec leur fiche PDF, à vie et sans frais supplémentaires. Rien à racheter, rien à télécharger de nouveau."),
        ("Comment payer avec Mobile Money ?",
         "Gardez votre téléphone en main : après avoir validé, une demande de confirmation arrive (notification ou code USSD). Confirmez-la avec votre code secret dans les 2 minutes. Prévoyez 39 000 FCFA plus les frais de votre opérateur. La carte bancaire est aussi acceptée."),
        ("Mon paiement a échoué, que faire ?",
         f"Si le paiement échoue, rien n'est débité. Causes fréquentes : confirmation non validée à temps, solde insuffisant ou réseau instable. Réessayez, ou <a href=\"{WA_PAYMENT}\" data-wa-id=\"faq_payment\" target=\"_blank\" rel=\"noopener\" style=\"color:var(--teal);font-weight:700\">écrivez-nous sur WhatsApp</a> : nous vous aidons à finaliser."),
        ("Le prix va augmenter ?",
         "Oui. Le tarif spécial de 39 000 FCFA est valable jusqu'à la fin du compte à rebours du jour. Les campagnes promotionnelles peuvent être reconduites, mais le tarif et les conditions peuvent changer."),
        ("Et si je ne suis pas satisfait ?",
         "Un simple message WhatsApp dans les 7 jours et on vous rembourse intégralement. Aucune question posée."),
        ("Les devis sont fiables ?",
         "Ce sont des devis basés sur 10 ans d'expérience dans le BTP. Ils vous donnent une base solide pour négocier avec votre maçon ou votre entrepreneur, à ajuster selon votre ville et vos finitions."),
        ("Le catalogue suffit-il pour construire ?",
         "Il sert à choisir le bon modèle et à connaître son budget. L'adaptation à votre terrain et les plans d'exécution sont une prestation distincte, sur devis ; le prix du catalogue est alors déduit de nos honoraires."),
    ]
    delays = ["", " d1", " d2", ""]
    items = "\n".join(
        f"""    <div class="faq-item r{delays[k % 4]}">
      <button class="faq-btn" onclick="toggleFaq(this)">{q}<span class="faq-chevron">▾</span></button>
      <div class="faq-ans"><div class="faq-ans-inner">{a}</div></div>
    </div>"""
        for k, (q, a) in enumerate(faq)
    )
    s = s[:i] + f'<div class="faq-list" style="margin-top:20px">\n{items}\n  </div>\n</section>\n' + s[j:]

    # ── Appel final ──
    rep('alt="Catalogue Premium Wooplans — 50 Plans de Maison"', 'alt="Catalogue Premium Wooplans"')
    rep('<span class="ag">50 plans.</span> Un seul catalogue.', f'<span class="ag">{COUNT.replace("nos", "Tous nos")} plans.</span> Un seul accès.')
    rep("Accès immédiat après paiement.</p>", "Accès immédiat après paiement, sur votre téléphone.</p>")

    # ── Paiement : widget en français, aide Mobile Money, WhatsApp en cas de souci ──
    rep('data-locale="en"', 'data-locale="fr"')
    rep('<p class="checkout-note">Paiement sécurisé · Catalogue Premium à 39 000 FCFA</p>',
        f"""<p class="checkout-note">Paiement sécurisé · Catalogue Premium à 39 000 FCFA</p>
    <ol class="pay-help">
      <li>Gardez votre téléphone en main.</li>
      <li>Validez la demande de paiement (notification ou code USSD) <strong>dans les 2 minutes</strong>.</li>
      <li>Prévoyez <strong>39 000 FCFA + frais</strong> sur votre compte Mobile Money.</li>
    </ol>""")
    rep("""        data-background-color="#FFFFFF"></div>
  </div>
</div>""", f"""        data-background-color="#FFFFFF"></div>
    <p class="pay-help-wa">Un souci pour payer ? <a href="{WA_PAYMENT}" data-wa-id="payment_help" target="_blank" rel="noopener">Écrivez-nous sur WhatsApp</a></p>
  </div>
</div>""")
    rep("<strong>Catalogue Premium (Téléchargement PDF)</strong>", "<strong>Catalogue Premium (accès en ligne + fiches PDF)</strong>")

    # ── Bouton WhatsApp flottant ──
    rep("<!-- STICKY BAR -->", f"""<a class="wa-float" href="{WA_QUESTION}" data-wa-id="float" target="_blank" rel="noopener" aria-label="Poser une question sur WhatsApp">
  <svg viewBox="0 0 24 24" width="26" height="26" fill="#fff" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>
</a>
<!-- STICKY BAR -->""")

    # ── Styles ajoutés ──
    rep("</style>", """.pay-help{margin:0 6px 14px;padding:12px 14px 12px 32px;background:#FFF7EE;border:1px solid rgba(240,138,46,.35);border-radius:10px;font-size:12.5px;line-height:1.5;color:var(--dark)}
.pay-help li{margin:2px 0}
.pay-help-wa{text-align:center;font-size:12.5px;color:var(--gray);margin:12px 0 2px}
.pay-help-wa a{color:var(--teal);font-weight:700}
.wa-float{position:fixed;right:14px;bottom:86px;z-index:250;width:52px;height:52px;border-radius:50%;background:#25D366;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(0,0,0,.25)}
@media(min-width:1024px){.wa-float{bottom:24px}}
.testi-video{background:linear-gradient(160deg,var(--teal) 0%,var(--teal-dark) 100%)}
</style>""")

    # ── Widget de paiement préchargé pendant les temps morts, widget prêt mesuré ──
    rep("function closeChariowCheckout(event){", """(function(){
  function preload(){ensureChariowWidget().catch(function(){});}
  window.addEventListener('load',function(){
    if('requestIdleCallback' in window)requestIdleCallback(preload,{timeout:6000});else setTimeout(preload,4000);
  },{once:true});
  var target=document.getElementById('chariow-widget');
  var reported=false;
  if(target&&'MutationObserver' in window){
    new MutationObserver(function(){
      if(reported||!target.children.length)return;
      if(document.getElementById('chariowCheckout').classList.contains('active')){reported=true;wpTrack('widget_ready','checkout@b');}
    }).observe(target,{childList:true,subtree:true});
  }
  window.wpWidgetOpened=function(){
    if(!reported&&target&&target.children.length){reported=true;wpTrack('widget_ready','checkout@b');}
  };
})();

function closeChariowCheckout(event){""")
    rep("""  if(closeButton)window.setTimeout(function(){closeButton.focus();},50);""",
        """  if(closeButton)window.setTimeout(function(){closeButton.focus();},50);
  if(window.wpWidgetOpened)window.setTimeout(window.wpWidgetOpened,0);""")

    assert "50+" not in s, "mention « 50+ » restante dans la variante B"
    assert "Télécharger le Catalogue" not in s
    return s
