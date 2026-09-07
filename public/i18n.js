// public/i18n.js — the whole site's translation dictionary. Loaded before
// the main <script> in index.html (and NOT used by /destinations/:slug,
// which is French-only for now — see Phase 5 recap).
//
// Two ways this gets applied:
//  1. Static markup: elements carry data-i18n="key" (textContent),
//     data-i18n-placeholder="key" (placeholder attr), or
//     data-i18n-aria="key" (aria-label attr). applyI18n() walks all three.
//  2. Dynamic strings built in JS (card templates, messages) call t('key')
//     directly instead of hardcoding French.
//
// {{var}} in a string is replaced via the `vars` object passed to t().

window.I18N = {
  fr: {
    navComposer: 'Composer',
    navSaved: 'Mes voyages',
    navHow: 'Comment ça marche',
    navLogin: 'Se connecter',
    navLogout: 'Se déconnecter',

    heroEyebrow: 'Séjours composés à la demande — par IA',
    heroH1Start: 'Décrivez le voyage ',
    heroH1Em: "que vous n'avez pas",
    heroH1End: 'encore trouvé les mots pour chercher.',
    heroLede: "Un mood, un budget, une ambiance — une phrase suffit. Peacetrip interroge Claude pour composer l'itinéraire, détaille chaque jour, et vous envoie réserver sur les vrais sites partenaires.",

    panelLabel: 'Racontez votre envie',
    recentSearches: 'Recherches récentes',
    promptPlaceholder: 'Ex. Une semaine au calme au bord de la mer, ambiance romantique, on aime bien manger, budget confortable…',

    chipBeach: 'Plage', chipMountain: 'Montagne', chipCity: 'Ville', chipAdventure: 'Aventure',
    chipRomantic: 'Romantique', chipFamily: 'Famille', chipCulture: 'Culture',

    budgetLow: 'Économique', budgetLowRange: '≈ 700–900€',
    budgetMid: 'Confort', budgetMidRange: '≈ 1100–1500€',
    budgetHigh: 'Signature', budgetHighRange: '≈ 2000€ et +',

    travelersLabel: 'Voyageurs', nightsLabel: 'Nuits',
    lessTravelers: 'Moins de voyageurs', moreTravelers: 'Plus de voyageurs',
    lessNights: 'Moins de nuits', moreNights: 'Plus de nuits',

    goBtn: 'Tracer mon itinéraire',
    goBtnLoading: "Claude compose l'itinéraire…",
    goHint: '/ pour {{n}} {{person}}, {{nights}} nuits',
    personSingular: 'personne', personPlural: 'personnes',

    resultsEyebrow: 'Itinéraire tracé',
    resultTitleDefault: 'Trois façons de vivre ce voyage',
    resultSubDefault: "Même destination, trois niveaux d'expérience. Choisissez, on s'occupe du reste.",
    resultTitleGenerated: 'Trois destinations pour cette envie',
    resultSubGenerated: 'Claude a retenu {{names}}. Chaque carte a ses 3 formules — basculez librement entre elles, ou personnalisez-en une.',
    sourceFallback: 'Source : sélection de secours (hors ligne)',
    sourceLive: 'Source : généré en direct par Claude',
    errorFallback: "La génération IA n'a pas répondu à temps — voici des destinations de secours pour la démonstration.",
    compareBtn: 'Comparer',
    viewCardsBtn: 'Voir les cartes',
    regenLink: 'Cette destination ne vous tente pas ? Proposer autre chose →',

    rowFormula: 'Formule', rowCountry: 'Pays', rowPrice: 'Prix total', rowHotel: 'Hôtel',
    rowActivities: 'Activités', rowRestaurants: 'Tables suggérées',
    compareActivityCount: '{{n}} activité', compareActivityCountPlural: '{{n}} activités',
    compareRestaurantCount: '{{n}} table', compareRestaurantCountPlural: '{{n}} tables',
    compareDetailLink: 'Voir le détail jour par jour →',

    saveTitle: 'Sauvegarder ce séjour',
    priceTotalNote: 'total estimé',
    hotelSuggested: 'Hôtel suggéré : {{name}} · ~{{price}}€/nuit',
    activitiesBlockLabel: 'Activités', restaurantsBlockLabel: 'Tables suggérées',
    seeLink: 'Voir →',
    theForkBtn: 'Réserver sur TheFork',
    nightsWord: 'nuits', travelerWord: 'voyageur', travelerWordPlural: 'voyageurs',
    customizeFormula: '✎ Personnaliser cette formule',
    closeX: '✕ Fermer',
    refinePlaceholder: 'Ex. enlève la visite du musée, ajoute une activité plus tranquille, hôtel un peu moins cher…',
    remodelBtn: 'Remodeler cette formule',
    remodeling: 'Remodelage en cours…',
    remodelOk: 'Formule mise à jour ✓',
    remodelError: "Le remodelage n'a pas abouti — réessayez dans un instant.",
    dayDetailLink: 'Voir le détail jour par jour',
    bookHotel: "Réserver l'hôtel sur Booking.com",
    searchFlights: 'Chercher les vols',
    priceDisclaimer: 'Prix affiché estimé par IA — à confirmer sur chaque plateforme',

    savedHeading: 'Mes voyages sauvegardés',
    savedSub: "Enregistrés dans ce navigateur — cliquez l'étoile sur une formule pour la garder ici.",
    savedEmpty: 'Aucun séjour sauvegardé pour l’instant.',
    savedUnavailable: 'Sauvegarde indisponible pour le moment.',
    reserveLink: 'Réserver →',
    removeLink: 'Retirer',

    howHeading: 'De la phrase à la valise, en trois temps.',
    step1Title: 'Vous décrivez', step1Text: 'Style, ambiance, budget, voyageurs et nuits — ajustables librement.',
    step2Title: 'Claude compose', step2Text: 'Destination, hôtel, activités, tables — puis un déroulé jour par jour à la demande.',
    step3Title: 'Vous réservez ailleurs', step3Text: "Chaque élément s'ouvre sur le vrai site du partenaire pour finaliser au prix réel.",

    honestyHeading: "Ce que ce site fait vraiment — et ce qu'il ne fait pas encore",
    honestyReal: "<strong>Réel :</strong> la génération, le remodelage d'une formule et le plan jour par jour passent par notre serveur, qui appelle Claude avec une clé API jamais exposée au navigateur. Les photos viennent de Wikipedia — une vraie base géolocalisée, pas un mot-clé approximatif — et la carte est une vraie carte Google Maps. Séjours et historique sont stockés en base de données, liés à un identifiant généré dans votre navigateur.",
    honestyAccount: "<strong>Compte :</strong> optionnel. Sans compte, vos séjours restent liés à ce navigateur et se perdent si vous videz vos données ou changez d'appareil. Avec un compte, ils sont rattachés automatiquement et retrouvables depuis n'importe quel appareil. Mots de passe hashés ; pas encore de mot de passe oublié ni de connexion Google.",
    honestyShare: '<strong>Partage :</strong> "Partager" copie un résumé texte ou ouvre le partage natif de l\'appareil ; l\'export télécharge un .txt. Un vrai <em>lien</em> de partage (peacetrip.com/s/abc123) n\'est pas encore construit.',
    honestyEmail: '<strong>Email :</strong> le bouton envoie un vrai email avec le récapitulatif de la formule, PDF en pièce jointe. L\'adresse est conservée pour vous recontacter ; la case à cocher (décochée par défaut) autorise en plus d\'autres idées de voyage occasionnelles — pas encore de newsletter automatique ni de désinscription en un clic.',
    honestyBuildMore: "<strong>À construire :</strong> réservation en un clic et suivi automatique des commissions — nécessitent des accords d'affiliation officiels avec Booking.com, GetYourGuide, Expedia ou TheFork.",

    footNote: 'Peacetrip vise une commission d\'affiliation sur chaque réservation confirmée via nos liens partenaires — jamais répercutée sur votre prix.',
    footCopyright: '© 2026 Peacetrip — Corentin Friedmann, entreprise individuelle · Mulhouse, France · SIRET : [à compléter après immatriculation]',

    authTabLogin: 'Connexion', authTabSignup: 'Créer un compte',
    authEmailLabel: 'Email', authPasswordLabel: 'Mot de passe',
    authSubmitLogin: 'Se connecter', authSubmitSignup: 'Créer mon compte',
    authNote: 'Un compte est optionnel — sans compte, vos séjours restent enregistrés dans ce navigateur seulement.',
    authGenericError: 'Une erreur est survenue.',
    closeLoginAria: 'Fermer la connexion',

    closeDetailAria: 'Fermer le détail',
    dayComposing: 'Claude compose le déroulé jour par jour…',
    dayError: 'Le déroulé jour par jour n’a pas pu être généré pour le moment. Réessayez dans un instant.',
    restOfTripTitle: 'Le reste du séjour',
    restOfTripDefault: "Le reste du séjour est laissé volontairement libre : profitez de l'hôtel, explorez à votre rythme, et piochez parmi les activités et tables déjà suggérées.",
    dayLabel: 'Jour', daysRangeLabel: 'Jours',
    nightWord: 'nuit', nightWordPlural: 'nuits',
    detailPriceNote: 'Total estimé, hôtel ~{{price}}€/nuit — à confirmer sur chaque plateforme',
    detailMetaHotel: 'Hôtel : {{name}}',
    breakdownTitle: 'Répartition indicative',
    breakdownHotel: 'Hôtel', breakdownFlights: 'Vols (estimé)', breakdownOther: 'Activités & repas (estimé)',
    shareBtn: 'Partager ce séjour', downloadBtn: 'Télécharger en .txt', downloadPdfBtn: 'Télécharger en PDF',
    pdfError: "Le téléchargement du PDF a échoué — réessayez dans un instant.",
    shareTitlePrefix: 'Mon séjour',
    shareNightsLine: '{{nights}} nuits · {{travelers}} voyageur(s)',
    shareHotelLine: 'Hôtel : {{name}} (~{{price}}€/nuit)',
    shareActivitiesLine: 'Activités : {{list}}',
    shareRestaurantsLine: 'Restaurants : {{list}}',
    shareTotalLine: 'Total estimé : {{total}}€',
    shareFooterLine: 'Composé sur Peacetrip — {{url}}',
    shareCopied: 'Récapitulatif copié dans le presse-papiers ✓',
    shareCopyFailed: 'Copie automatique indisponible — sélectionnez le texte manuellement.',
    emailToggleOpen: '✉ Recevoir cet itinéraire par email',
    emailPlaceholder: 'vous@exemple.com',
    emailConsentLabel: 'Je veux aussi recevoir occasionnellement des idées de voyage par email',
    emailSendBtn: 'Envoyer', emailSending: 'Envoi…',
    emailSuccess: 'Itinéraire envoyé ✓ (vérifiez vos spams si besoin)',
    emailErrorGeneric: "L'envoi a échoué — réessayez dans un instant.",

    langToggleAria: 'Switch to English',
    galleryThumbAlt: 'Photo {{n}}'
  },

  en: {
    navComposer: 'Compose',
    navSaved: 'My trips',
    navHow: 'How it works',
    navLogin: 'Log in',
    navLogout: 'Log out',

    heroEyebrow: 'Trips composed on demand — by AI',
    heroH1Start: 'Describe the trip ',
    heroH1Em: "you haven't",
    heroH1End: 'found the words for yet.',
    heroLede: "A mood, a budget, a vibe — one sentence is enough. Peacetrip asks Claude to build the itinerary, breaks down each day, and sends you off to book on the real partner sites.",

    panelLabel: 'Tell us what you want',
    recentSearches: 'Recent searches',
    promptPlaceholder: 'E.g. A quiet week by the sea, romantic mood, we like eating well, comfortable budget…',

    chipBeach: 'Beach', chipMountain: 'Mountains', chipCity: 'City', chipAdventure: 'Adventure',
    chipRomantic: 'Romantic', chipFamily: 'Family', chipCulture: 'Culture',

    budgetLow: 'Budget', budgetLowRange: '≈ $750–950',
    budgetMid: 'Comfort', budgetMidRange: '≈ $1150–1550',
    budgetHigh: 'Signature', budgetHighRange: '≈ $2100 and up',

    travelersLabel: 'Travelers', nightsLabel: 'Nights',
    lessTravelers: 'Fewer travelers', moreTravelers: 'More travelers',
    lessNights: 'Fewer nights', moreNights: 'More nights',

    goBtn: 'Plan my trip',
    goBtnLoading: 'Claude is composing the itinerary…',
    goHint: '/ for {{n}} {{person}}, {{nights}} nights',
    personSingular: 'person', personPlural: 'people',

    resultsEyebrow: 'Itinerary ready',
    resultTitleDefault: 'Three ways to live this trip',
    resultSubDefault: 'Same destination, three levels of experience. Pick one, we handle the rest.',
    resultTitleGenerated: 'Three destinations for this trip',
    resultSubGenerated: 'Claude picked {{names}}. Each card has 3 tiers — switch between them freely, or customize one.',
    sourceFallback: 'Source: backup selection (offline)',
    sourceLive: 'Source: generated live by Claude',
    errorFallback: "The AI generation didn't respond in time — here are backup destinations for the demo.",
    compareBtn: 'Compare',
    viewCardsBtn: 'View cards',
    regenLink: "Not feeling this destination? Suggest something else →",

    rowFormula: 'Tier', rowCountry: 'Country', rowPrice: 'Total price', rowHotel: 'Hotel',
    rowActivities: 'Activities', rowRestaurants: 'Suggested restaurants',
    compareActivityCount: '{{n}} activity', compareActivityCountPlural: '{{n}} activities',
    compareRestaurantCount: '{{n}} restaurant', compareRestaurantCountPlural: '{{n}} restaurants',
    compareDetailLink: 'See the day-by-day plan →',

    saveTitle: 'Save this trip',
    priceTotalNote: 'total estimate',
    hotelSuggested: 'Suggested hotel: {{name}} · ~${{price}}/night',
    activitiesBlockLabel: 'Activities', restaurantsBlockLabel: 'Suggested restaurants',
    seeLink: 'See →',
    theForkBtn: 'Book on TheFork',
    nightsWord: 'nights', travelerWord: 'traveler', travelerWordPlural: 'travelers',
    customizeFormula: '✎ Customize this tier',
    closeX: '✕ Close',
    refinePlaceholder: 'E.g. drop the museum visit, add a more relaxed activity, a slightly cheaper hotel…',
    remodelBtn: 'Reshape this tier',
    remodeling: 'Reshaping…',
    remodelOk: 'Tier updated ✓',
    remodelError: "The reshape didn't go through — try again in a moment.",
    dayDetailLink: 'See the day-by-day plan',
    bookHotel: 'Book the hotel on Booking.com',
    searchFlights: 'Search flights',
    priceDisclaimer: 'Price shown is an AI estimate — confirm on each platform',

    savedHeading: 'My saved trips',
    savedSub: 'Saved in this browser — click the star on a tier to keep it here.',
    savedEmpty: 'No saved trip yet.',
    savedUnavailable: 'Saving is unavailable right now.',
    reserveLink: 'Book →',
    removeLink: 'Remove',

    howHeading: 'From a sentence to a suitcase, in three steps.',
    step1Title: 'You describe', step1Text: 'Style, mood, budget, travelers and nights — freely adjustable.',
    step2Title: 'Claude composes', step2Text: 'Destination, hotel, activities, restaurants — then a day-by-day plan on request.',
    step3Title: 'You book elsewhere', step3Text: 'Each item opens the real partner site to finalize at the real price.',

    honestyHeading: "What this site actually does — and what it doesn't do yet",
    honestyReal: "<strong>Real:</strong> generation, reshaping a tier, and the day-by-day plan all go through our server, which calls Claude with an API key never exposed to the browser. Photos come from Wikipedia — a real geolocated database, not a rough keyword guess — and the map is a real embedded Google Map. Trips and history are stored in a database, tied to an id generated in your browser.",
    honestyAccount: "<strong>Account:</strong> optional. Without one, your trips stay tied to this browser and are lost if you clear your data or switch devices. With an account, they're attached automatically and reachable from any device. Passwords are hashed; no forgot-password recovery or Google login yet.",
    honestyShare: '<strong>Sharing:</strong> "Share" copies a text summary or opens your device\'s native share sheet; the export downloads a .txt file. A real shareable <em>link</em> (peacetrip.com/s/abc123) isn\'t built yet.',
    honestyEmail: '<strong>Email:</strong> the button sends a real email with the tier summary, PDF attached. The address is kept so we can follow up; the checkbox (unchecked by default) additionally allows occasional trip ideas by email — no automatic newsletter or one-click unsubscribe yet.',
    honestyBuildMore: "<strong>Still to build:</strong> one-click booking and automatic commission tracking — both need official affiliate agreements with Booking.com, GetYourGuide, Expedia or TheFork.",

    footNote: "Peacetrip aims for an affiliate commission on every confirmed booking through our partner links — never added on top of your price.",
    footCopyright: '© 2026 Peacetrip — Corentin Friedmann, sole proprietorship · Mulhouse, France · SIRET: [to be completed after registration]',

    authTabLogin: 'Log in', authTabSignup: 'Create account',
    authEmailLabel: 'Email', authPasswordLabel: 'Password',
    authSubmitLogin: 'Log in', authSubmitSignup: 'Create my account',
    authNote: "An account is optional — without one, your trips stay saved in this browser only.",
    authGenericError: 'Something went wrong.',
    closeLoginAria: 'Close login',

    closeDetailAria: 'Close details',
    dayComposing: 'Claude is composing the day-by-day plan…',
    dayError: "The day-by-day plan couldn't be generated right now. Try again in a moment.",
    restOfTripTitle: 'The rest of the trip',
    restOfTripDefault: "The rest of the trip is deliberately left open: enjoy the hotel, explore at your own pace, and pick from the activities and restaurants already suggested.",
    dayLabel: 'Day', daysRangeLabel: 'Days',
    nightWord: 'night', nightWordPlural: 'nights',
    detailPriceNote: 'Total estimate, hotel ~${{price}}/night — confirm on each platform',
    detailMetaHotel: 'Hotel: {{name}}',
    breakdownTitle: 'Indicative breakdown',
    breakdownHotel: 'Hotel', breakdownFlights: 'Flights (estimated)', breakdownOther: 'Activities & meals (estimated)',
    shareBtn: 'Share this trip', downloadBtn: 'Download as .txt', downloadPdfBtn: 'Download as PDF',
    pdfError: "The PDF download failed — try again in a moment.",
    shareTitlePrefix: 'My trip to',
    shareNightsLine: '{{nights}} nights · {{travelers}} traveler(s)',
    shareHotelLine: 'Hotel: {{name}} (~${{price}}/night)',
    shareActivitiesLine: 'Activities: {{list}}',
    shareRestaurantsLine: 'Restaurants: {{list}}',
    shareTotalLine: 'Total estimate: ${{total}}',
    shareFooterLine: 'Composed on Peacetrip — {{url}}',
    shareCopied: 'Summary copied to clipboard ✓',
    shareCopyFailed: "Automatic copy isn't available — select the text manually.",
    emailToggleOpen: '✉ Receive this itinerary by email',
    emailPlaceholder: 'you@example.com',
    emailConsentLabel: 'I also want to occasionally receive trip ideas by email',
    emailSendBtn: 'Send', emailSending: 'Sending…',
    emailSuccess: 'Itinerary sent ✓ (check spam if needed)',
    emailErrorGeneric: "Sending failed — try again in a moment.",

    langToggleAria: 'Passer en français',
    galleryThumbAlt: 'Photo {{n}}'
  }
};

window.getLang = function(){
  return localStorage.getItem('peacetrip_lang') === 'en' ? 'en' : 'fr';
};
window.setLang = function(lang){
  localStorage.setItem('peacetrip_lang', lang === 'en' ? 'en' : 'fr');
};
window.t = function(key, vars){
  var lang = window.getLang();
  var dict = window.I18N[lang] || window.I18N.fr;
  var str = dict[key] != null ? dict[key] : (window.I18N.fr[key] != null ? window.I18N.fr[key] : key);
  if(vars){
    Object.keys(vars).forEach(function(k){
      str = str.split('{{' + k + '}}').join(vars[k]);
    });
  }
  return str;
};
