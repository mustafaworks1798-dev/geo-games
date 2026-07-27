/* ============================================
   GEO MASTER - Shared Script (script.js)
   Contains: Settings, i18n, Achievements,
   UI Helpers, Ad Loading, Navigation
   ============================================ */

// ============================================
// COUNTRIES DATA LOADER
// ============================================
let allCountries = [];

async function loadCountries() {
    try {
        // Get base path depending on current page location
        const basePath = window.location.pathname.includes('/games/') ? '../' : './';
        const response = await fetch(basePath + 'countries.json');
        const data = await response.json();
        allCountries = data.countries;
        
        // Remove duplicates by code
        const seen = new Set();
        allCountries = allCountries.filter(c => {
            if (seen.has(c.code)) return false;
            seen.add(c.code);
            return true;
        });
        
        return allCountries;
    } catch (error) {
        console.error('Failed to load countries:', error);
        // Fallback empty array
        allCountries = [];
        return allCountries;
    }
}

function getCountryName(country) {
    if (!country) return '';
    const lang = getSetting('lang', 'en');
    if (lang === 'ar') return country.name;
    if (lang === 'fr') return country.nameFr;
    return country.nameEn;
}

function getCapitalName(country) {
    if (!country) return '';
    const lang = getSetting('lang', 'en');
    if (lang === 'ar') return country.capital;
    if (lang === 'fr') return country.capitalFr;
    return country.capitalEn;
}

// ============================================
// SETTINGS MANAGEMENT
// ============================================
const DEFAULT_SETTINGS = {
    lang: 'en',
    theme: 'dark',
    optionsCount: 4,
    difficulty: 'medium',
    timerEnabled: true,
    timerSeconds: 10,
    timerPenalty: 10
};

function getSetting(key, defaultValue) {
    const val = localStorage.getItem('geo_' + key);
    if (val === null) return defaultValue !== undefined ? defaultValue : DEFAULT_SETTINGS[key];
    if (val === 'true') return true;
    if (val === 'false') return false;
    const num = parseInt(val);
    if (!isNaN(num)) return num;
    return val;
}

function setSetting(key, value) {
    localStorage.setItem('geo_' + key, value);
}

function getAllSettings() {
    return {
        lang: getSetting('lang'),
        theme: getSetting('theme'),
        optionsCount: getSetting('optionsCount'),
        difficulty: getSetting('difficulty'),
        timerEnabled: getSetting('timerEnabled'),
        timerSeconds: getSetting('timerSeconds'),
        timerPenalty: getSetting('timerPenalty')
    };
}

// ============================================
// SCORE & STREAKS
// ============================================
function getScore() {
    return parseInt(localStorage.getItem('geo_score')) || 0;
}

function setScore(val) {
    val = Math.max(0, val);
    localStorage.setItem('geo_score', val);
    updateScoreDisplay();
}

function addScore(pts) {
    const settings = getAllSettings();
    // Bonus for 6 options
    if (settings.optionsCount === 6) {
        pts = Math.round(pts * 1.3);
    }
    const current = getScore();
    const wasAboveZero = current > 0;
    setScore(current + pts);
    
    // Check level warning
    if (wasAboveZero && getScore() === 0 && pts < 0) {
        showLevelWarning();
    }
    
    // Track total correct
    if (pts > 0) {
        incrementTotalCorrect();
    }
    
    checkAchievements();
    return getScore();
}

function penalizeScore(pts) {
    return addScore(-Math.abs(pts));
}

function getTotalCorrect() {
    return parseInt(localStorage.getItem('geo_total_correct')) || 0;
}

function setTotalCorrect(val) {
    localStorage.setItem('geo_total_correct', val);
}

function incrementTotalCorrect() {
    setTotalCorrect(getTotalCorrect() + 1);
}

function getBestStreak(gameKey) {
    return parseInt(localStorage.getItem('geo_' + gameKey + '_best')) || 0;
}

function setBestStreak(gameKey, val) {
    localStorage.setItem('geo_' + gameKey + '_best', val);
}

function updateBestStreak(gameKey, currentStreak) {
    const currentBest = getBestStreak(gameKey);
    if (currentStreak > currentBest) {
        setBestStreak(gameKey, currentStreak);
        return true;
    }
    return false;
}

// ============================================
// FAVORITES
// ============================================
function getFavorites() {
    return JSON.parse(localStorage.getItem('geo_favorites') || '[]');
}

function setFavorites(favs) {
    localStorage.setItem('geo_favorites', JSON.stringify(favs));
}

function toggleFavorite(gameId) {
    const favs = getFavorites();
    const idx = favs.indexOf(gameId);
    if (idx >= 0) {
        favs.splice(idx, 1);
    } else {
        favs.push(gameId);
    }
    setFavorites(favs);
    return favs;
}

function isFavorite(gameId) {
    return getFavorites().includes(gameId);
}

// ============================================
// ACHIEVEMENTS
// ============================================
const achievementsDef = [
    { id: 'score_50', icon: '🌱', type: 'score', value: 50, title: {ar:'مبتدئ',en:'Beginner',fr:'Débutant'}, desc: {ar:'احصل على 50 نقطة',en:'Reach 50 points',fr:'Atteindre 50 points'} },
    { id: 'score_200', icon: '⭐', type: 'score', value: 200, title: {ar:'متوسط',en:'Intermediate',fr:'Intermédiaire'}, desc: {ar:'احصل على 200 نقطة',en:'Reach 200 points',fr:'Atteindre 200 points'} },
    { id: 'score_500', icon: '🌟', type: 'score', value: 500, title: {ar:'متقدم',en:'Advanced',fr:'Avancé'}, desc: {ar:'احصل على 500 نقطة',en:'Reach 500 points',fr:'Atteindre 500 points'} },
    { id: 'score_1000', icon: '💎', type: 'score', value: 1000, title: {ar:'خبير',en:'Expert',fr:'Expert'}, desc: {ar:'احصل على 1000 نقطة',en:'Reach 1000 points',fr:'Atteindre 1000 points'} },
    { id: 'score_2500', icon: '👑', type: 'score', value: 2500, title: {ar:'سيد الجغرافيا',en:'Geo Master',fr:'Maître de la Géo'}, desc: {ar:'احصل على 2500 نقطة',en:'Reach 2500 points',fr:'Atteindre 2500 points'} },
    { id: 'score_5000', icon: '🏆', type: 'score', value: 5000, title: {ar:'أسطورة',en:'Legend',fr:'Légende'}, desc: {ar:'احصل على 5000 نقطة',en:'Reach 5000 points',fr:'Atteindre 5000 points'} },
    { id: 'correct_10', icon: '✅', type: 'correct', value: 10, title: {ar:'أول 10',en:'First 10',fr:'Premiers 10'}, desc: {ar:'أجب صح 10 مرات',en:'Get 10 correct answers',fr:'10 bonnes réponses'} },
    { id: 'correct_50', icon: '🔥', type: 'correct', value: 50, title: {ar:'نصف مئة',en:'Half Century',fr:'Demi-siècle'}, desc: {ar:'أجب صح 50 مرة',en:'Get 50 correct answers',fr:'50 bonnes réponses'} },
    { id: 'correct_100', icon: '💯', type: 'correct', value: 100, title: {ar:'مئة صحيحة',en:'Century',fr:'Centenaire'}, desc: {ar:'أجب صح 100 مرة',en:'Get 100 correct answers',fr:'100 bonnes réponses'} },
    { id: 'correct_250', icon: '🎯', type: 'correct', value: 250, title: {ar:'قناص',en:'Sharpshooter',fr:'Tireur d\'élite'}, desc: {ar:'أجب صح 250 مرة',en:'Get 250 correct answers',fr:'250 bonnes réponses'} },
    { id: 'correct_500', icon: '🏅', type: 'correct', value: 500, title: {ar:'بطل الإجابات',en:'Answer Champion',fr:'Champion des réponses'}, desc: {ar:'أجب صح 500 مرة',en:'Get 500 correct answers',fr:'500 bonnes réponses'} },
    { id: 'm2n_5', icon: '🗺️', type: 'streak', mode: 'm2n', value: 5, title: {ar:'خرائط 5',en:'Maps x5',fr:'Cartes x5'}, desc: {ar:'تتابع 5 في خريطة←اسم',en:'5 streak in Map→Name',fr:'Série de 5 Carte→Nom'} },
    { id: 'm2n_10', icon: '🗺️', type: 'streak', mode: 'm2n', value: 10, title: {ar:'خرائط 10',en:'Maps x10',fr:'Cartes x10'}, desc: {ar:'تتابع 10 في خريطة←اسم',en:'10 streak in Map→Name',fr:'Série de 10 Carte→Nom'} },
    { id: 'm2n_20', icon: '🗺️', type: 'streak', mode: 'm2n', value: 20, title: {ar:'خرائط 20',en:'Maps x20',fr:'Cartes x20'}, desc: {ar:'تتابع 20 في خريطة←اسم',en:'20 streak in Map→Name',fr:'Série de 20 Carte→Nom'} },
    { id: 'm2n_50', icon: '🗺️', type: 'streak', mode: 'm2n', value: 50, title: {ar:'خرائط أسطوري',en:'Map Legend',fr:'Légende Cartes'}, desc: {ar:'تتابع 50 في خريطة←اسم',en:'50 streak in Map→Name',fr:'Série de 50 Carte→Nom'} },
    { id: 'n2m_5', icon: '🔤', type: 'streak', mode: 'n2m', value: 5, title: {ar:'أسماء 5',en:'Names x5',fr:'Noms x5'}, desc: {ar:'تتابع 5 في اسم←خريطة',en:'5 streak in Name→Map',fr:'Série de 5 Nom→Carte'} },
    { id: 'n2m_10', icon: '🔤', type: 'streak', mode: 'n2m', value: 10, title: {ar:'أسماء 10',en:'Names x10',fr:'Noms x10'}, desc: {ar:'تتابع 10 في اسم←خريطة',en:'10 streak in Name→Map',fr:'Série de 10 Nom→Carte'} },
    { id: 'n2m_20', icon: '🔤', type: 'streak', mode: 'n2m', value: 20, title: {ar:'أسماء 20',en:'Names x20',fr:'Noms x20'}, desc: {ar:'تتابع 20 في اسم←خريطة',en:'20 streak in Name→Map',fr:'Série de 20 Nom→Carte'} },
    { id: 'n2m_50', icon: '🔤', type: 'streak', mode: 'n2m', value: 50, title: {ar:'أسماء أسطوري',en:'Name Legend',fr:'Légende Noms'}, desc: {ar:'تتابع 50 في اسم←خريطة',en:'50 streak in Name→Map',fr:'Série de 50 Nom→Carte'} },
    { id: 'name_5', icon: '🚩', type: 'streak', mode: 'name', value: 5, title: {ar:'أعلام 5',en:'Flags x5',fr:'Drapeaux x5'}, desc: {ar:'تتابع 5 في تخمين الاسم',en:'5 streak in Guess Name',fr:'Série de 5 Trouver Nom'} },
    { id: 'name_10', icon: '🚩', type: 'streak', mode: 'name', value: 10, title: {ar:'أعلام 10',en:'Flags x10',fr:'Drapeaux x10'}, desc: {ar:'تتابع 10 في تخمين الاسم',en:'10 streak in Guess Name',fr:'Série de 10 Trouver Nom'} },
    { id: 'name_20', icon: '🚩', type: 'streak', mode: 'name', value: 20, title: {ar:'أعلام 20',en:'Flags x20',fr:'Drapeaux x20'}, desc: {ar:'تتابع 20 في تخمين الاسم',en:'20 streak in Guess Name',fr:'Série de 20 Trouver Nom'} },
    { id: 'name_50', icon: '🚩', type: 'streak', mode: 'name', value: 50, title: {ar:'أعلام أسطوري',en:'Flag Legend',fr:'Légende Drapeaux'}, desc: {ar:'تتابع 50 في تخمين الاسم',en:'50 streak in Guess Name',fr:'Série de 50 Trouver Nom'} },
    { id: 'flag_5', icon: '🌐', type: 'streak', mode: 'flag', value: 5, title: {ar:'تخمين علم 5',en:'Flag Hunt x5',fr:'Chasse Drapeau x5'}, desc: {ar:'تتابع 5 في تخمين العلم',en:'5 streak in Guess Flag',fr:'Série de 5 Trouver Drapeau'} },
    { id: 'flag_10', icon: '🌐', type: 'streak', mode: 'flag', value: 10, title: {ar:'تخمين علم 10',en:'Flag Hunt x10',fr:'Chasse Drapeau x10'}, desc: {ar:'تتابع 10 في تخمين العلم',en:'10 streak in Guess Flag',fr:'Série de 10 Trouver Drapeau'} },
    { id: 'flag_20', icon: '🌐', type: 'streak', mode: 'flag', value: 20, title: {ar:'تخمين علم 20',en:'Flag Hunt x20',fr:'Chasse Drapeau x20'}, desc: {ar:'تتابع 20 في تخمين العلم',en:'20 streak in Guess Flag',fr:'Série de 20 Trouver Drapeau'} },
    { id: 'flag_50', icon: '🌐', type: 'streak', mode: 'flag', value: 50, title: {ar:'علم أسطوري',en:'Flag Legend',fr:'Légende Drapeaux'}, desc: {ar:'تتابع 50 في تخمين العلم',en:'50 streak in Guess Flag',fr:'Série de 50 Trouver Drapeau'} },
    { id: 'riddle_5', icon: '🧩', type: 'streak', mode: 'riddle', value: 5, title: {ar:'ألغاز 5',en:'Riddles x5',fr:'Énigmes x5'}, desc: {ar:'تتابع 5 في اللغز',en:'5 streak in Emoji Riddle',fr:'Série de 5 Énigme'} },
    { id: 'riddle_10', icon: '🧩', type: 'streak', mode: 'riddle', value: 10, title: {ar:'ألغاز 10',en:'Riddles x10',fr:'Énigmes x10'}, desc: {ar:'تتابع 10 في اللغز',en:'10 streak in Emoji Riddle',fr:'Série de 10 Énigme'} },
    { id: 'riddle_20', icon: '🧩', type: 'streak', mode: 'riddle', value: 20, title: {ar:'ألغاز 20',en:'Riddles x20',fr:'Énigmes x20'}, desc: {ar:'تتابع 20 في اللغز',en:'20 streak in Emoji Riddle',fr:'Série de 20 Énigme'} },
    { id: 'riddle_50', icon: '🧩', type: 'streak', mode: 'riddle', value: 50, title: {ar:'لغز أسطوري',en:'Riddle Legend',fr:'Légende Énigmes'}, desc: {ar:'تتابع 50 في اللغز',en:'50 streak in Emoji Riddle',fr:'Série de 50 Énigme'} },
    { id: 'cap2c_5', icon: '🏛️', type: 'streak', mode: 'cap2c', value: 5, title: {ar:'عواصم 5',en:'Capitals x5',fr:'Capitales x5'}, desc: {ar:'تتابع 5 في عاصمة←دولة',en:'5 streak in Capital→Country',fr:'Série de 5 Capitale→Pays'} },
    { id: 'cap2c_10', icon: '🏛️', type: 'streak', mode: 'cap2c', value: 10, title: {ar:'عواصم 10',en:'Capitals x10',fr:'Capitales x10'}, desc: {ar:'تتابع 10 في عاصمة←دولة',en:'10 streak in Capital→Country',fr:'Série de 10 Capitale→Pays'} },
    { id: 'cap2c_20', icon: '🏛️', type: 'streak', mode: 'cap2c', value: 20, title: {ar:'عواصم 20',en:'Capitals x20',fr:'Capitales x20'}, desc: {ar:'تتابع 20 في عاصمة←دولة',en:'20 streak in Capital→Country',fr:'Série de 20 Capitale→Pays'} },
    { id: 'cap2c_50', icon: '🏛️', type: 'streak', mode: 'cap2c', value: 50, title: {ar:'عواصم أسطوري',en:'Capital Legend',fr:'Légende Capitales'}, desc: {ar:'تتابع 50 في عاصمة←دولة',en:'50 streak in Capital→Country',fr:'Série de 50 Capitale→Pays'} },
    { id: 'c2cap_5', icon: '🌍', type: 'streak', mode: 'c2cap', value: 5, title: {ar:'دول 5',en:'Countries x5',fr:'Pays x5'}, desc: {ar:'تتابع 5 في دولة←عاصمة',en:'5 streak in Country→Capital',fr:'Série de 5 Pays→Capitale'} },
    { id: 'c2cap_10', icon: '🌍', type: 'streak', mode: 'c2cap', value: 10, title: {ar:'دول 10',en:'Countries x10',fr:'Pays x10'}, desc: {ar:'تتابع 10 في دولة←عاصمة',en:'10 streak in Country→Capital',fr:'Série de 10 Pays→Capitale'} },
    { id: 'c2cap_20', icon: '🌍', type: 'streak', mode: 'c2cap', value: 20, title: {ar:'دول 20',en:'Countries x20',fr:'Pays x20'}, desc: {ar:'تتابع 20 في دولة←عاصمة',en:'20 streak in Country→Capital',fr:'Série de 20 Pays→Capitale'} },
    { id: 'c2cap_50', icon: '🌍', type: 'streak', mode: 'c2cap', value: 50, title: {ar:'دول أسطوري',en:'Country Legend',fr:'Légende Pays'}, desc: {ar:'تتابع 50 في دولة←عاصمة',en:'50 streak in Country→Capital',fr:'Série de 50 Pays→Capitale'} },
    { id: 'pop_5', icon: '👥', type: 'streak', mode: 'pop', value: 5, title: {ar:'سكان 5',en:'Pop x5',fr:'Pop x5'}, desc: {ar:'تتابع 5 في الأكثر سكاناً',en:'5 streak in Highest Pop',fr:'Série de 5 Plus Peuplé'} },
    { id: 'pop_10', icon: '👥', type: 'streak', mode: 'pop', value: 10, title: {ar:'سكان 10',en:'Pop x10',fr:'Pop x10'}, desc: {ar:'تتابع 10 في الأكثر سكاناً',en:'10 streak in Highest Pop',fr:'Série de 10 Plus Peuplé'} },
    { id: 'pop_20', icon: '👥', type: 'streak', mode: 'pop', value: 20, title: {ar:'سكان 20',en:'Pop x20',fr:'Pop x20'}, desc: {ar:'تتابع 20 في الأكثر سكاناً',en:'20 streak in Highest Pop',fr:'Série de 20 Plus Peuplé'} },
    { id: 'pop_50', icon: '👥', type: 'streak', mode: 'pop', value: 50, title: {ar:'سكان أسطوري',en:'Pop Legend',fr:'Légende Population'}, desc: {ar:'تتابع 50 في الأكثر سكاناً',en:'50 streak in Highest Pop',fr:'Série de 50 Plus Peuplé'} },
    { id: 'area_5', icon: '📏', type: 'streak', mode: 'area', value: 5, title: {ar:'مساحة 5',en:'Area x5',fr:'Superficie x5'}, desc: {ar:'تتابع 5 في الأكبر مساحة',en:'5 streak in Largest Area',fr:'Série de 5 Plus Grande Superficie'} },
    { id: 'area_10', icon: '📏', type: 'streak', mode: 'area', value: 10, title: {ar:'مساحة 10',en:'Area x10',fr:'Superficie x10'}, desc: {ar:'تتابع 10 في الأكبر مساحة',en:'10 streak in Largest Area',fr:'Série de 10 Plus Grande Superficie'} },
    { id: 'area_20', icon: '📏', type: 'streak', mode: 'area', value: 20, title: {ar:'مساحة 20',en:'Area x20',fr:'Superficie x20'}, desc: {ar:'تتابع 20 في الأكبر مساحة',en:'20 streak in Largest Area',fr:'Série de 20 Plus Grande Superficie'} },
    { id: 'area_50', icon: '📏', type: 'streak', mode: 'area', value: 50, title: {ar:'مساحة أسطوري',en:'Area Legend',fr:'Légende Superficie'}, desc: {ar:'تتابع 50 في الأكبر مساحة',en:'50 streak in Largest Area',fr:'Série de 50 Plus Grande Superficie'} },
    { id: 'challenge_3', icon: '🥈', type: 'streak', mode: 'challenge', value: 3, title: {ar:'تحدي 3',en:'Challenge x3',fr:'Défi x3'}, desc: {ar:'تتابع 3 في التحدي',en:'3 streak in Challenge',fr:'Série de 3 Défi'} },
    { id: 'challenge_5', icon: '🥇', type: 'streak', mode: 'challenge', value: 5, title: {ar:'تحدي 5',en:'Challenge x5',fr:'Défi x5'}, desc: {ar:'تتابع 5 في التحدي',en:'5 streak in Challenge',fr:'Série de 5 Défi'} },
    { id: 'challenge_10', icon: '🏅', type: 'streak', mode: 'challenge', value: 10, title: {ar:'تحدي 10',en:'Challenge x10',fr:'Défi x10'}, desc: {ar:'تتابع 10 في التحدي',en:'10 streak in Challenge',fr:'Série de 10 Défi'} },
    { id: 'challenge_20', icon: '👑', type: 'streak', mode: 'challenge', value: 20, title: {ar:'تحدي أسطوري',en:'Challenge Legend',fr:'Légende Défi'}, desc: {ar:'تتابع 20 في التحدي',en:'20 streak in Challenge',fr:'Série de 20 Défi'} }
];

function getUnlockedAchievements() {
    return JSON.parse(localStorage.getItem('geo_achievements') || '[]');
}

function checkAchievements() {
    const unlocked = getUnlockedAchievements();
    let newlyUnlocked = [];
    const currentScore = getScore();
    const totalCorrect = getTotalCorrect();

    achievementsDef.forEach(ach => {
        if (unlocked.includes(ach.id)) return;

        let shouldUnlock = false;
        if (ach.type === 'score' && currentScore >= ach.value) shouldUnlock = true;
        if (ach.type === 'correct' && totalCorrect >= ach.value) shouldUnlock = true;
        if (ach.type === 'streak') {
            const best = getBestStreak(ach.mode);
            if (best >= ach.value) shouldUnlock = true;
        }

        if (shouldUnlock) {
            unlocked.push(ach.id);
            newlyUnlocked.push(ach);
        }
    });

    if (newlyUnlocked.length > 0) {
        localStorage.setItem('geo_achievements', JSON.stringify(unlocked));
        showAchievementToast(newlyUnlocked[0]);
    }
}

function showAchievementToast(ach) {
    const lang = getSetting('lang', 'en');
    const title = ach.title[lang] || ach.title.en;
    
    // Remove existing toast
    const existing = document.getElementById('ach-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'ach-toast';
    toast.id = 'ach-toast';
    const t = getTranslation();
    toast.innerHTML = t.achToast + '<br>' + ach.icon + ' ' + title;
    document.body.appendChild(toast);
    
    setTimeout(function() { toast.classList.add('show'); }, 100);
    setTimeout(function() {
        toast.classList.remove('show');
        setTimeout(function() { toast.remove(); }, 500);
    }, 3500);
}

// ============================================
// I18N (Internationalization)
// ============================================
const i18n = {
    ar: {
        score: "إجمالي النقاط",
        back: "↩ رجوع",
        btnM2N: "🗺️➔🔤 الخريطة للاسم",
        btnN2M: "🔤➔🗺️ الاسم للخريطة",
        btnName: "🚩 تخمين الاسم",
        btnFlag: "🌐 تخمين العلم",
        btnRiddle: "🧩 تخمين اللغز",
        btnCap2C: "🏛️➔🌍 العاصمة للدولة",
        btnC2Cap: "🌍➔🏛️ الدولة للعاصمة",
        btnPop: "👥 الأكثر سكاناً",
        btnArea: "📏 الأكبر مساحة",
        btnChallenge: "🏆 تحدّي",
        allGamesBtn: "📋 كل الألعاب",
        dashTitle: "🏆 سِجل أفضل أداء لك",
        consecutive: "متتالي",
        achToast: "إنجاز جديد! 🎉",
        levelWarningTitle: "⚠️ تنبيه",
        levelWarningMsg: "لقد فقدت كل نقاطك! يبدو أن مستواك في الجغرافيا بحاجة لبعض التحسين، حاول التركيز أكثر في الجولة القادمة 💪",
        levelWarningBtn: "حسناً، سأحاول مجدداً",
        resetBtnLabel: "🗑️ إعادة ضبط",
        resetConfirmTitle: "⚠️ تأكيد إعادة الضبط",
        resetConfirmMsg: "سيتم حذف جميع نقاطك وسجلاتك وإعداداتك المحفوظة نهائياً، ولا يمكن التراجع عن هذا الإجراء. هل أنت متأكد؟",
        resetCancelBtn: "إلغاء",
        resetConfirmBtn: "نعم، احذف كل شيء",
        gamesMenuTitle: "📋 قائمة الألعاب",
        gamesSearchPlaceholder: "🔍 ابحث عن لعبة...",
        noResultsMsg: "لا توجد نتائج مطابقة",
        achievementsTitle: "🏆 الإنجازات",
        achievementsSummary: "مفتوح",
        achUnlocked: "مفتوح ✅",
        achLocked: "مقفل 🔒",
        modalTitle: "⚙️ إعدادات اللعبة",
        tabGlobal: "عامة 🌐",
        tabQuiz: "الخيارات 🧩",
        tabTimer: "المؤقت ⏱️",
        lblLang: "اللغة",
        lblTheme: "المظهر",
        lblDifficulty: "مستوى الصعوبة",
        lblOptionsCount: "عدد الخيارات",
        lblTimerEnabled: "تفعيل المؤقت",
        lblTimerSeconds: "مدة المؤقت",
        lblTimerPenalty: "خصم الوقت",
        diffEasy: "سهل 🟢",
        diffMedium: "متوسط 🟡",
        diffHard: "صعب 🔴",
        homeTitle: "🌍 Geo Master - اختر لعبة",
        homeSubtitle: "اختر لعبة للبدء في اختبار معرفتك الجغرافية!"
    },
    en: {
        score: "Total Score",
        back: "↩ Back",
        btnM2N: "🗺️➔🔤 Map ➔ Name",
        btnN2M: "🔤➔🗺️ Name ➔ Map",
        btnName: "🚩 Guess Name",
        btnFlag: "🌐 Guess Flag",
        btnRiddle: "🧩 Emoji Riddle",
        btnCap2C: "🏛️➔🌍 Capital ➔ Country",
        btnC2Cap: "🌍➔🏛️ Country ➔ Capital",
        btnPop: "👥 Highest Pop.",
        btnArea: "📏 Largest Area",
        btnChallenge: "🏆 Challenge",
        allGamesBtn: "📋 All Games",
        dashTitle: "🏆 Best Performance",
        consecutive: "streak",
        achToast: "New Achievement! 🎉",
        levelWarningTitle: "⚠️ Warning",
        levelWarningMsg: "You've lost all your points! It looks like your geography level needs some improvement. Try to focus more on the next round 💪",
        levelWarningBtn: "OK, I'll try again",
        resetBtnLabel: "🗑️ Reset",
        resetConfirmTitle: "⚠️ Confirm Reset",
        resetConfirmMsg: "This will permanently delete all your scores, streaks, and saved settings. This action cannot be undone. Are you sure?",
        resetCancelBtn: "Cancel",
        resetConfirmBtn: "Yes, delete everything",
        gamesMenuTitle: "📋 Games List",
        gamesSearchPlaceholder: "🔍 Search for a game...",
        noResultsMsg: "No matching games found",
        achievementsTitle: "🏆 Achievements",
        achievementsSummary: "unlocked",
        achUnlocked: "Unlocked ✅",
        achLocked: "Locked 🔒",
        modalTitle: "⚙️ Game Settings",
        tabGlobal: "Global 🌐",
        tabQuiz: "Options 🧩",
        tabTimer: "Timer ⏱️",
        lblLang: "Language",
        lblTheme: "Theme",
        lblDifficulty: "Difficulty",
        lblOptionsCount: "Options Count",
        lblTimerEnabled: "Enable Timer",
        lblTimerSeconds: "Timer Duration",
        lblTimerPenalty: "Timer Penalty",
        diffEasy: "Easy 🟢",
        diffMedium: "Medium 🟡",
        diffHard: "Hard 🔴",
        homeTitle: "🌍 Geo Master - Choose a Game",
        homeSubtitle: "Select a game to start testing your geography knowledge!"
    },
    fr: {
        score: "Score Total",
        back: "↩ Retour",
        btnM2N: "🗺️➔🔤 Carte ➔ Nom",
        btnN2M: "🔤➔🗺️ Nom ➔ Carte",
        btnName: "🚩 Trouver Nom",
        btnFlag: "🌐 Trouver Drapeau",
        btnRiddle: "🧩 Énigme Émoji",
        btnCap2C: "🏛️➔🌍 Capitale ➔ Pays",
        btnC2Cap: "🌍➔🏛️ Pays ➔ Capitale",
        btnPop: "👥 Plus Peuplé",
        btnArea: "📏 Plus Grande Superficie",
        btnChallenge: "🏆 Défi",
        allGamesBtn: "📋 Tous les jeux",
        dashTitle: "🏆 Meilleurs Scores",
        consecutive: "d'affilée",
        achToast: "Nouveau succès ! 🎉",
        levelWarningTitle: "⚠️ Attention",
        levelWarningMsg: "Vous avez perdu tous vos points ! Essayez de vous concentrer davantage lors du prochain tour 💪",
        levelWarningBtn: "D'accord, je réessaie",
        resetBtnLabel: "🗑️ Réinitialiser",
        resetConfirmTitle: "⚠️ Confirmer la réinitialisation",
        resetConfirmMsg: "Cela supprimera définitivement tous vos scores. Êtes-vous sûr ?",
        resetCancelBtn: "Annuler",
        resetConfirmBtn: "Oui, tout supprimer",
        gamesMenuTitle: "📋 Liste des jeux",
        gamesSearchPlaceholder: "🔍 Rechercher un jeu...",
        noResultsMsg: "Aucun jeu trouvé",
        achievementsTitle: "🏆 Succès",
        achievementsSummary: "débloqués",
        achUnlocked: "Débloqué ✅",
        achLocked: "Verrouillé 🔒",
        modalTitle: "⚙️ Paramètres",
        tabGlobal: "Général 🌐",
        tabQuiz: "Options 🧩",
        tabTimer: "Minuteur ⏱️",
        lblLang: "Langue",
        lblTheme: "Thème",
        lblDifficulty: "Difficulté",
        lblOptionsCount: "Nombre d'options",
        lblTimerEnabled: "Activer Minuteur",
        lblTimerSeconds: "Durée du Minuteur",
        lblTimerPenalty: "Pénalité",
        diffEasy: "Facile 🟢",
        diffMedium: "Moyen 🟡",
        diffHard: "Difficile 🔴",
        homeTitle: "🌍 Geo Master - Choisissez un jeu",
        homeSubtitle: "Sélectionnez un jeu pour tester vos connaissances!"
    }
};

function getTranslation() {
    const lang = getSetting('lang', 'en');
    return i18n[lang] || i18n['en'];
}

// ============================================
// GAMES LIST
// ============================================
const gamesList = [
    { id: 'm2n', file: 'm2n.html', labelKey: 'btnM2N' },
    { id: 'n2m', file: 'n2m.html', labelKey: 'btnN2M' },
    { id: 'name', file: 'name.html', labelKey: 'btnName' },
    { id: 'flag', file: 'flag.html', labelKey: 'btnFlag' },
    { id: 'riddle', file: 'riddle.html', labelKey: 'btnRiddle' },
    { id: 'cap2c', file: 'cap2c.html', labelKey: 'btnCap2C' },
    { id: 'c2cap', file: 'c2cap.html', labelKey: 'btnC2Cap' },
    { id: 'pop', file: 'pop.html', labelKey: 'btnPop' },
    { id: 'area', file: 'area.html', labelKey: 'btnArea' },
    { id: 'challenge', file: 'challenge.html', labelKey: 'btnChallenge' }
];

// ============================================
// UI HELPERS
// ============================================
function updateScoreDisplay() {
    const scoreEl = document.getElementById('score');
    if (scoreEl) {
        scoreEl.innerText = getScore();
    }
    const scoreLabel = document.getElementById('lbl-score');
    if (scoreLabel) {
        const t = getTranslation();
        scoreLabel.innerText = t.score;
    }
}

function applyTheme() {
    const theme = getSetting('theme', 'dark');
    if (theme === 'light') {
        document.body.classList.add('light-mode');
    } else {
        document.body.classList.remove('light-mode');
    }
}

function applyDirection() {
    const lang = getSetting('lang', 'en');
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

function applyLanguageToUI() {
    const t = getTranslation();
    
    // Update common UI elements if they exist
    const elements = {
        'lbl-score': t.score,
        'title-dash': t.dashTitle,
    };
    
    for (const [id, text] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    }
    
    updateScoreDisplay();
}

// ============================================
// MODALS MANAGEMENT
// ============================================
function toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    if (modal) {
        if (show) {
            modal.classList.add('active');
        } else {
            modal.classList.remove('active');
        }
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal-overlay.active').forEach(modal => {
        modal.classList.remove('active');
    });
}

// Close modals when clicking outside
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});

// Close modals with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeAllModals();
    }
});

// ============================================
// SETTINGS MODAL
// ============================================
function openSettingsModal() {
    const t = getTranslation();
    const settings = getAllSettings();
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('settings-modal');
    if (!modal) {
        modal = createSettingsModalHTML();
        document.body.appendChild(modal);
    }
    
    // Update translations
    document.getElementById('modal-title').innerText = t.modalTitle;
    document.getElementById('tab-btn-global').innerText = t.tabGlobal;
    document.getElementById('tab-btn-quiz').innerText = t.tabQuiz;
    document.getElementById('tab-btn-timer').innerText = t.tabTimer;
    document.getElementById('lbl-lang').innerText = t.lblLang;
    document.getElementById('lbl-theme').innerText = t.lblTheme;
    document.getElementById('lbl-difficulty').innerText = t.lblDifficulty;
    document.getElementById('lbl-options-count').innerText = t.lblOptionsCount;
    document.getElementById('lbl-timer-enabled').innerText = t.lblTimerEnabled;
    document.getElementById('lbl-timer-seconds').innerText = t.lblTimerSeconds;
    document.getElementById('lbl-timer-penalty').innerText = t.lblTimerPenalty;
    document.getElementById('btn-reset-data').innerText = t.resetBtnLabel;
    
    const diffSelect = document.getElementById('cfg-difficulty');
    if (diffSelect) {
        diffSelect.options[0].text = t.diffEasy;
        diffSelect.options[1].text = t.diffMedium;
        diffSelect.options[2].text = t.diffHard;
    }
    
    // Set current values
    document.getElementById('cfg-lang').value = settings.lang;
    document.getElementById('cfg-theme').value = settings.theme;
    document.getElementById('cfg-difficulty').value = settings.difficulty;
    document.getElementById('cfg-options-count').value = settings.optionsCount;
    document.getElementById('cfg-timer-enabled').value = settings.timerEnabled ? 'true' : 'false';
    document.getElementById('cfg-timer-seconds').value = settings.timerSeconds;
    document.getElementById('cfg-timer-penalty').value = settings.timerPenalty;
    
    toggleModal('settings-modal', true);
}

function createSettingsModalHTML() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'settings-modal';
    modal.innerHTML = `
        <div class="modal-card">
            <div class="modal-header">
                <h3 id="modal-title">⚙️ Game Settings</h3>
                <button class="close-modal-btn" onclick="toggleModal('settings-modal', false)">✖</button>
            </div>
            <div class="settings-tabs">
                <button class="tab-btn active" id="tab-btn-global" onclick="switchSettingsTab('global')">Global 🌐</button>
                <button class="tab-btn" id="tab-btn-quiz" onclick="switchSettingsTab('quiz')">Options 🧩</button>
                <button class="tab-btn" id="tab-btn-timer" onclick="switchSettingsTab('timer')">⏱️ Timer</button>
            </div>
            <div class="settings-content">
                <div class="tab-pane active" id="pane-global">
                    <div class="setting-row">
                        <label id="lbl-lang">Language</label>
                        <div class="setting-control">
                            <select id="cfg-lang" onchange="applySettingsChange()">
                                <option value="en">English</option>
                                <option value="ar">العربية</option>
                                <option value="fr">Français</option>
                            </select>
                        </div>
                    </div>
                    <div class="setting-row">
                        <label id="lbl-theme">Theme</label>
                        <div class="setting-control">
                            <select id="cfg-theme" onchange="applySettingsChange()">
                                <option value="dark">Dark Mode</option>
                                <option value="light">Light Mode</option>
                            </select>
                        </div>
                    </div>
                    <div class="setting-row" style="border-bottom:none;">
                        <label id="lbl-difficulty">Difficulty</label>
                        <div class="setting-control">
                            <select id="cfg-difficulty" onchange="applySettingsChange()">
                                <option value="easy">Easy 🟢</option>
                                <option value="medium" selected>Medium 🟡</option>
                                <option value="hard">Hard 🔴</option>
                            </select>
                        </div>
                    </div>
                    <div style="display:flex; justify-content:center; padding-top:0.5rem;">
                        <button id="btn-reset-data" class="reset-data-btn" onclick="toggleResetConfirm(true)">🗑️ Reset</button>
                    </div>
                </div>
                <div class="tab-pane" id="pane-quiz">
                    <div class="setting-row">
                        <label id="lbl-options-count">Options Count per Quiz</label>
                        <div class="setting-control">
                            <select id="cfg-options-count" onchange="applySettingsChange()">
                                <option value="4">4 Options</option>
                                <option value="6">6 Options</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="tab-pane" id="pane-timer">
                    <div class="setting-row">
                        <label id="lbl-timer-enabled">Enable Timer</label>
                        <div class="setting-control">
                            <select id="cfg-timer-enabled" onchange="applySettingsChange()">
                                <option value="false">Off ❌</option>
                                <option value="true" selected>On ✅</option>
                            </select>
                        </div>
                    </div>
                    <div class="setting-row">
                        <label id="lbl-timer-seconds">Timer Duration</label>
                        <div class="setting-control">
                            <select id="cfg-timer-seconds" onchange="applySettingsChange()">
                                <option value="5">5 Seconds 🔥</option>
                                <option value="10" selected>10 Seconds ⚡</option>
                                <option value="15">15 Seconds 🕐</option>
                                <option value="20">20 Seconds 🕑</option>
                                <option value="30">30 Seconds 🕒</option>
                            </select>
                        </div>
                    </div>
                    <div class="setting-row">
                        <label id="lbl-timer-penalty">Timer Penalty</label>
                        <div class="setting-control">
                            <select id="cfg-timer-penalty" onchange="applySettingsChange()">
                                <option value="5">-5 Points</option>
                                <option value="10" selected>-10 Points</option>
                                <option value="15">-15 Points</option>
                                <option value="20">-20 Points</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    return modal;
}

function switchSettingsTab(tab) {
    document.querySelectorAll('#settings-modal .tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#settings-modal .tab-pane').forEach(p => p.classList.remove('active'));
    
    const tabBtn = document.getElementById('tab-btn-' + tab);
    const tabPane = document.getElementById('pane-' + tab);
    if (tabBtn) tabBtn.classList.add('active');
    if (tabPane) tabPane.classList.add('active');
}

function applySettingsChange() {
    setSetting('lang', document.getElementById('cfg-lang').value);
    setSetting('theme', document.getElementById('cfg-theme').value);
    setSetting('difficulty', document.getElementById('cfg-difficulty').value);
    setSetting('optionsCount', parseInt(document.getElementById('cfg-options-count').value));
    setSetting('timerEnabled', document.getElementById('cfg-timer-enabled').value === 'true');
    setSetting('timerSeconds', parseInt(document.getElementById('cfg-timer-seconds').value));
    setSetting('timerPenalty', parseInt(document.getElementById('cfg-timer-penalty').value));
    
    applyTheme();
    applyDirection();
    applyLanguageToUI();
}

// ============================================
// GAMES MENU MODAL
// ============================================
function openGamesMenu() {
    const t = getTranslation();
    
    let modal = document.getElementById('games-menu-modal');
    if (!modal) {
        modal = createGamesMenuHTML();
        document.body.appendChild(modal);
    }
    
    document.getElementById('games-menu-title').innerText = t.gamesMenuTitle;
    document.getElementById('games-search').placeholder = t.gamesSearchPlaceholder;
    document.getElementById('games-search').value = '';
    
    renderGamesList('');
    toggleModal('games-menu-modal', true);
}

function createGamesMenuHTML() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'games-menu-modal';
    modal.innerHTML = `
        <div class="modal-card">
            <div class="modal-header">
                <h3 id="games-menu-title">📋 Games List</h3>
                <button class="close-modal-btn" onclick="toggleModal('games-menu-modal', false)">✖</button>
            </div>
            <div class="settings-content">
                <input type="text" id="games-search" class="games-search-input" placeholder="🔍 Search for a game..." oninput="filterGamesList()">
                <div id="games-list-container" style="display:flex; flex-direction:column; gap:0.5rem;"></div>
            </div>
        </div>
    `;
    return modal;
}

function filterGamesList() {
    const searchInput = document.getElementById('games-search');
    renderGamesList(searchInput ? searchInput.value : '');
}

function renderGamesList(filter) {
    const t = getTranslation();
    const container = document.getElementById('games-list-container');
    if (!container) return;
    
    container.innerHTML = '';
    const f = (filter || '').trim().toLowerCase();
    let shown = 0;
    const basePath = window.location.pathname.includes('/games/') ? '' : 'games/';

    gamesList.forEach(g => {
        const label = t[g.labelKey] || g.id;
        if (f && !label.toLowerCase().includes(f)) return;
        shown++;
        
        const isFav = isFavorite(g.id);
        const row = document.createElement('div');
        row.className = 'game-list-item';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'game-name';
        nameSpan.innerText = label;
        
        const star = document.createElement('span');
        star.className = 'fav-star';
        star.innerText = isFav ? '⭐' : '☆';
        star.onclick = function(e) {
            e.stopPropagation();
            toggleFavorite(g.id);
            renderGamesList(filter);
        };
        
        row.appendChild(nameSpan);
        row.appendChild(star);
        row.onclick = function() {
            toggleModal('games-menu-modal', false);
            window.location.href = basePath + g.file;
        };
        
        container.appendChild(row);
    });
    
    if (shown === 0) {
        const msg = document.createElement('div');
        msg.className = 'no-results-msg';
        msg.innerText = t.noResultsMsg;
        container.appendChild(msg);
    }
}

// ============================================
// ACHIEVEMENTS MODAL
// ============================================
function openAchievements() {
    const t = getTranslation();
    
    let modal = document.getElementById('achievements-modal');
    if (!modal) {
        modal = createAchievementsHTML();
        document.body.appendChild(modal);
    }
    
    document.getElementById('achievements-title').innerText = t.achievementsTitle;
    renderAchievementsList();
    toggleModal('achievements-modal', true);
}

function createAchievementsHTML() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'achievements-modal';
    modal.innerHTML = `
        <div class="modal-card" style="max-width:540px;">
            <div class="modal-header">
                <h3 id="achievements-title">🏆 Achievements</h3>
                <button class="close-modal-btn" onclick="toggleModal('achievements-modal', false)">✖</button>
            </div>
            <div class="settings-content">
                <div class="achievements-summary" id="achievements-summary">0 / 0 unlocked</div>
                <div id="achievements-list"></div>
            </div>
        </div>
    `;
    return modal;
}

function renderAchievementsList() {
    const t = getTranslation();
    const list = document.getElementById('achievements-list');
    const summary = document.getElementById('achievements-summary');
    if (!list || !summary) return;
    
    const unlocked = getUnlockedAchievements();
    summary.innerText = unlocked.length + ' / ' + achievementsDef.length + ' ' + t.achievementsSummary;
    
    list.innerHTML = '';
    achievementsDef.forEach(ach => {
        const isUnlocked = unlocked.includes(ach.id);
        const item = document.createElement('div');
        item.className = 'achievement-item ' + (isUnlocked ? 'unlocked' : 'locked');
        
        const title = ach.title[getSetting('lang', 'en')] || ach.title.en;
        const desc = ach.desc[getSetting('lang', 'en')] || ach.desc.en;
        
        item.innerHTML = 
            '<div class="achievement-icon">' + ach.icon + '</div>' +
            '<div class="achievement-info">' +
                '<div class="achievement-title">' + title + '</div>' +
                '<div class="achievement-desc">' + desc + '</div>' +
                '<div class="achievement-status ' + (isUnlocked ? 'unlocked-text' : 'locked-text') + '">' +
                    (isUnlocked ? t.achUnlocked : t.achLocked) +
                '</div>' +
            '</div>';
        list.appendChild(item);
    });
}

// ============================================
// LEVEL WARNING MODAL
// ============================================
function showLevelWarning() {
    const t = getTranslation();
    
    let modal = document.getElementById('level-warning-modal');
    if (!modal) {
        modal = createLevelWarningHTML();
        document.body.appendChild(modal);
    }
    
    document.getElementById('warning-title').innerText = t.levelWarningTitle;
    document.getElementById('warning-msg').innerText = t.levelWarningMsg;
    document.getElementById('warning-close-btn').innerText = t.levelWarningBtn;
    toggleModal('level-warning-modal', true);
}

function createLevelWarningHTML() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'level-warning-modal';
    modal.innerHTML = `
        <div class="modal-card" style="max-width:400px;">
            <div class="modal-header" style="background-color: var(--danger);">
                <h3 id="warning-title" style="color:#fff;">⚠️ Warning</h3>
                <button class="close-modal-btn" style="color:#fff;" onclick="toggleModal('level-warning-modal', false)">✖</button>
            </div>
            <div class="settings-content" style="text-align:center;">
                <div style="font-size:2.5rem;">📉</div>
                <p id="warning-msg" style="margin-top:0.6rem; font-size:0.95rem; line-height:1.5;"></p>
                <button class="btn-next" id="warning-close-btn" style="display:inline-block; margin-top:0.8rem;" onclick="toggleModal('level-warning-modal', false)"></button>
            </div>
        </div>
    `;
    return modal;
}

// ============================================
// RESET CONFIRMATION MODAL
// ============================================
function toggleResetConfirm(show) {
    const t = getTranslation();
    
    let modal = document.getElementById('reset-confirm-modal');
    if (!modal) {
        modal = createResetConfirmHTML();
        document.body.appendChild(modal);
    }
    
    if (show) {
        document.getElementById('reset-confirm-title').innerText = t.resetConfirmTitle;
        document.getElementById('reset-confirm-msg').innerText = t.resetConfirmMsg;
        document.getElementById('reset-cancel-btn').innerText = t.resetCancelBtn;
        document.getElementById('reset-confirm-btn').innerText = t.resetConfirmBtn;
    }
    
    toggleModal('reset-confirm-modal', show);
}

function createResetConfirmHTML() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'reset-confirm-modal';
    modal.innerHTML = `
        <div class="modal-card" style="max-width:400px;">
            <div class="modal-header" style="background-color: var(--danger);">
                <h3 id="reset-confirm-title" style="color:#fff;">⚠️ Confirm Reset</h3>
                <button class="close-modal-btn" style="color:#fff;" onclick="toggleResetConfirm(false)">✖</button>
            </div>
            <div class="settings-content" style="text-align:center;">
                <div style="font-size:2.5rem;">🗑️</div>
                <p id="reset-confirm-msg" style="margin-top:0.6rem; font-size:0.95rem; line-height:1.5;"></p>
                <div style="display:flex; gap:0.6rem; margin-top:1rem; justify-content:center; flex-wrap:wrap;">
                    <button id="reset-cancel-btn" class="btn-next" style="display:inline-block; background-color: var(--border-color); margin-top:0;" onclick="toggleResetConfirm(false)"></button>
                    <button id="reset-confirm-btn" class="btn-next" style="display:inline-block; background-color: var(--danger); margin-top:0;" onclick="resetAllData()"></button>
                </div>
            </div>
        </div>
    `;
    return modal;
}

function resetAllData() {
    Object.keys(localStorage).forEach(k => {
        if (k.startsWith('geo_')) localStorage.removeItem(k);
    });
    window.location.reload();
}

// ============================================
// AD LOADING
// ============================================
function loadAdScripts() {
    // Load HalalSpark ads if containers exist
    const domain = 'https://mustafaworks1798-dev.github.io/geo-games';
    
    // Header Ad
    if (document.getElementById('ad-header')) {
        const headerScript = document.createElement('script');
        headerScript.src = 'https://ads.halalspark.co.uk/get-ad-script-header?placement_id=43a3b7df-d61d-4292-9444-d44b68ae3094&domain=' + encodeURIComponent(domain) + '&_v=3.0';
        headerScript.async = true;
        document.body.appendChild(headerScript);
    }
    
    // Banner Ad
    if (document.getElementById('ad-banner')) {
        const bannerScript = document.createElement('script');
        bannerScript.src = 'https://ads.halalspark.co.uk/get-ad-script-banner?placement_id=c2f1def9-e417-4f6e-86e9-60fdaa448007&domain=' + encodeURIComponent(domain) + '&_v=3.0';
        bannerScript.async = true;
        document.body.appendChild(bannerScript);
    }
    
    // Footer Ad
    if (document.getElementById('ad-footer')) {
        const footerScript = document.createElement('script');
        footerScript.src = 'https://ads.halalspark.co.uk/get-ad-script-footer?placement_id=179edeb9-e8b3-4269-964b-20f3cb23d46a&domain=' + encodeURIComponent(domain) + '&_v=3.0&test=1';
        footerScript.async = true;
        document.body.appendChild(footerScript);
    }
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    applyTheme();
    applyDirection();
    applyLanguageToUI();
    updateScoreDisplay();
    loadAdScripts();
});