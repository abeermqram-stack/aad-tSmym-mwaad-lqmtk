import { useState } from "react";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  ChartNoAxesColumn,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  CirclePlus,
  Clock3,
  Flame,
  House,
  Leaf,
  Pencil,
  Plus,
  Settings2,
  Sparkles,
  Target,
  Utensils,
  UserRound,
  X,
} from "lucide-react";

type Meal = {
  id: number;
  name: string;
  time: string;
  note: string;
  mark: string;
  tone: string;
  completed: boolean;
};

type Page = "today" | "week" | "journey" | "profile" | "details";

const initialMeals: Meal[] = [
  { id: 1, name: "الفطور", time: "٨:٠٠ ص", note: "ابدأ يومك بشيء يشبعك", mark: "ص", tone: "bg-[#f2e6d4] text-[#9b6c38]", completed: false },
  { id: 2, name: "الغداء", time: "١:٣٠ م", note: "وجبة متوازنة تعطيك طاقة", mark: "غ", tone: "bg-[#e3eee5] text-[#477659]", completed: false },
  { id: 3, name: "وجبة خفيفة", time: "٤:٣٠ م", note: "استراحة صغيرة بين الوجبات", mark: "خ", tone: "bg-[#f5e6d9] text-[#b47750]", completed: true },
  { id: 4, name: "العشاء", time: "٨:٠٠ م", note: "خفيف ولذيذ لنهاية يومك", mark: "ع", tone: "bg-[#e5e9db] text-[#71835c]", completed: false },
];

function toInputTime(value: string) {
  const western = value.replace(/[٠-٩]/g, (digit) =>
    String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)),
  );
  const match = western.match(/(\d{1,2}):(\d{2})/);
  if (!match) return "08:00";

  let hour = Number(match[1]);
  if (western.includes("م") && hour < 12) hour += 12;
  if (western.includes("ص") && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

function toArabicTime(value: string) {
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const suffix = hour >= 12 ? "م" : "ص";
  const twelveHour = hour % 12 || 12;
  return `${String(twelveHour).padStart(2, "0")}:${minuteText} ${suffix}`.replace(
    /\d/g,
    (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)],
  );
}

function BottomNavigation({
  activePage,
  onNavigate,
}: {
  activePage: Page;
  onNavigate: (page: Page) => void;
}) {
  const items = [
    { page: "today" as const, label: "اليوم", icon: House },
    { page: "week" as const, label: "الأسبوع", icon: CalendarDays },
    { page: "journey" as const, label: "رحلتي", icon: ChartNoAxesColumn },
    { page: "profile" as const, label: "حسابي", icon: UserRound },
  ];

  return (
    <nav
      aria-label="التنقل الرئيسي"
      className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-[430px] -translate-x-1/2 items-center justify-around border-t border-[#e8eae2] bg-[#fbfbf7]/95 px-3 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] backdrop-blur-xl"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const selected = activePage === item.page;
        return (
          <button
            key={item.page}
            onClick={() => onNavigate(item.page)}
            aria-current={selected ? "page" : undefined}
            className={`flex min-w-[64px] flex-col items-center gap-1 rounded-2xl px-3 py-1.5 text-[10px] font-semibold transition active:scale-95 ${
              selected ? "text-[#2d674f]" : "text-[#9aa39a]"
            }`}
          >
            <span
              className={`grid h-8 w-10 place-items-center rounded-full transition ${
                selected ? "bg-[#e5eee3]" : "bg-transparent"
              }`}
            >
              <Icon size={18} strokeWidth={selected ? 2.2 : 1.8} />
            </span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

export function Dashboard() {
  const [meals, setMeals] = useState(initialMeals);
  const [reminders, setReminders] = useState(true);
  const [activePage, setActivePage] = useState<Page>("today");
  const [selectedMealId, setSelectedMealId] = useState(1);
  const [selectedDay, setSelectedDay] = useState(6);
  const [dialog, setDialog] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [time, setTime] = useState("08:00");
  const [note, setNote] = useState("");

  const doneCount = meals.filter((meal) => meal.completed).length;
  const progress = meals.length ? (doneCount / meals.length) * 100 : 0;
  const selectedMeal = meals.find((meal) => meal.id === selectedMealId) ?? meals[0];
  const navigation = (
    <BottomNavigation activePage={activePage} onNavigate={setActivePage} />
  );
  const weekDays = [
    { label: "اثن", fullLabel: "الاثنين", day: 5 },
    { label: "ثلث", fullLabel: "الثلاثاء", day: 6 },
    { label: "أرب", fullLabel: "الأربعاء", day: 7 },
    { label: "خمي", fullLabel: "الخميس", day: 8 },
    { label: "جمع", fullLabel: "الجمعة", day: 9 },
    { label: "سبت", fullLabel: "السبت", day: 10 },
    { label: "أحد", fullLabel: "الأحد", day: 11 },
  ];

  const openAdd = () => {
    setEditing(null);
    setName("");
    setTime("08:00");
    setNote("");
    setDialog("add");
  };

  const openEdit = (meal: Meal) => {
    setEditing(meal.id);
    setName(meal.name);
    setTime(toInputTime(meal.time));
    setNote(meal.note);
    setDialog("edit");
  };

  const saveMeal = () => {
    if (!name.trim()) return;
    const displayTime = toArabicTime(time);
    if (dialog === "edit" && editing !== null) {
      setMeals((current) => current.map((meal) => meal.id === editing ? { ...meal, name: name.trim(), time: displayTime, note: note.trim() || "وجبتك كما تحبها" } : meal));
    } else {
      setMeals((current) => [...current, { id: Date.now(), name: name.trim(), time: displayTime, note: note.trim() || "وجبتك كما تحبها", mark: name.trim().slice(0, 1), tone: "bg-[#e9e8d8] text-[#667653]", completed: false }]);
    }
    setDialog(null);
  };

  const toggleMeal = (id: number) => setMeals((current) => current.map((meal) => meal.id === id ? { ...meal, completed: !meal.completed } : meal));
  const openMealDetails = (meal: Meal) => {
    setSelectedMealId(meal.id);
    setActivePage("details");
  };

  if (activePage === "week") {
    return (
      <main dir="rtl" className="relative mx-auto min-h-[100dvh] w-full max-w-[430px] overflow-hidden bg-[#f5f5ef] px-5 pb-28 pt-[max(20px,env(safe-area-inset-top))] text-[#223c32]">
        <header className="flex items-center justify-between pb-6">
          <div>
            <p className="text-[10px] font-medium text-[#89958c]">خطة مريحة لأسبوعك</p>
            <h1 className="mt-1 text-[23px] font-bold tracking-[-.04em]">جدول الوجبات</h1>
          </div>
          <button onClick={() => setActivePage("today")} aria-label="العودة لليوم" className="grid h-10 w-10 place-items-center rounded-full border border-[#e6e9e0] bg-[#fbfbf7] text-[#53705f]">
            <ArrowRight size={18} />
          </button>
        </header>

        <section className="rounded-[24px] bg-[#285f49] p-5 text-white shadow-[0_12px_28px_rgba(35,93,73,.12)]">
          <p className="text-[11px] font-medium text-[#d2e0d5]">الأسبوع الحالي</p>
          <div className="mt-1 flex items-center justify-between">
            <h2 className="text-[19px] font-bold">٥ — ١١ أكتوبر</h2>
            <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-white/10"><CalendarDays size={20} /></span>
          </div>
          <p className="mt-2 text-[11px] text-[#d2e0d5]">خطط بسيط، والتزم بإيقاع يناسب يومك.</p>
        </section>

        <div className="mt-5 grid grid-cols-7 gap-1.5" aria-label="أيام الأسبوع">
          {weekDays.map((item) => (
            <button key={item.day} onClick={() => setSelectedDay(item.day)} aria-pressed={selectedDay === item.day} className={`flex min-h-[68px] flex-col items-center justify-center gap-2 rounded-[17px] text-[10px] font-semibold transition active:scale-95 ${selectedDay === item.day ? "bg-[#dfeadd] text-[#2d674f] ring-1 ring-[#b8cbb8]" : "border border-[#e8eae2] bg-[#fbfbf7] text-[#8b968d]"}`}>
              <span>{item.label}</span>
              <span className={`grid h-7 w-7 place-items-center rounded-full text-[12px] ${selectedDay === item.day ? "bg-[#397255] text-white" : "text-[#40574a]"}`}>{item.day}</span>
            </button>
          ))}
        </div>

        <section className="mt-7">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-[10px] text-[#919b90]">{weekDays.find((item) => item.day === selectedDay)?.fullLabel}، {selectedDay.toLocaleString("ar-SA")} أكتوبر</p>
              <h2 className="mt-1 text-[19px] font-bold">وجبات اليوم</h2>
            </div>
            <button onClick={() => { setActivePage("today"); openAdd(); }} className="flex min-h-9 items-center gap-1 rounded-full bg-[#e6eee4] px-3 text-[11px] font-bold text-[#37644c] active:scale-95">
              <Plus size={14} /> أضف
            </button>
          </div>
          <div className="space-y-2.5">
            {meals.map((meal) => (
              <article key={meal.id} className="flex items-center gap-3 rounded-[19px] border border-[#e8eae2] bg-[#fbfbf8] p-3 shadow-[0_3px_12px_rgba(49,71,57,.03)]">
                <button onClick={() => toggleMeal(meal.id)} aria-label={meal.completed ? `إلغاء إكمال ${meal.name}` : `إكمال ${meal.name}`} className={`grid h-10 w-10 shrink-0 place-items-center rounded-[14px] ${meal.completed ? "bg-[#e4eee3] text-[#4f805c]" : meal.tone}`}>
                  {meal.completed ? <Check size={18} /> : <span className="font-bold">{meal.mark}</span>}
                </button>
                <button onClick={() => openMealDetails(meal)} className="min-w-0 flex-1 text-right">
                  <span className="block text-[13px] font-bold">{meal.name}</span>
                  <span className="mt-1 block truncate text-[10px] text-[#929b91]">{meal.note}</span>
                </button>
                <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-[#78867b]"><Clock3 size={12} /> {meal.time}</span>
                <button onClick={() => { setActivePage("today"); openEdit(meal); }} aria-label={`تعديل ${meal.name}`} className="grid h-8 w-8 place-items-center rounded-full text-[#89958c] active:bg-[#eef1ea]"><Pencil size={14} /></button>
              </article>
            ))}
          </div>
        </section>
        <section className="mt-5 rounded-[19px] border border-[#e8eae2] bg-[#fbfbf7] p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-[13px] bg-[#f4ead7] text-[#a87a3d]"><Target size={17} /></span>
            <div className="flex-1">
              <p className="text-[12px] font-bold">إيقاعك هذا الأسبوع</p>
              <p className="mt-1 text-[10px] text-[#929b91]">وجباتك تساعدك على الاستمرار بهدوء</p>
            </div>
            <span className="text-[12px] font-bold text-[#477659]">{doneCount}/{meals.length}</span>
          </div>
        </section>
        {navigation}
      </main>
    );
  }

  if (activePage === "details") {
    return (
      <main dir="rtl" className="relative mx-auto min-h-[100dvh] w-full max-w-[430px] overflow-hidden bg-[#f5f5ef] px-5 pb-28 pt-[max(20px,env(safe-area-inset-top))] text-[#223c32]">
        <header className="flex items-center justify-between pb-6">
          <div>
            <p className="text-[10px] font-medium text-[#89958c]">تفاصيل وجبتك</p>
            <h1 className="mt-1 text-[22px] font-bold tracking-[-.04em]">{selectedMeal.name}</h1>
          </div>
          <button onClick={() => setActivePage("today")} aria-label="العودة لليوم" className="grid h-10 w-10 place-items-center rounded-full border border-[#e6e9e0] bg-[#fbfbf7] text-[#53705f]">
            <ArrowRight size={18} />
          </button>
        </header>

        <section className="relative overflow-hidden rounded-[27px] bg-[#285f49] p-6 text-white shadow-[0_14px_30px_rgba(35,93,73,.14)]">
          <div className="absolute -left-7 -top-10 h-40 w-40 rounded-full border border-white/10" />
          <div className="relative grid h-[154px] place-items-center">
            <span className="absolute h-[132px] w-[132px] rounded-full bg-white/5" />
            <span className="relative grid h-[88px] w-[88px] place-items-center rounded-[28px] bg-[#f4ecd9] text-[#467555] shadow-lg">
              <Utensils size={36} strokeWidth={1.6} />
            </span>
          </div>
          <p className="relative mt-2 text-center text-[22px] font-bold">{selectedMeal.name}</p>
          <p className="relative mt-2 text-center text-[11px] text-[#d2e0d5]">{selectedMeal.note}</p>
          <div className="relative mt-5 flex items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-[11px] font-semibold">
            <Clock3 size={14} /> موعدها {selectedMeal.time}
          </div>
        </section>

        <section className="mt-5 rounded-[21px] border border-[#e8eae2] bg-[#fbfbf7] p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#e6eee4] text-[#477659]"><Leaf size={18} /></span>
            <div>
              <p className="text-[12px] font-bold">تذكير لطيف</p>
              <p className="mt-1 text-[10px] text-[#929b91]">{reminders ? "التذكيرات مفعّلة لهذه الوجبة" : "التذكيرات متوقفة حاليًا"}</p>
            </div>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-[19px] border border-[#e8eae2] bg-[#fbfbf7] p-4">
            <span className="grid h-9 w-9 place-items-center rounded-[13px] bg-[#f4ead7] text-[#a87a3d]"><Target size={17} /></span>
            <p className="mt-3 text-[11px] text-[#929b91]">هدف اليوم</p>
            <p className="mt-1 text-[14px] font-bold">{doneCount} من {meals.length} وجبات</p>
          </div>
          <div className="rounded-[19px] border border-[#e8eae2] bg-[#fbfbf7] p-4">
            <span className="grid h-9 w-9 place-items-center rounded-[13px] bg-[#e6eee4] text-[#477659]"><CheckCircle2 size={17} /></span>
            <p className="mt-3 text-[11px] text-[#929b91]">الحالة</p>
            <p className="mt-1 text-[14px] font-bold">{selectedMeal.completed ? "تمّت الوجبة" : "بانتظارك"}</p>
          </div>
        </section>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button onClick={() => toggleMeal(selectedMeal.id)} className="flex h-12 items-center justify-center gap-2 rounded-[15px] bg-[#285f49] text-[12px] font-bold text-white transition active:scale-[.98]">
            <Check size={17} /> {selectedMeal.completed ? "إلغاء الإكمال" : "تم تناولها"}
          </button>
          <button onClick={() => { setActivePage("today"); openEdit(selectedMeal); }} className="flex h-12 items-center justify-center gap-2 rounded-[15px] border border-[#dfe6dc] bg-[#fbfbf7] text-[12px] font-bold text-[#456752] transition active:scale-[.98]">
            <Pencil size={15} /> تعديل الوجبة
          </button>
        </div>
        {navigation}
      </main>
    );
  }

  if (activePage === "journey") {
    const bars = [44, 61, 50, 76, 59, 86, 68];
    const labels = ["اثن", "ثلث", "أرب", "خمي", "جمع", "سبت", "أحد"];
    return (
      <main dir="rtl" className="relative mx-auto min-h-[100dvh] w-full max-w-[430px] overflow-hidden bg-[#f5f5ef] px-5 pb-28 pt-[max(20px,env(safe-area-inset-top))] text-[#223c32]">
        <header className="pb-6">
          <p className="text-[10px] font-medium text-[#89958c]">خطوات صغيرة تصنع فرقًا</p>
          <h1 className="mt-1 text-[23px] font-bold tracking-[-.04em]">رحلتك</h1>
        </header>

        <section className="rounded-[25px] bg-[#285f49] p-5 text-white shadow-[0_12px_28px_rgba(35,93,73,.12)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-[#d2e0d5]">إنجاز اليوم</p>
              <p className="mt-2 text-[30px] font-bold tracking-[-.04em]">{Math.round(progress)}<span className="mr-1 text-[16px]">٪</span></p>
              <p className="mt-1 text-[10px] text-[#d2e0d5]">أكملت {doneCount} من {meals.length} وجبات</p>
            </div>
            <div className="grid h-[96px] w-[96px] place-items-center rounded-full border-[7px] border-[#d7b979] text-center">
              <div>
                <Check size={23} className="mx-auto text-[#f4e2b8]" />
                <span className="text-[10px] text-[#d2e0d5]">استمر</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-[22px] border border-[#e8eae2] bg-[#fbfbf7] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-bold">هذا الأسبوع</p>
              <p className="mt-1 text-[10px] text-[#929b91]">توازن لطيف، يومًا بعد يوم</p>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-[13px] bg-[#f4ead7] text-[#a87a3d]"><ChartNoAxesColumn size={17} /></span>
          </div>
          <div className="mt-5 flex h-[112px] items-end justify-between gap-2">
            {bars.map((height, index) => (
              <div key={labels[index]} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-[84px] w-full items-end rounded-full bg-[#eff2eb]">
                  <div className={`w-full rounded-full transition-all ${index === 5 ? "bg-[#c7a76b]" : "bg-[#82a18a]"}`} style={{ height: `${height}%` }} />
                </div>
                <span className="text-[9px] font-medium text-[#929b91]">{labels[index]}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-[21px] border border-[#e8eae2] bg-[#fbfbf7] p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#f3e9d7] text-[#a87a3d]"><Flame size={18} /></span>
            <div className="flex-1">
              <p className="text-[12px] font-bold">أنت على الطريق الصحيح</p>
              <p className="mt-1 text-[10px] leading-5 text-[#929b91]">الاهتمام بعاداتك اليومية إنجاز يستحق التقدير.</p>
            </div>
          </div>
        </section>

        <button onClick={() => setActivePage("week")} className="mt-4 flex h-12 w-full items-center justify-between rounded-[16px] bg-[#e6eee4] px-4 text-[12px] font-bold text-[#37644c] active:scale-[.99]">
          <span>استعرض خطة الأسبوع</span><ChevronLeft size={17} />
        </button>
        {navigation}
      </main>
    );
  }

  if (activePage === "profile") {
    return (
      <main dir="rtl" className="relative mx-auto min-h-[100dvh] w-full max-w-[430px] overflow-hidden bg-[#f5f5ef] px-5 pb-28 pt-[max(20px,env(safe-area-inset-top))] text-[#223c32]">
        <header className="pb-6">
          <p className="text-[10px] font-medium text-[#89958c]">مساحتك الشخصية</p>
          <h1 className="mt-1 text-[23px] font-bold tracking-[-.04em]">حسابي</h1>
        </header>
        <section className="flex items-center gap-4 rounded-[24px] bg-[#285f49] p-5 text-white shadow-[0_12px_28px_rgba(35,93,73,.12)]">
          <span className="grid h-[54px] w-[54px] place-items-center rounded-[19px] bg-[#f4ecd9] text-[#477659]"><UserRound size={25} /></span>
          <div>
            <p className="text-[16px] font-bold">أهلًا بك</p>
            <p className="mt-1 text-[10px] text-[#d2e0d5]">كل يوم فرصة لعناية ألطف بنفسك</p>
          </div>
        </section>

        <section className="mt-5 rounded-[22px] border border-[#e8eae2] bg-[#fbfbf7] p-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-[13px] bg-[#e6eee4] text-[#477659]"><Settings2 size={17} /></span>
            <div>
              <p className="text-[13px] font-bold">تفضيلاتك</p>
              <p className="mt-1 text-[10px] text-[#929b91]">رتّب التجربة على طريقتك</p>
            </div>
          </div>
          <button onClick={() => setReminders((enabled) => !enabled)} aria-pressed={reminders} className="flex min-h-[62px] w-full items-center justify-between border-t border-[#eef0e9] py-3 text-right">
            <span className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-[13px] bg-[#f4ead7] text-[#a87a3d]"><Bell size={17} /></span>
              <span><span className="block text-[12px] font-bold">تذكيرات الوجبات</span><span className="mt-1 block text-[10px] text-[#929b91]">{reminders ? "تصل في أوقات وجباتك" : "موقوفة حاليًا"}</span></span>
            </span>
            <span className={`relative h-[23px] w-[40px] rounded-full transition-colors ${reminders ? "bg-[#397255]" : "bg-[#c8cec5]"}`}><span className={`absolute top-[3px] h-[17px] w-[17px] rounded-full bg-white shadow-sm transition-all ${reminders ? "right-[3px]" : "right-[20px]"}`} /></span>
          </button>
          <button onClick={() => setActivePage("week")} className="flex min-h-[62px] w-full items-center justify-between border-t border-[#eef0e9] py-3 text-right">
            <span className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-[13px] bg-[#e8ede4] text-[#5c795f]"><CalendarDays size={17} /></span>
              <span><span className="block text-[12px] font-bold">مواعيد الوجبات</span><span className="mt-1 block text-[10px] text-[#929b91]">راجع جدولك الأسبوعي</span></span>
            </span>
            <ChevronLeft size={17} className="text-[#9ba49b]" />
          </button>
        </section>

        <section className="mt-4 rounded-[21px] bg-[#e8eee4] p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-[13px] bg-white/70 text-[#477659]"><Leaf size={17} /></span>
            <div>
              <p className="text-[12px] font-bold text-[#365947]">عادات ألطف، أيام أجمل</p>
              <p className="mt-1 text-[10px] leading-5 text-[#718276]">خطتك ملكك؛ عدّلها كلما احتجت.</p>
            </div>
          </div>
        </section>
        {navigation}
      </main>
    );
  }

  return (
    <main dir="rtl" className="relative mx-auto min-h-[100dvh] w-full max-w-[430px] overflow-hidden bg-[#f5f5ef] px-5 pb-28 pt-[max(20px,env(safe-area-inset-top))] text-[#223c32]">
      <div className="pointer-events-none absolute -right-24 top-[-100px] h-64 w-64 rounded-full bg-[#e6ede3] opacity-70 blur-3xl" />
      <header className="relative flex items-center justify-between pb-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#dfe9dd] text-[#2d674f]">
            <Utensils size={19} strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-[17px] font-bold tracking-[-.03em]">موعد لقمتك</p>
            <p className="mt-0.5 text-[10px] font-medium text-[#829087]">اهتم بنفسك، لقمة بلقمة</p>
          </div>
        </div>
        <button onClick={() => document.getElementById("today-meals")?.scrollIntoView({ behavior: "smooth", block: "start" })} aria-label="انتقل إلى وجبات اليوم" className="grid h-10 w-10 place-items-center rounded-full border border-[#e7e9e1] bg-[#fafaf6] text-[#567264] transition active:scale-95">
          <ChevronDown size={18} />
        </button>
      </header>

      <section className="relative overflow-hidden rounded-[26px] bg-[#235d49] px-5 pb-5 pt-5 text-[#f8f7ee] shadow-[0_14px_30px_rgba(35,93,73,.15)]">
        <div className="absolute -left-7 -top-10 h-36 w-36 rounded-full border border-white/10" />
        <div className="absolute -left-1 top-4 h-24 w-24 rounded-full bg-[#3d765c]/50" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="pt-1">
            <p className="text-[11px] font-medium tracking-wide text-[#c6d8c9]">الثلاثاء، ٦ أكتوبر</p>
            <h1 className="mt-2 text-[24px] font-bold leading-[1.3] tracking-[-.04em]">خلّ يومك ألذ<br />وأسهل</h1>
            <p className="mt-2 max-w-[220px] text-[11px] leading-5 text-[#d4e1d7]">وجباتك مرتبة على وقتك، وخطوة صغيرة تكفي.</p>
          </div>
          <div className="relative mt-2 grid h-[92px] w-[92px] shrink-0 place-items-center rounded-full border border-white/10 bg-[#397458]">
            <div className="absolute h-[63px] w-[63px] rounded-full bg-[#f5ecd9]" />
            <div className="relative grid h-12 w-12 place-items-center rounded-[16px] border-[3px] border-[#c98652] bg-[#faf7eb] text-[#4b7858] shadow-sm">
              <Leaf size={25} strokeWidth={2.1} />
              <span className="absolute -right-1 top-0 h-2.5 w-2.5 rounded-full bg-[#c46644]" />
              <span className="absolute -left-1 bottom-1 h-2 w-2 rounded-full bg-[#d6a848]" />
            </div>
          </div>
        </div>
        <div className="relative mt-5">
          <div className="mb-2 flex items-center justify-between text-[10px]">
            <span className="text-[#d4e1d7]">إنجاز وجبات اليوم</span>
            <span className="font-semibold text-[#f4e2b8]">{doneCount} من {meals.length}</span>
          </div>
          <div className="h-[5px] overflow-hidden rounded-full bg-[#174735]">
            <div className="h-full rounded-full bg-[#d7b979] transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <Sparkles className="absolute bottom-6 left-5 text-[#d7b979]/70" size={15} />
      </section>

      <button onClick={() => setReminders((enabled) => !enabled)} aria-pressed={reminders} className="mt-4 flex min-h-[64px] w-full items-center justify-between rounded-[19px] border border-[#e8e9e1] bg-[#fbfbf7] px-4 text-right shadow-[0_4px_14px_rgba(49,71,57,.035)] transition active:scale-[.99]">
        <div className="flex items-center gap-3">
          <span className={`grid h-9 w-9 place-items-center rounded-[13px] ${reminders ? "bg-[#f5ead7] text-[#a87a3d]" : "bg-[#eeefea] text-[#89948a]"}`}><Bell size={17} strokeWidth={1.8} /></span>
          <div>
            <p className="text-[12px] font-bold">{reminders ? "تذكيرات الوجبات مفعّلة" : "التذكيرات متوقفة"}</p>
            <p className="mt-1 text-[10px] text-[#8b958c]">نذكّرك بلطف في وقت كل وجبة</p>
          </div>
        </div>
        <span className={`relative h-[23px] w-[40px] rounded-full transition-colors ${reminders ? "bg-[#397255]" : "bg-[#c8cec5]"}`}>
          <span className={`absolute top-[3px] h-[17px] w-[17px] rounded-full bg-white shadow-sm transition-all ${reminders ? "right-[3px]" : "right-[20px]"}`} />
        </span>
      </button>

      <section id="today-meals" className="mt-7 scroll-mt-5">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-medium text-[#919b90]">الثلاثاء، ٦ أكتوبر</p>
            <h2 className="mt-1 text-[19px] font-bold tracking-[-.03em]">وجباتك اليوم</h2>
          </div>
          <button onClick={openAdd} className="flex min-h-[38px] items-center gap-1.5 rounded-full bg-[#e6eee4] px-3.5 text-[11px] font-bold text-[#37644c] transition hover:bg-[#dce8da] active:scale-95">
            <Plus size={15} /> أضف وجبة
          </button>
        </div>
        <div className="space-y-2">
          {meals.map((meal) => (
            <article key={meal.id} className={`flex min-h-[72px] items-center gap-3 rounded-[18px] border bg-[#fbfbf8] px-3.5 py-3 shadow-[0_3px_12px_rgba(49,71,57,.035)] transition ${meal.completed ? "border-[#dce8dc]" : "border-[#e9ebe4]"}`}>
              <button onClick={() => toggleMeal(meal.id)} aria-label={meal.completed ? `إلغاء إكمال ${meal.name}` : `إكمال ${meal.name}`} aria-pressed={meal.completed} className={`grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[15px] transition active:scale-90 ${meal.completed ? "bg-[#e4eee3] text-[#4f805c]" : meal.tone}`}>
                {meal.completed ? <Check size={20} strokeWidth={2.4} /> : <span className="text-[17px] font-bold">{meal.mark}</span>}
              </button>
              <button onClick={() => openMealDetails(meal)} className="min-w-0 flex-1 text-right">
                <div className="flex items-center gap-2">
                  <h3 className={`truncate text-[13px] font-bold ${meal.completed ? "text-[#728176]" : "text-[#2d4036]"}`}>{meal.name}</h3>
                  {meal.completed && <span className="rounded-full bg-[#edf3eb] px-2 py-0.5 text-[9px] font-semibold text-[#66806a]">تمّت</span>}
                </div>
                <p className="mt-1 truncate text-[10px] text-[#909991]">{meal.note}</p>
              </button>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className="flex items-center gap-1 text-[10px] font-semibold text-[#78867b]"><Clock3 size={11} /> {meal.time}</span>
                <button onClick={() => openEdit(meal)} aria-label={`تعديل ${meal.name}`} className="grid h-7 w-7 place-items-center rounded-full text-[#9aa39a] transition hover:bg-[#f0f1eb] hover:text-[#37644c] active:scale-90"><Pencil size={13} /></button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-5 flex items-center justify-center gap-2 text-[10px] text-[#929b91]">
        <span className="h-1 w-1 rounded-full bg-[#c48a52]" />
        <span>كل وجبة صغيرة، عناية كبيرة بنفسك</span>
      </div>

      {navigation}

      {dialog && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#1b3027]/35 px-4 pb-[max(16px,env(safe-area-inset-bottom))] backdrop-blur-[3px]" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="meal-dialog-title" className="w-full max-w-[398px] rounded-[26px] bg-[#fbfbf7] p-5 shadow-[0_18px_60px_rgba(21,48,36,.2)]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-[#879489]">{dialog === "edit" ? "تعديل التفاصيل" : "خطوة لطيفة ليومك"}</p>
                <h2 id="meal-dialog-title" className="mt-1 text-[19px] font-bold">{dialog === "edit" ? "عدّل وجبتك" : "أضف وجبة جديدة"}</h2>
              </div>
              <button onClick={() => setDialog(null)} aria-label="إغلاق" className="grid h-9 w-9 place-items-center rounded-full bg-[#eff1eb] text-[#627568]"><X size={17} /></button>
            </div>
            <label className="mb-3 block text-[11px] font-semibold text-[#53655a]">اسم الوجبة
              <input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="مثال: وجبة خفيفة" className="mt-1.5 h-12 w-full rounded-[14px] border border-[#e4e8df] bg-[#f7f8f2] px-3.5 text-[13px] font-medium text-[#31483b] outline-none placeholder:text-[#a5ada4] focus:border-[#75957e]" />
            </label>
            <label className="mb-3 block text-[11px] font-semibold text-[#53655a]">الوقت
              <input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="mt-1.5 h-12 w-full rounded-[14px] border border-[#e4e8df] bg-[#f7f8f2] px-3.5 text-[13px] font-medium text-[#31483b] outline-none focus:border-[#75957e]" />
            </label>
            <label className="mb-5 block text-[11px] font-semibold text-[#53655a]">ملاحظة لطيفة <span className="font-normal text-[#99a198]">(اختياري)</span>
              <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="ما الذي تحب تذكّره؟" className="mt-1.5 h-12 w-full rounded-[14px] border border-[#e4e8df] bg-[#f7f8f2] px-3.5 text-[13px] font-medium text-[#31483b] outline-none placeholder:text-[#a5ada4] focus:border-[#75957e]" />
            </label>
            <button onClick={saveMeal} disabled={!name.trim()} className="flex h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-[#285f49] text-[13px] font-bold text-white transition hover:bg-[#204f3c] active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-50">
              <CirclePlus size={17} /> {dialog === "edit" ? "حفظ التغييرات" : "إضافة إلى يومي"}
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
