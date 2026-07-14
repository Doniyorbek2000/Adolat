/**
 * Adolat AI — hujjat generatori katalogi (master-spec 5-bo'lim).
 * Har bir tur: kod, uz/ru nomi, forma maydonlari va AI uchun tuzilma yo'riqnomasi.
 */

export interface DocumentField {
  key: string;
  labelUz: string;
  labelRu: string;
  required: boolean;
}

export interface DocumentTypeInfo {
  code: string;
  nameUz: string;
  nameRu: string;
  /** Toifa: ariza/sud/shartnoma/korporativ/xizmat */
  category: 'application' | 'court' | 'contract' | 'corporate' | 'letter' | 'notary';
  fields: DocumentField[];
  /** AI'ga hujjat tuzilishi bo'yicha yo'riqnoma (professional format uchun). */
  promptHint: string;
}

const F = (key: string, uz: string, ru: string, required = true): DocumentField => ({
  key,
  labelUz: uz,
  labelRu: ru,
  required,
});

const recipient = F('recipient', 'Kimga (organ/mansabdor)', 'Кому (орган/должностное лицо)');
const applicant = F('fullName', "Arizachi to'liq ismi", 'ФИО заявителя');
const address = F('address', 'Manzil', 'Адрес', false);
const passport = F('passport', 'Passport/JSHSHIR', 'Паспорт/ПИНФЛ', false);
const dateField = F('date', 'Sana', 'Дата', false);

export const DOCUMENT_TYPES: DocumentTypeInfo[] = [
  // ── Arizalar ──
  {
    code: 'ariza',
    nameUz: 'Ariza',
    nameRu: 'Заявление',
    category: 'application',
    fields: [recipient, applicant, address, F('subject', 'Mavzu', 'Тема'), F('body', 'Ariza matni', 'Текст заявления')],
    promptHint: 'Yuqori o\'ng burchakda "Kimga" va "Kimdan" bloki, markazda "ARIZA" sarlavhasi, so\'ng matn, oxirida sana va imzo.',
  },
  {
    code: 'shikoyat',
    nameUz: 'Shikoyat',
    nameRu: 'Жалоба',
    category: 'application',
    fields: [recipient, applicant, F('complainAbout', 'Kim/nima ustidan', 'На кого/что'), F('incident', 'Voqea tavsifi', 'Описание'), F('demand', 'Talab', 'Требование')],
    promptHint: 'Rasmiy shikoyat: holatlar xronologik bayoni, buzilgan huquq, aniq talab va ilovalar ro\'yxati.',
  },
  {
    code: 'tushuntirish_xati',
    nameUz: 'Tushuntirish xati',
    nameRu: 'Объяснительная записка',
    category: 'application',
    fields: [recipient, applicant, F('reason', 'Nima yuzasidan', 'По какому поводу'), F('explanation', 'Tushuntirish', 'Объяснение')],
    promptHint: 'Qisqa, faktlarga asoslangan tushuntirish; ayb tan olinsa ham huquqiy oqibatga ehtiyot bo\'lib yozilsin.',
  },
  {
    code: 'notarial_ariza',
    nameUz: 'Notariusga ariza',
    nameRu: 'Заявление нотариусу',
    category: 'notary',
    fields: [F('notary', 'Notarius/idora', 'Нотариус/контора'), applicant, passport, F('request', 'Iltimos (harakat)', 'Просьба (действие)')],
    promptHint: 'Notarial harakat (meros, ishonchnoma tasdiqi va h.k.) uchun aniq iltimos va shaxsiy ma\'lumotlar.',
  },

  // ── Sud hujjatlari ──
  {
    code: 'da_vo_arizasi',
    nameUz: "Da'vo arizasi",
    nameRu: 'Исковое заявление',
    category: 'court',
    fields: [F('courtName', 'Sud nomi', 'Название суда'), F('plaintiff', "Da'vogar", 'Истец'), F('defendant', 'Javobgar', 'Ответчик'), F('claimAmount', "Da'vo summasi", 'Сумма иска', false), F('claimDescription', "Da'vo asoslari", 'Обоснование иска')],
    promptHint: 'FPK talablari: sud nomi, tomonlar rekvizitlari, holatlar, huquqiy asos (moddalar), aniq da\'vo talabi, ilovalar, davlat boji.',
  },
  {
    code: 'apellyatsiya',
    nameUz: 'Apellyatsiya shikoyati',
    nameRu: 'Апелляционная жалоба',
    category: 'court',
    fields: [F('courtName', 'Apellyatsiya sudi', 'Апелляционный суд'), F('caseNumber', 'Ish raqami', 'Номер дела'), F('appealedDecision', 'Shikoyat qilinayotgan qaror', 'Обжалуемое решение'), F('grounds', 'Shikoyat asoslari', 'Основания жалобы')],
    promptHint: 'Birinchi instansiya qarori rekvizitlari, qonun buzilishi asoslari, apellyatsiya talabi (bekor qilish/o\'zgartirish).',
  },
  {
    code: 'kassatsiya',
    nameUz: 'Kassatsiya shikoyati',
    nameRu: 'Кассационная жалоба',
    category: 'court',
    fields: [F('courtName', 'Kassatsiya sudi', 'Кассационный суд'), F('caseNumber', 'Ish raqami', 'Номер дела'), F('appealedDecision', 'Qarorlar', 'Обжалуемые акты'), F('grounds', 'Moddiy/protsessual buzilish', 'Нарушения норм')],
    promptHint: 'Moddiy va protsessual huquq normalari buzilishiga urg\'u; kassatsiya vakolatlari doirasidagi talab.',
  },
  {
    code: 'advokat_sorovi',
    nameUz: "Advokat so'rovi",
    nameRu: 'Адвокатский запрос',
    category: 'court',
    fields: [recipient, F('advocate', 'Advokat F.I.Sh.', 'ФИО адвоката'), F('license', 'Litsenziya/order', 'Лицензия/ордер', false), F('info', "So'ralayotgan ma'lumot", 'Запрашиваемые сведения')],
    promptHint: 'Advokatlik faoliyati to\'g\'risidagi qonunga havola, aniq ma\'lumot so\'rovi va javob muddati.',
  },

  // ── Shartnomalar ──
  {
    code: 'shartnoma',
    nameUz: 'Shartnoma (umumiy)',
    nameRu: 'Договор (общий)',
    category: 'contract',
    fields: [F('party1', '1-tomon', 'Сторона 1'), F('party2', '2-tomon', 'Сторона 2'), F('subject', 'Predmet', 'Предмет'), F('amount', 'Summa', 'Сумма', false), F('duration', 'Muddat', 'Срок', false)],
    promptHint: 'Standart bo\'limlar: predmet, narx va to\'lov, tomonlar huquq/majburiyatlari, javobgarlik, nizolar, forс-major, rekvizitlar.',
  },
  {
    code: 'ijara_shartnomasi',
    nameUz: 'Ijara shartnomasi',
    nameRu: 'Договор аренды',
    category: 'contract',
    fields: [F('landlord', 'Ijaraga beruvchi', 'Арендодатель'), F('tenant', 'Ijarachi', 'Арендатор'), F('object', 'Ijara obyekti', 'Объект аренды'), F('rent', 'Ijara haqi', 'Арендная плата'), F('term', 'Muddat', 'Срок')],
    promptHint: 'Obyekt tavsifi, ijara haqi va to\'lov tartibi, foydalanish shartlari, ta\'mirlash, muddatidan oldin bekor qilish.',
  },
  {
    code: 'oldi_sotdi_shartnomasi',
    nameUz: 'Oldi-sotdi shartnomasi',
    nameRu: 'Договор купли-продажи',
    category: 'contract',
    fields: [F('seller', 'Sotuvchi', 'Продавец'), F('buyer', 'Xaridor', 'Покупатель'), F('goods', 'Tovar/mol-mulk', 'Товар/имущество'), F('price', 'Narx', 'Цена'), F('transferOrder', 'Topshirish tartibi', 'Порядок передачи', false)],
    promptHint: 'Tovar/mulk aniq tavsifi, narx va to\'lov, mulk huquqi o\'tishi, kafolat, javobgarlik.',
  },
  {
    code: 'mehnat_shartnomasi',
    nameUz: 'Mehnat shartnomasi',
    nameRu: 'Трудовой договор',
    category: 'contract',
    fields: [F('employer', 'Ish beruvchi', 'Работодатель'), F('employee', 'Xodim', 'Работник'), F('position', 'Lavozim', 'Должность'), F('salary', 'Ish haqi', 'Зарплата'), F('startDate', 'Ish boshlanish sanasi', 'Дата начала')],
    promptHint: 'Mehnat kodeksiga muvofiq: lavozim, ish haqi, ish vaqti, ta\'til, sinov muddati, tomonlar majburiyatlari.',
  },
  {
    code: 'nda',
    nameUz: 'Maxfiylik shartnomasi (NDA)',
    nameRu: 'Соглашение о неразглашении (NDA)',
    category: 'contract',
    fields: [F('party1', 'Oshkor qiluvchi tomon', 'Раскрывающая сторона'), F('party2', 'Qabul qiluvchi tomon', 'Принимающая сторона'), F('scope', 'Maxfiy ma\'lumot doirasi', 'Объём конфиденциальной информации'), F('term', 'Amal muddati', 'Срок действия')],
    promptHint: 'Maxfiy ma\'lumot ta\'rifi, foydalanish cheklovlari, istisnolar, buzilganda javobgarlik va muddat.',
  },

  {
    code: 'ishonchnoma',
    nameUz: 'Ishonchnoma',
    nameRu: 'Доверенность',
    category: 'notary',
    fields: [F('principal', 'Ishonch bildiruvchi', 'Доверитель'), F('agent', 'Ishonchli vakil', 'Поверенный'), F('powers', 'Vakolatlar', 'Полномочия'), F('validUntil', 'Amal muddati', 'Срок действия', false)],
    promptHint: 'Ishonch bildiruvchi va vakil rekvizitlari, aniq vakolatlar ro\'yxati, muddat va notarial tasdiq bloki.',
  },

  // ── Korporativ ──
  {
    code: 'mchj_ustav',
    nameUz: 'MChJ ustavi',
    nameRu: 'Устав ООО',
    category: 'corporate',
    fields: [F('companyName', 'Jamiyat nomi', 'Наименование'), F('founders', 'Ta\'sischilar', 'Учредители'), F('charterCapital', 'Ustav fondi', 'Уставный капитал'), F('activity', 'Faoliyat turi', 'Вид деятельности'), F('director', 'Direktor', 'Директор', false)],
    promptHint: 'MChJ to\'g\'risidagi qonunga muvofiq bo\'limlar: umumiy qoidalar, ustav fondi, boshqaruv organlari, foyda taqsimoti, tugatish.',
  },
  {
    code: 'buyruq',
    nameUz: 'Buyruq',
    nameRu: 'Приказ',
    category: 'corporate',
    fields: [F('organization', 'Tashkilot', 'Организация'), F('number', 'Buyruq raqami', 'Номер приказа', false), F('subject', 'Mavzu', 'Тема'), F('body', 'Buyruq mazmuni', 'Содержание'), F('director', 'Rahbar', 'Руководитель')],
    promptHint: 'Rasmiy buyruq: sarlavha, "BUYURAMAN" so\'zi, bandlar bo\'yicha topshiriqlar, ijro nazorati, imzo.',
  },
  {
    code: 'farmoyish',
    nameUz: 'Farmoyish',
    nameRu: 'Распоряжение',
    category: 'corporate',
    fields: [F('organization', 'Tashkilot', 'Организация'), F('number', 'Raqam', 'Номер', false), F('subject', 'Mavzu', 'Тема'), F('body', 'Mazmun', 'Содержание'), F('official', 'Mansabdor', 'Должностное лицо')],
    promptHint: 'Operativ farmoyish: qisqa asos, aniq topshiriq, muddat va mas\'ul shaxs.',
  },
  {
    code: 'dalolatnoma',
    nameUz: 'Dalolatnoma (Akt)',
    nameRu: 'Акт',
    category: 'corporate',
    fields: [F('title', 'Dalolatnoma nomi', 'Название акта'), F('commission', 'Komissiya a\'zolari', 'Члены комиссии'), F('facts', 'Aniqlangan holatlar', 'Установленные факты'), dateField],
    promptHint: 'Komissiya tarkibi, aniqlangan faktlar bayoni, xulosa va a\'zolar imzolari.',
  },

  // ── Xatlar ──
  {
    code: 'kafolat_xati',
    nameUz: 'Kafolat xati',
    nameRu: 'Гарантийное письмо',
    category: 'letter',
    fields: [recipient, F('guarantor', 'Kafil (tashkilot/shaxs)', 'Гарант'), F('obligation', 'Kafolatlangan majburiyat', 'Гарантируемое обязательство'), F('term', 'Muddat', 'Срок', false)],
    promptHint: 'Rasmiy blankada: aniq majburiyat, summa/muddat, rekvizitlar va rahbar imzosi.',
  },
  {
    code: 'rasmiy_xat',
    nameUz: 'Rasmiy xat',
    nameRu: 'Официальное письмо',
    category: 'letter',
    fields: [recipient, F('sender', 'Yuboruvchi', 'Отправитель'), F('subject', 'Mavzu', 'Тема'), F('body', 'Xat matni', 'Текст письма')],
    promptHint: 'Ish yuritish uslubi: murojaat, asosiy qism, xulosa/iltimos, hurmat bilan yakun va imzo.',
  },
];

export const DOCUMENT_TYPE_MAP = new Map(DOCUMENT_TYPES.map((t) => [t.code, t]));
