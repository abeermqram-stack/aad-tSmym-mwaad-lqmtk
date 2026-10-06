import { useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Redirect, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { CalendarDays, Check, ChevronLeft, CirclePlus, Clock3, Flame, House, Leaf, Pencil, Plus, Settings2, Sparkles, Target, Utensils, UserRound, X, Bell, ChartNoAxesColumn, ArrowRight, ChevronDown, CheckCircle2, Trash2, Download, Smartphone, Send, LogOut, RefreshCw } from 'lucide-react';
import {
  useListMeals, useCreateMeal, useUpdateMeal, useDeleteMeal, useSetMealCompletion,
  useGetDashboardSummary, useGetJourneySummary, useGetPreferences, useUpdatePreferences,
  useGetPushPublicKey, useGetPushStatus, useCreatePushSubscription, useDeletePushSubscription,
  useSendTestNotification, getListMealsQueryKey, getGetDashboardSummaryQueryKey,
  getGetJourneySummaryQueryKey, getGetPreferencesQueryKey, getGetPushStatusQueryKey,
} from '@workspace/api-client-react';
import type { Meal, DaySummary } from '@workspace/api-client-react';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

const appearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: { logoPlacement: 'inside' as const, logoLinkUrl: basePath || '/', logoImageUrl: `${window.location.origin}${basePath}/logo.svg` },
  variables: {
    colorPrimary: '#285f49', colorForeground: '#223c32', colorMutedForeground: '#829087',
    colorDanger: '#a44b40', colorBackground: '#fbfbf7', colorInput: '#f7f8f2',
    colorInputForeground: '#31483b', colorNeutral: '#e4e8df', fontFamily: '"Noto Sans Arabic", sans-serif', borderRadius: '1rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#fbfbf7] rounded-[26px] w-[440px] max-w-full overflow-hidden border border-[#e8eae2]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none', footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#223c32] font-bold', headerSubtitle: 'text-[#829087]',
    socialButtonsBlockButtonText: 'text-[#31483b]', formFieldLabel: 'text-[#53655a]',
    footerActionLink: 'text-[#285f49]', footerActionText: 'text-[#829087]', dividerText: 'text-[#829087]',
    identityPreviewEditButton: 'text-[#285f49]', formFieldSuccessText: 'text-[#477659]', alertText: 'text-[#7b433c]',
    logoBox: 'rounded-[14px]', logoImage: 'rounded-[14px]',
    socialButtonsBlockButton: 'border-[#e4e8df] rounded-[14px]', formButtonPrimary: 'bg-[#285f49] hover:bg-[#204f3c] rounded-[14px]',
    formFieldInput: 'bg-[#f7f8f2] border-[#e4e8df] text-[#31483b] rounded-[14px]',
    footerAction: 'text-[#829087]', dividerLine: 'bg-[#e8eae2]', alert: 'rounded-[14px]',
    otpCodeFieldInput: 'bg-[#f7f8f2] border-[#e4e8df] text-[#31483b]', formFieldRow: 'gap-2', main: 'gap-4',
  },
};

const arabicDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const shortDays = ['اثن', 'ثلث', 'أرب', 'خمي', 'جمع', 'سبت', 'أحد'];
const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const arabicDigits = (value: string | number) => String(value).replace(/\d/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]);
const today = new Date();
const todayKey = dateKey(today);
const dayLabel = (d: Date) => new Intl.DateTimeFormat('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
const timeLabel = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  const hour = h % 12 || 12;
  return `${arabicDigits(String(hour).padStart(2, '0'))}:${arabicDigits(String(m).padStart(2, '0'))} ${h >= 12 ? 'م' : 'ص'}`;
};
const getCurrentWeek = () => {
  const start = new Date(today);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
};

function ClerkCacheInvalidator() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const previous = useRef<string | null | undefined>(undefined);
  useEffect(() => addListener(({ user }) => {
    const id = user?.id ?? null;
    if (previous.current !== undefined && previous.current !== id) client.clear();
    previous.current = id;
  }), [addListener, client]);
  return null;
}

function AuthPage({ mode }: { mode: 'in' | 'up' }) {
  return <main dir="rtl" className="auth-shell">
    <div className="auth-brand"><span className="brand-mark"><Utensils size={20} /></span><div><b>موعد لقمتك</b><small>اهتم بنفسك، لقمة بلقمة</small></div></div>
    <div className="auth-intro"><p>مساحتك اللطيفة</p><h1>{mode === 'in' ? 'أهلًا بعودتك' : 'ابدأ عناية ألطف'}</h1><span>وجباتك ومواعيدك، محفوظة معك أينما كنت.</span></div>
    {mode === 'in' ? <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /> : <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />}
  </main>;
}

function Landing() {
  const { isSignedIn, isLoaded } = useUser();
  if (!isLoaded) return <LoadingScreen />;
  if (isSignedIn) return <Redirect to="/app" />;
  return <main dir="rtl" className="landing-page">
    <header className="landing-nav"><div className="auth-brand"><span className="brand-mark"><Utensils size={20} /></span><div><b>موعد لقمتك</b><small>اهتم بنفسك، لقمة بلقمة</small></div></div><a data-testid="link-sign-in-header" className="text-link" href={`${basePath}/sign-in`}>تسجيل الدخول <ArrowRight size={15} /></a></header>
    <section className="landing-hero">
      <div className="landing-copy"><span className="eyebrow"><span className="eyebrow-dot" /> رفيق يومك الهادئ</span><h1>تذكّر وجبتك.<br /><em>واطمئن على يومك.</em></h1><p>مواعيد بسيطة تترك لك مساحة تعيش يومك. رتّب وجباتك، وخذ تذكيرًا لطيفًا في وقتها.</p>
        <div className="landing-actions"><a data-testid="link-sign-up" href={`${basePath}/sign-up`} className="primary-link">ابدأ رحلتك <ArrowRight size={17} /></a><a data-testid="link-sign-in" href={`${basePath}/sign-in`} className="secondary-link">لديك حساب؟</a></div>
        <div className="landing-proof"><span className="proof-icons"><span><Check size={13} /></span><span><Leaf size={13} /></span><span><Clock3 size={13} /></span></span><span>خطوات صغيرة، على إيقاعك</span></div>
      </div>
      <div className="landing-art" aria-label="تصميم توضيحي لمواعيد الوجبات">
        <div className="art-orbit orbit-a" /><div className="art-orbit orbit-b" />
        <div className="plate"><div className="plate-center"><Leaf size={46} strokeWidth={1.3} /></div><span className="plate-dot dot-one" /><span className="plate-dot dot-two" /><span className="plate-dot dot-three" /></div>
        <div className="reminder-note"><span className="note-icon"><Bell size={16} /></span><div><b>حان وقت الغداء</b><small>وجبة متوازنة تعطيك طاقة</small></div><span className="note-time">١:٣٠ م</span></div>
        <div className="mini-stamp"><Sparkles size={16} /><span>على مهلك</span></div>
      </div>
    </section>
    <section className="landing-values"><div><span className="value-icon"><CalendarDays size={18} /></span><b>خطة تناسبك</b><p>رتّب وجبات الأسبوع بالطريقة التي تحبها.</p></div><div><span className="value-icon gold"><Bell size={18} /></span><b>تذكير في وقته</b><p>تنبيه لطيف يساعدك على تذكّر موعد وجبتك.</p></div><div><span className="value-icon sage"><ChartNoAxesColumn size={18} /></span><b>لاحظ تقدمك</b><p>تابع عاداتك يومًا بعد يوم، دون ضغط.</p></div></section>
    <footer className="landing-footer"><span>موعد لقمتك</span><span>عناية صغيرة، كل يوم.</span></footer>
  </main>;
}

type Page = 'today' | 'week' | 'journey' | 'profile' | 'details';
function BottomNavigation({ activePage, onNavigate }: { activePage: Page; onNavigate: (page: Page) => void }) {
  const items = [{ page: 'today' as const, label: 'اليوم', icon: House }, { page: 'week' as const, label: 'الأسبوع', icon: CalendarDays }, { page: 'journey' as const, label: 'رحلتي', icon: ChartNoAxesColumn }, { page: 'profile' as const, label: 'حسابي', icon: UserRound }];
  return <nav aria-label="التنقل الرئيسي" className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-[430px] -translate-x-1/2 items-center justify-around border-t border-[#e8eae2] bg-[#fbfbf7]/95 px-3 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] backdrop-blur-xl">
    {items.map(({ page, label, icon: Icon }) => <button data-testid={`nav-${page}`} key={page} onClick={() => onNavigate(page)} aria-current={activePage === page ? 'page' : undefined} className={`flex min-w-[64px] flex-col items-center gap-1 rounded-2xl px-3 py-1.5 text-[10px] font-semibold transition active:scale-95 ${activePage === page ? 'text-[#2d674f]' : 'text-[#9aa39a]'}`}><span className={`grid h-8 w-10 place-items-center rounded-full ${activePage === page ? 'bg-[#e5eee3]' : ''}`}><Icon size={18} strokeWidth={activePage === page ? 2.2 : 1.8} /></span>{label}</button>)}
  </nav>;
}

function AppPlanner() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [activePage, setActivePage] = useState<Page>('today');
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [selectedMealId, setSelectedMealId] = useState('');
  const [dialog, setDialog] = useState<'add' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [time, setTime] = useState('08:00');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');
  const [pushMessage, setPushMessage] = useState('');
  const [installPrompt, setInstallPrompt] = useState<Event & { prompt?: () => Promise<void>; userChoice?: Promise<{ outcome: string }> } | null>(null);
  const [permission, setPermission] = useState(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  const [deviceSubscribed, setDeviceSubscribed] = useState(false);
  const [week, setWeek] = useState(getCurrentWeek);
  const client = useQueryClient();
  const mealParams = { date: selectedDate };
  const mealQuery = useListMeals(mealParams);
  const dashboard = useGetDashboardSummary({ date: selectedDate });
  const weekDates = week;
  const journeyParams = { startDate: dateKey(weekDates[0]), endDate: dateKey(weekDates[6]) };
  const journey = useGetJourneySummary(journeyParams);
  const preferences = useGetPreferences();
  const pushKey = useGetPushPublicKey();
  const pushStatus = useGetPushStatus();
  const createMeal = useCreateMeal();
  const updateMeal = useUpdateMeal();
  const deleteMeal = useDeleteMeal();
  const setCompletion = useSetMealCompletion();
  const updatePreferences = useUpdatePreferences();
  const createSubscription = useCreatePushSubscription();
  const deleteSubscription = useDeletePushSubscription();
  const testNotification = useSendTestNotification();

  useEffect(() => {
    const handler = (event: Event) => { event.preventDefault(); setInstallPrompt(event as typeof installPrompt); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  useEffect(() => {
    let active = true;
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.ready
        .then((registration) => registration.pushManager.getSubscription())
        .then((subscription) => { if (active) setDeviceSubscribed(Boolean(subscription)); })
        .catch(() => { if (active) setDeviceSubscribed(false); });
    }
    return () => { active = false; };
  }, []);
  const meals = (mealQuery.data ?? []) as Meal[];
  const doneCount = dashboard.data?.doneCount ?? meals.filter((meal) => meal.completed).length;
  const totalCount = dashboard.data?.totalCount ?? meals.length;
  const progress = dashboard.data?.progress ?? (totalCount ? doneCount / totalCount * 100 : 0);
  const selectedMeal = meals.find((meal) => meal.id === selectedMealId) ?? meals[0];
  const selectedDateObj = new Date(`${selectedDate}T12:00:00`);
  const nav = <BottomNavigation activePage={activePage} onNavigate={setActivePage} />;
  const invalidatePlanner = () => {
    void client.invalidateQueries({ queryKey: getListMealsQueryKey() });
    void client.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    void client.invalidateQueries({ queryKey: getGetJourneySummaryQueryKey() });
  };
  const openAdd = () => { setEditingId(null); setName(''); setTime('08:00'); setNote(''); setFormError(''); setDialog('add'); };
  const openEdit = (meal: Meal) => { setEditingId(meal.id); setName(meal.name); setTime(meal.time); setNote(meal.note); setFormError(''); setDialog('edit'); };
  const submitMeal = () => {
    if (!name.trim()) { setFormError('اكتب اسم الوجبة أولًا.'); return; }
    const data = {
      name: name.trim(),
      time,
      note: note.trim(),
      weekdays: dialog === 'edit'
        ? (meals.find((meal) => meal.id === editingId)?.weekdays ?? [0, 1, 2, 3, 4, 5, 6])
        : [0, 1, 2, 3, 4, 5, 6],
    };
    const finish = () => { setDialog(null); invalidatePlanner(); };
    const fail = () => setFormError('لم نتمكن من حفظ الوجبة. حاول مرة أخرى.');
    if (dialog === 'edit' && editingId) updateMeal.mutate({ id: editingId, data }, { onSuccess: finish, onError: fail });
    else createMeal.mutate({ data }, { onSuccess: finish, onError: fail });
  };
  const toggleMeal = (meal: Meal) => setCompletion.mutate({ id: meal.id, data: { date: selectedDate, completed: !meal.completed } }, { onSuccess: invalidatePlanner, onError: () => setPushMessage('تعذر تحديث حالة الوجبة. حاول مرة أخرى.') });
  const removeMeal = (meal: Meal) => { if (window.confirm(`هل تريد حذف ${meal.name}؟`)) deleteMeal.mutate({ id: meal.id }, { onSuccess: () => { setActivePage('today'); invalidatePlanner(); }, onError: () => setPushMessage('تعذر حذف الوجبة. حاول مرة أخرى.') }); };
  const updateReminder = (enabled: boolean) => {
    setPushMessage('');
    updatePreferences.mutate({ data: { remindersEnabled: enabled, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Riyadh' } }, { onSuccess: () => { void client.invalidateQueries({ queryKey: getGetPreferencesQueryKey() }); }, onError: () => setPushMessage('تعذر حفظ تفضيلات التذكير.') });
  };
  const enablePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !pushKey.data?.publicKey) {
      setPushMessage('التنبيهات غير مدعومة على هذا المتصفح. يمكنك تثبيت التطبيق على iPhone واستخدام Safari.');
      return;
    }
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isInstalledIOS = 'standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (isIOS && !isInstalledIOS) {
      setPushMessage('لتفعيل تنبيهات iPhone، أضف التطبيق إلى الشاشة الرئيسية أولًا من قائمة المشاركة في Safari.');
      return;
    }
    if (Notification.permission === 'denied') { setPermission('denied'); setPushMessage('إذن التنبيهات مرفوض. غيّر الإذن من إعدادات Safari ثم حاول مجددًا.'); return; }
    try {
      const result = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') { setPushMessage(result === 'denied' ? 'إذن التنبيهات مرفوض. يمكنك تغييره من إعدادات المتصفح.' : 'لم يتم تفعيل إذن التنبيهات بعد.'); return; }
      const registration = await navigator.serviceWorker.register(`${basePath}/service-worker.js`, { scope: `${basePath || ''}/` });
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToBytes(pushKey.data.publicKey) });
      const serialized = subscription.toJSON();
      if (!serialized.endpoint || !serialized.keys?.p256dh || !serialized.keys.auth) throw new Error('Subscription data unavailable');
      createSubscription.mutate({ data: { endpoint: serialized.endpoint, expirationTime: serialized.expirationTime, keys: { p256dh: serialized.keys.p256dh, auth: serialized.keys.auth } } }, {
        onSuccess: () => { setDeviceSubscribed(true); setPushMessage('أصبحت تذكيراتك جاهزة على هذا الجهاز.'); void client.invalidateQueries({ queryKey: getGetPushStatusQueryKey() }); void client.invalidateQueries({ queryKey: getGetPreferencesQueryKey() }); },
        onError: () => setPushMessage('تعذر ربط هذا الجهاز بالتنبيهات. حاول مرة أخرى.'),
      });
    } catch { setPushMessage('لم نتمكن من تفعيل التنبيهات. تأكد من استخدام Safari على اتصال آمن.'); }
  };
  const turnOffPush = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration(`${basePath || ''}/`);
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        deleteSubscription.mutate({ data: { endpoint } }, { onSuccess: async () => { await subscription.unsubscribe(); setDeviceSubscribed(false); setPushMessage('تم إيقاف تنبيهات هذا الجهاز.'); void client.invalidateQueries({ queryKey: getGetPushStatusQueryKey() }); void client.invalidateQueries({ queryKey: getGetPreferencesQueryKey() }); }, onError: () => setPushMessage('تعذر إيقاف التنبيهات.') });
      } else setPushMessage('لا يوجد جهاز مسجل للتنبيهات.');
    } catch { setPushMessage('تعذر إيقاف التنبيهات على هذا الجهاز.'); }
  };
  const testPush = () => testNotification.mutate(undefined, { onSuccess: (result) => setPushMessage(result.message), onError: () => setPushMessage('تعذر إرسال التنبيه التجريبي.') });
  const install = async () => { if (installPrompt?.prompt) { await installPrompt.prompt(); const choice = await installPrompt.userChoice; if (choice?.outcome === 'accepted') setInstallPrompt(null); } else setPushMessage('على iPhone: افتح قائمة المشاركة في Safari ثم اختر «إضافة إلى الشاشة الرئيسية».'); };

  if (mealQuery.isLoading || dashboard.isLoading) return <LoadingScreen />;
  if (mealQuery.isError || dashboard.isError) return <main dir="rtl" className="planner-shell"><header className="flex items-center gap-3"><span className="brand-mark"><Utensils size={19} /></span><b>موعد لقمتك</b></header><StatePanel title="تعذر تحميل يومك" detail="تحقق من اتصالك ثم أعد المحاولة." action="إعادة المحاولة" onAction={() => { void mealQuery.refetch(); void dashboard.refetch(); }} /></main>;

  if (activePage === 'week') return <main dir="rtl" className="planner-shell px-5 pb-28 pt-[max(20px,env(safe-area-inset-top))]">
    <header className="flex items-center justify-between pb-6"><div><p className="text-[10px] font-medium text-[#89958c]">خطة مريحة لأسبوعك</p><h1 className="mt-1 text-[23px] font-bold tracking-[-.04em]">جدول الوجبات</h1></div><button data-testid="button-week-back" onClick={() => setActivePage('today')} aria-label="العودة لليوم" className="round-control"><ArrowRight size={18} /></button></header>
    <section className="rounded-[24px] bg-[#285f49] p-5 text-white shadow-[0_12px_28px_rgba(35,93,73,.12)]"><p className="text-[11px] font-medium text-[#d2e0d5]">الأسبوع الحالي</p><div className="mt-1 flex items-center justify-between"><h2 className="text-[19px] font-bold">{arabicDigits(weekDates[0].getDate())} — {arabicDigits(weekDates[6].getDate())} {new Intl.DateTimeFormat('ar-SA', { month: 'long' }).format(weekDates[6])}</h2><span className="grid h-10 w-10 place-items-center rounded-[14px] bg-white/10"><CalendarDays size={20} /></span></div><p className="mt-2 text-[11px] text-[#d2e0d5]">خطط بسيط، والتزم بإيقاع يناسب يومك.</p></section>
    <div className="mt-5 grid grid-cols-7 gap-1.5" aria-label="أيام الأسبوع">{weekDates.map((date, index) => <button data-testid={`button-day-${dateKey(date)}`} key={dateKey(date)} onClick={() => setSelectedDate(dateKey(date))} aria-pressed={selectedDate === dateKey(date)} className={`flex min-h-[68px] flex-col items-center justify-center gap-2 rounded-[17px] text-[10px] font-semibold transition active:scale-95 ${selectedDate === dateKey(date) ? 'bg-[#dfeadd] text-[#2d674f] ring-1 ring-[#b8cbb8]' : 'border border-[#e8eae2] bg-[#fbfbf7] text-[#8b968d]'}`}><span>{shortDays[index]}</span><span className={`grid h-7 w-7 place-items-center rounded-full text-[12px] ${selectedDate === dateKey(date) ? 'bg-[#397255] text-white' : 'text-[#40574a]'}`}>{arabicDigits(date.getDate())}</span></button>)}</div>
    <section className="mt-7"><div className="mb-3 flex items-end justify-between"><div><p className="text-[10px] text-[#919b90]">{dayLabel(selectedDateObj)}</p><h2 className="mt-1 text-[19px] font-bold">وجبات اليوم</h2></div><button data-testid="button-add-meal-week" onClick={() => { setActivePage('today'); openAdd(); }} className="flex min-h-9 items-center gap-1 rounded-full bg-[#e6eee4] px-3 text-[11px] font-bold text-[#37644c]"><Plus size={14} /> أضف</button></div>
      <MealList meals={meals} onToggle={toggleMeal} onDetails={(meal) => { setSelectedMealId(meal.id); setActivePage('details'); }} onEdit={(meal) => { setActivePage('today'); openEdit(meal); }} onDelete={removeMeal} emptyTitle="لا توجد وجبات في هذا اليوم" />
    </section><section className="mt-5 rounded-[19px] border border-[#e8eae2] bg-[#fbfbf7] p-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-[13px] bg-[#f4ead7] text-[#a87a3d]"><Target size={17} /></span><div className="flex-1"><p className="text-[12px] font-bold">إيقاعك هذا الأسبوع</p><p className="mt-1 text-[10px] text-[#929b91]">وجباتك تساعدك على الاستمرار بهدوء</p></div><span className="text-[12px] font-bold text-[#477659]">{arabicDigits(doneCount)}/{arabicDigits(totalCount)}</span></div></section>{nav}
  </main>;

  if (activePage === 'details') return <main dir="rtl" className="planner-shell px-5 pb-28 pt-[max(20px,env(safe-area-inset-top))]">
    <header className="flex items-center justify-between pb-6"><div><p className="text-[10px] font-medium text-[#89958c]">تفاصيل وجبتك</p><h1 className="mt-1 text-[22px] font-bold tracking-[-.04em]">{selectedMeal?.name ?? 'وجبتك'}</h1></div><button data-testid="button-detail-back" onClick={() => setActivePage('today')} aria-label="العودة لليوم" className="round-control"><ArrowRight size={18} /></button></header>
    {selectedMeal ? <><section className="relative overflow-hidden rounded-[27px] bg-[#285f49] p-6 text-white shadow-[0_14px_30px_rgba(35,93,73,.14)]"><div className="absolute -left-7 -top-10 h-40 w-40 rounded-full border border-white/10" /><div className="relative grid h-[154px] place-items-center"><span className="absolute h-[132px] w-[132px] rounded-full bg-white/5" /><span className="relative grid h-[88px] w-[88px] place-items-center rounded-[28px] bg-[#f4ecd9] text-[#467555] shadow-lg"><Utensils size={36} strokeWidth={1.6} /></span></div><p className="relative mt-2 text-center text-[22px] font-bold">{selectedMeal.name}</p><p className="relative mt-2 text-center text-[11px] text-[#d2e0d5]">{selectedMeal.note || 'وجبتك كما تحبها'}</p><div className="relative mt-5 flex items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-[11px] font-semibold"><Clock3 size={14} /> موعدها {timeLabel(selectedMeal.time)}</div></section><section className="mt-5 rounded-[21px] border border-[#e8eae2] bg-[#fbfbf7] p-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#e6eee4] text-[#477659]"><Leaf size={18} /></span><div><p className="text-[12px] font-bold">تذكير لطيف</p><p className="mt-1 text-[10px] text-[#929b91]">{preferences.data?.remindersEnabled ? 'التذكيرات مفعّلة لهذه الوجبة' : 'التذكيرات متوقفة حاليًا'}</p></div></div></section><section className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-[19px] border border-[#e8eae2] bg-[#fbfbf7] p-4"><span className="grid h-9 w-9 place-items-center rounded-[13px] bg-[#f4ead7] text-[#a87a3d]"><Target size={17} /></span><p className="mt-3 text-[11px] text-[#929b91]">هدف اليوم</p><p className="mt-1 text-[14px] font-bold">{arabicDigits(doneCount)} من {arabicDigits(totalCount)} وجبات</p></div><div className="rounded-[19px] border border-[#e8eae2] bg-[#fbfbf7] p-4"><span className="grid h-9 w-9 place-items-center rounded-[13px] bg-[#e6eee4] text-[#477659]"><CheckCircle2 size={17} /></span><p className="mt-3 text-[11px] text-[#929b91]">الحالة</p><p className="mt-1 text-[14px] font-bold">{selectedMeal.completed ? 'تمّت الوجبة' : 'بانتظارك'}</p></div></section><div className="mt-5 grid grid-cols-2 gap-3"><button data-testid="button-complete-detail" onClick={() => toggleMeal(selectedMeal)} className="flex h-12 items-center justify-center gap-2 rounded-[15px] bg-[#285f49] text-[12px] font-bold text-white"><Check size={17} /> {selectedMeal.completed ? 'إلغاء الإكمال' : 'تم تناولها'}</button><button data-testid="button-edit-detail" onClick={() => { setActivePage('today'); openEdit(selectedMeal); }} className="flex h-12 items-center justify-center gap-2 rounded-[15px] border border-[#dfe6dc] bg-[#fbfbf7] text-[12px] font-bold text-[#456752]"><Pencil size={15} /> تعديل الوجبة</button></div><button data-testid="button-delete-detail" onClick={() => removeMeal(selectedMeal)} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[15px] text-[11px] font-semibold text-[#a45b50]"><Trash2 size={14} /> حذف الوجبة</button></> : <StatePanel title="لم نعثر على الوجبة" detail="ربما حُذفت من خطتك." action="العودة لليوم" onAction={() => setActivePage('today')} />}{nav}
  </main>;

  if (activePage === 'journey') {
    const daily = journey.data ?? [];
    return <main dir="rtl" className="planner-shell px-5 pb-28 pt-[max(20px,env(safe-area-inset-top))]"><header className="pb-6"><p className="text-[10px] font-medium text-[#89958c]">خطوات صغيرة تصنع فرقًا</p><h1 className="mt-1 text-[23px] font-bold tracking-[-.04em]">رحلتك</h1></header>
      <section className="rounded-[25px] bg-[#285f49] p-5 text-white shadow-[0_12px_28px_rgba(35,93,73,.12)]"><div className="flex items-center justify-between"><div><p className="text-[11px] text-[#d2e0d5]">إنجاز اليوم</p><p className="mt-2 text-[30px] font-bold tracking-[-.04em]">{arabicDigits(Math.round(progress))}<span className="mr-1 text-[16px]">٪</span></p><p className="mt-1 text-[10px] text-[#d2e0d5]">أكملت {arabicDigits(doneCount)} من {arabicDigits(totalCount)} وجبات</p></div><div className="grid h-[96px] w-[96px] place-items-center rounded-full border-[7px] border-[#d7b979] text-center"><div><Check size={23} className="mx-auto text-[#f4e2b8]" /><span className="text-[10px] text-[#d2e0d5]">استمر</span></div></div></div></section>
      <section className="mt-5 rounded-[22px] border border-[#e8eae2] bg-[#fbfbf7] p-4"><div className="flex items-center justify-between"><div><p className="text-[13px] font-bold">هذا الأسبوع</p><p className="mt-1 text-[10px] text-[#929b91]">توازن لطيف، يومًا بعد يوم</p></div><span className="grid h-9 w-9 place-items-center rounded-[13px] bg-[#f4ead7] text-[#a87a3d]"><ChartNoAxesColumn size={17} /></span></div>{journey.isLoading ? <div className="skeleton mt-5 h-28 rounded-2xl" /> : journey.isError ? <StatePanel title="تعذر تحميل ملخص الأسبوع" detail="يمكنك المحاولة مرة أخرى." action="إعادة المحاولة" onAction={() => void journey.refetch()} /> : <JourneyBars dates={weekDates} summaries={daily} />}</section>
      <section className="mt-4 rounded-[21px] border border-[#e8eae2] bg-[#fbfbf7] p-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#f3e9d7] text-[#a87a3d]"><Flame size={18} /></span><div className="flex-1"><p className="text-[12px] font-bold">أنت على الطريق الصحيح</p><p className="mt-1 text-[10px] leading-5 text-[#929b91]">الاهتمام بعاداتك اليومية إنجاز يستحق التقدير.</p></div></div></section><button data-testid="button-week-plan" onClick={() => setActivePage('week')} className="mt-4 flex h-12 w-full items-center justify-between rounded-[16px] bg-[#e6eee4] px-4 text-[12px] font-bold text-[#37644c]"><span>استعرض خطة الأسبوع</span><ChevronLeft size={17} /></button>{nav}</main>;
  }

  if (activePage === 'profile') return <main dir="rtl" className="planner-shell px-5 pb-28 pt-[max(20px,env(safe-area-inset-top))]"><header className="pb-6"><p className="text-[10px] font-medium text-[#89958c]">مساحتك الشخصية</p><h1 className="mt-1 text-[23px] font-bold tracking-[-.04em]">حسابي</h1></header>
    <section className="flex items-center gap-4 rounded-[24px] bg-[#285f49] p-5 text-white shadow-[0_12px_28px_rgba(35,93,73,.12)]"><span className="grid h-[54px] w-[54px] place-items-center rounded-[19px] bg-[#f4ecd9] text-[#477659]"><UserRound size={25} /></span><div className="min-w-0"><p className="text-[16px] font-bold">{user?.firstName || 'أهلًا بك'}</p><p className="mt-1 truncate text-[10px] text-[#d2e0d5]">{user?.primaryEmailAddress?.emailAddress ?? 'كل يوم فرصة لعناية ألطف بنفسك'}</p></div></section>
    <section className="mt-5 rounded-[22px] border border-[#e8eae2] bg-[#fbfbf7] p-4"><div className="mb-3 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-[13px] bg-[#e6eee4] text-[#477659]"><Settings2 size={17} /></span><div><p className="text-[13px] font-bold">تفضيلاتك</p><p className="mt-1 text-[10px] text-[#929b91]">رتّب التجربة على طريقتك</p></div></div>
      {preferences.isLoading ? <div className="skeleton h-14" /> : preferences.isError ? <StatePanel title="تعذر تحميل التفضيلات" detail="أعد المحاولة." action="إعادة المحاولة" onAction={() => void preferences.refetch()} /> : <button data-testid="toggle-reminders-profile" onClick={() => updateReminder(!preferences.data?.remindersEnabled)} aria-pressed={!!preferences.data?.remindersEnabled} className="flex min-h-[62px] w-full items-center justify-between border-t border-[#eef0e9] py-3 text-right"><span className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-[13px] bg-[#f4ead7] text-[#a87a3d]"><Bell size={17} /></span><span><span className="block text-[12px] font-bold">تذكيرات الوجبات</span><span className="mt-1 block text-[10px] text-[#929b91]">{preferences.data?.remindersEnabled ? 'تصل في أوقات وجباتك' : 'موقوفة حاليًا'}</span></span></span><SwitchToggle enabled={!!preferences.data?.remindersEnabled} pending={updatePreferences.isPending} /></button>}
      <button data-testid="button-week-profile" onClick={() => setActivePage('week')} className="flex min-h-[62px] w-full items-center justify-between border-t border-[#eef0e9] py-3 text-right"><span className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-[13px] bg-[#e8ede4] text-[#5c795f]"><CalendarDays size={17} /></span><span><span className="block text-[12px] font-bold">مواعيد الوجبات</span><span className="mt-1 block text-[10px] text-[#929b91]">راجع جدولك الأسبوعي</span></span></span><ChevronLeft size={17} className="text-[#9ba49b]" /></button>
    </section>
    <section className="mt-4 rounded-[21px] border border-[#e8eae2] bg-[#fbfbf7] p-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-[13px] bg-[#e6eee4] text-[#477659]"><Smartphone size={17} /></span><div className="flex-1"><p className="text-[12px] font-bold">التنبيهات على أجهزتك</p><p className="mt-1 text-[10px] text-[#929b91]">{pushStatus.data?.deviceCount ? `${arabicDigits(pushStatus.data.deviceCount)} جهاز متصل` : 'اربط هذا الجهاز لتصلك التذكيرات'}</p></div>{pushStatus.isLoading ? <span className="skeleton h-5 w-10 rounded-full" /> : <span className="text-[10px] text-[#477659]">{pushStatus.data?.pushEnabled ? 'مفعّلة' : 'غير مفعّلة'}</span>}</div>
      {permission === 'denied' && <p role="status" className="mt-3 rounded-xl bg-[#f7ece8] p-3 text-[10px] leading-5 text-[#8a4e45]">إذن التنبيهات مرفوض من المتصفح. افتح إعدادات Safari واسمح بالإشعارات لهذا الموقع.</p>}
       <div className="mt-4 grid grid-cols-2 gap-2"><button data-testid="button-push-enable" onClick={() => deviceSubscribed ? turnOffPush() : void enablePush()} disabled={createSubscription.isPending || deleteSubscription.isPending} className="flex min-h-10 items-center justify-center gap-1.5 rounded-[13px] bg-[#e6eee4] px-2 text-[10px] font-bold text-[#37644c] disabled:opacity-60">{deviceSubscribed ? 'إيقاف هذا الجهاز' : 'تفعيل هذا الجهاز'}</button><button data-testid="button-test-notification" onClick={testPush} disabled={!pushStatus.data?.pushEnabled || testNotification.isPending} className="flex min-h-10 items-center justify-center gap-1.5 rounded-[13px] border border-[#e8eae2] px-2 text-[10px] font-bold text-[#567264] disabled:opacity-50"><Send size={13} /> تجربة التنبيه</button></div>
      {pushMessage && <p data-testid="status-push" role="status" className="mt-3 rounded-xl bg-[#f5f5ef] p-3 text-[10px] leading-5 text-[#627568]">{pushMessage}</p>}
    </section>
    <section className="mt-4 rounded-[21px] bg-[#e8eee4] p-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-[13px] bg-white/70 text-[#477659]"><Leaf size={17} /></span><div><p className="text-[12px] font-bold text-[#365947]">عادات ألطف، أيام أجمل</p><p className="mt-1 text-[10px] leading-5 text-[#718276]">خطتك ملكك؛ عدّلها كلما احتجت.</p></div></div></section>
    <button data-testid="button-install-app" onClick={() => void install()} className="mt-4 flex min-h-[52px] w-full items-center justify-between rounded-[16px] border border-[#e8eae2] bg-[#fbfbf7] px-4 text-[11px] font-bold text-[#456752]"><span className="flex items-center gap-2"><Download size={16} /> إضافة موعد لقمتك للشاشة الرئيسية</span><ChevronLeft size={16} /></button>
    <button data-testid="button-sign-out" onClick={() => void signOut({ redirectUrl: basePath || '/' })} className="mt-4 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[15px] text-[11px] font-semibold text-[#89958c]"><LogOut size={14} /> تسجيل الخروج</button>{nav}</main>;

  return <main dir="rtl" className="planner-shell relative px-5 pb-28 pt-[max(20px,env(safe-area-inset-top))]">
    <div className="pointer-events-none absolute -right-24 top-[-100px] h-64 w-64 rounded-full bg-[#e6ede3] opacity-70 blur-3xl" />
    <header className="relative flex items-center justify-between pb-5"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#dfe9dd] text-[#2d674f]"><Utensils size={19} strokeWidth={1.8} /></div><div><p className="text-[17px] font-bold tracking-[-.03em]">موعد لقمتك</p><p className="mt-0.5 text-[10px] font-medium text-[#829087]">اهتم بنفسك، لقمة بلقمة</p></div></div><button data-testid="button-scroll-meals" onClick={() => document.getElementById('today-meals')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} aria-label="انتقل إلى وجبات اليوم" className="round-control"><ChevronDown size={18} /></button></header>
    <section className="relative overflow-hidden rounded-[26px] bg-[#235d49] px-5 pb-5 pt-5 text-[#f8f7ee] shadow-[0_14px_30px_rgba(35,93,73,.15)]"><div className="absolute -left-7 -top-10 h-36 w-36 rounded-full border border-white/10" /><div className="absolute -left-1 top-4 h-24 w-24 rounded-full bg-[#3d765c]/50" /><div className="relative flex items-start justify-between gap-3"><div className="pt-1"><p data-testid="text-today-date" className="text-[11px] font-medium tracking-wide text-[#c6d8c9]">{dayLabel(selectedDateObj)}</p><h1 className="mt-2 text-[24px] font-bold leading-[1.3] tracking-[-.04em]">خلّ يومك ألذ<br />وأسهل</h1><p className="mt-2 max-w-[220px] text-[11px] leading-5 text-[#d4e1d7]">وجباتك مرتبة على وقتك، وخطوة صغيرة تكفي.</p></div><div className="relative mt-2 grid h-[92px] w-[92px] shrink-0 place-items-center rounded-full border border-white/10 bg-[#397458]"><div className="absolute h-[63px] w-[63px] rounded-full bg-[#f5ecd9]" /><div className="relative grid h-12 w-12 place-items-center rounded-[16px] border-[3px] border-[#c98652] bg-[#faf7eb] text-[#4b7858] shadow-sm"><Leaf size={25} strokeWidth={2.1} /><span className="absolute -right-1 top-0 h-2.5 w-2.5 rounded-full bg-[#c46644]" /><span className="absolute -left-1 bottom-1 h-2 w-2 rounded-full bg-[#d6a848]" /></div></div></div><div className="relative mt-5"><div className="mb-2 flex items-center justify-between text-[10px]"><span className="text-[#d4e1d7]">إنجاز وجبات اليوم</span><span className="font-semibold text-[#f4e2b8]">{arabicDigits(doneCount)} من {arabicDigits(totalCount)}</span></div><div className="h-[5px] overflow-hidden rounded-full bg-[#174735]"><div className="h-full rounded-full bg-[#d7b979] transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} /></div></div><Sparkles className="absolute bottom-6 left-5 text-[#d7b979]/70" size={15} /></section>
    <button data-testid="toggle-reminders-today" onClick={() => updateReminder(!preferences.data?.remindersEnabled)} aria-pressed={!!preferences.data?.remindersEnabled} disabled={updatePreferences.isPending} className="mt-4 flex min-h-[64px] w-full items-center justify-between rounded-[19px] border border-[#e8e9e1] bg-[#fbfbf7] px-4 text-right shadow-[0_4px_14px_rgba(49,71,57,.035)] transition active:scale-[.99]"><div className="flex items-center gap-3"><span className={`grid h-9 w-9 place-items-center rounded-[13px] ${preferences.data?.remindersEnabled ? 'bg-[#f5ead7] text-[#a87a3d]' : 'bg-[#eeefea] text-[#89948a]'}`}><Bell size={17} strokeWidth={1.8} /></span><div><p className="text-[12px] font-bold">{preferences.data?.remindersEnabled ? 'تذكيرات الوجبات مفعّلة' : 'التذكيرات متوقفة'}</p><p className="mt-1 text-[10px] text-[#8b958c]">نذكّرك بلطف في وقت كل وجبة</p></div></div><SwitchToggle enabled={!!preferences.data?.remindersEnabled} pending={updatePreferences.isPending} /></button>
    <section id="today-meals" className="mt-7 scroll-mt-5"><div className="mb-3 flex items-end justify-between"><div><p className="text-[10px] font-medium text-[#919b90]">{dayLabel(selectedDateObj)}</p><h2 className="mt-1 text-[19px] font-bold tracking-[-.03em]">وجباتك اليوم</h2></div><button data-testid="button-add-meal" onClick={openAdd} className="flex min-h-[38px] items-center gap-1.5 rounded-full bg-[#e6eee4] px-3.5 text-[11px] font-bold text-[#37644c] transition hover:bg-[#dce8da] active:scale-95"><Plus size={15} /> أضف وجبة</button></div>
      <MealList meals={meals} onToggle={toggleMeal} onDetails={(meal) => { setSelectedMealId(meal.id); setActivePage('details'); }} onEdit={openEdit} onDelete={removeMeal} emptyTitle="لا توجد وجبات لهذا اليوم" />
    </section><div className="mt-5 flex items-center justify-center gap-2 text-[10px] text-[#929b91]"><span className="h-1 w-1 rounded-full bg-[#c48a52]" /><span>كل وجبة صغيرة، عناية كبيرة بنفسك</span></div>{nav}
    {dialog && <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#1b3027]/35 px-4 pb-[max(16px,env(safe-area-inset-bottom))] backdrop-blur-[3px]" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}><section role="dialog" aria-modal="true" aria-labelledby="meal-dialog-title" className="w-full max-w-[398px] rounded-[26px] bg-[#fbfbf7] p-5 shadow-[0_18px_60px_rgba(21,48,36,.2)]"><div className="mb-5 flex items-center justify-between"><div><p className="text-[10px] font-semibold text-[#879489]">{dialog === 'edit' ? 'تعديل التفاصيل' : 'خطوة لطيفة ليومك'}</p><h2 id="meal-dialog-title" className="mt-1 text-[19px] font-bold">{dialog === 'edit' ? 'عدّل وجبتك' : 'أضف وجبة جديدة'}</h2></div><button data-testid="button-close-meal-dialog" onClick={() => setDialog(null)} aria-label="إغلاق" className="grid h-9 w-9 place-items-center rounded-full bg-[#eff1eb] text-[#627568]"><X size={17} /></button></div>
      <label className="mb-3 block text-[11px] font-semibold text-[#53655a]">اسم الوجبة<input data-testid="input-meal-name" autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="مثال: وجبة خفيفة" className="mt-1.5 h-12 w-full rounded-[14px] border border-[#e4e8df] bg-[#f7f8f2] px-3.5 text-[13px] font-medium text-[#31483b] outline-none placeholder:text-[#a5ada4] focus:border-[#75957e]" /></label>
      <label className="mb-3 block text-[11px] font-semibold text-[#53655a]">الوقت<input data-testid="input-meal-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} className="mt-1.5 h-12 w-full rounded-[14px] border border-[#e4e8df] bg-[#f7f8f2] px-3.5 text-[13px] font-medium text-[#31483b] outline-none focus:border-[#75957e]" /></label>
      <label className="mb-5 block text-[11px] font-semibold text-[#53655a]">ملاحظة لطيفة <span className="font-normal text-[#99a198]">(اختياري)</span><input data-testid="input-meal-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={240} placeholder="ما الذي تحب تذكّره؟" className="mt-1.5 h-12 w-full rounded-[14px] border border-[#e4e8df] bg-[#f7f8f2] px-3.5 text-[13px] font-medium text-[#31483b] outline-none placeholder:text-[#a5ada4] focus:border-[#75957e]" /></label>
      {formError && <p role="alert" data-testid="status-meal-form" className="mb-3 text-[11px] text-[#a44b40]">{formError}</p>}
      <button data-testid="button-save-meal" onClick={submitMeal} disabled={!name.trim() || createMeal.isPending || updateMeal.isPending} className="flex h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-[#285f49] text-[13px] font-bold text-white transition hover:bg-[#204f3c] active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-50"><CirclePlus size={17} /> {createMeal.isPending || updateMeal.isPending ? 'جارٍ الحفظ…' : dialog === 'edit' ? 'حفظ التغييرات' : 'إضافة إلى يومي'}</button>
      {dialog === 'edit' && editingId && <button data-testid="button-delete-meal" onClick={() => { const meal = meals.find((item) => item.id === editingId); if (meal) removeMeal(meal); }} className="mt-2 flex h-10 w-full items-center justify-center gap-2 text-[11px] font-semibold text-[#a45b50]"><Trash2 size={14} /> حذف الوجبة</button>}</section></div>}
  </main>;
}

function MealList({ meals, onToggle, onDetails, onEdit, onDelete, emptyTitle }: { meals: Meal[]; onToggle: (meal: Meal) => void; onDetails: (meal: Meal) => void; onEdit: (meal: Meal) => void; onDelete: (meal: Meal) => void; emptyTitle: string }) {
  if (!meals.length) return <div className="rounded-[20px] border border-dashed border-[#dce3d9] bg-[#fbfbf7] px-5 py-8 text-center"><span className="mx-auto grid h-11 w-11 place-items-center rounded-[15px] bg-[#e6eee4] text-[#477659]"><Utensils size={19} /></span><p data-testid="text-empty-meals" className="mt-3 text-[12px] font-bold text-[#40574a]">{emptyTitle}</p><p className="mt-1 text-[10px] text-[#929b91]">أضف موعدًا بسيطًا لتعتني بنفسك.</p></div>;
  return <div className="space-y-2">{meals.map((meal, index) => <article data-testid={`card-meal-${meal.id}`} key={meal.id} className={`flex min-h-[72px] items-center gap-3 rounded-[18px] border bg-[#fbfbf8] px-3.5 py-3 shadow-[0_3px_12px_rgba(49,71,57,.035)] transition ${meal.completed ? 'border-[#dce8dc]' : 'border-[#e9ebe4]'}`}><button data-testid={`button-complete-meal-${meal.id}`} onClick={() => onToggle(meal)} aria-label={meal.completed ? `إلغاء إكمال ${meal.name}` : `إكمال ${meal.name}`} aria-pressed={meal.completed} className={`grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[15px] transition active:scale-90 ${meal.completed ? 'bg-[#e4eee3] text-[#4f805c]' : ['bg-[#f2e6d4] text-[#9b6c38]', 'bg-[#e3eee5] text-[#477659]', 'bg-[#f5e6d9] text-[#b47750]', 'bg-[#e5e9db] text-[#71835c]'][index % 4]}`}>{meal.completed ? <Check size={20} strokeWidth={2.4} /> : <span className="text-[17px] font-bold">{meal.name.slice(0, 1)}</span>}</button><button data-testid={`button-details-meal-${meal.id}`} onClick={() => onDetails(meal)} className="min-w-0 flex-1 text-right"><div className="flex items-center gap-2"><h3 className={`truncate text-[13px] font-bold ${meal.completed ? 'text-[#728176]' : 'text-[#2d4036]'}`}>{meal.name}</h3>{meal.completed && <span className="rounded-full bg-[#edf3eb] px-2 py-0.5 text-[9px] font-semibold text-[#66806a]">تمّت</span>}</div><p className="mt-1 truncate text-[10px] text-[#909991]">{meal.note || 'وجبتك كما تحبها'}</p></button><div className="flex shrink-0 flex-col items-end gap-2"><span className="flex items-center gap-1 text-[10px] font-semibold text-[#78867b]"><Clock3 size={11} /> {timeLabel(meal.time)}</span><div className="flex"><button data-testid={`button-edit-meal-${meal.id}`} onClick={() => onEdit(meal)} aria-label={`تعديل ${meal.name}`} className="grid h-7 w-7 place-items-center rounded-full text-[#9aa39a] transition hover:bg-[#f0f1eb] hover:text-[#37644c]"><Pencil size={13} /></button><button data-testid={`button-delete-meal-${meal.id}`} onClick={() => onDelete(meal)} aria-label={`حذف ${meal.name}`} className="grid h-7 w-7 place-items-center rounded-full text-[#b29b8d] transition hover:bg-[#f7ece8] hover:text-[#a45b50]"><Trash2 size={13} /></button></div></div></article>)}</div>;
}

function SwitchToggle({ enabled, pending }: { enabled: boolean; pending?: boolean }) {
  return <span aria-hidden="true" className={`relative h-[23px] w-[40px] rounded-full transition-colors ${enabled ? 'bg-[#397255]' : 'bg-[#c8cec5]'} ${pending ? 'opacity-60' : ''}`}><span className={`absolute top-[3px] h-[17px] w-[17px] rounded-full bg-white shadow-sm transition-all ${enabled ? 'right-[3px]' : 'right-[20px]'}`} /></span>;
}
function JourneyBars({ dates, summaries }: { dates: Date[]; summaries: DaySummary[] }) {
  return <div className="mt-5 flex h-[112px] items-end justify-between gap-2">{dates.map((date, index) => { const summary = summaries.find((day) => day.date === dateKey(date)); const ratio = summary?.totalCount ? summary.doneCount / summary.totalCount : 0; const height = summary?.totalCount ? Math.max(6, ratio * 100) : 5; return <div key={dateKey(date)} className="flex flex-1 flex-col items-center gap-2"><div data-testid={`bar-journey-${dateKey(date)}`} aria-label={`${arabicDigits(summary?.doneCount ?? 0)} من ${arabicDigits(summary?.totalCount ?? 0)} وجبات`} className="flex h-[84px] w-full items-end rounded-full bg-[#eff2eb]"><div className={`w-full rounded-full transition-all ${dateKey(date) === todayKey ? 'bg-[#c7a76b]' : 'bg-[#82a18a]'}`} style={{ height: `${height}%` }} /></div><span className="text-[9px] font-medium text-[#929b91]">{shortDays[index]}</span></div>; })}</div>;
}
function LoadingScreen() { return <main dir="rtl" className="planner-shell px-5 pt-6"><div className="skeleton h-10 w-36 rounded-2xl" /><div className="skeleton mt-5 h-56 rounded-[26px]" /><div className="skeleton mt-4 h-16 rounded-[19px]" /><div className="skeleton mt-7 h-8 w-40 rounded-xl" /><div className="skeleton mt-3 h-[72px] rounded-[18px]" /><div className="skeleton mt-2 h-[72px] rounded-[18px]" /></main>; }
function StatePanel({ title, detail, action, onAction }: { title: string; detail: string; action: string; onAction: () => void }) { return <section className="my-6 rounded-[20px] border border-[#e8eae2] bg-[#fbfbf7] p-5 text-center"><p className="text-[13px] font-bold">{title}</p><p className="mt-2 text-[10px] leading-5 text-[#929b91]">{detail}</p><button data-testid="button-retry" onClick={onAction} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#e6eee4] px-4 py-2 text-[11px] font-bold text-[#37644c]"><RefreshCw size={13} />{action}</button></section>; }
function urlBase64ToBytes(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function ProtectedPlanner() {
  const { isSignedIn, isLoaded } = useUser();
  if (!isLoaded) return <LoadingScreen />;
  if (!isSignedIn) return <Redirect to="/" />;
  return <AppPlanner />;
}

function Router() {
  return <Switch><Route path="/" component={Landing} /><Route path="/app" component={ProtectedPlanner} /><Route path="/sign-in/*?" component={() => <AuthPage mode="in" />} /><Route path="/sign-up/*?" component={() => <AuthPage mode="up" />} /><Route component={() => <Redirect to="/" />} /></Switch>;
}

function ClerkApp() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register(`${basePath}/service-worker.js`, { scope: `${basePath || ''}/` }).catch(() => undefined);
    }
  }, []);
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={appearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} localization={{ signIn: { start: { title: 'مرحبًا بعودتك', subtitle: 'سجّل الدخول لمتابعة خطتك' } }, signUp: { start: { title: 'أنشئ حسابك', subtitle: 'ابدأ عناية ألطف بنفسك' } } }} routerPush={(to) => setLocation(stripBase(to))} routerReplace={(to) => setLocation(stripBase(to), { replace: true })}>
    <QueryClientProvider client={queryClient}><ClerkCacheInvalidator /><Router /></QueryClientProvider>
  </ClerkProvider>;
}

function App() {
  if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
  return <WouterRouter base={basePath}><ClerkApp /></WouterRouter>;
}
export default App;
