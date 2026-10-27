const en = {
  translation: {
    navbar: {
      login: 'Login',
      signup: 'Sign Up',
      logout: 'Logout',
      marketplace: 'Marketplace',
      myListings: 'My Listings',
      priceHistory: 'Price History',
      adminPanel: 'Admin Panel',
    },
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Role:',
      welcome: 'Welcome. Future features will be available here.'
    },
    marketplace: {
      findCrops: 'Find Crops',
      searchCrop: 'Search Crop',
      searchPlaceholder: 'e.g. Wheat',
      minQty: 'Min Quantity (kg)',
      maxPrice: 'Max Price (per kg)',
      filter: 'Filter',
      loading: 'Loading crops...',
      noCrops: 'No crops found matching your criteria.',
      price: 'Price',
      quantity: 'Quantity',
      noDescription: 'No description provided.',
      farmer: 'Farmer',
      contactFarmer: 'Contact Farmer'
    },
    myListings: {
      editListing: 'Edit Listing',
      createNewListing: 'Create New Listing',
      updateSubtitle: 'Update your crop details',
      createSubtitle: 'List your crops for buyers',
      cropName: 'Crop Name *',
      quantity: 'Quantity (kg) *',
      price: 'Price per kg (₹) *',
      location: 'Location *',
      description: 'Description (Optional)',
      cropImage: 'Crop Image (Optional)',
      updateBtn: 'Update Listing',
      postBtn: 'Post Listing',
      cancelBtn: 'Cancel',
      myListedCrops: 'My Listed Crops',
      loading: 'Loading...',
      noCropsYet: "You haven't listed any crops yet.",
      editBtn: 'Edit'
    },
    auth: {
      welcomeBack: 'Welcome Back',
      signInSubtitle: 'Sign in to your Digital APMC account',
      phone: 'Phone Number',
      phonePlaceholder: 'Enter your phone number',
      password: 'Password',
      passwordPlaceholderLogin: 'Enter your password',
      passwordPlaceholderSignup: 'Create a strong password',
      signInBtn: 'Sign In',
      noAccount: "Don't have an account?",
      createOne: 'Create one',
      createAccount: 'Create Account',
      joinPlatform: 'Join the Digital APMC platform today',
      fullName: 'Full Name',
      namePlaceholder: 'Enter your full name',
      iAmA: 'I am a',
      farmer: 'Farmer',
      businessOwner: 'Business Owner',
      signUpBtn: 'Sign Up',
      haveAccount: 'Already have an account?',
      signInLink: 'Sign in'
    },
    priceHistory: {
      title: 'Crop Price History',
      subtitle: 'View historical AGMARKNET market prices for any crop',
      commodityGroup: 'Commodity Group',
      commodity: 'Crop / Commodity',
      fromDate: 'From Date',
      toDate: 'To Date',
      state: 'State (Optional)',
      searchBtn: 'Search Prices',
      selectCommodity: 'Please select a commodity before searching.',
      noData: 'No data found for the selected filters. Try a different crop or date range.',
      loading: 'Fetching price data…',
      date: 'Date',
      minPrice: 'Min Price',
      modalPrice: 'Modal Price',
      maxPrice: 'Max Price',
      arrival: 'Arrival',
      markets: 'Markets',
      priceUnit: '(Rs./Quintal)',
      dataPoints: 'data points',
      detailedData: 'Detailed Price Records',
      downloadCSV: 'Download CSV',
    },
    adminPanel: {
      title: 'Admin Panel',
      priceDataManagement: 'Manage AGMARKNET historical price data',
      importStats: 'Import Statistics',
      totalRows: 'Total Records',
      totalGroups: 'Commodity Groups',
      totalStates: 'States Covered',
      dateFrom: 'Earliest Date',
      dateTo: 'Latest Date',
      loadingStats: 'Loading statistics…',
      importInstructions: 'Import Instructions',
      cliNote: 'Run the following command in your terminal to import all CSV data into MongoDB:',
      cliDuration: '⏱ This may take several minutes depending on your machine.',
      actions: 'Actions',
      triggerImport: 'Trigger Re-Import',
      clearData: 'Clear All Price Data',
      refreshStats: 'Refresh Stats',
    }
  }
};

const generateEmptyLang = () => ({
  translation: { ...en.translation }
});

export const resources = {
  en,
  hi: {
    translation: {
      navbar: { login: 'लॉग इन करें', signup: 'साइन अप करें', logout: 'लॉग आउट', marketplace: 'बाज़ार', myListings: 'मेरी लिस्टिंग' },
      dashboard: { title: 'डैशबोर्ड', subtitle: 'भूमिका:', welcome: 'स्वागत है। भविष्य की सुविधाएँ यहाँ उपलब्ध होंगी।' },
      marketplace: {
        findCrops: 'फसलें खोजें', searchCrop: 'फसल खोजें', searchPlaceholder: 'जैसे गेहूँ', minQty: 'न्यूनतम मात्रा (किग्रा)',
        maxPrice: 'अधिकतम मूल्य (प्रति किग्रा)', filter: 'फ़िल्टर', loading: 'फसलें लोड हो रही हैं...',
        noCrops: 'आपके मानदंडों से मेल खाने वाली कोई फसल नहीं मिली।', price: 'मूल्य', quantity: 'मात्रा',
        noDescription: 'कोई विवरण नहीं दिया गया।', farmer: 'किसान', contactFarmer: 'किसान से संपर्क करें'
      },
      myListings: {
        editListing: 'लिस्टिंग संपादित करें', createNewListing: 'नई लिस्टिंग बनाएँ', updateSubtitle: 'अपनी फसल का विवरण अपडेट करें',
        createSubtitle: 'खरीदारों के लिए अपनी फसलों की सूची बनाएं', cropName: 'फसल का नाम *', quantity: 'मात्रा (किग्रा) *',
        price: 'मूल्य प्रति किग्रा (₹) *', location: 'स्थान *', description: 'विवरण (वैकल्पिक)', cropImage: 'फसल की छवि (वैकल्पिक)',
        updateBtn: 'लिस्टिंग अपडेट करें', postBtn: 'लिस्टिंग पोस्ट करें', cancelBtn: 'रद्द करें', myListedCrops: 'मेरी सूचीबद्ध फसलें',
        loading: 'लोड हो रहा है...', noCropsYet: 'आपने अभी तक कोई फसल सूचीबद्ध नहीं की है।', editBtn: 'संपादित करें'
      },
      auth: {
        welcomeBack: 'वापसी पर स्वागत है', signInSubtitle: 'अपने डिजिटल एपीएमसी खाते में साइन इन करें', phone: 'फ़ोन नंबर',
        phonePlaceholder: 'अपना फ़ोन नंबर दर्ज करें', password: 'पासवर्ड', passwordPlaceholderLogin: 'अपना पासवर्ड दर्ज करें',
        passwordPlaceholderSignup: 'एक मजबूत पासवर्ड बनाएं', signInBtn: 'साइन इन करें', noAccount: "क्या आपके पास खाता नहीं है?",
        createOne: 'एक बनाएँ', createAccount: 'खाता बनाएँ', joinPlatform: 'आज ही डिजिटल एपीएमसी से जुड़ें', fullName: 'पूरा नाम',
        namePlaceholder: 'अपना पूरा नाम दर्ज करें', iAmA: 'मैं एक', farmer: 'किसान', businessOwner: 'व्यापारी', signUpBtn: 'साइन अप करें',
        haveAccount: 'क्या आपके पास पहले से खाता है?', signInLink: 'साइन इन करें'
      }
    }
  },
  mr: {
    translation: {
      navbar: { login: 'लॉगिन करा', signup: 'साइन अप करा', logout: 'लॉगआउट', marketplace: 'बाजार', myListings: 'माझी यादी' },
      dashboard: { title: 'डॅशबोर्ड', subtitle: 'भूमिका:', welcome: 'स्वागत आहे. भविष्यातील वैशिष्ट्ये येथे उपलब्ध असतील.' },
      marketplace: {
        findCrops: 'पिके शोधा', searchCrop: 'पीक शोधा', searchPlaceholder: 'उदा. गहू', minQty: 'किमान प्रमाण (किलो)',
        maxPrice: 'कमाल किंमत (प्रति किलो)', filter: 'फिल्टर', loading: 'पिके लोड होत आहेत...',
        noCrops: 'तुमच्या निकषांशी जुळणारी पिके आढळली नाहीत.', price: 'किंमत', quantity: 'प्रमाण',
        noDescription: 'कोणतेही वर्णन दिलेले नाही.', farmer: 'शेतकरी', contactFarmer: 'शेतकऱ्याशी संपर्क साधा'
      },
      myListings: {
        editListing: 'यादी संपादित करा', createNewListing: 'नवीन यादी तयार करा', updateSubtitle: 'तुमचे पीक तपशील अपडेट करा',
        createSubtitle: 'खरेदीदारांसाठी तुमची पिके सूचीबद्ध करा', cropName: 'पिकाचे नाव *', quantity: 'प्रमाण (किलो) *',
        price: 'किंमत प्रति किलो (₹) *', location: 'स्थान *', description: 'वर्णन (पर्यायी)', cropImage: 'पिकाची प्रतिमा (पर्यायी)',
        updateBtn: 'यादी अपडेट करा', postBtn: 'यादी पोस्ट करा', cancelBtn: 'रद्द करा', myListedCrops: 'माझी सूचीबद्ध पिके',
        loading: 'लोड होत आहे...', noCropsYet: 'तुम्ही अद्याप कोणतीही पिके सूचीबद्ध केलेली नाहीत.', editBtn: 'संपादित करा'
      },
      auth: {
        welcomeBack: 'पुन्हा स्वागत आहे', signInSubtitle: 'तुमच्या डिजिटल एपीएमसी खात्यात साइन इन करा', phone: 'फोन नंबर',
        phonePlaceholder: 'तुमचा फोन नंबर टाका', password: 'पासवर्ड', passwordPlaceholderLogin: 'तुमचा पासवर्ड टाका',
        passwordPlaceholderSignup: 'एक मजबूत पासवर्ड तयार करा', signInBtn: 'साइन इन करा', noAccount: "खाते नाही?",
        createOne: 'एक तयार करा', createAccount: 'खाते तयार करा', joinPlatform: 'आजच डिजिटल एपीएमसी प्लॅटफॉर्मवर सामील व्हा',
        fullName: 'पूर्ण नाव', namePlaceholder: 'तुमचे पूर्ण नाव टाका', iAmA: 'मी एक', farmer: 'शेतकरी', businessOwner: 'व्यापारी',
        signUpBtn: 'साइन अप करा', haveAccount: 'आधीपासूनच खाते आहे?', signInLink: 'साइन इन करा'
      }
    }
  },
  gu: {
    translation: {
      navbar: { login: 'લૉગિન', signup: 'સાઇન અપ', logout: 'લૉગઆઉટ', marketplace: 'બજાર', myListings: 'મારી સૂચિઓ' },
      dashboard: { title: 'ડેશબોર્ડ', subtitle: 'ભૂમિકા:', welcome: 'સ્વાગત છે. ભવિષ્યની સુવિધાઓ અહીં ઉપલબ્ધ થશે.' },
      marketplace: {
        findCrops: 'પાક શોધો', searchCrop: 'પાક શોધો', searchPlaceholder: 'દા.ત. ઘઉં', minQty: 'ન્યૂનતમ જથ્થો (કિલો)',
        maxPrice: 'મહત્તમ કિંમત (પ્રતિ કિલો)', filter: 'ફિલ્ટર', loading: 'પાક લોડ થઈ રહ્યા છે...',
        noCrops: 'તમારા માપદંડને અનુરૂપ કોઈ પાક મળ્યો નથી.', price: 'કિંમત', quantity: 'જથ્થો',
        noDescription: 'કોઈ વર્ણન આપેલ નથી.', farmer: 'ખેડૂત', contactFarmer: 'ખેડૂતનો સંપર્ક કરો'
      },
      myListings: {
        editListing: 'સૂચિ સંપાદિત કરો', createNewListing: 'નવી સૂચિ બનાવો', updateSubtitle: 'તમારા પાકની વિગતો અપડેટ કરો',
        createSubtitle: 'ખરીદદારો માટે તમારા પાકની સૂચિ બનાવો', cropName: 'પાકનું નામ *', quantity: 'જથ્થો (કિલો) *',
        price: 'કિંમત પ્રતિ કિલો (₹) *', location: 'સ્થાન *', description: 'વર્ણન (વૈકલ્પિક)', cropImage: 'પાકની છબી (વૈકલ્પિક)',
        updateBtn: 'સૂચિ અપડેટ કરો', postBtn: 'સૂચિ પોસ્ટ કરો', cancelBtn: 'રદ કરો', myListedCrops: 'મારા સૂચિબદ્ધ પાકો',
        loading: 'લોડ થઈ રહ્યું છે...', noCropsYet: 'તમે હજુ સુધી કોઈ પાક સૂચિબદ્ધ કર્યો નથી.', editBtn: 'સંપાદિત કરો'
      },
      auth: {
        welcomeBack: 'ફરીથી સ્વાગત છે', signInSubtitle: 'તમારા ડિજિટલ APMC એકાઉન્ટમાં સાઇન ઇન કરો', phone: 'ફોન નંબર',
        phonePlaceholder: 'તમારો ફોન નંબર દાખલ કરો', password: 'પાસવર્ડ', passwordPlaceholderLogin: 'તમારો પાસવર્ડ દાખલ કરો',
        passwordPlaceholderSignup: 'મજબૂત પાસવર્ડ બનાવો', signInBtn: 'સાઇન ઇન', noAccount: "શું એકાઉન્ટ નથી?",
        createOne: 'એક બનાવો', createAccount: 'એકાઉન્ટ બનાવો', joinPlatform: 'આજે જ ડિજિટલ APMC સાથે જોડાઓ',
        fullName: 'પૂરું નામ', namePlaceholder: 'તમારું પૂરું નામ દાખલ કરો', iAmA: 'હું', farmer: 'ખેડૂત', businessOwner: 'વેપારી',
        signUpBtn: 'સાઇન અપ', haveAccount: 'શું પહેલેથી જ એકાઉન્ટ છે?', signInLink: 'સાઇન ઇન'
      }
    }
  },
  as: generateEmptyLang(),
  bn: generateEmptyLang(),
  brx: generateEmptyLang(),
  doi: generateEmptyLang(),
  kn: generateEmptyLang(),
  ks: generateEmptyLang(),
  kok: generateEmptyLang(),
  mai: generateEmptyLang(),
  ml: generateEmptyLang(),
  mni: generateEmptyLang(),
  ne: generateEmptyLang(),
  or: generateEmptyLang(),
  pa: generateEmptyLang(),
  sa: generateEmptyLang(),
  sat: generateEmptyLang(),
  sd: generateEmptyLang(),
  ta: generateEmptyLang(),
  te: generateEmptyLang(),
  ur: generateEmptyLang()
};

export const languageOptions = [
  { code: 'en', label: 'English' },
  { code: 'as', label: 'অসমীয়া (Assamese)' },
  { code: 'bn', label: 'বাংলা (Bengali)' },
  { code: 'brx', label: 'बड़ो (Bodo)' },
  { code: 'doi', label: 'डोगरी (Dogri)' },
  { code: 'gu', label: 'ગુજરાતી (Gujarati)' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
  { code: 'ks', label: 'कॉशुर (Kashmiri)' },
  { code: 'kok', label: 'कोंकणी (Konkani)' },
  { code: 'mai', label: 'मैथिली (Maithili)' },
  { code: 'ml', label: 'മലയാളം (Malayalam)' },
  { code: 'mni', label: 'ꯃꯤꯇꯩꯂꯣꯟ (Manipuri)' },
  { code: 'mr', label: 'मराठी (Marathi)' },
  { code: 'ne', label: 'नेपाली (Nepali)' },
  { code: 'or', label: 'ଓଡ଼ିଆ (Odia)' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)' },
  { code: 'sa', label: 'संस्कृतम् (Sanskrit)' },
  { code: 'sat', label: 'ᱥᱟᱱᱛᱟᱲᱤ (Santali)' },
  { code: 'sd', label: 'سنڌي (Sindhi)' },
  { code: 'ta', label: 'தமிழ் (Tamil)' },
  { code: 'te', label: 'తెలుగు (Telugu)' },
  { code: 'ur', label: 'اردو (Urdu)' }
];
