const en = {
  translation: {
    navbar: {
      login: 'Login',
      signup: 'Sign Up',
      logout: 'Logout',
      marketplace: 'Marketplace',
      myListings: 'My Listings',
      priceHistory: 'Price History',
      pricePrediction: 'Price Prediction',
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
      price: 'Price per kg (â‚¹) *',
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
      loading: 'Fetching price dataâ€¦',
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
      loadingStats: 'Loading statisticsâ€¦',
      importInstructions: 'Import Instructions',
      cliNote: 'Run the following command in your terminal to import all CSV data into MongoDB:',
      cliDuration: 'â± This may take several minutes depending on your machine.',
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
      navbar: { login: 'à¤²à¥‰à¤— à¤‡à¤¨ à¤•à¤°à¥‡à¤‚', signup: 'à¤¸à¤¾à¤‡à¤¨ à¤…à¤ª à¤•à¤°à¥‡à¤‚', logout: 'à¤²à¥‰à¤— à¤†à¤‰à¤Ÿ', marketplace: 'à¤¬à¤¾à¤œà¤¼à¤¾à¤°', myListings: 'à¤®à¥‡à¤°à¥€ à¤²à¤¿à¤¸à¥à¤Ÿà¤¿à¤‚à¤—' },
      dashboard: { title: 'à¤¡à¥ˆà¤¶à¤¬à¥‹à¤°à¥à¤¡', subtitle: 'à¤­à¥‚à¤®à¤¿à¤•à¤¾:', welcome: 'à¤¸à¥à¤µà¤¾à¤—à¤¤ à¤¹à¥ˆà¥¤ à¤­à¤µà¤¿à¤·à¥à¤¯ à¤•à¥€ à¤¸à¥à¤µà¤¿à¤§à¤¾à¤à¤ à¤¯à¤¹à¤¾à¤ à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¹à¥‹à¤‚à¤—à¥€à¥¤' },
      marketplace: {
        findCrops: 'à¤«à¤¸à¤²à¥‡à¤‚ à¤–à¥‹à¤œà¥‡à¤‚', searchCrop: 'à¤«à¤¸à¤² à¤–à¥‹à¤œà¥‡à¤‚', searchPlaceholder: 'à¤œà¥ˆà¤¸à¥‡ à¤—à¥‡à¤¹à¥‚à¤', minQty: 'à¤¨à¥à¤¯à¥‚à¤¨à¤¤à¤® à¤®à¤¾à¤¤à¥à¤°à¤¾ (à¤•à¤¿à¤—à¥à¤°à¤¾)',
        maxPrice: 'à¤…à¤§à¤¿à¤•à¤¤à¤® à¤®à¥‚à¤²à¥à¤¯ (à¤ªà¥à¤°à¤¤à¤¿ à¤•à¤¿à¤—à¥à¤°à¤¾)', filter: 'à¤«à¤¼à¤¿à¤²à¥à¤Ÿà¤°', loading: 'à¤«à¤¸à¤²à¥‡à¤‚ à¤²à¥‹à¤¡ à¤¹à¥‹ à¤°à¤¹à¥€ à¤¹à¥ˆà¤‚...',
        noCrops: 'à¤†à¤ªà¤•à¥‡ à¤®à¤¾à¤¨à¤¦à¤‚à¤¡à¥‹à¤‚ à¤¸à¥‡ à¤®à¥‡à¤² à¤–à¤¾à¤¨à¥‡ à¤µà¤¾à¤²à¥€ à¤•à¥‹à¤ˆ à¤«à¤¸à¤² à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¥€à¥¤', price: 'à¤®à¥‚à¤²à¥à¤¯', quantity: 'à¤®à¤¾à¤¤à¥à¤°à¤¾',
        noDescription: 'à¤•à¥‹à¤ˆ à¤µà¤¿à¤µà¤°à¤£ à¤¨à¤¹à¥€à¤‚ à¤¦à¤¿à¤¯à¤¾ à¤—à¤¯à¤¾à¥¤', farmer: 'à¤•à¤¿à¤¸à¤¾à¤¨', contactFarmer: 'à¤•à¤¿à¤¸à¤¾à¤¨ à¤¸à¥‡ à¤¸à¤‚à¤ªà¤°à¥à¤• à¤•à¤°à¥‡à¤‚'
      },
      myListings: {
        editListing: 'à¤²à¤¿à¤¸à¥à¤Ÿà¤¿à¤‚à¤— à¤¸à¤‚à¤ªà¤¾à¤¦à¤¿à¤¤ à¤•à¤°à¥‡à¤‚', createNewListing: 'à¤¨à¤ˆ à¤²à¤¿à¤¸à¥à¤Ÿà¤¿à¤‚à¤— à¤¬à¤¨à¤¾à¤à¤', updateSubtitle: 'à¤…à¤ªà¤¨à¥€ à¤«à¤¸à¤² à¤•à¤¾ à¤µà¤¿à¤µà¤°à¤£ à¤…à¤ªà¤¡à¥‡à¤Ÿ à¤•à¤°à¥‡à¤‚',
        createSubtitle: 'à¤–à¤°à¥€à¤¦à¤¾à¤°à¥‹à¤‚ à¤•à¥‡ à¤²à¤¿à¤ à¤…à¤ªà¤¨à¥€ à¤«à¤¸à¤²à¥‹à¤‚ à¤•à¥€ à¤¸à¥‚à¤šà¥€ à¤¬à¤¨à¤¾à¤à¤‚', cropName: 'à¤«à¤¸à¤² à¤•à¤¾ à¤¨à¤¾à¤® *', quantity: 'à¤®à¤¾à¤¤à¥à¤°à¤¾ (à¤•à¤¿à¤—à¥à¤°à¤¾) *',
        price: 'à¤®à¥‚à¤²à¥à¤¯ à¤ªà¥à¤°à¤¤à¤¿ à¤•à¤¿à¤—à¥à¤°à¤¾ (â‚¹) *', location: 'à¤¸à¥à¤¥à¤¾à¤¨ *', description: 'à¤µà¤¿à¤µà¤°à¤£ (à¤µà¥ˆà¤•à¤²à¥à¤ªà¤¿à¤•)', cropImage: 'à¤«à¤¸à¤² à¤•à¥€ à¤›à¤µà¤¿ (à¤µà¥ˆà¤•à¤²à¥à¤ªà¤¿à¤•)',
        updateBtn: 'à¤²à¤¿à¤¸à¥à¤Ÿà¤¿à¤‚à¤— à¤…à¤ªà¤¡à¥‡à¤Ÿ à¤•à¤°à¥‡à¤‚', postBtn: 'à¤²à¤¿à¤¸à¥à¤Ÿà¤¿à¤‚à¤— à¤ªà¥‹à¤¸à¥à¤Ÿ à¤•à¤°à¥‡à¤‚', cancelBtn: 'à¤°à¤¦à¥à¤¦ à¤•à¤°à¥‡à¤‚', myListedCrops: 'à¤®à¥‡à¤°à¥€ à¤¸à¥‚à¤šà¥€à¤¬à¤¦à¥à¤§ à¤«à¤¸à¤²à¥‡à¤‚',
        loading: 'à¤²à¥‹à¤¡ à¤¹à¥‹ à¤°à¤¹à¤¾ à¤¹à¥ˆ...', noCropsYet: 'à¤†à¤ªà¤¨à¥‡ à¤…à¤­à¥€ à¤¤à¤• à¤•à¥‹à¤ˆ à¤«à¤¸à¤² à¤¸à¥‚à¤šà¥€à¤¬à¤¦à¥à¤§ à¤¨à¤¹à¥€à¤‚ à¤•à¥€ à¤¹à¥ˆà¥¤', editBtn: 'à¤¸à¤‚à¤ªà¤¾à¤¦à¤¿à¤¤ à¤•à¤°à¥‡à¤‚'
      },
      auth: {
        welcomeBack: 'à¤µà¤¾à¤ªà¤¸à¥€ à¤ªà¤° à¤¸à¥à¤µà¤¾à¤—à¤¤ à¤¹à¥ˆ', signInSubtitle: 'à¤…à¤ªà¤¨à¥‡ à¤¡à¤¿à¤œà¤¿à¤Ÿà¤² à¤à¤ªà¥€à¤à¤®à¤¸à¥€ à¤–à¤¾à¤¤à¥‡ à¤®à¥‡à¤‚ à¤¸à¤¾à¤‡à¤¨ à¤‡à¤¨ à¤•à¤°à¥‡à¤‚', phone: 'à¤«à¤¼à¥‹à¤¨ à¤¨à¤‚à¤¬à¤°',
        phonePlaceholder: 'à¤…à¤ªà¤¨à¤¾ à¤«à¤¼à¥‹à¤¨ à¤¨à¤‚à¤¬à¤° à¤¦à¤°à¥à¤œ à¤•à¤°à¥‡à¤‚', password: 'à¤ªà¤¾à¤¸à¤µà¤°à¥à¤¡', passwordPlaceholderLogin: 'à¤…à¤ªà¤¨à¤¾ à¤ªà¤¾à¤¸à¤µà¤°à¥à¤¡ à¤¦à¤°à¥à¤œ à¤•à¤°à¥‡à¤‚',
        passwordPlaceholderSignup: 'à¤à¤• à¤®à¤œà¤¬à¥‚à¤¤ à¤ªà¤¾à¤¸à¤µà¤°à¥à¤¡ à¤¬à¤¨à¤¾à¤à¤‚', signInBtn: 'à¤¸à¤¾à¤‡à¤¨ à¤‡à¤¨ à¤•à¤°à¥‡à¤‚', noAccount: "à¤•à¥à¤¯à¤¾ à¤†à¤ªà¤•à¥‡ à¤ªà¤¾à¤¸ à¤–à¤¾à¤¤à¤¾ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆ?",
        createOne: 'à¤à¤• à¤¬à¤¨à¤¾à¤à¤', createAccount: 'à¤–à¤¾à¤¤à¤¾ à¤¬à¤¨à¤¾à¤à¤', joinPlatform: 'à¤†à¤œ à¤¹à¥€ à¤¡à¤¿à¤œà¤¿à¤Ÿà¤² à¤à¤ªà¥€à¤à¤®à¤¸à¥€ à¤¸à¥‡ à¤œà¥à¤¡à¤¼à¥‡à¤‚', fullName: 'à¤ªà¥‚à¤°à¤¾ à¤¨à¤¾à¤®',
        namePlaceholder: 'à¤…à¤ªà¤¨à¤¾ à¤ªà¥‚à¤°à¤¾ à¤¨à¤¾à¤® à¤¦à¤°à¥à¤œ à¤•à¤°à¥‡à¤‚', iAmA: 'à¤®à¥ˆà¤‚ à¤à¤•', farmer: 'à¤•à¤¿à¤¸à¤¾à¤¨', businessOwner: 'à¤µà¥à¤¯à¤¾à¤ªà¤¾à¤°à¥€', signUpBtn: 'à¤¸à¤¾à¤‡à¤¨ à¤…à¤ª à¤•à¤°à¥‡à¤‚',
        haveAccount: 'à¤•à¥à¤¯à¤¾ à¤†à¤ªà¤•à¥‡ à¤ªà¤¾à¤¸ à¤ªà¤¹à¤²à¥‡ à¤¸à¥‡ à¤–à¤¾à¤¤à¤¾ à¤¹à¥ˆ?', signInLink: 'à¤¸à¤¾à¤‡à¤¨ à¤‡à¤¨ à¤•à¤°à¥‡à¤‚'
      }
    }
  },
  mr: {
    translation: {
      navbar: { login: 'à¤²à¥‰à¤—à¤¿à¤¨ à¤•à¤°à¤¾', signup: 'à¤¸à¤¾à¤‡à¤¨ à¤…à¤ª à¤•à¤°à¤¾', logout: 'à¤²à¥‰à¤—à¤†à¤‰à¤Ÿ', marketplace: 'à¤¬à¤¾à¤œà¤¾à¤°', myListings: 'à¤®à¤¾à¤à¥€ à¤¯à¤¾à¤¦à¥€' },
      dashboard: { title: 'à¤¡à¥…à¤¶à¤¬à¥‹à¤°à¥à¤¡', subtitle: 'à¤­à¥‚à¤®à¤¿à¤•à¤¾:', welcome: 'à¤¸à¥à¤µà¤¾à¤—à¤¤ à¤†à¤¹à¥‡. à¤­à¤µà¤¿à¤·à¥à¤¯à¤¾à¤¤à¥€à¤² à¤µà¥ˆà¤¶à¤¿à¤·à¥à¤Ÿà¥à¤¯à¥‡ à¤¯à¥‡à¤¥à¥‡ à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤…à¤¸à¤¤à¥€à¤².' },
      marketplace: {
        findCrops: 'à¤ªà¤¿à¤•à¥‡ à¤¶à¥‹à¤§à¤¾', searchCrop: 'à¤ªà¥€à¤• à¤¶à¥‹à¤§à¤¾', searchPlaceholder: 'à¤‰à¤¦à¤¾. à¤—à¤¹à¥‚', minQty: 'à¤•à¤¿à¤®à¤¾à¤¨ à¤ªà¥à¤°à¤®à¤¾à¤£ (à¤•à¤¿à¤²à¥‹)',
        maxPrice: 'à¤•à¤®à¤¾à¤² à¤•à¤¿à¤‚à¤®à¤¤ (à¤ªà¥à¤°à¤¤à¤¿ à¤•à¤¿à¤²à¥‹)', filter: 'à¤«à¤¿à¤²à¥à¤Ÿà¤°', loading: 'à¤ªà¤¿à¤•à¥‡ à¤²à¥‹à¤¡ à¤¹à¥‹à¤¤ à¤†à¤¹à¥‡à¤¤...',
        noCrops: 'à¤¤à¥à¤®à¤šà¥à¤¯à¤¾ à¤¨à¤¿à¤•à¤·à¤¾à¤‚à¤¶à¥€ à¤œà¥à¤³à¤£à¤¾à¤°à¥€ à¤ªà¤¿à¤•à¥‡ à¤†à¤¢à¤³à¤²à¥€ à¤¨à¤¾à¤¹à¥€à¤¤.', price: 'à¤•à¤¿à¤‚à¤®à¤¤', quantity: 'à¤ªà¥à¤°à¤®à¤¾à¤£',
        noDescription: 'à¤•à¥‹à¤£à¤¤à¥‡à¤¹à¥€ à¤µà¤°à¥à¤£à¤¨ à¤¦à¤¿à¤²à¥‡à¤²à¥‡ à¤¨à¤¾à¤¹à¥€.', farmer: 'à¤¶à¥‡à¤¤à¤•à¤°à¥€', contactFarmer: 'à¤¶à¥‡à¤¤à¤•à¤±à¥à¤¯à¤¾à¤¶à¥€ à¤¸à¤‚à¤ªà¤°à¥à¤• à¤¸à¤¾à¤§à¤¾'
      },
      myListings: {
        editListing: 'à¤¯à¤¾à¤¦à¥€ à¤¸à¤‚à¤ªà¤¾à¤¦à¤¿à¤¤ à¤•à¤°à¤¾', createNewListing: 'à¤¨à¤µà¥€à¤¨ à¤¯à¤¾à¤¦à¥€ à¤¤à¤¯à¤¾à¤° à¤•à¤°à¤¾', updateSubtitle: 'à¤¤à¥à¤®à¤šà¥‡ à¤ªà¥€à¤• à¤¤à¤ªà¤¶à¥€à¤² à¤…à¤ªà¤¡à¥‡à¤Ÿ à¤•à¤°à¤¾',
        createSubtitle: 'à¤–à¤°à¥‡à¤¦à¥€à¤¦à¤¾à¤°à¤¾à¤‚à¤¸à¤¾à¤ à¥€ à¤¤à¥à¤®à¤šà¥€ à¤ªà¤¿à¤•à¥‡ à¤¸à¥‚à¤šà¥€à¤¬à¤¦à¥à¤§ à¤•à¤°à¤¾', cropName: 'à¤ªà¤¿à¤•à¤¾à¤šà¥‡ à¤¨à¤¾à¤µ *', quantity: 'à¤ªà¥à¤°à¤®à¤¾à¤£ (à¤•à¤¿à¤²à¥‹) *',
        price: 'à¤•à¤¿à¤‚à¤®à¤¤ à¤ªà¥à¤°à¤¤à¤¿ à¤•à¤¿à¤²à¥‹ (â‚¹) *', location: 'à¤¸à¥à¤¥à¤¾à¤¨ *', description: 'à¤µà¤°à¥à¤£à¤¨ (à¤ªà¤°à¥à¤¯à¤¾à¤¯à¥€)', cropImage: 'à¤ªà¤¿à¤•à¤¾à¤šà¥€ à¤ªà¥à¤°à¤¤à¤¿à¤®à¤¾ (à¤ªà¤°à¥à¤¯à¤¾à¤¯à¥€)',
        updateBtn: 'à¤¯à¤¾à¤¦à¥€ à¤…à¤ªà¤¡à¥‡à¤Ÿ à¤•à¤°à¤¾', postBtn: 'à¤¯à¤¾à¤¦à¥€ à¤ªà¥‹à¤¸à¥à¤Ÿ à¤•à¤°à¤¾', cancelBtn: 'à¤°à¤¦à¥à¤¦ à¤•à¤°à¤¾', myListedCrops: 'à¤®à¤¾à¤à¥€ à¤¸à¥‚à¤šà¥€à¤¬à¤¦à¥à¤§ à¤ªà¤¿à¤•à¥‡',
        loading: 'à¤²à¥‹à¤¡ à¤¹à¥‹à¤¤ à¤†à¤¹à¥‡...', noCropsYet: 'à¤¤à¥à¤®à¥à¤¹à¥€ à¤…à¤¦à¥à¤¯à¤¾à¤ª à¤•à¥‹à¤£à¤¤à¥€à¤¹à¥€ à¤ªà¤¿à¤•à¥‡ à¤¸à¥‚à¤šà¥€à¤¬à¤¦à¥à¤§ à¤•à¥‡à¤²à¥‡à¤²à¥€ à¤¨à¤¾à¤¹à¥€à¤¤.', editBtn: 'à¤¸à¤‚à¤ªà¤¾à¤¦à¤¿à¤¤ à¤•à¤°à¤¾'
      },
      auth: {
        welcomeBack: 'à¤ªà¥à¤¨à¥à¤¹à¤¾ à¤¸à¥à¤µà¤¾à¤—à¤¤ à¤†à¤¹à¥‡', signInSubtitle: 'à¤¤à¥à¤®à¤šà¥à¤¯à¤¾ à¤¡à¤¿à¤œà¤¿à¤Ÿà¤² à¤à¤ªà¥€à¤à¤®à¤¸à¥€ à¤–à¤¾à¤¤à¥à¤¯à¤¾à¤¤ à¤¸à¤¾à¤‡à¤¨ à¤‡à¤¨ à¤•à¤°à¤¾', phone: 'à¤«à¥‹à¤¨ à¤¨à¤‚à¤¬à¤°',
        phonePlaceholder: 'à¤¤à¥à¤®à¤šà¤¾ à¤«à¥‹à¤¨ à¤¨à¤‚à¤¬à¤° à¤Ÿà¤¾à¤•à¤¾', password: 'à¤ªà¤¾à¤¸à¤µà¤°à¥à¤¡', passwordPlaceholderLogin: 'à¤¤à¥à¤®à¤šà¤¾ à¤ªà¤¾à¤¸à¤µà¤°à¥à¤¡ à¤Ÿà¤¾à¤•à¤¾',
        passwordPlaceholderSignup: 'à¤à¤• à¤®à¤œà¤¬à¥‚à¤¤ à¤ªà¤¾à¤¸à¤µà¤°à¥à¤¡ à¤¤à¤¯à¤¾à¤° à¤•à¤°à¤¾', signInBtn: 'à¤¸à¤¾à¤‡à¤¨ à¤‡à¤¨ à¤•à¤°à¤¾', noAccount: "à¤–à¤¾à¤¤à¥‡ à¤¨à¤¾à¤¹à¥€?",
        createOne: 'à¤à¤• à¤¤à¤¯à¤¾à¤° à¤•à¤°à¤¾', createAccount: 'à¤–à¤¾à¤¤à¥‡ à¤¤à¤¯à¤¾à¤° à¤•à¤°à¤¾', joinPlatform: 'à¤†à¤œà¤š à¤¡à¤¿à¤œà¤¿à¤Ÿà¤² à¤à¤ªà¥€à¤à¤®à¤¸à¥€ à¤ªà¥à¤²à¥…à¤Ÿà¤«à¥‰à¤°à¥à¤®à¤µà¤° à¤¸à¤¾à¤®à¥€à¤² à¤µà¥à¤¹à¤¾',
        fullName: 'à¤ªà¥‚à¤°à¥à¤£ à¤¨à¤¾à¤µ', namePlaceholder: 'à¤¤à¥à¤®à¤šà¥‡ à¤ªà¥‚à¤°à¥à¤£ à¤¨à¤¾à¤µ à¤Ÿà¤¾à¤•à¤¾', iAmA: 'à¤®à¥€ à¤à¤•', farmer: 'à¤¶à¥‡à¤¤à¤•à¤°à¥€', businessOwner: 'à¤µà¥à¤¯à¤¾à¤ªà¤¾à¤°à¥€',
        signUpBtn: 'à¤¸à¤¾à¤‡à¤¨ à¤…à¤ª à¤•à¤°à¤¾', haveAccount: 'à¤†à¤§à¥€à¤ªà¤¾à¤¸à¥‚à¤¨à¤š à¤–à¤¾à¤¤à¥‡ à¤†à¤¹à¥‡?', signInLink: 'à¤¸à¤¾à¤‡à¤¨ à¤‡à¤¨ à¤•à¤°à¤¾'
      }
    }
  },
  gu: {
    translation: {
      navbar: { login: 'àª²à«‰àª—àª¿àª¨', signup: 'àª¸àª¾àª‡àª¨ àª…àªª', logout: 'àª²à«‰àª—àª†àª‰àªŸ', marketplace: 'àª¬àªœàª¾àª°', myListings: 'àª®àª¾àª°à«€ àª¸à«‚àªšàª¿àª“' },
      dashboard: { title: 'àª¡à«‡àª¶àª¬à«‹àª°à«àª¡', subtitle: 'àª­à«‚àª®àª¿àª•àª¾:', welcome: 'àª¸à«àªµàª¾àª—àª¤ àª›à«‡. àª­àªµàª¿àª·à«àª¯àª¨à«€ àª¸à«àªµàª¿àª§àª¾àª“ àª…àª¹à«€àª‚ àª‰àªªàª²àª¬à«àª§ àª¥àª¶à«‡.' },
      marketplace: {
        findCrops: 'àªªàª¾àª• àª¶à«‹àª§à«‹', searchCrop: 'àªªàª¾àª• àª¶à«‹àª§à«‹', searchPlaceholder: 'àª¦àª¾.àª¤. àª˜àª‰àª‚', minQty: 'àª¨à«àª¯à«‚àª¨àª¤àª® àªœàª¥à«àª¥à«‹ (àª•àª¿àª²à«‹)',
        maxPrice: 'àª®àª¹àª¤à«àª¤àª® àª•àª¿àª‚àª®àª¤ (àªªà«àª°àª¤àª¿ àª•àª¿àª²à«‹)', filter: 'àª«àª¿àª²à«àªŸàª°', loading: 'àªªàª¾àª• àª²à«‹àª¡ àª¥àªˆ àª°àª¹à«àª¯àª¾ àª›à«‡...',
        noCrops: 'àª¤àª®àª¾àª°àª¾ àª®àª¾àªªàª¦àª‚àª¡àª¨à«‡ àª…àª¨à«àª°à«‚àªª àª•à«‹àªˆ àªªàª¾àª• àª®àª³à«àª¯à«‹ àª¨àª¥à«€.', price: 'àª•àª¿àª‚àª®àª¤', quantity: 'àªœàª¥à«àª¥à«‹',
        noDescription: 'àª•à«‹àªˆ àªµàª°à«àª£àª¨ àª†àªªà«‡àª² àª¨àª¥à«€.', farmer: 'àª–à«‡àª¡à«‚àª¤', contactFarmer: 'àª–à«‡àª¡à«‚àª¤àª¨à«‹ àª¸àª‚àªªàª°à«àª• àª•àª°à«‹'
      },
      myListings: {
        editListing: 'àª¸à«‚àªšàª¿ àª¸àª‚àªªàª¾àª¦àª¿àª¤ àª•àª°à«‹', createNewListing: 'àª¨àªµà«€ àª¸à«‚àªšàª¿ àª¬àª¨àª¾àªµà«‹', updateSubtitle: 'àª¤àª®àª¾àª°àª¾ àªªàª¾àª•àª¨à«€ àªµàª¿àª—àª¤à«‹ àª…àªªàª¡à«‡àªŸ àª•àª°à«‹',
        createSubtitle: 'àª–àª°à«€àª¦àª¦àª¾àª°à«‹ àª®àª¾àªŸà«‡ àª¤àª®àª¾àª°àª¾ àªªàª¾àª•àª¨à«€ àª¸à«‚àªšàª¿ àª¬àª¨àª¾àªµà«‹', cropName: 'àªªàª¾àª•àª¨à«àª‚ àª¨àª¾àª® *', quantity: 'àªœàª¥à«àª¥à«‹ (àª•àª¿àª²à«‹) *',
        price: 'àª•àª¿àª‚àª®àª¤ àªªà«àª°àª¤àª¿ àª•àª¿àª²à«‹ (â‚¹) *', location: 'àª¸à«àª¥àª¾àª¨ *', description: 'àªµàª°à«àª£àª¨ (àªµà«ˆàª•àª²à«àªªàª¿àª•)', cropImage: 'àªªàª¾àª•àª¨à«€ àª›àª¬à«€ (àªµà«ˆàª•àª²à«àªªàª¿àª•)',
        updateBtn: 'àª¸à«‚àªšàª¿ àª…àªªàª¡à«‡àªŸ àª•àª°à«‹', postBtn: 'àª¸à«‚àªšàª¿ àªªà«‹àª¸à«àªŸ àª•àª°à«‹', cancelBtn: 'àª°àª¦ àª•àª°à«‹', myListedCrops: 'àª®àª¾àª°àª¾ àª¸à«‚àªšàª¿àª¬àª¦à«àª§ àªªàª¾àª•à«‹',
        loading: 'àª²à«‹àª¡ àª¥àªˆ àª°àª¹à«àª¯à«àª‚ àª›à«‡...', noCropsYet: 'àª¤àª®à«‡ àª¹àªœà« àª¸à«àª§à«€ àª•à«‹àªˆ àªªàª¾àª• àª¸à«‚àªšàª¿àª¬àª¦à«àª§ àª•àª°à«àª¯à«‹ àª¨àª¥à«€.', editBtn: 'àª¸àª‚àªªàª¾àª¦àª¿àª¤ àª•àª°à«‹'
      },
      auth: {
        welcomeBack: 'àª«àª°à«€àª¥à«€ àª¸à«àªµàª¾àª—àª¤ àª›à«‡', signInSubtitle: 'àª¤àª®àª¾àª°àª¾ àª¡àª¿àªœàª¿àªŸàª² APMC àªàª•àª¾àª‰àª¨à«àªŸàª®àª¾àª‚ àª¸àª¾àª‡àª¨ àª‡àª¨ àª•àª°à«‹', phone: 'àª«à«‹àª¨ àª¨àª‚àª¬àª°',
        phonePlaceholder: 'àª¤àª®àª¾àª°à«‹ àª«à«‹àª¨ àª¨àª‚àª¬àª° àª¦àª¾àª–àª² àª•àª°à«‹', password: 'àªªàª¾àª¸àªµàª°à«àª¡', passwordPlaceholderLogin: 'àª¤àª®àª¾àª°à«‹ àªªàª¾àª¸àªµàª°à«àª¡ àª¦àª¾àª–àª² àª•àª°à«‹',
        passwordPlaceholderSignup: 'àª®àªœàª¬à«‚àª¤ àªªàª¾àª¸àªµàª°à«àª¡ àª¬àª¨àª¾àªµà«‹', signInBtn: 'àª¸àª¾àª‡àª¨ àª‡àª¨', noAccount: "àª¶à«àª‚ àªàª•àª¾àª‰àª¨à«àªŸ àª¨àª¥à«€?",
        createOne: 'àªàª• àª¬àª¨àª¾àªµà«‹', createAccount: 'àªàª•àª¾àª‰àª¨à«àªŸ àª¬àª¨àª¾àªµà«‹', joinPlatform: 'àª†àªœà«‡ àªœ àª¡àª¿àªœàª¿àªŸàª² APMC àª¸àª¾àª¥à«‡ àªœà«‹àª¡àª¾àª“',
        fullName: 'àªªà«‚àª°à«àª‚ àª¨àª¾àª®', namePlaceholder: 'àª¤àª®àª¾àª°à«àª‚ àªªà«‚àª°à«àª‚ àª¨àª¾àª® àª¦àª¾àª–àª² àª•àª°à«‹', iAmA: 'àª¹à«àª‚', farmer: 'àª–à«‡àª¡à«‚àª¤', businessOwner: 'àªµà«‡àªªàª¾àª°à«€',
        signUpBtn: 'àª¸àª¾àª‡àª¨ àª…àªª', haveAccount: 'àª¶à«àª‚ àªªàª¹à«‡àª²à«‡àª¥à«€ àªœ àªàª•àª¾àª‰àª¨à«àªŸ àª›à«‡?', signInLink: 'àª¸àª¾àª‡àª¨ àª‡àª¨'
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
  { code: 'as', label: 'à¦…à¦¸à¦®à§€à¦¯à¦¼à¦¾ (Assamese)' },
  { code: 'bn', label: 'à¦¬à¦¾à¦‚à¦²à¦¾ (Bengali)' },
  { code: 'brx', label: 'à¤¬à¤¡à¤¼à¥‹ (Bodo)' },
  { code: 'doi', label: 'à¤¡à¥‹à¤—à¤°à¥€ (Dogri)' },
  { code: 'gu', label: 'àª—à«àªœàª°àª¾àª¤à«€ (Gujarati)' },
  { code: 'hi', label: 'à¤¹à¤¿à¤¨à¥à¤¦à¥€ (Hindi)' },
  { code: 'kn', label: 'à²•à²¨à³à²¨à²¡ (Kannada)' },
  { code: 'ks', label: 'à¤•à¥‰à¤¶à¥à¤° (Kashmiri)' },
  { code: 'kok', label: 'à¤•à¥‹à¤‚à¤•à¤£à¥€ (Konkani)' },
  { code: 'mai', label: 'à¤®à¥ˆà¤¥à¤¿à¤²à¥€ (Maithili)' },
  { code: 'ml', label: 'à´®à´²à´¯à´¾à´³à´‚ (Malayalam)' },
  { code: 'mni', label: 'ê¯ƒê¯¤ê¯‡ê¯©ê¯‚ê¯£ê¯Ÿ (Manipuri)' },
  { code: 'mr', label: 'à¤®à¤°à¤¾à¤ à¥€ (Marathi)' },
  { code: 'ne', label: 'à¤¨à¥‡à¤ªà¤¾à¤²à¥€ (Nepali)' },
  { code: 'or', label: 'à¬“à¬¡à¬¼à¬¿à¬† (Odia)' },
  { code: 'pa', label: 'à¨ªà©°à¨œà¨¾à¨¬à©€ (Punjabi)' },
  { code: 'sa', label: 'à¤¸à¤‚à¤¸à¥à¤•à¥ƒà¤¤à¤®à¥ (Sanskrit)' },
  { code: 'sat', label: 'á±¥á±Ÿá±±á±›á±Ÿá±²á±¤ (Santali)' },
  { code: 'sd', label: 'Ø³Ù†ÚŒÙŠ (Sindhi)' },
  { code: 'ta', label: 'à®¤à®®à®¿à®´à¯ (Tamil)' },
  { code: 'te', label: 'à°¤à±†à°²à±à°—à± (Telugu)' },
  { code: 'ur', label: 'Ø§Ø±Ø¯Ùˆ (Urdu)' }
];
