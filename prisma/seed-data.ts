/**
 * Realistic Georgian marketplace content for local development.
 * Names, course titles, categories and reviews are plausible for the Georgian
 * market so the app looks and behaves like a live product, not a lorem-ipsum
 * shell.
 */

/**
 * The category tree, in the order it is presented.
 *
 * Order is editorial, not alphabetical: the marketplace is positioned around
 * wellness professionals (trainers, nutritionists, yoga teachers) and digital
 * creators, so those verticals lead. The long tail of general skill
 * categories still exists — a gym instructor who also sells a Reels-editing
 * course should find a home for both — it simply sits below the fold.
 *
 * Slugs are permanent: they appear in URLs, sitemaps and the seeded courses,
 * so a category may be renamed or reordered here but never re-slugged.
 */
export const CATEGORIES = [
  // ── Wellness & fitness ───────────────────────────────────────────────────
  { slug: "fitnesi", nameKa: "ფიტნესი და ვარჯიში", nameEn: "Fitness & training", icon: "dumbbell", colorHex: "#f03c06",
    descriptionKa: "სავარჯიშო პროგრამები, ტექნიკა და ძალის განვითარება", descriptionEn: "Training programmes, technique and strength",
    children: [
      { slug: "dzalismieri-vardzishi", nameKa: "ძალისმიერი ვარჯიში", nameEn: "Strength training" },
      { slug: "saxlis-vardzishi", nameKa: "სახლის ვარჯიში", nameEn: "Home workouts" },
    ] },
  { slug: "kveba", nameKa: "კვება და ნუტრიციოლოგია", nameEn: "Nutrition", icon: "leaf", colorHex: "#12b76a",
    descriptionKa: "კვების გეგმები, მაკროები და ჯანსაღი ჩვევები", descriptionEn: "Meal plans, macros and healthy habits", children: [] },
  { slug: "ioga", nameKa: "იოგა და მედიტაცია", nameEn: "Yoga & meditation", icon: "lotus", colorHex: "#7c3aed",
    descriptionKa: "იოგა, სუნთქვა და მაინდფულნესი", descriptionEn: "Yoga, breathwork and mindfulness", children: [] },
  { slug: "janmrteloba", nameKa: "ჯანმრთელობა და აღდგენა", nameEn: "Health & recovery", icon: "pulse", colorHex: "#e11d48",
    descriptionKa: "ტრავმის პრევენცია, აღდგენა, ძილი და სტრესი", descriptionEn: "Injury prevention, recovery, sleep and stress", children: [] },
  { slug: "silamaze", nameKa: "სილამაზე და თვითმოვლა", nameEn: "Beauty & self-care", icon: "sparkles", colorHex: "#db2777",
    descriptionKa: "კანის მოვლა, მაკიაჟი და თვითმოვლის რუტინა", descriptionEn: "Skincare, make-up and self-care routines", children: [] },

  // ── Creator economy ──────────────────────────────────────────────────────
  { slug: "kontenti", nameKa: "კონტენტის შექმნა", nameEn: "Content creation", icon: "camera", colorHex: "#3559f0",
    descriptionKa: "ვიდეო, სცენარი, მონტაჟი და ვიზუალი კრეატორებისთვის", descriptionEn: "Video, scripting, editing and visuals for creators",
    children: [
      { slug: "youtube", nameKa: "YouTube", nameEn: "YouTube" },
      { slug: "mokle-video", nameKa: "მოკლე ვიდეო", nameEn: "Short-form video" },
    ] },
  { slug: "kreatoris-biznesi", nameKa: "კრეატორის ბიზნესი", nameEn: "Creator business", icon: "trendingUp", colorHex: "#0891b2",
    descriptionKa: "აუდიტორიის მონეტიზაცია, სპონსორები და გამოწერები", descriptionEn: "Monetise an audience, sponsorships and subscriptions",
    children: [
      { slug: "monetizacia", nameKa: "მონეტიზაცია", nameEn: "Monetisation" },
      { slug: "sazogadoeba", nameKa: "საზოგადოების მშენებლობა", nameEn: "Community building" },
    ] },
  { slug: "podkasti", nameKa: "პოდკასტი და აუდიო", nameEn: "Podcasting & audio", icon: "mic", colorHex: "#9333ea",
    descriptionKa: "ჩაწერა, მონტაჟი და პოდკასტის გავრცელება", descriptionEn: "Recording, editing and distributing a podcast", children: [] },
  { slug: "kouchingi", nameKa: "ქოუჩინგი და მენტორობა", nameEn: "Coaching & mentoring", icon: "target", colorHex: "#059669",
    descriptionKa: "ონლაინ ქოუჩინგი, ჯგუფური პროგრამები და კლიენტები", descriptionEn: "Online coaching, group programmes and clients", children: [] },
  { slug: "musika", nameKa: "მუსიკა", nameEn: "Music", icon: "music", colorHex: "#f59e0b",
    descriptionKa: "ინსტრუმენტი, ვოკალი და მუსიკის წარმოება", descriptionEn: "Instruments, vocals and music production", children: [] },

  // ── Business & skills ────────────────────────────────────────────────────
  { slug: "marketingi", nameKa: "მარკეტინგი", nameEn: "Marketing", icon: "megaphone", colorHex: "#ff5710",
    descriptionKa: "ციფრული მარკეტინგი, SMM და რეკლამა", descriptionEn: "Digital marketing, social and ads",
    children: [
      { slug: "smm", nameKa: "სოციალური მედია", nameEn: "Social media" },
      { slug: "seo", nameKa: "SEO", nameEn: "SEO" },
    ] },
  { slug: "biznesi", nameKa: "ბიზნესი", nameEn: "Business", icon: "briefcase", colorHex: "#213ade",
    descriptionKa: "ბიზნესის დაწყება, მართვა და ზრდა", descriptionEn: "Start, run and grow a business",
    children: [
      { slug: "startapi", nameKa: "სტარტაპი", nameEn: "Startups" },
      { slug: "menejmenti", nameKa: "მენეჯმენტი", nameEn: "Management" },
    ] },
  { slug: "gaqidvebi", nameKa: "გაყიდვები", nameEn: "Sales", icon: "handshake", colorHex: "#dc2626",
    descriptionKa: "B2B, B2C და მოლაპარაკებები", descriptionEn: "B2B, B2C and negotiation", children: [] },
  { slug: "video", nameKa: "ვიდეო და მონტაჟი", nameEn: "Video & editing", icon: "video", colorHex: "#be123c",
    descriptionKa: "ვიდეო წარმოება და მონტაჟი", descriptionEn: "Video production and editing", children: [] },
  { slug: "potografia", nameKa: "ფოტოგრაფია", nameEn: "Photography", icon: "camera", colorHex: "#64748b",
    descriptionKa: "გადაღება, კომპოზიცია და დამუშავება", descriptionEn: "Shooting, composition and editing", children: [] },
  { slug: "dizaini", nameKa: "დიზაინი", nameEn: "Design", icon: "palette", colorHex: "#9333ea",
    descriptionKa: "გრაფიკული, UI/UX და ბრენდინგი", descriptionEn: "Graphic, UI/UX and branding",
    children: [
      { slug: "ui-ux", nameKa: "UI/UX", nameEn: "UI/UX" },
      { slug: "grafikuli-dizaini", nameKa: "გრაფიკული დიზაინი", nameEn: "Graphic design" },
    ] },
  { slug: "pirovnuli-ganvitareba", nameKa: "პიროვნული განვითარება", nameEn: "Personal development", icon: "sun", colorHex: "#8b5cf6",
    descriptionKa: "პროდუქტიულობა, კომუნიკაცია, ჩვევები", descriptionEn: "Productivity, communication, habits", children: [] },
  { slug: "finansebi", nameKa: "ფინანსები", nameEn: "Finance", icon: "chart", colorHex: "#0284c7",
    descriptionKa: "პირადი ფინანსები, ბუღალტერია, ინვესტიციები", descriptionEn: "Personal finance, accounting, investing", children: [] },
  { slug: "ai", nameKa: "AI", nameEn: "AI", icon: "cpu", colorHex: "#3559f0",
    descriptionKa: "ხელოვნური ინტელექტის ინსტრუმენტები და გამოყენება", descriptionEn: "AI tools and applications", children: [] },
  { slug: "programireba", nameKa: "პროგრამირება", nameEn: "Programming", icon: "code", colorHex: "#16a34a",
    descriptionKa: "ვებ-დეველოპმენტი, მობილური და მონაცემები", descriptionEn: "Web, mobile and data",
    children: [
      { slug: "veb-developmenti", nameKa: "ვებ-დეველოპმენტი", nameEn: "Web development" },
      { slug: "monatsemta-analizi", nameKa: "მონაცემთა ანალიზი", nameEn: "Data analysis" },
    ] },
  { slug: "kripto", nameKa: "კრიპტო", nameEn: "Crypto", icon: "coins", colorHex: "#f79009",
    descriptionKa: "ბლოკჩეინი და ციფრული აქტივები", descriptionEn: "Blockchain and digital assets", children: [] },
  { slug: "kariera", nameKa: "კარიერა", nameEn: "Career", icon: "briefcase", colorHex: "#0d9488",
    descriptionKa: "CV, გასაუბრება და პროფესიული ზრდა", descriptionEn: "CV, interviews and growth", children: [] },
  { slug: "enebi", nameKa: "ენები", nameEn: "Languages", icon: "globe", colorHex: "#0ea5e9",
    descriptionKa: "ინგლისური, გერმანული და სხვა", descriptionEn: "English, German and more", children: [] },
  { slug: "ganatleba", nameKa: "განათლება", nameEn: "Education", icon: "book", colorHex: "#b45309",
    descriptionKa: "სწავლების მეთოდები და მასწავლებლებისთვის", descriptionEn: "Teaching methods and educators", children: [] },
];

export interface SeedCreator {
  email: string;
  fullName: string;
  username: string;
  displayName: string;
  headline: string;
  bio: string;
  instructorBio: string;
  city: string;
  expertise: string[];
  isVerified: boolean;
  isFeatured: boolean;
  websiteUrl?: string;
  linkedinUrl?: string;
  youtubeUrl?: string;
}

export const CREATORS: SeedCreator[] = [
  {
    email: "giorgi.khutsishvili@example.ge",
    fullName: "გიორგი ხუციშვილი",
    username: "giorgi.khutsishvili",
    displayName: "გიორგი ხუციშვილი",
    headline: "ციფრული მარკეტინგის სტრატეგი · 12 წლის გამოცდილება",
    bio: "ვმუშაობ ციფრულ მარკეტინგში 2012 წლიდან. ვასწავლი პრაქტიკულ მიდგომებს, რომლებიც მუშაობს ქართულ ბაზარზე.",
    instructorBio:
      "გიორგი 12 წელია მუშაობს ციფრულ მარკეტინგში და ხელმძღვანელობდა კამპანიებს საქართველოს წამყვანი ბრენდებისთვის. მისი კურსები აგებულია რეალურ ქეისებზე — არა თეორიაზე. დღემდე გადაამზადა 3000-ზე მეტი სპეციალისტი.",
    city: "თბილისი",
    expertise: ["ციფრული მარკეტინგი", "SMM", "Google Ads", "ანალიტიკა"],
    isVerified: true,
    isFeatured: true,
    linkedinUrl: "https://www.linkedin.com/in/example-giorgi",
    websiteUrl: "https://example.ge",
  },
  {
    email: "nino.beridze@example.ge",
    fullName: "ნინო ბერიძე",
    username: "nino.beridze",
    displayName: "ნინო ბერიძე",
    headline: "Senior Python დეველოპერი · მენტორი",
    bio: "ვწერ კოდს 9 წელია და მიყვარს რთული თემების მარტივად ახსნა.",
    instructorBio:
      "ნინო Senior Python დეველოპერია საერთაშორისო პროდუქტულ კომპანიაში. ის ასწავლის პროგრამირებას ნულიდან — ისე, როგორც თავად უნდოდა რომ ესწავლა დაწყებისას. ყველა კურსი შეიცავს პრაქტიკულ პროექტებს.",
    city: "თბილისი",
    expertise: ["Python", "Django", "მონაცემთა ანალიზი", "API"],
    isVerified: true,
    isFeatured: true,
    youtubeUrl: "https://www.youtube.com/@example-nino",
  },
  {
    email: "levan.kapanadze@example.ge",
    fullName: "ლევან კაპანაძე",
    username: "levan.kapanadze",
    displayName: "ლევან კაპანაძე",
    headline: "მეწარმე · 3 კომპანიის დამფუძნებელი",
    bio: "დავაფუძნე სამი კომპანია. ვასწავლი იმას, რაც სინამდვილეში მუშაობს.",
    instructorBio:
      "ლევანმა 2015 წლიდან სამი კომპანია დააფუძნა საქართველოში — ორი წარმატებული, ერთი წარუმატებელი. სწორედ ამიტომ მისი კურსები საუბრობს არა მხოლოდ წარმატებაზე, არამედ იმ შეცდომებზეც, რომლებიც ძვირი დაუჯდა.",
    city: "ბათუმი",
    expertise: ["მეწარმეობა", "სტარტაპი", "ბიზნეს-მოდელი"],
    isVerified: true,
    isFeatured: true,
  },
  {
    email: "salome.tsiklauri@example.ge",
    fullName: "სალომე წიკლაური",
    username: "salome.tsiklauri",
    displayName: "სალომე წიკლაური",
    headline: "პროდუქტის დიზაინერი · UI/UX",
    bio: "ვქმნი ინტერფეისებს, რომლებიც ადამიანებს ეხმარება.",
    instructorBio:
      "სალომე პროდუქტის დიზაინერია და მუშაობდა ფინტექ და საგანმანათლებლო პროდუქტებზე. ის ასწავლის დიზაინს პროცესის ლოგიკიდან — კვლევიდან პროტოტიპამდე, არა მხოლოდ ლამაზ ეკრანებამდე.",
    city: "თბილისი",
    expertise: ["UI/UX", "Figma", "დიზაინ-სისტემები"],
    isVerified: true,
    isFeatured: false,
  },
  {
    email: "davit.gogoladze@example.ge",
    fullName: "დავით გოგოლაძე",
    username: "davit.gogoladze",
    displayName: "დავით გოგოლაძე",
    headline: "ფინანსური ანალიტიკოსი · ACCA",
    bio: "ვეხმარები ადამიანებს ფინანსების გაგებაში მარტივი ენით.",
    instructorBio:
      "დავითი ფინანსური ანალიტიკოსია და ACCA-ს კვალიფიკაციის მფლობელი. მისი მიზანია ფინანსური წიგნიერება ხელმისაწვდომი გახადოს ყველასთვის — ბუღალტრული ჟარგონის გარეშე.",
    city: "თბილისი",
    expertise: ["ფინანსები", "ინვესტიციები", "ბიუჯეტირება"],
    isVerified: false,
    isFeatured: false,
  },
  {
    email: "ana.maisuradze@example.ge",
    fullName: "ანა მაისურაძე",
    username: "ana.maisuradze",
    displayName: "ანა მაისურაძე",
    headline: "AI პროდუქტ-მენეჯერი",
    bio: "ვიკვლევ, როგორ შეუძლია AI-ს ბიზნესის რეალურად დაჩქარება.",
    instructorBio:
      "ანა AI პროდუქტ-მენეჯერია და ეხმარება ქართულ კომპანიებს ხელოვნური ინტელექტის ინსტრუმენტების დანერგვაში. მისი კურსები ორიენტირებულია პრაქტიკულ შედეგზე, არა ჰაიპზე.",
    city: "თბილისი",
    expertise: ["AI", "ავტომატიზაცია", "პროდუქტი"],
    isVerified: true,
    isFeatured: true,
  },
  {
    email: "irakli.chkheidze@example.ge",
    fullName: "ირაკლი ჩხეიძე",
    username: "irakli.chkheidze",
    displayName: "ირაკლი ჩხეიძე",
    headline: "ფოტოგრაფი · ვიდეოგრაფი",
    bio: "10 წელი კამერასთან. ვასწავლი დანახვას, არა მხოლოდ ღილაკებს.",
    instructorBio:
      "ირაკლი კომერციული ფოტოგრაფი და ვიდეოგრაფია. ის ასწავლის კომპოზიციასა და შუქს — უნარებს, რომლებიც ნებისმიერ კამერაზე მუშაობს, თუნდაც ტელეფონზე.",
    city: "ქუთაისი",
    expertise: ["ფოტოგრაფია", "ვიდეო", "მონტაჟი"],
    isVerified: false,
    isFeatured: false,
  },
  {
    email: "tamar.jibladze@example.ge",
    fullName: "თამარ ჯიბლაძე",
    username: "tamar.jibladze",
    displayName: "თამარ ჯიბლაძე",
    headline: "გაყიდვების ტრენერი",
    bio: "ვასწავლი გაყიდვას ისე, რომ არავინ იგრძნოს თავი დაწოლილად.",
    instructorBio:
      "თამარი 8 წელია ატარებს გაყიდვების ტრენინგებს ქართული და საერთაშორისო კომპანიებისთვის. მისი მიდგომა ეფუძნება ნდობის აგებას და კლიენტის რეალური საჭიროების გაგებას.",
    city: "თბილისი",
    expertise: ["გაყიდვები", "მოლაპარაკება", "B2B"],
    isVerified: true,
    isFeatured: false,
  },
  {
    email: "nika.chkhaidze@example.ge",
    fullName: "ნიკა ჩხაიძე",
    username: "nika.chkhaidze",
    displayName: "ნიკა ჩხაიძე",
    headline: "პერსონალური მწვრთნელი · ძალისმიერი ვარჯიში",
    bio: "9 წელია ვამზადებ ადამიანებს დარბაზში და ონლაინ. ტექნიკა ჯერ, წონა მერე.",
    instructorBio:
      "ნიკა სერტიფიცირებული პერსონალური მწვრთნელია და 2016 წლიდან 600-ზე მეტ ადამიანს გაუძღვა ვარჯიშის პროგრამაში. მისი მიდგომა მარტივია: სწორი ტექნიკა, თანდათანობითი დატვირთვა და პროგრამა, რომელსაც რეალურ ცხოვრებაში მიჰყვები — არა ორ კვირაში მიტოვებული გეგმა.",
    city: "თბილისი",
    expertise: ["ძალისმიერი ვარჯიში", "ტექნიკა", "პროგრამირება", "ტრავმის პრევენცია"],
    isVerified: true,
    isFeatured: true,
    youtubeUrl: "https://www.youtube.com/@example-nika",
  },
  {
    email: "eka.lomtadze@example.ge",
    fullName: "ეკა ლომთაძე",
    username: "eka.lomtadze",
    displayName: "ეკა ლომთაძე",
    headline: "ნუტრიციოლოგი · კვების გეგმები",
    bio: "ვეხმარები ადამიანებს კვების გაგებაში დიეტების გარეშე.",
    instructorBio:
      "ეკა ნუტრიციოლოგია და მუშაობს სპორტსმენებთან და ჩვეულებრივ ადამიანებთან, რომლებსაც წონასთან და ენერგიასთან უჭირთ. ის არ ყიდის დიეტებს — ასწავლის, როგორ ააწყო კვება, რომელსაც წლების განმავლობაში მიჰყვები.",
    city: "თბილისი",
    expertise: ["ნუტრიციოლოგია", "მაკროები", "წონის კონტროლი", "სპორტული კვება"],
    isVerified: true,
    isFeatured: true,
  },
  {
    email: "mariam.ghonghadze@example.ge",
    fullName: "მარიამ ღონღაძე",
    username: "mariam.ghonghadze",
    displayName: "მარიამ ღონღაძე",
    headline: "იოგას ინსტრუქტორი · სუნთქვა და მაინდფულნესი",
    bio: "იოგა ჩემთვის მოქნილობა კი არა, თავთან შეთანხმებაა.",
    instructorBio:
      "მარიამი 200-საათიანი სერტიფიცირებული იოგას ინსტრუქტორია და ბათუმში საკუთარ სტუდიას უძღვება. მისი კურსები დამწყებზეა გათვლილი — მათზე, ვისაც ჰგონია, რომ „საკმარისად მოქნილი არ ვარ იოგისთვის\".",
    city: "ბათუმი",
    expertise: ["იოგა", "სუნთქვა", "მედიტაცია", "ზურგის ჯანმრთელობა"],
    isVerified: true,
    isFeatured: true,
    websiteUrl: "https://example.ge/yoga",
  },
  {
    email: "saba.lominadze@example.ge",
    fullName: "საბა ლომინაძე",
    username: "saba.lominadze",
    displayName: "საბა ლომინაძე",
    headline: "კონტენტ-კრეატორი · 400K მიმდევარი",
    bio: "ვქმნი ვიდეოს 2019 წლიდან და ვასწავლი იმას, რაც მართლა ამუშავდა.",
    instructorBio:
      "საბა კონტენტ-კრეატორია, რომელმაც აუდიტორია ნულიდან ააწყო და დღეს სრულ განაკვეთზე ცხოვრობს კონტენტით. ის ასწავლის სისტემას — იდეიდან სცენარამდე, მონტაჟიდან მონეტიზაციამდე — და ღიად ჰყვება იმ ციფრებსაც, რომლებიც არ გამოუვიდა.",
    city: "თბილისი",
    expertise: ["მოკლე ვიდეო", "YouTube", "სცენარი", "მონეტიზაცია"],
    isVerified: true,
    isFeatured: true,
    youtubeUrl: "https://www.youtube.com/@example-saba",
  },
];

export interface SeedLesson {
  title: string;
  type: "VIDEO" | "TEXT" | "PDF" | "QUIZ";
  durationSeconds?: number;
  isFreePreview?: boolean;
  description?: string;
  textContent?: string;
  quiz?: {
    title: string;
    passingScore: number;
    questions: {
      prompt: string;
      type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE";
      explanation?: string;
      answers: { text: string; isCorrect: boolean }[];
    }[];
  };
}

export interface SeedModule {
  title: string;
  description?: string;
  lessons: SeedLesson[];
}

export interface SeedCourse {
  title: string;
  subtitle: string;
  description: string;
  creatorEmail: string;
  categorySlug: string;
  subcategorySlug?: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "ALL_LEVELS";
  price: number;
  discountPrice?: number;
  isFeatured?: boolean;
  thumbSeed: string;
  learningOutcomes: string[];
  requirements: string[];
  targetAudience: string[];
  faqs: { question: string; answer: string }[];
  modules: SeedModule[];
}

const standardFaqs = [
  {
    question: "რამდენ ხანში მაქვს კურსზე წვდომა?",
    answer: "წვდომა სამუდამოა. ერთხელ შეძენის შემდეგ კურსი და მისი ყველა მომავალი განახლება თქვენია.",
  },
  {
    question: "შემიძლია ტელეფონიდან სწავლა?",
    answer: "დიახ. პლატფორმა სრულად მუშაობს ტელეფონსა და ტაბლეტზე, პროგრესი კი ავტომატურად ინახება.",
  },
  {
    question: "მივიღებ სერტიფიკატს?",
    answer: "დიახ. კურსის 100%-ით დასრულების შემდეგ ავტომატურად გენერირდება სერტიფიკატი უნიკალური ID-ით, რომლის დამოწმებაც ნებისმიერს შეუძლია.",
  },
];

export const COURSES: SeedCourse[] = [
  {
    title: "ციფრული მარკეტინგის საფუძვლები",
    subtitle: "ნულიდან პირველ კამპანიამდე — ქართული ბაზრის რეალურ მაგალითებზე",
    description:
      "ეს კურსი შექმნილია მათთვის, ვისაც სურს ციფრული მარკეტინგის სისტემური გაგება. თეორიის ნაცვლად ვმუშაობთ რეალურ ქეისებზე: ბრენდის პოზიციონირებიდან Facebook და Google რეკლამის გაშვებამდე, ანალიტიკის დაყენებიდან შედეგების გაზომვამდე.\n\nკურსის ბოლოს გექნებათ დასრულებული მარკეტინგული სტრატეგია და გაშვებული პირველი კამპანია.",
    creatorEmail: "giorgi.khutsishvili@example.ge",
    categorySlug: "marketingi",
    subcategorySlug: "smm",
    level: "BEGINNER",
    price: 149,
    discountPrice: 99,
    isFeatured: true,
    thumbSeed: "marketing",
    learningOutcomes: [
      "შექმნი სრულ მარკეტინგულ სტრატეგიას ნულიდან",
      "გაუშვებ და გააოპტიმიზირებ Facebook და Instagram რეკლამას",
      "დააყენებ Google Analytics 4-ს და გაზომავ კონვერსიებს",
      "დაწერ გამყიდველ ტექსტს ქართულ აუდიტორიაზე",
      "გამოთვლი ROI-ს და გაიგებ, რომელი არხი მუშაობს",
    ],
    requirements: [
      "კომპიუტერი ინტერნეტით",
      "წინასწარი ცოდნა არ არის საჭირო",
      "სასურველია Facebook-ის ანგარიში პრაქტიკისთვის",
    ],
    targetAudience: [
      "მცირე ბიზნესის მფლობელები",
      "დამწყები მარკეტოლოგები",
      "თავისუფალი სპეციალისტები, ვისაც კლიენტების მოზიდვა სურს",
    ],
    faqs: standardFaqs,
    modules: [
      {
        title: "მოდული 1 — შესავალი",
        description: "რა არის ციფრული მარკეტინგი და როგორ იწყება სტრატეგია",
        lessons: [
          { title: "კურსის მიმოხილვა", type: "VIDEO", durationSeconds: 12, isFreePreview: true,
            description: "რას ისწავლით ამ კურსში და როგორ გამოიყენოთ მასალა მაქსიმალურად." },
          { title: "ციფრული მარკეტინგის ეკოსისტემა", type: "VIDEO", durationSeconds: 20, isFreePreview: true,
            description: "არხები, მათი როლი და როგორ მუშაობენ ერთად." },
          { title: "სამიზნე აუდიტორიის განსაზღვრა", type: "TEXT",
            textContent:
              "სამიზნე აუდიტორიის განსაზღვრა მარკეტინგის ყველაზე ხშირად გამოტოვებული ნაბიჯია.\n\nდაიწყეთ სამი კითხვით: ვინ არის ადამიანი, რომელსაც პრობლემა აქვს? რა ენით აღწერს ის ამ პრობლემას? სად ატარებს დროს ონლაინ?\n\nჩაწერეთ პასუხები კონკრეტულად. „ახალგაზრდები 18-35\" არ არის აუდიტორია — ეს არის დემოგრაფია. „თბილისში მცხოვრები დამწყები მეწარმე, რომელსაც პირველი კლიენტის მოზიდვა უჭირს\" — ეს უკვე აუდიტორიაა." },
          { title: "ცოდნის შემოწმება — საფუძვლები", type: "QUIZ",
            quiz: {
              title: "მოდული 1 — ტესტი", passingScore: 70,
              questions: [
                { prompt: "რა არის სამიზნე აუდიტორიის განსაზღვრის მთავარი მიზანი?",
                  type: "SINGLE_CHOICE",
                  explanation: "აუდიტორიის ცოდნა განსაზღვრავს გზავნილს, არხსა და ბიუჯეტს.",
                  answers: [
                    { text: "რომ გზავნილი და არხი სწორად შევარჩიოთ", isCorrect: true },
                    { text: "რომ რეკლამა უფრო იაფი იყოს", isCorrect: false },
                    { text: "რომ მეტი მიმდევარი გვყავდეს", isCorrect: false },
                  ] },
                { prompt: "დემოგრაფია და აუდიტორია ერთი და იგივეა.",
                  type: "TRUE_FALSE",
                  explanation: "დემოგრაფია მხოლოდ აღწერს ვინ არიან; აუდიტორია მოიცავს საჭიროებასა და ქცევას.",
                  answers: [
                    { text: "სწორი", isCorrect: false },
                    { text: "მცდარი", isCorrect: true },
                  ] },
                { prompt: "რომელი არხები განეკუთვნება ციფრულ მარკეტინგს?",
                  type: "MULTIPLE_CHOICE",
                  answers: [
                    { text: "სოციალური მედია", isCorrect: true },
                    { text: "ელფოსტა", isCorrect: true },
                    { text: "საძიებო სისტემები", isCorrect: true },
                    { text: "ბილბორდი მაღალ ჩქაროსნულზე", isCorrect: false },
                  ] },
              ],
            } },
        ],
      },
      {
        title: "მოდული 2 — სოციალური მედია და რეკლამა",
        lessons: [
          { title: "Facebook Business Manager-ის დაყენება", type: "VIDEO", durationSeconds: 16,
            description: "ანგარიშის სტრუქტურა, პიქსელი და წვდომები." },
          { title: "პირველი კამპანიის აწყობა", type: "VIDEO", durationSeconds: 20,
            description: "მიზნები, აუდიტორია, ბიუჯეტი და კრეატივი." },
          { title: "სარეკლამო ტექსტის შაბლონები", type: "TEXT",
            textContent:
              "ეფექტური სარეკლამო ტექსტი სამ ნაწილს შეიცავს: კაუჭი, ღირებულება, მოქმედების მოწოდება.\n\nკაუჭი — პირველი წინადადება, რომელიც სქროლს აჩერებს. ის უნდა ეხებოდეს პრობლემას, არა პროდუქტს.\n\nღირებულება — რას იღებს ადამიანი. კონკრეტულად, რიცხვებით სადაც შესაძლებელია.\n\nმოქმედება — ერთი, ნათელი ნაბიჯი. არა სამი." },
        ],
      },
      {
        title: "მოდული 3 — ანალიტიკა და შედეგები",
        lessons: [
          { title: "Google Analytics 4 — დაყენება", type: "VIDEO", durationSeconds: 16 },
          { title: "კონვერსიების გაზომვა", type: "VIDEO", durationSeconds: 12 },
          { title: "ROI-ის გამოთვლა", type: "TEXT",
            textContent:
              "ROI = (შემოსავალი − დანახარჯი) ÷ დანახარჯი × 100%.\n\nმაგალითი: დახარჯეთ 1000 ლარი რეკლამაზე და მიიღეთ 3500 ლარის გაყიდვა. ROI = (3500 − 1000) ÷ 1000 × 100% = 250%.\n\nმნიშვნელოვანი: შემოსავალში გაითვალისწინეთ მხოლოდ ის, რაც რეალურად ამ არხიდან მოვიდა." },
        ],
      },
    ],
  },
  {
    title: "პროგრამირება Python-ში დამწყებთათვის",
    subtitle: "ისწავლე პროგრამირება ნულიდან — 5 რეალური პროექტით",
    description:
      "Python ყველაზე მოთხოვნადი ენაა დამწყებთათვის და არა შემთხვევით: მისი სინტაქსი ინგლისურ ენას ჰგავს და კოდის დაწერა სწრაფად ისწავლება.\n\nამ კურსში ვიწყებთ ცვლადებიდან და მივდივართ რეალურ პროექტებამდე — ვქმნით კალკულატორს, ვამუშავებთ ფაილებს, ვწერთ ვებ-სკრეიპერს და ვაშენებთ პატარა API-ს.",
    creatorEmail: "nino.beridze@example.ge",
    categorySlug: "programireba",
    subcategorySlug: "veb-developmenti",
    level: "BEGINNER",
    price: 199,
    discountPrice: 139,
    isFeatured: true,
    thumbSeed: "python",
    learningOutcomes: [
      "დაწერ Python კოდს ნულიდან",
      "გაიგებ ცვლადებს, ციკლებს, ფუნქციებსა და კლასებს",
      "იმუშავებ ფაილებთან და მონაცემებთან",
      "შექმნი 5 დასრულებულ პროექტს პორტფოლიოსთვის",
      "მოემზადები junior დეველოპერის პოზიციისთვის",
    ],
    requirements: ["კომპიუტერი (Windows, macOS ან Linux)", "პროგრამირების გამოცდილება არ არის საჭირო"],
    targetAudience: [
      "სრულიად დამწყებები",
      "ვისაც სურს პროფესიის შეცვლა IT-ში",
      "სტუდენტები და მოსწავლეები",
    ],
    faqs: standardFaqs,
    modules: [
      {
        title: "მოდული 1 — პირველი ნაბიჯები",
        lessons: [
          { title: "რატომ Python?", type: "VIDEO", durationSeconds: 12, isFreePreview: true },
          { title: "გარემოს დაყენება", type: "VIDEO", durationSeconds: 16, isFreePreview: true,
            description: "Python-ის და VS Code-ის ინსტალაცია ნაბიჯ-ნაბიჯ." },
          { title: "პირველი პროგრამა", type: "VIDEO", durationSeconds: 12 },
        ],
      },
      {
        title: "მოდული 2 — ენის საფუძვლები",
        lessons: [
          { title: "ცვლადები და ტიპები", type: "VIDEO", durationSeconds: 20 },
          { title: "პირობები და ციკლები", type: "VIDEO", durationSeconds: 20 },
          { title: "ფუნქციები", type: "VIDEO", durationSeconds: 16 },
          { title: "სავარჯიშოები", type: "TEXT",
            textContent:
              "შეასრულეთ სამი სავარჯიშო:\n\n1. დაწერეთ ფუნქცია, რომელიც იღებს სიას და აბრუნებს მხოლოდ ლუწ რიცხვებს.\n\n2. დაწერეთ პროგრამა, რომელიც ითვლის ტექსტში სიტყვების რაოდენობას.\n\n3. დაწერეთ ფუნქცია, რომელიც ამოწმებს, არის თუ არა სიტყვა პალინდრომი.\n\nსცადეთ დამოუკიდებლად, სანამ პასუხს ნახავთ." },
          { title: "ტესტი — საფუძვლები", type: "QUIZ",
            quiz: {
              title: "Python — საფუძვლები", passingScore: 60,
              questions: [
                { prompt: "რომელი სიმბოლოთი იწყება კომენტარი Python-ში?",
                  type: "SINGLE_CHOICE",
                  answers: [
                    { text: "#", isCorrect: true },
                    { text: "//", isCorrect: false },
                    { text: "<!--", isCorrect: false },
                  ] },
                { prompt: "Python-ში ინდენტაცია სინტაქსის ნაწილია.",
                  type: "TRUE_FALSE",
                  explanation: "დიახ — ბლოკები განისაზღვრება ინდენტაციით, არა ფრჩხილებით.",
                  answers: [
                    { text: "სწორი", isCorrect: true },
                    { text: "მცდარი", isCorrect: false },
                  ] },
              ],
            } },
        ],
      },
      {
        title: "მოდული 3 — პრაქტიკული პროექტები",
        lessons: [
          { title: "პროექტი: კალკულატორი", type: "VIDEO", durationSeconds: 20 },
          { title: "პროექტი: ფაილების დამუშავება", type: "VIDEO", durationSeconds: 16 },
          { title: "პროექტი: ვებ-სკრეიპერი", type: "VIDEO", durationSeconds: 20 },
        ],
      },
    ],
  },
  {
    title: "როგორ დავიწყოთ საკუთარი ბიზნესი საქართველოში",
    subtitle: "იდეიდან პირველ გაყიდვამდე — რეგისტრაცია, გადასახადები, პირველი კლიენტები",
    description:
      "ბიზნესის დაწყება საქართველოში უფრო მარტივია, ვიდრე ბევრი ფიქრობს — მაგრამ მხოლოდ მაშინ, თუ იცი თანმიმდევრობა.\n\nეს კურსი გატარებთ მთელ გზაზე: იდეის ვალიდაციიდან ინდივიდუალური მეწარმის რეგისტრაციამდე, გადასახადების რეჟიმის არჩევიდან პირველი კლიენტის მოზიდვამდე.",
    creatorEmail: "levan.kapanadze@example.ge",
    categorySlug: "biznesi",
    subcategorySlug: "startapi",
    level: "BEGINNER",
    price: 179,
    isFeatured: true,
    thumbSeed: "business",
    learningOutcomes: [
      "შეამოწმებ ბიზნეს-იდეას ფულის დახარჯვამდე",
      "დაარეგისტრირებ ინდივიდუალურ მეწარმეს ან შპს-ს",
      "აირჩევ სწორ საგადასახადო რეჟიმს",
      "დათვლი ერთეულის ეკონომიკას",
      "მოიზიდავ პირველ 10 კლიენტს ბიუჯეტის გარეშე",
    ],
    requirements: ["ბიზნეს-იდეა ან სურვილი მისი პოვნის", "წინასწარი ცოდნა არ არის საჭირო"],
    targetAudience: ["დამწყები მეწარმეები", "თავისუფალი სპეციალისტები", "ვისაც სამსახურიდან საკუთარ საქმეზე გადასვლა სურს"],
    faqs: standardFaqs,
    modules: [
      {
        title: "მოდული 1 — იდეა და ვალიდაცია",
        lessons: [
          { title: "რატომ ვარდება ბიზნესების უმეტესობა", type: "VIDEO", durationSeconds: 16, isFreePreview: true },
          { title: "იდეის შემოწმება 7 დღეში", type: "VIDEO", durationSeconds: 20 },
          { title: "ერთეულის ეკონომიკა", type: "TEXT",
            textContent:
              "ერთეულის ეკონომიკა პასუხობს ერთ კითხვას: გამოვდივართ თუ არა მოგებაზე ერთ კლიენტზე?\n\nდაითვალეთ: რამდენი გიჯდებათ ერთი კლიენტის მოზიდვა (CAC) და რამდენს გიტოვებთ ის მთელი თანამშრომლობის მანძილზე (LTV).\n\nთუ LTV < CAC — ყოველი ახალი კლიენტი ზარალია. მასშტაბირება ამ მდგომარეობაში ზარალსაც აზრდის." },
        ],
      },
      {
        title: "მოდული 2 — რეგისტრაცია და გადასახადები",
        lessons: [
          { title: "ინდივიდუალური მეწარმე თუ შპს?", type: "VIDEO", durationSeconds: 20 },
          { title: "მცირე ბიზნესის სტატუსი", type: "VIDEO", durationSeconds: 16 },
          { title: "საბუთების ჩამონათვალი", type: "TEXT",
            textContent:
              "რეგისტრაციისთვის დაგჭირდებათ:\n\n• პირადობის მოწმობა\n• იურიდიული მისამართის დამადასტურებელი დოკუმენტი\n• სახელმწიფო ბაჟის გადახდის ქვითარი\n\nრეგისტრაცია იუსტიციის სახლში ერთ სამუშაო დღეში სრულდება. მცირე ბიზნესის სტატუსის მოთხოვნა ცალკე, შემოსავლების სამსახურის პორტალიდან ხდება." },
        ],
      },
      {
        title: "მოდული 3 — პირველი კლიენტები",
        lessons: [
          { title: "პირველი 10 კლიენტი ბიუჯეტის გარეშე", type: "VIDEO", durationSeconds: 20 },
          { title: "ფასის დადგენა", type: "VIDEO", durationSeconds: 16 },
        ],
      },
    ],
  },
  {
    title: "AI ინსტრუმენტები ბიზნესისთვის",
    subtitle: "პრაქტიკული ავტომატიზაცია — დაზოგე კვირაში 10 საათი",
    description:
      "ხელოვნური ინტელექტი აღარ არის მომავლის თემა — ის უკვე ამცირებს ხარჯებს იმ კომპანიებში, რომლებმაც სწორად დანერგეს.\n\nეს კურსი არ არის ჰაიპზე. ვმუშაობთ კონკრეტულ ამოცანებზე: ტექსტის მომზადება, მონაცემების დამუშავება, კლიენტის მომსახურება, დოკუმენტების ანალიზი და სამუშაო პროცესების ავტომატიზაცია.",
    creatorEmail: "ana.maisuradze@example.ge",
    categorySlug: "ai",
    level: "INTERMEDIATE",
    price: 229,
    discountPrice: 169,
    isFeatured: true,
    thumbSeed: "ai",
    learningOutcomes: [
      "დანერგავ AI-ს კონკრეტულ სამუშაო პროცესებში",
      "დაწერ ეფექტურ prompt-ებს ქართულ და ინგლისურ ენაზე",
      "ავტომატიზირებ განმეორებად ამოცანებს",
      "შეაფასებ, სად ღირს AI და სად არა",
      "დაიცავ კომპანიის მონაცემებს AI-ს გამოყენებისას",
    ],
    requirements: ["კომპიუტერი ინტერნეტით", "ბაზისური კომპიუტერული უნარები"],
    targetAudience: ["ბიზნესის მფლობელები და მენეჯერები", "მარკეტოლოგები და ანალიტიკოსები", "ვისაც სამუშაო დროის დაზოგვა სურს"],
    faqs: standardFaqs,
    modules: [
      {
        title: "მოდული 1 — საფუძვლები",
        lessons: [
          { title: "რა შეუძლია AI-ს და რა — არა", type: "VIDEO", durationSeconds: 16, isFreePreview: true },
          { title: "Prompt-ის აგების პრინციპები", type: "VIDEO", durationSeconds: 20 },
          { title: "მონაცემთა უსაფრთხოება", type: "TEXT",
            textContent:
              "სანამ AI-ს ინსტრუმენტში მონაცემს ჩააგდებთ, დაისვით სამი კითხვა:\n\n1. არის თუ არა ეს პერსონალური მონაცემი? თუ კი — გჭირდებათ სამართლებრივი საფუძველი.\n\n2. არის თუ არა კომერციული საიდუმლო? უფასო ინსტრუმენტების უმეტესობა იტოვებს უფლებას მონაცემი გამოიყენოს.\n\n3. შემიძლია თუ არა ანონიმიზაცია? ხშირად სახელისა და საკონტაქტო მონაცემის ამოღება საკმარისია." },
        ],
      },
      {
        title: "მოდული 2 — პრაქტიკული გამოყენება",
        lessons: [
          { title: "კონტენტის მომზადება", type: "VIDEO", durationSeconds: 20 },
          { title: "მონაცემების ანალიზი", type: "VIDEO", durationSeconds: 16 },
          { title: "პროცესების ავტომატიზაცია", type: "VIDEO", durationSeconds: 20 },
          { title: "ტესტი — AI ბიზნესში", type: "QUIZ",
            quiz: {
              title: "AI ბიზნესში — შემოწმება", passingScore: 70,
              questions: [
                { prompt: "რა უნდა შევამოწმოთ სანამ AI-ს კომპანიის მონაცემს გადავცემთ?",
                  type: "MULTIPLE_CHOICE",
                  answers: [
                    { text: "არის თუ არა პერსონალური მონაცემი", isCorrect: true },
                    { text: "არის თუ არა კომერციული საიდუმლო", isCorrect: true },
                    { text: "შესაძლებელია თუ არა ანონიმიზაცია", isCorrect: true },
                    { text: "რამდენად სწრაფად პასუხობს მოდელი", isCorrect: false },
                  ] },
                { prompt: "AI-ს პასუხი ყოველთვის ფაქტობრივად სწორია.",
                  type: "TRUE_FALSE",
                  explanation: "ენობრივი მოდელები შეიძლება დამაჯერებლად შეცდნენ. შედეგი ყოველთვის უნდა შემოწმდეს.",
                  answers: [
                    { text: "სწორი", isCorrect: false },
                    { text: "მცდარი", isCorrect: true },
                  ] },
              ],
            } },
        ],
      },
    ],
  },
  {
    title: "ფინანსური განათლება დამწყებთათვის",
    subtitle: "ბიუჯეტი, დანაზოგი და ინვესტიციები — მარტივი ენით",
    description:
      "ფინანსური წიგნიერება არ საჭიროებს ეკონომიკურ განათლებას. საჭიროა სისტემა და თანმიმდევრობა.\n\nკურსი გასწავლით ბიუჯეტის შედგენას, ვალის სწორ მართვას, სარეზერვო ფონდის შექმნას და ინვესტირების საფუძვლებს — ქართული რეალობის გათვალისწინებით.",
    creatorEmail: "davit.gogoladze@example.ge",
    categorySlug: "finansebi",
    level: "BEGINNER",
    price: 89,
    thumbSeed: "finance",
    learningOutcomes: [
      "შეადგენ პირად ბიუჯეტს, რომელიც მართლა მუშაობს",
      "შექმნი სარეზერვო ფონდს",
      "გაიგებ სესხების რეალურ ღირებულებას",
      "დაიწყებ ინვესტირებას მცირე თანხითაც",
    ],
    requirements: ["წინასწარი ცოდნა არ არის საჭირო"],
    targetAudience: ["ვისაც ფინანსების მოწესრიგება სურს", "ახალგაზრდა სპეციალისტები", "ოჯახები"],
    faqs: standardFaqs,
    modules: [
      {
        title: "მოდული 1 — ბიუჯეტი",
        lessons: [
          { title: "სად მიდის ფული", type: "VIDEO", durationSeconds: 12, isFreePreview: true },
          { title: "50/30/20 წესი", type: "VIDEO", durationSeconds: 16 },
          { title: "ბიუჯეტის შაბლონი", type: "TEXT",
            textContent:
              "მარტივი ბიუჯეტი სამ კატეგორიად იყოფა:\n\n50% — აუცილებელი ხარჯები: ბინა, კომუნალური, საკვები, ტრანსპორტი.\n\n30% — სურვილები: გართობა, კაფე, შოპინგი.\n\n20% — დანაზოგი და ვალის დაფარვა.\n\nთუ პირველი კატეგორია 50%-ს აჭარბებს, პრობლემა შემოსავალშია ან საცხოვრებელ ხარჯში — არა ყავაში." },
        ],
      },
      {
        title: "მოდული 2 — დანაზოგი და ინვესტიცია",
        lessons: [
          { title: "სარეზერვო ფონდი", type: "VIDEO", durationSeconds: 16 },
          { title: "ინვესტირების საფუძვლები", type: "VIDEO", durationSeconds: 20 },
        ],
      },
    ],
  },
  {
    title: "UI/UX დიზაინი Figma-ში",
    subtitle: "კვლევიდან პროტოტიპამდე — სრული პროცესი ერთ კურსში",
    description:
      "კარგი დიზაინი ლამაზი ეკრანი არ არის — ეს გადაწყვეტილებების თანმიმდევრობაა.\n\nკურსში გავივლით სრულ პროცესს: მომხმარებლის კვლევა, ინფორმაციული არქიტექტურა, wireframe, ვიზუალური დიზაინი, დიზაინ-სისტემა და ინტერაქტიული პროტოტიპი.",
    creatorEmail: "salome.tsiklauri@example.ge",
    categorySlug: "dizaini",
    subcategorySlug: "ui-ux",
    level: "INTERMEDIATE",
    price: 189,
    discountPrice: 149,
    thumbSeed: "design",
    learningOutcomes: [
      "იმუშავებ Figma-ში პროფესიონალურად",
      "ჩაატარებ მომხმარებლის კვლევას",
      "შექმნი დიზაინ-სისტემას",
      "ააწყობ ინტერაქტიულ პროტოტიპს",
      "მოამზადებ პორტფოლიოს ქეისს",
    ],
    requirements: ["კომპიუტერი", "Figma-ს უფასო ანგარიში"],
    targetAudience: ["დამწყები დიზაინერები", "დეველოპერები, ვისაც დიზაინის გაგება სურს", "პროდუქტ-მენეჯერები"],
    faqs: standardFaqs,
    modules: [
      {
        title: "მოდული 1 — საფუძვლები",
        lessons: [
          { title: "დიზაინის პროცესი", type: "VIDEO", durationSeconds: 16, isFreePreview: true },
          { title: "Figma-ს ინტერფეისი", type: "VIDEO", durationSeconds: 20 },
        ],
      },
      {
        title: "მოდული 2 — პრაქტიკა",
        lessons: [
          { title: "Wireframe-იდან მაკეტამდე", type: "VIDEO", durationSeconds: 20 },
          { title: "დიზაინ-სისტემა და კომპონენტები", type: "VIDEO", durationSeconds: 16 },
          { title: "პროტოტიპირება", type: "VIDEO", durationSeconds: 12 },
        ],
      },
    ],
  },
  {
    title: "გაყიდვები B2B სეგმენტში",
    subtitle: "ცივი კონტაქტიდან ხელმოწერილ კონტრაქტამდე",
    description:
      "B2B გაყიდვა გრძელი პროცესია, სადაც გადაწყვეტილებას რამდენიმე ადამიანი იღებს.\n\nკურსი გასწავლით სისტემურ მიდგომას: ლიდების კვალიფიკაცია, პირველი შეხვედრა, საჭიროების გამოვლენა, შეთავაზების მომზადება, წინააღმდეგობებთან მუშაობა და გარიგების დახურვა.",
    creatorEmail: "tamar.jibladze@example.ge",
    categorySlug: "gaqidvebi",
    level: "INTERMEDIATE",
    price: 159,
    thumbSeed: "sales",
    learningOutcomes: [
      "ააგებ გაყიდვების პროცესს ეტაპებად",
      "ჩაატარებ შეხვედრას, რომელიც შედეგს იძლევა",
      "იმუშავებ წინააღმდეგობებთან თავდაჯერებულად",
      "დახურავ გარიგებას ზეწოლის გარეშე",
    ],
    requirements: ["გაყიდვების გამოცდილება სასურველია, მაგრამ არა სავალდებულო"],
    targetAudience: ["გაყიდვების მენეჯერები", "მეწარმეები", "account manager-ები"],
    faqs: standardFaqs,
    modules: [
      {
        title: "მოდული 1 — პროცესი",
        lessons: [
          { title: "B2B გაყიდვის ეტაპები", type: "VIDEO", durationSeconds: 16, isFreePreview: true },
          { title: "ლიდების კვალიფიკაცია", type: "VIDEO", durationSeconds: 20 },
        ],
      },
      {
        title: "მოდული 2 — შეხვედრა და დახურვა",
        lessons: [
          { title: "საჭიროების გამოვლენა", type: "VIDEO", durationSeconds: 20 },
          { title: "წინააღმდეგობებთან მუშაობა", type: "VIDEO", durationSeconds: 16 },
          { title: "გარიგების დახურვა", type: "VIDEO", durationSeconds: 12 },
        ],
      },
    ],
  },
  {
    title: "მობილური ფოტოგრაფია",
    subtitle: "პროფესიონალური კადრები ტელეფონით — უფასო კურსი",
    description:
      "საუკეთესო კამერა ის არის, რომელიც თან გაქვს.\n\nეს უფასო კურსი გასწავლით კომპოზიციას, შუქთან მუშაობას და დამუშავებას — ყველაფერს, რაც ტელეფონის კამერით შედეგს გააუმჯობესებს.",
    creatorEmail: "irakli.chkheidze@example.ge",
    categorySlug: "potografia",
    level: "BEGINNER",
    price: 0,
    thumbSeed: "photo",
    learningOutcomes: [
      "გაიგებ კომპოზიციის წესებს",
      "იმუშავებ ბუნებრივ შუქთან",
      "დაამუშავებ ფოტოს ტელეფონშივე",
    ],
    requirements: ["სმარტფონი კამერით"],
    targetAudience: ["სრულიად დამწყებები", "მცირე ბიზნესი, ვისაც პროდუქტის ფოტო სჭირდება"],
    faqs: standardFaqs,
    modules: [
      {
        title: "მოდული 1 — საფუძვლები",
        lessons: [
          { title: "კომპოზიციის წესები", type: "VIDEO", durationSeconds: 16, isFreePreview: true },
          { title: "შუქთან მუშაობა", type: "VIDEO", durationSeconds: 12 },
          { title: "დამუშავება ტელეფონში", type: "VIDEO", durationSeconds: 12 },
        ],
      },
    ],
  },
  {
    title: "ინგლისური ენა ბიზნესისთვის",
    subtitle: "მოლაპარაკება, პრეზენტაცია და მიმოწერა — B1-დან C1-მდე",
    description:
      "ბიზნეს-ინგლისური ცალკე უნარია. გრამატიკის ცოდნა არ ნიშნავს, რომ შეხვედრაზე თავდაჯერებულად ისაუბრებ.\n\nკურსი ფოკუსირებულია რეალურ სიტუაციებზე: ელფოსტა, ზარი, პრეზენტაცია, მოლაპარაკება და small talk.",
    creatorEmail: "giorgi.khutsishvili@example.ge",
    categorySlug: "enebi",
    level: "INTERMEDIATE",
    price: 129,
    discountPrice: 89,
    thumbSeed: "english",
    learningOutcomes: [
      "დაწერ პროფესიონალურ ბიზნეს-ელფოსტას",
      "ჩაატარებ პრეზენტაციას ინგლისურად",
      "მიიღებ მონაწილეობას მოლაპარაკებაში",
    ],
    requirements: ["ინგლისურის საბაზისო ცოდნა (A2-B1)"],
    targetAudience: ["ოფისის თანამშრომლები", "საერთაშორისო კომპანიების კანდიდატები"],
    faqs: standardFaqs,
    modules: [
      {
        title: "მოდული 1 — წერითი კომუნიკაცია",
        lessons: [
          { title: "ბიზნეს-ელფოსტის სტრუქტურა", type: "VIDEO", durationSeconds: 16, isFreePreview: true },
          { title: "ტონი და ფორმალურობა", type: "VIDEO", durationSeconds: 12 },
        ],
      },
      {
        title: "მოდული 2 — ზეპირი კომუნიკაცია",
        lessons: [
          { title: "პრეზენტაციის ენა", type: "VIDEO", durationSeconds: 20 },
          { title: "მოლაპარაკების ფრაზები", type: "VIDEO", durationSeconds: 16 },
        ],
      },
    ],
  },
  {
    title: "პროდუქტიულობა და დროის მართვა",
    subtitle: "სისტემა, რომელიც მუშაობს მაშინაც, როცა მოტივაცია არ არის",
    description:
      "პროდუქტიულობა დისციპლინაზე მეტად სისტემაზეა დამოკიდებული.\n\nკურსში ავაწყობთ პირად სისტემას: ამოცანების შეგროვება, პრიორიტეტიზაცია, კალენდრის დაგეგმვა და ყურადღების დაცვა.",
    creatorEmail: "ana.maisuradze@example.ge",
    categorySlug: "pirovnuli-ganvitareba",
    level: "ALL_LEVELS",
    price: 79,
    thumbSeed: "productivity",
    learningOutcomes: [
      "ააწყობ პირად პროდუქტიულობის სისტემას",
      "გამოყოფ მნიშვნელოვანს გადაუდებელისგან",
      "შეამცირებ ყურადღების გაფანტვას",
    ],
    requirements: ["წინასწარი ცოდნა არ არის საჭირო"],
    targetAudience: ["ვისაც ბევრი საქმე აქვს და ცოტა დრო", "სტუდენტები", "მენეჯერები"],
    faqs: standardFaqs,
    modules: [
      {
        title: "მოდული 1 — სისტემა",
        lessons: [
          { title: "რატომ არ მუშაობს To-Do სია", type: "VIDEO", durationSeconds: 12, isFreePreview: true },
          { title: "შეგროვება და დახარისხება", type: "VIDEO", durationSeconds: 16 },
          { title: "კვირის მიმოხილვა", type: "TEXT",
            textContent:
              "კვირის მიმოხილვა 30 წუთია, რომელიც დანარჩენ კვირას ინარჩუნებს.\n\nსამი ნაბიჯი:\n\n1. დაცალეთ ყველა შემომავალი — ელფოსტა, ჩანაწერები, თავი.\n\n2. გადახედეთ მიმდინარე პროექტებს: თითოეულს აქვს შემდეგი კონკრეტული ნაბიჯი?\n\n3. დაათვალიერეთ კალენდარი წინ ორი კვირით.\n\nგააკეთეთ ეს ერთსა და იმავე დღეს, ყოველ კვირას." },
        ],
      },
    ],
  },
  // ── Wellness & creator-economy catalogue ─────────────────────────────────
  {
    title: "ძალისმიერი ვარჯიშის სრული სისტემა",
    subtitle: "ტექნიკიდან პროგრამამდე — ისწავლე ისე ვარჯიში, რომ წლების მერეც შეგეძლოს",
    description:
      "დარბაზში მისული ადამიანების უმეტესობა არასწორად ვარჯიშობს — არა იმიტომ, რომ ზარმაცია, არამედ იმიტომ, რომ არავის უჩვენებია, როგორ უნდა. ეს კურსი სწორედ ამას ასწორებს.\n\nვიწყებთ ხუთი ძირითადი მოძრაობის ტექნიკით — ბერკეტი, სკვატი, ვერტიკალური და ჰორიზონტალური წევა, ბიძგი — შემდეგ ვსწავლობთ, როგორ ავაწყოთ პროგრამა შენი დღეების, სტაჟისა და მიზნის მიხედვით.\n\nკურსის ბოლოს გექნება საკუთარი, დაწერილი პროგრამა და ის ცოდნა, რომელიც საშუალებას მოგცემს, ის თავად შეცვალო.",
    creatorEmail: "nika.chkhaidze@example.ge",
    categorySlug: "fitnesi",
    subcategorySlug: "dzalismieri-vardzishi",
    level: "BEGINNER",
    price: 129,
    discountPrice: 89,
    isFeatured: true,
    thumbSeed: "strength",
    learningOutcomes: [
      "შეასრულებ ხუთ ძირითად მოძრაობას სწორი ტექნიკით",
      "ააწყობ საკუთარ სავარჯიშო პროგრამას კვირაში 3 ან 4 დღეზე",
      "გაიგებ, რა არის თანდათანობითი დატვირთვა და როგორ გამოიყენო",
      "იცოდნებ, როდის უნდა გაზარდო წონა და როდის დაისვენო",
      "შეამცირებ ტრავმის რისკს გახურებისა და ტექნიკის კონტროლით",
    ],
    requirements: [
      "წვდომა დარბაზზე ან ბაზისურ ინვენტარზე",
      "წინასწარი გამოცდილება არ არის საჭირო",
      "ექიმის ნებართვა, თუ გაქვს ტრავმა ან ქრონიკული პრობლემა",
    ],
    targetAudience: [
      "დამწყებები, ვისაც დარბაზში შესვლის ეშინია",
      "ისინი, ვინც წლებია ვარჯიშობს შედეგის გარეშე",
      "მწვრთნელები, ვისაც ტექნიკის ახსნა სურს კლიენტებისთვის",
    ],
    faqs: standardFaqs,
    modules: [
      {
        title: "მოდული 1 — ტექნიკის საფუძვლები",
        description: "ხუთი მოძრაობა, რომელზეც ყველაფერი დგას",
        lessons: [
          { title: "როგორ ვისწავლოთ ამ კურსით", type: "VIDEO", durationSeconds: 14, isFreePreview: true,
            description: "კურსის სტრუქტურა და როგორ გამოიყენო ვიდეოები დარბაზში." },
          { title: "სკვატი — ტექნიკა და ხშირი შეცდომები", type: "VIDEO", durationSeconds: 22, isFreePreview: true,
            description: "ტერფის პოზიცია, მუხლის ტრაექტორია და სიღრმე." },
          { title: "ბერკეტი (deadlift) — ზურგის დაცვა", type: "VIDEO", durationSeconds: 24,
            description: "ჰიპ ჰინჯი, ნეიტრალური ზურგი და ღერძის ტრაექტორია." },
          { title: "წევა და ბიძგი", type: "TEXT",
            textContent:
              "ზედა სხეულის ვარჯიში ოთხ ნიმუშზე დგას: ვერტიკალური წევა (მაგ. ჩამოქაჩვა), ჰორიზონტალური წევა (მაგ. ნიჩბოსნობა), ვერტიკალური ბიძგი (მაგ. თავზედა წნევა) და ჰორიზონტალური ბიძგი (მაგ. ბენჩი).\n\nდაბალანსებული პროგრამა ოთხივეს შეიცავს. ყველაზე ხშირი შეცდომა — ბიძგი ბევრია, წევა ცოტა — მხრის წინა ბრუნვას და ტკივილს იწვევს.\n\nპრაქტიკული წესი: კვირის განმავლობაში წევის სერიები ბიძგისას მაინც უნდა უტოლდებოდეს." },
          { title: "ცოდნის შემოწმება — ტექნიკა", type: "QUIZ",
            quiz: {
              title: "მოდული 1 — ტესტი", passingScore: 70,
              questions: [
                { prompt: "რატომ არის მნიშვნელოვანი ნეიტრალური ზურგი ბერკეტისას?",
                  type: "SINGLE_CHOICE",
                  explanation: "მოხრილი ზურგი დისკებზე არათანაბარ დატვირთვას ქმნის.",
                  answers: [
                    { text: "ამცირებს ხერხემლის დისკებზე რისკს", isCorrect: true },
                    { text: "მეტი წონის აწევის საშუალებას იძლევა ყოველთვის", isCorrect: false },
                    { text: "მხოლოდ ესთეტიკის საკითხია", isCorrect: false },
                  ] },
                { prompt: "დაბალანსებულ პროგრამაში წევა და ბიძგი დაახლოებით თანაბრად უნდა იყოს.",
                  type: "TRUE_FALSE",
                  explanation: "დისბალანსი მხრის სახსრის პრობლემებს იწვევს.",
                  answers: [
                    { text: "სწორია", isCorrect: true },
                    { text: "მცდარია", isCorrect: false },
                  ] },
              ] } },
        ],
      },
      {
        title: "მოდული 2 — პროგრამის აწყობა",
        description: "როგორ ვაქციოთ სავარჯიშოები სისტემად",
        lessons: [
          { title: "კვირის სტრუქტურა: 3, 4 თუ 5 დღე", type: "VIDEO", durationSeconds: 19,
            description: "როგორ გავანაწილოთ მოცულობა შენი განრიგის მიხედვით." },
          { title: "თანდათანობითი დატვირთვა პრაქტიკაში", type: "VIDEO", durationSeconds: 21,
            description: "როდის გავზარდოთ წონა, გამეორება ან სერია." },
          { title: "აღდგენა, ძილი და დელოუდი", type: "TEXT",
            textContent:
              "ვარჯიში სტიმულია; ზრდა აღდგენისას ხდება. თუ აღდგენა არ არის, დატვირთვის გაზრდა შედეგს არ იძლევა — მხოლოდ დაღლას აგროვებ.\n\nსამი პრაქტიკული ორიენტირი: ღამეში 7-9 საათი ძილი, საკმარისი ცილა და ყოველ 6-8 კვირაში ერთი მსუბუქი „დელოუდ\" კვირა.\n\nთუ ორ ვარჯიშზე ზედიზედ ვერ ასრულებ დაგეგმილ გამეორებებს, ეს პროგრამის ბრალი ხშირად არაა — აღდგენა შეამოწმე." },
          { title: "პრაქტიკული დავალება — შენი პირველი 8-კვირიანი გეგმა", type: "TEXT",
            description: "დაწერე საკუთარი პროგრამა კურსში ნასწავლი წესებით.",
            textContent:
              "დროა, ნასწავლი ქაღალდზე გადაიტანო.\n\nდაწერე 8-კვირიანი პროგრამა, რომელიც შეიცავს: კვირაში ვარჯიშის დღეების რაოდენობას, თითოეულ დღეს 4-6 სავარჯიშოს ხუთი ძირითადი ნიმუშიდან, სერიებისა და გამეორებების რაოდენობას და იმ წესს, რომლითაც წონას გაზრდი.\n\nშეამოწმე სამი კითხვით: წევა და ბიძგი დაბალანსებულია? ყოველ ვარჯიშს აქვს გახურება? მერვე კვირაზე დაგეგმილი გაქვს მსუბუქი დელოუდი?\n\nთუ სამივეზე „კი\" გაქვს, პროგრამა მზადაა. დაიწყე და ორი კვირის შემდეგ შეაფასე." },
        ],
      },
    ],
  },
  {
    title: "12 კვირა სახლში — ტრანსფორმაცია ინვენტარის გარეშე",
    subtitle: "სამი ვარჯიში კვირაში, 30 წუთი, მხოლოდ საკუთარი წონით",
    description:
      "დარბაზი ყველასთვის არ არის — და არც უნდა იყოს სავალდებულო. ეს არის 12-კვირიანი პროგრამა, რომელიც სახლში სრულდება, ინვენტარის გარეშე, კვირაში სამ 30-წუთიან ვარჯიშში.\n\nყოველ ვიდეოში რეალურ დროში ვვარჯიშობთ ერთად: გახურება, ძირითადი ბლოკი, გაწელვა. თითოეულ მოძრაობას აქვს გამარტივებული და გართულებული ვერსია, ასე რომ პროგრამა შენს დონეს მიჰყვება.",
    creatorEmail: "nika.chkhaidze@example.ge",
    categorySlug: "fitnesi",
    subcategorySlug: "saxlis-vardzishi",
    level: "ALL_LEVELS",
    price: 79,
    thumbSeed: "homefit",
    learningOutcomes: [
      "დაასრულებ სტრუქტურირებულ 12-კვირიან პროგრამას",
      "შეასრულებ საბაზისო მოძრაობებს სწორი ტექნიკით",
      "გაზრდი გამძლეობასა და ძალას ინვენტარის გარეშე",
      "ისწავლი, როგორ გაართულო მოძრაობა წონის დამატების გარეშე",
    ],
    requirements: [
      "2x2 მეტრი თავისუფალი ადგილი",
      "სავარჯიშო ხალიჩა (სასურველია)",
      "წინასწარი გამოცდილება არ არის საჭირო",
    ],
    targetAudience: [
      "ვისაც დარბაზზე წვდომა ან დრო არ აქვს",
      "მშობლები, რომლებიც სახლიდან ვარჯიშობენ",
      "დამწყებები, ვისაც სტრუქტურა სჭირდება",
    ],
    faqs: standardFaqs,
    modules: [
      {
        title: "ბლოკი 1 — საფუძველი (კვირა 1-4)",
        description: "მოძრაობის ხარისხი და რეგულარობა",
        lessons: [
          { title: "პროგრამის მიმოხილვა", type: "VIDEO", durationSeconds: 11, isFreePreview: true,
            description: "როგორ არის აწყობილი 12 კვირა და როგორ მიჰყვე." },
          { title: "გახურება, რომელსაც არ გამოტოვებ", type: "VIDEO", durationSeconds: 8, isFreePreview: true },
          { title: "ვარჯიში A — ქვედა სხეული", type: "VIDEO", durationSeconds: 31 },
          { title: "ვარჯიში B — ზედა სხეული და კორპუსი", type: "VIDEO", durationSeconds: 29 },
        ],
      },
      {
        title: "ბლოკი 2 — პროგრესი (კვირა 5-12)",
        description: "იმავე მოძრაობის გართულებული ვერსიები",
        lessons: [
          { title: "როგორ გავართულოთ მოძრაობა", type: "TEXT",
            textContent:
              "წონის დამატების გარეშე დატვირთვის გაზრდის ოთხი გზა არსებობს.\n\nპირველი — ბერკეტის შეცვლა: ფეხების ან ხელების პოზიციის ცვლილება მოძრაობას ამძიმებს. მეორე — ტემპი: სამწამიანი დაშვება ბევრად რთულია, ვიდრე ჩვეულებრივი. მესამე — დიაპაზონი: სრული ამპლიტუდა ყოველთვის რთულია ნაწილობრივზე. მეოთხე — დასვენების შემცირება.\n\nერთ ბლოკში ერთ ცვლადს ცვლი, არა ოთხივეს ერთდროულად." },
          { title: "ვარჯიში C — სრული სხეული", type: "VIDEO", durationSeconds: 33 },
          { title: "დასკვნითი შემოწმება", type: "QUIZ",
            quiz: {
              title: "12 კვირის ტესტი", passingScore: 60,
              questions: [
                { prompt: "როგორ გავზარდოთ დატვირთვა ინვენტარის გარეშე?",
                  type: "MULTIPLE_CHOICE",
                  explanation: "ბერკეტი, ტემპი, ამპლიტუდა და დასვენება — ოთხივე მუშაობს.",
                  answers: [
                    { text: "მოძრაობის ბერკეტის შეცვლით", isCorrect: true },
                    { text: "ტემპის შენელებით", isCorrect: true },
                    { text: "ვარჯიშის გამოტოვებით", isCorrect: false },
                    { text: "დასვენების შემცირებით", isCorrect: true },
                  ] },
              ] } },
        ],
      },
    ],
  },
  {
    title: "კვება, რომელსაც წლების მერეც მიჰყვები",
    subtitle: "მაკროები, პორცია და ჩვევები — დიეტების გარეშე",
    description:
      "დიეტების უმეტესობა მუშაობს — სამი კვირა. შემდეგ ცხოვრება ბრუნდება და ყველაფერი უკან მიდის. ეს კურსი საპირისპიროზეა აგებული: ვსწავლობთ პრინციპებს, რომლებიც შენს ცხოვრებას ერგება, არა პირიქით.\n\nგავივლით ენერგეტიკულ ბალანსს, ცილას, პორციის შეფასებას თვალით, სასურსათო მაღაზიაში არჩევანს და იმას, რა უნდა გააკეთო, როცა გეგმა ირღვევა — რადგან აუცილებლად დაირღვევა.",
    creatorEmail: "eka.lomtadze@example.ge",
    categorySlug: "kveba",
    level: "BEGINNER",
    price: 119,
    discountPrice: 79,
    isFeatured: true,
    thumbSeed: "nutrition",
    learningOutcomes: [
      "გამოთვლი საკუთარ კალორიულ საჭიროებას და მაკროებს",
      "შეაფასებ პორციას ყოველი კვების აწონვის გარეშე",
      "ააწყობ კვირის მენიუს ბიუჯეტისა და გემოვნების მიხედვით",
      "გაიგებ, რატომ ბრუნდება წონა და როგორ შეაჩერო ეს ციკლი",
    ],
    requirements: ["წინასწარი ცოდნა არ არის საჭირო", "სასურველია სამზარეულოს სასწორი პირველი ორი კვირისთვის"],
    targetAudience: [
      "ვინც წლებია დიეტების ციკლშია",
      "სპორტით დაკავებულები, ვისაც კვების ოპტიმიზაცია სურს",
      "მწვრთნელები, ვისაც კლიენტებისთვის ბაზისური ცოდნა სჭირდება",
    ],
    faqs: standardFaqs,
    modules: [
      {
        title: "მოდული 1 — საფუძვლები",
        description: "ენერგია, მაკროები და რეალობა",
        lessons: [
          { title: "რატომ ვერ მუშაობს დიეტები", type: "VIDEO", durationSeconds: 16, isFreePreview: true,
            description: "რა ხდება, როცა შეზღუდვა მთავრდება." },
          { title: "კალორია, ცილა, ცხიმი, ნახშირწყალი", type: "VIDEO", durationSeconds: 23, isFreePreview: true },
          { title: "შენი რიცხვების გამოთვლა", type: "TEXT",
            textContent:
              "დაიწყე შენარჩუნების კალორიით: სხეულის წონა კილოგრამებში, გამრავლებული 30-ზე, არის საწყისი შეფასება საშუალო აქტიურობისთვის.\n\nცილა: 1.6-2.2 გრამი კილოგრამზე. ეს ყველაზე მნიშვნელოვანი ერთი რიცხვია — ის ინარჩუნებს კუნთს და ამცირებს შიმშილს.\n\nდანარჩენი კალორია გაანაწილე ცხიმსა და ნახშირწყალს შორის ისე, როგორც შენ გირჩევნია. აქ „სწორი\" თანაფარდობა არ არსებობს — არსებობს ის, რასაც მიჰყვები.\n\nორი კვირის შემდეგ შეადარე წონა და შესაბამისად შეასწორე, არა ყოველდღიურად." },
          { title: "ცოდნის შემოწმება", type: "QUIZ",
            quiz: {
              title: "მოდული 1 — ტესტი", passingScore: 70,
              questions: [
                { prompt: "რომელი მაკროა ყველაზე მნიშვნელოვანი კუნთის შენარჩუნებისთვის?",
                  type: "SINGLE_CHOICE",
                  answers: [
                    { text: "ცილა", isCorrect: true },
                    { text: "ნახშირწყალი", isCorrect: false },
                    { text: "ცხიმი", isCorrect: false },
                  ] },
                { prompt: "წონა ყოველდღიურად უნდა შევამოწმოთ და გეგმა ყოველდღე შევცვალოთ.",
                  type: "TRUE_FALSE",
                  explanation: "ყოველდღიური რყევა წყალია, არა ცხიმი. ტენდენციას უყურებ კვირებში.",
                  answers: [
                    { text: "სწორია", isCorrect: false },
                    { text: "მცდარია", isCorrect: true },
                  ] },
              ] } },
        ],
      },
      {
        title: "მოდული 2 — ცხოვრებაში გატარება",
        description: "მაღაზია, რესტორანი და დარღვეული გეგმა",
        lessons: [
          { title: "კვირის მენიუ 40 წუთში", type: "VIDEO", durationSeconds: 20 },
          { title: "რესტორანში და სტუმრად", type: "VIDEO", durationSeconds: 14 },
          { title: "პრაქტიკული დავალება — შენი 7-დღიანი გეგმა", type: "TEXT",
            description: "ააწყე ერთი კვირის მენიუ შენს რიცხვებზე.",
            textContent:
              "აიღე მოდულ 1-ში გამოთვლილი კალორია და ცილა და ააწყე შვიდი დღე.\n\nდაიწყე ცილით: ყოველ კვებაზე ერთი ცილის წყარო. შემდეგ დაამატე ბოსტნეული ყოველ ძირითად კვებაზე. დარჩენილი კალორია გაანაწილე ისე, როგორც გირჩევნია.\n\nერთი პირობა: მენიუში მინიმუმ ხუთი კერძი უნდა იყოს ისეთი, რომელიც უკვე გიყვარს და მოგზადება იცი. თუ მთელი კვირა უცხო რეცეპტებია, სამშაბათს მიატოვებ.\n\nბოლოს დაწერე ერთი წინადადება: რას აკეთებ, როცა გეგმა ირღვევა?" },
        ],
      },
    ],
  },
  {
    title: "იოგა დამწყებთათვის — 30 დღე",
    subtitle: "დღეში 20 წუთი მოქნილობის, სუნთქვისა და მშვიდი თავისთვის",
    description:
      "„მე იოგისთვის საკმარისად მოქნილი არ ვარ\" — ეს ყველაზე ხშირი წინადადებაა, რომელსაც ვისმენ. ზუსტად ამიტომ არსებობს ეს კურსი.\n\n30 დღე, დღეში 20 წუთი. ვიწყებთ სუნთქვით და უმარტივესი პოზებით, ვასრულებთ სრული 30-წუთიანი პრაქტიკით. ყოველ პოზას აქვს ვარიაცია ბლოკით ან კედლით, ასე რომ პირველივე დღეს შეგიძლია დაიწყო — იმის მიუხედავად, თითებამდე მიწვდები თუ არა.",
    creatorEmail: "mariam.ghonghadze@example.ge",
    categorySlug: "ioga",
    level: "BEGINNER",
    price: 89,
    discountPrice: 59,
    thumbSeed: "yoga",
    learningOutcomes: [
      "შეასრულებ 20 ძირითად პოზას უსაფრთხო ტექნიკით",
      "ისწავლი დიაფრაგმულ სუნთქვას და გამოიყენებ სტრესის დროს",
      "გაზრდი მოქნილობას თეძოსა და ზურგის არეში",
      "ააწყობ ყოველდღიურ 20-წუთიან პრაქტიკას",
    ],
    requirements: ["სავარჯიშო ხალიჩა", "სასურველია იოგას ბლოკი ან წიგნების დასტა"],
    targetAudience: [
      "სრული დამწყებები",
      "ვინც მთელი დღე კომპიუტერთან ზის",
      "ვისაც სტრესის მართვის ინსტრუმენტი სჭირდება",
    ],
    faqs: standardFaqs,
    modules: [
      {
        title: "კვირა 1 — სუნთქვა და საფუძველი",
        lessons: [
          { title: "სანამ დაიწყებ", type: "VIDEO", durationSeconds: 9, isFreePreview: true,
            description: "როგორ დავიცვათ თავი და რას ნიშნავს „კარგი\" ტკივილი." },
          { title: "დიაფრაგმული სუნთქვა", type: "VIDEO", durationSeconds: 12, isFreePreview: true },
          { title: "მზის მისალმება ნაბიჯ-ნაბიჯ", type: "VIDEO", durationSeconds: 18 },
        ],
      },
      {
        title: "კვირა 2-4 — პრაქტიკა",
        lessons: [
          { title: "თეძოს გახსნა", type: "VIDEO", durationSeconds: 24 },
          { title: "ზურგი და პოზა კომპიუტერთან მუშაობის შემდეგ", type: "VIDEO", durationSeconds: 22 },
          { title: "საღამოს დამამშვიდებელი პრაქტიკა", type: "VIDEO", durationSeconds: 26 },
          { title: "პრაქტიკის შენარჩუნება 30 დღის შემდეგ", type: "TEXT",
            textContent:
              "30 დღე ჩვევის დასაწყისია, არა დასასრული. ყველაზე ხშირად პრაქტიკა მაშინ წყდება, როცა ადამიანი ფიქრობს, რომ ან 30 წუთი უნდა, ან არაფერი.\n\nდაიმახსოვრე ორი წესი. პირველი: ხუთი წუთი ითვლება. ცუდი დღეს ხალიჩაზე დგომა და სამი პოზა უკეთესია, ვიდრე გამოტოვება. მეორე: დღე კი არა, ორი დღე ზედიზედ არ გამოტოვო.\n\nდაისახე კვირაში ოთხი პრაქტიკა, არა შვიდი. ოთხი, რომელსაც ასრულებ, სჯობს შვიდს, რომელსაც გეგმავ." },
        ],
      },
    ],
  },
  {
    title: "მოკლე ვიდეო, რომელსაც ბოლომდე უყურებენ",
    subtitle: "იდეიდან პირველ 100 000 ნახვამდე — სისტემა, არა იღბალი",
    description:
      "ალგორითმი შენი მტერი არ არის. ის უბრალოდ ზომავს, ადამიანი ბოლომდე უყურებს თუ არა შენს ვიდეოს — და თითქმის ყველაფერი, რაც მნიშვნელოვანია, პირველ სამ წამში ხდება.\n\nამ კურსში ვშლით მოკლე ვიდეოს ნაწილებად: კაუჭი, სტრუქტურა, ტემპი, ტიტრები და ბოლო კადრი. ვმუშაობთ რეალურ მაგალითებზე — ჩემს ვიდეოებზე, რომლებმაც იმუშავა, და იმაზეც, რომლებმაც არა.",
    creatorEmail: "saba.lominadze@example.ge",
    categorySlug: "kontenti",
    subcategorySlug: "mokle-video",
    level: "ALL_LEVELS",
    price: 149,
    discountPrice: 99,
    isFeatured: true,
    thumbSeed: "shortform",
    learningOutcomes: [
      "დაწერ კაუჭს, რომელიც პირველ 3 წამში აჩერებს მაყურებელს",
      "ააწყობ ვიდეოს სტრუქტურას, რომელიც ბოლომდე ინარჩუნებს ყურადღებას",
      "გადაიღებ და დაამონტაჟებ ტელეფონით, პროფესიული ტექნიკის გარეშე",
      "წაიკითხავ ანალიტიკას და გაიგებ, რატომ ვერ იმუშავა ვიდეომ",
      "ააწყობ კონტენტის კალენდარს, რომელსაც რეალურად მიჰყვები",
    ],
    requirements: ["ტელეფონი კამერით", "უფასო მონტაჟის აპლიკაცია", "წინასწარი გამოცდილება არ არის საჭირო"],
    targetAudience: [
      "კრეატორები, ვისაც აუდიტორიის ზრდა სურს",
      "მწვრთნელები და სპეციალისტები, ვინც კლიენტებს კონტენტით იზიდავს",
      "მცირე ბიზნესის მფლობელები",
    ],
    faqs: standardFaqs,
    modules: [
      {
        title: "მოდული 1 — კაუჭი და სტრუქტურა",
        description: "პირველი სამი წამი, რომელიც ყველაფერს წყვეტს",
        lessons: [
          { title: "როგორ მუშაობს რეკომენდაციის ალგორითმი", type: "VIDEO", durationSeconds: 17, isFreePreview: true,
            description: "შენარჩუნება, გადახედვა და გაზიარება — რას ზომავს პლატფორმა." },
          { title: "კაუჭის 7 ტიპი", type: "VIDEO", durationSeconds: 25, isFreePreview: true },
          { title: "სცენარის შაბლონი", type: "TEXT",
            textContent:
              "მოკლე ვიდეოს სამუშაო სტრუქტურა ოთხ ნაწილს შეიცავს.\n\nკაუჭი (0-3 წამი): დაპირება ან დაძაბულობა. „სამ წელიწადს დამჭირდა ამის გასაგებად\" მუშაობს; „გამარჯობა, დღეს გიამბობთ\" — არა.\n\nკონტექსტი (3-8 წამი): რატომ უნდა აინტერესებდეს ეს კონკრეტულ ადამიანს.\n\nშინაარსი (8-40 წამი): ერთი იდეა. ერთი. ორი იდეა ორი ვიდეოა.\n\nდახურვა: ან ციკლს ხურავს კაუჭზე, ან შემდეგ ნაბიჯს აძლევს. კითხვა კომენტარისთვის აქ მუშაობს — მაგრამ მხოლოდ მაშინ, თუ ის რეალურად საინტერესოა." },
          { title: "ცოდნის შემოწმება", type: "QUIZ",
            quiz: {
              title: "მოდული 1 — ტესტი", passingScore: 70,
              questions: [
                { prompt: "რას ზომავს ალგორითმი პირველ რიგში?",
                  type: "SINGLE_CHOICE",
                  explanation: "შენარჩუნება (retention) არის მთავარი სიგნალი.",
                  answers: [
                    { text: "რამდენ ხანს უყურებენ ვიდეოს", isCorrect: true },
                    { text: "რამდენი მიმდევარი გყავს", isCorrect: false },
                    { text: "რამდენად ძვირი კამერით გადაიღე", isCorrect: false },
                  ] },
                { prompt: "ერთი ვიდეო რამდენ ძირითად იდეას უნდა შეიცავდეს?",
                  type: "SINGLE_CHOICE",
                  answers: [
                    { text: "ერთს", isCorrect: true },
                    { text: "სამს", isCorrect: false },
                    { text: "რაც შეიძლება მეტს", isCorrect: false },
                  ] },
              ] } },
        ],
      },
      {
        title: "მოდული 2 — გადაღება, მონტაჟი, გამოქვეყნება",
        lessons: [
          { title: "განათება და ხმა ტელეფონით", type: "VIDEO", durationSeconds: 19 },
          { title: "მონტაჟის ტემპი და ტიტრები", type: "VIDEO", durationSeconds: 23 },
          { title: "ანალიტიკის კითხვა", type: "VIDEO", durationSeconds: 21 },
          { title: "პრაქტიკული დავალება — შენი პირველი 10 ვიდეო", type: "TEXT",
            description: "დაგეგმე 10 ვიდეო კურსის შაბლონით.",
            textContent:
              "ჩამოწერე 10 იდეა. თითოეულისთვის დაწერე მხოლოდ სამი რამ: კაუჭი (ერთი წინადადება), ერთი იდეა, რომელსაც ვიდეო ასწავლის, და დახურვა.\n\nარ დაწერო სრული სცენარი — ჯერ არა. ათი კაუჭი გვერდიგვერდ ბევრად უკეთ გაჩვენებს, რომელი სამი ღირს გადაღებად.\n\nშემდეგ გადაიღე ეს სამი ერთ დღეს. სამი ვიდეო ერთ სესიაზე ბევრად ადვილია, ვიდრე სამ სხვადასხვა დღეს." },
        ],
      },
    ],
  },
  {
    title: "აუდიტორიიდან შემოსავლამდე",
    subtitle: "როგორ აქციო მიმდევრები მდგრად შემოსავლად — ქართულ რეალობაში",
    description:
      "მიმდევრების რაოდენობა შემოსავალი არ არის. ვიცნობ 8000-მიმდევრიან კრეატორს, რომელიც კარგად ცხოვრობს კონტენტით, და 300 000-იანს, რომელსაც არაფერი შემოსდის.\n\nეს კურსი მონეტიზაციის ხუთ რეალურ გზას შლის: ციფრული პროდუქტი, ონლაინ კურსი, გამოწერა, სპონსორობა და მომსახურება. თითოეულზე ვსაუბრობთ კონკრეტულად — რა ფასი, რა მოცულობის აუდიტორია სჭირდება, რა კონვერსიაა რეალისტური და როგორ მუშაობს ეს საქართველოში, ქართული გადახდებით.",
    creatorEmail: "saba.lominadze@example.ge",
    categorySlug: "kreatoris-biznesi",
    subcategorySlug: "monetizacia",
    level: "INTERMEDIATE",
    price: 199,
    discountPrice: 149,
    thumbSeed: "monetise",
    learningOutcomes: [
      "აირჩევ მონეტიზაციის მოდელს შენი აუდიტორიის ზომაზე",
      "დააწესებ ფასს ისე, რომ არც გაასხვისო და არც წაგება იყოს",
      "ააწყობ პირველ ციფრულ პროდუქტს ერთ თვეში",
      "მოამზადებ სპონსორის შეთავაზებას მედია-კიტით",
      "გაიგებ, როგორ იღებ და აღრიცხავ შემოსავალს საქართველოში",
    ],
    requirements: [
      "აქტიური აუდიტორია ნებისმიერ პლატფორმაზე (თუნდაც მცირე)",
      "წინასწარი ბიზნეს-ცოდნა არ არის საჭირო",
    ],
    targetAudience: [
      "კრეატორები, ვისაც აუდიტორია აქვს და შემოსავალი არა",
      "მწვრთნელები და ნუტრიციოლოგები, ვისაც ონლაინ პროდუქტი სურს",
      "სპეციალისტები, ვინც პირად ბრენდზე მუშაობს",
    ],
    faqs: standardFaqs,
    modules: [
      {
        title: "მოდული 1 — მოდელის არჩევა",
        lessons: [
          { title: "ხუთი გზა და ვისთვის მუშაობს თითოეული", type: "VIDEO", durationSeconds: 26, isFreePreview: true },
          { title: "რეალისტური ციფრები", type: "TEXT",
            textContent:
              "მოდელის არჩევამდე ერთი გამოთვლა გააკეთე.\n\nციფრული პროდუქტის კონვერსია აუდიტორიიდან ჩვეულებრივ 0.5-2%-ია — და ეს იმ ნაწილიდან, რომელიც შენს პოსტს ნახავს, არა მთელი მიმდევრებიდან.\n\nე.ი. 10 000 მიმდევარი, საიდანაც პოსტს 2 000 ხედავს, 1% კონვერსიით და 100 ლარიანი პროდუქტით — დაახლოებით 2 000 ლარი გაშვებაზე.\n\nეს არც ცუდი რიცხვია და არც სასწაული. ის მთავარია, რომ გადაწყვეტილება მოლოდინზე კი არა, არითმეტიკაზე დააფუძნო." },
          { title: "ფასწარმოქმნა", type: "VIDEO", durationSeconds: 22 },
          { title: "ცოდნის შემოწმება", type: "QUIZ",
            quiz: {
              title: "მოდული 1 — ტესტი", passingScore: 70,
              questions: [
                { prompt: "მიმდევრების დიდი რაოდენობა ავტომატურად ნიშნავს შემოსავალს.",
                  type: "TRUE_FALSE",
                  explanation: "მნიშვნელოვანია ნდობა და შეთავაზების შესაბამისობა, არა მხოლოდ რიცხვი.",
                  answers: [
                    { text: "სწორია", isCorrect: false },
                    { text: "მცდარია", isCorrect: true },
                  ] },
              ] } },
        ],
      },
      {
        title: "მოდული 2 — გაშვება",
        lessons: [
          { title: "პირველი პროდუქტი 30 დღეში", type: "VIDEO", durationSeconds: 28 },
          { title: "სპონსორის შეთავაზება და მედია-კიტი", type: "VIDEO", durationSeconds: 24 },
          { title: "გადახდები და აღრიცხვა საქართველოში", type: "VIDEO", durationSeconds: 20,
            description: "ინდივიდუალური მეწარმე, გადასახადი და ქართული საგადახდო სისტემები." },
          { title: "პრაქტიკული დავალება — შენი მონეტიზაციის გეგმა", type: "TEXT",
            description: "აღწერე არჩეული მოდელი, ფასი და პირველი გაშვების თარიღი.",
            textContent:
              "დაწერე ერთ გვერდზე: რომელ მოდელს ირჩევ და რატომ; რა ფასი გაქვს და რაზე დააფუძნე; რამდენ ადამიანს სჭირდება შეძენა, რომ პირველი გაშვება წარმატებულად ჩათვალო; და კონკრეტული თარიღი.\n\nთარიღი ყველაზე მნიშვნელოვანია. მოდელისა და ფასის შერჩევა შეიძლება უსასრულოდ დახვეწო — გაშვების თარიღი კი ან არსებობს, ან არა.\n\nჩაწერე ის კალენდარში დღესვე." },
        ],
      },
    ],
  },
];
export const STUDENTS = [
  { email: "mariam.kvaratskhelia@example.ge", fullName: "მარიამ კვარაცხელია", username: "mariam.k", city: "თბილისი" },
  { email: "luka.gelashvili@example.ge", fullName: "ლუკა გელაშვილი", username: "luka.g", city: "თბილისი" },
  { email: "elene.tavadze@example.ge", fullName: "ელენე თავაძე", username: "elene.t", city: "ბათუმი" },
  { email: "nikoloz.abuladze@example.ge", fullName: "ნიკოლოზ აბულაძე", username: "nikoloz.a", city: "ქუთაისი" },
  { email: "ketevan.lomidze@example.ge", fullName: "ქეთევან ლომიძე", username: "ketevan.l", city: "თბილისი" },
  { email: "giorgi.nadiradze@example.ge", fullName: "გიორგი ნადირაძე", username: "giorgi.n", city: "რუსთავი" },
  { email: "sopo.gvenetadze@example.ge", fullName: "სოფო გვენეტაძე", username: "sopo.g", city: "თბილისი" },
  { email: "zurab.mchedlishvili@example.ge", fullName: "ზურაბ მჭედლიშვილი", username: "zurab.m", city: "გორი" },
  { email: "tinatin.dolidze@example.ge", fullName: "თინათინ დოლიძე", username: "tinatin.d", city: "თბილისი" },
  { email: "beka.shengelia@example.ge", fullName: "ბექა შენგელია", username: "beka.s", city: "ზუგდიდი" },
  { email: "nana.chikovani@example.ge", fullName: "ნანა ჩიქოვანი", username: "nana.c", city: "თბილისი" },
  { email: "vakhtang.esebua@example.ge", fullName: "ვახტანგ ესებუა", username: "vakhtang.e", city: "ბათუმი" },
];

export const REVIEW_TEXTS = [
  { rating: 5, title: "ზუსტად ის, რაც მჭირდებოდა", body: "მასალა სტრუქტურირებულია და ყველა თემა პრაქტიკული მაგალითითაა ახსნილი. პირველივე კვირაში შევძელი ნასწავლის გამოყენება სამსახურში." },
  { rating: 5, title: "ღირს ყოველი თეთრი", body: "ვნახე რამდენიმე უფასო კურსი იუთუბზე, მაგრამ სისტემურობა აკლდა. აქ თანმიმდევრობაა და ეს მთავარია." },
  { rating: 4, title: "კარგი კურსია", body: "ძალიან კარგი შინაარსი. ზოგიერთი ვიდეო ცოტა გრძელია, მაგრამ ინფორმაცია ღირებულია." },
  { rating: 5, title: "ლექტორი შესანიშნავია", body: "რთულ თემებს მარტივად ხსნის. კითხვებზეც პასუხობს დისკუსიაში." },
  { rating: 4, title: "რეკომენდაციას ვუწევ", body: "დამწყებისთვის იდეალურია. მინდოდა მეტი პრაქტიკული დავალება, მაგრამ ისედაც ღირებულია." },
  { rating: 5, title: "საუკეთესო ქართულ ენაზე", body: "ბოლოს იპოვე ნორმალური კურსი ქართულად. აღარ მიწევს ინგლისურ მასალაზე ბრძოლა." },
  { rating: 3, title: "კარგია, მაგრამ", body: "შინაარსი კარგია, თუმცა ზოგიერთი მოდული განახლებას საჭიროებს. მაინც სასარგებლო აღმოჩნდა." },
  { rating: 5, title: "პრაქტიკული და გასაგები", body: "მომწონს, რომ თეორიაზე დიდხანს არ ჩერდება. ყველა გაკვეთილს კონკრეტული შედეგი აქვს." },
  { rating: 4, title: "ღირებული გამოცდილება", body: "სერტიფიკატიც მივიღე და CV-ში დავამატე. კურსმა ნამდვილად მომცა თავდაჯერებულობა." },
  { rating: 5, title: "დამწყებისთვის სრულყოფილი", body: "ნულიდან დავიწყე და ბოლოს რეალური პროექტი მქონდა. ზუსტად ასე უნდა ისწავლებოდეს." },
];
