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
    honestyReal: "<strong>Réel :</strong> génération d'itinéraire, remodelage d'une formule et plan jour par jour passent par notre propre serveur, qui appelle Claude avec une clé API tenue côté serveur (jamais exposée au navigateur). Les photos viennent de Wikipedia via ce même serveur — une vraie base de photos géolocalisées, pas du mot-clé approximatif. La carte est une vraie carte Google Maps intégrée. Séjours sauvegardés et historique sont stockés dans une vraie base de données, rattachés à un identifiant généré dans votre navigateur.",
    honestyAccount: "<strong>Compte :</strong> créer un compte (email + mot de passe) est optionnel — sans compte, vos séjours et votre historique restent liés à cet identifiant de navigateur, et vous les perdez si vous videz les données du navigateur ou changez d'appareil. Avec un compte, vos séjours déjà sauvegardés dans ce navigateur sont automatiquement rattachés à votre compte, et retrouvables en vous reconnectant depuis n'importe quel appareil. Les mots de passe sont hashés (jamais stockés en clair) ; il n'y a pas encore de récupération de mot de passe oublié ni de connexion via Google/autre.",
    honestyShare: '<strong>Partage :</strong> le bouton "Partager" copie un récapitulatif texte ou ouvre le partage natif de votre appareil, et l\'export télécharge un fichier .txt. Un vrai <em>lien</em> de partage (peacetrip.com/s/abc123) demanderait de stocker l\'itinéraire à une adresse dédiée — pas encore construit.',
    honestyEmail: '<strong>Email :</strong> le bouton "Recevoir cet itinéraire par email" envoie un vrai email (récapitulatif de la formule) à l\'adresse indiquée. Cette adresse est conservée pour pouvoir vous recontacter à ce sujet ; la case à cocher (décochée par défaut) est le seul cas où vous acceptez aussi de recevoir occasionnellement d\'autres idées de voyage — il n\'y a pas encore de newsletter automatique, ni de désinscription en un clic.',
    honestyBuildMore: "<strong>À construire pour aller plus loin :</strong> réservation en un clic et suivi automatique des commissions, qui demandent des accords d'affiliation officiels avec Booking.com, GetYourGuide, Expedia ou TheFork.",

    footNote: 'Peacetrip vise une commission d\'affiliation sur chaque réservation confirmée via nos liens partenaires — jamais répercutée sur votre prix.',

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
    honestyReal: "<strong>Real:</strong> itinerary generation, reshaping a tier, and the day-by-day plan all go through our own server, which calls Claude with a server-side API key (never exposed to the browser). Photos come from Wikipedia through that same server — a real geolocated photo database, not a rough keyword guess. The map is a real embedded Google Map. Saved trips and search history are stored in a real database, tied to an id generated in your browser.",
    honestyAccount: "<strong>Account:</strong> creating an account (email + password) is optional — without one, your trips and history stay tied to this browser id, and you lose them if you clear your browser data or switch devices. With an account, trips already saved in this browser get automatically attached to it, and are reachable by logging in from any device. Passwords are hashed (never stored in plain text); there's no forgot-password recovery or Google/other login yet.",
    honestyShare: '<strong>Sharing:</strong> the "Share" button copies a text summary or opens your device\'s native share sheet, and the export downloads a .txt file. A real shareable <em>link</em> (peacetrip.com/s/abc123) would need storing the itinerary at a dedicated address — not built yet.',
    honestyEmail: '<strong>Email:</strong> the "Receive this itinerary by email" button sends a real email (tier summary) to the address given. That address is kept so we can follow up about it; the checkbox (unchecked by default) is the only case where you also agree to occasionally receive other trip ideas by email — there\'s no automatic newsletter yet, nor one-click unsubscribe.',
    honestyBuildMore: "<strong>Still to build:</strong> one-click booking and automatic commission tracking, which need official affiliate agreements with Booking.com, GetYourGuide, Expedia or TheFork.",

    footNote: "Peacetrip aims for an affiliate commission on every confirmed booking through our partner links — never added on top of your price.",

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
