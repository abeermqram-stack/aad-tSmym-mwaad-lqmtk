import { useState } from "react";
import { Bell, Check, ChevronDown, CirclePlus, Clock3, Leaf, Pencil, Plus, Sparkles, Utensils, X } from "lucide-react";

type Meal = {
  id: number;
  name: string;
  time: string;
  note: string;
  mark: string;
  tone: string;
  completed: boolean;
};

const initialMeals: Meal[] = [
  { id: 1, name: "الفطور", time: "٨:٠٠ ص", note: "ابدأ يومك بشيء يشبعك", mark: "ص", tone: "bg-[#f2e6d4] text-[#9b6c38]", completed: false },
  { id: 2, name: "الغداء", time: "١:٣٠ م", note: "وجبة متوازنة تعطيك طاقة", mark: "غ", tone: "bg-[#e3eee5] text-[#477659]", completed: false },
  { id: 3, name: "وجبة خفيفة", time: "٤:٣٠ م", note: "استراحة صغيرة بين الوجبات", mark: "خ", tone: "bg-[#f5e6d9] text-[#b47750]", completed: true },
  { id: 4, name: "العشاء", time: "٨:٠٠ م", note: "خفيف ولذيذ لنهاية يومك", mark: "ع", tone: "bg-[#e5e9db] text-[#71835c]", completed: false },
];

export function Dashboard() {
  const [meals, setMeals] = useState(initialMeals);
  const [reminders, setReminders] = useState(true);
  const [dialog, setDialog] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [time, setTime] = useState("08:00");
  const [note, setNote] = useState("");

  const doneCount = meals.filter((meal) => meal.completed).length;
  const progress = meals.length ? (doneCount / meals.length) * 100 : 0;

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
    setTime(meal.time);
    setNote(meal.note);
    setDialog("edit");
  };

  const saveMeal = () => {
    if (!name.trim()) return;
    if (dialog === "edit" && editing !== null) {
      setMeals((current) => current.map((meal) => meal.id === editing ? { ...meal, name: name.trim(), time, note: note.trim() || "وجبتك كما تحبها" } : meal));
    } else {
      setMeals((current) => [...current, { id: Date.now(), name: name.trim(), time, note: note.trim() || "وجبتك كما تحبها", mark: name.trim().slice(0, 1), tone: "bg-[#e9e8d8] text-[#667653]", completed: false }]);
    }
    setDialog(null);
  };

  const toggleMeal = (id: number) => setMeals((current) => current.map((meal) => meal.id === id ? { ...meal, completed: !meal.completed } : meal));

  return (
    <main dir="rtl" className="relative mx-auto min-h-[100dvh] w-full max-w-[430px] overflow-hidden bg-[#f5f5ef] px-5 pb-8 pt-[max(20px,env(safe-area-inset-top))] text-[#223c32]">
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
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className={`truncate text-[13px] font-bold ${meal.completed ? "text-[#728176]" : "text-[#2d4036]"}`}>{meal.name}</h3>
                  {meal.completed && <span className="rounded-full bg-[#edf3eb] px-2 py-0.5 text-[9px] font-semibold text-[#66806a]">تمّت</span>}
                </div>
                <p className="mt-1 truncate text-[10px] text-[#909991]">{meal.note}</p>
              </div>
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

      {dialog && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-[#1b3027]/35 px-4 pb-[max(16px,env(safe-area-inset-bottom))] backdrop-blur-[3px]" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}>
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
