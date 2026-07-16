import { useState, useEffect } from "react";
import { Target, Award, ArrowUpRight, TrendingUp, AlertTriangle, MessageSquare, Send, CheckCircle, RefreshCw, Sparkles, BookOpen } from "lucide-react";
import { Card } from "./DashboardPage";
import { useOutletContext } from "react-router-dom";
import { api } from "../lib/api";

const COACH_RESPONSES = {
  en: {
    greeting: "Hello! I am your Business Coach. I've analyzed your shop's recent sales, inventory levels, and outstanding credits. Ask me any question about improving your sales, collecting udhaar, or managing stock!",
    default: "To improve your overall performance, I recommend: 1. Restocking popular items that are running low, 2. Collecting outstanding credits from customers who owe more than ₹200, and 3. Bundling slow-moving items together with top sellers.",
    keywords: [
      { keys: ["sales", "increase", "revenue", "profit", "more money"], response: "To boost sales, try: featuring your best seller (like Rice or Sugar) near the entrance, offering a small discount (like 5%) on bulk purchases (e.g., 5kg+), and introducing a digital payment option to attract younger customers." },
      { keys: ["udhaar", "credit", "debt", "remind", "collect"], response: "To manage credit risk, establish a clear credit limit (e.g., ₹500 max per customer), send weekly polite WhatsApp reminders to outstanding debtors, and offer a tiny discount (₹10 off) for prompt repayments." },
      { keys: ["stock", "inventory", "expiry", "dead"], response: "For inventory optimization, review products with zero sales in the last 7 days and bundle them as 'Buy 1 Get 1' or sell at cost price to free up cash. Set automatic stock reorder points for essentials." },
    ]
  },
  hi: {
    greeting: "नमस्ते! मैं आपका बिजनेस कोच हूँ। मैंने आपकी दुकान की बिक्री, स्टॉक और उधार का विश्लेषण किया है। अपनी बिक्री बढ़ाने, उधार वसूलने या स्टॉक प्रबंधन से जुड़ा कोई भी सवाल पूछें!",
    default: "आपके प्रदर्शन को बेहतर बनाने के लिए मेरी सलाह: 1. कम स्टॉक वाली लोकप्रिय वस्तुओं को फिर से मंगवाएं, 2. ₹200 से अधिक उधार वाले ग्राहकों से संपर्क करें, और 3. कम बिकने वाले सामान को सबसे ज्यादा बिकने वाले सामान के साथ बंडल बनाकर बेचें।",
    keywords: [
      { keys: ["बिक्री", "बढ़ाएं", "मुनाफा", "प्रॉफिट", "पैसा"], response: "बिक्री बढ़ाने के लिए: अपने सबसे लोकप्रिय आइटम (जैसे चावल या चीनी) को दुकान के सामने रखें, थोक खरीद पर 5% की छूट दें, और ग्राहकों को आकर्षित करने के लिए डिजिटल पेमेंट स्वीकार करना शुरू करें।" },
      { keys: ["उधार", "पैसा बाकी", "वसूल", "खाता"], response: "उधार को प्रबंधित करने के लिए, प्रति ग्राहक एक सीमा तय करें (जैसे अधिकतम ₹500), पेंडिंग उधार वालों को हर हफ्ते विनम्रता से व्हाट्सएप रिमाइंडर भेजें, और तुरंत भुगतान पर छोटी छूट (₹10) दें।" },
      { keys: ["स्टॉक", "माल", "सामान", "खत्म"], response: "स्टॉक सुधारने के लिए, उन सामानों की सूची बनाएं जो पिछले 7 दिनों से नहीं बिके हैं। उन्हें 'एक खरीदें, एक मुफ्त पाएं' ऑफर में निकालें ताकि फंसा हुआ पैसा खाली हो सके।" },
    ]
  },
  te: {
    greeting: "నమస్తే! నేను మీ బిజినెస్ కోచ్. మీ దుకాణం అమ్మకాలు, ఇన్వెంటరీ మరియు ఉధార్ బకాయిలను విశ్లేషించాను. వ్యాపార అభివృద్ధి, అప్పుల వసూలు లేదా స్టాక్ నిర్వహణ గురించి నన్ను ఏదైనా అడగండి!",
    default: "మీ వ్యాపారాన్ని మెరుగుపరచడానికి నా సలహా: 1. స్టాక్ తక్కువగా ఉన్న వస్తువులను వెంటనే కొనుగోలు చేయండి, 2. ₹200 కంటే ఎక్కువ బాకీ ఉన్న కస్టమర్ల నుండి వసూలు చేయండి, 3. తక్కువగా అమ్ముడయ్యే వస్తువులను ఎక్కువ డిమాండ్ ఉన్న వాటితో కలిపి అమ్మండి.",
    keywords: [
      { keys: ["అమ్మకాలు", "లాభం", "పెంచడం", "ఆదాయం"], response: "అమ్మకాలను పెంచడానికి: డిమాండ్ ఉన్న వస్తువులను (బియ్యం, చక్కెర) షాప్ ముందు భాగంలో ఉంచండి, ఎక్కువ మొత్తంలో కొనేవారికి 5% డిస్కౌంట్ ఇవ్వండి మరియు డిజిటల్ పేమెంట్లను అందుబాటులోకి తెండి." },
      { keys: ["ఉధార్", "అప్పు", "బాకీ", "వసూలు"], response: "ఉధార్ నియంత్రణకు, ఒక కస్టమర్‌కు పరిమితి (ఉదా. గరిష్టంగా ₹500) విధించండి, బాకీ ఉన్నవారికి ప్రతి వారం వాట్సాప్ ద్వారా సమాచారం పంపండి మరియు త్వరగా చెల్లించే వారికి చిన్న బహుమతి ఇవ్వండి." },
      { keys: ["స్టాక్", "సరుకులు", "ఇన్వెంటరీ"], response: "స్టాక్ నిర్వహణకు, గత 7 రోజులుగా అమ్ముడుపోని వస్తువులను గుర్తించండి. వాటిని 'ఒకటి కొంటే ఒకటి ఉచితం' ఆఫర్లలో అమ్మడం ద్వారా పెట్టుబడిని తిరిగి పొందవచ్చు." },
    ]
  }
};

const STRATEGIES = {
  en: {
    inventoryTitle: "Inventory & Refinement",
    inventoryDesc: "Free up cash by managing low-stock items and clearing slow inventory.",
    creditTitle: "Credit Risk Management",
    creditDesc: "Accelerate cash flow by collecting outstanding customer dues.",
    profitTitle: "Profit Maximization",
    profitDesc: "Improve daily margins by optimizing pricing on popular items."
  },
  hi: {
    inventoryTitle: "स्टॉक प्रबंधन",
    inventoryDesc: "कम स्टॉक वाली वस्तुओं को मंगाकर और पुराने स्टॉक को निकालकर नगदी बढ़ाएं।",
    creditTitle: "उधार जोखिम प्रबंधन",
    creditDesc: "ग्राहकों से बकाया उधार वसूल कर नगद प्रवाह में सुधार करें।",
    profitTitle: "मुनाफा बढ़ाना",
    profitDesc: "लोकप्रिय वस्तुओं की कीमतों को अनुकूलित करके दैनिक मार्जिन में सुधार करें।"
  },
  te: {
    inventoryTitle: "స్టాక్ నిర్వహణ",
    inventoryDesc: "స్టాక్ తక్కువగా ఉన్న వస్తువులను తెప్పించడం ద్వారా విక్రయాలు పెంచండి.",
    creditTitle: "ఉధార్ నియంత్రణ",
    creditDesc: "కస్టమర్ల బాకీలను వసూలు చేయడం ద్వారా నగదు ప్రవాహాన్ని పెంచండి.",
    profitTitle: "లాభాల గరిష్టీకరణ",
    profitDesc: "డిమాండ్ ఉన్న వస్తువుల ధరలను సరిచేయడం ద్వారా మార్జిన్లను మెరుగుపరచండి."
  }
};

export default function BusinessCoachPage() {
  const { data, money, t } = useOutletContext();
  const lang = data?.shop?.lang_pref || "en";
  
  const [activeTab, setActiveTab] = useState("inventory");
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportSteps, setReportSteps] = useState("");
  const [coachingPlan, setCoachingPlan] = useState(null);
  
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [coachThinking, setCoachThinking] = useState(false);

  const health = data?.health || { score: 70, explanation: "Stable performace.", insight: "Keep monitoring dues.", tone: "marigold", todaysGoal: 1000, currentRevenue: 750 };
  const inventoryList = data?.inventory || [];
  const lowStockAlerts = data?.overview?.lowStockAlerts || [];
  const duesCustomers = data?.dues?.customers || [];
  const sales = data?.sales || [];
  const bestSeller = data?.bestSeller || { topSeller: { item: "N/A", qty: 0 } };

  const strategyTexts = STRATEGIES[lang] || STRATEGIES.en;
  const coachTexts = COACH_RESPONSES[lang] || COACH_RESPONSES.en;

  // Initialize coach welcome message
  useEffect(() => {
    setChatMessages([
      { id: "welcome", role: "coach", text: coachTexts.greeting }
    ]);
  }, [lang]);

  const generateReportPlan = () => {
    setGeneratingReport(true);
    setCoachingPlan(null);
    
    const steps = [
      "Analyzing stock velocity...",
      "Evaluating debtor payment cycles...",
      "Correlating price-to-profit margins...",
      "Formulating custom retail advice..."
    ];

    let currentStep = 0;
    setReportSteps(steps[currentStep]);

    const timer = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setReportSteps(steps[currentStep]);
      } else {
        clearInterval(timer);
        compileCustomPlan();
      }
    }, 700);
  };

  const compileCustomPlan = () => {
    // Generate actual advice lists based on database data
    const stockAdvice = [];
    const creditAdvice = [];
    const profitAdvice = [];

    // 1. Stock Advice
    if (lowStockAlerts.length > 0) {
      const names = lowStockAlerts.slice(0, 3).map(i => i.name).join(", ");
      stockAdvice.push({
        type: "warning",
        text: lang === "hi" 
          ? `त्वरित कार्रवाई: आपके लोकप्रिय आइटम (${names}) का स्टॉक खत्म होने वाला है। तुरंत ऑर्डर करें।`
          : lang === "te"
            ? `త్వరిత చర్య: మీ జనాదరణ పొందిన వస్తువులు (${names}) స్టాక్ అయిపోతున్నాయి. వెంటనే ఆర్డర్ చేయండి.`
            : `Critical restock needed: Your popular items (${names}) are below threshold. Reorder today.`
      });
    } else {
      stockAdvice.push({
        type: "success",
        text: lang === "hi"
          ? "बढ़िया! आपके सभी आवश्यक सामान पर्याप्त मात्रा में स्टॉक में हैं।"
          : lang === "te"
            ? "అద్భుతం! మీ అవసరమైన వస్తువులన్నీ తగినంత స్టాక్‌లో ఉన్నాయి."
            : "Perfect! All essential grocery lines have healthy stock levels."
      });
    }

    // Dead stock finder
    const soldItems = new Set(sales.map(s => s.item_text.toLowerCase()));
    const deadStock = inventoryList.filter(p => p.stock_qty > 10 && !soldItems.has(p.name.toLowerCase()));
    if (deadStock.length > 0) {
      const names = deadStock.slice(0, 2).map(i => i.name).join(", ");
      stockAdvice.push({
        type: "info",
        text: lang === "hi"
          ? `धीमी बिक्री: '${names}' काफी समय से नहीं बिका है। इसे बंडल ऑफर में बेचें।`
          : lang === "te"
            ? `నెమ్మదిగా అమ్మకాలు: '${names}' చాలా కాలంగా అమ్ముడుపోలేదు. వేరే వాటితో కలిపి అమ్మండి.`
            : `Dead stock identified: '${names}' has high stock but no sales today. Bundle them up.`
      });
    }

    // 2. Credit Advice
    if (duesCustomers.length > 0) {
      const totalOutstanding = duesCustomers.reduce((s, c) => s + c.outstanding, 0);
      creditAdvice.push({
        type: "warning",
        text: lang === "hi"
          ? `उधार चेतावनी: आपके ग्राहकों पर कुल ${money(totalOutstanding)} बकाया है। नगदी प्रवाह बढ़ाने के लिए वसूली करें।`
          : lang === "te"
            ? `ఉధార్ హెచ్చరిక: మీ కస్టమర్ల నుండి మొత్తం ${money(totalOutstanding)} బకాయి ఉంది. వసూళ్లను వేగవంతం చేయండి.`
            : `Credit alert: You have ${money(totalOutstanding)} tied up in outstanding Udhaar credits.`
      });

      const topDebtor = duesCustomers[0];
      if (topDebtor && topDebtor.outstanding > 150) {
        creditAdvice.push({
          type: "action",
          text: lang === "hi"
            ? `व्हाट्सएप रिमाइंडर: ${topDebtor.name} पर सर्वाधिक ${money(topDebtor.outstanding)} उधार बकाया है। इन्हें आज ही मैसेज भेजें।`
            : lang === "te"
              ? `వాట్సాప్ రిమైండర్: ${topDebtor.name} నుండి అత్యధికంగా ${money(topDebtor.outstanding)} రావలసి ఉంది. వెంటనే మెసేజ్ చేయండి.`
              : `Top debtor: ${topDebtor.name} owes the highest amount (${money(topDebtor.outstanding)}). Send a reminder.`
        });
      }
    } else {
      creditAdvice.push({
        type: "success",
        text: lang === "hi"
          ? "बधाई हो! आपका कोई उधार पेंडिंग नहीं है, नगद प्रवाह बहुत मजबूत है।"
          : lang === "te"
            ? "అభినందనలు! మీకు ఎటువంటి ఉధార్ బకాయిలు లేవు, నగదు ప్రవాహం బలంగా ఉంది."
            : "Outstanding cashflow! You have zero outstanding debts on your bahi-khata ledger."
      });
    }

    // 3. Profit Advice
    if (bestSeller && bestSeller.topSeller && bestSeller.topSeller.qty > 0) {
      profitAdvice.push({
        type: "info",
        text: lang === "hi"
          ? `बेस्ट सेलर: '${bestSeller.topSeller.item}' आज सबसे ज्यादा बिका। इसकी दृश्यता बढ़ाएं।`
          : lang === "te"
            ? `బెస్ట్ సెల్లర్: '${bestSeller.topSeller.item}' ఈరోజు బాగా అమ్ముడైంది. దీన్ని ముందు ఉంచండి.`
            : `Featured product: '${bestSeller.topSeller.item}' is today's best seller. Place it prominently.`
      });
    }
    
    // Margin check
    const lowMarginProducts = inventoryList.filter(p => p.sell_price > 0 && ((p.sell_price - p.cost_price) / p.sell_price) < 0.1);
    if (lowMarginProducts.length > 0) {
      const names = lowMarginProducts.slice(0, 2).map(i => i.name).join(", ");
      profitAdvice.push({
        type: "action",
        text: lang === "hi"
          ? `मार्जिन सुधारें: '${names}' का मुनाफा 10% से कम है। कीमतों में ₹2-₹5 की वृद्धि पर विचार करें।`
          : lang === "te"
            ? `మార్జిన్ పెంపు: '${names}' పై లాభం 10% కంటే తక్కువ. ధరను ₹2-₹5 పెంచడం ఆలోచించండి.`
            : `Low margin warning: '${names}' yields under 10% profit. Consider a slight price adjustment.`
      });
    } else {
      profitAdvice.push({
        type: "success",
        text: lang === "hi"
          ? "बढ़िया! आपके इन्वेंट्री आइटम स्वस्थ मुनाफा मार्जिन दे रहे हैं।"
          : lang === "te"
            ? "అద్భుతం! మీ స్టాక్ వస్తువులు మంచి లాభాలను అందిస్తున్నాయి."
            : "Pricing looks optimized. All mapped items show healthy margin contributions."
      });
    }

    setCoachingPlan({
      timestamp: new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      score: health.score,
      stockAdvice,
      creditAdvice,
      profitAdvice
    });
    setGeneratingReport(false);
  };

  const handleChatSend = async (e) => {
    e.preventDefault();
    const query = chatInput.trim();
    if (!query) return;

    setChatInput("");
    const userMsg = { id: Date.now().toString(), role: "user", text: query };
    setChatMessages((prev) => [...prev, userMsg]);
    setCoachThinking(true);

    // Simulate coaching advice lookup
    setTimeout(() => {
      let replyText = coachTexts.default;
      const lowerQuery = query.toLowerCase();

      // Check keyword triggers
      for (const kw of coachTexts.keywords) {
        if (kw.keys.some(key => lowerQuery.includes(key))) {
          replyText = kw.response;
          break;
        }
      }

      setChatMessages((prev) => [
        ...prev,
        { id: Date.now().toString() + "coach", role: "coach", text: replyText }
      ]);
      setCoachThinking(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-shopfront flex items-center gap-2">
            <Target className="h-6 w-6 text-marigold" /> Business Coach
          </h1>
          <p className="text-ink/60 text-sm mt-1">
            Personalized advice and analytics to optimize your store, recover dues, and increase profits.
          </p>
        </div>
      </div>

      {/* Health Gauge Header Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card title="Dukaan Health Indicator">
            <div className="flex flex-col items-center justify-center py-6 text-center">
              {/* Score circle */}
              <div className="relative w-36 h-36 flex items-center justify-center mb-4">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-paper-deep fill-none"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className={`fill-none transition-all duration-1000 ${
                      health.score >= 80 
                        ? "stroke-leaf" 
                        : health.score >= 50 
                          ? "stroke-marigold" 
                          : "stroke-terracotta"
                    }`}
                    strokeWidth="8"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * health.score) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-display font-black text-shopfront">{health.score}</span>
                  <span className="text-[10px] uppercase font-bold text-ink/40 tracking-wider">Score</span>
                </div>
              </div>

              <h3 className="font-bold text-shopfront text-sm">{health.explanation}</h3>
              <p className="text-xs text-ink/50 mt-1 max-w-[200px] leading-normal">
                {health.nextGoal}
              </p>

              <div className="w-full border-t border-black/5 mt-5 pt-4 grid grid-cols-2 gap-2 text-center text-xs">
                <div className="border-r border-black/5">
                  <span className="text-[10px] uppercase font-semibold text-ink/40 block">Today's Sales</span>
                  <span className="font-bold text-shopfront mt-0.5 block">{money(health.currentRevenue)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-ink/40 block">Daily Target</span>
                  <span className="font-bold text-leaf mt-0.5 block">{money(health.todaysGoal)}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Dynamic Coach tabs */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="flex bg-paper-deep/60 p-1 rounded-xl mb-4 self-start">
            <button
              onClick={() => setActiveTab("inventory")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "inventory" ? "bg-white text-shopfront shadow-sm" : "text-ink/50 hover:text-shopfront"
              }`}
            >
              {strategyTexts.inventoryTitle}
            </button>
            <button
              onClick={() => setActiveTab("credit")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "credit" ? "bg-white text-shopfront shadow-sm" : "text-ink/50 hover:text-shopfront"
              }`}
            >
              {strategyTexts.creditTitle}
            </button>
            <button
              onClick={() => setActiveTab("profit")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "profit" ? "bg-white text-shopfront shadow-sm" : "text-ink/50 hover:text-shopfront"
              }`}
            >
              {strategyTexts.profitTitle}
            </button>
          </div>

          <div className="flex-1">
            {activeTab === "inventory" && (
              <Card title={strategyTexts.inventoryTitle}>
                <p className="text-xs text-ink/60 mb-4">{strategyTexts.inventoryDesc}</p>
                <div className="space-y-3">
                  {lowStockAlerts.length > 0 ? (
                    <div className="p-3 bg-terracotta/5 border border-terracotta/10 rounded-xl flex items-start gap-2.5">
                      <AlertTriangle className="h-5 w-5 text-terracotta shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <p className="font-bold text-shopfront">Low Stock Alerts</p>
                        <p className="text-ink/60 mt-0.5">
                          You have {lowStockAlerts.length} items running low. Customer satisfaction decreases when basic items are out of stock.
                        </p>
                        <ul className="mt-2 list-disc list-inside text-ink/70 space-y-1 font-medium">
                          {lowStockAlerts.slice(0, 3).map((item) => (
                            <li key={item.id}>
                              {item.name} ({item.stock_qty} {item.unit} left)
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-leaf/5 border border-leaf/10 rounded-xl flex items-start gap-2.5 text-leaf">
                      <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
                      <div className="text-xs text-ink">
                        <p className="font-bold text-leaf">Inventory Health: Strong</p>
                        <p className="text-ink/60 mt-0.5">All tracked products have sufficient stock levels.</p>
                      </div>
                    </div>
                  )}

                  <div className="p-3.5 bg-paper rounded-xl border border-black/5 text-xs">
                    <p className="font-bold text-shopfront mb-1">Coach Tip: Dead Stock Clearance</p>
                    <p className="text-ink/60 leading-relaxed">
                      Products that sit on shelves for over 3 weeks freeze your investment capital. We recommend bundle offers (e.g., selling soap together with washing powder at a 5% discount) to clear space and recover cash.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {activeTab === "credit" && (
              <Card title={strategyTexts.creditTitle}>
                <p className="text-xs text-ink/60 mb-4">{strategyTexts.creditDesc}</p>
                <div className="space-y-3">
                  {duesCustomers.length > 0 ? (
                    <div className="p-3 bg-marigold/5 border border-marigold/10 rounded-xl flex items-start gap-2.5">
                      <AlertTriangle className="h-5 w-5 text-marigold shrink-0 mt-0.5" />
                      <div className="text-xs w-full">
                        <p className="font-bold text-shopfront">Outstanding Udhaar Recovery</p>
                        <p className="text-ink/60 mt-0.5">
                          There are {duesCustomers.length} customers with pending dues. Recovering these will significantly boost your cash liquidity.
                        </p>
                        
                        <div className="mt-3 space-y-2 border-t border-black/5 pt-3">
                          <p className="font-semibold text-ink/40 text-[10px] uppercase tracking-wider">Top outstanding dues</p>
                          {duesCustomers.slice(0, 2).map((c) => (
                            <div key={c.id} className="flex items-center justify-between gap-4 p-2 bg-white rounded-lg border border-black/5">
                              <div>
                                <span className="font-bold text-shopfront block">{c.name}</span>
                                <span className="text-[10px] text-terracotta font-bold">Owes {money(c.outstanding)}</span>
                              </div>
                              <a
                                href={`https://wa.me/?text=Hi%20${c.name},%20a%20polite%20reminder%20that%20you%20have%20an%20outstanding%20balance%20of%20Rs.%20${Math.round(c.outstanding)}%20at%20our%20shop.%20Thank%20you!`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 bg-leaf text-white text-[10px] font-bold rounded-lg hover:bg-leaf/90 transition-all shrink-0"
                              >
                                Remind on WhatsApp
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-leaf/5 border border-leaf/10 rounded-xl flex items-start gap-2.5 text-leaf">
                      <CheckCircle className="h-5 w-5 shrink-0" />
                      <div className="text-xs text-ink">
                        <p className="font-bold text-leaf">Credit Risk: Perfect</p>
                        <p className="text-ink/60 mt-0.5">No customer accounts currently have unpaid balances.</p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {activeTab === "profit" && (
              <Card title={strategyTexts.profitTitle}>
                <p className="text-xs text-ink/60 mb-4">{strategyTexts.profitDesc}</p>
                <div className="space-y-3">
                  <div className="p-3.5 bg-paper rounded-xl border border-black/5 text-xs">
                    <p className="font-bold text-shopfront mb-1">Pricing Tactics</p>
                    <p className="text-ink/60 leading-relaxed">
                      For fast-moving items like flour or sugar, keep prices matching competitors. For specialty or packaged goods (biscuits, spices), increase your margin by buying in bulk cartons rather than single packets.
                    </p>
                  </div>
                  {bestSeller && bestSeller.topSeller && bestSeller.topSeller.qty > 0 && (
                    <div className="p-3 bg-marigold/5 border border-marigold/10 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-marigold" />
                        <div>
                          <p className="font-bold text-shopfront">Feature Top Item</p>
                          <p className="text-ink/60 mt-0.5">'{bestSeller.topSeller.item}' is performing extremely well today.</p>
                        </div>
                      </div>
                      <span className="font-bold text-shopfront bg-white px-2.5 py-1 rounded-lg border border-black/5 shrink-0">
                        {bestSeller.topSeller.qty} units sold
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* AI Report Generator Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Personalized Coaching Report">
            {!coachingPlan ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                {generatingReport ? (
                  <div className="space-y-3">
                    <div className="relative w-12 h-12 mx-auto">
                      <div className="w-12 h-12 rounded-full border-4 border-marigold/20 border-t-marigold animate-spin"></div>
                      <Award className="h-5 w-5 text-marigold absolute inset-0 m-auto" />
                    </div>
                    <p className="text-sm font-bold text-shopfront">{reportSteps}</p>
                    <p className="text-xs text-ink/40">Gathering statistics from your bahi-khata database...</p>
                  </div>
                ) : (
                  <>
                    <BookOpen className="h-10 w-10 text-marigold/30 mb-2" />
                    <h3 className="font-bold text-shopfront text-sm mb-1">Generate Weekly Coaching Report</h3>
                    <p className="text-xs text-ink/50 max-w-sm mb-4">
                      Compile a detailed, customized notebook sheet that outlines specific profit drivers, stock optimizations, and outstanding credit targets tailored to your shop.
                    </p>
                    <button
                      onClick={generateReportPlan}
                      className="bg-marigold text-white hover:bg-marigold/90 text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <Sparkles className="h-4 w-4" /> Generate Coaching Plan
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="ledger-lines bg-white p-5 rounded-2xl relative border border-black/5 overflow-hidden">
                <div className="absolute top-0 right-0 p-3 bg-marigold/10 text-marigold font-bold text-[10px] uppercase rounded-bl-xl tracking-wider">
                  Health: {coachingPlan.score}/100
                </div>

                <div className="space-y-6 mt-4">
                  <div>
                    <h4 className="font-display text-sm font-bold text-shopfront border-b border-black/5 pb-1 uppercase tracking-wider text-ink/40">
                      Coaching Report • {coachingPlan.timestamp}
                    </h4>
                  </div>

                  <div className="space-y-4">
                    {/* Inventory section */}
                    <div>
                      <h5 className="text-xs font-bold text-leaf uppercase tracking-wider mb-2">1. Inventory Optimization</h5>
                      <ul className="space-y-2">
                        {coachingPlan.stockAdvice.map((adv, idx) => (
                          <li key={idx} className="text-xs text-shopfront font-medium flex items-start gap-1.5 leading-relaxed">
                            <span className="text-leaf shrink-0 mt-0.5">•</span>
                            <span>{adv.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Credit section */}
                    <div>
                      <h5 className="text-xs font-bold text-terracotta uppercase tracking-wider mb-2">2. Credit & Udhaar Risk</h5>
                      <ul className="space-y-2">
                        {coachingPlan.creditAdvice.map((adv, idx) => (
                          <li key={idx} className="text-xs text-shopfront font-medium flex items-start gap-1.5 leading-relaxed">
                            <span className="text-terracotta shrink-0 mt-0.5">•</span>
                            <span>{adv.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Profit section */}
                    <div>
                      <h5 className="text-xs font-bold text-marigold uppercase tracking-wider mb-2">3. Profit Maximization</h5>
                      <ul className="space-y-2">
                        {coachingPlan.profitAdvice.map((adv, idx) => (
                          <li key={idx} className="text-xs text-shopfront font-medium flex items-start gap-1.5 leading-relaxed">
                            <span className="text-marigold shrink-0 mt-0.5">•</span>
                            <span>{adv.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-black/5 flex justify-end">
                    <button
                      onClick={generateReportPlan}
                      className="text-xs font-bold text-marigold hover:text-marigold/80 flex items-center gap-1 bg-marigold/10 px-3 py-1.5 rounded-xl transition-all"
                    >
                      <RefreshCw className="h-3.5 w-3.5 animate-spin-hover" /> Recalculate Plan
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Coach QA Chat */}
        <div className="lg:col-span-1 flex flex-col">
          <Card title="Ask your Coach Q&A">
            <div className="flex flex-col h-[380px]">
              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 chat-scroll mb-4 text-xs">
                {chatMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed shadow-sm ${
                        m.role === "user"
                          ? "rounded-br-sm bg-shopfront text-paper"
                          : "rounded-bl-sm bg-paper border border-black/5 text-shopfront font-medium"
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
                {coachThinking && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-paper border border-black/5 px-3.5 py-2.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-marigold rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                      <span className="w-1.5 h-1.5 bg-marigold rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                      <span className="w-1.5 h-1.5 bg-marigold rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleChatSend} className="relative flex items-center gap-2 mt-auto">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask: 'how to recover udhaar?'..."
                  className="w-full bg-paper px-3 py-2.5 rounded-xl border border-black/5 text-xs outline-none focus:border-marigold/40 pr-10"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || coachThinking}
                  className="absolute right-1.5 bg-marigold hover:bg-marigold/90 text-white p-1.5 rounded-lg disabled:opacity-50 transition-all"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

