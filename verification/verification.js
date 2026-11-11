/* La vérification anti-robot d'ORINDIS — voir index.html.
   Messages vers l'application : {type:'orindis-verif', etat, ...}
     etat 'ok'          jeton   — un jeton à usage unique, prêt
     etat 'interaction'         — Cloudflare demande de cocher la case
     etat 'apres'               — la case a été traitée
     etat 'expire'              — le jeton a expiré (un nouveau suit)
     etat 'erreur'      code    — la vérification a échoué
     etat 'taille'      h       — hauteur du contenu, pour le cadre
   Ordres reçus de l'application : {type:'orindis-verif', ordre:'reinit'}
   — un jeton ne sert qu'une fois : après chaque demande au serveur,
   l'application en demande un nouveau. */
(function(){
  'use strict';
  var CLE_SITE = '0x4AAAAAAF8_EGHnwZ2oL1aF';
  /* Les seules adresses à qui l'on parle, et dont on écoute les ordres :
     l'application installée, sur iPhone et sur Android. */
  var ORIGINES = ['capacitor://localhost', 'https://localhost'];
  var p = new URLSearchParams(location.search);
  var langue = p.get('lang') === 'en' ? 'en' : 'fr';
  var theme = p.get('theme') === 'dark' ? 'dark' : 'light';
  document.documentElement.lang = langue;
  var id = null;

  function dire(m){
    m.type = 'orindis-verif';
    if (window.parent === window) return;
    ORIGINES.forEach(function(o){
      try { window.parent.postMessage(m, o); } catch (e) {}
    });
  }
  function direTaille(){
    dire({etat: 'taille', h: document.body.scrollHeight});
  }

  window.orindisPret = function(){
    try {
      id = turnstile.render('#w', {
        sitekey: CLE_SITE,
        appearance: 'interaction-only',
        language: langue,
        theme: theme,
        size: 'flexible',
        callback: function(j){ dire({etat: 'ok', jeton: j}); },
        'before-interactive-callback': function(){ dire({etat: 'interaction'}); },
        'after-interactive-callback': function(){ dire({etat: 'apres'}); },
        'expired-callback': function(){ dire({etat: 'expire'}); },
        'timeout-callback': function(){ dire({etat: 'erreur', code: 'delai'}); },
        'unsupported-callback': function(){ dire({etat: 'erreur', code: 'non-pris-en-charge'}); },
        'error-callback': function(c){ dire({etat: 'erreur', code: String(c || '')}); return true; }
      });
    } catch (e) {
      dire({etat: 'erreur', code: 'rendu'});
    }
    if (window.ResizeObserver) new ResizeObserver(direTaille).observe(document.body);
    direTaille();
  };

  window.addEventListener('message', function(ev){
    if (ORIGINES.indexOf(ev.origin) === -1) return;
    var d = ev.data;
    if (!d || d.type !== 'orindis-verif' || d.ordre !== 'reinit') return;
    if (id !== null && window.turnstile) {
      try { turnstile.reset(id); } catch (e) { dire({etat: 'erreur', code: 'reinit'}); }
    }
  });

  /* Le script de Cloudflare qui ne se charge pas doit se dire aussi. */
  setTimeout(function(){
    if (!window.turnstile) dire({etat: 'erreur', code: 'script'});
  }, 12000);
})();
