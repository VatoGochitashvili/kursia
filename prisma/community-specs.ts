/**
 * The demo circles, shared by the dev seed and the demo seed.
 *
 * One per demo creator, and each one matches what that person actually does —
 * the strength coach runs the strength circle, the nutritionist the food one.
 * An earlier version handed a Python developer the wellness circle, which is
 * the kind of detail that makes a demo read as fake the moment anyone looks at
 * who runs it.
 *
 * Every cover is a real Unsplash photo that was fetched and confirmed to be an
 * image before it went in here — a broken cover is worse than none.
 */

const cover = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1600&q=70&auto=format&fit=crop`;

export interface CircleSpec {
  /** Position in CREATORS (seed-data.ts). */
  index: number;
  categorySlug: string;
  name: string;
  tagline: string;
  description: string;
  priceMinor: number;
  coverUrl: string;
}

export const CIRCLE_SPECS: CircleSpec[] = [
  {
    index: 0,
    categorySlug: "marketingi",
    name: "ციფრული მარკეტინგის კლუბი",
    tagline: "ყოველკვირეული ცოცხალი სესიები, უკუკავშირი და ერთად მუშაობა",
    description:
      "დახურული სივრცე მათთვის, ვინც რეალურ კამპანიებზე მუშაობს. ყოველ კვირას ვხვდებით ცოცხლად, ვარჩევთ თქვენს ფუნელებს და ვცვლით იმას, რაც არ მუშაობს.",
    priceMinor: 2500,
    coverUrl: cover("1557838923-2985c318be48"),
  },
  {
    index: 1,
    categorySlug: "programireba",
    name: "Python-ის სახელოსნო",
    tagline: "კოდ-რევიუ, პროექტები და მენტორინგი — დამწყებიდან junior-მდე",
    description:
      "ყოველ კვირას ერთი პრაქტიკული პროექტი, ცოცხალი კოდ-რევიუ და კითხვებზე პასუხები. ერთად მივდივართ პირველ სამსახურამდე.",
    priceMinor: 2900,
    coverUrl: cover("1498050108023-c5249f4df085"),
  },
  {
    index: 2,
    categorySlug: "biznesi",
    name: "მეწარმეების წრე",
    tagline: "იდეიდან პირველ შემოსავალამდე — ერთმანეთის მხარდაჭერით",
    description:
      "დამფუძნებლები, რომლებიც ბიზნესს ახლა აშენებენ. ყოველთვიური mastermind, ფინანსური მოდელები და გულახდილი უკუკავშირი.",
    priceMinor: 4900,
    coverUrl: cover("1556761175-5973dc0f32e7"),
  },
  {
    index: 3,
    categorySlug: "ui-ux",
    name: "დიზაინერების წრე",
    tagline: "პორტფოლიო, ფიგმა და რეალური პროდუქტის დიზაინი",
    description:
      "ვარჩევთ ერთმანეთის ნამუშევრებს, ვმუშაობთ რეალურ ბრიფებზე და ვემზადებით ინტერვიუებისთვის.",
    priceMinor: 1900,
    coverUrl: cover("1561070791-2526d30994b5"),
  },
  {
    index: 4,
    categorySlug: "treidingi",
    name: "ტრეიდერების ოთახი",
    tagline: "დილის ანალიზი, გარიგებების განხილვა და რისკის მართვა",
    description:
      "ყოველ დილით ვიხილავთ ბაზარს, ვაზიარებთ სეტაპებს და კვირის ბოლოს ვაანალიზებთ რა იმუშავა და რა არა.",
    priceMinor: 4900,
    coverUrl: cover("1611974789855-9c2a0a7236a3"),
  },
  {
    index: 5,
    categorySlug: "ai",
    name: "AI პრაქტიკა",
    tagline: "ChatGPT, ავტომატიზაცია და AI შენს სამსახურში",
    description:
      "ყოველ კვირას ახალი ინსტრუმენტი და რეალური გამოყენების მაგალითი. ვაზოგებთ საათებს იმ საქმეებზე, რომლებიც აღარ უნდა გაკეთდეს ხელით.",
    priceMinor: 2900,
    coverUrl: cover("1460925895917-afdab827c52f"),
  },
  {
    index: 6,
    categorySlug: "potografia",
    name: "ფოტოგრაფების წრე",
    tagline: "კადრი, შუქი და მონტაჟი — ყოველკვირეული ჩელენჯებით",
    description:
      "ყოველ კვირას ახალი თემა, ერთმანეთის ფოტოების განხილვა და ცოცხალი ლაითრუმ-სესიები.",
    priceMinor: 1500,
    coverUrl: cover("1516035069371-29a1b244cc32"),
  },
  {
    index: 7,
    categorySlug: "gaqidvebi",
    name: "გაყიდვების სახელოსნო",
    tagline: "სკრიპტები, მოლაპარაკება და ყოველდღიური პრაქტიკა",
    description:
      "რეალური ზარების ანალიზი, როლურ თამაშები და ტექნიკები, რომლებიც ახლა მუშაობს ქართულ ბაზარზე.",
    priceMinor: 3900,
    coverUrl: cover("1542744173-8e7e53415bb0"),
  },
  {
    index: 8,
    categorySlug: "dzalismieri-vardzishi",
    name: "ძალის კლუბი",
    tagline: "ვარჯიშის გეგმა, ტექნიკა და ანგარიშვალდებულება",
    description:
      "ყოველკვირეული პროგრამა, ტექნიკის შემოწმება ვიდეოთი და ჯგუფი, რომელიც არ დაგაცლებს ვარჯიშს გაცდენ.",
    priceMinor: 3500,
    coverUrl: cover("1534438327276-14e5300c3a48"),
  },
  {
    index: 9,
    categorySlug: "kveba",
    name: "ჯანსაღი რიტმი",
    tagline: "კვება, ჩვევები და ანგარიშვალდებულება — ერთად",
    description:
      "ყოველდღიური მხარდაჭერა, კვირის კვების გეგმები და რეცეპტები. უფასოა — შემოდი და ნახე, გამოგადგება თუ არა.",
    priceMinor: 0,
    coverUrl: cover("1512621776951-a57141f2eefd"),
  },
  {
    index: 10,
    categorySlug: "ioga",
    name: "სუნთქვა და სიმშვიდე",
    tagline: "იოგა, მედიტაცია და ყოველდღიური პრაქტიკა",
    description:
      "დილის ცოცხალი სესიები, სუნთქვის ტექნიკები და სიმშვიდე, რომელიც დღის ბოლომდე გრძელდება.",
    priceMinor: 1900,
    coverUrl: cover("1544367567-0f2fcb009e0b"),
  },
  {
    index: 11,
    categorySlug: "kontenti",
    name: "კრეატორების სახელოსნო",
    tagline: "სცენარი, მონტაჟი და ზრდა — ერთ სივრცეში",
    description:
      "ვაზიარებთ რა მუშაობს ალგორითმში ახლა, ვამოწმებთ ერთმანეთის ვიდეოებს და ვაწყობთ კონტენტ-გეგმას.",
    priceMinor: 1900,
    coverUrl: cover("1492691527719-9d1e07e534b4"),
  },
];

/**
 * What an earlier seed named the circles that were owned by the wrong person.
 *
 * A circle whose name still equals this value has never been touched by a
 * human, so the seed may re-point it at the right topic. One whose name has
 * changed was edited by someone, and is left alone.
 */
export const LEGACY_CIRCLE_NAMES: Record<number, string> = {
  1: "ჯანსაღი რიტმი",
  2: "ტრეიდერების ოთახი",
  3: "კრეატორების სახელოსნო",
};

/** Opening posts for a circle whose feed is empty. Topic-neutral on purpose. */
export const CIRCLE_POSTS: { title: string | null; body: string }[] = [
  {
    title: "კეთილი იყოს შენი მობრძანება 👋",
    body: "აქ ვაზიარებთ პროგრესს, ვსვამთ კითხვებს და ერთმანეთს ვეხმარებით. დაწერე ორი სიტყვა შენ შესახებ — რაზე მუშაობ ახლა?",
  },
  {
    title: null,
    body: "ამ კვირის მიზანი: ყოველდღე ცოტ-ცოტა, მაგრამ ყოველდღე. ვინ შემოდის? დაწერე შენი მიზანი ქვემოთ.",
  },
  {
    title: "კითხვა ჯგუფს",
    body: "რომელ რესურსებს გირჩევთ მათ, ვინც ახლა იწყებს? წიგნები, არხები, ინსტრუმენტები — ყველაფერი გამოდგება.",
  },
  {
    title: null,
    body: "დიდი მადლობა ბოლო ცოცხალი სესიისთვის — ბევრი რამ გამინათდა. ჩანაწერი ვინმეს ხომ არ აქვს?",
  },
];
