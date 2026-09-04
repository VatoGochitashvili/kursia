/**
 * Realistic Georgian marketplace content for local development.
 * Names, course titles, categories and reviews are plausible for the Georgian
 * market so the app looks and behaves like a live product, not a lorem-ipsum
 * shell.
 */

export const CATEGORIES = [
  { slug: "biznesi", nameKa: "ბიზნესი", nameEn: "Business", icon: "briefcase", colorHex: "#213ade",
    descriptionKa: "ბიზნესის დაწყება, მართვა და ზრდა", descriptionEn: "Start, run and grow a business",
    children: [
      { slug: "startapi", nameKa: "სტარტაპი", nameEn: "Startups" },
      { slug: "menejmenti", nameKa: "მენეჯმენტი", nameEn: "Management" },
    ] },
  { slug: "marketingi", nameKa: "მარკეტინგი", nameEn: "Marketing", icon: "megaphone", colorHex: "#ff5710",
    descriptionKa: "ციფრული მარკეტინგი, SMM და რეკლამა", descriptionEn: "Digital marketing, social and ads",
    children: [
      { slug: "smm", nameKa: "სოციალური მედია", nameEn: "Social media" },
      { slug: "seo", nameKa: "SEO", nameEn: "SEO" },
    ] },
  { slug: "programireba", nameKa: "პროგრამირება", nameEn: "Programming", icon: "code", colorHex: "#12b76a",
    descriptionKa: "ვებ-დეველოპმენტი, მობილური და მონაცემები", descriptionEn: "Web, mobile and data",
    children: [
      { slug: "veb-developmenti", nameKa: "ვებ-დეველოპმენტი", nameEn: "Web development" },
      { slug: "monatsemta-analizi", nameKa: "მონაცემთა ანალიზი", nameEn: "Data analysis" },
    ] },
  { slug: "dizaini", nameKa: "დიზაინი", nameEn: "Design", icon: "palette", colorHex: "#9333ea",
    descriptionKa: "გრაფიკული, UI/UX და ბრენდინგი", descriptionEn: "Graphic, UI/UX and branding",
    children: [
      { slug: "ui-ux", nameKa: "UI/UX", nameEn: "UI/UX" },
      { slug: "grafikuli-dizaini", nameKa: "გრაფიკული დიზაინი", nameEn: "Graphic design" },
    ] },
  { slug: "finansebi", nameKa: "ფინანსები", nameEn: "Finance", icon: "chart", colorHex: "#0891b2",
    descriptionKa: "პირადი ფინანსები, ბუღალტერია, ინვესტიციები", descriptionEn: "Personal finance, accounting, investing", children: [] },
  { slug: "kripto", nameKa: "კრიპტო", nameEn: "Crypto", icon: "coins", colorHex: "#f79009",
    descriptionKa: "ბლოკჩეინი და ციფრული აქტივები", descriptionEn: "Blockchain and digital assets", children: [] },
  { slug: "potografia", nameKa: "ფოტოგრაფია", nameEn: "Photography", icon: "camera", colorHex: "#64748b",
    descriptionKa: "გადაღება, კომპოზიცია და დამუშავება", descriptionEn: "Shooting, composition and editing", children: [] },
  { slug: "video", nameKa: "ვიდეო", nameEn: "Video", icon: "video", colorHex: "#e11d48",
    descriptionKa: "ვიდეო წარმოება და მონტაჟი", descriptionEn: "Video production and editing", children: [] },
  { slug: "enebi", nameKa: "ენები", nameEn: "Languages", icon: "globe", colorHex: "#0ea5e9",
    descriptionKa: "ინგლისური, გერმანული და სხვა", descriptionEn: "English, German and more", children: [] },
  { slug: "pirovnuli-ganvitareba", nameKa: "პიროვნული განვითარება", nameEn: "Personal development", icon: "sparkles", colorHex: "#7c3aed",
    descriptionKa: "პროდუქტიულობა, კომუნიკაცია, ჩვევები", descriptionEn: "Productivity, communication, habits", children: [] },
  { slug: "kariera", nameKa: "კარიერა", nameEn: "Career", icon: "target", colorHex: "#059669",
    descriptionKa: "CV, გასაუბრება და პროფესიული ზრდა", descriptionEn: "CV, interviews and growth", children: [] },
  { slug: "gaqidvebi", nameKa: "გაყიდვები", nameEn: "Sales", icon: "handshake", colorHex: "#dc2626",
    descriptionKa: "B2B, B2C და მოლაპარაკებები", descriptionEn: "B2B, B2C and negotiation", children: [] },
  { slug: "ai", nameKa: "AI", nameEn: "AI", icon: "cpu", colorHex: "#3559f0",
    descriptionKa: "ხელოვნური ინტელექტის ინსტრუმენტები და გამოყენება", descriptionEn: "AI tools and applications", children: [] },
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
